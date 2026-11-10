// Single source of truth for the ticket workflow.
//
// Everything that names a status, an action, a closure reason, a rejection
// reason or a priority imports from here. Nothing else may hard-code a status
// string.
//
// Note on database identifiers: Postgres enum labels cannot be renamed, so the
// stored values `in_progress` and `waiting_for_user` are kept from the original
// schema. Their canonical BPMN labels are "Assigned / In Progress" and
// "Awaiting Student" and are defined ONCE below. New values `reopened` and
// `rejected` were added by the Phase 1 migration.
//
// This module is dependency-free (it only reads role constants) so it can be
// imported from Server Actions, Client Components and unit tests alike.

import { isITStaff } from "@/utils/authorization";

/* -------------------------------------------------------------------------- */
/* Statuses                                                                   */
/* -------------------------------------------------------------------------- */

export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "waiting_for_user",
  "resolved",
  "closed",
  "reopened",
  "rejected",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Exact user-facing labels from the BPMN spec. */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "Assigned / In Progress",
  waiting_for_user: "Awaiting Student",
  resolved: "Resolved (pending your verification)",
  closed: "Closed",
  reopened: "Reopened",
  rejected: "Rejected",
};

/** Compact labels for dense tables and filters. */
export const TICKET_STATUS_SHORT_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "Assigned / In Progress",
  waiting_for_user: "Awaiting Student",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
  rejected: "Rejected",
};

export const TICKET_STATUS_BADGE: Record<TicketStatus, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  waiting_for_user: "bg-orange-50 text-orange-700 border-orange-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-gray-50 text-gray-700 border-gray-200",
  reopened: "bg-purple-50 text-purple-700 border-purple-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export const DEFAULT_STATUS_BADGE = "bg-gray-50 text-gray-700 border-gray-200";

/** Statuses that are finished for good. */
export const TERMINAL_STATUSES: readonly TicketStatus[] = ["closed", "rejected"];

export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && (TICKET_STATUSES as readonly string[]).includes(value);
}

export function statusLabel(
  status: string | null | undefined,
  opts: { short?: boolean } = {},
): string {
  if (!status) return "Unknown";
  if (isTicketStatus(status)) {
    return (opts.short ? TICKET_STATUS_SHORT_LABELS : TICKET_STATUS_LABELS)[status];
  }
  return status.replace(/_/g, " ");
}

export function statusBadgeClass(status: string | null | undefined): string {
  return isTicketStatus(status) ? TICKET_STATUS_BADGE[status] : DEFAULT_STATUS_BADGE;
}

/* -------------------------------------------------------------------------- */
/* Closure and rejection reasons                                              */
/* -------------------------------------------------------------------------- */

export const CLOSURE_REASONS = [
  "verified_fixed",
  "no_response",
  // Written only by the one-off legacy retirement (supabase/one-off/). No
  // transition action produces it: closing without verification is a
  // historical cleanup, not a step in the workflow.
  "administrative_closure",
] as const;
export type ClosureReason = (typeof CLOSURE_REASONS)[number];

export const CLOSURE_REASON_LABELS: Record<ClosureReason, string> = {
  verified_fixed: "Verified Fixed",
  no_response: "No Response",
  administrative_closure: "Closed administratively (not verified)",
};

export const REJECTION_CATEGORIES = [
  "duplicate",
  "out_of_scope",
  "insufficient_information",
  "not_an_it_issue",
  "other",
] as const;
export type RejectionCategory = (typeof REJECTION_CATEGORIES)[number];

export const REJECTION_CATEGORY_LABELS: Record<RejectionCategory, string> = {
  duplicate: "Duplicate request",
  out_of_scope: "Out of scope",
  insufficient_information: "Insufficient information",
  not_an_it_issue: "Not an IT issue",
  other: "Other (explain below)",
};

export function isClosureReason(value: unknown): value is ClosureReason {
  return typeof value === "string" && (CLOSURE_REASONS as readonly string[]).includes(value);
}

export function isRejectionCategory(value: unknown): value is RejectionCategory {
  return typeof value === "string" && (REJECTION_CATEGORIES as readonly string[]).includes(value);
}

export function closureReasonLabel(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return isClosureReason(reason) ? CLOSURE_REASON_LABELS[reason] : reason.replace(/_/g, " ");
}

