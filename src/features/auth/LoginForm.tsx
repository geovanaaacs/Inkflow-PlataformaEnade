import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { useAuth } from "./auth-context";

interface LoginFormProps {
  onForgotPassword: () => void;
}

export function LoginForm({ onForgotPassword }: LoginFormProps) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Sua senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    window.setTimeout(() => {
      login({ name: email.split("@")[0] || "Estudante", email, role: "aluno" });
      navigate("/dashboard", { replace: true });
    }, 400);
  }

  return (
    <form className="flex w-full max-w-[420px] flex-col gap-5" onSubmit={handleSubmit}>
      <Input
        label="E-mail:"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="seu@email.com"
        icon={<Mail className="size-4" aria-hidden="true" />}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <Input
        label="Senha:"
        type={showPassword ? "text" : "password"}
        name="password"
        autoComplete="current-password"
        placeholder="••••••••••"
        icon={<Lock className="size-4" aria-hidden="true" />}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={error ?? undefined}
        required
        endAdornment={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="rounded p-1 text-ink-muted hover:text-ink-strong"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        }
      />
      <button
        type="button"
        onClick={onForgotPassword}
        className="self-end text-sm font-medium text-brand-800 hover:underline"
      >
        Esqueceu sua senha?
      </button>
      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
