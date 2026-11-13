import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button, Card, ErrorMessage, PasswordField, Screen, SuccessMessage, TextField } from "../../components/ui";
import { errorMessage } from "../../lib/format";
import { colors, themed } from "../../theme";
import { changePassword, updateProfile } from "./api";
import { useAuth } from "./AuthProvider";
import { ProfilePhoto } from "./ProfilePhoto";
import { emailError, nameError, passwordError } from "./validation";

/** "Editar perfil": personal data and password change, for every profile. */
export function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [course, setCourse] = useState(user?.course ?? "");
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [changing, setChanging] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  if (!user) return null;

  async function saveProfile() {
    setProfileSaved(null);
    const problem = nameError(name) ?? emailError(email);
    if (problem) {
      setProfileError(problem);
      return;
    }
    setProfileError(null);
    setSaving(true);
    try {
      await updateProfile({ name, email, course: course || null });
      await refreshUser();
      setProfileSaved("Alterações salvas com sucesso.");
    } catch (caught) {
      setProfileError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    let problem: string | null = null;
    if (!currentPassword) problem = "Informe sua senha atual.";
    else problem = passwordError(newPassword);
    if (!problem && newPassword !== confirmation) problem = "As senhas não conferem.";
    if (!problem && newPassword === currentPassword) problem = "A nova senha deve ser diferente da atual.";
    if (problem) {
      setPasswordFeedback({ ok: false, message: problem });
      return;
    }
    setPasswordFeedback(null);
    setChanging(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setPasswordFeedback({ ok: true, message: "Senha alterada com sucesso." });
    } catch (caught) {
      setPasswordFeedback({ ok: false, message: errorMessage(caught) });
    } finally {
      setChanging(false);
    }
  }

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <ProfilePhoto />
      <Card>
        <Text style={styles.section}>Informações pessoais</Text>
        <TextField
          label="Nome completo"
          value={name}
          onChangeText={setName}
          placeholder="Seu nome completo"
          autoComplete="name"
          textContentType="name"
        />
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        {user.role !== "admin" && (
          <TextField
            label="Curso"
            value={course}
            onChangeText={setCourse}
            placeholder="Ex.: Análise e Desenvolvimento de Sistemas"
          />
        )}
        <ErrorMessage message={profileError} />
        <SuccessMessage message={profileSaved} />
        <Button label="Salvar alterações" onPress={saveProfile} loading={saving} />
      </Card>

      <Card>
        <Text style={styles.section}>Alterar senha</Text>
        <PasswordField
          label="Senha atual"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="••••••••••"
          autoComplete="password"
          textContentType="password"
        />
        <PasswordField
          label="Nova senha"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Pelo menos 6 caracteres"
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <PasswordField
          label="Confirmar nova senha"
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="Repita a nova senha"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={savePassword}
        />
        {passwordFeedback?.ok ? (
          <SuccessMessage message={passwordFeedback.message} />
        ) : (
          <ErrorMessage message={passwordFeedback?.message ?? null} />
        )}
        <Button label="Alterar senha" variant="secondary" onPress={savePassword} loading={changing} />
      </Card>
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  section: { fontSize: 17, fontWeight: "700", color: colors.ink },
}));
