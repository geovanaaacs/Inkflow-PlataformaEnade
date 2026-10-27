import { useState, type FormEvent } from "react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { createSlot } from "@/features/mentoring/api";
import { SESSION_TYPE_LABEL, type SessionType } from "@/features/mentoring/data";
import { errorMessage } from "@/shared/api/api-error";

const DEFAULT_CAPACITY: Record<SessionType, number> = { mentoria: 30, grupo: 8 };

interface NewSlotFormProps {
  /** Pre-fills the date with the day selected in the calendar. */
  defaultDate: string;
  onCreated: (date: string) => void;
}

/** Teacher opens a new available time (the times students see on /mentoria). */
export function NewSlotForm({ defaultDate, onCreated }: NewSlotFormProps) {
  const [type, setType] = useState<SessionType>("mentoria");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("19:00");
  const [duration, setDuration] = useState("60");
  const [capacity, setCapacity] = useState(String(DEFAULT_CAPACITY.mentoria));
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Follow the calendar selection until the teacher edits the date by hand.
  const [dateTouched, setDateTouched] = useState(false);
  const effectiveDate = dateTouched ? date : defaultDate;

  function handleTypeChange(next: SessionType) {
    setType(next);
    setCapacity(String(DEFAULT_CAPACITY[next]));
    setDuration(next === "grupo" ? "90" : "60");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createSlot({
        type,
        date: effectiveDate,
        time,
        durationMinutes: Number(duration),
        capacity: Number(capacity),
        topic,
      });
      setTopic("");
      setDateTouched(false);
      onCreated(effectiveDate);
    } catch (createError) {
      setError(errorMessage(createError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card as="section" aria-labelledby="new-slot-heading">
      <h2 id="new-slot-heading" className="text-lg font-semibold text-ink-strong">
        Abrir novo horário
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        O horário aparece na hora para os alunos Premium solicitarem vaga.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <Select
          label="Tipo de encontro"
          value={type}
          onChange={(event) => handleTypeChange(event.target.value as SessionType)}
          options={[
            { value: "mentoria", label: SESSION_TYPE_LABEL.mentoria },
            { value: "grupo", label: SESSION_TYPE_LABEL.grupo },
          ]}
        />
        <Input
          label="Tema"
          placeholder="Ex.: Revisão de normalização"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          maxLength={120}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Data"
            type="date"
            value={effectiveDate}
            onChange={(event) => {
              setDateTouched(true);
              setDate(event.target.value);
            }}
            required
          />
          <Input
            label="Horário"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Duração"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            options={[
              { value: "30", label: "30 minutos" },
              { value: "60", label: "1 hora" },
              { value: "90", label: "1h30" },
              { value: "120", label: "2 horas" },
            ]}
          />
          <Input
            label="Vagas"
            type="number"
            min={1}
            max={100}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : "Abrir horário"}
        </Button>
      </form>
    </Card>
  );
}
