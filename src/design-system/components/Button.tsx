import { forwardRef } from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/design-system/utils/cn";

export type ButtonVariant =
  | "primary"
  | "outline"
  | "soft"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Marks the button as the current navigation item (nav tabs). */
  active?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

type ButtonAsButton = ButtonOwnProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
    to?: undefined;
  };

type ButtonAsAnchor = ButtonOwnProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: undefined };

type ButtonAsRouterLink = ButtonOwnProps &
  Omit<LinkProps, "className"> & { href?: undefined };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor | ButtonAsRouterLink;

const baseClasses =
  "inline-flex select-none items-center justify-center gap-2 rounded-button font-semibold leading-none transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50";

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-[42px] px-8 text-base",
  sm: "h-9 px-5 text-sm",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-900 active:bg-brand-900",
  outline:
    "border border-border-subtle bg-transparent text-ink-strong hover:bg-black/5 active:bg-black/10",
  soft: "bg-brand-500-a24 text-brand-900 hover:bg-brand-400-a18",
  ghost: "bg-transparent text-ink-strong hover:bg-black/5",
  danger:
    "bg-danger-bg text-danger border border-transparent hover:border-danger-border hover:bg-danger hover:text-white",
};

const activeNavClasses = "bg-brand-900 text-white hover:bg-brand-900";

/**
 * Core interactive control of the design system. Renders as a <button> by
 * default, as a react-router <Link> when `to` is supplied (internal
 * navigation, no full reload), or as a plain <a> when `href` is supplied
 * (external links) — so the right semantics/keyboard behavior always apply.
 */
export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth = false,
    active = false,
    leadingIcon,
    trailingIcon,
    className,
    children,
    ...rest
  },
  ref
) {
  const classes = cn(
    baseClasses,
    sizeClasses[size],
    active ? activeNavClasses : variantClasses[variant],
    fullWidth && "w-full",
    className
  );

  if ("to" in rest && rest.to !== undefined) {
    const { to, ...linkRest } = rest as Omit<LinkProps, "className">;
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={to}
        className={classes}
        aria-current={active ? "page" : undefined}
        {...linkRest}
      >
        {leadingIcon}
        {children}
        {trailingIcon}
      </Link>
    );
  }

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...anchorRest } =
      rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        aria-current={active ? "page" : undefined}
        {...anchorRest}
      >
        {leadingIcon}
        {children}
        {trailingIcon}
      </a>
    );
  }

  const { type = "button", ...buttonRest } =
    rest as ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      className={classes}
      aria-current={active ? "page" : undefined}
      {...buttonRest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
});
