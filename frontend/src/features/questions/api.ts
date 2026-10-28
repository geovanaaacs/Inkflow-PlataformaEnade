import { requireSessionUser } from "@/features/auth/api";
import type { AuthUser } from "@/features/auth/auth-context";
import { ApiError } from "@/shared/api/api-error";
import { COLLECTIONS } from "@/shared/api/collections";
import { createId, mockDelay, readCollection, updateCollection } from "@/shared/api/mock-store";
import {
  FREE_DAILY_QUESTION_LIMIT,
  userHasFeature,
  type DailyUsage,
} from "@/shared/plans/plan-access";
import { dayKey } from "@/shared/utils/dates";
import {
  areas,
  questions as questionSeed,
  seedAnswers,
  seedNotes,
  type AnswerRecord,
  type Area,
  type NoteRecord,
  type Question,
} from "./data";

/*
 * Questions API (mock). Future endpoints:
 *   GET /api/questions?keyword=&area=&year=&type=   GET /api/questions/filters
 *   GET /api/questions/{code}                       GET /api/questions?area={slug}
 *   POST /api/questions/{id}/answers                GET /api/me/answers?limit=
 *   GET /api/me/subscription (uso do dia)           GET /api/me/notes
 *   GET/POST /api/questions/{id}/notes
 */

const QUESTIONS_KEY = COLLECTIONS.questions;
const ANSWERS_KEY = COLLECTIONS.answers;
const NOTES_KEY = COLLECTIONS.notes;

export const ALL_VALUE = "todas";

export interface QuestionFilters {
  keyword: string;
  /** Area slug or ALL_VALUE. */
  area: string;
  year: string;
  type: string;
}

export interface QuestionFilterOptions {
  areas: Area[];
  years: number[];
  types: string[];
}

export interface AnswerSummary {
  id: string;
  questionCode: string;
  topic: string;
  correct: boolean;
  answeredAt: string;
}

export interface NoteWithQuestion extends NoteRecord {
  questionCode: string;
  topic: string;
  areaName: string;
}

/** Case- and accent-insensitive, like the database collation (Latin1_General_CI_AI). */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function readAnswers(): AnswerRecord[] {
  return readCollection(ANSWERS_KEY, seedAnswers);
}

function readNotes(): NoteRecord[] {
  return readCollection(NOTES_KEY, seedNotes);
}

/** The question bank is a collection so the admin area can create and edit questions. */
function readQuestions(): Question[] {
  return readCollection(QUESTIONS_KEY, () => questionSeed);
}

function findQuestion(questionId: string): Question | undefined {
  return readQuestions().find((question) => question.id === questionId);
}

/* ------------------------------------------------------------------ Banco de questões */

export async function listQuestions(filters?: Partial<QuestionFilters>): Promise<Question[]> {
  await mockDelay();
  const keyword = normalize(filters?.keyword?.trim() ?? "");
  const area = filters?.area ?? ALL_VALUE;
  const year = filters?.year ?? ALL_VALUE;
  const type = filters?.type ?? ALL_VALUE;

  return readQuestions().filter((question) => {
    const matchesKeyword =
      keyword.length === 0 ||
      [question.code, question.topic, question.area.name, question.statement].some((field) =>
        normalize(field).includes(keyword)
      );
    const matchesArea = area === ALL_VALUE || question.area.slug === area;
    const matchesYear = year === ALL_VALUE || String(question.year) === year;
    const matchesType = type === ALL_VALUE || question.type === type;
    return matchesKeyword && matchesArea && matchesYear && matchesType;
  });
}

export async function getQuestionFilterOptions(): Promise<QuestionFilterOptions> {
  await mockDelay(100);
  return {
    areas: [...areas].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    years: Array.from(new Set(readQuestions().map((question) => question.year))).sort((a, b) => b - a),
    types: Array.from(new Set(readQuestions().map((question) => question.type))).sort(),
  };
}

export async function getQuestionByCode(code: string): Promise<Question> {
  await mockDelay();
  const question = readQuestions().find((item) => item.code.toLowerCase() === code.toLowerCase());
  if (!question) throw new ApiError(`A questão ${code} não foi encontrada.`, 404);
  return question;
}

