import { TODAY_SQL, query } from "../../db/pool.js";
import type { SessionUser } from "../auth/users.repository.js";

/** Same shapes as the front (features/dashboard/data.ts and api.ts). */
export interface AreaPerformance {
  area: string;
  percent: number;
  questionsCount: number;
}

export interface SuggestedTopicWithTotal {
  areaSlug: string;
  title: string;
  level: "fácil" | "médio" | "difícil";
  percent: number;
  message: string;
  totalQuestions: number;
}

export interface StudentStats {
  /** Distinct questions answered (first attempts). */
  answered: number;
  accuracyPercent: number;
  /** Consecutive days with at least one answer, ending today or yesterday. */
  streak: number;
  bestStreak: number;
}

interface AreaRow {
  Slug: string;
  Name: string;
  ShortName: string;
  TotalQuestions: number;
  AvgDifficulty: number | null;
  Answered: number;
  Correct: number;
}

const LEVELS = ["fácil", "médio", "difícil"] as const;

function messageFor(answered: number, percent: number): string {
  if (answered === 0) return "Ainda não praticado";
  if (percent < 50) return "Precisa melhorar!";
  if (percent < 70) return "Quase lá!";
  if (percent < 80) return "Bom desempenho!";
  return "Ponto forte!";
}

/**
 * Per area: available questions, typical difficulty and the student's first
 * attempts. Feeds both "Desempenho por Área" and "Questões Sugeridas".
 */
export async function getAreaStats(user: SessionUser): Promise<{
  areaPerformance: AreaPerformance[];
  suggestedTopics: SuggestedTopicWithTotal[];
}> {
  const rows = await query<AreaRow>(
    `SELECT a.Slug, a.Name, a.ShortName,
            COUNT(DISTINCT q.Id) AS TotalQuestions,
            AVG(CASE q.Difficulty WHEN N'fácil' THEN 1.0 WHEN N'médio' THEN 2.0 WHEN N'difícil' THEN 3.0 END) AS AvgDifficulty,
            ISNULL(MAX(mine.Answered), 0) AS Answered,
            ISNULL(MAX(mine.Correct), 0) AS Correct
     FROM dbo.Areas a
     LEFT JOIN dbo.Topics t ON t.AreaId = a.Id
     LEFT JOIN dbo.Questions q ON q.TopicId = t.Id AND q.IsActive = 1
     OUTER APPLY (
       SELECT COUNT(*) AS Answered, SUM(CAST(ua.IsCorrect AS INT)) AS Correct
       FROM dbo.UserAnswers ua
       JOIN dbo.Questions q2 ON q2.Id = ua.QuestionId
       JOIN dbo.Topics t2 ON t2.Id = q2.TopicId
       WHERE ua.UserId = @userId AND ua.AttemptNumber = 1 AND t2.AreaId = a.Id
     ) mine
     GROUP BY a.Id, a.Slug, a.Name, a.ShortName`,
    { userId: user.id }
  );

  const withPercent = rows.map((row) => ({
    ...row,
    percent: row.Answered ? Math.round((row.Correct / row.Answered) * 100) : 0,
  }));

  const areaPerformance = [...withPercent]
    .sort((a, b) => b.percent - a.percent || b.Answered - a.Answered)
    .map((row) => ({ area: row.ShortName, percent: row.percent, questionsCount: row.Answered }));

  // Weakest practiced areas first, then the ones never practiced.
  const suggestedTopics = [...withPercent]
    .sort((a, b) => Number(a.Answered === 0) - Number(b.Answered === 0) || a.percent - b.percent)
    .map((row) => ({
      areaSlug: row.Slug,
      title: row.Name,
      level: LEVELS[Math.min(2, Math.max(0, Math.round((row.AvgDifficulty ?? 2) - 1)))],
      percent: row.percent,
      message: messageFor(row.Answered, row.percent),
      totalQuestions: row.TotalQuestions,
    }));

  return { areaPerformance, suggestedTopics };
}

export async function getStudentStats(user: SessionUser): Promise<StudentStats> {
  const [totals] = await query<{ Answered: number; Correct: number | null }>(
    `SELECT COUNT(*) AS Answered, SUM(CAST(IsCorrect AS INT)) AS Correct
     FROM dbo.UserAnswers WHERE UserId = @userId AND AttemptNumber = 1`,
    { userId: user.id }
  );
  // Gaps-and-islands: consecutive answer days share the same (day - row number).
  const islands = await query<{ Days: number; LastDay: Date; IsCurrent: boolean }>(
    `WITH Days AS (SELECT DISTINCT AnsweredOn FROM dbo.UserAnswers WHERE UserId = @userId),
     Groups AS (
       SELECT AnsweredOn, DATEADD(DAY, -ROW_NUMBER() OVER (ORDER BY AnsweredOn), AnsweredOn) AS Grp FROM Days
     )
     SELECT COUNT(*) AS Days, MAX(AnsweredOn) AS LastDay,
            CAST(CASE WHEN MAX(AnsweredOn) >= DATEADD(DAY, -1, ${TODAY_SQL}) THEN 1 ELSE 0 END AS BIT) AS IsCurrent
     FROM Groups GROUP BY Grp`,
    { userId: user.id }
  );

  const answered = totals?.Answered ?? 0;
  return {
    answered,
    accuracyPercent: answered ? Math.round(((totals?.Correct ?? 0) / answered) * 100) : 0,
    streak: islands.find((island) => island.IsCurrent)?.Days ?? 0,
    bestStreak: islands.reduce((best, island) => Math.max(best, island.Days), 0),
  };
}
