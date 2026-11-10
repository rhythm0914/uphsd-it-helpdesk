import { describe, it, expect } from "vitest";
import {
  TICKET_ACTIONS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_TRANSITIONS,
  allowedActionsFor,
  decideTransition,
  isTicketStatus,
  statusLabel,
  validateTransitionPayload,
  type ActorContext,
  type TicketAction,
  type TicketStatus,
} from "@/utils/tickets/constants";

/**
 * Every allowed and every forbidden transition is exercised here: 10 actions ×
 * 7 statuses × 7 actor shapes. The SQL function mirrors these rules and is the
 * authoritative enforcement point.
 */

const VALID_PAYLOAD: Record<TicketAction, Record<string, unknown>> = {
  assign: { assigned_to: "11111111-1111-1111-1111-111111111111" },
  start_work: {},
  request_info: { message: "Please send the exact error message." },
  student_reply: { message: "Here is the screenshot you asked for." },
  resolve: { resolution_note: "Replaced the faulty network cable." },
  reject: { reason: "Duplicate of IT-2026-000042." },
  verify_fixed: { rating: 5 },
  report_still_broken: { reason: "The connection dropped again this morning." },
  acknowledge_reopen: { reopen_cause: "account_lockout" },
  close_no_response: {},
  escalate: { reason: "Cannot resolve without vendor support." },
  cancel: {},
};

const ACTORS: { label: string; actor: ActorContext; kind: "staff" | "requester" | "system" | null }[] = [
  { label: "it_staff", actor: { role: "it_staff" }, kind: "staff" },
  { label: "admin", actor: { role: "admin" }, kind: "staff" },
  { label: "manager", actor: { role: "manager" }, kind: "staff" },
  { label: "student requester", actor: { role: "student", isRequester: true }, kind: "requester" },
  { label: "employee requester", actor: { role: "employee", isRequester: true }, kind: "requester" },
  { label: "system job", actor: { isSystem: true }, kind: "system" },
  { label: "unrelated student", actor: { role: "student", isRequester: false }, kind: null },
];

describe("canonical status labels", () => {
  it("uses the exact BPMN labels", () => {
    expect(TICKET_STATUS_LABELS.open).toBe("Open");
    expect(TICKET_STATUS_LABELS.in_progress).toBe("Assigned / In Progress");
    expect(TICKET_STATUS_LABELS.waiting_for_user).toBe("Awaiting Student");
    expect(TICKET_STATUS_LABELS.resolved).toBe("Resolved (pending your verification)");
    expect(TICKET_STATUS_LABELS.closed).toBe("Closed");
    expect(TICKET_STATUS_LABELS.reopened).toBe("Reopened");
    expect(TICKET_STATUS_LABELS.rejected).toBe("Rejected");
  });

  it("labels every status and falls back safely", () => {
    for (const status of TICKET_STATUSES) {
      expect(statusLabel(status)).toBe(TICKET_STATUS_LABELS[status]);
      expect(statusLabel(status).length).toBeGreaterThan(0);
    }
    expect(statusLabel("some_legacy_value")).toBe("some legacy value");
    expect(statusLabel(null)).toBe("Unknown");
  });

  it("recognises only the real statuses", () => {
    expect(isTicketStatus("reopened")).toBe(true);
    expect(isTicketStatus("rejected")).toBe(true);
    expect(isTicketStatus("pending")).toBe(false);
    expect(isTicketStatus("completed")).toBe(false);
    expect(isTicketStatus(undefined)).toBe(false);
  });
});

describe("transition table integrity", () => {
  it("only references real statuses and actors", () => {
    for (const action of TICKET_ACTIONS) {
      const spec = TICKET_TRANSITIONS[action];
      expect(spec.from.length).toBeGreaterThan(0);
      for (const status of spec.from) {
        expect(isTicketStatus(status)).toBe(true);
      }
      if (spec.to !== "auto") {
        expect(isTicketStatus(spec.to)).toBe(true);
      }
      for (const kind of spec.actor) {
        expect(["staff", "requester", "system"]).toContain(kind);
      }
    }
  });

  it("keeps closed and rejected terminal", () => {
    for (const action of TICKET_ACTIONS) {
      expect(TICKET_TRANSITIONS[action].from).not.toContain("closed");
      expect(TICKET_TRANSITIONS[action].from).not.toContain("rejected");
    }
  });
});

describe("every action × status × actor", () => {
  for (const action of TICKET_ACTIONS) {
    for (const status of TICKET_STATUSES) {
      for (const { label, actor, kind } of ACTORS) {
        const spec = TICKET_TRANSITIONS[action];
        const expectedOk =
          kind !== null && spec.from.includes(status) && spec.actor.includes(kind);

        it(`${action} from ${status} as ${label} => ${expectedOk ? "allowed" : "denied"}`, () => {
          const result = decideTransition({
            action,
            status,
            actor,
            payload: VALID_PAYLOAD[action],
            assignedTo: null,
          });

          expect(result.ok).toBe(expectedOk);

          if (result.ok) {
            expect(result.to).toBe(spec.to === "auto" ? "open" : spec.to);
            expect(result.from).toBe(status);
          } else {
            expect(result.error.length).toBeGreaterThan(0);
          }
        });
      }
    }
  }
});

