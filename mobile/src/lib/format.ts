import { ApiError } from "./http";

/** "Hoje", "Ontem", "3 dias atrás" or the date. */
export function formatRelativeDay(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays <= 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return formatDate(target);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** "23/09/2026" (built by hand: Intl in Hermes may lack the pt-BR locale data). */
export function formatDate(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** "23/09/2026 às 14:30". */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${formatDate(date)} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "R$ 29,90/mês" or "Grátis". */
export function formatPrice(price: number): string {
  if (price === 0) return "Grátis";
  const [whole, cents] = price.toFixed(2).split(".");
  const withThousands = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${withThousands},${cents}/mês`;
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Message for any caught error: the API's own message when there is one. */
export function errorMessage(error: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (error instanceof ApiError || error instanceof Error) return error.message || fallback;
  return fallback;
}
