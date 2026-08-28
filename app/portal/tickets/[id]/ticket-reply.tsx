"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendTicketReply } from "./actions";
import { Spinner } from "@/components/ui/spinner";

export function TicketReply({
  ticketId,
  isWaitingForUser,
}: {
  ticketId: string;
  isWaitingForUser: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(null);

    const result = await sendTicketReply(ticketId, message);

    if (result.error) {
      setFeedback({ type: "error", text: result.error });
      setPending(false);
      return;
    }

    setMessage("");
    setFeedback({ type: "success", text: "Reply sent. " + (isWaitingForUser ? "Your ticket is back in progress." : "") });
    setPending(false);
    // Refresh server components so the new message and updated status render.
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-6">
      <h2 className="text-lg font-semibold mb-1">Add Reply</h2>
      <p className="text-sm text-foreground/60 mb-4">
        {isWaitingForUser
          ? "Please provide the requested information. Once you reply, your ticket moves back to In Progress."
          : "Reply to this ticket with additional details. Your reply is visible to IT staff."}
      </p>

      {feedback && (
        <div
          className={`mb-4 rounded-lg p-4 ${
            feedback.type === "error" ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"
          }`}
        >
          <p className={`text-sm ${feedback.type === "error" ? "text-red-700" : "text-green-700"}`}>
            {feedback.text}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
          maxLength={5000}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          placeholder="Type your reply..."
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || !message.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? (
              <>
                <Spinner size="sm" />
                <span>Sending…</span>
              </>
            ) : (
              "Send Reply"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
