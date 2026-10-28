import { query, withTransaction } from "../../db/pool.js";
import { HttpError } from "../../http/errors.js";
import type { PlanId, UserRole } from "../../shared/plan-access.js";
import type { AuthUser } from "../auth/users.repository.js";
import { findExam, type MockExam } from "../mock-exams/mock-exams.repository.js";
import { findQuestionByCode, type Question } from "../questions/questions.repository.js";

/* ------------------------------------------------------------------ Usuários */

export interface AdminUser extends AuthUser {
  active: boolean;
}

export interface AdminUserChanges {
  role?: UserRole;
  plan?: PlanId | null;
  active?: boolean;
}

interface AdminUserRow {
  Id: string;
  Name: string;
  Email: string;
  Role: UserRole;
  Course: string | null;
  PlanSlug: PlanId | null;
  IsActive: boolean;
}

const SELECT_ADMIN_USERS = `
  SELECT u.Id, u.Name, u.Email, u.Role, u.Course, u.IsActive, p.Slug AS PlanSlug
  FROM dbo.Users u
  OUTER APPLY (SELECT TOP (1) s.PlanId FROM dbo.Subscriptions s
                WHERE s.UserId = u.Id AND s.Status = N'ativa') active
  LEFT JOIN dbo.Plans p ON p.Id = active.PlanId
  WHERE u.DeletedAt IS NULL`;

function toAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.Id.toLowerCase(),
    name: row.Name,
    email: row.Email,
    role: row.Role,
    plan: row.Role === "aluno" ? (row.PlanSlug ?? "basico") : null,
    course: row.Course,
    active: row.IsActive,
  };
}

export async function listUsers(filters: { search?: string; role?: UserRole }): Promise<AdminUser[]> {
  const rows = await query<AdminUserRow>(
    `${SELECT_ADMIN_USERS}
       AND (@search IS NULL OR u.Name LIKE @search OR u.Email LIKE @search)
       AND (@role IS NULL OR u.Role = @role)
     ORDER BY u.Name`,
    {
      search: filters.search ? `%${filters.search.replace(/[%_[]/g, "[$&]")}%` : null,
      role: filters.role ?? null,
    }
  );
  return rows.map(toAdminUser);
}

/**
 * Changes profile, plan or access. Students always have an active plan;
 * teachers get a teacher profile; staff never keep a subscription.
 */
export async function updateUser(adminId: string, userId: string, changes: AdminUserChanges): Promise<AdminUser> {
  if (userId.toLowerCase() === adminId.toLowerCase() && (changes.active === false || (changes.role && changes.role !== "admin"))) {
    throw new HttpError(409, "Você não pode remover o seu próprio acesso de administrador.");
  }

  await withTransaction(async (run) => {
    const [current] = await run<AdminUserRow>(`${SELECT_ADMIN_USERS} AND u.Id = @userId`, { userId });
    if (!current) throw new HttpError(404, "Usuário não encontrado.");

    const role = changes.role ?? current.Role;
    const active = changes.active ?? current.IsActive;

    if (current.Role === "admin" && (role !== "admin" || !active)) {
      const [others] = await run<{ Total: number }>(
        `SELECT COUNT(*) AS Total FROM dbo.Users WITH (UPDLOCK, HOLDLOCK)
         WHERE Role = N'admin' AND IsActive = 1 AND DeletedAt IS NULL AND Id <> @userId`,
        { userId }
      );
      if (!others?.Total) throw new HttpError(409, "O Inkflow precisa de pelo menos um administrador ativo.");
    }

    await run(
      `UPDATE dbo.Users
       SET Role = @role, IsActive = @active,
           DeactivatedAt = CASE WHEN @active = 1 THEN NULL ELSE ISNULL(DeactivatedAt, SYSUTCDATETIME()) END,
           UpdatedAt = SYSUTCDATETIME()
       WHERE Id = @userId`,
      { userId, role, active }
    );

    if (role === "professor") {
      await run(
        `IF NOT EXISTS (SELECT 1 FROM dbo.TeacherProfiles WHERE UserId = @userId)
           INSERT INTO dbo.TeacherProfiles (UserId, Credentials, IsVerified) VALUES (@userId, N'A definir', 0);`,
        { userId }
      );
    }

    const wantedPlan: PlanId | null =
      role === "aluno" ? (changes.plan ?? current.PlanSlug ?? "basico") : null;
    const currentPlan = current.Role === "aluno" ? current.PlanSlug : null;
    if (wantedPlan !== currentPlan || (role !== "aluno" && current.PlanSlug)) {
      await run(
        `UPDATE dbo.Subscriptions SET Status = N'cancelada', CanceledAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
         WHERE UserId = @userId AND Status = N'ativa'`,
        { userId }
      );
      if (wantedPlan) {
        await run(
          `INSERT INTO dbo.Subscriptions (UserId, PlanId, Status, Price)
           SELECT @userId, Id, N'ativa', Price FROM dbo.Plans WHERE Slug = @plan`,
          { userId, plan: wantedPlan }
        );
      }
    }
  });

  const [updated] = await query<AdminUserRow>(`${SELECT_ADMIN_USERS} AND u.Id = @userId`, { userId });
  if (!updated) throw new HttpError(404, "Usuário não encontrado.");
  return toAdminUser(updated);
}

