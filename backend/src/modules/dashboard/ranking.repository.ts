import { query } from "../../db/pool.js";

/*
 * Rankings shown in the dashboard — same rules the front displays:
 *   geral:     Questões tab only, first attempt of each question, correct = 10 pts,
 *              wrong = 2 pts (view dbo.vw_PracticeRanking, from script 06).
 *   simulados: correct answers of the best attempt of each mock exam × 10.
 * Only active students take part: teachers' and admins' answers never count.
 */

export type RankingScope = "geral" | "simulados";

export interface RankingEntry {
  id: string;
  position: number;
  name: string;
  points: number;
  detail: string;
  isCurrentUser: boolean;
}

export interface Ranking {
  scope: RankingScope;
  top: RankingEntry[];
  currentUser: RankingEntry | null;
  totalParticipants: number;
}

const TOP_SIZE = 5;
export const MOCK_EXAM_POINTS_PER_CORRECT = 10;

interface Row {
  UserId: string;
  Name: string;
  Points: number;
  Accuracy: number;
  Detail: string;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

async function practiceRows(): Promise<Row[]> {
  const rows = await query<{ UserId: string; Name: string; AnsweredCount: number; CorrectCount: number; Points: number }>(
    `SELECT r.UserId, u.Name, r.AnsweredCount, r.CorrectCount, r.Points
     FROM dbo.vw_PracticeRanking r JOIN dbo.Users u ON u.Id = r.UserId`
  );
  return rows.map((row) => ({
    UserId: row.UserId,
    Name: row.Name,
    Points: row.Points,
    Accuracy: row.AnsweredCount ? row.CorrectCount / row.AnsweredCount : 0,
    Detail: `${plural(row.AnsweredCount, "questão", "questões")} · ${plural(row.CorrectCount, "acerto", "acertos")}`,
  }));
}

async function mockExamRows(): Promise<Row[]> {
  const rows = await query<{ UserId: string; Name: string; Exams: number; Correct: number; Total: number }>(
    `WITH Ranked AS (
       SELECT a.UserId, a.MockExamId, a.CorrectCount, a.TotalQuestions,
              ROW_NUMBER() OVER (PARTITION BY a.UserId, a.MockExamId ORDER BY a.CorrectCount DESC, a.FinishedAt) AS Rn
       FROM dbo.MockExamAttempts a
       JOIN dbo.Users u ON u.Id = a.UserId
       WHERE a.Status <> N'em_andamento' AND a.CorrectCount IS NOT NULL
         AND u.Role = N'aluno' AND u.IsActive = 1 AND u.DeletedAt IS NULL
     )
     SELECT r.UserId, u.Name, COUNT(*) AS Exams, SUM(r.CorrectCount) AS Correct, SUM(r.TotalQuestions) AS Total
     FROM Ranked r JOIN dbo.Users u ON u.Id = r.UserId
     WHERE r.Rn = 1
     GROUP BY r.UserId, u.Name`
  );
  return rows.map((row) => {
    const accuracy = row.Total ? row.Correct / row.Total : 0;
    return {
      UserId: row.UserId,
      Name: row.Name,
      Points: row.Correct * MOCK_EXAM_POINTS_PER_CORRECT,
      Accuracy: accuracy,
      Detail: `${plural(row.Exams, "simulado", "simulados")} · ${Math.round(accuracy * 100)}% de acerto`,
    };
  });
}

export async function getRanking(scope: RankingScope, currentUserId: string): Promise<Ranking> {
  const rows = scope === "simulados" ? await mockExamRows() : await practiceRows();
  const me = currentUserId.toLowerCase();

  const ranked = rows
    .sort((a, b) => b.Points - a.Points || b.Accuracy - a.Accuracy || a.Name.localeCompare(b.Name, "pt-BR"))
    .map<RankingEntry>((row, index) => ({
      id: row.UserId.toLowerCase(),
      position: index + 1,
      name: row.Name,
      points: row.Points,
      detail: row.Detail,
      isCurrentUser: row.UserId.toLowerCase() === me,
    }));

  return {
    scope,
    top: ranked.slice(0, TOP_SIZE),
    currentUser: ranked.find((entry) => entry.isCurrentUser) ?? null,
    totalParticipants: ranked.length,
  };
}
