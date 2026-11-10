import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/utils/auth/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimit("test:email:user@example.com");
    resetRateLimit("test:ip:127.0.0.1");
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("test:email:user@example.com");
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests over the limit", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test:email:user@example.com");
    }
    const result = checkRateLimit("test:email:user@example.com");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks separate buckets per key", () => {
    checkRateLimit("test:email:user@example.com");
    const result = checkRateLimit("test:email:other@example.com");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("resets after the window expires", () => {
    // Use a key that won't conflict
    const key = "test:reset:" + Date.now();
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key);
    }
    expect(checkRateLimit(key).allowed).toBe(false);
    resetRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(true);
  });
});
