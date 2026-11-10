"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyFix, reportStillBroken } from "./actions";
import { Spinner } from "@/components/ui/spinner";

const RATINGS = [1, 2, 3, 4, 5] as const;

/**
 * The requester's verification panel.
 *
 * Shown only while the ticket is Resolved. "Fix works" records the required
 * satisfaction rating and closes the ticket in one action; "Still broken"
 * reopens the same ticket. Neither action is available to staff.
 */
export function TicketVerification({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "fixed" | "broken">("none");
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  async function handleFixed(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(null);

    const result = await verifyFix(ticketId, rating, comment.trim() || undefined);
    setPending(false);

    if (result.error) {
      setFeedback({ type: "error", text: result.error });
      return;
    }

    setFeedback({ type: "success", text: "Thank you — this request is now closed." });
    setMode("none");
    router.refresh();
  }

  async function handleBroken(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(null);

    const result = await reportStillBroken(ticketId, reason.trim());
    setPending(false);

    if (result.error) {
      setFeedback({ type: "error", text: result.error });
      return;
    }

    setFeedback({
      type: "success",
      text: "Your request has been reopened. IT staff have been notified.",
    });
    setMode("none");
    router.refresh();
  }

  return (
    <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <h2 className="text-lg font-semibold text-emerald-900">Is your issue fixed?</h2>
      <p className="mt-1 text-sm text-emerald-800">
        IT marked this request resolved. Please confirm whether it works so the ticket can be
        closed.
      </p>

      {feedback && (
        <div
          className={`mt-4 rounded-lg border p-3 ${
            feedback.type === "error"
              ? "border-red-200 bg-red-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <p className={`text-sm ${feedback.type === "error" ? "text-red-700" : "text-green-700"}`}>
            {feedback.text}
          </p>
        </div>
      )}

      {mode === "none" && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setMode("fixed");
            }}
            className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover"
          >
            Fix works
          </button>
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setMode("broken");
            }}
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Still broken
          </button>
        </div>
      )}

      {mode === "fixed" && (
        <form onSubmit={handleFixed} className="mt-4 space-y-4">
          <div>
            <label htmlFor="rating" className="block text-sm font-medium mb-2">
              How satisfied are you? <span className="text-brand-primary">*</span>
            </label>
            <select
              id="rating"
              value={rating || ""}
              onChange={(e) => setRating(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="">Select a rating</option>
              {RATINGS.map((value) => (
                <option key={value} value={value}>
                  {value} {value === 1 ? "star" : "stars"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="comment" className="block text-sm font-medium mb-2">
              Comment (optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Anything you want the IT team to know?"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setMode("none")}
              className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm font-medium sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || rating < 1}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50 sm:w-auto"
            >
              {pending ? (
                <>
                  <Spinner size="sm" />
                  <span>Submitting…</span>
                </>
              ) : (
                "Confirm fix and rate"
              )}
            </button>
          </div>
        </form>
      )}

      {mode === "broken" && (
        <form onSubmit={handleBroken} className="mt-4 space-y-4">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium mb-2">
              What is still broken? <span className="text-brand-primary">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Tell IT what still is not working..."
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setMode("none")}
              className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm font-medium sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !reason.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50 sm:w-auto"
            >
              {pending ? (
                <>
                  <Spinner size="sm" />
                  <span>Submitting…</span>
                </>
              ) : (
                "Reopen request"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
