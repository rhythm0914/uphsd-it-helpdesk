// SLA targets and due-date maths.
//
// Targets are the brief's placeholders, defined ONCE here so a change is a
// one-line edit rather than a hunt through the UI:
//
//   Urgent  response 4 hours (24/7 clock)   resolve 1 business day
//   High    response 1 business day         resolve 3 business days
//   Normal  response 2 business days        resolve 5 business days
//   Low     response 3 business days        resolve 7 business days
//
// Urgent is the only priority measured on a wall clock: a blocked thesis
// defense cannot wait for Monday 08:00.
//
// TODO(confirm targets): the brief marks these as placeholders. They are
// documented in README.md as unconfirmed.

import {
  addBusinessDays,
  addBusinessMinutes,
  BUSINESS_DAY_MINUTES,
  nextBusinessStart,
} from "@/utils/business-hours";
import type { TicketPriority } from "@/utils/tickets/constants";

export type SlaDelay =
  | { kind: "hours"; hours: number }
  | { kind: "businessDays"; days: number }
  | { kind: "businessHours"; hours: number };

export interface SlaTarget {
  response: SlaDelay;
  resolve: SlaDelay;
}

export const SLA_TARGETS: Record<TicketPriority, SlaTarget> = {
  urgent: {
    response: { kind: "hours", hours: 4 },
    resolve: { kind: "businessDays", days: 1 },
  },
  high: {
    response: { kind: "businessDays", days: 1 },
    resolve: { kind: "businessDays", days: 3 },
  },
  normal: {
    response: { kind: "businessDays", days: 2 },
    resolve: { kind: "businessDays", days: 5 },
  },
  low: {
    response: { kind: "businessDays", days: 3 },
    resolve: { kind: "businessDays", days: 7 },
  },
};

/** The escalation clock for the urgent queue. */
export const URGENT_RESPONSE_HOURS = 4;

export type SlaState = "on_track" | "at_risk" | "breached";

/** Fraction of the target consumed before a ticket is flagged at risk. */
export const SLA_AT_RISK_RATIO = 0.8;

export function applyDelay(startMs: number, delay: SlaDelay): number {
  switch (delay.kind) {
    case "hours":
      // Wall clock: deliberately ignores business hours.
      return startMs + delay.hours * 60 * 60 * 1000;
    case "businessHours":
      return addBusinessMinutes(startMs, delay.hours * 60);
    case "businessDays":
      return addBusinessDays(startMs, delay.days);
  }
}

export interface SlaDueDates {
  responseDueAt: Date;
  resolveDueAt: Date;
}

export function computeDueDates(priority: string, startedAt: Date): SlaDueDates {
  const target = SLA_TARGETS[(priority as TicketPriority) in SLA_TARGETS
    ? (priority as TicketPriority)
    : "normal"];

  return {
    responseDueAt: new Date(applyDelay(startedAt.getTime(), target.response)),
    resolveDueAt: new Date(applyDelay(startedAt.getTime(), target.resolve)),
  };
}

/**
 * How healthy a target is right now.
 *
 * Counts down from the moment the clock started, so a ticket created Friday
 * evening with a 1-business-day target is due Monday, not Saturday.
 */
export function deriveSlaState(
  startedAt: Date,
  dueAt: Date,
  now: Date = new Date(),
  atRiskRatio: number = SLA_AT_RISK_RATIO,
): SlaState {
  const total = dueAt.getTime() - startedAt.getTime();
  const elapsed = now.getTime() - startedAt.getTime();

  if (total <= 0) return now.getTime() >= dueAt.getTime() ? "breached" : "on_track";
  if (elapsed >= total) return "breached";
  if (elapsed < 0) return "on_track";
  return elapsed / total >= atRiskRatio ? "at_risk" : "on_track";
}

export function slaStateLabel(state: SlaState): string {
  switch (state) {
    case "breached":
      return "Overdue";
    case "at_risk":
      return "Due soon";
    default:
      return "On track";
  }
}

export function slaStateBadgeClass(state: SlaState): string {
  switch (state) {
    case "breached":
      return "bg-red-50 text-red-700 border-red-200";
    case "at_risk":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
}

/** Working minutes in a business day, exported for UI copy. */
export const MINUTES_PER_BUSINESS_DAY = BUSINESS_DAY_MINUTES;

/** Exposed so the request form can tell the requester when IT will respond. */
export function describeResponseTarget(priority: string): string {
  const target = SLA_TARGETS[(priority as TicketPriority) in SLA_TARGETS
    ? (priority as TicketPriority)
    : "normal"];

  switch (target.response.kind) {
    case "hours":
      return `within ${target.response.hours} hours`;
    case "businessDays":
      return `within ${target.response.days} business day${target.response.days === 1 ? "" : "s"}`;
    case "businessHours":
      return `within ${target.response.hours} business hours`;
  }
}

/** Anchor helper: the SLA clock starts when the ticket is accepted (or created). */
export function slaStartFor(ticket: { sla_started_at?: string | null; created_at: string }): Date {
  return new Date(ticket.sla_started_at || ticket.created_at);
}

export { nextBusinessStart };
