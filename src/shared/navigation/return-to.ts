import { useLocation } from "react-router-dom";

/** Router state carried by links that should offer a "Voltar" to where the user came from. */
export interface ReturnToState {
  from: string;
}

/** State to pass on a <Link>/<Button to> so the destination knows the current page. */
export function useReturnToState(): ReturnToState {
  const location = useLocation();
  return { from: `${location.pathname}${location.search}` };
}

export function readReturnTo(state: unknown): string | null {
  if (state && typeof state === "object" && "from" in state) {
    const from = (state as { from: unknown }).from;
    if (typeof from === "string" && from.startsWith("/")) return from;
  }
  return null;
}
