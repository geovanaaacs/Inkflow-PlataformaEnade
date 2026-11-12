import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, CreditCard, Lock, Mail, QrCode } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Modal } from "@/design-system/components/Modal";
import { SegmentedControl, type SegmentedControlOption } from "@/design-system/components/SegmentedControl";
import { useAuth } from "@/features/auth/auth-context";
import { errorMessage } from "@/shared/api/api-error";
import type { Plan } from "../data";
import { formatPlanPrice } from "../format";
import {
  EMPTY_CARD,
  PROCESSING_MS,
  TEST_CARD_NUMBER,
  formatCardNumber,
  formatExpiry,
  paymentPayload,
  maskedCard,
  pixCode,
  validateCard,
  type CardInput,
  type PaymentMethod,
  type PaymentPayload,
} from "../payment";

interface CheckoutModalProps {
  plan: Plan | null;
  onClose: () => void;
  /** Switches the plan in the API (POST /me/subscription) and refreshes the user. */
  onConfirm: (plan: Plan, payment?: PaymentPayload) => Promise<void>;
}

type Step = "form" | "processing" | "success";

const methodOptions: SegmentedControlOption<PaymentMethod>[] = [
  { value: "cartao", label: "Cartão de crédito" },
  { value: "pix", label: "Pix" },
];

/**
 * Simulated checkout: payment form (card or Pix) → processing → welcome
 * message. Moving to the free plan skips the payment. No real charge happens
 * and the card data never leaves this component.
 */
export function CheckoutModal({ plan, onClose, onConfirm }: CheckoutModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<PaymentMethod>("cartao");
  const [card, setCard] = useState<CardInput>(EMPTY_CARD);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string>("");
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const free = plan?.price === 0;

  function reset() {
    window.clearTimeout(timer.current);
    setStep("form");
    setMethod("cartao");
    setCard(EMPTY_CARD);
    setError(null);
  }

  function handleClose() {
    if (step === "processing") return; // wait for the "gateway"
    reset();
    onClose();
  }

  function update<K extends keyof CardInput>(key: K, value: CardInput[K]) {
    setCard((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan) return;
    if (!free && method === "cartao") {
      const problem = validateCard(card);
      if (problem) {
        setError(problem);
        return;
      }
    }
    setError(null);
    setReceipt(free ? "Plano gratuito" : method === "pix" ? "Pix" : `Cartão ${maskedCard(card.number)}`);
    // The card data is not needed anymore: clear it before "processing".
    // Only the method and the last 4 digits go to the API; then the card data is cleared.
    const payment = free ? undefined : paymentPayload(method, card.number);
    setCard(EMPTY_CARD);
    setStep("processing");
    timer.current = window.setTimeout(async () => {
      try {
        await onConfirm(plan, payment);
        setStep("success");
      } catch (confirmError) {
        setError(errorMessage(confirmError, "Não foi possível concluir a assinatura."));
        setStep("form");
      }
    }, free ? 400 : PROCESSING_MS);
  }

  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <Modal
      open={plan !== null}
      onClose={handleClose}
      size="lg"
      title={
        step === "success"
          ? free
            ? "Plano alterado"
            : "Pagamento aprovado!"
          : plan
            ? `${free ? "Mudar para" : "Assinar"} o plano ${plan.name}`
            : "Assinar plano"
      }
      description={
        step === "form" && plan
          ? free
            ? "O plano Básico é gratuito: não há nada a pagar."
            : `Valor: ${formatPlanPrice(plan)}, cobrado mensalmente. Cancele quando quiser.`
          : undefined
      }
    >
      {step === "form" && plan && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          {!free && (
            <>
              <p className="flex items-start gap-2 rounded-input bg-brand-500-a24 px-4 py-3 text-sm text-ink-strong">
                <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-ink" />
                Ambiente de demonstração: nenhuma cobrança é feita e os dados do cartão não são
                enviados nem guardados. Use o cartão de teste {TEST_CARD_NUMBER}.
              </p>
              <SegmentedControl
                aria-label="Forma de pagamento"
                options={methodOptions}
                value={method}
                onChange={(next) => {
                  setMethod(next);
                  setError(null);
                }}
              />
              {method === "cartao" ? (
                <div className="flex flex-col gap-4">
                  <Input
                    label="Nome impresso no cartão"
                    autoComplete="off"
                    value={card.holder}
                    onChange={(event) => update("holder", event.target.value)}
                  />
                  <Input
                    label="Número do cartão"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={TEST_CARD_NUMBER}
                    icon={<CreditCard className="size-4" aria-hidden="true" />}
                    value={card.number}
                    onChange={(event) => update("number", formatCardNumber(event.target.value))}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Validade"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="MM/AA"
                      value={card.expiry}
                      onChange={(event) => update("expiry", formatExpiry(event.target.value))}
                    />
                    <Input
                      label="CVV"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="123"
                      maxLength={4}
                      value={card.cvv}
                      onChange={(event) => update("cvv", event.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-card border -overlay/5 p-5 text-center">
                  <QrCode aria-hidden="true" className="size-24 text-brand-ink" />
                  <p className="text-sm text-ink-strong">
                    Escaneie o QR Code no app do seu banco ou use o código copia e cola:
                  </p>
                  <code className="w-full break-all rounded-input -overlay/[0.04] px-3 py-2 text-xs text-ink-muted">
                    {pixCode(plan.id, plan.price)}
                  </code>
                  <p className="text-xs text-ink-muted">
                    Código de demonstração: nenhum pagamento real é feito.
                  </p>
                </div>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger-ink">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" fullWidth>
              {free ? "Confirmar mudança" : method === "pix" ? "Já fiz o Pix" : `Pagar ${formatPlanPrice(plan)}`}
            </Button>
          </div>
        </form>
      )}

      {step === "processing" && (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-8 text-center">
          <span
            aria-hidden="true"
            className="size-10 animate-spin rounded-full border-4 border-brand-500-a24 border-t-brand-600"
          />
          <p className="text-sm text-ink-strong">
            {free ? "Alterando o seu plano…" : "Processando o pagamento…"}
          </p>
        </div>
      )}

      {step === "success" && plan && (
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 aria-hidden="true" className="size-14 text-success-ink" />
          <p className="text-lg font-semibold text-ink-strong">
            {free
              ? `Pronto, ${firstName}! Agora você está no plano ${plan.name}.`
              : `Bem-vindo(a) ao plano ${plan.name}, ${firstName}!`}
          </p>
          <p className="text-sm text-ink-muted">
            {free
              ? "Obrigado por continuar estudando com o Inkflow."
              : "Obrigado por assinar o Inkflow. Todos os recursos do seu novo plano já estão liberados."}
          </p>
          <p className="flex items-center gap-2 rounded-input bg-success/10 px-4 py-3 text-sm text-ink-strong">
            <Mail aria-hidden="true" className="size-4 shrink-0 text-success-ink" />
            Enviamos um e-mail de confirmação para {user?.email}
            {free ? "." : ` com o comprovante (${receipt}).`}
          </p>
          <Button fullWidth onClick={handleClose}>
            Começar a usar
          </Button>
        </div>
      )}
    </Modal>
  );
}
