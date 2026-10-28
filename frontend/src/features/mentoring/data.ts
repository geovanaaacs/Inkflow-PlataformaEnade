export type SessionType = "mentoria" | "grupo";

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  mentoria: "Mentoria coletiva",
  grupo: "Grupo de estudo com especialista",
};

export const SESSION_TYPE_DESCRIPTION: Record<SessionType, string> = {
  mentoria:
    "Aula ao vivo com um professor para toda a turma Premium: revisão de conteúdo e dúvidas abertas.",
  grupo:
    "Grupo pequeno guiado por um especialista, que define o que estudar e em que ordem.",
};

/** A time the teacher opened for students to book (TeacherAvailability). */
export interface AvailabilitySlot {
  id: string;
  teacherId: string;
  teacherName: string;
  type: SessionType;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  topic: string;
  /** Set when the teacher removes the slot (kept so students still see what happened). */
  canceledAt?: string | null;
}

export type RequestStatus = "pendente" | "confirmada" | "recusada" | "cancelada";

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

