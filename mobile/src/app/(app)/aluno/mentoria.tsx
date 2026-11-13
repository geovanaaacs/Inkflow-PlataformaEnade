import { useMemo, useState } from "react";
import { Alert, Modal, StyleSheet, Text, View } from "react-native";
import { Badge, LoadState, LockedFeature, SectionTitle } from "../../../components/feedback";
import { Button, Card, ErrorMessage, IconText, Screen, Segmented, Subtitle, TextField, Title } from "../../../components/ui";
import { useAuth } from "../../../features/auth/AuthProvider";
import {
  cancelMyRequest,
  listMyRequests,
  listOpenSlots,
  requestSlot,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  SESSION_TYPE_DESCRIPTION,
  SESSION_TYPE_LABEL,
  type OpenSlot,
  type RequestWithSlot,
  type SessionType,
} from "../../../features/mentoring/api";
import { dayKey, errorMessage, formatLongDate, formatTimeRange } from "../../../lib/format";
import { userHasFeature } from "../../../lib/plan-access";
import { useAsync } from "../../../lib/useAsync";
import { colors, radius, spacing, themed } from "../../../theme";

const TYPES: { value: SessionType; label: string }[] = [
  { value: "mentoria", label: SESSION_TYPE_LABEL.mentoria },
  { value: "grupo", label: SESSION_TYPE_LABEL.grupo },
];

/** Students book collective mentoring or expert-led study groups (Premium). */
export default function MentoringScreen() {
  const { user } = useAuth();
  if (!userHasFeature(user, "mentoring")) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <LockedFeature
          feature="mentoring"
          label="Mentoria com professores"
          description="Mentoria coletiva ao vivo e grupos de estudo guiados por especialistas fazem parte do plano Premium."
        />
      </Screen>
    );
  }
  return <Scheduler />;
}

/** Slots grouped by local day, keeping the API's order (soonest first). */
function groupByDay(slots: OpenSlot[]): { key: string; label: string; slots: OpenSlot[] }[] {
  const groups = new Map<string, OpenSlot[]>();
  for (const slot of slots) groups.set(dayKey(slot.startsAt), [...(groups.get(dayKey(slot.startsAt)) ?? []), slot]);
  return [...groups.entries()].map(([key, daySlots]) => ({ key, label: formatLongDate(daySlots[0].startsAt), slots: daySlots }));
}

function Scheduler() {
  const [type, setType] = useState<SessionType>("mentoria");
  const [version, setVersion] = useState(0);
  const [requesting, setRequesting] = useState<OpenSlot | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const slots = useAsync(() => listOpenSlots(type), [type, version]);
  const requests = useAsync(listMyRequests, [version]);
  const days = useMemo(() => groupByDay(slots.data ?? []), [slots.data]);

  const refresh = () => setVersion((current) => current + 1);

  return (
    <Screen edges={["left", "right", "bottom"]} onRefresh={refresh} refreshing={slots.refreshing}>
      <Title>Mentoria e grupos</Title>
      <Subtitle>Escolha um horário definido pelos professores e solicite sua vaga.</Subtitle>
      <Segmented
        options={TYPES}
        value={type}
        onChange={(next) => {
          setType(next);
          setStatus(null);
        }}
      />
      <Text style={styles.muted}>{SESSION_TYPE_DESCRIPTION[type]}</Text>
      {status && <Text style={styles.success}>{status}</Text>}

      <LoadState loading={slots.loading} error={slots.data ? null : slots.error} onRetry={slots.reload} fallback="Não foi possível carregar os horários." />
      {slots.data && days.length === 0 && (
        <Card>
          <Text style={styles.muted}>Nenhum horário disponível no momento. Volte em breve: os professores abrem novas datas toda semana.</Text>
        </Card>
      )}
      {days.map((day) => (
        <View key={day.key} style={styles.day}>
          <Text style={styles.dayLabel} accessibilityRole="header">
            {day.label}
          </Text>
          {day.slots.map((slot) => (
            <Card key={slot.id}>
              <IconText icon="time-outline" style={styles.time} color={colors.brand600}>{formatTimeRange(slot.startsAt, slot.durationMinutes)}</IconText>
              <Text style={styles.topic}>{slot.topic}</Text>
              <View style={styles.metaRow}>
                <IconText icon="school-outline" style={styles.muted}>{slot.teacherName}</IconText>
                <IconText icon="people-outline" style={styles.muted}>
                  {slot.spotsLeft > 0 ? `${slot.spotsLeft} de ${slot.capacity} vagas` : "Sem vagas"}
                </IconText>
              </View>
              {slot.myRequest ? (
                <Badge tone={REQUEST_STATUS_TONE[slot.myRequest.status]}>{REQUEST_STATUS_LABEL[slot.myRequest.status]}</Badge>
              ) : (
                <Button
                  label={slot.spotsLeft === 0 ? "Esgotado" : "Solicitar vaga"}
                  disabled={slot.spotsLeft === 0}
                  onPress={() => {
                    setStatus(null);
                    setRequesting(slot);
                  }}
                />
              )}
            </Card>
          ))}
        </View>
      ))}

      <MyRequests requests={requests.data} loading={requests.loading} onChanged={refresh} />

      <RequestModal
        slot={requesting}
        onClose={() => setRequesting(null)}
        onRequested={() => {
          setRequesting(null);
          setStatus("Solicitação enviada! Acompanhe a resposta do professor em “Minhas solicitações”.");
          refresh();
        }}
      />
    </Screen>
  );
}

