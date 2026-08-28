// Shared, framework-agnostic ticket workflow rules.
//
// Kept dependency-free so it can be unit tested directly (no Supabase/Next.js)
// and reused by Server Actions so the transition allow-list is enforced once,
// server-side, in exactly one place.

export const ALLOWED_STATUSES = [
  "open",
  "in_progress",
  "waiting_for_user",
  "resolved",
  "closed",
] as const;

export type TicketStatus = (typeof ALLOWED_STATUSES)[number];

export const ALLOWED_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type TicketPriority = (typeof ALLOWED_PRIORITIES)[number];

export const IT_STAFF_ROLES = ["it_staff", "admin", "manager"] as const;

export function isITStaffRole(role: string | null | undefined): boolean {
  return !!role && (IT_STAFF_ROLES as readonly string[]).includes(role);
}

// Legal status transitions, aligned with the documented lifecycle:
//   open -> in_progress / waiting_for_user / resolved / closed
//   in_progress -> waiting_for_user / resolved / open / closed
//   waiting_for_user -> in_progress / open / resolved / closed
//   resolved -> open / in_progress / closed   (reopen when not actually fixed)
//   closed -> open / in_progress              (reopen)
export const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  open: ["in_progress", "waiting_for_user", "resolved", "closed"],
  in_progress: ["waiting_for_user", "resolved", "open", "closed"],
  waiting_for_user: ["in_progress", "open", "resolved", "closed"],
  resolved: ["open", "in_progress", "closed"],
  closed: ["open", "in_progress"],
};

export function isAllowedStatus(value: string): value is TicketStatus {
  return (ALLOWED_STATUSES as readonly string[]).includes(value);
}

export function isAllowedPriority(value: string): value is TicketPriority {
  return (ALLOWED_PRIORITIES as readonly string[]).includes(value);
}

export function isTransitionAllowed(from: string | null | undefined, to: string): boolean {
  if (!isAllowedStatus(from!) || !isAllowedStatus(to)) return false;
  return (ALLOWED_TRANSITIONS as Record<string, readonly TicketStatus[]>)[from!].includes(
    to as TicketStatus,
  );
}
