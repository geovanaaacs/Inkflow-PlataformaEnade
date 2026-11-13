import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { colors, themed } from "../theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

/** `tabBarIcon` for a tab, drawn with Ionicons in the tab's current color. */
export function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={typeof color === "string" ? color : colors.muted} size={size} />
  );
}

/** Tab bar look shared by every profile. */
export const tabScreenOptions = themed(() => ({
  headerShown: false,
  tabBarActiveTintColor: colors.brand600,
  tabBarInactiveTintColor: colors.muted,
  tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
  tabBarActiveBackgroundColor: colors.brandSoft,
}) as const);

/** Header look of the screens opened on top of the tabs. */
export const stackScreenOptions = themed(() => ({
  headerTintColor: colors.brandText,
  headerTitleStyle: { color: colors.ink },
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerBackTitle: "Voltar",
  contentStyle: { backgroundColor: colors.background },
}) as const);
