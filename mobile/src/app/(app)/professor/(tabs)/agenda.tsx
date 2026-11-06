import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Badge, LoadState } from "../../../../components/feedback";
import { Button, Card, Screen, Segmented, Subtitle, Title } from "../../../../components/ui";
import {
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  SESSION_TYPE_LABEL,
  type MentoringRequest,
  type RequestWithSlot,
} from "../../../../features/mentoring/api";
import {
  deleteSlot,
  listTeacherRequests,
  listTeacherSlots,
  respondToRequest,
  type TeacherSlot,
} from "../../../../features/teacher/api";
import { dayKey, errorMessage, formatLongDate, formatTimeRange, plural } from "../../../../lib/format";
import { useAsync } from "../../../../lib/useAsync";
import { colors, radius, spacing } from "../../../../theme";

type AgendaView = "horarios" | "solicitacoes";
type RequestFilter = "pendente" | "confirmada" | "todas";

const VIEWS: { value: AgendaView; label: string }[] = [
  { value: "horarios", label: "Horários" },
  { value: "solicitacoes", label: "Solicitações" },
];

const FILTERS: { value: RequestFilter; label: string }[] = [
  { value: "pendente", label: "Pendentes" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "todas", label: "Todas" },
];

/** The teacher's mentoring slots and the student requests for them. */
export default function AgendaScreen() {
  const [view, setView] = useState<AgendaView>("horarios");
  // Reloads on focus so a slot opened in "Abrir horário" shows up on return.
  const agenda = useAsync(() => Promise.all([listTeacherSlots(), listTeacherRequests()]), [], { reloadOnFocus: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const [slots, requests] = agenda.data ?? [[], []];
  const pendingCount = requests.filter((request) => request.status === "pendente").length;

  async function respond(request: MentoringRequest, decision: "confirmada" | "recusada") {
    setBusy(request.id);
    setFeedback(null);
    try {
      await respondToRequest(request.id, decision);
      setFeedback({ tone: "success", text: decision === "confirmada" ? `Solicitação de ${request.studentName} aceita.` : `Solicitação de ${request.studentName} recusada.` });
      agenda.refresh();
    } catch (caught) {
      setFeedback({ tone: "danger", text: errorMessage(caught) });
    } finally {
      setBusy(null);
    }
  }

  async function remove(slot: TeacherSlot) {
    setBusy(slot.id);
    setFeedback(null);
    try {
      await deleteSlot(slot.id);
      setFeedback({ tone: "success", text: "Horário removido." });
      agenda.refresh();
    } catch (caught) {
      setFeedback({ tone: "danger", text: errorMessage(caught) });
    } finally {
      setBusy(null);
    }
  }

  function confirmRemove(slot: TeacherSlot) {
    const affected = slot.confirmed + slot.pending;
    Alert.alert(
      "Remover horário?",
      `${slot.topic} — ${formatLongDate(slot.startsAt)}, ${formatTimeRange(slot.startsAt, slot.durationMinutes)}.` +
        (affected > 0 ? ` ${plural(affected, "aluno tem", "alunos têm")} solicitação para este horário e ${affected === 1 ? "será avisado" : "serão avisados"} de que foi cancelado.` : ""),
      [
        { text: "Manter", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: () => void remove(slot) },
      ]
    );
  }

  return (
    <Screen edges={["top", "left", "right"]} onRefresh={agenda.refresh} refreshing={agenda.refreshing}>
      <Title>Agenda</Title>
      <Subtitle>Seus horários de mentoria e grupos de estudo, e as solicitações dos alunos.</Subtitle>
      <Button label="+ Abrir novo horário" onPress={() => router.push("/professor/novo-horario")} />
      <Segmented options={VIEWS.map((item) => (item.value === "solicitacoes" && pendingCount > 0 ? { ...item, label: `Solicitações (${pendingCount})` } : item))} value={view} onChange={setView} />
      {feedback && <Text style={[styles.feedback, { color: feedback.tone === "success" ? colors.success : colors.danger }]}>{feedback.text}</Text>}
      <LoadState loading={agenda.loading} error={agenda.data ? null : agenda.error} onRetry={agenda.reload} fallback="Não foi possível carregar a agenda." />
      {agenda.data &&
        (view === "horarios" ? (
          <Slots slots={slots} requests={requests} busy={busy} onRespond={respond} onRemove={confirmRemove} />
        ) : (
          <Requests requests={requests} busy={busy} onRespond={respond} />
        ))}
    </Screen>
  );
}

interface SlotsProps {
  slots: TeacherSlot[];
  requests: RequestWithSlot[];
  busy: string | null;
  onRespond: (request: MentoringRequest, decision: "confirmada" | "recusada") => void;
  onRemove: (slot: TeacherSlot) => void;
}

/** Upcoming slots grouped by day; past ones behind "Ver encerrados". */
function Slots({ slots, requests, busy, onRespond, onRemove }: SlotsProps) {
  const [showPast, setShowPast] = useState(false);
  const now = Date.now();
  const active = slots.filter((slot) => !slot.canceledAt);
  const upcoming = active.filter((slot) => new Date(slot.startsAt).getTime() >= now);
  const past = active.filter((slot) => new Date(slot.startsAt).getTime() < now).reverse();

  const groups = new Map<string, TeacherSlot[]>();
  for (const slot of upcoming) groups.set(dayKey(slot.startsAt), [...(groups.get(dayKey(slot.startsAt)) ?? []), slot]);
  const days = [...groups.values()];

  const renderSlot = (slot: TeacherSlot, isPast: boolean) => (
    <Card key={slot.id}>
      <Badge tone={slot.type === "mentoria" ? "brand" : "success"}>{SESSION_TYPE_LABEL[slot.type]}</Badge>
      <Text style={styles.slotTitle}>
        {formatTimeRange(slot.startsAt, slot.durationMinutes)} · {slot.topic}
      </Text>
      <Text style={styles.muted}>
        {plural(slot.confirmed, "confirmado", "confirmados")} · {plural(slot.pending, "pendente", "pendentes")} · {slot.capacity} vagas
        {isPast ? ` · encerrado em ${formatLongDate(slot.startsAt).toLowerCase()}` : ""}
      </Text>
      {requests
        .filter((request) => request.slotId === slot.id && request.status !== "cancelada")
        .map((request) => (
          <RequestItem key={request.id} request={request} busy={busy !== null} onRespond={onRespond} />
        ))}
      {!isPast && (
        <Text
          style={styles.remove}
          accessibilityRole="button"
          accessibilityLabel={`Remover horário: ${slot.topic}`}
          onPress={() => (busy ? undefined : onRemove(slot))}
        >
          {busy === slot.id ? "Removendo…" : "Remover horário"}
        </Text>
      )}
    </Card>
  );

  return (
    <>
      {days.length === 0 && (
        <Card>
          <Text style={styles.muted}>Nenhum horário futuro. Use “Abrir novo horário” para disponibilizar um encontro.</Text>
        </Card>
      )}
      {days.map((daySlots) => (
        <View key={daySlots[0].id} style={styles.day}>
          <Text style={styles.dayLabel} accessibilityRole="header">
            {formatLongDate(daySlots[0].startsAt)}
          </Text>
          {daySlots.map((slot) => renderSlot(slot, false))}
        </View>
      ))}
      {past.length > 0 && (
        <Button
          label={showPast ? "Esconder encerrados" : `Ver encerrados (${past.length})`}
          variant="secondary"
          onPress={() => setShowPast((current) => !current)}
        />
      )}
      {showPast && past.map((slot) => renderSlot(slot, true))}
    </>
  );
}

function Requests({ requests, busy, onRespond }: { requests: RequestWithSlot[]; busy: string | null; onRespond: SlotsProps["onRespond"] }) {
  const [filter, setFilter] = useState<RequestFilter>("pendente");
  const visible = requests.filter((request) => filter === "todas" || request.status === filter);
  return (
    <>
      <Segmented options={FILTERS} value={filter} onChange={setFilter} />
      {visible.length === 0 ? (
        <Card>
          <Text style={styles.muted}>Nenhuma solicitação neste filtro.</Text>
        </Card>
      ) : (
        visible.map((request) => (
          <Card key={request.id}>
            <Text style={styles.kind}>{SESSION_TYPE_LABEL[request.slot.type].toUpperCase()}</Text>
            <Text style={styles.slotTitle}>{request.slot.topic}</Text>
            <Text style={styles.muted}>
              {formatLongDate(request.slot.startsAt)} · {formatTimeRange(request.slot.startsAt, request.slot.durationMinutes)}
            </Text>
            <RequestItem request={request} busy={busy !== null} onRespond={onRespond} />
          </Card>
        ))
      )}
    </>
  );
}

/** One student request: accept/decline while pending, the status afterwards. */
function RequestItem({ request, busy, onRespond }: { request: MentoringRequest; busy: boolean; onRespond: SlotsProps["onRespond"] }) {
  return (
    <View style={styles.request}>
      <View style={styles.requestHeader}>
        <Text style={styles.student}>{request.studentName}</Text>
        {request.status !== "pendente" && <Badge tone={REQUEST_STATUS_TONE[request.status]}>{REQUEST_STATUS_LABEL[request.status]}</Badge>}
      </View>
      {request.message ? <Text style={styles.message}>“{request.message}”</Text> : null}
      {request.status === "pendente" && (
        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button label="Recusar" variant="secondary" disabled={busy} onPress={() => onRespond(request, "recusada")} />
          </View>
          <View style={styles.flex}>
            <Button label="Aceitar" disabled={busy} onPress={() => onRespond(request, "confirmada")} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  feedback: { fontSize: 15, fontWeight: "700" },
  day: { gap: spacing(3) },
  dayLabel: { fontSize: 16, fontWeight: "700", color: colors.brand900, marginTop: spacing(2) },
  slotTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  kind: { fontSize: 12, fontWeight: "700", color: colors.brand800 },
  remove: { fontSize: 14, fontWeight: "700", color: colors.danger, alignSelf: "flex-start", paddingVertical: spacing(1) },
  request: { backgroundColor: colors.background, borderRadius: radius.input, padding: spacing(3), gap: spacing(2) },
  requestHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing(2) },
  student: { fontSize: 15, fontWeight: "700", color: colors.ink, flex: 1 },
  message: { fontSize: 14, fontStyle: "italic", color: colors.ink },
  actions: { flexDirection: "row", gap: spacing(2) },
});
