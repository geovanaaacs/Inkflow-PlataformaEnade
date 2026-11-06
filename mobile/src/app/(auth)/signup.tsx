import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Brand, Button, Card, ErrorMessage, Screen, Segmented, Subtitle, TextField, Title } from "../../components/ui";
import type { SignupInput } from "../../features/auth/api";
import { useAuth } from "../../features/auth/AuthProvider";
import { colors, spacing } from "../../theme";

type Role = SignupInput["role"];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "aluno", label: "Sou aluno" },
  { value: "professor", label: "Sou professor" },
];

/** Same rules as the API (registerSchema), checked here to answer faster. */
function validate(input: SignupInput, confirmation: string): string | null {
  if (input.name.trim().length < 2) return "Informe seu nome completo.";
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) return "Informe um e-mail válido.";
  if (input.password.length < 6) return "Sua senha deve ter pelo menos 6 caracteres.";
  if (input.password !== confirmation) return "As senhas não conferem.";
  return null;
}

export default function SignupScreen() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [role, setRole] = useState<Role>("aluno");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const input: SignupInput = { name, email, password, role };
    const problem = validate(input, confirmation);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signup(input);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar sua conta.");
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Brand />
      <Title>Criar conta</Title>
      <Subtitle>Alunos começam no plano Básico, gratuito.</Subtitle>

      <Card>
        <Segmented options={ROLE_OPTIONS} value={role} onChange={setRole} />
        <TextField
          label="Nome completo"
          value={name}
          onChangeText={setName}
          placeholder="Seu nome"
          autoComplete="name"
          textContentType="name"
        />
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="voce@email.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="Pelo menos 6 caracteres"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label="Confirmar senha"
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="Repita a senha"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />
        <ErrorMessage message={error} />
        <Button label="Criar conta" onPress={handleSubmit} loading={submitting} />
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Já tem conta?</Text>
        <Link href="/login" style={styles.link}>
          Entrar
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: "row", justifyContent: "center", gap: spacing(1.5) },
  footerText: { color: colors.muted, fontSize: 15 },
  link: { color: colors.brand600, fontSize: 15, fontWeight: "700" },
});
