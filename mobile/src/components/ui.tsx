import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme";

/** Page container: safe area, scroll and keyboard avoidance. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>i</Text>
      </View>
      <Text style={styles.brandName}>Inkflow</Text>
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

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = "primary", loading = false, disabled = false }: ButtonProps) {
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
        <ActivityIndicator color={primary ? colors.surface : colors.brand600} />
      ) : (
        <Text style={[styles.buttonLabel, !primary && styles.buttonLabelSecondary]}>{label}</Text>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: "center", justifyContent: "center" },
  content: { flexGrow: 1, padding: spacing(6), gap: spacing(4) },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing(2), marginBottom: spacing(2) },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand600,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: { color: colors.surface, fontSize: 20, fontWeight: "700", fontStyle: "italic" },
  brandName: { fontSize: 22, fontWeight: "700", color: colors.brand900 },
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
  buttonPrimary: { backgroundColor: colors.brand600 },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brand600 },
  buttonDimmed: { opacity: 0.7 },
  buttonLabel: { color: colors.surface, fontSize: 16, fontWeight: "600" },
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
  segmentLabelSelected: { color: colors.brand800, fontWeight: "700" },
});
