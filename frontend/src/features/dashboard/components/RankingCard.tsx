import { useState } from "react";
import { Crown, Info, Trophy } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { Card } from "@/design-system/components/Card";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/design-system/components/SegmentedControl";
import { Spinner } from "@/design-system/components/Spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/design-system/components/Tooltip";
import { cn } from "@/design-system/utils/cn";
import { errorMessage } from "@/shared/api/api-error";
import { LockedFeature } from "@/shared/components/LockedFeature";
import { useAsync } from "@/shared/hooks/useAsync";
import { hasFeature, type PlanId } from "@/shared/plans/plan-access";
import { getRanking, type RankingEntry, type RankingScope } from "../api";
import { MOCK_EXAM_POINTS_PER_CORRECT, PRACTICE_POINTS } from "../data";

const scopeOptions: SegmentedControlOption<RankingScope>[] = [
  { value: "geral", label: "Geral · tempo real" },
  { value: "simulados", label: "Simulados" },
];

/** Rule of each ranking, shown on screen (summary) and in the "Como funciona" tooltip (details). */
const RULES: Record<RankingScope, { title: string; summary: string; details: string }> = {
  geral: {
    title: "Ranking Geral",
    summary: `Questões da aba Questões: acerto vale ${PRACTICE_POINTS.correct} pts e erro vale ${PRACTICE_POINTS.wrong} pts.`,
    details: `Cada questão que você responde na aba Questões soma pontos — acertar vale mais (${PRACTICE_POINTS.correct} pts) do que errar (${PRACTICE_POINTS.wrong} pts). Conta só a 1ª tentativa de cada questão, então refazer não soma de novo. Simulados ficam no Ranking dos Simulados. Aberto a todos os planos.`,
  },
  simulados: {
    title: "Ranking dos Simulados",
    summary: `Acertos da sua melhor tentativa em cada simulado (${MOCK_EXAM_POINTS_PER_CORRECT} pts por acerto).`,
    details: `Para cada simulado que você finaliza, vale a sua melhor tentativa: cada acerto soma ${MOCK_EXAM_POINTS_PER_CORRECT} pts. Refazer um simulado só muda a pontuação se você superar a sua melhor nota. Incluído no plano Premium.`,
  },
};

interface RankingCardProps {
  plan: PlanId | null;
}

/**
 * Ranking section with two boards: Geral (every plan, practice questions) and
 * Simulados (Premium, mock exam results). The rule of each one is always visible.
 */
export function RankingCard({ plan }: RankingCardProps) {
  const [scope, setScope] = useState<RankingScope>("geral");
  const rule = RULES[scope];
  const locked = scope === "simulados" && !hasFeature(plan, "mockExamRanking");

  return (
    <Card as="section" aria-labelledby="ranking-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="ranking-heading"
            className="flex items-center gap-2 text-lg font-semibold text-ink-strong"
          >
            <Trophy aria-hidden="true" className="size-5 text-brand-800" />
            Ranking
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Acompanhe sua posição e sua evolução nas questões e nos simulados
          </p>
        </div>
        <SegmentedControl
          aria-label="Tipo de ranking"
          options={scopeOptions}
          value={scope}
          onChange={setScope}
          className="w-full sm:w-auto [&_button]:h-9 [&_button]:px-4 [&_button]:text-sm"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-strong">
        <span className="font-semibold">{rule.title}:</span>
        <span className="text-ink-muted">{rule.summary}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-badge px-2 py-0.5 text-xs font-semibold text-brand-800 hover:bg-brand-500-a24"
              aria-label={`Como funciona o ${rule.title}`}
            >
              <Info aria-hidden="true" className="size-3.5" />
              Como funciona
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-sm leading-relaxed">{rule.details}</TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-6">
        {locked ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-ink-strong">Ranking dos Simulados</h3>
              <Badge tone="brand">Incluído no Premium</Badge>
            </div>
            <LockedFeature
              feature="mockExamRanking"
              label="Ranking dos Simulados"
              description="Acompanhe sua evolução nos simulados e veja sua posição no ranking. Esse recurso faz parte do plano Premium."
            />
          </div>
        ) : (
          <RankingBoard key={scope} scope={scope} />
        )}
      </div>
    </Card>
  );
}

function RankingBoard({ scope }: { scope: RankingScope }) {
  const { data: ranking, loading, error } = useAsync(() => getRanking(scope), [scope]);

  if (loading) return <Spinner label="Carregando ranking…" className="py-6" />;
  if (error || !ranking) {
    return (
      <p className="text-sm text-ink-muted">
        {errorMessage(error, "Não foi possível carregar o ranking.")}
      </p>
    );
  }

  const me = ranking.currentUser;
  const meOutsideTop = me !== null && !ranking.top.some((entry) => entry.isCurrentUser);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <div className="flex flex-col items-center justify-center gap-1 rounded-card bg-brand-300-a53 p-6 text-center">
        {me ? (
          <>
            <p className="text-sm text-ink-muted">Sua posição</p>
            <p className="text-4xl font-bold text-brand-800">{me.position}º</p>
            <p className="text-sm text-ink-strong">
              de {ranking.totalParticipants} estudantes · {me.points} pts
            </p>
            <p className="text-xs text-ink-muted">{me.detail}</p>
          </>
        ) : (
          <p className="text-sm text-ink-muted">
            {scope === "simulados"
              ? "Finalize um simulado para entrar neste ranking."
              : "Responda questões para entrar no ranking."}
          </p>
        )}
        <p className="mt-2 text-xs text-ink-muted">
          {scope === "geral"
            ? "Atualizado a cada questão respondida"
            : "Atualizado ao finalizar cada simulado"}
        </p>
      </div>

      <ol className="flex flex-col gap-2" aria-label="Primeiros colocados">
        {ranking.top.map((entry) => (
          <RankingRow key={entry.id} entry={entry} />
        ))}
        {meOutsideTop && me && (
          <>
            <li aria-hidden="true" className="px-4 text-center text-sm text-ink-muted">
              ⋯
            </li>
            <RankingRow entry={me} />
          </>
        )}
      </ol>
    </div>
  );
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-input px-4 py-2.5",
        entry.isCurrentUser ? "bg-brand-500-a24 font-semibold" : "bg-black/[0.02]"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          entry.position <= 3 ? "bg-brand-800 text-white" : "bg-black/5 text-ink-strong"
        )}
      >
        {entry.position === 1 ? (
          <>
            <Crown aria-hidden="true" className="size-3.5" />
            <span className="sr-only">1</span>
          </>
        ) : (
          entry.position
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink-strong">
          {entry.name}
          {entry.isCurrentUser && " (você)"}
        </span>
        <span className="block text-xs font-normal text-ink-muted">{entry.detail}</span>
      </span>
      <span className="text-sm text-ink-muted">{entry.points} pts</span>
    </li>
  );
}
