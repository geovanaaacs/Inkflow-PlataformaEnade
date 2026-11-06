import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { colors } from "../../../../theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={typeof color === "string" ? color : colors.muted} size={size} />
  );
}

export default function StudentTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand600,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Início", tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="questoes" options={{ title: "Questões", tabBarIcon: icon("list-outline") }} />
      <Tabs.Screen name="ranking" options={{ title: "Ranking", tabBarIcon: icon("trophy-outline") }} />
      <Tabs.Screen name="conta" options={{ title: "Conta", tabBarIcon: icon("person-circle-outline") }} />
    </Tabs>
  );
}
