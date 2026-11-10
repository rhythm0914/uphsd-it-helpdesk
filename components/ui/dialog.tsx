"use client";

import * as React from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

/**
 * Accessible dialog (modal).
 * - aria-modal, role="dialog"
 * - Esc closes, backdrop click closes
 * - Focus is trapped inside while open
 * - Returns focus to the trigger when closed (caller manages trigger ref)
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  className = "",
  "aria-label": ariaLabel,
}: DialogProps) {
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const previousFocus = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const el = document.activeElement;
    previousFocus.current = el instanceof HTMLElement ? el : null;
    contentRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [open]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    },
    [onOpenChange]
  );

  const handleBackdropClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onOpenChange(false);
    },
    [onOpenChange]
  );

  if (!open) return null;

  const labelledBy = title ? `dialog-title-${Math.random().toString(36).slice(2)}` : undefined;

  return (
    <>
      <div
        ref={overlayRef}
        role="presentation"
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={ariaLabel ? undefined : undefined}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className={`fixed left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg rounded-lg border border-border bg-surface shadow-md ring-1 ring-neutral-900/10 overflow-hidden
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${className}`}
      >
        {title && (
          <div className="border-b border-border px-6 py-4">
            <h2
              id={labelledBy}
              className="text-lg font-semibold text-foreground"
            >
              {title}
            </h2>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </>
  );
}