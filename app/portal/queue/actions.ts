"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isITStaff } from "@/utils/authorization";
import { isTicketPriority } from "@/utils/tickets/constants";
import { transitionTicket } from "@/app/portal/tickets/transition";
import { notifyAfterTransition } from "@/utils/notifications/server";
import { writeAuditLog } from "@/utils/audit/server";

// Staff-side ticket actions.
//
// Every state change delegates to transitionTicket(), which is the single
// server-side transition entry point. This file never writes `tickets.status`
// itself, and the database no longer grants clients that column, so the
// workflow cannot be bypassed.

function revalidateTicket(ticketId: string) {
  revalidatePath("/portal/queue");
  revalidatePath(`/portal/queue/${ticketId}`);
  revalidatePath(`/portal/tickets/${ticketId}`);
}

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

async function requireStaff() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, role: null, error: "Unauthorized" as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !isITStaff(profile.role)) {
    return { supabase, user, role: null, error: "Forbidden" as const };
  }

  return { supabase, user, role: profile.role as string, error: null as "Forbidden" | null };
}

/** Triage: assign a technician (and optionally set priority). */
export async function assignTicket(ticketId: string, staffId: string, priority?: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const result = await transitionTicket(ticketId, "assign", {
    assigned_to: staffId,
    ...(priority ? { priority } : {}),
  });

  if (result.error) return { error: result.error };
  revalidateTicket(ticketId);

  // Email the assignee that a ticket was assigned (fire-and-forget).
  notifyAfterTransition(
    ctx.supabase,
    ticketId,
    "ticket_assigned",
    "assignee",
    "Assigned: " + ticketId,
    "You are the technician for this request.",
  );

  return { success: true };
}

/** Staff action: mark the ticket Resolved (pending the requester's verification). */
export async function resolveTicket(ticketId: string, resolutionNote: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const result = await transitionTicket(ticketId, "resolve", {
    resolution_note: resolutionNote,
  });

  if (result.error) return { error: result.error };
  revalidateTicket(ticketId);

  // Email the requester to verify the fix (fire-and-forget, never blocks).
  notifyAfterTransition(
    ctx.supabase,
    ticketId,
    "ticket_resolved",
    "requester",
    "Verify your request " + ticketId,
    "IT marked your request resolved with the note: " + resolutionNote +
      ". Please choose \"Fix works\" or \"Still broken\".",
  );

  return { success: true };
}

/** Staff action: reject with a required reason. Terminal. */
export async function rejectTicket(
  ticketId: string,
  rejectionCategory: string,
  reason: string,
) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const result = await transitionTicket(ticketId, "reject", {
    rejection_category: rejectionCategory,
    reason,
  });

  if (result.error) return { error: result.error };
  revalidateTicket(ticketId);

  // Email the requester about the rejection (fire-and-forget).
  notifyAfterTransition(
    ctx.supabase,
    ticketId,
    "ticket_rejected",
    "requester",
    "Request " + ticketId + " was rejected",
    "This request was rejected: " + reason +
      " You can submit a new request if you believe this was in error.",
  );

  return { success: true };
}

/** Staff action: ask the requester for more information. */
export async function requestMoreInfo(ticketId: string, message: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const result = await transitionTicket(ticketId, "request_info", { message });

  if (result.error) return { error: result.error };
  revalidateTicket(ticketId);

  // Email the requester that more information is needed (fire-and-forget).
  notifyAfterTransition(
    ctx.supabase,
    ticketId,
    "ticket_info_requested",
    "requester",
    "More information needed for " + ticketId,
    "IT needs more information about your request: " + message,
  );

  return { success: true, status: result.status };
}

/** Staff action: acknowledge a reopened ticket and resume work. */
export async function acknowledgeReopen(ticketId: string, reopenCause?: string, reopenCauseNote?: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const result = await transitionTicket(ticketId, "acknowledge_reopen", {
    reopen_cause: reopenCause,
    reopen_cause_note: reopenCauseNote,
  });

  if (result.error) return { error: result.error };
  revalidateTicket(ticketId);

  // Email the assignee (or requester if unassigned) that work resumed.
  notifyAfterTransition(
    ctx.supabase,
    ticketId,
    "ticket_assigned",
    "assignee",
    "Assigned: " + ticketId,
    "You are the technician for this request.",
  );

  await writeAuditLog({
    action: "acknowledge_reopen",
    targetType: "ticket",
    targetId: ticketId,
    details: { reopen_cause: reopenCause, reopen_cause_note: reopenCauseNote },
  });

  return { success: true };
}

