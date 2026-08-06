import { Users } from "lucide-react";
import type { CommunityComment } from "../../data";

interface CommunityPanelProps {
  id: string;
  comments: CommunityComment[];
}

export function CommunityPanel({ id, comments }: CommunityPanelProps) {
  return (
    <div id={id} className="rounded-card bg-black/[0.02] p-6">
      <h3 className="flex items-center gap-2 text-base font-semibold text-ink-strong">
        <Users aria-hidden="true" className="size-4 text-brand-800" />
        Comunidade
      </h3>

      {comments.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          Ainda não há comentários da comunidade para esta questão. Seja o
          primeiro a comentar!
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-5">
          {comments.map((comment) => (
            <li key={comment.author} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-500-a24 text-xs font-semibold text-brand-800"
              >
                {comment.author.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-strong">{comment.author}</p>
                <p className="mt-1 text-sm text-ink-strong">{comment.comment}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
