import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LoadState, PlanBanner } from "../../components/feedback";
import { Button, Screen, TextField, Title } from "../../components/ui";
import { plural } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import { colors, spacing } from "../../theme";
import { useAuth } from "../auth/AuthProvider";
import { getQuestionByCode, getQuestionFilterOptions, listQuestions, type QuestionFilters } from "./api";
import { ChipRow, QuestionCard, QuestionList } from "./components";
import { usePractice } from "./practice";

/*
 * Practice screens shared by students and teachers (both answer questions;
 * teachers have no daily limit and always have notes). Each profile's route
 * files re-export them, so the question opens inside that profile's stack.
 */

/** Plan banner — students only (teachers have no plan). */
function Banner() {
  const { user } = useAuth();
  const { usage } = usePractice();
  if (!user?.plan || !usage) return null;
  return <PlanBanner planId={user.plan} usage={usage} />;
}

/** Question bank with keyword search and area/year filters (tab "Questões"). */
export function QuestionsScreen() {
  const [draftKeyword, setDraftKeyword] = useState("");
  const [filters, setFilters] = useState<QuestionFilters>({});

  const options = useAsync(getQuestionFilterOptions, []);
  const questions = useAsync(() => listQuestions(filters), [filters.keyword, filters.area, filters.year]);

  const hasFilters = Boolean(filters.keyword || filters.area || filters.year);

  function clear() {
    setDraftKeyword("");
    setFilters({});
  }

  return (
    <Screen edges={["top", "left", "right"]} onRefresh={questions.refresh} refreshing={questions.refreshing}>
      <Title>Questões</Title>
      <Banner />

      <TextField
        label="Buscar"
        value={draftKeyword}
        onChangeText={setDraftKeyword}
        placeholder="Palavra-chave, código ou tópico"
        returnKeyType="search"
        autoCapitalize="none"
        onSubmitEditing={() => setFilters((current) => ({ ...current, keyword: draftKeyword }))}
      />
      {options.data && (
        <>
          <ChipRow
            label="Área de TI"
            options={options.data.areas.map((area) => ({ value: area.slug, label: area.name }))}
            value={filters.area}
            onChange={(area) => setFilters((current) => ({ ...current, area }))}
          />
          <ChipRow
            label="Ano"
            options={options.data.years.map((year) => ({ value: year, label: String(year) }))}
            value={filters.year}
            onChange={(year) => setFilters((current) => ({ ...current, year }))}
          />
        </>
      )}
      {hasFilters && <Button label="Limpar filtros" variant="secondary" onPress={clear} />}

      <LoadState
        loading={questions.loading}
        error={questions.data ? null : questions.error}
        onRetry={questions.reload}
        fallback="Não foi possível carregar as questões."
      />
      {questions.data && (
        <View style={styles.results}>
          <Text style={styles.count}>{plural(questions.data.length, "questão encontrada", "questões encontradas")}</Text>
          <QuestionList questions={questions.data} emptyMessage="Nenhuma questão encontrada para os filtros selecionados." />
        </View>
      )}
    </Screen>
  );
}

/** One question, by code — opened from the lists, "Revisar", notes and results. */
export function QuestionScreen() {
  const { code = "" } = useLocalSearchParams<{ code: string }>();
  const question = useAsync(() => getQuestionByCode(code), [code]);

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: code }} />
      <Banner />
      <LoadState loading={question.loading} error={question.error} onRetry={question.reload} fallback="Não foi possível carregar a questão." />
      {question.data && <QuestionCard key={question.data.id} question={question.data} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  results: { gap: spacing(3) },
  count: { fontSize: 13, color: colors.muted },
});
