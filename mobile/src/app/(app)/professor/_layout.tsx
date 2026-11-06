import { Stack } from "expo-router";
import { stackScreenOptions } from "../../../components/navigation";
import { PracticeProvider } from "../../../features/questions/practice";

/**
 * Teacher area: the tabs, plus the screens opened on top of them (question,
 * new slot). Teachers practice questions too (no daily limit, notes allowed).
 */
export default function TeacherLayout() {
  return (
    <PracticeProvider>
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="questao/[code]" options={{ title: "Questão" }} />
        <Stack.Screen name="novo-horario" options={{ title: "Abrir horário" }} />
      </Stack>
    </PracticeProvider>
  );
}
