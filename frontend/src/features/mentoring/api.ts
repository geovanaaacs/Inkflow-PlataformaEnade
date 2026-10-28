import { requireSessionUser } from "@/features/auth/api";
import type { AuthUser } from "@/features/auth/auth-context";
import { ApiError } from "@/shared/api/api-error";
import { COLLECTIONS } from "@/shared/api/collections";
import { createId, mockDelay, readCollection, updateCollection } from "@/shared/api/mock-store";
import { hasFeature } from "@/shared/plans/plan-access";
import {
  seedRequests,
  seedSlots,
  type AvailabilitySlot,
  type MentoringRequest,
  type RequestStatus,
  type SessionType,
} from "./data";

/*
 * Mentoring API (mock). Future endpoints (aluno):
 *   GET  /api/mentoring/slots?type=mentoria|grupo
 *   POST /api/mentoring/slots/{id}/requests       GET /api/me/mentoring-requests
 *   POST /api/me/mentoring-requests/{id}/cancel
 */

const SLOTS_KEY = COLLECTIONS.mentoringSlots;
const REQUESTS_KEY = COLLECTIONS.mentoringRequests;
const MESSAGE_MAX_LENGTH = 500;

/** Requests that hold a spot in the session. */
const ACTIVE_STATUSES: RequestStatus[] = ["pendente", "confirmada"];

export interface OpenSlot extends AvailabilitySlot {
  spotsLeft: number;
  /** The student's own active request for this slot, if any. */
  myRequest: { id: string; status: RequestStatus } | null;
}

export interface RequestWithSlot extends MentoringRequest {
  slot: AvailabilitySlot;
}

function readSlots(): AvailabilitySlot[] {
  return readCollection(SLOTS_KEY, seedSlots);
}

function readRequests(): MentoringRequest[] {
  return readCollection(REQUESTS_KEY, seedRequests);
}

function writeRequests(
  updater: (requests: MentoringRequest[]) => MentoringRequest[]
): void {
  updateCollection(REQUESTS_KEY, seedRequests, updater);
}

function spotsTaken(slotId: string, requests: MentoringRequest[]): number {
  return requests.filter(
    (request) => request.slotId === slotId && ACTIVE_STATUSES.includes(request.status)
  ).length;
}

function isFuture(slot: AvailabilitySlot): boolean {
  return new Date(slot.startsAt).getTime() > Date.now();
}

function requireMentoringAccess(): AuthUser {
  const user = requireSessionUser();
  if (!hasFeature(user.plan, "mentoring")) {
    throw new ApiError("Mentoria e grupos de estudo fazem parte do plano Premium.", 403);
  }
  return user;
}

/** Future times offered by the teachers for one session type, soonest first. */
export async function listOpenSlots(type: SessionType): Promise<OpenSlot[]> {
  await mockDelay();
  const user = requireMentoringAccess();
  const requests = readRequests();

  return readSlots()
    .filter((slot) => slot.type === type && !slot.canceledAt && isFuture(slot))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((slot) => {
      const mine = requests.find(
        (request) =>
          request.slotId === slot.id &&
          request.studentId === user.id &&
          request.status !== "cancelada"
      );
      return {
        ...slot,
        spotsLeft: Math.max(0, slot.capacity - spotsTaken(slot.id, requests)),
        myRequest: mine ? { id: mine.id, status: mine.status } : null,
      };
    });
}

