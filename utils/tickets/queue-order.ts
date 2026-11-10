// Queue ordering for the IT staff queue.
//
// Reopened tickets must be worked first, and urgency outranks age. Kept pure and
// separate from the Supabase query so the rule is unit tested.

export interface QueueOrderable {
  status: string;
  priority: string;
  created_at: string;
}

const STATUS_WEIGHT: Record<string, number> = {
  reopened: 0,
};

const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function statusWeight(status: string): number {
  return STATUS_WEIGHT[status] ?? 1;
}

function priorityWeight(priority: string): number {
  return PRIORITY_WEIGHT[priority] ?? 9;
}

function createdAtMs(value: string): number {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Sort without mutating the input: reopened first, then urgent → low, then
 * newest first. Stable for rows that tie on all three keys.
 */
export function sortQueueTickets<T extends QueueOrderable>(tickets: readonly T[]): T[] {
  return [...tickets].sort((a, b) => {
    const byStatus = statusWeight(a.status) - statusWeight(b.status);
    if (byStatus !== 0) return byStatus;

    const byPriority = priorityWeight(a.priority) - priorityWeight(b.priority);
    if (byPriority !== 0) return byPriority;

    return createdAtMs(b.created_at) - createdAtMs(a.created_at);
  });
}

/** True when a ticket deserves a pin/badge at the top of staff views. */
export function isPinned(ticket: QueueOrderable): boolean {
  return ticket.status === "reopened" || ticket.priority === "urgent";
}
