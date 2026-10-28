import { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { Container } from "@/design-system/components/Container";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { Spinner } from "@/design-system/components/Spinner";
import { useAuth, type UserRole } from "@/features/auth/auth-context";
import { errorMessage } from "@/shared/api/api-error";
import { useAsync } from "@/shared/hooks/useAsync";
import { PLAN_LABEL, type PlanId } from "@/shared/plans/plan-access";
import { listAdminUsers, updateAdminUser, type AdminUser, type AdminUserChanges } from "./api";

const ROLE_LABEL: Record<UserRole, string> = {
  aluno: "Aluno",
  professor: "Professor",
  admin: "Admin",
};

const roleOptions = (Object.keys(ROLE_LABEL) as UserRole[]).map((role) => ({
  value: role,
  label: ROLE_LABEL[role],
}));

const planOptions = (Object.keys(PLAN_LABEL) as PlanId[]).map((plan) => ({
  value: plan,
  label: PLAN_LABEL[plan],
}));

/** /admin/usuarios — search accounts, change profile and plan, deactivate access. */
export function AdminUsersPage() {
  const { user: me } = useAuth();
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "todos">("todos");
  const [version, setVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const { data: users, loading, error } = useAsync(
    () => listAdminUsers({ search, role: roleFilter }),
    [search, roleFilter, version]
  );

  async function applyChange(target: AdminUser, changes: AdminUserChanges, successText: string) {
    setBusyId(target.id);
    setFeedback(null);
    try {
      await updateAdminUser(target.id, changes);
      setFeedback({ tone: "success", text: successText });
      setVersion((current) => current + 1);
    } catch (changeError) {
      setFeedback({ tone: "danger", text: errorMessage(changeError) });
    } finally {
      setBusyId(null);
    }
  }

  const counts = (users ?? []).reduce<Record<UserRole, number>>(
    (acc, user) => ({ ...acc, [user.role]: acc[user.role] + 1 }),
    { aluno: 0, professor: 0, admin: 0 }
  );

  return (
    <Container as="div" className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-strong">Usuários</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Gerencie o perfil, o plano e o acesso das contas do Inkflow.
        </p>
      </div>

      <Card bare className="p-5 shadow-card">
        <form
          className="flex flex-wrap items-end gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(draftSearch);
          }}
        >
          <div className="min-w-[240px] flex-1">
            <Input
              label="Buscar por nome ou e-mail"
              type="search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              icon={<Search className="size-4" aria-hidden="true" />}
            />
          </div>
          <Select
            label="Perfil"
            className="w-40"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as UserRole | "todos")}
            options={[{ value: "todos", label: "Todos" }, ...roleOptions]}
          />
          <Button type="submit">Buscar</Button>
        </form>
      </Card>

      <p
        role="status"
        aria-live="polite"
        className={feedback?.tone === "danger" ? "text-sm text-danger" : "text-sm font-semibold text-success"}
      >
        {feedback?.text}
      </p>

      <Card as="section" aria-labelledby="users-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="users-heading" className="text-lg font-semibold text-ink-strong">
            {users ? `${users.length} ${users.length === 1 ? "conta" : "contas"}` : "Contas"}
          </h2>
          {users && (
            <p className="text-sm text-ink-muted">
              {counts.aluno} alunos · {counts.professor} professores · {counts.admin} admins
            </p>
          )}
        </div>

        {loading && !users ? (
          <Spinner label="Carregando usuários…" className="py-8" />
        ) : error ? (
          <p className="mt-4 text-sm text-ink-muted">
            {errorMessage(error, "Não foi possível carregar os usuários.")}
          </p>
        ) : !users || users.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Nenhuma conta encontrada.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <caption className="sr-only">Contas do Inkflow</caption>
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase text-ink-muted">
                  <th scope="col" className="py-2 pr-4 font-semibold">Usuário</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Perfil</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Plano</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
                  <th scope="col" className="py-2 font-semibold">Acesso</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isMe = user.id === me?.id;
                  const busy = busyId === user.id;
                  return (
                    <tr key={user.id} className="border-b border-black/5 last:border-0">
                      <td className="py-3 pr-4">
                        <span className="font-medium text-ink-strong">
                          {user.name}
                          {isMe && " (você)"}
                        </span>
                        <span className="block text-xs text-ink-muted">{user.email}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <Select
                          label={`Perfil de ${user.name}`}
                          labelHidden
                          className="w-36"
                          value={user.role}
                          disabled={isMe || busy}
                          onChange={(event) => {
                            const role = event.target.value as UserRole;
                            void applyChange(user, { role }, `${user.name} agora é ${ROLE_LABEL[role].toLowerCase()}.`);
                          }}
                          options={roleOptions}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        {user.role === "aluno" ? (
                          <Select
                            label={`Plano de ${user.name}`}
                            labelHidden
                            className="w-36"
                            value={user.plan ?? "basico"}
                            disabled={busy}
                            onChange={(event) => {
                              const plan = event.target.value as PlanId;
                              void applyChange(user, { plan }, `Plano de ${user.name} alterado para ${PLAN_LABEL[plan]}.`);
                            }}
                            options={planOptions}
                          />
                        ) : (
                          <span className="text-ink-muted">Sem plano</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={user.active ? "success" : "neutral"}>
                          {user.active ? "Ativa" : "Desativada"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {!isMe && (
                          <Button
                            size="sm"
                            variant={user.active ? "danger" : "outline"}
                            disabled={busy}
                            onClick={() =>
                              applyChange(
                                user,
                                { active: !user.active },
                                user.active
                                  ? `A conta de ${user.name} foi desativada.`
                                  : `A conta de ${user.name} foi reativada.`
                              )
                            }
                            aria-label={`${user.active ? "Desativar" : "Reativar"} a conta de ${user.name}`}
                          >
                            {user.active ? "Desativar" : "Reativar"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Container>
  );
}

export default AdminUsersPage;
