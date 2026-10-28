import { query, queryOne, withTransaction } from "../../db/pool.js";
import { HttpError } from "../../http/errors.js";
import type { SessionUser } from "../auth/users.repository.js";
import { toUtcIso } from "../questions/answers.repository.js";

/** Same shapes as the front (features/mentoring/data.ts and api.ts). */
export type SessionType = "mentoria" | "grupo";
export type RequestStatus = "pendente" | "confirmada" | "recusada" | "cancelada";

export interface AvailabilitySlot {
  id: string;
  teacherId: string;
  teacherName: string;
  type: SessionType;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  topic: string;
  canceledAt: string | null;
}

export interface OpenSlot extends AvailabilitySlot {
  spotsLeft: number;
  myRequest: { id: string; status: RequestStatus } | null;
}

export interface TeacherSlot extends AvailabilitySlot {
  confirmed: number;
  pending: number;
}

export interface MentoringRequest {
  id: string;
  slotId: string;
  studentId: string;
  studentName: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface RequestWithSlot extends MentoringRequest {
  slot: AvailabilitySlot;
}

export interface NewSlotInput {
  type: SessionType;
  /** Local date in Brasília, "YYYY-MM-DD". */
  date: string;
  /** Local time in Brasília, "HH:mm". */
  time: string;
  durationMinutes: number;
  capacity: number;
  topic: string;
}

interface SlotRow {
  Id: number;
  TeacherUserId: string;
  TeacherName: string;
  SessionType: SessionType;
  StartsAt: Date;
  DurationMinutes: number;
  Capacity: number;
  Topic: string;
  CanceledAt: Date | null;
  Confirmed: number;
  Pending: number;
  IsFuture: boolean;
}

const SELECT_SLOTS = `
  SELECT s.Id, s.TeacherUserId,
         LTRIM(CONCAT(tp.Title, N' ', u.Name)) AS TeacherName,
         s.SessionType, s.StartsAt, s.DurationMinutes, s.Capacity, s.Topic, s.CanceledAt,
         (SELECT COUNT(*) FROM dbo.MentoringRequests r WHERE r.SlotId = s.Id AND r.Status = N'confirmada') AS Confirmed,
         (SELECT COUNT(*) FROM dbo.MentoringRequests r WHERE r.SlotId = s.Id AND r.Status = N'pendente') AS Pending,
         CAST(CASE WHEN s.StartsAt > SYSUTCDATETIME() THEN 1 ELSE 0 END AS BIT) AS IsFuture
  FROM dbo.TeacherAvailabilitySlots s
  JOIN dbo.Users u ON u.Id = s.TeacherUserId
  JOIN dbo.TeacherProfiles tp ON tp.UserId = s.TeacherUserId`;

function toSlot(row: SlotRow): AvailabilitySlot {
  return {
    id: String(row.Id),
    teacherId: row.TeacherUserId.toLowerCase(),
    teacherName: row.TeacherName,
    type: row.SessionType,
    startsAt: toUtcIso(row.StartsAt),
    durationMinutes: row.DurationMinutes,
    capacity: row.Capacity,
    topic: row.Topic,
    canceledAt: row.CanceledAt ? toUtcIso(row.CanceledAt) : null,
  };
}

interface RequestRow {
  Id: number;
  SlotId: number;
  StudentUserId: string;
  StudentName: string;
  Message: string | null;
  Status: RequestStatus;
  CreatedAt: Date;
  RespondedAt: Date | null;
}

const SELECT_REQUESTS = `
  SELECT r.Id, r.SlotId, r.StudentUserId,
         CASE WHEN u.DeletedAt IS NULL THEN u.Name ELSE N'Usuário removido' END AS StudentName,
         r.Message, r.Status, r.CreatedAt, r.RespondedAt
  FROM dbo.MentoringRequests r
  JOIN dbo.Users u ON u.Id = r.StudentUserId`;

function toRequest(row: RequestRow): MentoringRequest {
  return {
    id: String(row.Id),
    slotId: String(row.SlotId),
    studentId: row.StudentUserId.toLowerCase(),
    studentName: row.StudentName,
    message: row.Message ?? "",
    status: row.Status,
    createdAt: toUtcIso(row.CreatedAt),
    respondedAt: row.RespondedAt ? toUtcIso(row.RespondedAt) : null,
  };
}

/** Upcoming sessions first (soonest at the top), past ones after. */
function upcomingFirst(a: RequestWithSlot, b: RequestWithSlot): number {
  const now = Date.now();
  const aPast = new Date(a.slot.startsAt).getTime() < now;
  const bPast = new Date(b.slot.startsAt).getTime() < now;
  if (aPast !== bPast) return aPast ? 1 : -1;
  return a.slot.startsAt.localeCompare(b.slot.startsAt);
}

async function joinSlots(requests: RequestRow[]): Promise<RequestWithSlot[]> {
  if (requests.length === 0) return [];
  const slotIds = [...new Set(requests.map((request) => request.SlotId))].join(",");
  const slots = await query<SlotRow>(
    `${SELECT_SLOTS} WHERE s.Id IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@slotIds, ','))`,
    { slotIds }
  );
  const byId = new Map(slots.map((slot) => [slot.Id, toSlot(slot)]));
  return requests
    .flatMap((request) => {
      const slot = byId.get(request.SlotId);
      return slot ? [{ ...toRequest(request), slot }] : [];
    })
    .sort(upcomingFirst);
}

/* ------------------------------------------------------------------ Aluno */

export async function listOpenSlots(user: SessionUser, type: SessionType): Promise<OpenSlot[]> {
  const [slots, mine] = await Promise.all([
    query<SlotRow>(
      `${SELECT_SLOTS} WHERE s.SessionType = @type AND s.CanceledAt IS NULL AND s.StartsAt > SYSUTCDATETIME()
       ORDER BY s.StartsAt`,
      { type }
    ),
    query<{ Id: number; SlotId: number; Status: RequestStatus }>(
      `SELECT Id, SlotId, Status FROM dbo.MentoringRequests
       WHERE StudentUserId = @userId AND Status <> N'cancelada'`,
      { userId: user.id }
    ),
  ]);
  return slots.map((row) => {
    const own = mine.find((request) => request.SlotId === row.Id);
    return {
      ...toSlot(row),
      spotsLeft: Math.max(0, row.Capacity - row.Confirmed - row.Pending),
      myRequest: own ? { id: String(own.Id), status: own.Status } : null,
    };
  });
}

export async function requestSlot(user: SessionUser, slotId: number, message: string): Promise<MentoringRequest> {
  return withTransaction(async (run) => {
    const [slot] = await run<SlotRow>(
      `${SELECT_SLOTS} WHERE s.Id = @slotId AND s.CanceledAt IS NULL AND s.StartsAt > SYSUTCDATETIME()`,
      { slotId }
    );
    if (!slot) throw new HttpError(404, "Este horário não está mais disponível.");

    const [already] = await run<{ Id: number }>(
      `SELECT Id FROM dbo.MentoringRequests WITH (UPDLOCK, HOLDLOCK)
       WHERE SlotId = @slotId AND StudentUserId = @userId AND Status <> N'cancelada'`,
      { slotId, userId: user.id }
    );
    if (already) throw new HttpError(409, "Você já solicitou este horário.");
    if (slot.Confirmed + slot.Pending >= slot.Capacity) {
      throw new HttpError(409, "Não há mais vagas neste horário.");
    }

    const [row] = await run<RequestRow>(
      `INSERT INTO dbo.MentoringRequests (SlotId, StudentUserId, Message, Status)
       OUTPUT inserted.Id, inserted.SlotId, inserted.StudentUserId, @studentName AS StudentName,
              inserted.Message, inserted.Status, inserted.CreatedAt, inserted.RespondedAt
       VALUES (@slotId, @userId, @message, N'pendente')`,
      { slotId, userId: user.id, studentName: user.name, message: message || null }
    );
    if (!row) throw new HttpError(500, "Não foi possível enviar a solicitação.");
    return toRequest(row);
  });
}

export async function listMyRequests(user: SessionUser): Promise<RequestWithSlot[]> {
  const rows = await query<RequestRow>(`${SELECT_REQUESTS} WHERE r.StudentUserId = @userId`, { userId: user.id });
  return joinSlots(rows);
}

export async function cancelMyRequest(user: SessionUser, requestId: number): Promise<void> {
  const request = await queryOne<{ Status: RequestStatus }>(
    `SELECT Status FROM dbo.MentoringRequests WHERE Id = @requestId AND StudentUserId = @userId`,
    { requestId, userId: user.id }
  );
  if (!request) throw new HttpError(404, "Solicitação não encontrada.");
  if (request.Status !== "pendente" && request.Status !== "confirmada") {
    throw new HttpError(409, "Esta solicitação não pode mais ser cancelada.");
  }
  await query(
    `UPDATE dbo.MentoringRequests SET Status = N'cancelada', RespondedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
     WHERE Id = @requestId`,
    { requestId }
  );
}

/* ------------------------------------------------------------------ Professor */

export async function listTeacherSlots(user: SessionUser): Promise<TeacherSlot[]> {
  const rows = await query<SlotRow>(
    `${SELECT_SLOTS} WHERE s.TeacherUserId = @userId AND s.CanceledAt IS NULL ORDER BY s.StartsAt`,
    { userId: user.id }
  );
  return rows.map((row) => ({ ...toSlot(row), confirmed: row.Confirmed, pending: row.Pending }));
}

export async function createSlot(user: SessionUser, input: NewSlotInput): Promise<AvailabilitySlot> {
  return withTransaction(async (run) => {
    // Brasília local date/time → UTC, done by SQL Server's time zone rules.
    const [when] = await run<{ StartsAt: Date; IsFuture: boolean; Overlaps: boolean }>(
      `DECLARE @startsAt DATETIME2(3) = CAST(
         (CAST(CONCAT(@date, N'T', @time, N':00') AS DATETIME2(3)) AT TIME ZONE 'E. South America Standard Time')
         AT TIME ZONE 'UTC' AS DATETIME2(3));
       SELECT @startsAt AS StartsAt,
              CAST(CASE WHEN @startsAt > SYSUTCDATETIME() THEN 1 ELSE 0 END AS BIT) AS IsFuture,
              CAST(CASE WHEN EXISTS (
                SELECT 1 FROM dbo.TeacherAvailabilitySlots WITH (UPDLOCK, HOLDLOCK)
                WHERE TeacherUserId = @userId AND CanceledAt IS NULL
                  AND @startsAt < DATEADD(MINUTE, DurationMinutes, StartsAt)
                  AND DATEADD(MINUTE, @duration, @startsAt) > StartsAt
              ) THEN 1 ELSE 0 END AS BIT) AS Overlaps`,
      { date: input.date, time: input.time, userId: user.id, duration: input.durationMinutes }
    );
    if (!when?.IsFuture) throw new HttpError(400, "Escolha uma data e um horário futuros.");
    if (when.Overlaps) throw new HttpError(409, "Você já tem um horário que se sobrepõe a este.");

    const [created] = await run<{ Id: number }>(
      `INSERT INTO dbo.TeacherAvailabilitySlots (TeacherUserId, SessionType, Topic, StartsAt, DurationMinutes, Capacity)
       OUTPUT inserted.Id
       VALUES (@userId, @type, @topic, @startsAt, @duration, @capacity)`,
      {
        userId: user.id,
        type: input.type,
        topic: input.topic,
        startsAt: when.StartsAt,
        duration: input.durationMinutes,
        capacity: input.capacity,
      }
    );
    const [row] = await run<SlotRow>(`${SELECT_SLOTS} WHERE s.Id = @id`, { id: created?.Id });
    if (!row) throw new HttpError(500, "Não foi possível abrir o horário.");
    return toSlot(row);
  });
}

/** Cancels the slot (kept for history) and declines its active requests. */
export async function cancelSlot(user: SessionUser, slotId: number): Promise<void> {
  await withTransaction(async (run) => {
    const [slot] = await run<{ Id: number }>(
      `SELECT Id FROM dbo.TeacherAvailabilitySlots WITH (UPDLOCK)
       WHERE Id = @slotId AND TeacherUserId = @userId AND CanceledAt IS NULL`,
      { slotId, userId: user.id }
    );
    if (!slot) throw new HttpError(404, "Horário não encontrado.");
    await run(
      `UPDATE dbo.MentoringRequests SET Status = N'recusada', RespondedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
       WHERE SlotId = @slotId AND Status IN (N'pendente', N'confirmada')`,
      { slotId }
    );
    await run(
      `UPDATE dbo.TeacherAvailabilitySlots SET CanceledAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
       WHERE Id = @slotId`,
      { slotId }
    );
  });
}

export async function listTeacherRequests(user: SessionUser): Promise<RequestWithSlot[]> {
  const rows = await query<RequestRow>(
    `${SELECT_REQUESTS}
     JOIN dbo.TeacherAvailabilitySlots s ON s.Id = r.SlotId
     WHERE s.TeacherUserId = @userId AND s.CanceledAt IS NULL`,
    { userId: user.id }
  );
  // Teachers see their agenda in chronological order.
  return (await joinSlots(rows)).sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt));
}

