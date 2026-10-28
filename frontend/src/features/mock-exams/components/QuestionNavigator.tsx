import { cn } from "@/design-system/utils/cn";

interface QuestionNavigatorProps {
  total: number;
  currentIndex: number;
  isAnswered: (index: number) => boolean;
  onNavigate: (index: number) => void;
}

/** Numbered grid to jump between the exam's questions; answered ones are filled. */
export function QuestionNavigator({
  total,
  currentIndex,
  isAnswered,
  onNavigate,
}: QuestionNavigatorProps) {
  return (
    <nav aria-label="Questões do simulado">
      <ol className="grid grid-cols-5 gap-2">
        {Array.from({ length: total }, (_, index) => {
          const answered = isAnswered(index);
          const current = index === currentIndex;
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => onNavigate(index)}
                aria-current={current ? "step" : undefined}
                aria-label={`Questão ${index + 1}${answered ? ", respondida" : ", sem resposta"}`}
                className={cn(
                  "flex size-10 w-full items-center justify-center rounded-dropdown text-sm font-semibold transition-colors",
                  answered
                    ? "bg-brand-600 text-white hover:bg-brand-900"
                    : "bg-black/5 text-ink-strong hover:bg-brand-500-a24",
                  current && "ring-2 ring-brand-900 ring-offset-2"
                )}
              >
                {index + 1}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm bg-brand-600" /> Respondida
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm bg-black/10" /> Sem resposta
        </span>
      </p>
    </nav>
  );
}