describe("core BPMN invariants", () => {
  it("no staff actor can ever move a ticket to Closed", () => {
    for (const action of TICKET_ACTIONS) {
      for (const status of TICKET_STATUSES) {
        for (const { actor, kind } of ACTORS) {
          if (kind !== "staff") continue;
          const result = decideTransition({
            action,
            status,
            actor,
            payload: VALID_PAYLOAD[action],
            assignedTo: null,
          });
          if (result.ok) expect(result.to).not.toBe("closed");
        }
      }
    }
  });

  it("only the requester can verify a fix or reopen", () => {
    for (const { label, actor, kind } of ACTORS) {
      if (kind === "requester") continue;
      for (const action of ["verify_fixed", "report_still_broken"] as const) {
        const result = decideTransition({
          action,
          status: "resolved",
          actor,
          payload: VALID_PAYLOAD[action],
        });
        expect(result.ok, `${action} must be denied for ${label}`).toBe(false);
      }
    }
  });

  it("only the automated job can auto-close for no response", () => {
    for (const { label, actor, kind } of ACTORS) {
      if (kind === "system") continue;
      for (const status of ["resolved", "waiting_for_user"] as TicketStatus[]) {
        const result = decideTransition({
          action: "close_no_response",
          status,
          actor,
          payload: {},
        });
        expect(result.ok, `close_no_response must be denied for ${label}`).toBe(false);
      }
    }
  });

  it("a requester reply returns to Open when nobody is assigned", () => {
    const unassigned = decideTransition({
      action: "student_reply",
      status: "waiting_for_user",
      actor: { role: "student", isRequester: true },
      payload: { message: "Details attached." },
      assignedTo: null,
    });
    expect(unassigned.ok && unassigned.to).toBe("open");

    const assigned = decideTransition({
      action: "student_reply",
      status: "waiting_for_user",
      actor: { role: "student", isRequester: true },
      payload: { message: "Details attached." },
      assignedTo: "11111111-1111-1111-1111-111111111111",
    });
    expect(assigned.ok && assigned.to).toBe("in_progress");
  });

  it("verification records the Verified Fixed closure reason", () => {
    const result = decideTransition({
      action: "verify_fixed",
      status: "resolved",
      actor: { role: "student", isRequester: true },
      payload: { rating: 4 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.to).toBe("closed");
      expect(result.closureReason).toBe("verified_fixed");
    }
  });

  it("no-response close records the No Response closure reason", () => {
    const result = decideTransition({
      action: "close_no_response",
      status: "resolved",
      actor: { isSystem: true },
      payload: {},
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.to).toBe("closed");
      expect(result.closureReason).toBe("no_response");
    }
  });

  it("reopening stays on the same ticket and lands in Reopened", () => {
    const result = decideTransition({
      action: "report_still_broken",
      status: "resolved",
      actor: { role: "student", isRequester: true },
      payload: { reason: "It broke again." },
    });
    expect(result.ok && result.to).toBe("reopened");
  });

  it("offers no actions on terminal statuses", () => {
    for (const status of ["closed", "rejected"] as TicketStatus[]) {
      expect(allowedActionsFor(status, { role: "it_staff" })).toEqual([]);
      expect(allowedActionsFor(status, { role: "student", isRequester: true })).toEqual([]);
      expect(allowedActionsFor(status, { isSystem: true })).toEqual([]);
    }
  });
});

describe("payload requirements", () => {
  it("requires a resolution note", () => {
    expect(validateTransitionPayload("resolve", {})).toMatch(/resolution note/i);
    expect(validateTransitionPayload("resolve", { resolution_note: "   " })).toMatch(
      /resolution note/i,
    );
    expect(validateTransitionPayload("resolve", { resolution_note: "Fixed" })).toBeNull();
  });

  it("requires a rejection reason", () => {
    expect(validateTransitionPayload("reject", {})).toMatch(/reason/i);
    expect(validateTransitionPayload("reject", { reason: "Out of scope" })).toBeNull();
  });

  it("requires a message for information requests and replies", () => {
    expect(validateTransitionPayload("request_info", {})).toMatch(/message/i);
    expect(validateTransitionPayload("student_reply", { message: "ok" })).toBeNull();
  });

  it("requires a satisfaction rating from 1 to 5", () => {
    expect(validateTransitionPayload("verify_fixed", {})).toMatch(/rating/i);
    expect(validateTransitionPayload("verify_fixed", { rating: 0 })).toMatch(/rating/i);
    expect(validateTransitionPayload("verify_fixed", { rating: 6 })).toMatch(/rating/i);
    expect(validateTransitionPayload("verify_fixed", { rating: 2.5 })).toMatch(/rating/i);
    expect(validateTransitionPayload("verify_fixed", { rating: 3 })).toBeNull();
  });

  it("rejects an unknown action", () => {
    const result = decideTransition({
      action: "set_status",
      status: "open",
      actor: { role: "admin" },
      payload: {},
    });
    expect(result.ok).toBe(false);
  });
});
