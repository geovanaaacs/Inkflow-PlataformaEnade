import { useId } from "react";
import { cn } from "@/design-system/utils/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  labelHidden?: boolean;
  id?: string;
}

/** Accessible on/off toggle backed by a real checkbox for free keyboard support. */
export function Switch({ checked, onChange, label, labelHidden = true, id }: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;

  return (
    <span className="inline-flex items-center gap-2">
      {!labelHidden && (
        <label htmlFor={switchId} className="text-sm text-ink-strong">
          {label}
        </label>
      )}
      <span className="relative inline-flex h-5 w-10 shrink-0 items-center">
        <input
          id={switchId}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={labelHidden ? label : undefined}
          className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0"
        />
        <span
          aria-hidden="true"
          className={cn(
            "block h-5 w-10 rounded-full transition-colors",
            checked ? "bg-brand-600" : "bg-neutral-toggle-off",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600 peer-focus-visible:ring-offset-2"
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-0.5 size-4 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </span>
    </span>
  );
}
