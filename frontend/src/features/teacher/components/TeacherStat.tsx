import type { ReactNode } from "react";
import { Card } from "@/design-system/components/Card";
import { IconBadge, type IconBadgeTone } from "@/design-system/components/IconBadge";

interface TeacherStatProps {
  icon: ReactNode;
  value: string;
  label: string;
  tone?: IconBadgeTone;
}

export function TeacherStat({ icon, value, label, tone = "brand" }: TeacherStatProps) {
  return (
    <Card as="article" className="flex items-center gap-4 p-5 sm:p-5">
      <IconBadge icon={icon} tone={tone} />
      <div>
        <p className="text-2xl font-semibold leading-none text-ink-strong">{value}</p>
        <p className="mt-1 text-sm text-ink-muted">{label}</p>
      </div>
    </Card>
  );
}
