// Pure rules for the automated "no response" pass.
//
// The job itself runs inside Postgres (public.run_no_response_job), called by
// the Cloudflare cron handler. The rules live here as well so they are
// unit-tested without a database and so the UI can explain exactly when a
// request will be closed.
//
// Timeline (from the moment the ticket starts waiting on the requester):
//   day 0   IT marks it Resolved, or asks for more information
//   day 3   one reminder is sent
//   day 5   closed as "No Response" — NOT counted as a verified fix
//
// The clock is wall-clock time, not business hours: the requester can reply at
// any hour, so pausing the countdown overnight would be unfair to no one and
// would make the deadline unpredictable.

import type { TicketStatus } from "@/utils/tickets/constants";

export const NO_RESPONSE_REMINDER_DAYS = 3;
export const NO_RESPONSE_CLOSE_DAYS = 5;

/**
 * Tickets that entered the workflow before this instant are never auto-closed.
 *
 * Phase 1 migrated every legacy staff-closed ticket to Resolved because no
 * requester confirmation exists for it. Without this guard the first run of the
 * job would re-close years of historical tickets the same day it is deployed.
 */
export const NO_RESPONSE_CUTOVER_ISO = "2026-11-11T00:00:00.000Z";

const DAY_MS = 24 * 60 * 60 * 1000;

export type NoResponseAction = "none" | "remind" | "close";

/** Statuses in which the help desk is waiting on the requester. */
export const NO_RESPONSE_ELIGIBLE_STATUSES: readonly TicketStatus[] = [
  "resolved",
  "waiting_for_user",
];

export interface NoResponseCandidate {
  status: string;
  /** Set when a technician marked the ticket Resolved. */
  resolvedAt?: string | null;
  /** Set while the ticket is Awaiting Student. */
  awaitingStudentSince?: string | null;
  /** When the last reminder went out (compared against this cycle's start). */
  reminderSentAt?: string | null;
}

function parse(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * When this waiting period started. A reopened ticket clears `resolved_at`
 * and restarts `sla_started_at`, so the newer of the two timestamps is always
 * the current cycle.
 */
export function waitingSince(candidate: NoResponseCandidate): number | null {
  const resolved = parse(candidate.resolvedAt);
  const awaiting = parse(candidate.awaitingStudentSince);
  if (resolved === null) return awaiting;
  if (awaiting === null) return resolved;
  return Math.max(resolved, awaiting);
}

export function isNoResponseEligible(status: string): boolean {
  return (NO_RESPONSE_ELIGIBLE_STATUSES as readonly string[]).includes(status);
}

/**
 * Decide what the job should do with one ticket.
 *
 * Returns `"close"` only when the full 5 days have elapsed, `"remind"` when the
 * 3-day mark has passed and this cycle has not been reminded yet, and `"none"`
 * otherwise. A reminder from a previous cycle never suppresses the current one.
 */
export function decideNoResponseAction(
  candidate: NoResponseCandidate,
  now: Date = new Date(),
  cutover: Date = new Date(NO_RESPONSE_CUTOVER_ISO),
): NoResponseAction {
  if (!isNoResponseEligible(candidate.status)) return "none";

  const start = waitingSince(candidate);
  if (start === null) return "none";

  // Never touch anything that predates the workflow change.
  if (start < cutover.getTime()) return "none";

  const elapsed = now.getTime() - start;
  if (elapsed < 0) return "none";

  if (elapsed >= NO_RESPONSE_CLOSE_DAYS * DAY_MS) return "close";

  if (elapsed >= NO_RESPONSE_REMINDER_DAYS * DAY_MS) {
    const reminded = parse(candidate.reminderSentAt);
    const remindedThisCycle = reminded !== null && reminded >= start;
    return remindedThisCycle ? "none" : "remind";
  }

  return "none";
}

/** Whole days remaining before the automatic close, for requester-facing copy. */
export function daysUntilAutoClose(
  candidate: NoResponseCandidate,
  now: Date = new Date(),
): number | null {
  const start = waitingSince(candidate);
  if (start === null || !isNoResponseEligible(candidate.status)) return null;
  const remaining = start + NO_RESPONSE_CLOSE_DAYS * DAY_MS - now.getTime();
  return remaining <= 0 ? 0 : Math.ceil(remaining / DAY_MS);
}
