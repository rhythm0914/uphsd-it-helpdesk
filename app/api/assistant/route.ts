// POST /api/assistant — server-side AI Assistant endpoint.
//
// SECURITY MODEL:
//   * Identity comes ONLY from the Supabase session (cookies). Nothing in
//     the request body can influence identity, role, or data access.
//   * Unauthenticated callers get 401.
//   * Input is validated and length-capped before reaching the model.
//   * Per-user application-level rate limiting protects the shared Workers
//     AI allocation.
//   * Only PUBLISHED knowledge articles are retrieved and sent as context.
//   * No secrets, env values, or internal errors are ever returned.
//   * The model can never perform actions — it only produces text.

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import {
  AIUnavailableError,
  buildMessages,
  checkRateLimit,
  getChatProvider,
  recordRateLimitHit,
  retrieveKnowledge,
  validateAssistantRequest,
  type ValidationError,
} from "@/utils/ai";

const FRIENDLY_UNAVAILABLE =
  "The AI Assistant is temporarily unavailable. You can still submit an IT request through the Help Desk.";

function statusForValidationError(error: ValidationError): number {
  switch (error) {
    case "empty_message":
    case "malformed":
    case "invalid_history":
      return 400;
    case "message_too_long":
    case "history_too_long":
    case "history_message_too_long":
      return 413;
  }
}

export async function POST(request: Request) {
  // 1) Authentication — session only, never the request body.
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // 2) Parse + validate the payload.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = validateAssistantRequest(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Invalid request", reason: validated.error },
      { status: statusForValidationError(validated.error) },
    );
  }

  // 3) Per-user rate limiting (shared Workers AI allocation protection).
  const rate = checkRateLimit(user.id);
  if (!rate.allowed) {
    const message =
      rate.reason === "daily_limit"
        ? "You have reached today's AI Assistant limit. The full Help Desk is still available — please submit an IT request if you need help."
        : "Please wait a few seconds before sending another message.";
    return NextResponse.json(
      { error: message },
      { status: 429, headers: rate.retryAfterSeconds ? { "Retry-After": String(rate.retryAfterSeconds) } : undefined },
    );
  }

  // 4) Retrieve relevant published knowledge (never throws).
  const articles = await retrieveKnowledge(supabase, validated.value.message);

  // 5) Build the server-owned prompt and call the AI provider.
  const messages = buildMessages(
    validated.value.history,
    validated.value.message,
    articles,
  );

  try {
    const provider = getChatProvider();
    const result = await provider.generateChat(messages);

    // Count the request only after a successful generation so failures do
    // not consume the user's daily budget.
    recordRateLimitHit(user.id);

    return NextResponse.json({
      reply: result.text,
      sources: articles.map((a) => ({ title: a.title, slug: a.slug })),
    });
  } catch (error) {
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: FRIENDLY_UNAVAILABLE }, { status: 503 });
    }
    // Never leak raw errors or stack traces to the client.
    console.error("Assistant generation failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: FRIENDLY_UNAVAILABLE }, { status: 502 });
  }
}