import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Badge, EmptyState, LockedFeature, type Tone } from "../../components/feedback";
import { Button, Card, ErrorMessage } from "../../components/ui";
import { errorMessage, plural } from "../../lib/format";
import { ApiError } from "../../lib/http";
import { userHasFeature } from "../../lib/plan-access";
import { colors, radius, spacing } from "../../theme";
import { useAuth } from "../auth/AuthProvider";
import { answerQuestion, type AnswerResult, type Difficulty, type Question } from "./api";
import { NotesSheet } from "./NotesSheet";
import { usePractice } from "./practice";

const DIFFICULTY_TONE: Record<Difficulty, Tone> = { fácil: "success", médio: "warning", difícil: "danger" };

/* ------------------------------------------------------------------ List */

/** Compact row of the question lists; opens the question screen. */
export function QuestionListItem({ question }: { question: Question }) {
  const { noteCounts } = usePractice();
  const notes = noteCounts[question.id] ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Questão ${question.code}: ${question.area.name}, ${question.topic}`}
      onPress={() => router.push(`/aluno/questao/${question.code}`)}
      style={({ pressed }) => [styles.listItem, pressed && styles.pressed]}
    >
      <View style={styles.listHeader}>
        <Text style={styles.code}>{question.code}</Text>
        <Badge tone={DIFFICULTY_TONE[question.difficulty]}>{question.difficulty}</Badge>
      </View>
      <Text style={styles.path}>
        {question.area.name} › {question.topic} · {question.year}
      </Text>
      <Text style={styles.preview} numberOfLines={3}>
        {question.statement}
      </Text>
      {notes > 0 && <Text style={styles.small}>📝 {plural(notes, "anotação", "anotações")}</Text>}
    </Pressable>
  );
}

export function QuestionList({ questions, emptyMessage }: { questions: Question[]; emptyMessage: string }) {
  if (questions.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <View style={styles.list}>
      {questions.map((question) => (
        <QuestionListItem key={question.id} question={question} />
      ))}
    </View>
  );
}

/** Horizontal row of selectable chips (single choice, tap again to clear). */
export function ChipRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
}) {
  return (
    <View style={styles.chipBlock}>
      <Text style={styles.chipLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(selected ? undefined : option.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ Card */

type Panel = "ai" | "teacher" | "community";

const PANELS: { key: Panel; label: string }[] = [
  { key: "ai", label: "Gabarito IA" },
  { key: "teacher", label: "Professor" },
  { key: "community", label: "Comunidade" },
];

/**
 * Full question: statement, options, answer, explanation panels and notes.
 * Same behavior as frontend/src/features/questions/components/QuestionCard.tsx.
 */
export function QuestionCard({ question }: { question: Question }) {
  const { user } = useAuth();
  const practice = usePractice();
  const notesUnlocked = userHasFeature(user, "notes");
  const noteCount = practice.noteCounts[question.id] ?? 0;

  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const submitted = result !== null;
  const correctId = result?.correctOptionId ?? question.correctOptionId;

  async function handleAnswer() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    setLimitReached(false);
    try {
      const answer = await answerQuestion(question.id, selected);
      setResult(answer);
      practice.setUsage(answer.usage);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) setLimitReached(true);
      else setError(errorMessage(caught, "Não foi possível registrar sua resposta."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.cardGap}>
      <Card>
        <Text style={styles.path}>
          <Text style={styles.code}>[{question.code}] </Text>
          {question.area.name} › {question.topic}
        </Text>
        <View style={styles.badges}>
          <Badge tone={DIFFICULTY_TONE[question.difficulty]}>{question.difficulty}</Badge>
          <Badge>ENADE {question.year}</Badge>
        </View>
        <Text style={styles.statement} selectable>
          {question.statement}
        </Text>

        <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel={`Alternativas da questão ${question.code}`}>
          {question.options.map((option) => {
            const isSelected = option.id === selected;
            const showCorrect = submitted && option.id === correctId;
            const showWrong = submitted && isSelected && option.id !== correctId;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected, disabled: submitted }}
                disabled={submitted}
                onPress={() => setSelected(option.id)}
                style={[
                  styles.option,
                  isSelected && styles.optionSelected,
                  showCorrect && styles.optionCorrect,
                  showWrong && styles.optionWrong,
                ]}
              >
                <View style={[styles.letter, isSelected && styles.letterSelected]}>
                  <Text style={[styles.letterText, isSelected && styles.letterTextSelected]}>{option.id.toUpperCase()}</Text>
                </View>
                <Text style={styles.optionText}>{option.label}</Text>
                {showCorrect && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                {showWrong && <Ionicons name="close-circle" size={20} color={colors.danger} />}
              </Pressable>
            );
          })}
        </View>

        {result && (
          <View
            accessibilityRole="alert"
            style={[styles.result, { backgroundColor: result.correct ? `${colors.success}22` : colors.dangerBg }]}
          >
            <Text style={[styles.resultText, { color: result.correct ? colors.success : colors.danger }]}>
              {result.correct ? "✓ Resposta correta!" : "✗ Resposta errada"}
              {result.attemptNumber > 1 ? ` · ${result.attemptNumber}ª tentativa (não conta no limite diário)` : ""}
            </Text>
          </View>
        )}
        <ErrorMessage message={error} />
        {limitReached && (
          <LockedFeature
            feature="unlimitedQuestions"
            label="Questões ilimitadas"
            description="Você atingiu o limite de questões de hoje do plano Básico. Questões que você já respondeu antes podem ser refeitas sem gastar o limite. Volte amanhã ou faça upgrade para continuar agora."
          />
        )}

        <Button
          label={submitted ? "Respondido" : "Responder"}
          onPress={handleAnswer}
          loading={submitting}
          disabled={!selected || submitted}
        />
        <View style={styles.actions}>
          {PANELS.map((item) => {
            const active = panel === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ expanded: active }}
                onPress={() => setPanel(active ? null : item.key)}
                style={[styles.action, active && styles.actionActive]}
              >
                <Text style={[styles.actionText, active && styles.actionTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={notesUnlocked ? `Anotações: ${noteCount} nesta questão` : "Anotação (requer plano Avançado)"}
            onPress={() => setNotesOpen(true)}
            style={[styles.action, noteCount > 0 && styles.actionActive]}
          >
            <Text style={[styles.actionText, noteCount > 0 && styles.actionTextActive]}>
              📝 Anotação{noteCount > 0 ? ` (${noteCount})` : ""}
              {notesUnlocked ? "" : " 🔒"}
            </Text>
          </Pressable>
        </View>
      </Card>

      {panel === "ai" && <AiPanel question={question} />}
      {panel === "teacher" && <TeacherPanel teacher={question.teacher} />}
      {panel === "community" && <CommunityPanel comments={question.community} />}

      <NotesSheet
        visible={notesOpen}
        onClose={() => setNotesOpen(false)}
        questionId={question.id}
        questionCode={question.code}
        unlocked={notesUnlocked}
      />
    </View>
  );
}

function AiPanel({ question }: { question: Question }) {
  return (
    <Card>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>✨ Gabarito comentado por IA</Text>
        <Badge>Resposta: {question.correctOptionId.toUpperCase()}</Badge>
      </View>
      <Text style={styles.body} selectable>
        {question.aiExplanation || "A explicação da IA para esta questão ainda está sendo preparada."}
      </Text>
    </Card>
  );
}

function TeacherPanel({ teacher }: { teacher: Question["teacher"] }) {
  if (!teacher.comment) {
    return (
      <Card>
        <Text style={styles.muted}>Esta questão ainda não tem comentário de professor.</Text>
      </Card>
    );
  }
  return (
    <Card>
      <Text style={styles.panelTitle}>🎓 {teacher.name}</Text>
      <Text style={styles.small}>{teacher.credentials} · Professor verificado</Text>
      <Text style={styles.body} selectable>
        {teacher.comment}
      </Text>
    </Card>
  );
}

function CommunityPanel({ comments }: { comments: Question["community"] }) {
  return (
    <Card>
      <Text style={styles.panelTitle}>👥 Comunidade</Text>
      {comments.length === 0 ? (
        <Text style={styles.muted}>Ainda não há comentários da comunidade para esta questão.</Text>
      ) : (
        comments.map((comment, index) => (
          <View key={`${comment.author}-${index}`} style={styles.comment}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{comment.author.charAt(0)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.commentAuthor}>{comment.author}</Text>
              <Text style={styles.body}>{comment.comment}</Text>
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  list: { gap: spacing(3) },
  listItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing(4),
    gap: spacing(2),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { fontSize: 14, fontWeight: "700", color: colors.brand800 },
  path: { fontSize: 14, fontWeight: "600", color: colors.ink },
  preview: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  small: { fontSize: 13, color: colors.muted },
  muted: { fontSize: 14, color: colors.muted },
  body: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  chipBlock: { gap: spacing(2) },
  chipLabel: { fontSize: 13, fontWeight: "700", color: colors.muted },
  chips: { gap: spacing(2), paddingRight: spacing(4) },
  chip: {
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.brand600, borderColor: colors.brand600 },
  chipText: { fontSize: 14, color: colors.ink },
  chipTextSelected: { color: colors.surface, fontWeight: "700" },
  cardGap: { gap: spacing(4) },
  badges: { flexDirection: "row", gap: spacing(2) },
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
  optionCorrect: { borderColor: colors.success, backgroundColor: `${colors.success}1a` },
  optionWrong: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  letter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  letterSelected: { borderColor: colors.brand600, backgroundColor: colors.brand600 },
  letterText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  letterTextSelected: { color: colors.surface },
  optionText: { flex: 1, fontSize: 15, color: colors.ink, lineHeight: 21 },
  result: { borderRadius: radius.badge, padding: spacing(3) },
  resultText: { fontSize: 15, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  action: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.brand600,
  },
  actionActive: { backgroundColor: colors.brandSoft },
  actionText: { fontSize: 14, color: colors.brand600, fontWeight: "600" },
  actionTextActive: { color: colors.brand800 },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing(2), flexWrap: "wrap" },
  panelTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  comment: { flexDirection: "row", gap: spacing(3) },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", color: colors.brand800 },
  commentAuthor: { fontSize: 14, fontWeight: "700", color: colors.ink },
});
