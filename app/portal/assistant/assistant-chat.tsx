"use client";

// Client chat UI for the IT Assistant. State is client-side only — no
// conversation is stored server-side or in the database (Phase 8 privacy
// decision). Every request goes to /api/assistant, which enforces auth,
// validation, rate limits, and retrieval server-side.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
  source?: string;
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";

const SUGGESTIONS = [
  "How do I submit an IT request?",
  "I can't connect to the university Wi-Fi.",
  "What information should I include in my request?",
];

const RATE_LIMIT_MESSAGE =
  "You've reached the AI Assistant limit for now. The full Help Desk is still available — you can submit an IT request at any time.";
export function AssistantChat() {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [entries, status]);

  const send = useCallback(
    async (text: string, history: ChatEntry[]) => {
      setStatus("loading");
      setErrorText(null);

      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            // Send only prior turns (never system content) as history.
            history: history.map(({ role, content }) => ({ role, content })),
          }),
        });

        const data = (await res.json().catch(() => null)) as {
          reply?: string;
          error?: string;
          sources?: { title: string; slug: string }[];
        } | null;

        if (!res.ok || !data?.reply) {
          const friendly = res.status === 429 ? RATE_LIMIT_MESSAGE : data?.error;
          throw new Error(
            friendly ||
              "The AI Assistant is temporarily unavailable. You can still submit an IT request through the Help Desk.",
          );
        }

        const reply = data.reply ?? "";
        const source = data.sources?.[0]?.title;
        setEntries((prev) => [
          ...prev,
          { role: "assistant", content: reply, source },
        ]);
        setStatus("idle");
      } catch (err) {
        setStatus("error");
        setErrorText(err instanceof Error ? err.message : "Something went wrong.");
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e?: { preventDefault: () => void }) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || status === "loading") return;

      const history = entries;
      setEntries((prev) => [...prev, { role: "user", content: text }]);
      setInput("");
      setLastFailedMessage(text);
      await send(text, history);
    },
    [entries, input, send, status],
  );

  const retry = useCallback(async () => {
    if (!lastFailedMessage) return;
    // Drop the failed user turn so it is re-sent cleanly.
    setEntries((prev) => {
      const copy = [...prev];
      if (copy.length && copy[copy.length - 1].role === "user") copy.pop();
      return copy;
    });
    const history = entries.slice(0, -1);
    await send(lastFailedMessage, history);
  }, [entries, lastFailedMessage, send]);

  const clear = useCallback(() => {
    setEntries([]);
    setInput("");
    setStatus("idle");
    setErrorText(null);
    setLastFailedMessage(null);
    inputRef.current?.focus();
  }, []);

  const canSend = status !== "loading" && input.trim().length > 0;

  return (
    <div className="rounded-2xl border border-border bg-background flex flex-col h-[32rem] sm:h-[36rem]">
      {/* Conversation */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" aria-live="polite">
        {entries.length === 0 && status !== "loading" ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="font-medium">How can I help with IT today?</p>
            <p className="mt-1 text-sm text-foreground/60 max-w-sm">
              Ask about university IT services, accounts, or submitting a request. The assistant
              gives guidance only — it never changes tickets or accounts.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="flex-1 rounded-full border border-border px-3 py-2 text-xs sm:text-sm text-foreground/70 hover:bg-surface hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  entry.role === "user"
                    ? "bg-brand-primary text-white"
                    : "border border-border bg-surface text-foreground"
                }`}
              >
                {entry.content}
                {entry.source && (
                  <p className="mt-2 text-xs text-foreground/50">Reference: {entry.source}</p>
                )}
              </div>
            </div>
          ))
        )}

        {status === "loading" && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground/60">
              Thinking…
            </div>
          </div>
        )}

        {status === "error" && errorText && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>{errorText}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={retry}
                className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100 transition-colors"
              >
                Retry
              </button>
              <Link
                href="/portal/request"
                className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100 transition-colors"
              >
                Submit an IT Request
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-3 sm:p-4 flex items-end gap-2">
        <label htmlFor="assistant-input" className="sr-only">
          Ask the IT Assistant a question
        </label>
        <textarea
          id="assistant-input"
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter adds a newline (standard chat UX).
            if (e.key === "Enter" && !e.shiftKey) {
              e?.preventDefault();
              void handleSubmit();
            }
          }}
          maxLength={1000}
          placeholder="Ask an IT question..."
          className={`${inputClass} resize-none min-h-[2.5rem] max-h-32 flex-1`}
          disabled={status === "loading"}
        />
        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {status === "loading" ? "Sending..." : "Send"}
        </button>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={clear}
            disabled={status === "loading"}
            className="rounded-full border border-border px-3 py-2.5 text-sm text-foreground/70 hover:bg-surface transition-colors disabled:opacity-50 shrink-0"
            aria-label="Clear conversation"
          >
            Clear
          </button>
        )}
      </form>
    </div>
  );
}
