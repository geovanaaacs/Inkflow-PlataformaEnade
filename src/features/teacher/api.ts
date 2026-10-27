import { listUsers, requireSessionUser } from "@/features/auth/api";
import { listTeacherRequests } from "@/features/mentoring/api";
import { listAllAnswers, listQuestions } from "@/features/questions/api";
import type { Area } from "@/features/questions/data";
import { ApiError } from "@/shared/api/api-error";
import { mockDelay } from "@/shared/api/mock-store";
import { dayKey } from "@/shared/utils/dates";

/*
 * Teacher dashboard API (mock). Future endpoint:
 *   GET /api/teacher/answers?area=&student=&result=
 */

export type ResultFilter = "todos" | "acertos" | "erros";

export interface StudentAnswerRow {
  id: string;
  studentId: string;
  studentName: string;
  questionCode: string;
  topic: string;
  area: Area;
  selectedOptionId: string;
  correctOptionId: string;
  correct: boolean;
  attemptNumber: number;
  /** Answered inside a mock exam (simulado) instead of free practice. */
  fromMockExam: boolean;
  answeredAt: string;
}

export interface MissedQuestion {
  questionCode: string;
  topic: string;
  areaName: string;
  answers: number;
  errorRate: number;
  /** Wrong option chosen most often, with its share of all answers. */
  commonMistake: { optionId: string; percent: number } | null;
}

export interface TeacherOverview {
  totalAnswers: number;
  activeStudents: number;
  accuracyPercent: number;
  answersToday: number;
  pendingRequests: number;
  mostMissed: MissedQuestion[];
  rows: StudentAnswerRow[];
  students: { id: string; name: string }[];
  areas: Area[];
}

function requireTeacher() {
  const user = requireSessionUser();
  if (user.role !== "professor") throw new ApiError("Área exclusiva para professores.", 403);
  return user;
}

export async function getTeacherOverview(): Promise<TeacherOverview> {
  await mockDelay();
  requireTeacher();

  const [answers, questions, users, requests] = await Promise.all([
    listAllAnswers(),
    listQuestions(),
    listUsers(),
    listTeacherRequests(),
  ]);

  const questionById = new Map(questions.map((question) => [question.id, question]));
  const studentById = new Map(
    users.filter((user) => user.role === "aluno").map((user) => [user.id, user])
  );

  const rows: StudentAnswerRow[] = answers
    .flatMap((answer) => {
      const question = questionById.get(answer.questionId);
      const student = studentById.get(answer.userId);
      if (!question || !student) return [];
      return [
        {
          id: answer.id,
          studentId: student.id,
          studentName: student.name,
          questionCode: question.code,
          topic: question.topic,
          area: question.area,
          selectedOptionId: answer.selectedOptionId,
          correctOptionId: question.correctOptionId,
          correct: answer.correct,
          attemptNumber: answer.attemptNumber,
          fromMockExam: Boolean(answer.mockExamAttemptId),
          answeredAt: answer.answeredAt,
        },
      ];
    })
    .sort((a, b) => b.answeredAt.localeCompare(a.answeredAt));

  // Statistics use first attempts only, like the students' own numbers.
  const firstAttempts = rows.filter((row) => row.attemptNumber === 1);
  const correctFirst = firstAttempts.filter((row) => row.correct).length;
  const today = dayKey();

  const byQuestion = new Map<string, StudentAnswerRow[]>();
  for (const row of firstAttempts) {
    byQuestion.set(row.questionCode, [...(byQuestion.get(row.questionCode) ?? []), row]);
  }

  const mostMissed: MissedQuestion[] = Array.from(byQuestion.values())
    .map((questionRows) => {
      const wrong = questionRows.filter((row) => !row.correct);
      const counts = new Map<string, number>();
      for (const row of wrong) counts.set(row.selectedOptionId, (counts.get(row.selectedOptionId) ?? 0) + 1);
      const [optionId, count] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? [];
      const first = questionRows[0];
      return {
        questionCode: first.questionCode,
        topic: first.topic,
        areaName: first.area.name,
        answers: questionRows.length,
        errorRate: Math.round((wrong.length / questionRows.length) * 100),
        commonMistake:
          optionId && count
            ? { optionId, percent: Math.round((count / questionRows.length) * 100) }
            : null,
      };
    })
    .filter((question) => question.errorRate > 0)
    .sort((a, b) => b.errorRate - a.errorRate || b.answers - a.answers)
    .slice(0, 5);

  const areaMap = new Map(rows.map((row) => [row.area.slug, row.area]));

  return {
    totalAnswers: rows.length,
    activeStudents: new Set(rows.map((row) => row.studentId)).size,
    accuracyPercent: firstAttempts.length
      ? Math.round((correctFirst / firstAttempts.length) * 100)
      : 0,
    answersToday: rows.filter((row) => dayKey(new Date(row.answeredAt)) === today).length,
    pendingRequests: requests.filter((request) => request.status === "pendente").length,
    mostMissed,
    rows,
    students: Array.from(
      new Map(rows.map((row) => [row.studentId, { id: row.studentId, name: row.studentName }])).values()
    ).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    areas: Array.from(areaMap.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  };
}
