import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/design-system/components/SegmentedControl";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ChangePasswordModal } from "@/shared/modals/ChangePasswordModal";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

type Mode = "login" | "cadastro";

const modeOptions: SegmentedControlOption<Mode>[] = [
  { value: "login", label: "Entrar" },
  { value: "cadastro", label: "Cadastrar" },
];

export function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const mode: Mode = searchParams.get("modo") === "cadastro" ? "cadastro" : "login";

  function setMode(next: Mode) {
    setSearchParams(next === "login" ? {} : { modo: next }, { replace: true });
  }

  return (
    <AuthLayout>
      <div className="flex w-full max-w-[420px] flex-col items-center gap-6">
        <SegmentedControl
          aria-label="Alternar entre entrar e cadastrar"
          options={modeOptions}
          value={mode}
          onChange={setMode}
          className="w-full grid-cols-2"
        />

        <h1 className="sr-only">
          {mode === "login" ? "Entrar no Inkflow" : "Criar conta no Inkflow"}
        </h1>

        {mode === "login" ? (
          <LoginForm onForgotPassword={() => setForgotPasswordOpen(true)} />
        ) : (
          <SignupForm />
        )}

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-800 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar para tela inicial
        </Link>
      </div>

      <ChangePasswordModal
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />
    </AuthLayout>
  );
}

export default AuthPage;
