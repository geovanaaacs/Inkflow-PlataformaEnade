import { Stack } from "expo-router";
import { stackScreenOptions } from "../../../components/navigation";
import { PracticeProvider } from "../../../features/questions/practice";

/**
 * Student area: the tabs, plus the screens opened on top of them (question,
 * theme, plans, notes) with a header and a back button.
 */
export default function StudentLayout() {
  return (
    <PracticeProvider>
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="questao/[code]" options={{ title: "Questão" }} />
        <Stack.Screen name="tema/[slug]" options={{ title: "Praticar por tema" }} />
        <Stack.Screen name="planos" options={{ title: "Planos" }} />
        <Stack.Screen name="anotacoes" options={{ title: "Minhas anotações" }} />
        <Stack.Screen name="simulado/[id]" options={{ title: "Simulado" }} />
        <Stack.Screen name="simulado/resultado/[attemptId]" options={{ title: "Resultado do simulado" }} />
        <Stack.Screen name="mentoria" options={{ title: "Mentoria" }} />
      </Stack>
    </PracticeProvider>
  );
}
