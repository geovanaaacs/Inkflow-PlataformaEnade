import { query, queryOne } from "../../db/pool.js";
import type { PlanId, UserRole } from "../../shared/plan-access.js";

/** Public user shape — the same `AuthUser` the front already uses. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Students only; null for teachers and admins. */
  plan: PlanId | null;
  course: string | null;
  /** Profile photo as a data URL (data:image/jpeg;base64,...), or null. */
  photoUrl: string | null;
}

/** Logged-in user as the API sees it: public data plus plan rules. */
export interface SessionUser extends Omit<AuthUser, "photoUrl"> {
  featureCodes: string[];
  /** Daily first-attempt limit of the plan; null = unlimited. */
  dailyQuestionLimit: number | null;
}

interface UserRow {
  Id: string;
  Name: string;
  Email: string;
  Role: UserRole;
  Course: string | null;
  PlanSlug: PlanId | null;
  DailyQuestionLimit: number | null;
  FeatureCodes: string | null;
}

const SELECT_USER = `
  SELECT u.Id, u.Name, u.Email, u.Role, u.Course,
         p.Slug AS PlanSlug, p.DailyQuestionLimit,
         (SELECT STRING_AGG(f.Code, ',')
            FROM dbo.PlanFeatures pf JOIN dbo.Features f ON f.Id = pf.FeatureId
           WHERE pf.PlanId = p.Id) AS FeatureCodes
  FROM dbo.Users u
  OUTER APPLY (SELECT TOP (1) s.PlanId FROM dbo.Subscriptions s
                WHERE s.UserId = u.Id AND s.Status = N'ativa') active
  LEFT JOIN dbo.Plans p ON p.Id = active.PlanId`;

function toSessionUser(row: UserRow): SessionUser {
  const isStudent = row.Role === "aluno";
  return {
    id: row.Id.toLowerCase(),
    name: row.Name,
    email: row.Email,
    role: row.Role,
    plan: isStudent ? (row.PlanSlug ?? "basico") : null,
    course: row.Course,
    featureCodes: isStudent && row.FeatureCodes ? row.FeatureCodes.split(",") : [],
    dailyQuestionLimit: isStudent ? row.DailyQuestionLimit : null,
  };
}

/**
 * The photo is not part of SessionUser (loaded on every request); routes that
 * return the user to the client pass it from findPhoto().
 */
export function toPublicUser(user: SessionUser, photoUrl: string | null = null): AuthUser {
  const { id, name, email, role, plan, course } = user;
  return { id, name, email, role, plan, course, photoUrl };
}

export async function findPhoto(id: string): Promise<string | null> {
  const row = await queryOne<{ PhotoUrl: string | null }>(`SELECT PhotoUrl FROM dbo.Users WHERE Id = @id`, { id });
  return row?.PhotoUrl ?? null;
}

/** null removes the photo. */
export async function updatePhoto(id: string, photoUrl: string | null): Promise<void> {
  await query(`UPDATE dbo.Users SET PhotoUrl = @photoUrl WHERE Id = @id`, { id, photoUrl });
}

/** Active (not deactivated, not deleted) account by id. */
export async function findActiveUserById(id: string): Promise<SessionUser | null> {
  const row = await queryOne<UserRow>(
    `${SELECT_USER} WHERE u.Id = @id AND u.IsActive = 1 AND u.DeletedAt IS NULL`,
    { id }
  );
  return row ? toSessionUser(row) : null;
}

export interface Credentials {
  id: string;
  passwordHash: string;
  isActive: boolean;
}

export async function findCredentialsByEmail(email: string): Promise<Credentials | null> {
  const row = await queryOne<{ Id: string; PasswordHash: string; IsActive: boolean }>(
    `SELECT Id, PasswordHash, IsActive FROM dbo.Users WHERE Email = @email AND DeletedAt IS NULL`,
    { email }
  );
  return row ? { id: row.Id, passwordHash: row.PasswordHash, isActive: row.IsActive } : null;
}

/** `exceptUserId` lets a user keep their own e-mail when editing the profile. */
export async function emailInUse(email: string, exceptUserId?: string): Promise<boolean> {
  const rows = await query<{ Id: string }>(
    `SELECT Id FROM dbo.Users
      WHERE Email = @email AND DeletedAt IS NULL
        AND (@exceptUserId IS NULL OR Id <> @exceptUserId)`,
    { email, exceptUserId: exceptUserId ?? null }
  );
  return rows.length > 0;
}

export interface ProfileChanges {
  name: string;
  email: string;
  course: string | null;
}

/** The user editing their own profile (name, e-mail, course). */
export async function updateProfile(id: string, changes: ProfileChanges): Promise<void> {
  await query(
    `UPDATE dbo.Users SET Name = @name, Email = @email, Course = @course
      WHERE Id = @id AND DeletedAt IS NULL`,
    { id, ...changes }
  );
}

export async function findPasswordHashById(id: string): Promise<string | null> {
  const row = await queryOne<{ PasswordHash: string }>(
    `SELECT PasswordHash FROM dbo.Users WHERE Id = @id AND DeletedAt IS NULL`,
    { id }
  );
  return row?.PasswordHash ?? null;
}

export async function updatePasswordHash(id: string, passwordHash: string): Promise<void> {
  await query(`UPDATE dbo.Users SET PasswordHash = @passwordHash WHERE Id = @id`, { id, passwordHash });
}

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
  role: Exclude<UserRole, "admin">;
}

/**
 * Creates the account. Students start on the Básico plan; teachers get an
 * unverified teacher profile (needed to comment and open mentoring slots).
 */
export async function createUser(input: NewUser): Promise<string> {
  const rows = await query<{ Id: string }>(
    `SET XACT_ABORT ON;
     BEGIN TRANSACTION;
       DECLARE @created TABLE (Id UNIQUEIDENTIFIER);
       INSERT INTO dbo.Users (Name, Email, PasswordHash, Role)
       OUTPUT inserted.Id INTO @created
       VALUES (@name, @email, @passwordHash, @role);
       DECLARE @id UNIQUEIDENTIFIER = (SELECT Id FROM @created);

       IF @role = N'aluno'
         INSERT INTO dbo.Subscriptions (UserId, PlanId, Status, Price)
         SELECT @id, Id, N'ativa', Price FROM dbo.Plans WHERE Slug = N'basico';

       IF @role = N'professor'
         INSERT INTO dbo.TeacherProfiles (UserId, Credentials, IsVerified)
         VALUES (@id, N'A definir', 0);
     COMMIT TRANSACTION;
     SELECT @id AS Id;`,
    { ...input }
  );
  const id = rows[0]?.Id;
  if (!id) throw new Error("Falha ao criar usuário");
  return id;
}
