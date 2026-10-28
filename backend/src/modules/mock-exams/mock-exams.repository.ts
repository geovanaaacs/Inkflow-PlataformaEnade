import { query, queryOne, withTransaction } from "../../db/pool.js";
import { HttpError } from "../../http/errors.js";
import type { SessionUser } from "../auth/users.repository.js";
import { toUtcIso } from "../questions/answers.repository.js";

/** Same shapes as the front (features/mock-exams/data.ts and api.ts). */
export type AttemptStatus = "em_andamento" | "finalizado" | "expirado";

export interface MockExam {
  id: string;
  title: string;
  description: string;
  areaName: string | null;
  difficulty: "fácil" | "médio" | "difícil";
  timeLimitMinutes: number;
  questionIds: string[];
}

export interface AttemptQuestionResult {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  correct: boolean;
}

export interface MockExamAttempt {
  id: string;
  examId: string;
  userId: string;
  status: AttemptStatus;
  startedAt: string;
  endsAt: string;
  finishedAt: string | null;
  answers: Record<string, string>;
  results: AttemptQuestionResult[] | null;
}

export interface MockExamSummary extends MockExam {
  questionCount: number;
  activeAttemptId: string | null;
  lastResult: {
    attemptId: string;
    correctCount: number;
    total: number;
    finishedAt: string;
    status: AttemptStatus;
  } | null;
}

/** Tolerance for the client's timeout request arriving slightly after EndsAt. */
const GRACE_SECONDS = 5;

/* ------------------------------------------------------------------ Exams */

export async function listExams(): Promise<MockExam[]> {
  const [exams, links] = await Promise.all([
    query<{
      Id: number;
      Title: string;
      Description: string | null;
      AreaName: string | null;
      Difficulty: MockExam["difficulty"] | null;
      TimeLimitMinutes: number | null;
    }>(
      `SELECT m.Id, m.Title, m.Description, a.Name AS AreaName, m.Difficulty, m.TimeLimitMinutes
       FROM dbo.MockExams m LEFT JOIN dbo.Areas a ON a.Id = m.AreaId
       WHERE m.IsActive = 1 ORDER BY m.Id`
    ),
    query<{ MockExamId: number; QuestionId: number }>(
      `SELECT mq.MockExamId, mq.QuestionId
       FROM dbo.MockExamQuestions mq JOIN dbo.Questions q ON q.Id = mq.QuestionId
       WHERE q.IsActive = 1 ORDER BY mq.MockExamId, mq.DisplayOrder`
    ),
  ]);
  return exams.map((exam) => ({
    id: String(exam.Id),
    title: exam.Title,
    description: exam.Description ?? "",
    areaName: exam.AreaName,
    difficulty: exam.Difficulty ?? "médio",
    timeLimitMinutes: exam.TimeLimitMinutes ?? 30,
    questionIds: links.filter((link) => link.MockExamId === exam.Id).map((link) => String(link.QuestionId)),
  }));
}

export async function findExam(examId: number): Promise<MockExam> {
  const exam = (await listExams()).find((item) => item.id === String(examId));
  if (!exam) throw new HttpError(404, "Simulado não encontrado.");
  return exam;
}

/* ------------------------------------------------------------------ Attempts */

interface AttemptRow {
  Id: number;
  MockExamId: number;
  UserId: string;
  Status: AttemptStatus | "abandonado";
  StartedAt: Date;
  EndsAt: Date | null;
  FinishedAt: Date | null;
  CorrectCount: number | null;
  TotalQuestions: number;
  PastDeadline: boolean;
}

const SELECT_ATTEMPT = `
  SELECT a.Id, a.MockExamId, a.UserId, a.Status, a.StartedAt, a.EndsAt, a.FinishedAt,
         a.CorrectCount, a.TotalQuestions,
         CAST(CASE WHEN a.EndsAt IS NOT NULL
                    AND SYSUTCDATETIME() > DATEADD(SECOND, ${GRACE_SECONDS}, a.EndsAt) THEN 1 ELSE 0 END AS BIT) AS PastDeadline
  FROM dbo.MockExamAttempts a`;

async function findOwnAttempt(user: SessionUser, attemptId: number): Promise<AttemptRow> {
  const row = await queryOne<AttemptRow>(`${SELECT_ATTEMPT} WHERE a.Id = @attemptId AND a.UserId = @userId`, {
    attemptId,
    userId: user.id,
  });
  if (!row) throw new HttpError(404, "Tentativa não encontrada.");
  return row;
}

/** Answers of the attempt: in-progress picks, or the graded answers once finished. */
async function attemptAnswers(row: AttemptRow): Promise<Record<string, string>> {
  const rows =
    row.Status === "em_andamento"
      ? await query<{ QuestionId: number; Letter: string }>(
          `SELECT aa.QuestionId, o.Letter FROM dbo.MockExamAttemptAnswers aa
           JOIN dbo.QuestionOptions o ON o.Id = aa.SelectedOptionId
           WHERE aa.MockExamAttemptId = @id`,
          { id: row.Id }
        )
      : await query<{ QuestionId: number; Letter: string }>(
          `SELECT ua.QuestionId, o.Letter FROM dbo.UserAnswers ua
           JOIN dbo.QuestionOptions o ON o.Id = ua.SelectedOptionId
           WHERE ua.MockExamAttemptId = @id`,
          { id: row.Id }
        );
  return Object.fromEntries(rows.map((answer) => [String(answer.QuestionId), answer.Letter]));
}

