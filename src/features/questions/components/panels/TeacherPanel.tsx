import { BadgeCheck, GraduationCap } from "lucide-react";
import type { Question } from "../../data";

interface TeacherPanelProps {
  id: string;
  teacher: Question["teacher"];
}

export function TeacherPanel({ id, teacher }: TeacherPanelProps) {
  return (
    <div id={id} className="rounded-card bg-black/[0.02] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-500-a24 text-brand-800"
          >
            <GraduationCap className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-strong">{teacher.name}</p>
            <p className="text-sm text-ink-muted">{teacher.credentials}</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-sm font-medium text-success">
          <BadgeCheck aria-hidden="true" className="size-4" />
          Professor verificado
        </span>
      </div>
      <p className="mt-4 text-sm text-ink-strong">{teacher.comment}</p>
    </div>
  );
}
