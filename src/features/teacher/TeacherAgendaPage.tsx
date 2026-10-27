import { useMemo, useState } from "react";
import { Button } from "@/design-system/components/Button";
import { Calendar, type CalendarDayMarker } from "@/design-system/components/Calendar";
import { Card } from "@/design-system/components/Card";
import { Container } from "@/design-system/components/Container";
import { Modal } from "@/design-system/components/Modal";
import { Spinner } from "@/design-system/components/Spinner";
import {
  deleteSlot,
  listTeacherRequests,
  listTeacherSlots,
  respondToRequest,
  type TeacherSlot,
} from "@/features/mentoring/api";
import { errorMessage } from "@/shared/api/api-error";
import { useAsync } from "@/shared/hooks/useAsync";
import { dayKey } from "@/shared/utils/dates";
import { DaySchedule } from "./components/DaySchedule";
import { NewSlotForm } from "./components/NewSlotForm";
import { TeacherRequestsCard } from "./components/TeacherRequestsCard";

function loadAgenda() {
  return Promise.all([listTeacherSlots(), listTeacherRequests()]);
}

function tomorrowKey(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return dayKey(date);
}

/**
 * /professor/agenda — calendar of the teacher's available times, the student
 * requests for each one, and the form to open new times.
 */
export function TeacherAgendaPage() {
  const [version, setVersion] = useState(0);
  const { data, loading, error } = useAsync(loadAgenda, [version]);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => dayKey());
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [slotToDelete, setSlotToDelete] = useState<TeacherSlot | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const slots = data?.[0] ?? [];
  const requests = data?.[1] ?? [];

  const slotsByDay = useMemo(() => {
    const groups: Record<string, TeacherSlot[]> = {};
    for (const slot of data?.[0] ?? []) (groups[dayKey(new Date(slot.startsAt))] ??= []).push(slot);
    return groups;
  }, [data]);

  const markers = useMemo(() => {
    const result: Record<string, CalendarDayMarker> = {};
    for (const [key, daySlots] of Object.entries(slotsByDay)) {
      const pending = daySlots.reduce((sum, slot) => sum + slot.pending, 0);
      result[key] = {
        count: daySlots.length,
        label: `${daySlots.length} ${daySlots.length === 1 ? "horário" : "horários"}${
          pending > 0 ? `, ${pending} ${pending === 1 ? "solicitação pendente" : "solicitações pendentes"}` : ""
        }`,
        tone: pending > 0 ? "warning" : "brand",
      };
    }
    return result;
  }, [slotsByDay]);

  function refresh() {
    setVersion((current) => current + 1);
  }

  function showDay(key: string) {
    setSelectedDate(key);
    const [year, monthNumber] = key.split("-").map(Number);
    setMonth(new Date(year, monthNumber - 1, 1));
    document.getElementById("day-schedule-heading")?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleRespond(requestId: string, decision: "confirmada" | "recusada") {
    setBusyRequestId(requestId);
    setFeedback(null);
    try {
      await respondToRequest(requestId, decision);
      setFeedback({
        tone: "success",
        text: decision === "confirmada" ? "Solicitação aceita." : "Solicitação recusada.",
      });
      refresh();
    } catch (respondError) {
      setFeedback({ tone: "danger", text: errorMessage(respondError) });
    } finally {
      setBusyRequestId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!slotToDelete) return;
    setDeleting(true);
    try {
      await deleteSlot(slotToDelete.id);
      setFeedback({ tone: "success", text: "Horário removido." });
      refresh();
    } catch (deleteError) {
      setFeedback({ tone: "danger", text: errorMessage(deleteError) });
    } finally {
      setDeleting(false);
      setSlotToDelete(null);
    }
  }

  const selectedLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const affectedStudents = slotToDelete ? slotToDelete.confirmed + slotToDelete.pending : 0;

  return (
    <Container as="div" className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-strong">Agenda de mentorias</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Defina os dias e horários disponíveis e responda às solicitações de mentoria coletiva e
          grupos de estudo.
        </p>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={feedback?.tone === "danger" ? "text-sm text-danger" : "text-sm font-semibold text-success"}
      >
        {feedback?.text}
      </p>

      {loading && !data ? (
        <Spinner label="Carregando agenda…" className="py-10" />
      ) : error ? (
        <p className="text-sm text-ink-muted">
          {errorMessage(error, "Não foi possível carregar a agenda.")}
        </p>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
            <div className="flex flex-col gap-6">
              <Card as="section" aria-label="Calendário da agenda">
                <Calendar
                  label="Seus horários"
                  month={month}
                  onMonthChange={setMonth}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  markers={markers}
                />
                <p className="mt-4 flex items-center gap-4 text-xs text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="size-3 rounded-full bg-brand-600" /> Horários
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="size-3 rounded-full bg-warning" /> Com
                    solicitações pendentes
                  </span>
                </p>
              </Card>

              <NewSlotForm
                defaultDate={selectedDate < dayKey() ? tomorrowKey() : selectedDate}
                onCreated={(date) => {
                  setFeedback({
                    tone: "success",
                    text: "Horário aberto! Ele já aparece para os alunos Premium.",
                  });
                  showDay(date);
                  refresh();
                }}
              />
            </div>

            <Card as="section" aria-labelledby="day-schedule-heading">
              <h2
                id="day-schedule-heading"
                className="text-lg font-semibold text-ink-strong first-letter:uppercase"
              >
                {selectedLabel}
              </h2>
              <div className="mt-4">
                <DaySchedule
                  slots={slotsByDay[selectedDate] ?? []}
                  requests={requests}
                  busyRequestId={busyRequestId}
                  onRespond={handleRespond}
                  onDelete={setSlotToDelete}
                />
              </div>
            </Card>
          </div>

          <TeacherRequestsCard
            requests={requests}
            busyRequestId={busyRequestId}
            onRespond={handleRespond}
            onShowDay={showDay}
          />

          <p className="text-xs text-ink-muted">
            {slots.length} {slots.length === 1 ? "horário cadastrado" : "horários cadastrados"} no
            total.
          </p>
        </>
      )}

      <Modal
        open={slotToDelete !== null}
        onClose={() => setSlotToDelete(null)}
        title="Remover horário?"
        description={
          affectedStudents > 0
            ? affectedStudents === 1
              ? "1 aluno tem solicitação para este horário. Ela será recusada automaticamente."
              : `${affectedStudents} alunos têm solicitação para este horário. Elas serão recusadas automaticamente.`
            : "Nenhum aluno solicitou este horário ainda."
        }
      >
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setSlotToDelete(null)}>
            Cancelar
          </Button>
          <Button variant="danger" fullWidth disabled={deleting} onClick={handleConfirmDelete}>
            {deleting ? "Removendo..." : "Remover horário"}
          </Button>
        </div>
      </Modal>
    </Container>
  );
}

export default TeacherAgendaPage;
