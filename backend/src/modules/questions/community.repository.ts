import { HttpError } from "../../http/errors.js";
import { query, queryOne } from "../../db/pool.js";
import type { SessionUser } from "../auth/users.repository.js";

/*
 * "Comunidade" panel: answers/comments of students and teachers on a question.
 * Listed together with the question (questions.repository.ts → hydrate).
 */

export interface CommunityComment {
  id: number;
  authorId: string;
  author: string;
  comment: string;
  createdAt: string;
}

interface CommentRow {
  Id: number;
  UserId: string;
  Author: string;
  Content: string;
  CreatedAt: Date;
}

export function toCommunityComment(row: CommentRow): CommunityComment {
  return {
    id: row.Id,
    authorId: row.UserId.toLowerCase(),
    author: row.Author,
    comment: row.Content,
    createdAt: row.CreatedAt.toISOString(),
  };
}

export async function addCommunityComment(user: SessionUser, questionId: number, content: string): Promise<CommunityComment> {
  const exists = await queryOne<{ Id: number }>(
    `SELECT Id FROM dbo.Questions WHERE Id = @questionId AND IsActive = 1`,
    { questionId }
  );
  if (!exists) throw new HttpError(404, "Questão não encontrada.");

  // OUTPUT ... INTO: the table has triggers (database/11_procedures_triggers.sql).
  const row = await queryOne<CommentRow>(
    `DECLARE @created TABLE (Id INT, CreatedAt DATETIME2(3));
     INSERT INTO dbo.CommunityComments (QuestionId, UserId, Content)
     OUTPUT inserted.Id, inserted.CreatedAt INTO @created
     VALUES (@questionId, @userId, @content);
     SELECT c.Id, @userId AS UserId, u.Name AS Author, @content AS Content, c.CreatedAt
       FROM @created c JOIN dbo.Users u ON u.Id = @userId;`,
    { questionId, userId: user.id, content }
  );
  if (!row) throw new HttpError(500, "Não foi possível publicar sua resposta.");
  return toCommunityComment(row);
}

/** The author removes their own comment; admins can remove any. */
export async function deleteCommunityComment(user: SessionUser, commentId: number): Promise<void> {
  const row = await queryOne<{ UserId: string }>(
    `SELECT UserId FROM dbo.CommunityComments WHERE Id = @commentId`,
    { commentId }
  );
  if (!row) throw new HttpError(404, "Comentário não encontrado.");
  if (row.UserId.toLowerCase() !== user.id && user.role !== "admin") {
    throw new HttpError(403, "Você só pode apagar os seus comentários.");
  }
  await query(`DELETE FROM dbo.CommunityComments WHERE Id = @commentId`, { commentId });
}
