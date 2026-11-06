import { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { LoadState, LockedFeature } from "../../components/feedback";
import { Button, Card, ErrorMessage, Screen, TextField, Title } from "../../components/ui";
import { errorMessage, formatDateTime } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import { colors, radius, spacing } from "../../theme";
import { addNote, listQuestionNotes, type NoteRecord } from "./api";
import { usePractice } from "./practice";

interface NotesSheetProps {
  visible: boolean;
  onClose: () => void;
  questionId: string;
  questionCode: string;
  /** Whether the plan includes notes (Avançado+, or staff). */
  unlocked: boolean;
}

/** Notes on one question: earlier ones (newest first) plus a form for a new one. */
export function NotesSheet({ visible, onClose, questionId, questionCode, unlocked }: NotesSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen>
        <View style={styles.header}>
          <Title>Anotações · {questionCode}</Title>
          <Button label="Fechar" variant="secondary" onPress={onClose} />
        </View>
        {unlocked ? (
          visible && <NotesEditor questionId={questionId} questionCode={questionCode} />
        ) : (
          <LockedFeature
            feature="notes"
            label="Bloco de anotações"
            description="Faça quantas anotações quiser em cada questão e revise tudo depois em “Minhas anotações”."
          />
        )}
      </Screen>
    </Modal>
  );
}

function NotesEditor({ questionId, questionCode }: { questionId: string; questionCode: string }) {
  const { noteAdded } = usePractice();
  const loaded = useAsync(() => listQuestionNotes(questionId), [questionId]);
  const [added, setAdded] = useState<NoteRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const notes = [...added, ...(loaded.data ?? [])];

  async function handleSave() {
    setError(null);
    setSaved(false);
    if (!draft.trim()) {
      setError("Escreva sua anotação antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      const note = await addNote(questionId, draft);
      setAdded((current) => [note, ...current]);
      setDraft("");
      setSaved(true);
      noteAdded(questionId);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <TextField
          label={`Nova anotação para a questão ${questionCode}`}
          value={draft}
          onChangeText={setDraft}
          placeholder="Escreva aqui sua anotação, dúvida ou resumo sobre essa questão..."
          multiline
          maxLength={2000}
          style={styles.textarea}
          textAlignVertical="top"
        />
        <ErrorMessage message={error} />
        {saved && <Text style={styles.saved}>Anotação salva.</Text>}
        <Button label="Salvar anotação" onPress={handleSave} loading={saving} />
      </Card>

      <LoadState
        loading={loaded.loading}
        error={loaded.error}
        onRetry={loaded.reload}
        fallback="Não foi possível carregar suas anotações."
      />
      {!loaded.loading && !loaded.error && notes.length === 0 && (
        <Text style={styles.empty}>Você ainda não tem anotações nesta questão.</Text>
      )}
      {notes.map((note) => (
        <View key={note.id} style={styles.note}>
          <Text style={styles.noteText} selectable>
            {note.content}
          </Text>
          <Text style={styles.noteDate}>{formatDateTime(note.createdAt)}</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing(3) },
  textarea: { minHeight: 110, paddingTop: spacing(3) },
  saved: { color: colors.success, fontSize: 14, fontWeight: "600" },
  empty: { fontSize: 14, color: colors.muted, textAlign: "center" },
  note: { backgroundColor: colors.surface, borderRadius: radius.input, padding: spacing(3.5), gap: spacing(1.5) },
  noteText: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  noteDate: { fontSize: 12, color: colors.muted },
});
