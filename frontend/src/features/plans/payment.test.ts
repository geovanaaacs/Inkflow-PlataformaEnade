import { describe, expect, it } from "vitest";
import { paymentPayload, TEST_CARD_NUMBER, validateCard } from "./payment";

const TODAY = new Date(2026, 10, 11); // 11/11/2026
const validCard = { holder: "Maria Silva", number: TEST_CARD_NUMBER, expiry: "12/28", cvv: "123" };

describe("checkout simulado", () => {
  it("aceita o cartão de teste e recusa um número que não passa no Luhn", () => {
    expect(validateCard(validCard, TODAY)).toBeNull();
    expect(validateCard({ ...validCard, number: "4242 4242 4242 4241" }, TODAY)).toBe("Número de cartão inválido.");
  });

  it("recusa cartão vencido, mas aceita até o último dia do mês da validade", () => {
    expect(validateCard({ ...validCard, expiry: "10/26" }, TODAY)).toBe("Este cartão está vencido.");
    expect(validateCard({ ...validCard, expiry: "11/26" }, TODAY)).toBeNull();
  });

  it("envia para a API só os 4 últimos dígitos do cartão e nada do Pix", () => {
    expect(paymentPayload("cartao", "4111 1111 1111 1")).toEqual({ method: "cartao", cardLast4: "1111" });
    expect(paymentPayload("cartao", TEST_CARD_NUMBER)).toEqual({ method: "cartao", cardLast4: "4242" });
    expect(paymentPayload("pix", TEST_CARD_NUMBER)).toEqual({ method: "pix" });
  });
});
