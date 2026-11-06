import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { EmptyState, LoadState, LockedFeature } from "../../../components/feedback";
import { Card, Screen, Subtitle } from "../../../components/ui";
import { useAuth } from "../../../features/auth/AuthProvider";
import { listMyNotes, type NoteWithQuestion } from "../../../features/questions/api";
import { formatDateTime } from "../../../lib/format";
import { userHasFeature } from "../../../lib/plan-access";
import { useAsync } from "../../../lib/useAsync";
import { colors, radius, spacing } from "../../../theme";

/** Notes grouped by question, newest first (the API already sorts them). */
function groupByQuestion(notes: NoteWithQuestion[]): NoteWithQuestion[][] {
  const groups = new Map<string, NoteWithQuestion[]>();
  for (const note of notes) groups.set(note.questionCode, [...(groups.get(note.questionCode) ?? []), note]);
  return [...groups.values()];
}

export default function MyNotesScreen() {
  const { user } = useAuth();
  if (!userHasFeature(user, "notes")) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <LockedFeature
          feature="notes"
          label="Bloco de anotações"
          description="Organize seus estudos com anotações em cada questão e revise tudo em um só lugar."
        />
      </Screen>
    );
  }
  return <NotesList />;
}

function NotesList() {
  const notes = useAsync(listMyNotes, [], { reloadOnFocus: true });
  return (
    <Screen edges={["left", "right", "bottom"]} onRefresh={notes.refresh} refreshing={notes.refreshing}>
      <Subtitle>Todas as anotações que você fez nas questões, das mais recentes às mais antigas.</Subtitle>
      <LoadState loading={notes.loading} error={notes.error} onRetry={notes.reload} fallback="Não foi possível carregar suas anotações." />
      {notes.data?.length === 0 && (
        <EmptyState message='Você ainda não fez anotações. Use o botão "Anotação" em qualquer questão.' />
      )}
      {notes.data &&
        groupByQuestion(notes.data).map((group) => {
          const first = group[0];
          return (
            <Card key={first.questionCode}>
              <Text style={styles.title}>
                <Text style={styles.code}>[{first.questionCode}] </Text>
                {first.topic}
              </Text>
              <Text style={styles.area}>{first.areaName}</Text>
              {group.map((note) => (
                <View key={note.id} style={styles.note}>
                  <Text style={styles.noteText} selectable>
                    {note.content}
                  </Text>
                  <Text style={styles.date}>{formatDateTime(note.createdAt)}</Text>
                </View>
              ))}
              <Text
                style={styles.link}
                accessibilityRole="link"
                accessibilityLabel={`Ver questão ${first.questionCode}`}
                onPress={() => router.push(`/aluno/questao/${first.questionCode}`)}
              >
                Ver questão →
              </Text>
            </Card>
          );
        })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: "700", color: colors.ink },
  code: { color: colors.brand800 },
  area: { fontSize: 13, color: colors.muted },
  note: { backgroundColor: colors.background, borderRadius: radius.input, padding: spacing(3), gap: spacing(1) },
  noteText: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  date: { fontSize: 12, color: colors.muted },
  link: { fontSize: 14, fontWeight: "700", color: colors.brand600 },
});