export async function requestSlot(slotId: string, message: string): Promise<MentoringRequest> {
  await mockDelay(400);
  const user = requireMentoringAccess();
  const slot = readSlots().find((item) => item.id === slotId);
  if (!slot || slot.canceledAt || !isFuture(slot)) {
    throw new ApiError("Este horário não está mais disponível.", 404);
  }

  const requests = readRequests();
  const alreadyRequested = requests.some(
    (request) =>
      request.slotId === slotId &&
      request.studentId === user.id &&
      request.status !== "cancelada"
  );
  if (alreadyRequested) throw new ApiError("Você já solicitou este horário.", 409);
  if (spotsTaken(slotId, requests) >= slot.capacity) {
    throw new ApiError("Não há mais vagas neste horário.", 409);
  }

  const text = message.trim();
  if (text.length > MESSAGE_MAX_LENGTH) {
    throw new ApiError(`A mensagem pode ter no máximo ${MESSAGE_MAX_LENGTH} caracteres.`, 400);
  }

  const request: MentoringRequest = {
    id: createId("req"),
    slotId,
    studentId: user.id,
    studentName: user.name,
    message: text,
    status: "pendente",
    createdAt: new Date().toISOString(),
    respondedAt: null,
  };
  writeRequests((current) => [...current, request]);
  return request;
}

/** The student's requests (all statuses), upcoming sessions first. */
export async function listMyRequests(): Promise<RequestWithSlot[]> {
  await mockDelay();
  const user = requireMentoringAccess();
  const slots = readSlots();

  return readRequests()
    .filter((request) => request.studentId === user.id)
    .flatMap((request) => {
      const slot = slots.find((item) => item.id === request.slotId);
      return slot ? [{ ...request, slot }] : [];
    })
    .sort((a, b) => {
      const aPast = !isFuture(a.slot);
      const bPast = !isFuture(b.slot);
      if (aPast !== bPast) return aPast ? 1 : -1;
      return a.slot.startsAt.localeCompare(b.slot.startsAt);
    });
}

export async function cancelMyRequest(requestId: string): Promise<void> {
  await mockDelay(300);
  const user = requireMentoringAccess();
  const request = readRequests().find(
    (item) => item.id === requestId && item.studentId === user.id
  );
  if (!request) throw new ApiError("Solicitação não encontrada.", 404);
  if (!ACTIVE_STATUSES.includes(request.status)) {
    throw new ApiError("Esta solicitação não pode mais ser cancelada.", 409);
  }

  writeRequests((current) =>
    current.map((item) =>
      item.id === requestId
        ? { ...item, status: "cancelada", respondedAt: new Date().toISOString() }
        : item
    )
  );
}

/* ------------------------------------------------------------------ Professor
 * Future endpoints:
 *   GET    /api/teacher/slots          POST /api/teacher/slots      DELETE /api/teacher/slots/{id}
 *   GET    /api/teacher/mentoring-requests?status=
 *   POST   /api/teacher/mentoring-requests/{id}/accept | /decline
 */

export interface TeacherSlot extends AvailabilitySlot {
  confirmed: number;
  pending: number;
}

export interface NewSlotInput {
  type: SessionType;
  /** Local date "YYYY-MM-DD". */
  date: string;
  /** Local time "HH:mm". */
  time: string;
  durationMinutes: number;
  capacity: number;
  topic: string;
}

const TOPIC_MAX_LENGTH = 120;

function requireTeacher(): AuthUser {
  const user = requireSessionUser();
  if (user.role !== "professor") {
    throw new ApiError("Apenas professores podem gerenciar a agenda.", 403);
  }
  return user;
}

function teacherDisplayName(user: AuthUser): string {
  return user.id === "u-marcela" ? "Profa. Marcela Guedes" : `Prof. ${user.name}`;
}

function toTeacherSlot(slot: AvailabilitySlot, requests: MentoringRequest[]): TeacherSlot {
  const own = requests.filter((request) => request.slotId === slot.id);
  return {
    ...slot,
    confirmed: own.filter((request) => request.status === "confirmada").length,
    pending: own.filter((request) => request.status === "pendente").length,
  };
}

