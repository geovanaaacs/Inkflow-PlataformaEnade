import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Badge, LoadState } from "../../../../components/feedback";
import { Button, Card, Screen, Segmented, Subtitle, TextField, Title } from "../../../../components/ui";
import { listAdminUsers, updateAdminUser, type AdminUser, type AdminUserChanges } from "../../../../features/admin/api";
import type { PlanId, UserRole } from "../../../../features/auth/api";
import { useAuth } from "../../../../features/auth/AuthProvider";
import { ChipRow } from "../../../../features/questions/components";
import { errorMessage, plural } from "../../../../lib/format";
import { PLAN_LABEL } from "../../../../lib/plan-access";
import { useAsync } from "../../../../lib/useAsync";
import { colors, spacing, themed } from "../../../../theme";

const ROLE_LABEL: Record<UserRole, string> = { aluno: "Aluno", professor: "Professor", admin: "Admin" };
const ROLES = (Object.keys(ROLE_LABEL) as UserRole[]).map((role) => ({ value: role, label: ROLE_LABEL[role] }));
const PLANS = (Object.keys(PLAN_LABEL) as PlanId[]).map((plan) => ({ value: plan, label: PLAN_LABEL[plan] }));

/** Search accounts, change profile and plan, deactivate access. */
export default function AdminUsersScreen() {
  const { user: me } = useAuth();
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole>();
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const users = useAsync(() => listAdminUsers({ search, role }), [search, role, version]);
  const counts = (users.data ?? []).reduce<Record<UserRole, number>>(
    (acc, user) => ({ ...acc, [user.role]: acc[user.role] + 1 }),
    { aluno: 0, professor: 0, admin: 0 }
  );

  async function apply(target: AdminUser, changes: AdminUserChanges, successText: string) {
    setBusy(target.id);
    setFeedback(null);
    try {
      await updateAdminUser(target.id, changes);
      setFeedback({ tone: "success", text: successText });
      setVersion((current) => current + 1);
    } catch (caught) {
      // E.g. 409 "O Inkflow precisa de pelo menos um administrador ativo."
      setFeedback({ tone: "danger", text: errorMessage(caught) });
    } finally {
      setBusy(null);
    }
  }

  /** Every change asks first: on a phone a mistaken tap is easy. */
  function confirm(title: string, message: string, action: string, onConfirm: () => void, destructive = false) {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      { text: action, style: destructive ? "destructive" : "default", onPress: onConfirm },
    ]);
  }

  return (
    <Screen edges={["top", "left", "right"]} onRefresh={() => setVersion((current) => current + 1)} refreshing={false}>
      <Title>Usuários</Title>
      <Subtitle>Gerencie o perfil, o plano e o acesso das contas do Inkflow.</Subtitle>
      <TextField
        label="Buscar por nome ou e-mail"
        value={draftSearch}
        onChangeText={setDraftSearch}
        returnKeyType="search"
        autoCapitalize="none"
        onSubmitEditing={() => setSearch(draftSearch)}
      />
      <ChipRow label="Perfil" options={ROLES} value={role} onChange={setRole} />
      {feedback && <Text style={[styles.feedback, { color: feedback.tone === "success" ? colors.success : colors.danger }]}>{feedback.text}</Text>}
      <LoadState loading={users.loading} error={users.data ? null : users.error} onRetry={users.reload} fallback="Não foi possível carregar os usuários." />
      {users.data && (
        <>
          <Text style={styles.muted}>
            {plural(users.data.length, "conta", "contas")} · {counts.aluno} alunos · {counts.professor} professores · {counts.admin} admins
          </Text>
          {users.data.length === 0 && <Text style={styles.muted}>Nenhuma conta encontrada.</Text>}
          {users.data.map((user) => {
            const isMe = user.id === me?.id;
            const disabled = busy !== null;
            return (
              <Card key={user.id}>
                <View style={styles.header}>
                  <View style={styles.flex}>
                    <Text style={styles.name}>
                      {user.name}
                      {isMe ? " (você)" : ""}
                    </Text>
                    <Text style={styles.muted}>{user.email}</Text>
                  </View>
                  <Badge tone={user.active ? "success" : "danger"}>{user.active ? "Ativa" : "Desativada"}</Badge>
                </View>

                <Text style={styles.label}>Perfil</Text>
                {isMe ? (
                  <Text style={styles.muted}>{ROLE_LABEL[user.role]} — você não pode mudar o seu próprio perfil.</Text>
                ) : (
                  <Segmented
                    options={ROLES}
                    value={user.role}
                    onChange={(next) => {
                      if (next === user.role || disabled) return;
                      confirm(
                        "Mudar perfil?",
                        `${user.name} passará a ser ${ROLE_LABEL[next].toLowerCase()}.${next === "aluno" ? " Alunos começam no plano Básico." : " Professores e admins não têm plano."}`,
                        "Mudar",
                        () => void apply(user, { role: next }, `${user.name} agora é ${ROLE_LABEL[next].toLowerCase()}.`)
                      );
                    }}
                  />
                )}

                {user.role === "aluno" && (
                  <>
                    <Text style={styles.label}>Plano</Text>
                    <Segmented
                      options={PLANS}
                      value={user.plan ?? "basico"}
                      onChange={(next) => {
                        if (next === user.plan || disabled) return;
                        confirm(
                          "Mudar plano?",
                          `O plano de ${user.name} passará a ser ${PLAN_LABEL[next]}.`,
                          "Mudar",
                          () => void apply(user, { plan: next }, `Plano de ${user.name} alterado para ${PLAN_LABEL[next]}.`)
                        );
                      }}
                    />
                  </>
                )}

                {!isMe && (
                  <Button
                    label={user.active ? "Desativar conta" : "Reativar conta"}
                    variant="secondary"
                    disabled={disabled}
                    loading={busy === user.id}
                    onPress={() =>
                      confirm(
                        user.active ? "Desativar conta?" : "Reativar conta?",
                        user.active
                          ? `${user.name} não conseguirá mais entrar no Inkflow. O histórico é mantido e a conta pode ser reativada.`
                          : `${user.name} poderá entrar no Inkflow novamente.`,
                        user.active ? "Desativar" : "Reativar",
                        () =>
                          void apply(
                            user,
                            { active: !user.active },
                            user.active ? `A conta de ${user.name} foi desativada.` : `A conta de ${user.name} foi reativada.`
                          ),
                        user.active
                      )
                    }
                  />
                )}
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  feedback: { fontSize: 15, fontWeight: "700" },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink },
  label: { fontSize: 13, fontWeight: "700", color: colors.muted },
}));
