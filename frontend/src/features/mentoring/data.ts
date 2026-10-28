import { daysAgoIso, daysFromNowIso } from "@/shared/utils/dates";

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

/** Teachers without a login in the mock (only Marcela can log in). */
const RICARDO = { teacherId: "t-ricardo", teacherName: "Prof. Ricardo Alves" };
const MARCELA = { teacherId: "u-marcela", teacherName: "Profa. Marcela Guedes" };

export function seedSlots(): AvailabilitySlot[] {
  return [
    // Mentoria coletiva (turmas grandes, 60 min)
    { id: "slot-m0", ...MARCELA, type: "mentoria", startsAt: daysAgoIso(2, 19), durationMinutes: 60, capacity: 30, topic: "Estruturas de controle em C#" },
    { id: "slot-m1", ...MARCELA, type: "mentoria", startsAt: daysFromNowIso(1, 19), durationMinutes: 60, capacity: 30, topic: "Revisão de Orientação a Objetos" },
    { id: "slot-m2", ...RICARDO, type: "mentoria", startsAt: daysFromNowIso(3, 20), durationMinutes: 60, capacity: 30, topic: "Redes: camada de transporte" },
    { id: "slot-m3", ...MARCELA, type: "mentoria", startsAt: daysFromNowIso(6, 19), durationMinutes: 60, capacity: 30, topic: "Padrões de projeto na prática" },
    { id: "slot-m4", ...RICARDO, type: "mentoria", startsAt: daysFromNowIso(10, 19, 30), durationMinutes: 60, capacity: 30, topic: "Banco de dados: normalização" },
    { id: "slot-m5", ...MARCELA, type: "mentoria", startsAt: daysFromNowIso(15, 19), durationMinutes: 90, capacity: 40, topic: "Simulado comentado ao vivo" },
    // Grupo de estudo com especialista (grupos pequenos, 90 min)
    { id: "slot-g1", ...MARCELA, type: "grupo", startsAt: daysFromNowIso(2, 18), durationMinutes: 90, capacity: 8, topic: "Trilha Eng. de Software — semana 1" },
    { id: "slot-g2", ...RICARDO, type: "grupo", startsAt: daysFromNowIso(5, 18), durationMinutes: 90, capacity: 8, topic: "Trilha Infraestrutura — sistemas operacionais" },
    { id: "slot-g3", ...MARCELA, type: "grupo", startsAt: daysFromNowIso(9, 18), durationMinutes: 90, capacity: 8, topic: "Trilha Eng. de Software — semana 2" },
    { id: "slot-g4", ...RICARDO, type: "grupo", startsAt: daysFromNowIso(12, 10), durationMinutes: 90, capacity: 8, topic: "Trilha Infraestrutura — redes" },
    { id: "slot-g5", ...MARCELA, type: "grupo", startsAt: daysFromNowIso(16, 18), durationMinutes: 90, capacity: 8, topic: "Trilha Eng. de Software — semana 3" },
  ];
}

export function seedRequests(): MentoringRequest[] {
  const request = (
    id: string,
    slotId: string,
    studentId: string,
    studentName: string,
    status: RequestStatus,
    message: string
  ): MentoringRequest => ({
    id,
    slotId,
    studentId,
    studentName,
    message,
    status,
    createdAt: daysAgoIso(1, 9),
    respondedAt: status === "pendente" ? null : daysAgoIso(0, 8),
  });

  return [
    request("req-1", "slot-m1", "u-nicole", "Nicole Silva", "confirmada", "Quero revisar polimorfismo."),
    request("req-2", "slot-g1", "u-nicole", "Nicole Silva", "pendente", ""),
    request("req-3", "slot-m1", "c-lucas", "Lucas Andrade", "pendente", "Tenho dúvidas sobre interfaces x classes abstratas."),
    request("req-4", "slot-g1", "c-camila", "Camila Torres", "pendente", "Posso entrar no grupo de ES?"),
    request("req-5", "slot-m3", "c-beatriz", "Beatriz Rocha", "confirmada", ""),
    request("req-6", "slot-m2", "c-larissa", "Larissa Mendes", "pendente", "Gostaria de focar em TCP x UDP."),
  ];
}
