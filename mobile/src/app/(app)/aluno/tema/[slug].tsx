import { Stack, useLocalSearchParams } from "expo-router";
import { LoadState, PlanBanner } from "../../../../components/feedback";
import { Screen, Subtitle, Title } from "../../../../components/ui";
import { useAuth } from "../../../../features/auth/AuthProvider";
import { listQuestionsByArea } from "../../../../features/questions/api";
import { QuestionList } from "../../../../features/questions/components";
import { usePractice } from "../../../../features/questions/practice";
import { plural } from "../../../../lib/format";
import { useAsync } from "../../../../lib/useAsync";

/** Questions of one area — opened from "Praticar agora" on the dashboard. */
export default function TopicScreen() {
  const { slug = "" } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const { usage } = usePractice();
  const topic = useAsync(() => listQuestionsByArea(slug), [slug]);

  return (
    <Screen edges={["left", "right", "bottom"]} onRefresh={topic.refresh} refreshing={topic.refreshing}>
      <Stack.Screen options={{ title: topic.data?.area.shortName ?? "Praticar por tema" }} />
      {user?.plan && usage && <PlanBanner planId={user.plan} usage={usage} />}
      <LoadState
        loading={topic.loading}
        error={topic.data ? null : topic.error}
        onRetry={topic.reload}
        fallback="Não foi possível carregar as questões deste tema."
      />
      {topic.data && (
        <>
          <Title>{topic.data.area.name}</Title>
          <Subtitle>
            {plural(topic.data.questions.length, "questão disponível", "questões disponíveis")} neste tema
          </Subtitle>
          <QuestionList questions={topic.data.questions} emptyMessage="Ainda não há questões cadastradas para este tema." />
        </>
      )}
    </Screen>
  );
}
