"use client";

import * as React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({
  className = "",
  error = false,
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      className={`flex h-10 w-full rounded-lg border px-3 py-2 text-sm
        ${error
          ? "border-danger bg-danger-light text-danger-foreground focus:border-danger focus:ring-1 focus:ring-danger"
          : "border-border bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary"}
        ${className}`}
    />
  );
}