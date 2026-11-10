"use client";

import { useActionState } from "react";
import {
  assignTicket,
  addWorkRemark,
  requestMoreInfo,
  updateTicketPriority,
  resolveTicket,
  rejectTicket,
  acknowledgeReopen,
} from "../actions";
import {
  PRIORITY_LABELS,
  REJECTION_CATEGORIES,
  REJECTION_CATEGORY_LABELS,
  TICKET_PRIORITIES,
  allowedActionsFor,
  statusLabel,
} from "@/utils/tickets/constants";
import { SubmitButton } from "@/components/ui/submit-button";

interface StaffMember {
  id: string;
  email: string;
  full_name: string | null;
}

type Feedback = { type: "success" | "error"; text: string } | null;

function toResult(res: { error?: string | null }, successText: string): Feedback {
  if (res.error) return { type: "error", text: res.error };
  return { type: "success", text: successText };
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";

export function TicketManagement({
  ticketId,
  staff,
  currentStatus,
  currentPriority,
}: {
  ticketId: string;
  staff: StaffMember[];
  currentStatus: string;
  currentPriority: string;
}) {
  // Every mutation goes through the hardened server actions in
  // app/portal/queue/actions.ts, which delegate to the single
  // transitionTicket() function. The browser never writes to the database
  // directly, and staff have no path to Closed: only the requester's
  // verification (or the automated no-response job) closes a ticket.
  const available = allowedActionsFor(currentStatus, { role: "it_staff" });
  const canAssign = available.includes("assign");
  const canResolve = available.includes("resolve");
  const canReject = available.includes("reject");
  const canRequestInfo = available.includes("request_info");
  const canAcknowledge = available.includes("acknowledge_reopen");

  const [assignState, assignAction] = useActionState(
    async (_prev: Feedback, formData: FormData) =>
      toResult(
        await assignTicket(
          ticketId,
          formData.get("staff_id") as string,
          (formData.get("priority") as string) || undefined,
        ),
        "Ticket assigned successfully",
      ),
    null,
  );

  const [resolveState, resolveAction] = useActionState(
    async (_prev: Feedback, formData: FormData) =>
      toResult(
        await resolveTicket(ticketId, formData.get("resolution_note") as string),
        "Ticket marked Resolved — awaiting the requester's verification",
      ),
    null,
  );

  const [rejectState, rejectAction] = useActionState(
    async (_prev: Feedback, formData: FormData) =>
      toResult(
        await rejectTicket(
          ticketId,
          formData.get("rejection_category") as string,
          formData.get("reason") as string,
        ),
        "Ticket rejected",
      ),
    null,
  );

  const [priorityState, priorityAction] = useActionState(
    async (_prev: Feedback, formData: FormData) =>
      toResult(
        await updateTicketPriority(ticketId, formData.get("priority") as string),
        "Priority updated successfully",
      ),
    null,
  );

  const [remarkState, remarkAction] = useActionState(
    async (_prev: Feedback, formData: FormData) =>
      toResult(
        await addWorkRemark(
          ticketId,
          formData.get("message") as string,
          formData.get("isInternal") === "true",
        ),
        "Remark added successfully",
      ),
    null,
  );

  const [infoState, infoAction] = useActionState(
    async (_prev: Feedback, formData: FormData) =>
      toResult(
        await requestMoreInfo(ticketId, formData.get("message") as string),
        "Information requested — the ticket is now Awaiting Student",
      ),
    null,
  );

  const [ackState, ackAction] = useActionState(
    async () => toResult(await acknowledgeReopen(ticketId), "Ticket reopened"),
    null,
  );

  const feedbackBanner = (state: Feedback) =>
    state ? (
      <div
        className={`rounded-lg p-4 ${
          state.type === "error"
            ? "bg-red-50 border border-red-200"
            : "bg-green-50 border border-green-200"
        }`}
      >
        <p className={`text-sm ${state.type === "error" ? "text-red-700" : "text-green-700"}`}>
          {state.text}
        </p>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {feedbackBanner(assignState) ??
        feedbackBanner(resolveState) ??
        feedbackBanner(rejectState) ??
        feedbackBanner(priorityState) ??
        feedbackBanner(remarkState) ??
        feedbackBanner(infoState) ??
        feedbackBanner(ackState)}

      <div className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-lg font-semibold mb-1">Workflow</h3>
        <p className="text-sm text-foreground/60 mb-4">
          Current status: <span className="font-medium">{statusLabel(currentStatus)}</span>
        </p>

        {!canAssign && !canResolve && !canReject && !canRequestInfo && !canAcknowledge && (
          <p className="text-sm text-foreground/60">
            No staff action is available in this status. Only the requester can verify a resolved
            request, and closed or rejected requests are final.
          </p>
        )}

        {canAcknowledge && (
          <form action={ackAction} className="mb-4">
            <p className="text-xs text-foreground/50 mb-2">
              The requester reported this issue is still broken.
            </p>
            <SubmitButton idleLabel="Acknowledge Reopen" pendingLabel="Updating…" />
          </form>
        )}

        {canResolve && (
          <form action={resolveAction} className="space-y-3 border-t border-border pt-4">
            <div>
              <label htmlFor="resolution_note" className="block text-sm font-medium mb-2">
                Resolution note <span className="text-brand-primary">*</span>
              </label>
              <textarea
                id="resolution_note"
                name="resolution_note"
                required
                rows={3}
                className={inputClass}
                placeholder="What was fixed? The requester will see this."
              />
            </div>
            <p className="text-xs text-foreground/50">
              This moves the ticket to Resolved (pending verification). A technician can never
              close a ticket — only the requester&apos;s confirmation does.
            </p>
            <SubmitButton idleLabel="Mark as Resolved" pendingLabel="Resolving…" />
          </form>
        )}

        {canRequestInfo && (
          <form action={infoAction} className="space-y-3 border-t border-border pt-4">
            <div>
              <label htmlFor="info-message" className="block text-sm font-medium mb-2">
                Request more information
              </label>
              <textarea
                id="info-message"
                name="message"
                required
                rows={3}
                className={inputClass}
                placeholder="Describe what information you need from the requester..."
              />
            </div>
            <p className="text-xs text-foreground/50">
              Sends a public message and moves the ticket to Awaiting Student. The requester&apos;s
              reply returns it to Assigned / In Progress.
            </p>
            <SubmitButton
              idleLabel="Request Information"
              pendingLabel="Requesting…"
              variant="outline"
            />
          </form>
        )}

        {canReject && (
          <form action={rejectAction} className="space-y-3 border-t border-border pt-4">
            <div>
              <label htmlFor="rejection_category" className="block text-sm font-medium mb-2">
                Reject reason
              </label>
              <select
                id="rejection_category"
                name="rejection_category"
                defaultValue="duplicate"
                className={inputClass}
              >
                {REJECTION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {REJECTION_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reason" className="block text-sm font-medium mb-2">
                Explanation for the requester <span className="text-brand-primary">*</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                required
                rows={3}
                className={inputClass}
                placeholder="Explain why this request is being rejected..."
              />
            </div>
            <p className="text-xs text-foreground/50">
              Rejection is final. The reason is shown to the requester on the ticket.
            </p>
            <SubmitButton idleLabel="Reject Request" pendingLabel="Rejecting…" variant="outline" />
          </form>
        )}
      </div>

      {canAssign && (
        <div className="rounded-2xl border border-border bg-background p-6">
          <h3 className="text-lg font-semibold mb-4">Assign Ticket</h3>
          <form action={assignAction} className="space-y-4">
            <div>
              <label htmlFor="staff_id" className="block text-sm font-medium mb-2">
                Assign to
              </label>
              <select id="staff_id" name="staff_id" required className={inputClass}>
                <option value="">Select staff member</option>
                {staff.map((member: StaffMember) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-foreground/50">
              Assigning moves the ticket to Assigned / In Progress and records the transition in
              status history.
            </p>
            <SubmitButton idleLabel="Assign Ticket" pendingLabel="Assigning…" />
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-lg font-semibold mb-4">Update Priority</h3>
        <form action={priorityAction} className="space-y-4">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium mb-2">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue={currentPriority}
              className={inputClass}
            >
              {TICKET_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton idleLabel="Update Priority" pendingLabel="Updating…" />
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-lg font-semibold mb-4">Add Work Remark</h3>
        <form action={remarkAction} className="space-y-4">
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              Remark
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              className={inputClass}
              placeholder="Add a public reply or an internal note..."
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isInternal"
              name="isInternal"
              value="true"
              className="rounded border-border"
            />
            <label htmlFor="isInternal" className="text-sm text-foreground/70">
              Internal note (not visible to requester)
            </label>
          </div>
          <SubmitButton idleLabel="Add Remark" pendingLabel="Adding…" />
        </form>
      </div>
    </div>
  );
}
