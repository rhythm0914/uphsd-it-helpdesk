// Input validation for the assistant endpoint. Pure functions so they are
// unit-testable without any runtime (no Supabase, no Worker env).

import type { ChatMessage } from "./provider";

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_HISTORY_MESSAGES = 10;
export const MAX_HISTORY_MESSAGE_LENGTH = 2000;

export interface ValidatedAssistantRequest {
  message: string;
  history: ChatMessage[];
}

export type ValidationError =
  | "malformed"
  | "empty_message"
  | "message_too_long"
  | "history_too_long"
  | "history_message_too_long"
  | "invalid_history";

/**
 * Validates the client payload. Never trusts anything the client sends:
 * roles in history are coerced (only user/assistant are accepted), and
 * every string is length-checked before it can reach the model.
 */
export function validateAssistantRequest(
  body: unknown,
): { ok: true; value: ValidatedAssistantRequest } | { ok: false; error: ValidationError } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "malformed" };
  }

  const { message, history } = body as Record<string, unknown>;

  if (typeof message !== "string") return { ok: false, error: "malformed" };
  const trimmed = message.trim();
  if (!trimmed) return { ok: false, error: "empty_message" };
  if (trimmed.length > MAX_MESSAGE_LENGTH) return { ok: false, error: "message_too_long" };

  if (history === undefined) {
    return { ok: true, value: { message: trimmed, history: [] } };
  }
  if (!Array.isArray(history)) return { ok: false, error: "malformed" };
  if (history.length > MAX_HISTORY_MESSAGES) return { ok: false, error: "history_too_long" };

  const validatedHistory: ChatMessage[] = [];
  for (const entry of history) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: "malformed" };
    }
    const { role, content } = entry as Record<string, unknown>;
    // Only user/assistant turns may come from the client. A client-submitted
    // "system" role is rejected outright — the system prompt is server-owned.
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return { ok: false, error: "invalid_history" };
    }
    if (!content.trim()) return { ok: false, error: "invalid_history" };
    if (content.length > MAX_HISTORY_MESSAGE_LENGTH) {
      return { ok: false, error: "history_message_too_long" };
    }
    validatedHistory.push({ role, content: content.trim() });
  }

  return { ok: true, value: { message: trimmed, history: validatedHistory } };
}