import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/design-system/components/SegmentedControl";
import { useAuth } from "./auth-context";

const profileOptions: SegmentedControlOption<"aluno" | "professor">[] = [
  { value: "aluno", label: "Aluno" },
  { value: "professor", label: "Professor" },
];

export function SignupForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"aluno" | "professor">("aluno");
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
      login({ name, email, role });
      navigate("/dashboard", { replace: true });
    }, 400);
  }

  return (
    <form className="flex w-full max-w-[420px] flex-col gap-5" onSubmit={handleSubmit}>
      <Input
        label="Nome completo:"
        name="name"
        autoComplete="name"
        placeholder="Seu nome completo"
        icon={<User className="size-4" aria-hidden="true" />}
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
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
        autoComplete="new-password"
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
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-strong" id="profile-label">
          Seu perfil:
        </span>
        <SegmentedControl
          aria-label="Seu perfil"
          options={profileOptions}
          value={role}
          onChange={setRole}
          className="grid-cols-2"
        />
      </div>
      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? "Criando conta..." : "Cadastrar"}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        Ao criar uma conta, você concorda com nossos {" "}
        <span className="text-brand-800 underline">Termos de uso e Política e privacidade</span>.
      </p>
    </form>
  );
}
