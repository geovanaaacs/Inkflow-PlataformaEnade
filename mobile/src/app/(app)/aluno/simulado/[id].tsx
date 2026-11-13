import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from "react-native";
import { LoadState, LockedFeature } from "../../../../components/feedback";
import { Button, Card, ErrorMessage, IconText, Screen, Subtitle, Title } from "../../../../components/ui";
import { useAuth } from "../../../../features/auth/AuthProvider";
import {
  finishAttempt,
  getActiveAttempt,
  getMockExam,
  saveAttemptAnswer,
  startAttempt,
  type MockExam,
  type MockExamAttempt,
} from "../../../../features/mock-exams/api";
import { useCountdown } from "../../../../features/mock-exams/useCountdown";
import type { Question } from "../../../../features/questions/api";
import { errorMessage, formatCountdown } from "../../../../lib/format";
import { ApiError } from "../../../../lib/http";
import { userHasFeature } from "../../../../lib/plan-access";
import { useAsync } from "../../../../lib/useAsync";
import { colors, radius, spacing, themed } from "../../../../theme";

/** Intro screen, then the timed exam — same flow as frontend MockExamRunnerPage. */
export default function MockExamScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  if (!userHasFeature(user, "mockExams")) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <LockedFeature feature="mockExams" label="Simulados com timer" description="Os simulados cronometrados fazem parte do plano Premium." />
      </Screen>
    );
  }
  return <ExamLoader key={id} examId={id} />;
}

function ExamLoader({ examId }: { examId: string }) {
  const loaded = useAsync(() => Promise.all([getMockExam(examId), getActiveAttempt(examId)]), [examId]);
  const [started, setStarted] = useState<MockExamAttempt | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (!loaded.data) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <LoadState loading={loaded.loading} error={loaded.error} onRetry={loaded.reload} fallback="Não foi possível carregar o simulado." />
      </Screen>
    );
  }

  const [{ exam, questions }, activeAttempt] = loaded.data;
  const attempt = started ?? activeAttempt;

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      setStarted(await startAttempt(exam.id));
    } catch (caught) {
      setStartError(errorMessage(caught));
      setStarting(false);
    }
  }

  if (!attempt) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "Simulado" }} />
        <Title>{exam.title}</Title>
        <Subtitle>{exam.description}</Subtitle>
        <Card>
          <View style={styles.metaRow}>
            <IconText icon="list-outline" style={styles.meta}>{questions.length} questões</IconText>
            <IconText icon="timer-outline" style={styles.meta}>{exam.timeLimitMinutes} minutos</IconText>
          </View>
          {[
            "O cronômetro começa assim que você tocar em “Iniciar simulado”.",
            "Você pode navegar livremente e trocar respostas até finalizar.",
            "Quando o tempo acabar, o simulado é finalizado automaticamente.",
            "O gabarito e a correção aparecem só no resultado.",
          ].map((rule) => (
            <Text key={rule} style={styles.rule}>
              • {rule}
            </Text>
          ))}
          <ErrorMessage message={startError} />
          <Button label="Iniciar simulado" onPress={handleStart} loading={starting} />
        </Card>
      </Screen>
    );
  }

  return <ExamSession exam={exam} questions={questions} attempt={attempt} />;
}