export async function listQuestionsByArea(
  areaSlug: string
): Promise<{ area: Area; questions: Question[] }> {
  await mockDelay();
  const area = areas.find((item) => item.slug === areaSlug);
  if (!area) throw new ApiError("Tema não encontrado.", 404);
  return {
    area,
    questions: readQuestions().filter((question) => question.area.slug === areaSlug),
  };
}

/** Number of available questions per area slug. */
export async function countQuestionsByArea(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const question of readQuestions()) {
    counts[question.area.slug] = (counts[question.area.slug] ?? 0) + 1;
  }
  return counts;
}

/* ------------------------------------------------------------------ Respostas */

export async function listMyRecentAnswers(limit = 5): Promise<AnswerSummary[]> {
  await mockDelay();
  const user = requireSessionUser();
  return readAnswers()
    .filter((answer) => answer.userId === user.id)
    .sort((a, b) => b.answeredAt.localeCompare(a.answeredAt))
    .slice(0, limit)
    .map((answer) => {
      const question = findQuestion(answer.questionId);
      return {
        id: answer.id,
        questionCode: question?.code ?? answer.questionId,
        topic: question?.topic ?? "",
        correct: answer.correct,
        answeredAt: answer.answeredAt,
      };
    });
}

function computeDailyUsage(user: AuthUser, answers: AnswerRecord[]): DailyUsage {
  const today = dayKey();
  const used = answers.filter(
    (answer) =>
      answer.userId === user.id &&
      answer.attemptNumber === 1 &&
      dayKey(new Date(answer.answeredAt)) === today
  ).length;

  return {
    used,
    limit: userHasFeature(user, "unlimitedQuestions") ? null : FREE_DAILY_QUESTION_LIMIT,
  };
}

/** Questions answered today (first attempts only) against the plan's daily limit. */
export async function getDailyUsage(): Promise<DailyUsage> {
  await mockDelay(100);
  return computeDailyUsage(requireSessionUser(), readAnswers());
}

export interface AnswerResult {
  correct: boolean;
  correctOptionId: string;
  /** 1 = first time the student answers this question. */
  attemptNumber: number;
  usage: DailyUsage;
}

/**
 * Records an answer. Every attempt is kept, but only the first attempt of a
 * question counts toward the free plan's daily limit — retrying a question
 * never uses up another slot.
 */
export async function answerQuestion(
  questionId: string,
  selectedOptionId: string
): Promise<AnswerResult> {
  await mockDelay(300);
  const user = requireSessionUser();
  const question = findQuestion(questionId);
  if (!question) throw new ApiError("Questão não encontrada.", 404);
  if (!question.options.some((option) => option.id === selectedOptionId)) {
    throw new ApiError("Alternativa inválida para esta questão.", 400);
  }

  const answers = readAnswers();
  const previousAttempts = answers.filter(
    (answer) => answer.userId === user.id && answer.questionId === questionId
  );
  const attemptNumber =
    previousAttempts.reduce((max, answer) => Math.max(max, answer.attemptNumber), 0) + 1;

  if (attemptNumber === 1) {
    const usage = computeDailyUsage(user, answers);
    if (usage.limit !== null && usage.used >= usage.limit) {
      throw new ApiError(
        `Você atingiu o limite de ${usage.limit} questões por dia do plano Básico.`,
        403
      );
    }
  }

  const record: AnswerRecord = {
    id: createId("a"),
    userId: user.id,
    questionId,
    selectedOptionId,
    correct: selectedOptionId === question.correctOptionId,
    attemptNumber,
    answeredAt: new Date().toISOString(),
    answeredAsRole: user.role,
  };
  const updated = updateCollection(ANSWERS_KEY, seedAnswers, (current) => [...current, record]);

  return {
    correct: record.correct,
    correctOptionId: question.correctOptionId,
    attemptNumber,
    usage: computeDailyUsage(user, updated),
  };
}

/** Questions of a mock exam, in the given order. */
export async function getQuestionsByIds(questionIds: string[]): Promise<Question[]> {
  await mockDelay(100);
  return questionIds
    .map((id) => findQuestion(id))
    .filter((question): question is Question => question !== undefined);
}

export interface GradedAnswer {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  correct: boolean;
}

