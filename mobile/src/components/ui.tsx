import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors, radius, spacing, themed } from "../theme";

interface ScreenProps {
  children: ReactNode;
  /**
   * Sides that need safe-area padding. Screens under a tab bar or a stack
   * header leave those sides to the navigator.
   */
  edges?: Edge[];
  /** Enables pull-to-refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
}

/** Page container: safe area, scroll, keyboard avoidance and pull-to-refresh. */
export function Screen({ children, edges = ["top", "bottom", "left", "right"], onRefresh, refreshing = false }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand600} colors={[colors.brand600]} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Brand() {
  return (
    <View style={styles.brand}>
      <Image source={require("../../assets/logo.png")} style={styles.brandMark} accessibilityIgnoresInvertColors />
      <Text style={styles.brandName}>Inkflow</Text>
    </View>
  );
}

/** Round profile picture; the initials when there is no photo. */
export function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl?: string | null; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[styles.avatar, box]} accessibilityLabel={`Foto de ${name}`} />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return (
    <View style={[styles.avatar, box]} accessibilityLabel={`Sem foto: ${name}`}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials || "?"}</Text>
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export type IconName = ComponentProps<typeof Ionicons>["name"];

/** Icon + text on one line (meta info, panel titles). Icons in place of emojis. */
export function IconText({
  icon,
  children,
  style,
  color,
  size = 16,
}: {
  icon: IconName;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
  size?: number;
}) {
  const flat = StyleSheet.flatten(style) ?? {};
  return (
    <View style={styles.iconText}>
      <Ionicons name={icon} size={size} color={color ?? (flat.color as string | undefined) ?? colors.muted} />
      <Text style={[styles.iconTextLabel, style]}>{children}</Text>
    </View>
  );
}

interface ButtonProps {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ label, icon, onPress, variant = "primary", loading = false, disabled = false }: ButtonProps) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        (pressed || disabled) && styles.buttonDimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.onBrand : colors.brand600} />
      ) : (
        <View style={styles.buttonContent}>
          {icon ? <Ionicons name={icon} size={18} color={primary ? colors.onBrand : colors.brand600} /> : null}
          <Text style={[styles.buttonLabel, !primary && styles.buttonLabelSecondary]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

interface TextFieldProps extends TextInputProps {
  label: string;
}

export function TextField({ label, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

/** Password input with the show/hide eye button, like the web forms. */
export function PasswordField({ label, ...props }: TextFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.passwordRow}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.passwordInput]}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          style={styles.eye}
        >
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

/** Green confirmation box (e.g. "Alterações salvas"). */
export function SuccessMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.success} accessibilityRole="alert">
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

/** Two or more mutually exclusive options (e.g. aluno / professor). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LoadingScreen() {
  return (
    <View style={[styles.safe, styles.center]}>
      <ActivityIndicator size="large" color={colors.brand600} />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: "center", justifyContent: "center" },
  content: { flexGrow: 1, padding: spacing(6), gap: spacing(4) },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing(2), marginBottom: spacing(2) },
  brandMark: { width: 40, height: 40 },
  avatar: { backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { fontWeight: "700", color: colors.brandText },
  brandName: { fontSize: 22, fontWeight: "700", color: colors.brandText },
  title: { fontSize: 26, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing(5),
    gap: spacing(4),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(4),
  },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  iconText: { flexDirection: "row", alignItems: "center", gap: spacing(1.5), flexShrink: 1 },
  iconTextLabel: { flexShrink: 1 },
  buttonPrimary: { backgroundColor: colors.brand600 },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brand600 },
  buttonDimmed: { opacity: 0.7 },
  buttonLabel: { color: colors.onBrand, fontSize: 16, fontWeight: "600" },
  buttonLabelSecondary: { color: colors.brand600 },
  field: { gap: spacing(1.5) },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: colors.ink },
  input: {
    minHeight: 48,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    fontSize: 16,
    color: colors.ink,
  },
  passwordRow: { justifyContent: "center" },
  passwordInput: { paddingRight: spacing(12) },
  eye: { position: "absolute", right: spacing(3), padding: spacing(1) },
  success: { backgroundColor: colors.successBg, borderRadius: radius.badge, padding: spacing(3) },
  successText: { color: colors.success, fontSize: 14 },
  error: { backgroundColor: colors.dangerBg, borderRadius: radius.badge, padding: spacing(3) },
  errorText: { color: colors.danger, fontSize: 14 },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.brandSoft,
    borderRadius: radius.button,
    padding: spacing(1),
    gap: spacing(1),
  },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.button - 2, alignItems: "center", justifyContent: "center" },
  segmentSelected: { backgroundColor: colors.surface },
  segmentLabel: { fontSize: 15, color: colors.muted, fontWeight: "500" },
  segmentLabelSelected: { color: colors.brandText, fontWeight: "700" },
}));
