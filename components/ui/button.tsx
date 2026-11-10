"use client";

import * as React from "react";
import { Spinner } from "./spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-primary",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary-hover focus-visible:ring-secondary",
  ghost:
    "bg-surface text-foreground hover:bg-neutral-100 focus-visible:ring-secondary",
  danger:
    "bg-danger text-danger-foreground hover:bg-danger-hover focus-visible:ring-danger",
  outline:
    "border border-border bg-surface text-foreground hover:bg-neutral-100 focus-visible:ring-secondary",
};

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
  fullWidth = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-${{ sm: "md", md: "full", lg: "full" }[size]}
        font-medium transition-colors
        disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed
        min-h-[44px] touch-manipulation
        ${sizeClasses[size]} ${variantClasses[variant]} ${className}
      `}
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