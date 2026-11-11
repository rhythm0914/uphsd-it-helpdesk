"use client";

import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "success"
    | "danger"
    | "warning"
    | "info";
  size?: "sm" | "md";
}

const base =
  "inline-flex items-center rounded-full border font-medium text-xs uppercase tracking-wider whitespace-nowrap touch-manipulation";

const variants: Record<string, string> = {
  primary: "bg-primary-light text-primary border-primary/20",
  secondary: "bg-info-bg text-secondary border-secondary/20",
  ghost: "bg-neutral-100 text-neutral-700 border-neutral-200",
  success: "bg-success-bg text-success-foreground border-success/20",
  danger: "bg-danger-bg text-danger-foreground border-danger/20",
  warning: "bg-warning-bg text-warning-foreground border-warning/20",
  info: "bg-info-bg text-info-foreground border-info/20",
};

const sizes = {
  sm: "px-2 py-0.5",
  md: "px-2.5 py-1",
};

export function Badge({
  className = "",
  variant = "primary",
  size = "md",
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    />
  );
}
