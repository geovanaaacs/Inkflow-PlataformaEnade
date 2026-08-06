import type { ReactNode } from "react";
import { Logo } from "@/design-system/components/Logo";
import { Link } from "react-router-dom";

interface AuthLayoutProps {
  children: ReactNode;
}

const highlights = [
  { color: "bg-success", label: "Correção por IA e professores" },
  { color: "bg-danger", label: "Simulados reais" },
  { color: "bg-warning", label: "Evolução contínua" },
];

/** Split-screen shell shared by the login and sign-up screens. */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section
        aria-hidden="true"
        className="relative hidden flex-col items-center justify-center gap-8 overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 px-12 py-16 text-center text-white lg:flex"
      >
        <span className="flex size-24 items-center justify-center rounded-full">
          <Link
              to="/"
              className="rounded-button focus-visible:outline-none"
              aria-label="Inkflow — página inicial"
            >
              <Logo size="md" showText={false}/>
          </Link>
        </span>
        <div className="max-w-md">
          <h1 className="text-3xl font-bold">Domine o ENADE com Inkflow</h1>
          <p className="mt-3 text-base text-white/85">
            Treine questões reais, receba correções inteligentes e evolua
            antes da prova de conclusão de curso.
          </p>
        </div>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
          {highlights.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${item.color}`} />
              {item.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-center justify-center gap-6 bg-app-bg px-4 py-16 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        {children}
      </section>
    </div>
  );
}
