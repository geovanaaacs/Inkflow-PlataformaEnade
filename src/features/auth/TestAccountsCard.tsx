import { useState } from "react";
import { FlaskConical, RotateCcw } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { errorMessage } from "@/shared/api/api-error";
import { resetMockData } from "@/shared/api/mock-store";
import { useAuth } from "./auth-context";
import { testAccounts } from "./data";

/**
 * Development-only helper: one-click login for each mock profile/plan and a
 * reset of everything the mock API saved in this browser.
 */
export function TestAccountsCard() {
  const { login } = useAuth();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(email: string, password: string) {
    setError(null);
    setPendingEmail(email);
    try {
      await login(email, password);
    } catch (loginError) {
      setError(errorMessage(loginError));
      setPendingEmail(null);
    }
  }

  function handleReset() {
    resetMockData();
    window.location.reload();
  }

  return (
    <Card
      as="section"
      aria-labelledby="test-accounts-heading"
      bare
      className="w-full max-w-[420px] border border-dashed border-brand-600/50 p-5"
    >
      <h2
        id="test-accounts-heading"
        className="flex items-center gap-2 text-sm font-semibold text-ink-strong"
      >
        <FlaskConical aria-hidden="true" className="size-4 text-brand-800" />
        Contas de teste (modo desenvolvimento)
      </h2>

      <ul className="mt-4 flex flex-col gap-3">
        {testAccounts.map((account) => (
          <li key={account.email} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-strong">{account.description}</p>
              <p className="truncate text-xs text-ink-muted">
                {account.email} · {account.password}
              </p>
            </div>
            <Button
              size="sm"
              variant="soft"
              disabled={pendingEmail !== null}
              onClick={() => handleLogin(account.email, account.password)}
            >
              {pendingEmail === account.email ? "Entrando..." : "Entrar"}
            </Button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 border-t border-black/5 pt-4">
        <Button
          size="sm"
          variant="ghost"
          leadingIcon={<RotateCcw aria-hidden="true" className="size-4" />}
          onClick={handleReset}
        >
          Resetar dados de teste
        </Button>
        <p className="mt-1 text-xs text-ink-muted">
          Apaga contas criadas, anotações, respostas e agendamentos salvos neste navegador.
        </p>
      </div>
    </Card>
  );
}
