"use client";

import * as React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`rounded-${"xl"} border border-border bg-surface shadow ${className}`}
    />
  );
}

interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

export function CardHeader({
  className = "",
  title,
  description,
  ...props
}: CardHeaderProps) {
  return (
    <div
      {...props}
      className={`border-b border-border px-6 py-4 ${className}`}
    >
      {title && (
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      )}
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

export function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`px-6 py-4 ${className}`}
    />
  );
}

export function CardFooter({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`border-t border-border px-6 py-4 ${className}`}
    />
  );
}