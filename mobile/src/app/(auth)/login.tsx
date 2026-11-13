import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Brand, Button, Card, ErrorMessage, PasswordField, Screen, Subtitle, TextField, Title } from "../../components/ui";
import { useAuth } from "../../features/auth/AuthProvider";
import { emailError, passwordError } from "../../features/auth/validation";
import { testAccounts } from "../../features/auth/test-accounts";
import { colors, radius, spacing, themed } from "../../theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError("Informe seu e-mail e sua senha.");
      return;
    }
    // Same rules as the web login form.
    const problem = emailError(email) ?? passwordError(password);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      // The (auth) layout redirects to the profile's home once the user is set.
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível entrar.");
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Brand />
      <Title>Entrar</Title>
      <Subtitle>Continue sua preparação para o ENADE.</Subtitle>

      <Card>
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <PasswordField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••••"
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />
        <ErrorMessage message={error} />
        <Button label="Entrar" onPress={handleSubmit} loading={submitting} />
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ainda não tem conta?</Text>
        <Link href="/signup" style={styles.link}>
          Criar conta
        </Link>
      </View>

      {__DEV__ && (
        <View style={styles.devBox}>
          <Text style={styles.devTitle}>Contas de teste (só em desenvolvimento)</Text>
          {testAccounts.map((account) => (
            <Pressable
              key={account.email}
              accessibilityRole="button"
              onPress={() => {
                setEmail(account.email);
                setPassword(account.password);
                setError(null);
              }}
              style={({ pressed }) => [styles.devAccount, pressed && styles.devPressed]}
            >
              <Text style={styles.devDescription}>{account.description}</Text>
              <Text style={styles.devEmail}>{account.email}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  footer: { flexDirection: "row", justifyContent: "center", gap: spacing(1.5) },
  footerText: { color: colors.muted, fontSize: 15 },
  link: { color: colors.brand600, fontSize: 15, fontWeight: "700" },
  devBox: {
    marginTop: spacing(2),
    padding: spacing(4),
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.brand600,
  },
  devTitle: { fontSize: 13, fontWeight: "700", color: colors.brandText },
  devAccount: { paddingVertical: spacing(1.5) },
  devPressed: { opacity: 0.6 },
  devDescription: { fontSize: 14, fontWeight: "600", color: colors.ink },
  devEmail: { fontSize: 13, color: colors.muted },
}));