function ExamSession({ exam, questions, attempt }: { exam: MockExam; questions: Question[]; attempt: MockExamAttempt }) {
  const [answers, setAnswers] = useState<Record<string, string>>(attempt.answers);
  const [index, setIndex] = useState(() => {
    const firstOpen = questions.findIndex((question) => !attempt.answers[question.id]);
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [finishing, setFinishing] = useState<"manual" | "timeout" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const finishingRef = useRef(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const remaining = useCountdown(attempt.endsAt);
  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const question = questions[index];

  const finish = useCallback(
    async (reason: "manual" | "timeout") => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setFinishing(reason);
      try {
        const closed = await finishAttempt(attempt.id);
        router.replace(`/aluno/simulado/resultado/${closed.id}`);
      } catch (caught) {
        finishingRef.current = false;
        setFinishing(null);
        setError(errorMessage(caught, "Não foi possível finalizar o simulado."));
      }
    },
    [attempt.id]
  );

  // Automatic finish when the countdown reaches zero.
  useEffect(() => {
    if (remaining <= 0) void finish("timeout");
  }, [remaining, finish]);

  function goTo(next: number) {
    setIndex(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function select(optionId: string) {
    setAnswers((current) => ({ ...current, [question.id]: optionId }));
    saveAttemptAnswer(attempt.id, question.id, optionId).catch((caught: unknown) => {
      // 409 = the server already closed the attempt (time is up).
      if (caught instanceof ApiError && caught.status === 409) void finish("timeout");
      else setError(errorMessage(caught, "Não foi possível salvar sua resposta."));
    });
  }

  function confirmFinish() {
    const unanswered = questions.length - answeredCount;
    Alert.alert(
      "Finalizar simulado?",
      unanswered > 0
        ? `Você respondeu ${answeredCount} de ${questions.length} questões. As ${unanswered} sem resposta contam como erro.`
        : `Você respondeu todas as ${questions.length} questões. Depois de finalizar não é possível alterar as respostas.`,
      [
        { text: "Continuar respondendo", style: "cancel" },
        { text: "Finalizar", style: "destructive", onPress: () => void finish("manual") },
      ]
    );
  }

  if (finishing) {
    return (
      <View style={styles.finishing}>
        <Stack.Screen options={{ title: exam.title }} />
        {finishing === "timeout" && <Text style={styles.timeout}>Tempo esgotado!</Text>}
        <ActivityIndicator size="large" color={colors.brand600} />
        <Text style={styles.meta}>Finalizando e corrigindo o simulado…</Text>
      </View>
    );
  }

  const timerTone = remaining <= 60_000 ? styles.timerDanger : remaining <= 5 * 60_000 ? styles.timerWarning : null;

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: exam.title }} />
      <View style={styles.bar}>
        <View
          style={[styles.timer, timerTone]}
          accessible
          accessibilityRole="timer"
          accessibilityLabel={`Tempo restante: ${formatCountdown(remaining)}`}
        >
          <IconText icon="timer-outline" style={[styles.timerText, timerTone && styles.timerTextAlert]}>{formatCountdown(remaining)}</IconText>
        </View>
        <Text style={styles.progress}>
          {answeredCount}/{questions.length} respondidas
        </Text>
        <Pressable accessibilityRole="button" onPress={confirmFinish} style={styles.finishButton}>
          <Text style={styles.finishText}>Finalizar</Text>
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <ErrorMessage message={error} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navigator}>
          {questions.map((item, position) => {
            const current = position === index;
            const answered = Boolean(answers[item.id]);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Questão ${position + 1}${answered ? ", respondida" : ""}`}
                accessibilityState={{ selected: current }}
                onPress={() => goTo(position)}
                style={[styles.navItem, answered && styles.navAnswered, current && styles.navCurrent]}
              >
                <Text style={[styles.navText, (answered || current) && styles.navTextOn]}>{position + 1}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Card>
          <Text style={styles.position}>
            Questão {index + 1} de {questions.length} · {question.code}
          </Text>
          <Text style={styles.path}>
            {question.area.name} › {question.topic}
          </Text>
          <Text style={styles.statement} selectable>
            {question.statement}
          </Text>
          <View style={styles.options} accessibilityRole="radiogroup">
            {question.options.map((option) => {
              const selected = answers[question.id] === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  disabled={remaining <= 0}
                  onPress={() => select(option.id)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <View style={[styles.letter, selected && styles.letterSelected]}>
                    <Text style={[styles.letterText, selected && styles.letterTextSelected]}>{option.id.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.optionText}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <View style={styles.pager}>
          <View style={styles.flex}>
            <Button label="‹ Anterior" variant="secondary" disabled={index === 0} onPress={() => goTo(index - 1)} />
          </View>
          <View style={styles.flex}>
            {index < questions.length - 1 ? (
              <Button label="Próxima ›" onPress={() => goTo(index + 1)} />
            ) : (
              <Button label="Finalizar" onPress={confirmFinish} />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing(4) },
  flex: { flex: 1 },
  meta: { fontSize: 15, color: colors.ink },
  rule: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  finishing: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing(3), backgroundColor: colors.background },
  timeout: { fontSize: 20, fontWeight: "700", color: colors.danger },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  timer: { backgroundColor: colors.brandSoft, borderRadius: radius.button, paddingHorizontal: spacing(3), paddingVertical: spacing(1.5) },
  timerWarning: { backgroundColor: `${colors.warning}33` },
  timerDanger: { backgroundColor: colors.dangerBg },
  timerText: { fontSize: 18, fontWeight: "800", color: colors.brandText, fontVariant: ["tabular-nums"] },
  timerTextAlert: { color: colors.danger },
  progress: { flex: 1, fontSize: 13, color: colors.muted },
  finishButton: { backgroundColor: colors.brand600, borderRadius: radius.button, paddingHorizontal: spacing(3.5), paddingVertical: spacing(2) },
  finishText: { color: colors.onBrand, fontWeight: "700", fontSize: 14 },
  content: { padding: spacing(4), gap: spacing(4), paddingBottom: spacing(10) },
  navigator: { gap: spacing(2) },
  navItem: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  navAnswered: { backgroundColor: colors.brand600, borderColor: colors.brand600 },
  navCurrent: { borderColor: colors.brandText, borderWidth: 3 },
  navText: { fontSize: 14, fontWeight: "700", color: colors.ink },
  navTextOn: { color: colors.onBrand },
  position: { fontSize: 13, fontWeight: "700", color: colors.brandText },
  path: { fontSize: 14, fontWeight: "600", color: colors.ink },
  statement: { fontSize: 16, color: colors.ink, lineHeight: 24 },
  options: { gap: spacing(2.5) },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(3),
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.brand600, backgroundColor: colors.brandSoft },
  letter: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.muted, alignItems: "center", justifyContent: "center" },
  letterSelected: { borderColor: colors.brand600, backgroundColor: colors.brand600 },
  letterText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  letterTextSelected: { color: colors.onBrand },
  optionText: { flex: 1, fontSize: 15, color: colors.ink, lineHeight: 21 },
  pager: { flexDirection: "row", gap: spacing(3) },
}));
