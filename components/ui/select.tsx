"use client";

import * as React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({
  className = "",
  error = false,
  ...props
}: SelectProps) {
  return (
    <select
      {...props}
      className={`flex h-10 w-full rounded-lg border px-3 py-2 text-sm bg-background
        ${error
          ? "border-danger text-danger-foreground focus:border-danger focus:ring-1 focus:ring-danger"
          : "border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary"}
        ${className}`}
    />
  );
}