import { useState } from "react";
import { Crown, Trophy } from "lucide-react";
import { Card } from "@/design-system/components/Card";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/design-system/components/SegmentedControl";
import { Spinner } from "@/design-system/components/Spinner";
import { cn } from "@/design-system/utils/cn";
import { errorMessage } from "@/shared/api/api-error";
import { LockedFeature } from "@/shared/components/LockedFeature";
import { useAsync } from "@/shared/hooks/useAsync";
import { hasFeature, type PlanId } from "@/shared/plans/plan-access";
import { getRanking, type RankingEntry, type RankingScope } from "../api";

const scopeOptions: SegmentedControlOption<RankingScope>[] = [
  { value: "geral", label: "Geral · tempo real" },
  { value: "premium", label: "Exclusivo Premium" },
];

interface RankingCardProps {
  plan: PlanId | null;
}

/**
 * Ranking section: "Geral" (Avançado+) ranks every student live; "Exclusivo
 * Premium" ranks only Premium subscribers. Locked tabs invite to upgrade.
 */
export function RankingCard({ plan }: RankingCardProps) {
  const [scope, setScope] = useState<RankingScope>(
    hasFeature(plan, "exclusiveRanking") ? "premium" : "geral"
  );
  const canSeeRanking = hasFeature(plan, "ranking");

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
            Sua posição entre os estudantes mais preparados para o ENADE
          </p>
        </div>
        {canSeeRanking && (
          <SegmentedControl
            aria-label="Tipo de ranking"
            options={scopeOptions}
            value={scope}
            onChange={setScope}
            className="w-full sm:w-auto [&_button]:h-9 [&_button]:px-4 [&_button]:text-sm"
          />
        )}
      </div>

      <div className="mt-6">
        {!canSeeRanking ? (
          <LockedFeature
            feature="ranking"
            label="Ranking em tempo real"
            description="Acompanhe sua posição entre todos os estudantes do Inkflow, atualizada a cada questão respondida."
          />
        ) : scope === "premium" && !hasFeature(plan, "exclusiveRanking") ? (
          <LockedFeature
            feature="exclusiveRanking"
            label="Ranking exclusivo"
            description="Compare-se apenas com os assinantes Premium — os estudantes mais comprometidos da plataforma."
          />
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
          </>
        ) : (
          <p className="text-sm text-ink-muted">Responda questões para entrar no ranking.</p>
        )}
        <p className="mt-2 text-xs text-ink-muted">
          {scope === "geral"
            ? "Atualizado a cada questão respondida"
            : "Somente assinantes Premium"}
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
      <span className="flex-1 truncate text-sm text-ink-strong">
        {entry.name}
        {entry.isCurrentUser && " (você)"}
      </span>
      <span className="text-sm text-ink-muted">{entry.points} pts</span>
    </li>
  );
}
