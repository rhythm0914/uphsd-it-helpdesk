"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function TicketManagement({ ticketId, staff, currentStatus }: { ticketId: string; staff: any[]; currentStatus: string }) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingRemark, setIsAddingRemark] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleAssign(formData: FormData) {
    setIsAssigning(true);
    setMessage(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ type: "error", text: "You must be logged in" });
      setIsAssigning(false);
      return;
    }
    const { error } = await supabase
      .from("tickets")
      .update({
        assigned_to: formData.get("staff_id") as string,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      await supabase.from("ticket_status_history").insert({
        ticket_id: ticketId,
        old_status: "open",
        new_status: "in_progress",
        changed_by: user.id,
        notes: "Assigned to staff member",
      });
      setMessage({ type: "success", text: "Ticket assigned successfully" });
    }
    setIsAssigning(false);
  }

  async function handleStatusUpdate(formData: FormData) {
    setIsUpdatingStatus(true);
    setMessage(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ type: "error", text: "You must be logged in" });
      setIsUpdatingStatus(false);
      return;
    }
    const status = formData.get("status") as string;
    const notes = formData.get("notes") as string;

    const { data: ticket } = await supabase
      .from("tickets")
      .select("status")
      .eq("id", ticketId)
      .single();

    if (!ticket) {
      setMessage({ type: "error", text: "Ticket not found" });
      setIsUpdatingStatus(false);
      return;
    }

    const { error } = await supabase
      .from("tickets")
      .update({
        status: status as any,
        updated_at: new Date().toISOString(),
        ...(status === "closed" || status === "resolved" ? { closed_at: new Date().toISOString() } : {}),
      })
      .eq("id", ticketId);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      await supabase.from("ticket_status_history").insert({
        ticket_id: ticketId,
        old_status: ticket.status,
        new_status: status as any,
        changed_by: user.id,
        notes: notes || `Status changed to ${status}`,
      });
      setMessage({ type: "success", text: "Status updated successfully" });
    }
    setIsUpdatingStatus(false);
  }

  async function handleAddRemark(formData: FormData) {
    setIsAddingRemark(true);
    setMessage(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ type: "error", text: "You must be logged in" });
      setIsAddingRemark(false);
      return;
    }
    const message = formData.get("message") as string;
    const isInternal = formData.get("isInternal") === "true";

    const { error } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message,
        is_internal: isInternal,
      });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Remark added successfully" });
    }
    setIsAddingRemark(false);
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-lg p-4 ${message.type === "error" ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
          <p className={`text-sm ${message.type === "error" ? "text-red-700" : "text-green-700"}`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-lg font-semibold mb-4">Assign Ticket</h3>
        <form action={handleAssign} className="space-y-4">
          <div>
            <label htmlFor="staff_id" className="block text-sm font-medium mb-2">
              Assign to
            </label>
            <select
              id="staff_id"
              name="staff_id"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="">Select staff member</option>
              {staff.map((member: any) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} ({member.email})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isAssigning}
            className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {isAssigning ? "Assigning..." : "Assign Ticket"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-lg font-semibold mb-4">Update Status</h3>
        <form action={handleStatusUpdate} className="space-y-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-2">
              New Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={currentStatus}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_for_user">Waiting for User</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
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
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Add notes about this status change..."
            />
          </div>
          <button
            type="submit"
            disabled={isUpdatingStatus}
            className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {isUpdatingStatus ? "Updating..." : "Update Status"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <h3 className="text-lg font-semibold mb-4">Add Work Remark</h3>
        <form action={handleAddRemark} className="space-y-4">
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              Remark
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Add a work remark..."
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
          <button
            type="submit"
            disabled={isAddingRemark}
            className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {isAddingRemark ? "Adding..." : "Add Remark"}
          </button>
        </form>
      </div>
    </div>
  );
}
