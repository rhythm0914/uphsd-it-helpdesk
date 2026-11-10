import { describe, it, expect } from "vitest";
import {
  NO_RESPONSE_CLOSE_DAYS,
  NO_RESPONSE_CUTOVER_ISO,
  NO_RESPONSE_REMINDER_DAYS,
  daysUntilAutoClose,
  decideNoResponseAction,
  isNoResponseEligible,
  waitingSince,
} from "@/utils/jobs/no-response";

const CUTOVER = new Date(NO_RESPONSE_CUTOVER_ISO);
const DAY = 24 * 60 * 60 * 1000;

/** A ticket resolved `daysAgo` days after the cutover, evaluated `daysAgo` later. */
function candidate(daysAgo = 0, extra: Record<string, unknown> = {}) {
  const resolvedAt = new Date(CUTOVER.getTime() + daysAgo * DAY).toISOString();
  return {
    status: "resolved",
    resolvedAt,
    awaitingStudentSince: null,
    reminderSentAt: null,
    ...extra,
  };
}

function at(resolvedOffsetDays: number) {
  return new Date(CUTOVER.getTime() + DAY * resolvedOffsetDays);
}

describe("no-response eligibility", () => {
  it("only considers tickets waiting on the requester", () => {
    expect(isNoResponseEligible("resolved")).toBe(true);
    expect(isNoResponseEligible("waiting_for_user")).toBe(true);
    for (const status of ["open", "in_progress", "reopened", "closed", "rejected"]) {
      expect(isNoResponseEligible(status), status).toBe(false);
    }
  });

  it("ignores tickets with no waiting clock", () => {
    expect(decideNoResponseAction({ status: "resolved" }, at(30))).toBe("none");
  });
});

describe("cutover guard", () => {
  it("never closes a ticket that predates the workflow change", () => {
    const legacy = {
      status: "resolved",
      resolvedAt: "2024-01-01T00:00:00.000Z",
      awaitingStudentSince: null,
      reminderSentAt: null,
    };
    expect(decideNoResponseAction(legacy, at(400))).toBe("none");
    expect(decideNoResponseAction(legacy, at(400))).not.toBe("close");
  });
});

describe("timeline", () => {
  const ticket = candidate(0);

  it("does nothing before the reminder threshold", () => {
    expect(decideNoResponseAction(ticket, at(1))).toBe("none");
    expect(decideNoResponseAction(ticket, at(NO_RESPONSE_REMINDER_DAYS - 0.1))).toBe("none");
  });

  it("reminds at 3 days", () => {
    expect(decideNoResponseAction(ticket, at(NO_RESPONSE_REMINDER_DAYS + 0.01))).toBe("remind");
    expect(decideNoResponseAction(ticket, at(4))).toBe("remind");
  });

  it("sends only one reminder per waiting period", () => {
    const reminded = candidate(0, {
      reminderSentAt: new Date(CUTOVER.getTime() + DAY * 3.5).toISOString(),
    });
    expect(decideNoResponseAction(reminded, at(4))).toBe("none");
  });

  it("closes at 5 days, whether or not a reminder was sent", () => {
    expect(decideNoResponseAction(ticket, at(NO_RESPONSE_CLOSE_DAYS + 0.01))).toBe("close");
    const reminded = candidate(0, {
      reminderSentAt: new Date(CUTOVER.getTime() + DAY * 3.5).toISOString(),
    });
    expect(decideNoResponseAction(reminded, at(6))).toBe("close");
  });

  it("treats a reminder from a previous cycle as unsent", () => {
    const reopened = candidate(0, {
      // Reminder went out 6 days before this waiting period started.
      reminderSentAt: new Date(CUTOVER.getTime() - DAY * 5).toISOString(),
    });
    expect(decideNoResponseAction(reopened, at(3.5))).toBe("remind");
  });

  it("uses the later of resolved_at and awaiting_student_since", () => {
    const started = at(1).toISOString();
    const later = at(4).toISOString();
    expect(
      waitingSince({ status: "resolved", resolvedAt: started, awaitingStudentSince: later }),
    ).toBe(at(4).getTime());
    const mixed = {
      status: "resolved",
      resolvedAt: started,
      awaitingStudentSince: later,
      reminderSentAt: null,
    };
    // 0.5 days after the later timestamp: too early for any action.
    expect(decideNoResponseAction(mixed, at(4.5))).toBe("none");
  });

  it("never closes from a status that is not waiting on the requester", () => {
    for (const status of ["open", "in_progress", "reopened", "closed", "rejected"]) {
      expect(decideNoResponseAction({ ...ticket, status }, at(30)), status).toBe("none");
    }
  });

  it("handles Awaiting Student tickets too", () => {
    const waiting = {
      status: "waiting_for_user",
      resolvedAt: null,
      awaitingStudentSince: new Date(CUTOVER.getTime() + DAY).toISOString(),
      reminderSentAt: null,
    };
    expect(decideNoResponseAction(waiting, at(2))).toBe("none");
    expect(decideNoResponseAction(waiting, at(4))).toBe("remind");
    expect(decideNoResponseAction(waiting, at(6))).toBe("close");
  });
});

describe("daysUntilAutoClose", () => {
  it("counts down to the close deadline", () => {
    const ticket = candidate(0);
    expect(daysUntilAutoClose(ticket, at(1))).toBe(4);
    expect(daysUntilAutoClose(ticket, at(4.5))).toBe(1);
    expect(daysUntilAutoClose(ticket, at(9))).toBe(0);
  });

  it("is null when the ticket is not waiting on the requester", () => {
    expect(daysUntilAutoClose({ status: "open", resolvedAt: at(1).toISOString() }, at(2))).toBeNull();
  });
});
