"use client";

import * as React from "react";

interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
}

const VARIANT_CLASSES: Record<string, string> = {
  info: "bg-info-light border border-info/30 text-info-foreground",
  success: "bg-success-light border border-success/30 text-success-foreground",
  warning: "bg-warning-light border border-warning/30 text-warning-foreground",
  danger: "bg-danger-light border border-danger/30 text-danger-foreground",
};

const VARIANT_ICONS: Record<string, string> = {
  info: "info",
  success: "circle-check",
  warning: "alert-triangle",
  danger: "circle-alert",
};

export function Callout({
  className = "",
  variant = "info",
  title,
  children,
  ...props
}: CalloutProps) {
  return (
    <div
      {...props}
      className={`rounded-lg p-4 flex gap-3 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      <span className="shrink-0 mt-0.5 text-sm" aria-hidden="true">
        {/* icon rendered by parent via title semantics; keep decorative only */}
        {title ? <span className="sr-only">{title}</span> : null}
      </span>
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <p className="mt-0.5">{children}</p>
      </div>
    </div>
  );
}