import { http, queryString } from "@/shared/api/http";
import type { DailyUsage } from "@/shared/plans/plan-access";
import type { Area, NoteRecord, Question } from "./data";

/*
 * Questions API:
 *   GET /api/questions?keyword=&area=&year=&type=   GET /api/questions/filters
 *   GET /api/questions/by-code/{code}               GET /api/areas/{slug}/questions
 *   GET /api/questions/count-by-area                POST /api/questions/{id}/answers
 *   GET /api/me/daily-usage                         GET /api/me/answers?limit=
 *   GET /api/me/note-counts                         GET /api/me/notes
 *   GET/POST /api/questions/{id}/notes
 */

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

/* ------------------------------------------------------------------ Banco de questões */

/** Search is case- and accent-insensitive (database collation Latin1_General_CI_AI). */
export function listQuestions(filters?: Partial<QuestionFilters>): Promise<Question[]> {
  return http.get<Question[]>(
    `/questions${queryString({
      keyword: filters?.keyword?.trim(),
      area: filters?.area,
      year: filters?.year,
      type: filters?.type,
    })}`
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

/** Number of available questions per area slug. */
export function countQuestionsByArea(): Promise<Record<string, number>> {
  return http.get<Record<string, number>>("/questions/count-by-area");
}

/* ------------------------------------------------------------------ Respostas */

export function listMyRecentAnswers(limit = 5): Promise<AnswerSummary[]> {
  return http.get<AnswerSummary[]>(`/me/answers${queryString({ limit })}`);
}

/** Questions answered today (first attempts only) against the plan's daily limit. */
export function getDailyUsage(): Promise<DailyUsage> {
  return http.get<DailyUsage>("/me/daily-usage");
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
export function answerQuestion(questionId: string, selectedOptionId: string): Promise<AnswerResult> {
  return http.post<AnswerResult>(`/questions/${questionId}/answers`, { selectedOptionId });
}

/* ------------------------------------------------------------------ Anotações */

/** How many notes the student has on each question (questionId → count); empty without the feature. */
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
