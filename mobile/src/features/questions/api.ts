import { http, queryString } from "../../lib/http";
import type { DailyUsage } from "../../lib/plan-access";

/*
 * Questions API (same routes and shapes as frontend/src/features/questions/api.ts):
 *   GET /api/questions?keyword=&area=&year=      GET /api/questions/filters
 *   GET /api/questions/by-code/{code}            GET /api/areas/{slug}/questions
 *   POST /api/questions/{id}/answers             GET /api/me/daily-usage
 *   GET /api/me/note-counts · GET /api/me/notes  GET/POST /api/questions/{id}/notes
 */

export interface Area {
  slug: string;
  name: string;
  shortName: string;
}

export type Difficulty = "fácil" | "médio" | "difícil";

export interface Question {
  id: string;
  code: string;
  area: Area;
  topic: string;
  year: number;
  type: string;
  difficulty: Difficulty;
  statement: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
  aiExplanation: string;
  teacher: { name: string; credentials: string; comment: string };
  community: { author: string; comment: string }[];
}

export interface QuestionFilterOptions {
  areas: Area[];
  years: number[];
  types: string[];
}

export interface QuestionFilters {
  keyword?: string;
  /** Area slug. */
  area?: string;
  year?: number;
}

export interface AnswerResult {
  correct: boolean;
  correctOptionId: string;
  /** 1 = first time the student answers this question. */
  attemptNumber: number;
  usage: DailyUsage;
}

export interface NoteRecord {
  id: string;
  userId: string;
  questionId: string;
  content: string;
  createdAt: string;
}

export interface NoteWithQuestion extends NoteRecord {
  questionCode: string;
  topic: string;
  areaName: string;
}

/** Search ignores case and accents (database collation). */
export function listQuestions(filters: QuestionFilters = {}): Promise<Question[]> {
  return http.get<Question[]>(
    `/questions${queryString({ keyword: filters.keyword?.trim(), area: filters.area, year: filters.year })}`
  );
}

export function getQuestionFilterOptions(): Promise<QuestionFilterOptions> {
  return http.get<QuestionFilterOptions>("/questions/filters");
}

export function getQuestionByCode(code: string): Promise<Question> {
  return http.get<Question>(`/questions/by-code/${encodeURIComponent(code)}`);
}

export function listQuestionsByArea(areaSlug: string): Promise<{ area: Area; questions: Question[] }> {
  return http.get(`/areas/${encodeURIComponent(areaSlug)}/questions`);
}

/**
 * Records an answer. Every attempt is kept, but only the first attempt of a
 * question counts toward the free plan's daily limit (403 when it's used up).
 */
export function answerQuestion(questionId: string, selectedOptionId: string): Promise<AnswerResult> {
  return http.post<AnswerResult>(`/questions/${questionId}/answers`, { selectedOptionId });
}

export function getDailyUsage(): Promise<DailyUsage> {
  return http.get<DailyUsage>("/me/daily-usage");
}

/** questionId → number of notes; empty without the notes feature. */
export function getMyNoteCounts(): Promise<Record<string, number>> {
  return http.get<Record<string, number>>("/me/note-counts");
}

/** Notes of the student on one question, newest first. */
export function listQuestionNotes(questionId: string): Promise<NoteRecord[]> {
  return http.get<NoteRecord[]>(`/questions/${questionId}/notes`);
}

export function addNote(questionId: string, content: string): Promise<NoteRecord> {
  return http.post<NoteRecord>(`/questions/${questionId}/notes`, { content });
}

export function listMyNotes(): Promise<NoteWithQuestion[]> {
  return http.get<NoteWithQuestion[]>("/me/notes");
}
