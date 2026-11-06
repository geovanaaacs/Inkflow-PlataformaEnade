import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button, Card, ErrorMessage, Screen, Segmented, Subtitle, TextField } from "../../../components/ui";
import { SESSION_TYPE_DESCRIPTION, SESSION_TYPE_LABEL, type SessionType } from "../../../features/mentoring/api";
import { ChipRow } from "../../../features/questions/components";
import { createSlot } from "../../../features/teacher/api";
import { dayKey, errorMessage } from "../../../lib/format";
import { colors } from "../../../theme";

/** Same defaults as the web form (NewSlotForm): bigger class for mentoring, small group otherwise. */
const DEFAULT_CAPACITY: Record<SessionType, number> = { mentoria: 30, grupo: 8 };
const DAYS_AHEAD = 21;
const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const TYPES: { value: SessionType; label: string }[] = [
  { value: "mentoria", label: SESSION_TYPE_LABEL.mentoria },
  { value: "grupo", label: SESSION_TYPE_LABEL.grupo },
];

const DURATIONS: { value: number; label: string }[] = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 horas" },
];

/** Next days as chips ("qui 25/09"), starting today. */
function upcomingDays(): { value: string; label: string }[] {
  return Array.from({ length: DAYS_AHEAD }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const label = offset === 0 ? "Hoje" : offset === 1 ? "Amanhã" : `${WEEKDAY_SHORT[date.getDay()]} ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { value: dayKey(date.toISOString()), label };
  });
}

/** Opens a mentoring or study-group slot (times are Brasília time, as on the web). */
export default function NewSlotScreen() {
  const days = useMemo(upcomingDays, []);
  const [type, setType] = useState<SessionType>("mentoria");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState<string | undefined>(days[1].value);
  const [time, setTime] = useState("19:00");
  const [duration, setDuration] = useState<number | undefined>(60);
  const [capacity, setCapacity] = useState(String(DEFAULT_CAPACITY.mentoria));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeType(next: SessionType) {
    setType(next);
    setCapacity(String(DEFAULT_CAPACITY[next]));
  }

  /** Same limits as the API (newSlotSchema), checked here to answer faster. */
  function validate(): string | null {
    if (!topic.trim()) return "Informe o tema do encontro.";
    if (!date) return "Escolha o dia do encontro.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())) return "Informe o horário no formato 19:00.";
    if (!duration) return "Escolha a duração.";
    const spots = Number(capacity);
    if (!Number.isInteger(spots) || spots < 1 || spots > 100) return "O número de vagas deve ser entre 1 e 100.";
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createSlot({
        type,
        topic: topic.trim(),
        date: date as string,
        time: time.trim(),
        durationMinutes: duration as number,
        capacity: Number(capacity),
      });
      router.back();
    } catch (caught) {
      // E.g. 400 "Escolha uma data e um horário futuros." or 409 overlapping slot.
      setError(errorMessage(caught, "Não foi possível abrir o horário."));
      setSaving(false);
    }
  }

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Subtitle>Os alunos Premium veem o horário e pedem uma vaga; você aceita ou recusa na Agenda.</Subtitle>
      <Card>
        <Segmented options={TYPES} value={type} onChange={changeType} />
        <Text style={styles.muted}>{SESSION_TYPE_DESCRIPTION[type]}</Text>
        <TextField label="Tema" value={topic} onChangeText={setTopic} placeholder="Ex.: Revisão de normalização" maxLength={120} />
        <ChipRow label="Dia" options={days} value={date} onChange={setDate} />
        <TextField
          label="Horário (Brasília)"
          value={time}
          onChangeText={setTime}
          placeholder="19:00"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />
        <ChipRow label="Duração" options={DURATIONS} value={duration} onChange={setDuration} />
        <TextField label="Vagas" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" maxLength={3} />
        <ErrorMessage message={error} />
        <Button label="Abrir horário" onPress={save} loading={saving} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
});