export async function respondToRequest(
  user: SessionUser,
  requestId: number,
  decision: "confirmada" | "recusada"
): Promise<void> {
  await withTransaction(async (run) => {
    const [request] = await run<{ Status: RequestStatus; SlotId: number; Capacity: number; Confirmed: number }>(
      `SELECT r.Status, r.SlotId, s.Capacity,
              (SELECT COUNT(*) FROM dbo.MentoringRequests c WITH (UPDLOCK, HOLDLOCK)
                WHERE c.SlotId = r.SlotId AND c.Status = N'confirmada') AS Confirmed
       FROM dbo.MentoringRequests r WITH (UPDLOCK)
       JOIN dbo.TeacherAvailabilitySlots s ON s.Id = r.SlotId
       WHERE r.Id = @requestId AND s.TeacherUserId = @userId AND s.CanceledAt IS NULL`,
      { requestId, userId: user.id }
    );
    if (!request) throw new HttpError(404, "Solicitação não encontrada.");
    if (request.Status !== "pendente") throw new HttpError(409, "Esta solicitação já foi respondida.");
    if (decision === "confirmada" && request.Confirmed >= request.Capacity) {
      throw new HttpError(409, "Todas as vagas deste horário já foram confirmadas.");
    }
    await run(
      `UPDATE dbo.MentoringRequests SET Status = @decision, RespondedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
       WHERE Id = @requestId`,
      { requestId, decision }
    );
  });
}
