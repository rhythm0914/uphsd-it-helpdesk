"use client";

import * as React from "react";
import { Badge } from "./badge";

/**
 * StatusBadge renders a ticket status using the semantic status palette
 * (separate from brand colors). Each status uses color + text label, never
 * color alone. The label is passed explicitly so the meaning is always in text.
 */
const STATUS_VARIANTS: Record<string, "success" | "danger" | "warning" | "info"> = {
  open: "info",
  in_progress: "info",
  waiting_for_user: "warning",
  resolved: "success",
  closed: "ghost",
  reopened: "danger",
  rejected: "danger",
};

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string | null | undefined;
  label?: string;
  size?: "sm" | "md";
}

export function StatusBadge({
  className = "",
  status,
  label,
  size = "md",
  ...props
}: StatusBadgeProps) {
  const variant = STATUS_VARIANTS[String(status ?? "")] ?? "ghost";
  const text = label ?? (status ? String(status).replace(/_/g, " ") : "Unknown");
  return (
    <Badge variant={variant} size={size} className={className} {...props}>
      {text}
    </Badge>
  );
}