import { useMemo, useState } from "react";
import { Calendar, type CalendarDayMarker } from "@/design-system/components/Calendar";
import { Card } from "@/design-system/components/Card";
import { Container } from "@/design-system/components/Container";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/design-system/components/SegmentedControl";
import { Spinner } from "@/design-system/components/Spinner";
import { useAuth } from "@/features/auth/auth-context";
import { errorMessage } from "@/shared/api/api-error";
import { LockedFeature } from "@/shared/components/LockedFeature";
import { useAsync } from "@/shared/hooks/useAsync";
import { hasFeature } from "@/shared/plans/plan-access";
import { dayKey } from "@/shared/utils/dates";
import { listMyRequests, listOpenSlots, type OpenSlot } from "./api";
import { MyRequestsCard } from "./components/MyRequestsCard";
import { RequestSlotModal } from "./components/RequestSlotModal";
import { SlotList } from "./components/SlotList";
import { SESSION_TYPE_DESCRIPTION, SESSION_TYPE_LABEL, type SessionType } from "./data";

const typeOptions: SegmentedControlOption<SessionType>[] = [
  { value: "mentoria", label: SESSION_TYPE_LABEL.mentoria },
  { value: "grupo", label: SESSION_TYPE_LABEL.grupo },
];

/** /mentoria — students book collective mentoring or expert-led study groups (Premium). */
export function MentoringPage() {
  const { user } = useAuth();
  const unlocked = hasFeature(user?.plan, "mentoring");

  return (
    <Container as="div" className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-strong">Mentoria e grupos de estudo</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Escolha um dia e um horário definidos pelos professores e solicite sua vaga.
        </p>
      </div>

      {unlocked ? (
        <MentoringScheduler />
      ) : (
        <Card>
          <LockedFeature
            feature="mentoring"
            label="Mentoria com professores"
            description="Mentoria coletiva ao vivo e grupos de estudo guiados por especialistas fazem parte do plano Premium."
          />
        </Card>
      )}
    </Container>
  );
}

function groupByDay(slots: OpenSlot[]): Record<string, OpenSlot[]> {
  const groups: Record<string, OpenSlot[]> = {};
  for (const slot of slots) {
    const key = dayKey(new Date(slot.startsAt));
    (groups[key] ??= []).push(slot);
  }
  return groups;
}

function MentoringScheduler() {
  const [type, setType] = useState<SessionType>("mentoria");
  const [version, setVersion] = useState(0);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [requestingSlot, setRequestingSlot] = useState<OpenSlot | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: slots, loading, error } = useAsync(() => listOpenSlots(type), [type, version]);
  const myRequests = useAsync(listMyRequests, [version]);

  const slotsByDay = useMemo(() => groupByDay(slots ?? []), [slots]);
  const firstAvailableDay = slots && slots.length > 0 ? dayKey(new Date(slots[0].startsAt)) : null;
  const activeDate = selectedDate && slotsByDay[selectedDate] ? selectedDate : firstAvailableDay;

  const markers = useMemo(() => {
    const result: Record<string, CalendarDayMarker> = {};
    for (const [key, daySlots] of Object.entries(slotsByDay)) {
      const open = daySlots.filter((slot) => slot.spotsLeft > 0).length;
      result[key] = {
        count: daySlots.length,
        label: `${daySlots.length} ${daySlots.length === 1 ? "horário" : "horários"}, ${open} com vagas`,
        tone: open > 0 ? "brand" : "warning",
      };
    }
    return result;
  }, [slotsByDay]);

  function handleTypeChange(next: SessionType) {
    setType(next);
    setSelectedDate(null);
    setStatusMessage(null);
  }

  function refresh() {
    setVersion((current) => current + 1);
  }

  const daySlots = activeDate ? slotsByDay[activeDate] ?? [] : [];
  const activeDateLabel = activeDate
    ? new Date(`${activeDate}T12:00:00`).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <SegmentedControl
          aria-label="Tipo de encontro"
          options={typeOptions}
          value={type}
          onChange={handleTypeChange}
          className="w-full sm:w-fit [&_button]:text-sm"
        />
        <p className="text-sm text-ink-muted">{SESSION_TYPE_DESCRIPTION[type]}</p>
      </div>

      <p role="status" aria-live="polite" className="text-sm font-semibold text-success">
        {statusMessage}
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
        <Card as="section" aria-label="Calendário de horários">
          <Calendar
            label={`Dias com ${SESSION_TYPE_LABEL[type].toLowerCase()}`}
            month={month}
            onMonthChange={setMonth}
            selectedDate={activeDate}
            onSelectDate={(key) => {
              setSelectedDate(key);
              setStatusMessage(null);
            }}
            markers={markers}
            isDateDisabled={(key) => !slotsByDay[key]}
          />
          <p className="mt-4 text-xs text-ink-muted">
            Os números indicam quantos horários os professores abriram no dia.
          </p>
        </Card>

        <Card as="section" aria-labelledby="day-slots-heading">
          <h2 id="day-slots-heading" className="text-lg font-semibold first-letter:uppercase text-ink-strong">
            {activeDateLabel ?? "Horários disponíveis"}
          </h2>
          <div className="mt-4">
            {loading && !slots ? (
              <Spinner label="Carregando horários…" className="py-6" />
            ) : error ? (
              <p className="text-sm text-ink-muted">
                {errorMessage(error, "Não foi possível carregar os horários.")}
              </p>
            ) : daySlots.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nenhum horário disponível no momento. Volte em breve — os professores abrem novas
                datas toda semana.
              </p>
            ) : (
              <SlotList slots={daySlots} onRequest={setRequestingSlot} />
            )}
          </div>
        </Card>
      </div>

      <MyRequestsCard
        requests={myRequests.data}
        loading={myRequests.loading}
        onChanged={refresh}
      />

      <RequestSlotModal
        slot={requestingSlot}
        onClose={() => setRequestingSlot(null)}
        onRequested={() => {
          setRequestingSlot(null);
          setStatusMessage(
            "Solicitação enviada! Acompanhe a resposta do professor em “Minhas solicitações”."
          );
          refresh();
        }}
      />
    </>
  );
}

export default MentoringPage;
