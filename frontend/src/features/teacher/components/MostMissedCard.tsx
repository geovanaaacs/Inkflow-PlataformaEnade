import { Card } from "@/design-system/components/Card";
import { ProgressBar } from "@/design-system/components/ProgressBar";
import type { MissedQuestion } from "../api";

interface MostMissedCardProps {
  questions: MissedQuestion[];
}

/** Questions with the highest error rate among students (first attempts). */
export function MostMissedCard({ questions }: MostMissedCardProps) {
  return (
    <Card as="section" aria-labelledby="most-missed-heading">
      <h2 id="most-missed-heading" className="text-lg font-semibold text-ink-strong">
        Questões com mais erros
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Considera a primeira tentativa de cada aluno — bons temas para a próxima mentoria.
      </p>

      {questions.length === 0 ? (
        <p className="mt-5 text-sm text-ink-muted">Nenhum erro registrado até agora.</p>
      ) : (
        <ol className="mt-5 flex flex-col gap-4">
          {questions.map((question) => (
            <li key={question.questionCode} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-ink-strong">
                  <span className="text-brand-800">[{question.questionCode}]</span> {question.topic}
                  <span className="font-normal text-ink-muted"> · {question.areaName}</span>
                </p>
                <p className="text-sm font-semibold text-danger">{question.errorRate}% de erro</p>
              </div>
              <ProgressBar
                value={question.errorRate}
                tone="danger"
                label={`${question.questionCode}: ${question.errorRate}% de erro`}
              />
              <p className="text-xs text-ink-muted">
                {question.answers} {question.answers === 1 ? "resposta" : "respostas"}
                {question.commonMistake &&
                  ` · erro mais comum: alternativa ${question.commonMistake.optionId.toUpperCase()} (${question.commonMistake.percent}%)`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
