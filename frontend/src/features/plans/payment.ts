/*
 * Simulated checkout (no payment gateway yet). The card data only lives in
 * the form state: it is validated here and never sent to the API, logged or
 * stored. Once "approved", the screen calls the same POST /me/subscription
 * as before. Mirrored in mobile/src/features/plans/payment.ts.
 */

export type PaymentMethod = "cartao" | "pix";

/** What the API receives and records (dbo.Payments): never the full card number. */
export type PaymentPayload = { method: "cartao"; cardLast4: string } | { method: "pix" };

export function paymentPayload(method: PaymentMethod, cardNumber: string): PaymentPayload {
  return method === "pix" ? { method } : { method, cardLast4: cardNumber.replace(/\D/g, "").slice(-4) };
}

export interface CardInput {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
}

export const EMPTY_CARD: CardInput = { holder: "", number: "", expiry: "", cvv: "" };

/** Test card shown on screen (passes the Luhn check). */
export const TEST_CARD_NUMBER = "4242 4242 4242 4242";

/** Time the fake gateway "takes" to approve, so the user sees the processing step. */
export const PROCESSING_MS = 1500;

/** "4242424242424242" → "4242 4242 4242 4242" (up to 19 digits). */
export function formatCardNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** "1228" → "12/28". */
export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

/** Luhn checksum — the check digit every real card number has. */
function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let index = 0; index < digits.length; index++) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** First problem found in the card form, or null when it looks valid. */
export function validateCard(card: CardInput, today = new Date()): string | null {
  if (card.holder.trim().length < 3) return "Informe o nome impresso no cartão.";
  const digits = card.number.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19 || !passesLuhn(digits)) return "Número de cartão inválido.";
  const match = /^(\d{2})\/(\d{2})$/.exec(card.expiry);
  const month = match ? Number(match[1]) : 0;
  if (!match || month < 1 || month > 12) return "Informe a validade no formato MM/AA.";
  // Valid through the last day of the expiry month.
  const expiresAt = new Date(2000 + Number(match[2]), month, 1);
  if (expiresAt <= today) return "Este cartão está vencido.";
  if (!/^\d{3,4}$/.test(card.cvv)) return "O CVV tem 3 ou 4 dígitos.";
  return null;
}

/** Fake Pix "copia e cola" code for the plan (display only). */
export function pixCode(planId: string, price: number): string {
  return `00020126580014BR.GOV.BCB.PIX0136inkflow-demo-${planId}5204000053039865406${price.toFixed(2)}5802BR5907INKFLOW6009SAO PAULO6304DEMO`;
}

/** Last 4 digits for the receipt ("•••• 4242"). */
export function maskedCard(number: string): string {
  return `•••• ${number.replace(/\D/g, "").slice(-4)}`;
}
