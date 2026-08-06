import { Button } from "@/design-system/components/Button";
import { Card } from "@/design-system/components/Card";
import { ProgressBar } from "@/design-system/components/ProgressBar";
import { toneForPercent } from "@/design-system/utils/progress-tone";
import type { SuggestedTopic } from "../data";

interface SuggestedQuestionsGridProps {
  topics: SuggestedTopic[];
}

export function SuggestedQuestionsGrid({ topics }: SuggestedQuestionsGridProps) {
  return (
    <Card as="section" aria-labelledby="suggested-topics-heading">
      <h2 id="suggested-topics-heading" className="text-lg font-semibold text-ink-strong">
        Questões Sugeridas por Área/Graduação
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Baseado no seu curso e histórico de desempenho
      </p>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <li key={topic.id}>
            <Card bare className="flex h-full flex-col gap-3 border border-black/5 p-5">
              <h3 className="text-base font-semibold text-ink-strong">{topic.title}</h3>
              <p className="text-sm text-ink-muted">
                Nível {topic.level} · {topic.totalQuestions} questões disponíveis
              </p>
              <ProgressBar
                value={topic.percent}
                tone={toneForPercent(topic.percent)}
                label={`${topic.title}: ${topic.percent}% de acerto`}
              />
              <p className="text-sm font-medium text-ink-strong">
                {topic.percent}% de acerto · {topic.message}
              </p>
              <Button to={`/questoes?area=${topic.id}`} fullWidth size="sm" className="mt-auto">
                Praticar agora
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </Card>
  );
}
