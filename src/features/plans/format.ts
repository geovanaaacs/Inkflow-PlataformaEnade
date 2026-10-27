import type { Plan } from "./data";

export function formatPlanPrice(plan: Plan): string {
  if (plan.price === 0) return "Grátis";
  const price = plan.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `${price}/mês`;
}
