import { query, queryOne } from "../../db/pool.js";

/*
 * Question bank read model. Shapes match the front types in
 * src/features/questions/data.ts (Question, Area, QuestionOption...):
 *   - question.id is the database Id as a string
 *   - option.id is the letter ("a"–"e"), as in the front
 */

export interface Area {
  slug: string;
  name: string;
  shortName: string;
}

export interface Question {
  id: string;
  code: string;
  area: Area;
  topic: string;
  year: number;
  type: string;
  difficulty: "fácil" | "médio" | "difícil";
  statement: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
  aiExplanation: string;
  teacher: { name: string; credentials: string; comment: string };
  community: { author: string; comment: string }[];
}

export interface QuestionFilters {
  keyword?: string;
  area?: string;
  year?: number;
  type?: string;
}

interface QuestionRow {
  Id: number;
  Code: string;
  Topic: string;
  Year: number;
  Type: string;
  Difficulty: Question["difficulty"];
  Statement: string;
  AiExplanation: string | null;
  AreaSlug: string;
  AreaName: string;
  AreaShortName: string;
}

const SELECT_QUESTIONS = `
  SELECT q.Id, q.Code, t.Name AS Topic, q.Year, q.Type, q.Difficulty, q.Statement, q.AiExplanation,
         a.Slug AS AreaSlug, a.Name AS AreaName, a.ShortName AS AreaShortName
  FROM dbo.Questions q
  JOIN dbo.Topics t ON t.Id = q.TopicId
  JOIN dbo.Areas a  ON a.Id = t.AreaId
  WHERE q.IsActive = 1`;

/** Loads options, the first teacher comment and the community comments of the rows. */
async function hydrate(rows: QuestionRow[]): Promise<Question[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.Id).join(",");
  const inIds = "SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ',')";

  const [options, teachers, community] = await Promise.all([
    query<{ QuestionId: number; Letter: string; Text: string; IsCorrect: boolean }>(
      `SELECT QuestionId, Letter, Text, IsCorrect FROM dbo.QuestionOptions
       WHERE QuestionId IN (${inIds}) ORDER BY QuestionId, Letter`,
      { ids }
    ),
    query<{ QuestionId: number; Title: string | null; Name: string; Credentials: string; Content: string }>(
      `SELECT tc.QuestionId, tp.Title, u.Name, tp.Credentials, tc.Content
       FROM dbo.TeacherComments tc
       JOIN dbo.TeacherProfiles tp ON tp.UserId = tc.TeacherUserId
       JOIN dbo.Users u ON u.Id = tc.TeacherUserId
       WHERE tc.QuestionId IN (${inIds})
       ORDER BY tc.QuestionId, tc.CreatedAt`,
      { ids }
    ),
    query<{ QuestionId: number; Author: string; Content: string }>(
      `SELECT c.QuestionId,
              CASE WHEN u.DeletedAt IS NULL THEN u.Name ELSE N'Usuário removido' END AS Author,
              c.Content
       FROM dbo.CommunityComments c
       JOIN dbo.Users u ON u.Id = c.UserId
       WHERE c.QuestionId IN (${inIds})
       ORDER BY c.QuestionId, c.CreatedAt`,
      { ids }
    ),
  ]);

  return rows.map((row) => {
    const own = options.filter((option) => option.QuestionId === row.Id);
    const teacher = teachers.find((comment) => comment.QuestionId === row.Id);
    return {
      id: String(row.Id),
      code: row.Code,
      area: { slug: row.AreaSlug, name: row.AreaName, shortName: row.AreaShortName },
      topic: row.Topic,
      year: row.Year,
      type: row.Type,
      difficulty: row.Difficulty,
      statement: row.Statement,
      options: own.map((option) => ({ id: option.Letter, label: option.Text })),
      correctOptionId: own.find((option) => option.IsCorrect)?.Letter ?? "",
      aiExplanation: row.AiExplanation ?? "",
      teacher: teacher
        ? {
            name: [teacher.Title, teacher.Name].filter(Boolean).join(" "),
            credentials: teacher.Credentials,
            comment: teacher.Content,
          }
        : { name: "", credentials: "", comment: "" },
      community: community
        .filter((comment) => comment.QuestionId === row.Id)
        .map((comment) => ({ author: comment.Author, comment: comment.Content })),
    };
  });
}

export async function listQuestions(filters: QuestionFilters): Promise<Question[]> {
  // Latin1_General_CI_AI: LIKE already ignores case and accents, like the front search.
  const rows = await query<QuestionRow>(
    `${SELECT_QUESTIONS}
       AND (@keyword IS NULL OR q.Code LIKE @keyword OR t.Name LIKE @keyword
            OR a.Name LIKE @keyword OR q.Statement LIKE @keyword)
       AND (@area IS NULL OR a.Slug = @area)
       AND (@year IS NULL OR q.Year = @year)
       AND (@type IS NULL OR q.Type = @type)
     ORDER BY q.Year DESC, q.Code`,
    {
      keyword: filters.keyword ? `%${filters.keyword.replace(/[%_[]/g, "[$&]")}%` : null,
      area: filters.area ?? null,
      year: filters.year ?? null,
      type: filters.type ?? null,
    }
  );
  return hydrate(rows);
}

export async function findQuestionByCode(code: string): Promise<Question | null> {
  const rows = await query<QuestionRow>(`${SELECT_QUESTIONS} AND q.Code = @code`, { code });
  return (await hydrate(rows))[0] ?? null;
}

export async function findArea(slug: string): Promise<Area | null> {
  const row = await queryOne<{ Slug: string; Name: string; ShortName: string }>(
    `SELECT Slug, Name, ShortName FROM dbo.Areas WHERE Slug = @slug`,
    { slug }
  );
  return row ? { slug: row.Slug, name: row.Name, shortName: row.ShortName } : null;
}

export async function listFilterOptions() {
  const [areas, years, types] = await Promise.all([
    query<{ Slug: string; Name: string; ShortName: string }>(
      `SELECT Slug, Name, ShortName FROM dbo.Areas ORDER BY Name`
    ),
    query<{ Year: number }>(`SELECT DISTINCT Year FROM dbo.Questions WHERE IsActive = 1 ORDER BY Year DESC`),
    query<{ Type: string }>(`SELECT DISTINCT Type FROM dbo.Questions WHERE IsActive = 1 ORDER BY Type`),
  ]);
  return {
    areas: areas.map((area) => ({ slug: area.Slug, name: area.Name, shortName: area.ShortName })),
    years: years.map((row) => row.Year),
    types: types.map((row) => row.Type),
  };
}

export async function countQuestionsByArea(): Promise<Record<string, number>> {
  const rows = await query<{ Slug: string; Total: number }>(
    `SELECT a.Slug, COUNT(*) AS Total
     FROM dbo.Questions q JOIN dbo.Topics t ON t.Id = q.TopicId JOIN dbo.Areas a ON a.Id = t.AreaId
     WHERE q.IsActive = 1 GROUP BY a.Slug`
  );
  return Object.fromEntries(rows.map((row) => [row.Slug, row.Total]));
}

/** Active questions by id, in the given order (mock exam order). */
export async function listQuestionsByIds(ids: number[]): Promise<Question[]> {
  if (ids.length === 0) return [];
  const rows = await query<QuestionRow>(
    `${SELECT_QUESTIONS} AND q.Id IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))`,
    { ids: ids.join(",") }
  );
  const byId = new Map((await hydrate(rows)).map((question) => [question.id, question]));
  return ids.flatMap((id) => byId.get(String(id)) ?? []);
}
