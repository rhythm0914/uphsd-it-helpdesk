"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isITStaff } from "@/utils/authorization";
import { isTicketPriority } from "@/utils/tickets/constants";
import { transitionTicket } from "@/app/portal/tickets/transition";

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
  return { success: true };
}

/** Staff action: ask the requester for more information. */
export async function requestMoreInfo(ticketId: string, message: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const result = await transitionTicket(ticketId, "request_info", { message });

  if (result.error) return { error: result.error };
  revalidateTicket(ticketId);
  return { success: true, status: result.status };
}

/** Staff action: acknowledge a reopened ticket and resume work. */
export async function acknowledgeReopen(ticketId: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const result = await transitionTicket(ticketId, "acknowledge_reopen", {});

  if (result.error) return { error: result.error };
  revalidateTicket(ticketId);
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
    .select("id")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { error: "Ticket not found" };

  const { error } = await ctx.supabase.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_id: ctx.user.id,
    message: trimmed,
    is_internal: isInternal,
  });

  if (error) return { error: error.message };

  revalidateTicket(ticketId);
  return { success: true };
}
