import { describe, it, expect } from "vitest";
import {
  addBusinessDays,
  addBusinessMinutes,
  businessDaysBetween,
  isBusinessDay,
  isWithinBusinessHours,
  nextBusinessStart,
} from "@/utils/business-hours";
import {
  SLA_TARGETS,
  URGENT_RESPONSE_HOURS,
  computeDueDates,
  deriveSlaState,
  describeResponseTarget,
} from "@/utils/tickets/sla";

// Manila is UTC+8. These are plain UTC instants chosen so the Manila
// wall-clock reading is obvious.
const utc = (iso: string) => Date.parse(iso);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("Asia/Manila business hours", () => {
  it("treats Monday 10:00 Manila (02:00Z) as open", () => {
    const monday10 = utc("2026-11-09T02:00:00Z");
    expect(new Date(monday10).getUTCDay()).toBe(1);
    expect(isBusinessDay(monday10)).toBe(true);
    expect(isWithinBusinessHours(monday10)).toBe(true);
  });

  it("is closed before 08:00 and after 17:00 Manila", () => {
    expect(isWithinBusinessHours(utc("2026-11-09T23:30:00Z"))).toBe(false); // Mon 07:30
    expect(isWithinBusinessHours(utc("2026-11-09T00:00:00Z"))).toBe(true); // Mon 08:00
    expect(isWithinBusinessHours(utc("2026-11-09T08:59:00Z"))).toBe(true); // Mon 16:59
    expect(isWithinBusinessHours(utc("2026-11-09T09:00:00Z"))).toBe(false); // Mon 17:00
  });

  it("is closed all weekend", () => {
    expect(isBusinessDay(utc("2026-11-07T02:00:00Z"))).toBe(false); // Saturday
    expect(isBusinessDay(utc("2026-11-08T02:00:00Z"))).toBe(false); // Sunday
  });

  it("snaps an after-hours instant to the next weekday 08:00", () => {
    // Friday 18:00 Manila -> Monday 08:00 Manila.
    const fridayEvening = utc("2026-11-06T10:00:00Z");
    expect(nextBusinessStart(fridayEvening)).toBe(utc("2026-11-09T00:00:00Z"));
  });

  it("leaves an in-hours instant unchanged", () => {
    const monday10 = utc("2026-11-09T02:00:00Z");
    expect(nextBusinessStart(monday10)).toBe(monday10);
  });
});

describe("addBusinessMinutes", () => {
  it("adds minutes inside one working day", () => {
    const monday10 = utc("2026-11-09T02:00:00Z");
    expect(addBusinessMinutes(monday10, 60)).toBe(monday10 + HOUR);
  });

  it("rolls over the evening into the next morning", () => {
    const monday1630 = utc("2026-11-09T08:30:00Z");
    // 60 working minutes: 30 today + 30 tomorrow from 08:00.
    expect(addBusinessMinutes(monday1630, 60)).toBe(utc("2026-11-10T00:30:00Z"));
  });

  it("skips the weekend", () => {
    const friday1630 = utc("2026-11-06T08:30:00Z");
    // 30 minutes on Friday, then Monday 08:00-08:30.
    expect(addBusinessMinutes(friday1630, 60)).toBe(utc("2026-11-09T00:30:00Z"));
  });
});

describe("addBusinessDays", () => {
  it("skips weekends and keeps the time of day", () => {
    const friday10 = utc("2026-11-06T02:00:00Z");
    expect(addBusinessDays(friday10, 1)).toBe(utc("2026-11-09T02:00:00Z")); // Monday
    expect(addBusinessDays(friday10, 2)).toBe(utc("2026-11-10T02:00:00Z")); // Tuesday
  });

  it("counts five business days from Monday to the next Monday", () => {
    const monday10 = utc("2026-11-09T02:00:00Z");
    expect(addBusinessDays(monday10, 5)).toBe(utc("2026-11-16T02:00:00Z"));
  });

  it("starts from the next open moment when given an after-hours time", () => {
    // Saturday 10:00 Manila -> Monday 08:00 + 1 business day = Tuesday 08:00.
    const saturday = utc("2026-11-07T02:00:00Z");
    expect(addBusinessDays(saturday, 1)).toBe(utc("2026-11-10T00:00:00Z"));
  });

  it("counts working days between instants", () => {
    expect(
      businessDaysBetween(utc("2026-11-09T02:00:00Z"), utc("2026-11-13T02:00:00Z")),
    ).toBe(4);
  });
});

describe("SLA targets", () => {
  it("uses the brief's priorities", () => {
    expect(SLA_TARGETS.urgent.response).toEqual({ kind: "hours", hours: 4 });
    expect(SLA_TARGETS.urgent.resolve).toEqual({ kind: "businessDays", days: 1 });
    expect(SLA_TARGETS.high.resolve).toEqual({ kind: "businessDays", days: 3 });
    expect(SLA_TARGETS.normal.resolve).toEqual({ kind: "businessDays", days: 5 });
    expect(URGENT_RESPONSE_HOURS).toBe(4);
  });

  it("gives urgent a 24/7 response clock, not a business-hours one", () => {
    // Friday 16:00 Manila + 4h = Friday 20:00 Manila, not Monday.
    const friday16 = utc("2026-11-06T08:00:00Z");
    const { responseDueAt } = computeDueDates("urgent", new Date(friday16));
    expect(responseDueAt.toISOString()).toBe("2026-11-06T12:00:00.000Z");
  });

  it("moves normal requests across the weekend", () => {
    const friday10 = new Date(utc("2026-11-06T02:00:00Z"));
    const { responseDueAt, resolveDueAt } = computeDueDates("normal", friday10);
    // 2 business days: Tue 10:00; 5 business days: Fri 10:00.
    expect(responseDueAt.toISOString()).toBe("2026-11-10T02:00:00.000Z");
    expect(resolveDueAt.toISOString()).toBe("2026-11-13T02:00:00.000Z");
  });

  it("falls back to normal for an unknown priority", () => {
    const start = new Date(utc("2026-11-09T02:00:00Z"));
    expect(computeDueDates("nonsense", start)).toEqual(computeDueDates("normal", start));
  });
});

describe("deriveSlaState", () => {
  const start = new Date(utc("2026-11-09T02:00:00Z"));
  const due = new Date(start.getTime() + 10 * HOUR);

  it("is on track early", () => {
    expect(deriveSlaState(start, due, new Date(start.getTime() + HOUR))).toBe("on_track");
  });

  it("warns when 80% consumed", () => {
    expect(deriveSlaState(start, due, new Date(start.getTime() + 8 * HOUR))).toBe("at_risk");
  });

  it("breaches at the deadline", () => {
    expect(deriveSlaState(start, due, due)).toBe("breached");
    expect(deriveSlaState(start, due, new Date(due.getTime() + DAY))).toBe("breached");
  });
});

describe("describeResponseTarget", () => {
  it("phrases each priority for the request form", () => {
    expect(describeResponseTarget("urgent")).toBe("within 4 hours");
    expect(describeResponseTarget("high")).toBe("within 1 business day");
    expect(describeResponseTarget("normal")).toBe("within 2 business days");
  });
});
