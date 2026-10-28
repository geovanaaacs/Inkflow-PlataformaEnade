import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/design-system/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  label: string;
  labelHidden?: boolean;
  options: SelectOption[];
  className?: string;
}

/**
 * Native <select> styled to match the app's dropdown look. Uses a real
 * select (not a custom listbox) so keyboard/typeahead/screen-reader support
 * is correct for free.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { label, labelHidden = false, options, id, className, ...rest },
    ref
  ) {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label
          htmlFor={selectId}
          className={cn(
            "text-sm font-medium text-ink-strong",
            labelHidden && "sr-only"
          )}
        >
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className="h-8 w-full appearance-none rounded-dropdown bg-app-surface px-3.5 pr-8 text-sm font-medium text-ink-strong shadow-input"
            {...rest}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted"
          />
        </div>
      </div>
    );
  }
);