async function correctLetters(questionIds: string[]): Promise<Map<string, string>> {
  if (questionIds.length === 0) return new Map();
  const rows = await query<{ QuestionId: number; Letter: string }>(
    `SELECT QuestionId, Letter FROM dbo.QuestionOptions
     WHERE IsCorrect = 1 AND QuestionId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))`,
    { ids: questionIds.join(",") }
  );
  return new Map(rows.map((row) => [String(row.QuestionId), row.Letter]));
}

async function toAttempt(row: AttemptRow, exam: MockExam): Promise<MockExamAttempt> {
  const answers = await attemptAnswers(row);
  const status: AttemptStatus = row.Status === "abandonado" ? "expirado" : row.Status;
  let results: AttemptQuestionResult[] | null = null;
  if (status !== "em_andamento") {
    const correct = await correctLetters(exam.questionIds);
    results = exam.questionIds.map((questionId) => {
      const selected = answers[questionId] ?? null;
      const correctOptionId = correct.get(questionId) ?? "";
      return { questionId, selectedOptionId: selected, correctOptionId, correct: selected !== null && selected === correctOptionId };
    });
  }
  const endsAt = row.EndsAt ?? new Date(row.StartedAt.getTime() + exam.timeLimitMinutes * 60_000);
  return {
    id: String(row.Id),
    examId: String(row.MockExamId),
    userId: row.UserId.toLowerCase(),
    status,
    startedAt: toUtcIso(row.StartedAt),
    endsAt: toUtcIso(endsAt),
    finishedAt: row.FinishedAt ? toUtcIso(row.FinishedAt) : null,
    answers,
    results,
  };
}

/**
 * Grades and closes the attempt: answered questions go to UserAnswers (linked
 * to the attempt, so they count for the Ranking dos Simulados), then the
 * attempt gets its status, score and finish time.
 */
async function closeAttempt(attemptId: number, userId: string, status: "finalizado" | "expirado"): Promise<void> {
  await withTransaction(async (run) => {
    const [open] = await run<{ Id: number }>(
      `SELECT Id FROM dbo.MockExamAttempts WITH (UPDLOCK)
       WHERE Id = @attemptId AND UserId = @userId AND Status = N'em_andamento'`,
      { attemptId, userId }
    );
    if (!open) return; // already closed by another request

    await run(
      `INSERT INTO dbo.UserAnswers (UserId, QuestionId, SelectedOptionId, IsCorrect, AttemptNumber, MockExamAttemptId, AnsweredAsRole)
       SELECT @userId, aa.QuestionId, aa.SelectedOptionId, o.IsCorrect,
              ISNULL((SELECT MAX(prev.AttemptNumber) FROM dbo.UserAnswers prev
                      WHERE prev.UserId = @userId AND prev.QuestionId = aa.QuestionId), 0) + 1,
              @attemptId, N'aluno'
       FROM dbo.MockExamAttemptAnswers aa
       JOIN dbo.QuestionOptions o ON o.Id = aa.SelectedOptionId
       WHERE aa.MockExamAttemptId = @attemptId`,
      { attemptId, userId }
    );
    await run(
      `UPDATE dbo.MockExamAttempts
       SET Status = @status,
           FinishedAt = CASE WHEN @status = N'expirado' AND EndsAt IS NOT NULL THEN EndsAt ELSE SYSUTCDATETIME() END,
           CorrectCount = (SELECT COUNT(*) FROM dbo.UserAnswers WHERE MockExamAttemptId = @attemptId AND IsCorrect = 1),
           UpdatedAt = SYSUTCDATETIME()
       WHERE Id = @attemptId`,
      { attemptId, status }
    );
  });
}

/** Closes in-progress attempts whose time ran out while the student was away. */
async function expireOverdue(user: SessionUser): Promise<void> {
  const overdue = await query<AttemptRow>(
    `${SELECT_ATTEMPT} WHERE a.UserId = @userId AND a.Status = N'em_andamento'`,
    { userId: user.id }
  );
  for (const row of overdue.filter((attempt) => attempt.PastDeadline)) {
    await closeAttempt(row.Id, user.id, "expirado");
  }
}