/**
 * Priority is a triage attribute, not a workflow state, so it is updated
 * directly. The database grants UPDATE only on this column set for staff.
 */
export async function updateTicketPriority(ticketId: string, priority: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  if (!isTicketPriority(priority)) {
    return { error: "Invalid priority value" };
  }

  const { data: ticket } = await ctx.supabase
    .from("tickets")
    .select("priority")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { error: "Ticket not found" };

  const { error } = await ctx.supabase
    .from("tickets")
    .update({ priority, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { error: error.message };

  revalidateTicket(ticketId);
  return { success: true };
}

/** Public reply or internal note. Not a state change. */
export async function addWorkRemark(ticketId: string, message: string, isInternal = false) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const trimmed = (message || "").trim();
  if (!trimmed) return { error: "Message cannot be empty" };
  if (trimmed.length > 5000) return { error: "Message is too long" };

  const { data: ticket } = await ctx.supabase
    .from("tickets")
    .select("id, first_response_at")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { error: "Ticket not found" };

  const isFirstStaffReply = !isInternal && ticket.first_response_at === null;

  const { error } = await ctx.supabase.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_id: ctx.user.id,
    message: trimmed,
    is_internal: isInternal,
  });

  if (error) return { error: error.message };

  if (isFirstStaffReply) {
    await ctx.supabase
      .from("tickets")
      .update({ first_response_at: new Date().toISOString() })
      .eq("id", ticketId);
  }

  revalidateTicket(ticketId);
  return { success: true };
}

/** Supervisor verifies that an urgent request is genuinely urgent. */
export async function verifyUrgent(ticketId: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const result = await transitionTicket(ticketId, "verify_urgent", {});

  if (result.error) return { error: result.error };
  revalidateTicket(ticketId);

  // Notify the requester that urgency was verified.
  const supabase = await getSupabase();
  const { data: ticket } = await supabase
    .from("tickets")
    .select("ticket_number, requester_id")
    .eq("id", ticketId)
    .single();

  if (ticket?.requester_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", ticket.requester_id)
      .single();

    if (profile?.email) {
      // Fire-and-forget email: the requester is notified their urgent flag was verified.
      void supabase.from("notifications").insert({
        user_id: ticket.requester_id,
        ticket_id: ticketId,
        type: "ticket_urgent_verified",
        title: "Urgent request verified: " + ticket.ticket_number,
        body: "A supervisor verified that your urgent request is genuine. IT will respond within 4 hours around the clock.",
      });
    }
  }

  await writeAuditLog({
    action: "verify_urgent",
    targetType: "ticket",
    targetId: ticketId,
    details: { verified: true },
  });

  return { success: true };
}

/** Supervisor downgrades an urgent request back to the normal queue. */
export async function downgradeUrgent(ticketId: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const result = await transitionTicket(ticketId, "downgrade_urgent", {});

  if (result.error) return { error: result.error };
  revalidateTicket(ticketId);

  // Notify the requester that urgency was downgraded.
  const supabase = await getSupabase();
  const { data: ticket } = await supabase
    .from("tickets")
    .select("ticket_number, requester_id")
    .eq("id", ticketId)
    .single();

  if (ticket?.requester_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", ticket.requester_id)
      .single();

    if (profile?.email) {
      void supabase.from("notifications").insert({
        user_id: ticket.requester_id,
        ticket_id: ticketId,
        type: "ticket_urgent_downgraded",
        title: "Urgent flag removed: " + ticket.ticket_number,
        body: "A supervisor reviewed your urgent request and determined it does not require 24/7 handling. It has been returned to the normal queue.",
      });
    }
  }

  await writeAuditLog({
    action: "downgrade_urgent",
    targetType: "ticket",
    targetId: ticketId,
    details: { verified: false },
  });

  return { success: true };
}

/** Staff escalates a ticket to the supervisor with a reason. */
export async function escalateTicket(ticketId: string, reason: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const trimmed = (reason || "").trim();
  if (!trimmed) return { error: "An escalation reason is required" };

  const result = await transitionTicket(ticketId, "escalate", { reason: trimmed });

  if (result.error) return { error: result.error };
  revalidateTicket(ticketId);

  // Notify supervisors/escalation recipients. Use the server-side notification
  // helper so the in-app row is created inside the same transaction boundary.
  void notifyAfterTransition(
    await getSupabase(),
    ticketId,
    "ticket_escalated",
    "assignee",
    "Escalated: " + ticketId,
    trimmed,
  );

  await writeAuditLog({
    action: "escalate_ticket",
    targetType: "ticket",
    targetId: ticketId,
    details: { reason: trimmed },
  });

  return { success: true };
}