function MyRequests({ requests, loading, onChanged }: { requests: RequestWithSlot[] | undefined; loading: boolean; onChanged: () => void }) {
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function cancel(request: RequestWithSlot) {
    setCancelling(request.id);
    try {
      await cancelMyRequest(request.id);
      onChanged();
    } catch (caught) {
      Alert.alert("Não foi possível cancelar", errorMessage(caught));
    } finally {
      setCancelling(null);
    }
  }

  function confirmCancel(request: RequestWithSlot) {
    Alert.alert("Cancelar solicitação?", `${request.slot.topic} — ${formatLongDate(request.slot.startsAt)}.`, [
      { text: "Manter", style: "cancel" },
      { text: "Cancelar solicitação", style: "destructive", onPress: () => void cancel(request) },
    ]);
  }

  return (
    <Card>
      <SectionTitle title="Minhas solicitações" />
      {loading && !requests ? (
        <LoadState loading error={null} fallback="" />
      ) : !requests || requests.length === 0 ? (
        <Text style={styles.muted}>Você ainda não solicitou nenhum horário.</Text>
      ) : (
        requests.map((request) => {
          const past = new Date(request.slot.startsAt).getTime() < Date.now();
          const cancellable = !past && !request.slot.canceledAt && (request.status === "pendente" || request.status === "confirmada");
          return (
            <View key={request.id} style={styles.request}>
              <Text style={styles.kind}>{SESSION_TYPE_LABEL[request.slot.type].toUpperCase()}</Text>
              <Text style={styles.topic}>{request.slot.topic}</Text>
              <Text style={styles.muted}>
                {formatLongDate(request.slot.startsAt)} · {formatTimeRange(request.slot.startsAt, request.slot.durationMinutes)} ·{" "}
                {request.slot.teacherName}
                {request.slot.canceledAt ? " · horário cancelado pelo professor" : past ? " · encerrado" : ""}
              </Text>
              <View style={styles.requestFooter}>
                <Badge tone={REQUEST_STATUS_TONE[request.status]}>{REQUEST_STATUS_LABEL[request.status]}</Badge>
                {cancellable && (
                  <Text
                    style={styles.cancel}
                    accessibilityRole="button"
                    accessibilityLabel={`Cancelar solicitação: ${request.slot.topic}`}
                    onPress={() => (cancelling ? undefined : confirmCancel(request))}
                  >
                    {cancelling === request.id ? "Cancelando…" : "Cancelar"}
                  </Text>
                )}
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}

function RequestModal({ slot, onClose, onRequested }: { slot: OpenSlot | null; onClose: () => void; onRequested: () => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setMessage("");
    setError(null);
    onClose();
  }

  async function send() {
    if (!slot) return;
    setSending(true);
    setError(null);
    try {
      await requestSlot(slot.id, message);
      setMessage("");
      onRequested();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={slot !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      {slot && (
        <Screen>
          <Title>Solicitar vaga</Title>
          <Text style={styles.kind}>{SESSION_TYPE_LABEL[slot.type].toUpperCase()}</Text>
          <Text style={styles.topic}>{slot.topic}</Text>
          <Text style={styles.muted}>
            {formatLongDate(slot.startsAt)}, {formatTimeRange(slot.startsAt, slot.durationMinutes)}, com {slot.teacherName}.
          </Text>
          <TextField
            label="Mensagem para o professor (opcional)"
            value={message}
            onChangeText={setMessage}
            placeholder="Conte o que você gostaria de revisar nesse encontro..."
            multiline
            maxLength={500}
            style={styles.textarea}
            textAlignVertical="top"
          />
          <Text style={styles.muted}>O professor confirma ou recusa a solicitação. Você acompanha o status em “Minhas solicitações”.</Text>
          <ErrorMessage message={error} />
          <Button label="Enviar solicitação" onPress={send} loading={sending} />
          <Button label="Cancelar" variant="secondary" onPress={close} />
        </Screen>
      )}
    </Modal>
  );
}

const styles = themed(() => StyleSheet.create({
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing(4) },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  success: { fontSize: 15, color: colors.success, fontWeight: "700" },
  day: { gap: spacing(3) },
  dayLabel: { fontSize: 16, fontWeight: "700", color: colors.brandText, marginTop: spacing(2) },
  time: { fontSize: 16, fontWeight: "700", color: colors.ink },
  topic: { fontSize: 15, fontWeight: "600", color: colors.ink },
  kind: { fontSize: 12, fontWeight: "700", color: colors.brandText },
  request: { gap: spacing(1.5), paddingVertical: spacing(3), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  requestFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cancel: { fontSize: 14, fontWeight: "700", color: colors.danger, padding: spacing(1.5) },
  textarea: { minHeight: 100, paddingTop: spacing(3), borderRadius: radius.input },
}));
