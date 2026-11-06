import { Stack, useLocalSearchParams } from "expo-router";
import { LoadState, PlanBanner } from "../../../../components/feedback";
import { Screen } from "../../../../components/ui";
import { useAuth } from "../../../../features/auth/AuthProvider";
import { getQuestionByCode } from "../../../../features/questions/api";
import { QuestionCard } from "../../../../features/questions/components";
import { usePractice } from "../../../../features/questions/practice";
import { useAsync } from "../../../../lib/useAsync";

/** One question, by code — opened from the lists, "Revisar" and "Minhas anotações". */
export default function QuestionScreen() {
  const { code = "" } = useLocalSearchParams<{ code: string }>();
  const { user } = useAuth();
  const { usage } = usePractice();
  const question = useAsync(() => getQuestionByCode(code), [code]);

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: code }} />
      {user?.plan && usage && <PlanBanner planId={user.plan} usage={usage} />}
      <LoadState
        loading={question.loading}
        error={question.error}
        onRetry={question.reload}
        fallback="Não foi possível carregar a questão."
      />
      {question.data && <QuestionCard key={question.data.id} question={question.data} />}
    </Screen>
  );
}
