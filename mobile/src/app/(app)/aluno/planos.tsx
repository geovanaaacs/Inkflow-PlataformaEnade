import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Badge, LoadState } from "../../../components/feedback";
import { Button, Card, Screen, Subtitle, Title } from "../../../components/ui";
import { useAuth } from "../../../features/auth/AuthProvider";
import { listPlans, subscribeToPlan, type Plan } from "../../../features/plans/api";
import { usePractice } from "../../../features/questions/practice";
import { errorMessage, formatPrice } from "../../../lib/format";
import { PLAN_RANK } from "../../../lib/plan-access";
import { useAsync } from "../../../lib/useAsync";
import { colors, radius, spacing } from "../../../theme";

export default function PlansScreen() {
  const { user, refreshUser } = useAuth();
  const practice = usePractice();
  const plans = useAsync(listPlans, []);
  const [changing, setChanging] = useState<Plan["id"] | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function change(plan: Plan) {
    setChanging(plan.id);
    setSuccess(null);
    try {
      await subscribeToPlan(plan.id);
      await refreshUser();
      practice.reload();
      setSuccess(`Pronto! Agora você está no plano ${plan.name}.`);
    } catch (caught) {
      Alert.alert("Não foi possível mudar de plano", errorMessage(caught));
    } finally {
      setChanging(null);
    }
  }

  /** Simulated change (no payment): asks before switching, like the web modal. */
  function confirm(plan: Plan) {
    Alert.alert(
      `Mudar para o plano ${plan.name}`,
      `Valor: ${formatPrice(plan.price)}. Esta é uma simulação — nenhuma cobrança será feita.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => void change(plan) },
      ]
    );
  }

  return (
    <Screen edges={["left", "right", "bottom"]} onRefresh={plans.refresh} refreshing={plans.refreshing}>
      <Title>Conheça os planos</Title>
      <Subtitle>Pratique no seu ritmo ou desafie-se com pressão real de tempo.</Subtitle>
      {success && <Text style={styles.success}>{success}</Text>}
      <LoadState loading={plans.loading} error={plans.data ? null : plans.error} onRetry={plans.reload} fallback="Não foi possível carregar os planos." />
      {plans.data?.map((plan) => {
        const current = user?.plan === plan.id;
        const upgrade = user?.plan ? PLAN_RANK[plan.id] > PLAN_RANK[user.plan] : false;
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
              <Button
                label={current ? "Plano atual" : upgrade ? `Assinar ${plan.name}` : `Mudar para ${plan.name}`}
                variant={upgrade ? "primary" : "secondary"}
                disabled={current || changing !== null}
                loading={changing === plan.id}
                onPress={() => confirm(plan)}
              />
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: { color: colors.success, fontSize: 15, fontWeight: "700" },
  planWrap: { borderRadius: radius.card + 2 },
  highlighted: { borderWidth: 2, borderColor: colors.brand600 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing(2), flexWrap: "wrap" },
  name: { fontSize: 20, fontWeight: "700", color: colors.ink },
  price: { fontSize: 24, fontWeight: "800", color: colors.brand800 },
  description: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  item: { fontSize: 14, color: colors.ink, lineHeight: 20 },
});
