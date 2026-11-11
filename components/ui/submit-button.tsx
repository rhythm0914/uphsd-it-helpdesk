"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./spinner";

// A submit button that automatically reflects the pending state of the nearest
// <form> (React 19 useFormStatus). Place this component INSIDE the <form> it
// belongs to. Works in Server Component forms because this is a client child.
export function SubmitButton({
  idleLabel,
  pendingLabel,
  className = "",
  variant = "primary",
}: {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  variant?: "primary" | "outline";
}) {
  const { pending } = useFormStatus();

  // Shared layout + disabled semantics; color comes from the variant.
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variantStyle =
    variant === "outline"
      ? "border border-border bg-background text-foreground hover:bg-surface"
      : "bg-primary text-on-primary hover:bg-primary-hover hover:text-on-primary";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${base} ${variantStyle} ${className}`}
    >
      {pending ? (
        <>
          <Spinner size="sm" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        <span>{idleLabel}</span>
      )}
    </button>
  );
}

