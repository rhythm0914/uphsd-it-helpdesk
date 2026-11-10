"use client";

import * as React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({
  className = "",
  error = false,
  ...props
}: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`flex w-full rounded-lg border px-3 py-2 text-sm
        ${error
          ? "border-danger bg-danger-light text-danger-foreground focus:border-danger focus:ring-1 focus:ring-danger"
          : "border-border bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary"}
        ${className}`}
    />
  );
}