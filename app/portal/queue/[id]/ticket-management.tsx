"use client";

import { useActionState } from "react";
import {
  assignTicket,
  addWorkRemark,
  requestMoreInfo,
  updateTicketPriority,
  updateTicketStatus,
} from "../actions";
import { ALLOWED_PRIORITIES, ALLOWED_STATUSES } from "../ticket-rules";
import { SubmitButton } from "@/components/ui/submit-button";

interface StaffMember {
  id: string;
  email: string;
  full_name: string | null;
}

type Feedback = { type: "success" | "error"; text: string } | null;

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_for_user: "Waiting for User",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

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
  // app/portal/queue/actions.ts — the browser never writes to the database
  // directly. The server remains authoritative for authorization, transition
  // validation, timestamps, and status history (correct old/new status).
  const [assignState, assignAction] = useActionState(
    async (_prev: Feedback, formData: FormData) =>
      toResult(
        await assignTicket(ticketId, formData.get("staff_id") as string),
        "Ticket assigned successfully",
      ),
    null,
  );

  const [statusState, statusAction] = useActionState(
    async (_prev: Feedback, formData: FormData) =>
      toResult(
        await updateTicketStatus(
          ticketId,
          formData.get("status") as string,
          (formData.get("notes") as string) || undefined,
        ),
        "Status updated successfully",
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
        "Information requested — ticket is now Waiting for User",
      ),
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
        feedbackBanner(statusState) ??
        feedbackBanner(priorityState) ??
        feedbackBanner(remarkState) ??
        feedbackBanner(infoState)}

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
            Assigning a ticket moves it to In Progress and records the correct transition in
            status history.
          </p>
          <SubmitButton idleLabel="Assign Ticket" pendingLabel="Assigning…" />
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-lg font-semibold mb-4">Update Status</h3>
        <form action={statusAction} className="space-y-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-2">
              New Status
            </label>
            <select id="status" name="status" defaultValue={currentStatus} className={inputClass}>
              {ALLOWED_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-2">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className={inputClass}
              placeholder="Add notes about this status change..."
            />
          </div>
          <p className="text-xs text-foreground/50">
            Only valid workflow transitions are accepted (e.g. Resolved → Closed, Closed → Open
            to reopen). Closing a ticket records the closure timestamp.
          </p>
          <SubmitButton idleLabel="Update Status" pendingLabel="Updating…" />
        </form>
      </div>

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
              {ALLOWED_PRIORITIES.map((priority) => (
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
        <h3 className="text-lg font-semibold mb-4">Request More Information</h3>
        <form action={infoAction} className="space-y-4">
          <div>
            <label htmlFor="info-message" className="block text-sm font-medium mb-2">
              Message to requester
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
            Sends a public message to the requester and moves the ticket to Waiting for User.
            The requester&apos;s reply automatically returns it to In Progress.
          </p>
          <SubmitButton
            idleLabel="Request Information"
            pendingLabel="Requesting…"
            variant="outline"
          />
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
