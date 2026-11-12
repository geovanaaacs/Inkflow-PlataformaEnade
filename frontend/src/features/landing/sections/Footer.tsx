import { Github, Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Container } from "@/design-system/components/Container";
import { GITHUB_URL } from "@/features/institutional/links";

const linkClass = "rounded-sm underline-offset-4 hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white";

export function Footer() {
  return (
    <footer className="bg-neutral-800 text-neutral-200">
      <Container className="py-8">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <h3 className="text-xl font-bold text-white">Inkflow</h3>

            <p className="mt-2 text-sm text-neutral-400">
              Plataforma para apoiar estudantes na preparação para o ENADE por
              meio de simulados, feedbacks e acompanhamento da evolução.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white">Contato</h4>

            <ul className="mt-3 space-y-3 text-sm text-neutral-400">
              <li>
                <Link to="/contato" className={`flex items-center gap-2 ${linkClass}`}>
                  <Mail aria-hidden="true" className="size-4" />
                  contato@inkflow.com
                </Link>
              </li>

              <li className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="size-4" />
                São José dos Campos - SP
              </li>

              <li>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={`flex items-center gap-2 ${linkClass}`}>
                  <Github aria-hidden="true" className="size-4" />
                  GitHub do projeto
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center justify-between gap-4 border-t border-neutral-700 pt-4 text-sm text-neutral-400 md:flex-row">
          <p>© 2026 Inkflow. Todos os direitos reservados.</p>

          <nav aria-label="Rodapé" className="flex gap-6">
            <Link to="/privacidade" className={linkClass}>
              Privacidade
            </Link>
            <Link to="/termos" className={linkClass}>
              Termos
            </Link>
            <Link to="/contato" className={linkClass}>
              Contato
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={linkClass}>
              GitHub
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
