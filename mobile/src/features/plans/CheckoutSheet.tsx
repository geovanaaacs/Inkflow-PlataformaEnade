import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { Button, Card, ErrorMessage, Screen, Segmented, Subtitle, TextField, Title } from "../../components/ui";
import { errorMessage, formatPrice } from "../../lib/format";
import { colors, radius, spacing } from "../../theme";
import { useAuth } from "../auth/AuthProvider";
import type { Plan } from "./api";
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
} from "./payment";

type Step = "form" | "processing" | "success";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cartao", label: "Cartão" },
  { value: "pix", label: "Pix" },
];

interface CheckoutSheetProps {
  plan: Plan | null;
  onClose: () => void;
  /** Switches the plan in the API (POST /me/subscription) and refreshes the user. */
  onConfirm: (plan: Plan, payment?: PaymentPayload) => Promise<void>;
}

/**
 * Simulated checkout — same flow as the web CheckoutModal: payment form (card
 * or Pix) → processing → welcome message. The free plan skips the payment.
 * No real charge happens and the card data never leaves this component.
 */
export function CheckoutSheet({ plan, onClose, onConfirm }: CheckoutSheetProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<PaymentMethod>("cartao");
  const [card, setCard] = useState<CardInput>(EMPTY_CARD);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const free = plan?.price === 0;
  const firstName = user?.name.split(" ")[0] ?? "";

  function close() {
    if (step === "processing") return; // wait for the "gateway"
    clearTimeout(timer.current);
    setStep("form");
    setMethod("cartao");
    setCard(EMPTY_CARD);
    setError(null);
    onClose();
  }

  function update<K extends keyof CardInput>(key: K, value: CardInput[K]) {
    setCard((current) => ({ ...current, [key]: value }));
  }

  function pay() {
    if (!plan) return;
    if (!free && method === "cartao") {
      const problem = validateCard(card);
      if (problem) {
        setError(problem);
        return;
      }
    }
    setError(null);
    setReceipt(free ? "plano gratuito" : method === "pix" ? "Pix" : `cartão ${maskedCard(card.number)}`);
    // Only the method and the last 4 digits go to the API; then the card data is cleared.
    const payment = free ? undefined : paymentPayload(method, card.number);
    setCard(EMPTY_CARD);
    setStep("processing");
    timer.current = setTimeout(async () => {
      try {
        await onConfirm(plan, payment);
        setStep("success");
      } catch (caught) {
        setError(errorMessage(caught, "Não foi possível concluir a assinatura."));
        setStep("form");
      }
    }, free ? 400 : PROCESSING_MS);
  }

  return (
    <Modal visible={plan !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      {plan && (
        <Screen>
          {step === "form" && (
            <>
              <Title>{free ? `Mudar para o ${plan.name}` : `Assinar o plano ${plan.name}`}</Title>
              <Subtitle>
                {free ? "O plano Básico é gratuito: não há nada a pagar." : `Valor: ${formatPrice(plan.price)}, cobrado mensalmente. Cancele quando quiser.`}
              </Subtitle>
              {!free && (
                <>
                  <View style={styles.demo}>
                    <Ionicons name="lock-closed" size={16} color={colors.brand800} />
                    <Text style={styles.demoText}>
                      Ambiente de demonstração: nenhuma cobrança é feita e os dados do cartão não são enviados nem guardados. Use o
                      cartão de teste {TEST_CARD_NUMBER}.
                    </Text>
                  </View>
                  <Segmented
                    options={METHODS}
                    value={method}
                    onChange={(next) => {
                      setMethod(next);
                      setError(null);
                    }}
                  />
                  {method === "cartao" ? (
                    <Card>
                      <TextField label="Nome impresso no cartão" value={card.holder} onChangeText={(value) => update("holder", value)} autoCapitalize="characters" autoCorrect={false} />
                      <TextField
                        label="Número do cartão"
                        value={card.number}
                        onChangeText={(value) => update("number", formatCardNumber(value))}
                        placeholder={TEST_CARD_NUMBER}
                        keyboardType="number-pad"
                        autoComplete="off"
                      />
                      <View style={styles.row}>
                        <View style={styles.flex}>
                          <TextField label="Validade" value={card.expiry} onChangeText={(value) => update("expiry", formatExpiry(value))} placeholder="MM/AA" keyboardType="number-pad" maxLength={5} />
                        </View>
                        <View style={styles.flex}>
                          <TextField
                            label="CVV"
                            value={card.cvv}
                            onChangeText={(value) => update("cvv", value.replace(/\D/g, ""))}
                            placeholder="123"
                            keyboardType="number-pad"
                            maxLength={4}
                            secureTextEntry
                          />
                        </View>
                      </View>
                    </Card>
                  ) : (
                    <Card>
                      <View style={styles.center}>
                        <Ionicons name="qr-code-outline" size={96} color={colors.brand800} />
                      </View>
                      <Text style={styles.body}>Abra o app do seu banco e use o código copia e cola:</Text>
                      <Text style={styles.code} selectable>
                        {pixCode(plan.id, plan.price)}
                      </Text>
                      <Text style={styles.muted}>Código de demonstração: nenhum pagamento real é feito.</Text>
                    </Card>
                  )}
                </>
              )}
              <ErrorMessage message={error} />
              <Button label={free ? "Confirmar mudança" : method === "pix" ? "Já fiz o Pix" : `Pagar ${formatPrice(plan.price)}`} onPress={pay} />
              <Button label="Cancelar" variant="secondary" onPress={close} />
            </>
          )}

          {step === "processing" && (
            <View style={styles.processing} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" color={colors.brand600} />
              <Text style={styles.body}>{free ? "Alterando o seu plano…" : "Processando o pagamento…"}</Text>
            </View>
          )}

          {step === "success" && (
            <View style={styles.success} accessibilityLiveRegion="polite">
              <Ionicons name="checkmark-circle" size={72} color={colors.success} />
              <Title>{free ? "Plano alterado" : "Pagamento aprovado!"}</Title>
              <Text style={styles.welcome}>
                {free ? `Pronto, ${firstName}! Agora você está no plano ${plan.name}.` : `Bem-vindo(a) ao plano ${plan.name}, ${firstName}!`}
              </Text>
              <Text style={styles.muted}>
                {free
                  ? "Obrigado por continuar estudando com o Inkflow."
                  : "Obrigado por assinar o Inkflow. Todos os recursos do seu novo plano já estão liberados."}
              </Text>
              <View style={styles.email}>
                <Ionicons name="mail-outline" size={18} color={colors.success} />
                <Text style={[styles.body, styles.flex]}>
                  Enviamos um e-mail de confirmação para {user?.email}
                  {free ? "." : ` com o comprovante (${receipt}).`}
                </Text>
              </View>
              <View style={styles.full}>
                <Button label="Começar a usar" onPress={close} />
              </View>
            </View>
          )}
        </Screen>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  full: { alignSelf: "stretch" },
  row: { flexDirection: "row", gap: spacing(3) },
  center: { alignItems: "center" },
  body: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20, textAlign: "center" },
  code: { fontSize: 12, color: colors.muted, backgroundColor: colors.background, borderRadius: radius.input, padding: spacing(3) },
  demo: { flexDirection: "row", gap: spacing(2), backgroundColor: colors.brandSoft, borderRadius: radius.input, padding: spacing(3) },
  demoText: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 19 },
  processing: { alignItems: "center", gap: spacing(4), paddingVertical: spacing(16) },
  success: { alignItems: "center", gap: spacing(3), paddingTop: spacing(8) },
  welcome: { fontSize: 18, fontWeight: "700", color: colors.ink, textAlign: "center" },
  email: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    backgroundColor: `${colors.success}1a`,
    borderRadius: radius.input,
    padding: spacing(3),
    alignSelf: "stretch",
  },
});
