import { query, queryOne } from "../../db/pool.js";
import { HttpError } from "../../http/errors.js";
import { userHasFeature } from "../../shared/plan-access.js";
import type { SessionUser } from "../auth/users.repository.js";
import { toUtcIso } from "./answers.repository.js";

/** Same shapes as the front: NoteRecord and NoteWithQuestion. */
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

interface NoteRow {
  Id: number;
  UserId: string;
  QuestionId: number;
  Content: string;
  CreatedAt: Date;
}

function toNote(row: NoteRow): NoteRecord {
  return {
    id: String(row.Id),
    userId: row.UserId.toLowerCase(),
    questionId: String(row.QuestionId),
    content: row.Content,
    createdAt: toUtcIso(row.CreatedAt),
  };
}

export function requireNotesAccess(user: SessionUser): void {
  if (!userHasFeature(user, "notes")) {
    throw new HttpError(403, "O bloco de anotações faz parte do plano Avançado.");
  }
}

/** questionId → number of notes; empty when the plan has no notes block. */
export async function countMyNotes(user: SessionUser): Promise<Record<string, number>> {
  if (!userHasFeature(user, "notes")) return {};
  const rows = await query<{ QuestionId: number; Total: number }>(
    `SELECT QuestionId, COUNT(*) AS Total FROM dbo.UserNotes WHERE UserId = @userId GROUP BY QuestionId`,
    { userId: user.id }
  );
  return Object.fromEntries(rows.map((row) => [String(row.QuestionId), row.Total]));
}

export async function listQuestionNotes(user: SessionUser, questionId: number): Promise<NoteRecord[]> {
  requireNotesAccess(user);
  const rows = await query<NoteRow>(
    `SELECT Id, UserId, QuestionId, Content, CreatedAt FROM dbo.UserNotes
     WHERE UserId = @userId AND QuestionId = @questionId
     ORDER BY CreatedAt DESC, Id DESC`,
    { userId: user.id, questionId }
  );
  return rows.map(toNote);
}

export async function addNote(user: SessionUser, questionId: number, content: string): Promise<NoteRecord> {
  requireNotesAccess(user);
  const exists = await queryOne<{ Id: number }>(
    `SELECT Id FROM dbo.Questions WHERE Id = @questionId AND IsActive = 1`,
    { questionId }
  );
  if (!exists) throw new HttpError(404, "Questão não encontrada.");

  const row = await queryOne<NoteRow>(
    `INSERT INTO dbo.UserNotes (UserId, QuestionId, Content)
     OUTPUT inserted.Id, inserted.UserId, inserted.QuestionId, inserted.Content, inserted.CreatedAt
     VALUES (@userId, @questionId, @content)`,
    { userId: user.id, questionId, content }
  );
  if (!row) throw new HttpError(500, "Não foi possível salvar a anotação.");
  return toNote(row);
}

export async function listMyNotes(user: SessionUser): Promise<NoteWithQuestion[]> {
  requireNotesAccess(user);
  const rows = await query<NoteRow & { Code: string; Topic: string; AreaName: string }>(
    `SELECT n.Id, n.UserId, n.QuestionId, n.Content, n.CreatedAt,
            q.Code, t.Name AS Topic, a.Name AS AreaName
     FROM dbo.UserNotes n
     JOIN dbo.Questions q ON q.Id = n.QuestionId
     JOIN dbo.Topics t ON t.Id = q.TopicId
     JOIN dbo.Areas a ON a.Id = t.AreaId
     WHERE n.UserId = @userId
     ORDER BY n.CreatedAt DESC, n.Id DESC`,
    { userId: user.id }
  );
  return rows.map((row) => ({
    ...toNote(row),
    questionCode: row.Code,
    topic: row.Topic,
    areaName: row.AreaName,
  }));
}
