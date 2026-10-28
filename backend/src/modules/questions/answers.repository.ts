import { TODAY_SQL, query, withTransaction } from "../../db/pool.js";
import { HttpError } from "../../http/errors.js";
import { userHasFeature } from "../../shared/plan-access.js";
import type { SessionUser } from "../auth/users.repository.js";

export interface DailyUsage {
  used: number;
  /** null = unlimited (paid plans, teachers and admins). */
  limit: number | null;
}

export interface AnswerResult {
  correct: boolean;
  correctOptionId: string;
  attemptNumber: number;
  usage: DailyUsage;
}

export interface AnswerSummary {
  id: string;
  questionCode: string;
  topic: string;
  correct: boolean;
  answeredAt: string;
}

/** Only first attempts count — retrying a question never uses another slot. */
const COUNT_TODAY = `
  SELECT COUNT(*) AS Used FROM dbo.UserAnswers
  WHERE UserId = @userId AND AttemptNumber = 1 AND AnsweredOn = ${TODAY_SQL}`;

function limitFor(user: SessionUser): number | null {
  if (userHasFeature(user, "unlimitedQuestions")) return null;
  return user.dailyQuestionLimit;
}

export async function getDailyUsage(user: SessionUser): Promise<DailyUsage> {
  const [row] = await query<{ Used: number }>(COUNT_TODAY, { userId: user.id });
  return { used: row?.Used ?? 0, limit: limitFor(user) };
}

/**
 * Records an attempt atomically: attempt number, daily limit check (first
 * attempts only) and the profile that answered (teachers don't count for rankings).
 */
export async function answerQuestion(
  user: SessionUser,
  questionId: number,
  letter: string
): Promise<AnswerResult> {
  const limit = limitFor(user);

  return withTransaction(async (run) => {
    const [option] = await run<{ OptionId: number; IsCorrect: boolean; CorrectLetter: string }>(
      `SELECT o.Id AS OptionId, o.IsCorrect,
              (SELECT Letter FROM dbo.QuestionOptions WHERE QuestionId = q.Id AND IsCorrect = 1) AS CorrectLetter
       FROM dbo.Questions q
       JOIN dbo.QuestionOptions o ON o.QuestionId = q.Id AND o.Letter = @letter
       WHERE q.Id = @questionId AND q.IsActive = 1`,
      { questionId, letter }
    );
    if (!option) throw new HttpError(404, "Questão ou alternativa não encontrada.");

    const [attempt] = await run<{ Next: number }>(
      `SELECT ISNULL(MAX(AttemptNumber), 0) + 1 AS Next
       FROM dbo.UserAnswers WITH (UPDLOCK, HOLDLOCK)
       WHERE UserId = @userId AND QuestionId = @questionId`,
      { userId: user.id, questionId }
    );
    const attemptNumber = attempt?.Next ?? 1;

    const [today] = await run<{ Used: number }>(COUNT_TODAY, { userId: user.id });
    const used = today?.Used ?? 0;
    if (attemptNumber === 1 && limit !== null && used >= limit) {
      throw new HttpError(403, `Você atingiu o limite de ${limit} questões por dia do plano Básico.`);
    }

    await run(
      `INSERT INTO dbo.UserAnswers (UserId, QuestionId, SelectedOptionId, IsCorrect, AttemptNumber, AnsweredAsRole)
       VALUES (@userId, @questionId, @optionId, @isCorrect, @attemptNumber, @role)`,
      {
        userId: user.id,
        questionId,
        optionId: option.OptionId,
        isCorrect: option.IsCorrect,
        attemptNumber,
        role: user.role,
      }
    );

    return {
      correct: option.IsCorrect,
      correctOptionId: option.CorrectLetter,
      attemptNumber,
      usage: { used: attemptNumber === 1 ? used + 1 : used, limit },
    };
  });
}

export async function listRecentAnswers(user: SessionUser, limit: number): Promise<AnswerSummary[]> {
  const rows = await query<{ Id: number; Code: string; Topic: string; IsCorrect: boolean; AnsweredAt: Date }>(
    `SELECT TOP (@limit) ua.Id, q.Code, t.Name AS Topic, ua.IsCorrect, ua.AnsweredAt
     FROM dbo.UserAnswers ua
     JOIN dbo.Questions q ON q.Id = ua.QuestionId
     JOIN dbo.Topics t ON t.Id = q.TopicId
     WHERE ua.UserId = @userId
     ORDER BY ua.AnsweredAt DESC, ua.Id DESC`,
    { userId: user.id, limit }
  );
  return rows.map((row) => ({
    id: String(row.Id),
    questionCode: row.Code,
    topic: row.Topic,
    correct: row.IsCorrect,
    answeredAt: toUtcIso(row.AnsweredAt),
  }));
}

/**
 * DATETIME2 columns hold UTC (SYSUTCDATETIME) and the driver already returns
 * them as the right instant (verified in the smoke test), so ISO is enough.
 */
export function toUtcIso(value: Date): string {
  return value.toISOString();
}
