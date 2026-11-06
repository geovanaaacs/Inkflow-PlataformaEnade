import type { ReactNode } from "react";
import { Container } from "@/design-system/components/Container";
import { Footer } from "@/features/landing/sections/Footer";
import { BackButton } from "@/shared/components/BackButton";

export interface InstitutionalSection {
  title: string;
  body: ReactNode;
}

interface InstitutionalPageProps {
  title: string;
  intro: string;
  /** "Atualizado em ..." line under the title. */
  updatedAt?: string;
  sections: InstitutionalSection[];
}

/** Layout of the pages linked from the footer (Privacidade, Termos, Contato). */
export function InstitutionalPage({ title, intro, updatedAt, sections }: InstitutionalPageProps) {
  return (
    <>
      <Container as="article" className="py-12">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          <BackButton fallback="/" label="Voltar" />
          <header>
            <h1 className="text-3xl font-bold text-ink-strong">{title}</h1>
            {updatedAt && <p className="mt-2 text-sm text-ink-muted">Atualizado em {updatedAt}</p>}
            <p className="mt-4 text-base text-ink-strong">{intro}</p>
          </header>
          {sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold text-ink-strong">{section.title}</h2>
              <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink-strong">{section.body}</div>
            </section>
          ))}
        </div>
      </Container>
      <Footer />
    </>
  );
}
