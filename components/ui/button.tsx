"use client";

import * as React from "react";
import { Spinner } from "./spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
}

const variantClasses = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover hover:text-on-primary focus-visible:ring-focus-ring focus-visible:ring-offset-2",
  secondary:
    "bg-surface text-secondary border border-border-strong hover:bg-surface-alt hover:text-secondary-hover focus-visible:ring-secondary",
  ghost:
    "bg-transparent text-foreground hover:bg-neutral-200 hover:text-neutral-900 focus-visible:ring-secondary",
  danger:
    "bg-danger text-on-danger hover:bg-danger-hover focus-visible:ring-danger focus-visible:ring-offset-2",
  accent:
    "bg-accent text-on-accent hover:bg-accent-hover focus-visible:ring-accent focus-visible:ring-offset-2",
  outline:
    "border border-border-strong bg-surface text-foreground hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-secondary",
} as const;

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-3.5 text-base",
};

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2
        rounded-full
        font-semibold transition-colors duration-200
        disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed
        min-h-[44px] touch-manipulation
        ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" />
          <span>Loading…</span>
        </>
      ) : (
        props.children
      )}
    </button>
  );
}


