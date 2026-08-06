import { cn } from "@/design-system/utils/cn";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
}

/** Two/three-way pill toggle (e.g. Entrar/Cadastrar) implemented as a tablist. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={rest["aria-label"]}
      className={cn(
        "grid grid-flow-col gap-1.5 rounded-input bg-brand-500-a24 p-1.5",
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-[45px] rounded-input px-6 text-[16px] font-medium transition-colors",
              selected
                ? "bg-app-surface text-brand-800 shadow-input"
                : "text-brand-800/80 hover:text-brand-800"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
