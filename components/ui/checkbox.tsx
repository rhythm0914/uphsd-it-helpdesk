"use client";

import * as React from "react";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: boolean;
}

export function Checkbox({
  className = "",
  label,
  error = false,
  id,
  ...props
}: CheckboxProps) {
  const inputId = id || `checkbox-${Math.random().toString(36).slice(2)}`;
  return (
    <div className="flex items-start gap-2">
      <input
        id={inputId}
        {...props}
        className={`mt-0.5 h-4 w-4 rounded border
          ${error ? "border-danger text-danger" : "border-border text-primary"}
          bg-background focus:border-primary focus:ring-1 focus:ring-primary
          ${className}`}
      />
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm text-foreground leading-none cursor-pointer select-none"
        >
          {label}
        </label>
      )}
    </div>
  );
}