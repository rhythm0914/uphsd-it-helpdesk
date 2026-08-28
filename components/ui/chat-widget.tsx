"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AI_DISCLOSURE_SHORT, AI_PRIVACY_NOTICE_PATH } from "@/utils/ai/transparency";
import {
  Cross2Icon,
  MagicWandIcon,
  PaperPlaneIcon,
  ReloadIcon,
  TriangleDownIcon,
} from "@radix-ui/react-icons";

const inputClass =
  "w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none";

const SUGGESTIONS = [
  "How do I submit an IT request?",
  "I can't connect to the university Wi-Fi.",
  "What information should I include in my request?",
];

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
  source?: string;
}

type ChatStatus = "idle" | "loading" | "error";

interface ChatWidgetProps {
  authenticated?: boolean;
}

export function ChatWidget({ authenticated = false }: ChatWidgetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ChatEntry[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm the UPHSD IT Assistant. I can help with common IT questions, services, account access, and Help Desk guidance. What can I help you with?",
    },
  ]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
    const canSend = !!input.trim() && status !== "loading";

  const closePanel = () => {
    setOpen(false);
    setErrorText(null);
    setStatus("idle");
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [entries, status, open]);

    useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || status === "loading" || !authenticated) return;

    setStatus("loading");
    setErrorText(null);
    setEntries((prev) => [...prev, { role: "user", content: text }]);
    setInput("");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: entries.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (res.status === 401) {
        setAuthError(true);
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        reply?: string;
        error?: string;
      } | null;

            if (!res.ok || !data?.reply) {
        throw new Error(
          data?.error ||
            "The AI Assistant is temporarily unavailable. You can still submit an IT request through the Help Desk.",
        );
      }

      setEntries((prev) => [...prev, { role: "assistant", content: data.reply as string }]);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setStatus("idle");
    }
    }, [input, status, entries, authenticated]);

  const handleSubmit = useCallback(
    (e?: { preventDefault: () => void }) => {
      e?.preventDefault();
      if (!authenticated) return;
      void send();
    },
    [authenticated, send],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!authenticated) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [authenticated, handleSubmit],
  );

  const retry = useCallback(() => {
    setErrorText(null);
    setStatus("idle");
    void send();
  }, [send]);

      const openPanel = () => {
    if (!authenticated) {
      router.push("/portal/assistant");
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        aria-label="Open IT Assistant"
        className={`fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${
          open && authenticated
            ? "scale-0 opacity-0"
            : "scale-100 opacity-100 hover:scale-105"
        } bg-brand-primary text-white`}
      >
                      <MagicWandIcon className="h-7 w-7" />
      </button>

      {open && authenticated && (
        <div
          className="fixed inset-0 z-[110] flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:max-w-sm sm:h-[600px]"
          role="dialog"
          aria-modal="true"
          aria-label="IT Assistant chat"
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-white">
                                <MagicWandIcon className="h-5 w-5" />
              </div>
              <div>
                                <h3 className="font-semibold text-sm">AI Assistant</h3>
                <p className="text-xs text-foreground/60">UPHSD IT Help Desk</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Minimize chat"
                className="rounded-full p-1.5 text-foreground/60 hover:bg-surface hover:text-foreground"
              >
                <TriangleDownIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Close chat"
                className="rounded-full p-1.5 text-foreground/60 hover:bg-surface hover:text-foreground"
              >
                                <Cross2Icon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
            role="log"
            aria-live="polite"
          >
            {entries.map((entry, i) => (
              <div
                key={i}
                className={entry.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    entry.role === "user"
                      ? "bg-brand-primary text-white"
                      : "border border-border bg-surface text-foreground"
                  }`}
                >
                  {entry.content}
                  {entry.role === "assistant" && entry.source && (
                    <p className="mt-1 text-xs text-foreground/50">
                      Reference: {entry.source}
                    </p>
                  )}
                </div>
              </div>
            ))}
                        {status === "loading" && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground/60">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Error state */}
          {status === "error" && errorText && (
            <div
              role="alert"
              className="mx-4 my-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <p>{errorText}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  Retry
                </button>
                {authError && (
                  <Link
                    href="/auth/sign-in"
                    className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    Sign In
                  </Link>
                )}
                <Link
                  href="/portal/request"
                  className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  Submit an IT Request
                </Link>
              </div>
            </div>
          )}

          {/* Persistent AI transparency bar */}
          <div className="border-t border-border bg-surface px-3 py-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] text-foreground/60 truncate">{AI_DISCLOSURE_SHORT}</p>
            <Link
              href={AI_PRIVACY_NOTICE_PATH}
              className="text-[11px] font-medium text-brand-primary hover:underline shrink-0"
            >
              Privacy
            </Link>
          </div>

          {/* Input area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <label htmlFor="chat-widget-input" className="sr-only">
              Ask the IT Assistant a question
            </label>
            <textarea
              id="chat-widget-input"
              ref={inputRef}
              rows={1}
              maxLength={1000}
              placeholder="Ask an IT question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={status === "loading"}
              className={`${inputClass} min-h-[2.5rem] max-h-32 flex-1`}
            />
            <button
              type="submit"
              disabled={status === "loading" || !canSend}
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              aria-label="Send message"
            >
                            {status === "loading" ? (
                <ReloadIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PaperPlaneIcon className="h-4 w-4" />
              )}
            </button>
          </form>

          {/* Suggestions (initial state only) */}
          {entries.length === 1 && status === "idle" && !errorText && (
            <div className="border-t border-border p-3">
              <p className="text-xs text-foreground/50 mb-2">Quick questions:</p>
              <div className="flex flex-col gap-1.5">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInput(s)}
                    className="text-left text-xs rounded-full border border-border px-3 py-1.5 text-foreground/70 hover:bg-surface transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}