/**
 * Grades a finished mock exam and stores the answered questions in the
 * student's history (so they count for the ranking). Unanswered questions are
 * graded as wrong but not stored. Premium plans have no daily limit.
 */
export async function recordMockExamAnswers(
  mockExamAttemptId: string,
  answers: { questionId: string; selectedOptionId: string | null }[]
): Promise<GradedAnswer[]> {
  const user = requireSessionUser();
  const stored = readAnswers();
  const answeredAt = new Date().toISOString();
  const newRecords: AnswerRecord[] = [];

  const graded = answers.map(({ questionId, selectedOptionId }) => {
    const question = findQuestion(questionId);
    const correctOptionId = question?.correctOptionId ?? "";
    const correct = selectedOptionId !== null && selectedOptionId === correctOptionId;

    if (selectedOptionId !== null && question) {
      const attemptNumber =
        stored
          .filter((answer) => answer.userId === user.id && answer.questionId === questionId)
          .reduce((max, answer) => Math.max(max, answer.attemptNumber), 0) + 1;
      newRecords.push({
        id: createId("a"),
        userId: user.id,
        questionId,
        selectedOptionId,
        correct,
        attemptNumber,
        answeredAt,
        mockExamAttemptId,
        answeredAsRole: user.role,
      });
    }
    return { questionId, selectedOptionId, correctOptionId, correct };
  });

  updateCollection(ANSWERS_KEY, seedAnswers, (current) => [...current, ...newRecords]);
  return graded;
}

/**
 * Every recorded answer (students and teachers). Rankings and the teacher
 * dashboard keep only answers given as "aluno" — see isStudentAnswer().
 */
export async function listAllAnswers(): Promise<AnswerRecord[]> {
  return readAnswers();
}

/* ------------------------------------------------------------------ Anotações */

const NOTE_MAX_LENGTH = 2000;

function requireNotesAccess(): AuthUser {
  const user = requireSessionUser();
  if (!userHasFeature(user, "notes")) {
    throw new ApiError("O bloco de anotações faz parte do plano Avançado.", 403);
  }
  return user;
}

/** How many notes the student has on each question (questionId → count). */
export async function getMyNoteCounts(): Promise<Record<string, number>> {
  await mockDelay(100);
  const user = requireSessionUser();
  if (!userHasFeature(user, "notes")) return {};

  const counts: Record<string, number> = {};
  for (const note of readNotes()) {
    if (note.userId === user.id) counts[note.questionId] = (counts[note.questionId] ?? 0) + 1;
  }
  return counts;
}

/** Notes of the student on one question, newest first. */
export async function listQuestionNotes(questionId: string): Promise<NoteRecord[]> {
  await mockDelay();
  const user = requireNotesAccess();
  return readNotes()
    .filter((note) => note.userId === user.id && note.questionId === questionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addNote(questionId: string, content: string): Promise<NoteRecord> {
  await mockDelay(300);
  const user = requireNotesAccess();
  const text = content.trim();
  if (!text) throw new ApiError("Escreva sua anotação antes de salvar.", 400);
  if (text.length > NOTE_MAX_LENGTH) {
    throw new ApiError(`A anotação pode ter no máximo ${NOTE_MAX_LENGTH} caracteres.`, 400);
  }
  if (!findQuestion(questionId)) throw new ApiError("Questão não encontrada.", 404);

  const note: NoteRecord = {
    id: createId("n"),
    userId: user.id,
    questionId,
    content: text,
    createdAt: new Date().toISOString(),
  };
  updateCollection(NOTES_KEY, seedNotes, (current) => [...current, note]);
  return note;
}

export async function listMyNotes(): Promise<NoteWithQuestion[]> {
  await mockDelay();
  const user = requireNotesAccess();

  return readNotes()
    .filter((note) => note.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((note) => {
      const question = findQuestion(note.questionId);
      return {
        ...note,
        questionCode: question?.code ?? note.questionId,
        topic: question?.topic ?? "",
        areaName: question?.area.name ?? "",
      };
    });
}

/** True for answers given by a student (the ones that count for rankings). */
export function isStudentAnswer(answer: AnswerRecord): boolean {
  return (answer.answeredAsRole ?? "aluno") === "aluno";
}
