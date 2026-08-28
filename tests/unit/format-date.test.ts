import { describe, it, expect } from "vitest";
import { formatDateTime, formatDate } from "@/utils/format-date";

// Regression test for the Philippine-timezone display fix.
//
// Bug: tickets created at 2:39 PM Philippine time (06:39 UTC) rendered as
// "6:39 AM" because display code used the browser-default timezone.
// Fix: explicit timeZone: "Asia/Manila" formatting (utils/format-date.ts).
// These tests pin the exact UTC → Asia/Manila conversion and do NOT depend
// on the machine's local timezone.

describe("formatDateTime (Asia/Manila)", () => {
  it("converts the known 8-hour case: 2026-08-28T06:39:33Z -> 2:39:33 PM", () => {
    // Stored UTC value from the bug report: actual local time was 2:39 PM PHT.
    const out = formatDateTime("2026-08-28T06:39:33Z");
    expect(out).toMatch(/2:39:33\s*PM/i);
    expect(out).toContain("August 28, 2026");
  });

  it("does not shift a timestamp already at Manila midnight", () => {
    // 2026-08-28T16:00:00Z is exactly midnight Aug 29 in Manila (+8).
    const out = formatDateTime("2026-08-28T16:00:00Z");
    expect(out).toContain("August 29, 2026");
    expect(out).toMatch(/12:00:00\s*AM/i);
  });

  it("does not shift a timestamp within the same Manila day", () => {
    const out = formatDateTime("2026-08-28T00:30:00Z");
    // 00:30 UTC = 8:30 AM Manila on the same day.
    expect(out).toContain("August 28, 2026");
    expect(out).toMatch(/8:30:00\s*AM/i);
  });
});

describe("formatDate (Asia/Manila)", () => {
  it("formats the known case date-only", () => {
    expect(formatDate("2026-08-28T06:39:33Z")).toMatch(/Aug 28, 2026|28 Aug 2026/);
  });
});
