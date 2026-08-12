import { Sparkles } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Container } from "@/design-system/components/Container";

export function ClosingCta() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-900 py-20">
      <div
        aria-hidden="true"
        className="absolute -left-16 -top-16 size-72 rounded-full bg-white/10"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 right-10 size-80 rounded-full bg-white/10"
      />
      <div
        aria-hidden="true"
        className="absolute right-0 top-1/3 size-40 rounded-full bg-white/10"
      />
      <Container className="relative flex flex-col items-center text-center">
        <Sparkles aria-hidden="true" className="size-10 text-white" />
        <h2 className="mt-4 max-w-xl text-2xl font-bold text-white sm:text-3xl">
          Sua jornada até o ENADE começa com um clique
        </h2>
        <p className="mt-3 max-w-md text-sm text-white/85 sm:text-base">
          Crie sua conta gratuita agora e comece a praticar hoje mesmo
        </p>
        <Button
          to="/entrar?modo=cadastro"
          variant="outline"
          size="md"
          className="mt-6 border-white bg-white text-brand-800 hover:bg-white/90"
        >
          Cadastre-se agora
        </Button>
      </Container>
    </section>
  );
}
