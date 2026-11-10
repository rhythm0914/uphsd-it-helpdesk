import { formatDateTime } from "@/utils/format-date";

export interface TicketCycle {
  id: string;
  cycle_number: number;
  started_at: string;
  resolved_at: string | null;
  ended_at: string | null;
  outcome: string | null;
}

const OUTCOME_LABELS: Record<string, string> = {
  open: "In progress",
  resolved: "Resolved — awaiting verification",
  reopened: "Reopened by requester",
  verified_fixed: "Closed — Verified Fixed",
  no_response: "Closed — No Response",
  closed: "Closed",
  rejected: "Rejected",
};

function outcomeLabel(outcome: string | null): string {
  if (!outcome) return "In progress";
  return OUTCOME_LABELS[outcome] ?? outcome.replace(/_/g, " ");
}

/**
 * Per-cycle work history. A reopened ticket keeps every previous attempt, so
 * staff can see how many times the same fault came back and what was done.
 *
 * Rendered as a plain section (no card chrome) so it can sit inside the ticket
 * detail card on both the requester and the staff views.
 */
export function CycleHistory({ cycles }: { cycles: TicketCycle[] }) {
  if (cycles.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-1">Work cycles</h2>
      <p className="text-sm text-foreground/60 mb-4">
        Each time a reopened request comes back, a new cycle starts.
      </p>
      <ol className="space-y-3">
        {cycles.map((cycle) => (
          <li key={cycle.id} className="rounded-lg border border-border px-4 py-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">Cycle {cycle.cycle_number}</span>
              <span className="text-foreground/60">{outcomeLabel(cycle.outcome)}</span>
            </div>
            <p className="mt-1 text-xs text-foreground/50">
              Started {formatDateTime(cycle.started_at)}
              {cycle.resolved_at && ` · Resolved ${formatDateTime(cycle.resolved_at)}`}
              {cycle.ended_at && ` · Ended ${formatDateTime(cycle.ended_at)}`}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
