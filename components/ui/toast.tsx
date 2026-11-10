"use client";

import * as React from "react";

type ToastVariant = "default" | "success" | "danger" | "warning" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: ToastItem[];
  add: (toast: Omit<ToastItem, "id">) => void;
  remove: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({
  children,
}: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const add = React.useCallback((toast: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, add, remove }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const variantStyles: Record<ToastVariant, string> = {
    default: "bg-surface text-foreground border border-border",
    success: "bg-success-light text-success-foreground border border-success/20",
    danger: "bg-danger-light text-danger-foreground border border-danger/20",
    warning: "bg-warning-light text-warning-foreground border border-warning/20",
    info: "bg-info-light text-info-foreground border border-info/20",
  };

  return (
    <div
      data-toast={toast.id}
      className={`pointer-events-auto flex items-start gap-3 w-full max-w-sm rounded-lg border p-4 text-sm shadow-md animate-in fade-in slide-in-from-right-2 duration-200 ${variantStyles[toast.variant]}`}
    >
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
        {toast.variant === "success" && (
          <span className="h-2.5 w-2.5 text-success-foreground">✓</span>
        )}
        {toast.variant === "danger" && (
          <span className="h-2.5 w-2.5 text-danger-foreground">!</span>
        )}
        {toast.variant === "warning" && (
          <span className="h-2.5 w-2.5 text-warning-foreground">!</span>
        )}
        {toast.variant === "info" && (
          <span className="h-2.5 w-2.5 text-info-foreground">i</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 text-neutral-800">
        <p className="font-medium text-foreground">{toast.title}</p>
        {toast.description && <p className="text-neutral-600">{toast.description}</p>}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-auto shrink-0 rounded p-1 text-neutral-500 hover:text-neutral-800"
        aria-label="Dismiss notification"
      >
        <span className="sr-only">Dismiss</span>
        <span style={{ display: "block", width: 0, height: 0, borderStyle: "solid", borderWidth: "5px 5px 0 5px", borderColor: "transparent transparent transparent transparent" }} />
      </button>
    </div>
  );
}

export { useToast };