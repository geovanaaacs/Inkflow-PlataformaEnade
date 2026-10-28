import { Router } from "express";
import { TODAY_SQL, query } from "../../db/pool.js";
import { currentUser, requireUser } from "../../http/session.js";
import { toUtcIso } from "../questions/answers.repository.js";
import type { Area } from "../questions/questions.repository.js";

/*
 * Front: src/features/teacher/api.ts
 *   getTeacherOverview() → GET /api/teacher/overview
 *
 * Only answers given as a student count (AnsweredAsRole = 'aluno'): teachers
 * answering to contribute never show up here or in the rankings.
 */

/** Newest answers sent to the table; the stats cover every answer. */
const ROWS_LIMIT = 500;

const ANSWER_JOINS = `
  FROM dbo.UserAnswers ua
  JOIN dbo.Users u ON u.Id = ua.UserId
  JOIN dbo.Questions q ON q.Id = ua.QuestionId
  JOIN dbo.Topics t ON t.Id = q.TopicId
  JOIN dbo.Areas a ON a.Id = t.AreaId
  JOIN dbo.QuestionOptions sel ON sel.Id = ua.SelectedOptionId`;
const ONLY_STUDENTS = `WHERE ua.AnsweredAsRole = N'aluno' AND u.Role = N'aluno' AND u.DeletedAt IS NULL`;
const STUDENT_ANSWERS = `${ANSWER_JOINS}
  ${ONLY_STUDENTS}`;

export const teacherRouter = Router();

teacherRouter.get("/teacher/overview", requireUser("professor"), async (req, res) => {
  const user = currentUser(req);

  const [totals, rows, firstAttempts, pending] = await Promise.all([
    query<{ TotalAnswers: number; ActiveStudents: number; FirstAttempts: number; CorrectFirst: number | null; Today: number }>(
      `SELECT COUNT(*) AS TotalAnswers,
              COUNT(DISTINCT ua.UserId) AS ActiveStudents,
              SUM(CASE WHEN ua.AttemptNumber = 1 THEN 1 ELSE 0 END) AS FirstAttempts,
              SUM(CASE WHEN ua.AttemptNumber = 1 AND ua.IsCorrect = 1 THEN 1 ELSE 0 END) AS CorrectFirst,
              SUM(CASE WHEN ua.AnsweredOn = ${TODAY_SQL} THEN 1 ELSE 0 END) AS Today
       ${STUDENT_ANSWERS}`
    ),
    query<{
      Id: number; UserId: string; StudentName: string; Code: string; Topic: string;
      AreaSlug: string; AreaName: string; AreaShortName: string;
      Selected: string; CorrectLetter: string; IsCorrect: boolean; AttemptNumber: number;
      MockExamAttemptId: number | null; AnsweredAt: Date;
    }>(
      `SELECT TOP (${ROWS_LIMIT}) ua.Id, ua.UserId, u.Name AS StudentName, q.Code, t.Name AS Topic,
              a.Slug AS AreaSlug, a.Name AS AreaName, a.ShortName AS AreaShortName,
              sel.Letter AS Selected,
              (SELECT Letter FROM dbo.QuestionOptions WHERE QuestionId = q.Id AND IsCorrect = 1) AS CorrectLetter,
              ua.IsCorrect, ua.AttemptNumber, ua.MockExamAttemptId, ua.AnsweredAt
       ${STUDENT_ANSWERS}
       ORDER BY ua.AnsweredAt DESC, ua.Id DESC`
    ),
    query<{ Code: string; Topic: string; AreaName: string; Letter: string; IsCorrect: boolean; Total: number }>(
      `SELECT q.Code, t.Name AS Topic, a.Name AS AreaName, sel.Letter, ua.IsCorrect, COUNT(*) AS Total
       ${STUDENT_ANSWERS}
         AND ua.AttemptNumber = 1
       GROUP BY q.Code, t.Name, a.Name, sel.Letter, ua.IsCorrect`
    ),
    query<{ Pending: number }>(
      `SELECT COUNT(*) AS Pending FROM dbo.MentoringRequests r
       JOIN dbo.TeacherAvailabilitySlots s ON s.Id = r.SlotId
       WHERE s.TeacherUserId = @userId AND s.CanceledAt IS NULL AND r.Status = N'pendente'`,
      { userId: user.id }
    ),
  ]);

  // "Questões com mais erros": first attempts per question, most common wrong option.
  const byQuestion = new Map<string, { topic: string; areaName: string; answers: number; wrong: Map<string, number> }>();
  for (const row of firstAttempts) {
    const entry = byQuestion.get(row.Code) ?? { topic: row.Topic, areaName: row.AreaName, answers: 0, wrong: new Map() };
    entry.answers += row.Total;
    if (!row.IsCorrect) entry.wrong.set(row.Letter, (entry.wrong.get(row.Letter) ?? 0) + row.Total);
    byQuestion.set(row.Code, entry);
  }
  const mostMissed = [...byQuestion.entries()]
    .map(([questionCode, entry]) => {
      const wrongTotal = [...entry.wrong.values()].reduce((sum, value) => sum + value, 0);
      const [optionId, count] = [...entry.wrong.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
      return {
        questionCode,
        topic: entry.topic,
        areaName: entry.areaName,
        answers: entry.answers,
        errorRate: Math.round((wrongTotal / entry.answers) * 100),
        commonMistake: optionId && count ? { optionId, percent: Math.round((count / entry.answers) * 100) } : null,
      };
    })
    .filter((question) => question.errorRate > 0)
    .sort((a, b) => b.errorRate - a.errorRate || b.answers - a.answers)
    .slice(0, 5);

  const answerRows = rows.map((row) => ({
    id: String(row.Id),
    studentId: row.UserId.toLowerCase(),
    studentName: row.StudentName,
    questionCode: row.Code,
    topic: row.Topic,
    area: { slug: row.AreaSlug, name: row.AreaName, shortName: row.AreaShortName } satisfies Area,
    selectedOptionId: row.Selected,
    correctOptionId: row.CorrectLetter,
    correct: row.IsCorrect,
    attemptNumber: row.AttemptNumber,
    fromMockExam: row.MockExamAttemptId !== null,
    answeredAt: toUtcIso(row.AnsweredAt),
  }));

  const total = totals[0];
  res.json({
    totalAnswers: total?.TotalAnswers ?? 0,
    activeStudents: total?.ActiveStudents ?? 0,
    accuracyPercent: total?.FirstAttempts ? Math.round(((total.CorrectFirst ?? 0) / total.FirstAttempts) * 100) : 0,
    answersToday: total?.Today ?? 0,
    pendingRequests: pending[0]?.Pending ?? 0,
    mostMissed,
    rows: answerRows,
    students: [...new Map(answerRows.map((row) => [row.studentId, { id: row.studentId, name: row.studentName }])).values()]
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    areas: [...new Map(answerRows.map((row) => [row.area.slug, row.area])).values()]
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  });
});
