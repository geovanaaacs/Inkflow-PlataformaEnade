import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/design-system/utils/cn";

const fieldSurface =
  "w-full rounded-input border border-transparent bg-app-surface text-base text-ink-strong shadow-input placeholder:text-ink-muted focus-visible:border-brand-600";

interface FieldWrapperProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor: string;
  children: ReactNode;
}

function FieldWrapper({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-strong">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  endAdornment?: ReactNode;
}

/** Labeled text input with the app's rounded/shadowed field styling. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, endAdornment, id, className, required, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <FieldWrapper
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
    >
      <div className="relative">
        {icon && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-muted"
          >
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            fieldSurface,
            "h-[53px] px-4",
            icon && "pl-11",
            endAdornment && "pr-11",
            error && "border-danger",
            className
          )}
          {...rest}
        />
        {endAdornment && (
          <span className="absolute inset-y-0 right-3 flex items-center">
            {endAdornment}
          </span>
        )}
      </div>
    </FieldWrapper>
  );
});

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

/** Labeled multiline text field, e.g. the question notes editor. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, hint, error, id, className, required, rows = 4, ...rest },
    ref
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const describedBy = error
      ? `${inputId}-error`
      : hint
        ? `${inputId}-hint`
        : undefined;

    return (
      <FieldWrapper
        label={label}
        hint={hint}
        error={error}
        required={required}
        htmlFor={inputId}
      >
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(fieldSurface, "resize-y p-4", error && "border-danger", className)}
          {...rest}
        />
      </FieldWrapper>
    );
  }
);