export async function listSummaries(user: SessionUser, canTakeExams: boolean): Promise<MockExamSummary[]> {
  if (canTakeExams) await expireOverdue(user);
  const [exams, attempts] = await Promise.all([
    listExams(),
    query<AttemptRow>(`${SELECT_ATTEMPT} WHERE a.UserId = @userId ORDER BY a.Id`, { userId: user.id }),
  ]);

  return exams.map((exam) => {
    const own = attempts.filter((attempt) => String(attempt.MockExamId) === exam.id);
    const active = own.find((attempt) => attempt.Status === "em_andamento");
    const last = own
      .filter((attempt) => attempt.Status !== "em_andamento" && attempt.FinishedAt)
      .sort((a, b) => (b.FinishedAt?.getTime() ?? 0) - (a.FinishedAt?.getTime() ?? 0))[0];
    return {
      ...exam,
      questionCount: exam.questionIds.length,
      activeAttemptId: active ? String(active.Id) : null,
      lastResult: last
        ? {
            attemptId: String(last.Id),
            correctCount: last.CorrectCount ?? 0,
            total: last.TotalQuestions,
            finishedAt: toUtcIso(last.FinishedAt ?? last.StartedAt),
            status: last.Status === "abandonado" ? "expirado" : last.Status,
          }
        : null,
    };
  });
}

export async function getActiveAttempt(user: SessionUser, examId: number): Promise<MockExamAttempt | null> {
  await expireOverdue(user);
  const exam = await findExam(examId);
  const row = await queryOne<AttemptRow>(
    `${SELECT_ATTEMPT} WHERE a.UserId = @userId AND a.MockExamId = @examId AND a.Status = N'em_andamento'`,
    { userId: user.id, examId }
  );
  return row ? toAttempt(row, exam) : null;
}

export async function startAttempt(user: SessionUser, examId: number): Promise<MockExamAttempt> {
  const existing = await getActiveAttempt(user, examId);
  if (existing) return existing;
  const exam = await findExam(examId);
  if (exam.questionIds.length === 0) throw new HttpError(409, "Este simulado ainda não tem questões.");

  const row = await queryOne<{ Id: number }>(
    `INSERT INTO dbo.MockExamAttempts (MockExamId, UserId, Status, TotalQuestions, StartedAt, EndsAt)
     OUTPUT inserted.Id
     VALUES (@examId, @userId, N'em_andamento', @total, SYSUTCDATETIME(),
             DATEADD(MINUTE, @minutes, SYSUTCDATETIME()))`,
    { examId, userId: user.id, total: exam.questionIds.length, minutes: exam.timeLimitMinutes }
  );
  if (!row) throw new HttpError(500, "Não foi possível iniciar o simulado.");
  return toAttempt(await findOwnAttempt(user, row.Id), exam);
}

export async function saveAnswer(
  user: SessionUser,
  attemptId: number,
  questionId: number,
  letter: string
): Promise<void> {
  const attempt = await findOwnAttempt(user, attemptId);
  if (attempt.Status !== "em_andamento" || attempt.PastDeadline) {
    throw new HttpError(409, "O tempo deste simulado já acabou.");
  }
  const exam = await findExam(attempt.MockExamId);
  if (!exam.questionIds.includes(String(questionId))) {
    throw new HttpError(400, "Esta questão não faz parte do simulado.");
  }
  const option = await queryOne<{ Id: number }>(
    `SELECT Id FROM dbo.QuestionOptions WHERE QuestionId = @questionId AND Letter = @letter`,
    { questionId, letter }
  );
  if (!option) throw new HttpError(400, "Alternativa inválida para esta questão.");

  await query(
    `MERGE dbo.MockExamAttemptAnswers WITH (HOLDLOCK) AS target
     USING (SELECT @attemptId AS MockExamAttemptId, @questionId AS QuestionId) AS source
        ON target.MockExamAttemptId = source.MockExamAttemptId AND target.QuestionId = source.QuestionId
     WHEN MATCHED THEN UPDATE SET SelectedOptionId = @optionId, UpdatedAt = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN INSERT (MockExamAttemptId, QuestionId, SelectedOptionId)
                           VALUES (@attemptId, @questionId, @optionId);`,
    { attemptId, questionId, optionId: option.Id }
  );
}

/** Finishes the exam — by the student, or automatically when the timer hits zero. */
export async function finishAttempt(user: SessionUser, attemptId: number): Promise<MockExamAttempt> {
  const attempt = await findOwnAttempt(user, attemptId);
  if (attempt.Status === "em_andamento") {
    const timedOut = await queryOne<{ TimedOut: boolean }>(
      `SELECT CAST(CASE WHEN EndsAt IS NOT NULL AND SYSUTCDATETIME() >= EndsAt THEN 1 ELSE 0 END AS BIT) AS TimedOut
       FROM dbo.MockExamAttempts WHERE Id = @attemptId`,
      { attemptId }
    );
    await closeAttempt(attemptId, user.id, timedOut?.TimedOut ? "expirado" : "finalizado");
  }
  const exam = await findExam(attempt.MockExamId);
  return toAttempt(await findOwnAttempt(user, attemptId), exam);
}

export async function getAttempt(user: SessionUser, attemptId: number): Promise<{ attempt: MockExamAttempt; exam: MockExam }> {
  const row = await findOwnAttempt(user, attemptId);
  const exam = await findExam(row.MockExamId);
  return { attempt: await toAttempt(row, exam), exam };
}
