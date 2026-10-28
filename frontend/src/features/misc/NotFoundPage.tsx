import { Button } from "@/design-system/components/Button";
import { Container } from "@/design-system/components/Container";

export function NotFoundPage() {
  return (
    <Container
      as="div"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center"
    >
      <p className="text-sm font-semibold text-brand-800">Erro 404</p>
      <h1 className="text-3xl font-bold text-ink-strong">Página não encontrada</h1>
      <p className="max-w-md text-base text-ink-muted">
        O endereço que você tentou acessar não existe ou foi movido.
      </p>
      <Button to="/">Voltar para a página inicial</Button>
    </Container>
  );
}

export default NotFoundPage;
