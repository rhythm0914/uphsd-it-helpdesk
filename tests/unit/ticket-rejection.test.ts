import { describe, it, expect } from "vitest";
import {
  REJECTION_CATEGORIES,
  REJECTION_CATEGORY_LABELS,
  allowedActionsFor,
  decideTransition,
  validateTransitionPayload,
} from "@/utils/tickets/constants";

const staff = { role: "it_staff" };
const requester = { role: "student", isRequester: true };

describe("rejection presets", () => {
  it("offers the four required presets plus free text", () => {
    expect(REJECTION_CATEGORIES).toEqual([
      "duplicate",
      "out_of_scope",
      "insufficient_information",
      "not_an_it_issue",
      "other",
    ]);
  });

  it("labels every preset for the requester", () => {
    for (const category of REJECTION_CATEGORIES) {
      expect(REJECTION_CATEGORY_LABELS[category]).toBeTruthy();
    }
    expect(REJECTION_CATEGORY_LABELS.duplicate).toBe("Duplicate request");
    expect(REJECTION_CATEGORY_LABELS.not_an_it_issue).toBe("Not an IT issue");
  });
});

describe("reject action", () => {
  it("requires a reason", () => {
    expect(validateTransitionPayload("reject", {})).toMatch(/reason/i);
    expect(validateTransitionPayload("reject", { reason: "   " })).toMatch(/reason/i);
    expect(validateTransitionPayload("reject", { reason: "Duplicate of IT-2026-000042" })).toBeNull();
  });

  it("is staff-only", () => {
    const result = decideTransition({
      action: "reject",
      status: "open",
      actor: requester,
      payload: { reason: "I do not want this" },
    });
    expect(result.ok).toBe(false);
  });

  it("is allowed from every working status", () => {
    for (const status of ["open", "in_progress", "waiting_for_user", "reopened"] as const) {
      const result = decideTransition({
        action: "reject",
        status,
        actor: staff,
        payload: { reason: "Out of scope" },
      });
      expect(result.ok, `reject should be allowed from ${status}`).toBe(true);
      if (result.ok) expect(result.to).toBe("rejected");
    }
  });

  it("is not allowed from resolved, closed or rejected", () => {
    for (const status of ["resolved", "closed", "rejected"] as const) {
      const result = decideTransition({
        action: "reject",
        status,
        actor: staff,
        payload: { reason: "Out of scope" },
      });
      expect(result.ok, `reject should be denied from ${status}`).toBe(false);
    }
  });

  it("is terminal: no action leaves Rejected", () => {
    expect(allowedActionsFor("rejected", staff)).toEqual([]);
    expect(allowedActionsFor("rejected", requester)).toEqual([]);
    expect(allowedActionsFor("rejected", { isSystem: true })).toEqual([]);
  });

  it("never lets a requester move a rejected ticket", () => {
    for (const action of ["verify_fixed", "report_still_broken", "student_reply"] as const) {
      const result = decideTransition({
        action,
        status: "rejected",
        actor: requester,
        payload: { rating: 5, reason: "x", message: "x" },
      });
      expect(result.ok, `requester must not ${action} a rejected ticket`).toBe(false);
    }
  });
});