/* ------------------------------------------------------------------ Questões */

export interface QuestionInput {
  code: string;
  areaSlug: string;
  topic: string;
  year: number;
  difficulty: Question["difficulty"];
  statement: string;
  /** Five option texts, a–e. */
  options: string[];
  correctOptionId: string;
  aiExplanation: string;
}

const LETTERS = ["a", "b", "c", "d", "e"] as const;

export async function getQuestionCatalog() {
  const rows = await query<{ Slug: string; Name: string; ShortName: string; Topic: string | null }>(
    `SELECT a.Slug, a.Name, a.ShortName, t.Name AS Topic
     FROM dbo.Areas a LEFT JOIN dbo.Topics t ON t.AreaId = a.Id
     ORDER BY a.Name, t.Name`
  );
  const areas = [...new Map(rows.map((row) => [row.Slug, { slug: row.Slug, name: row.Name, shortName: row.ShortName }])).values()];
  const topicsByArea: Record<string, string[]> = {};
  for (const row of rows) if (row.Topic) (topicsByArea[row.Slug] ??= []).push(row.Topic);
  return { areas, topicsByArea };
}

/** Inserts or updates the question and its five options atomically. */
export async function saveQuestion(questionId: number | null, input: QuestionInput): Promise<Question> {
  const code = input.code.trim().toUpperCase();

  await withTransaction(async (run) => {
    const [area] = await run<{ Id: number }>(`SELECT Id FROM dbo.Areas WHERE Slug = @slug`, { slug: input.areaSlug });
    if (!area) throw new HttpError(400, "Escolha a área da questão.");

    const [taken] = await run<{ Id: number }>(
      `SELECT Id FROM dbo.Questions WITH (UPDLOCK, HOLDLOCK) WHERE Code = @code AND (@questionId IS NULL OR Id <> @questionId)`,
      { code, questionId }
    );
    if (taken) throw new HttpError(409, `Já existe uma questão com o código ${code}.`);

    // Topic typed by the admin: reuse it or create it inside the area.
    const [topic] = await run<{ Id: number }>(
      `IF NOT EXISTS (SELECT 1 FROM dbo.Topics WHERE AreaId = @areaId AND Name = @topic)
         INSERT INTO dbo.Topics (AreaId, Name) VALUES (@areaId, @topic);
       SELECT Id FROM dbo.Topics WHERE AreaId = @areaId AND Name = @topic;`,
      { areaId: area.Id, topic: input.topic }
    );

    const fields = {
      code,
      topicId: topic?.Id,
      year: input.year,
      difficulty: input.difficulty,
      statement: input.statement,
      aiExplanation: input.aiExplanation || null,
    };

    let id = questionId;
    if (id === null) {
      const [created] = await run<{ Id: number }>(
        `INSERT INTO dbo.Questions (Code, TopicId, Year, Difficulty, Statement, AiExplanation)
         OUTPUT inserted.Id
         VALUES (@code, @topicId, @year, @difficulty, @statement, @aiExplanation)`,
        fields
      );
      id = created?.Id ?? null;
      if (id === null) throw new HttpError(500, "Não foi possível criar a questão.");
      for (const [index, letter] of LETTERS.entries()) {
        await run(
          `INSERT INTO dbo.QuestionOptions (QuestionId, Letter, Text, IsCorrect) VALUES (@id, @letter, @text, @isCorrect)`,
          { id, letter, text: input.options[index], isCorrect: letter === input.correctOptionId }
        );
      }
    } else {
      const [updated] = await run<{ Id: number }>(
        `UPDATE dbo.Questions
         SET Code = @code, TopicId = @topicId, Year = @year, Difficulty = @difficulty,
             Statement = @statement, AiExplanation = @aiExplanation, UpdatedAt = SYSUTCDATETIME()
         OUTPUT inserted.Id
         WHERE Id = @id AND IsActive = 1`,
        { ...fields, id }
      );
      if (!updated) throw new HttpError(404, "Questão não encontrada.");
      // Only one correct option at a time (unique filtered index): clear, then set.
      await run(`UPDATE dbo.QuestionOptions SET IsCorrect = 0 WHERE QuestionId = @id AND IsCorrect = 1`, { id });
      for (const [index, letter] of LETTERS.entries()) {
        await run(
          `UPDATE dbo.QuestionOptions SET Text = @text, IsCorrect = @isCorrect, UpdatedAt = SYSUTCDATETIME()
           WHERE QuestionId = @id AND Letter = @letter`,
          { id, letter, text: input.options[index], isCorrect: letter === input.correctOptionId }
        );
      }
    }
  });

  const question = await findQuestionByCode(code);
  if (!question) throw new HttpError(500, "Não foi possível carregar a questão salva.");
  return question;
}

