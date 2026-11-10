import { describe, it, expect } from "vitest";
import { isPinned, sortQueueTickets, type QueueOrderable } from "@/utils/tickets/queue-order";

function row(
  status: string,
  priority: string,
  created_at: string,
  id = `${status}-${priority}-${created_at}`,
): QueueOrderable & { id: string } {
  return { id, status, priority, created_at };
}

describe("sortQueueTickets", () => {
  it("puts reopened tickets ahead of everything else", () => {
    const rows = [
      row("in_progress", "urgent", "2026-11-10T10:00:00Z", "a"),
      row("reopened", "low", "2026-11-01T10:00:00Z", "b"),
      row("open", "urgent", "2026-11-09T10:00:00Z", "c"),
    ];
    expect(sortQueueTickets(rows).map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("orders by priority when status weight ties", () => {
    const rows = [
      row("in_progress", "normal", "2026-11-10T10:00:00Z", "normal"),
      row("in_progress", "urgent", "2026-11-01T10:00:00Z", "urgent"),
      row("in_progress", "high", "2026-11-05T10:00:00Z", "high"),
      row("in_progress", "low", "2026-11-09T10:00:00Z", "low"),
    ];
    expect(sortQueueTickets(rows).map((r) => r.id)).toEqual([
      "urgent",
      "high",
      "normal",
      "low",
    ]);
  });

  it("orders newest first when status and priority tie", () => {
    const rows = [
      row("open", "normal", "2026-11-01T10:00:00Z", "old"),
      row("open", "normal", "2026-11-10T10:00:00Z", "new"),
      row("open", "normal", "2026-11-05T10:00:00Z", "mid"),
    ];
    expect(sortQueueTickets(rows).map((r) => r.id)).toEqual(["new", "mid", "old"]);
  });

  it("does not mutate the input array", () => {
    const rows = [
      row("open", "low", "2026-11-01T10:00:00Z", "a"),
      row("reopened", "low", "2026-11-01T10:00:00Z", "b"),
    ];
    const snapshot = [...rows];
    sortQueueTickets(rows);
    expect(rows).toEqual(snapshot);
  });

  it("keeps unknown statuses and priorities deterministic and last", () => {
    const rows = [
      row("mystery", "normal", "2026-11-10T10:00:00Z", "unknown-status"),
      row("open", "mystery", "2026-11-09T10:00:00Z", "unknown-priority"),
      row("open", "normal", "2026-11-08T10:00:00Z", "known"),
    ];
    // Unknown statuses sort with the normal group; unknown priorities sort last.
    expect(sortQueueTickets(rows).map((r) => r.id)).toEqual([
      "unknown-status",
      "known",
      "unknown-priority",
    ]);
  });
});

describe("isPinned", () => {
  it("pins reopened and urgent tickets", () => {
    expect(isPinned({ status: "reopened", priority: "low", created_at: "" })).toBe(true);
    expect(isPinned({ status: "open", priority: "urgent", created_at: "" })).toBe(true);
  });

  it("does not pin ordinary tickets", () => {
    expect(isPinned({ status: "open", priority: "normal", created_at: "" })).toBe(false);
    expect(isPinned({ status: "resolved", priority: "high", created_at: "" })).toBe(false);
  });
});
