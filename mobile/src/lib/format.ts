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

/** "14:30". */
export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "Quinta-feira, 25 de setembro". */
export function formatLongDate(iso: string): string {
  const date = new Date(iso);
  const text = `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "19:00 – 20:30". */
export function formatTimeRange(startsAt: string, durationMinutes: number): string {
  const start = new Date(startsAt);
  return `${formatTime(start)} – ${formatTime(new Date(start.getTime() + durationMinutes * 60_000))}`;
}

/** Local calendar day "2026-09-25", for grouping. */
export function dayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Countdown "05:09" or "1:05:09". */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mmss = `${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}

/** Elapsed time "12 min 30 s". */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
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
