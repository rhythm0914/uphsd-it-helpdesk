// Best-effort, in-memory rate limiter for auth endpoints.
//
// Cloudflare Workers invocations are stateless, so this map resets when the
// Worker cold-starts. It is a best-effort deterrent, not a hard guarantee.
// Supabase Auth enforces its own rate limits on resetPasswordForEmail and
// sign-in, which are the authoritative limits.

type RateLimitKey = string;
type RateLimitEntry = { count: number; windowStart: number };

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5; // per window

const buckets = new Map<RateLimitKey, RateLimitEntry>();

function nowMs(): number {
  return Date.now();
}

function cleanup() {
  const now = nowMs();
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.windowStart > WINDOW_MS) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(key: RateLimitKey): { allowed: boolean; remaining: number } {
  cleanup();

  const entry = buckets.get(key);
  const now = nowMs();

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

export function resetRateLimit(key: RateLimitKey): void {
  buckets.delete(key);
}
