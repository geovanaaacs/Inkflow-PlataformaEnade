import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LoadState, PlanBanner } from "../../../../components/feedback";
import { Button, Screen, TextField, Title } from "../../../../components/ui";
import { useAuth } from "../../../../features/auth/AuthProvider";
import { getQuestionFilterOptions, listQuestions, type QuestionFilters } from "../../../../features/questions/api";
import { ChipRow, QuestionList } from "../../../../features/questions/components";
import { usePractice } from "../../../../features/questions/practice";
import { plural } from "../../../../lib/format";
import { useAsync } from "../../../../lib/useAsync";
import { colors, spacing } from "../../../../theme";

export default function QuestionsScreen() {
  const { user } = useAuth();
  const { usage } = usePractice();
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
      {user?.plan && usage && <PlanBanner planId={user.plan} usage={usage} />}

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

const styles = StyleSheet.create({
  results: { gap: spacing(3) },
  count: { fontSize: 13, color: colors.muted },
});
