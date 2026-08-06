import { Github, Mail, MapPin } from "lucide-react";
import { Container } from "@/design-system/components/Container";

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
              <li className="flex items-center gap-2">
                <Mail className="size-4" />
                contato@inkflow.com
              </li>

              <li className="flex items-center gap-2">
                <MapPin className="size-4" />
                São José dos Campos - SP
              </li>

              <li className="flex items-center gap-2">
                <Github className="size-4" />
                github.com/inkflow
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center justify-between gap-4 border-t border-neutral-700 pt-4 text-sm text-neutral-500 md:flex-row">
          <p>© 2026 Inkflow. Todos os direitos reservados.</p>

          <div className="flex gap-6">
            <a href="#">Privacidade</a>
            <a href="#">Termos</a>
            <a href="#">GitHub</a>
          </div>
        </div>
      </Container>
    </footer>
  );
}