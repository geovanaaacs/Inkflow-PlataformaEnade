import { useState, type FormEvent } from "react";
import { Users } from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Textarea } from "@/design-system/components/Input";
import type { CommunityComment } from "../../data";

interface CommunityPanelProps {
  id: string;
  comments: CommunityComment[];
  onAddComment: (comment: string) => void;
}

export function CommunityPanel({ id, comments, onAddComment }: CommunityPanelProps) {
  const [draftComment, setDraftComment] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = draftComment.trim();
    if (!trimmed) {
      setError("Escreva um comentário antes de enviar.");
      return;
    }

    onAddComment(trimmed);
    setDraftComment("");
    setError("");
  }

  return (
    <div id={id} className="rounded-card bg-black/[0.02] p-6">
      <h3 className="flex items-center gap-2 text-base font-semibold text-ink-strong">
        <Users aria-hidden="true" className="size-4 text-brand-800" />
        Comunidade
      </h3>

      {comments.length === 0 ? (
        <p className="mt-5 text-sm text-ink-muted">
          Ainda não há comentários da comunidade para esta questão. Seja o
          primeiro a comentar!
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-5">
          {comments.map((comment) => (
            <li key={`${comment.author}-${comment.comment.slice(0, 20)}`} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-500-a24 text-xs font-semibold text-brand-800"
              >
                {comment.author.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-strong">{comment.author}</p>
                <div className="relative mt-2">
                  <div className="absolute left-3 top-1 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm border-t border-l border-border-subtle bg-white" />
                  <div className="rounded-3xl border border-border-subtle bg-white px-4 py-3 text-sm text-ink-strong shadow-sm">
                    {comment.comment}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Textarea
          label="Adicionar comentário"
          placeholder="Escreva sua contribuição para a comunidade..."
          value={draftComment}
          onChange={(event) => setDraftComment(event.target.value)}
          rows={4}
          error={error || undefined}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm">
            Publicar comentário
          </Button>
        </div>
      </form>
    </div>
  );
}
