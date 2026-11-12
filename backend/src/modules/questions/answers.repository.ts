import { TODAY_SQL, execute, query } from "../../db/pool.js";
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
 * Records an attempt with dbo.sp_RegistrarResposta (database/11): attempt
 * number, daily limit check (first attempts only) and the profile that
 * answered (teachers don't count for rankings), in one transaction in the
 * database. The limit comes from the plan rules here (null = unlimited);
 * "limit reached" and "question not found" come back as 403/404.
 */
export async function answerQuestion(
  user: SessionUser,
  questionId: number,
  letter: string
): Promise<AnswerResult> {
  const limit = limitFor(user);
  const [rows] = await execute("dbo.sp_RegistrarResposta", {
    UserId: user.id,
    QuestionId: questionId,
    Letter: letter,
    Role: user.role,
    DailyLimit: limit,
  });
  const result = rows?.[0] as
    | { IsCorrect: boolean; CorrectLetter: string; AttemptNumber: number; UsedToday: number }
    | undefined;
  if (!result) throw new HttpError(500, "Não foi possível registrar a resposta.");

  return {
    correct: result.IsCorrect,
    correctOptionId: result.CorrectLetter,
    attemptNumber: result.AttemptNumber,
    usage: { used: result.UsedToday, limit },
  };
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