/**
 * "Remover": deactivates the question (answers already given reference it)
 * and takes it out of every mock exam.
 */
export async function deactivateQuestion(questionId: number): Promise<void> {
  await withTransaction(async (run) => {
    const [updated] = await run<{ Id: number }>(
      `UPDATE dbo.Questions SET IsActive = 0, UpdatedAt = SYSUTCDATETIME() OUTPUT inserted.Id
       WHERE Id = @questionId AND IsActive = 1`,
      { questionId }
    );
    if (!updated) throw new HttpError(404, "Questão não encontrada.");
    await run(`DELETE FROM dbo.MockExamQuestions WHERE QuestionId = @questionId`, { questionId });
  });
}

/* ------------------------------------------------------------------ Simulados */

export interface MockExamInput {
  title: string;
  description: string;
  areaName: string | null;
  difficulty: MockExam["difficulty"];
  timeLimitMinutes: number;
  questionIds: number[];
}

export async function saveMockExam(examId: number | null, input: MockExamInput): Promise<MockExam> {
  const id = await withTransaction(async (run) => {
    const [area] = input.areaName
      ? await run<{ Id: number }>(`SELECT Id FROM dbo.Areas WHERE Name = @name`, { name: input.areaName })
      : [null];
    if (input.areaName && !area) throw new HttpError(400, "Área inválida.");

    const [valid] = await run<{ Total: number }>(
      `SELECT COUNT(*) AS Total FROM dbo.Questions
       WHERE IsActive = 1 AND Id IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))`,
      { ids: input.questionIds.join(",") }
    );
    if ((valid?.Total ?? 0) !== new Set(input.questionIds).size) {
      throw new HttpError(400, "Uma das questões escolhidas não existe mais.");
    }

    const fields = {
      title: input.title,
      description: input.description || null,
      areaId: area?.Id ?? null,
      difficulty: input.difficulty,
      minutes: input.timeLimitMinutes,
    };

    let savedId = examId;
    if (savedId === null) {
      const [created] = await run<{ Id: number }>(
        `INSERT INTO dbo.MockExams (Title, Description, AreaId, Difficulty, TimeLimitMinutes)
         OUTPUT inserted.Id VALUES (@title, @description, @areaId, @difficulty, @minutes)`,
        fields
      );
      savedId = created?.Id ?? null;
    } else {
      const [updated] = await run<{ Id: number }>(
        `UPDATE dbo.MockExams
         SET Title = @title, Description = @description, AreaId = @areaId, Difficulty = @difficulty,
             TimeLimitMinutes = @minutes, UpdatedAt = SYSUTCDATETIME()
         OUTPUT inserted.Id WHERE Id = @examId AND IsActive = 1`,
        { ...fields, examId: savedId }
      );
      if (!updated) throw new HttpError(404, "Simulado não encontrado.");
      await run(`DELETE FROM dbo.MockExamQuestions WHERE MockExamId = @examId`, { examId: savedId });
    }
    if (savedId === null) throw new HttpError(500, "Não foi possível salvar o simulado.");

    for (const [index, questionId] of input.questionIds.entries()) {
      await run(
        `INSERT INTO dbo.MockExamQuestions (MockExamId, QuestionId, DisplayOrder) VALUES (@examId, @questionId, @order)`,
        { examId: savedId, questionId, order: index + 1 }
      );
    }
    return savedId;
  });
  return findExam(id);
}