/** Every slot the teacher opened (past and future), in chronological order. */
export async function listTeacherSlots(): Promise<TeacherSlot[]> {
  await mockDelay();
  const teacher = requireTeacher();
  const requests = readRequests();
  return readSlots()
    .filter((slot) => slot.teacherId === teacher.id && !slot.canceledAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((slot) => toTeacherSlot(slot, requests));
}

export async function createSlot(input: NewSlotInput): Promise<AvailabilitySlot> {
  await mockDelay(300);
  const teacher = requireTeacher();
  const startsAt = new Date(`${input.date}T${input.time}:00`);
  const topic = input.topic.trim();

  if (Number.isNaN(startsAt.getTime())) throw new ApiError("Informe uma data e um horário válidos.", 400);
  if (startsAt.getTime() <= Date.now()) throw new ApiError("Escolha uma data e um horário futuros.", 400);
  if (!topic) throw new ApiError("Informe o tema do encontro.", 400);
  if (topic.length > TOPIC_MAX_LENGTH) {
    throw new ApiError(`O tema pode ter no máximo ${TOPIC_MAX_LENGTH} caracteres.`, 400);
  }
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 100) {
    throw new ApiError("O número de vagas deve ser entre 1 e 100.", 400);
  }

  const endsAt = startsAt.getTime() + input.durationMinutes * 60_000;
  const overlaps = readSlots().some((slot) => {
    if (slot.teacherId !== teacher.id || slot.canceledAt) return false;
    const start = new Date(slot.startsAt).getTime();
    const end = start + slot.durationMinutes * 60_000;
    return startsAt.getTime() < end && endsAt > start;
  });
  if (overlaps) throw new ApiError("Você já tem um horário que se sobrepõe a este.", 409);

  const slot: AvailabilitySlot = {
    id: createId("slot"),
    teacherId: teacher.id,
    teacherName: teacherDisplayName(teacher),
    type: input.type,
    startsAt: startsAt.toISOString(),
    durationMinutes: input.durationMinutes,
    capacity: input.capacity,
    topic,
  };
  updateCollection(SLOTS_KEY, seedSlots, (current) => [...current, slot]);
  return slot;
}

/**
 * Cancels a slot (soft delete, so students still see it in their history).
 * Active requests for it are declined.
 */
export async function deleteSlot(slotId: string): Promise<void> {
  await mockDelay(300);
  const teacher = requireTeacher();
  const slot = readSlots().find((item) => item.id === slotId && item.teacherId === teacher.id);
  if (!slot) throw new ApiError("Horário não encontrado.", 404);

  const respondedAt = new Date().toISOString();
  writeRequests((current) =>
    current.map((request) =>
      request.slotId === slotId && ACTIVE_STATUSES.includes(request.status)
        ? { ...request, status: "recusada", respondedAt }
        : request
    )
  );
  updateCollection(SLOTS_KEY, seedSlots, (current) =>
    current.map((item) => (item.id === slotId ? { ...item, canceledAt: respondedAt } : item))
  );
}

/** Requests for the teacher's slots, soonest session first. */
export async function listTeacherRequests(): Promise<RequestWithSlot[]> {
  await mockDelay();
  const teacher = requireTeacher();
  const slots = readSlots().filter((slot) => slot.teacherId === teacher.id && !slot.canceledAt);

  return readRequests()
    .flatMap((request) => {
      const slot = slots.find((item) => item.id === request.slotId);
      return slot ? [{ ...request, slot }] : [];
    })
    .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt));
}

export async function respondToRequest(
  requestId: string,
  decision: "confirmada" | "recusada"
): Promise<void> {
  await mockDelay(300);
  const teacher = requireTeacher();
  const requests = readRequests();
  const request = requests.find((item) => item.id === requestId);
  const slot = readSlots().find(
    (item) => item.id === request?.slotId && item.teacherId === teacher.id
  );
  if (!request || !slot) throw new ApiError("Solicitação não encontrada.", 404);
  if (request.status !== "pendente") throw new ApiError("Esta solicitação já foi respondida.", 409);

  if (decision === "confirmada") {
    const confirmed = requests.filter(
      (item) => item.slotId === slot.id && item.status === "confirmada"
    ).length;
    if (confirmed >= slot.capacity) throw new ApiError("Todas as vagas deste horário já foram confirmadas.", 409);
  }

  writeRequests((current) =>
    current.map((item) =>
      item.id === requestId
        ? { ...item, status: decision, respondedAt: new Date().toISOString() }
        : item
    )
  );
}
