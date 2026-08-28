// Application-level rate limiting for the AI Assistant.
//
// Workers AI usage draws on a SHARED account allocation (the free tier gives
// a limited daily Neurons budget), so the assistant must be a protected,
// metered resource — not an unlimited chatbot.
//
// IMPLEMENTATION NOTE: limits are enforced in-memory per Worker isolate.
// Cloudflare may run multiple isolates, so in production these limits are
// approximate (each isolate enforces its own window). That is acceptable for
// Phase 8 budget protection; a durable limiter (e.g. Durable Objects or a
// KV/DO counter) can replace this later without changing call sites.

const MAX_PER_DAY = 20;
const MIN_INTERVAL_MS = 5_000;

interface UserRateState {
  /** Timestamps of requests inside the current rolling day-window. */
  timestamps: number[];
  lastRequestAt: number;
}

const globalKey = Symbol.for("uphsd.helpdesk.aiRateLimit");
const store: Map<string, UserRateState> =
  ((globalThis as Record<symbol, unknown>)[globalKey] as Map<string, UserRateState>) ??
  new Map();
(globalThis as Record<symbol, unknown>)[globalKey] = store;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "daily_limit" | "too_fast"; retryAfterSeconds?: number };

export function checkRateLimit(userId: string, now = Date.now()): RateLimitResult {
  const dayAgo = now - 24 * 60 * 60 * 1000;
  let state = store.get(userId);
  if (!state) {
    state = { timestamps: [], lastRequestAt: 0 };
    store.set(userId, state);
  }

  // Drop timestamps outside the rolling window.
  state.timestamps = state.timestamps.filter((t) => t > dayAgo);

  if (state.timestamps.length >= MAX_PER_DAY) {
    return { allowed: false, reason: "daily_limit" };
  }

  const sinceLast = now - state.lastRequestAt;
  if (state.lastRequestAt > 0 && sinceLast < MIN_INTERVAL_MS) {
    return {
      allowed: false,
      reason: "too_fast",
      retryAfterSeconds: Math.ceil((MIN_INTERVAL_MS - sinceLast) / 1000),
    };
  }

  return { allowed: true };
}

/** Records a completed request for the user. */
export function recordRateLimitHit(userId: string, now = Date.now()): void {
  const state = store.get(userId);
  if (state) {
    state.timestamps.push(now);
    state.lastRequestAt = now;
  }
}

/** Test helper: clears all rate-limit state. */
export function resetRateLimits(): void {
  store.clear();
}