/* -------------------------------------------------------------------------- */
/* Priorities                                                                 */
/* -------------------------------------------------------------------------- */

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export function isTicketPriority(value: unknown): value is TicketPriority {
  return typeof value === "string" && (TICKET_PRIORITIES as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* Actions and the state machine                                              */
/* -------------------------------------------------------------------------- */

export const TICKET_ACTIONS = [
  "assign",
  "start_work",
  "request_info",
  "student_reply",
  "resolve",
  "reject",
  "verify_fixed",
  "report_still_broken",
  "acknowledge_reopen",
  "close_no_response",
] as const;

export type TicketAction = (typeof TICKET_ACTIONS)[number];

export type ActorKind = "staff" | "requester" | "system";

export type PayloadField =
  | "assigned_to"
  | "message"
  | "resolution_note"
  | "reason"
  | "rating";

interface TransitionSpec {
  /** Statuses this action may be taken from. */
  from: readonly TicketStatus[];
  /**
   * Resulting status. `"auto"` means the target depends on the ticket state
   * (a requester reply returns to Open when nobody was assigned yet, otherwise
   * it resumes Assigned / In Progress).
   */
  to: TicketStatus | "auto";
  /** Which actors may perform it. */
  actor: readonly ActorKind[];
  /** Payload fields that must be present and valid. */
  requires: readonly PayloadField[];
}

/**
 * The complete transition table. This is the ONLY allowed-transition list.
 *
 * Invariants encoded here:
 *  - `staff` may never move a ticket to `closed`. Staff can only reach
 *    `resolved`; only the requester (verify_fixed) or the automated
 *    no-response job (close_no_response) closes a ticket.
 *  - Only the requester may reopen (`report_still_broken`), and only from
 *    `resolved`.
 *  - `rejected` and `closed` are terminal: no action leaves them.
 *  - `reopened` cannot be skipped past — staff must acknowledge it into
 *    Assigned / In Progress (or assign/resolve/request info/reject it).
 */
export const TICKET_TRANSITIONS: Record<TicketAction, TransitionSpec> = {
  assign: {
    from: ["open", "in_progress", "reopened"],
    to: "in_progress",
    actor: ["staff"],
    requires: ["assigned_to"],
  },
  start_work: {
    from: ["open", "reopened"],
    to: "in_progress",
    actor: ["staff"],
    requires: [],
  },
  request_info: {
    from: ["open", "in_progress", "reopened"],
    to: "waiting_for_user",
    actor: ["staff"],
    requires: ["message"],
  },
  student_reply: {
    from: ["waiting_for_user"],
    to: "auto",
    actor: ["requester"],
    requires: ["message"],
  },
  resolve: {
    from: ["open", "in_progress", "reopened"],
    to: "resolved",
    actor: ["staff"],
    requires: ["resolution_note"],
  },
  reject: {
    from: ["open", "in_progress", "waiting_for_user", "reopened"],
    to: "rejected",
    actor: ["staff"],
    requires: ["reason"],
  },
  verify_fixed: {
    from: ["resolved"],
    to: "closed",
    actor: ["requester"],
    requires: ["rating"],
  },
  report_still_broken: {
    from: ["resolved"],
    to: "reopened",
    actor: ["requester"],
    requires: ["reason"],
  },
  acknowledge_reopen: {
    from: ["reopened"],
    to: "in_progress",
    actor: ["staff"],
    requires: [],
  },
  close_no_response: {
    from: ["resolved", "waiting_for_user"],
    to: "closed",
    actor: ["system"],
    requires: [],
  },
};

export function isTicketAction(value: unknown): value is TicketAction {
  return typeof value === "string" && (TICKET_ACTIONS as readonly string[]).includes(value);
}

export interface ActorContext {
  /** Role from `public.profiles.role`. */
  role?: string | null;
  /** True when the actor is the ticket's requester. */
  isRequester?: boolean;
  /** True for the scheduled no-response / escalation jobs. */
  isSystem?: boolean;
}

export function actorKindOf(actor: ActorContext): ActorKind | null {
  if (actor.isSystem) return "system";
  if (isITStaff(actor.role)) return "staff";
  if (actor.isRequester) return "requester";
  return null;
}

/** Actions the given actor may take on a ticket in the given status. */
export function allowedActionsFor(
  status: string,
  actor: ActorContext,
): TicketAction[] {
  const kind = actorKindOf(actor);
  if (!kind || !isTicketStatus(status)) return [];
  return TICKET_ACTIONS.filter((action) => {
    const spec = TICKET_TRANSITIONS[action];
    return spec.from.includes(status) && spec.actor.includes(kind);
  });
}

export function canPerformAction(
  action: string,
  status: string,
  actor: ActorContext,
): action is TicketAction {
  if (!isTicketAction(action) || !isTicketStatus(status)) return false;
  const kind = actorKindOf(actor);
  if (!kind) return false;
  const spec = TICKET_TRANSITIONS[action];
  return spec.from.includes(status) && spec.actor.includes(kind);
}

/* -------------------------------------------------------------------------- */
/* Payload validation                                                         */
/* -------------------------------------------------------------------------- */

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validate the payload required by an action. Returns a human-readable error,
 * or null when the payload is acceptable. Mirrored server-side in the
 * `transition_ticket` SQL function, which is authoritative.
 */
export function validateTransitionPayload(
  action: TicketAction,
  payload: Record<string, unknown> = {},
): string | null {
  const requires = TICKET_TRANSITIONS[action].requires;

  if (requires.includes("assigned_to") && !nonEmptyString(payload.assigned_to)) {
    return "Select a technician to assign this request to.";
  }
  if (requires.includes("message")) {
    const message = nonEmptyString(payload.message);
    if (!message) return "A message is required.";
    if (message.length > 5000) return "Message is too long.";
  }
  if (requires.includes("resolution_note")) {
    const note = nonEmptyString(payload.resolution_note);
    if (!note) return "A short resolution note is required.";
    if (note.length > 2000) return "Resolution note is too long.";
  }
  if (requires.includes("reason")) {
    const reason = nonEmptyString(payload.reason);
    if (!reason) return "A reason is required.";
    if (reason.length > 2000) return "Reason is too long.";
  }
  if (requires.includes("rating")) {
    const rating = Number(payload.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return "A satisfaction rating from 1 to 5 is required.";
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Decision                                                                   */
/* -------------------------------------------------------------------------- */

export interface TransitionInput {
  action: string;
  status: string;
  actor: ActorContext;
  payload?: Record<string, unknown>;
  /** Current assignee, needed to resolve `student_reply`'s target status. */
  assignedTo?: string | null;
}

export type TransitionDecision =
  | {
      ok: true;
      action: TicketAction;
      from: TicketStatus;
      to: TicketStatus;
      closureReason: ClosureReason | null;
      payload: Record<string, unknown>;
    }
  | { ok: false; error: string };

/**
 * The single pure decision function: is this action allowed, by this actor, on
 * this ticket, with this payload — and where does it land?
 *
 * The server action calls this for a fast, precise error before hitting the
 * database, and the SQL function re-implements the same rules as the actual
 * enforcement point.
 */
export function decideTransition(input: TransitionInput): TransitionDecision {
  const { action, status, actor, payload = {}, assignedTo = null } = input;

  if (!isTicketAction(action)) {
    return { ok: false, error: `Unknown ticket action "${action}".` };
  }
  if (!isTicketStatus(status)) {
    return { ok: false, error: `Unknown ticket status "${status}".` };
  }

  const spec = TICKET_TRANSITIONS[action];
  const kind = actorKindOf(actor);

  if (!kind) {
    return { ok: false, error: "You do not have permission to change this request." };
  }
  if (!spec.from.includes(status)) {
    return {
      ok: false,
      error: `"${statusLabel(status)}" cannot be moved with this action.`,
    };
  }
  if (!spec.actor.includes(kind)) {
    return {
      ok: false,
      error:
        kind === "requester"
          ? "Only IT staff can perform this action."
          : "Only the person who submitted this request can perform this action.",
    };
  }

  const payloadError = validateTransitionPayload(action, payload);
  if (payloadError) return { ok: false, error: payloadError };

  const to: TicketStatus =
    spec.to === "auto" ? (assignedTo ? "in_progress" : "open") : spec.to;

  const closureReason: ClosureReason | null =
    action === "verify_fixed"
      ? "verified_fixed"
      : action === "close_no_response"
        ? "no_response"
        : null;

  return { ok: true, action, from: status, to, closureReason, payload };
}
