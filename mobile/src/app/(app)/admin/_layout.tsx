import { Stack } from "expo-router";
import { stackScreenOptions } from "../../../components/navigation";

/** Admin area: the tabs, plus the question and mock exam forms opened on top of them. */
export default function AdminLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="questao-form" options={{ title: "Questão" }} />
      <Stack.Screen name="simulado-form" options={{ title: "Simulado" }} />
      <Stack.Screen name="planos" options={{ title: "Planos" }} />
      <Stack.Screen name="perfil" options={{ title: "Editar perfil" }} />
    </Stack>
  );
}
