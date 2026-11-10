import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge, LoadState } from "../../components/feedback";
import { Button, Card, Screen, Subtitle, Title } from "../../components/ui";
import { formatPrice } from "../../lib/format";
import { PLAN_RANK } from "../../lib/plan-access";
import { useAsync } from "../../lib/useAsync";
import { colors, radius, spacing } from "../../theme";
import { useAuth } from "../auth/AuthProvider";
import { useOptionalPractice } from "../questions/practice";
import { listPlans, subscribeToPlan, type Plan } from "./api";
import { CheckoutSheet } from "./CheckoutSheet";
import type { PaymentPayload } from "./payment";

/**
 * Plans, for every profile (each one opens it from its own stack). Students
 * subscribe through the simulated checkout; teachers and admins see the
 * offer — plans are for students only, like on the web.
 */
export function PlansScreen() {
  const { user, refreshUser } = useAuth();
  const practice = useOptionalPractice();
  const plans = useAsync(listPlans, []);
  const [checkout, setCheckout] = useState<Plan | null>(null);
  const isStudent = user?.role === "aluno";

  async function confirm(plan: Plan, payment?: PaymentPayload) {
    await subscribeToPlan(plan.id, payment);
    await refreshUser();
    // New limit and features (notes) for the practice screens.
    practice?.reload();
  }

  return (
    <Screen edges={["left", "right", "bottom"]} onRefresh={plans.refresh} refreshing={plans.refreshing}>
      <Title>Conheça os planos</Title>
      <Subtitle>Pratique no seu ritmo ou desafie-se com pressão real de tempo.</Subtitle>
      {!isStudent && (
        <Card>
          <Text style={styles.note}>Os planos são para alunos. Professores e administradores têm acesso pelo próprio perfil.</Text>
        </Card>
      )}
      <LoadState loading={plans.loading} error={plans.data ? null : plans.error} onRetry={plans.reload} fallback="Não foi possível carregar os planos." />
      {plans.data?.map((plan) => {
        const current = isStudent && user?.plan === plan.id;
        const upgrade = isStudent && user?.plan ? PLAN_RANK[plan.id] > PLAN_RANK[user.plan] : false;
        return (
          <View key={plan.id} style={[styles.planWrap, plan.highlighted && styles.highlighted]}>
            <Card>
              <View style={styles.header}>
                <Text style={styles.name}>{plan.name}</Text>
                {plan.highlighted && <Badge>Mais escolhido</Badge>}
                {current && <Badge tone="success">Seu plano</Badge>}
              </View>
              <Text style={styles.price}>{formatPrice(plan.price)}</Text>
              <Text style={styles.description}>{plan.description}</Text>
              {plan.items.map((item) => (
                <Text key={item} style={styles.item}>
                  ✓ {item}
                </Text>
              ))}
              {isStudent && (
                <Button
                  label={current ? "Plano atual" : upgrade ? `Assinar ${plan.name}` : `Mudar para ${plan.name}`}
                  variant={upgrade ? "primary" : "secondary"}
                  disabled={current}
                  onPress={() => setCheckout(plan)}
                />
              )}
            </Card>
          </View>
        );
      })}
      <CheckoutSheet plan={checkout} onClose={() => setCheckout(null)} onConfirm={confirm} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  planWrap: { borderRadius: radius.card + 2 },
  highlighted: { borderWidth: 2, borderColor: colors.brand600 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing(2), flexWrap: "wrap" },
  name: { fontSize: 20, fontWeight: "700", color: colors.ink },
  price: { fontSize: 24, fontWeight: "800", color: colors.brand800 },
  description: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  item: { fontSize: 14, color: colors.ink, lineHeight: 20 },
});
