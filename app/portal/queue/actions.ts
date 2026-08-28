"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import {
  isAllowedPriority,
  isAllowedStatus,
  isITStaffRole,
  isTransitionAllowed,
} from "./ticket-rules";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

async function requireStaff() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: "Unauthorized" as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !isITStaffRole(profile.role)) {
    return { supabase, user, error: "Forbidden" as const };
  }

  return { supabase, user, error: null as "Forbidden" | null };
}

export async function assignTicket(ticketId: string, staffId: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const { data: ticket } = await ctx.supabase
    .from("tickets")
    .select("status")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { error: "Ticket not found" };

  // Assigning opens the ticket for work (open -> in_progress is the legal path).
  if (!isTransitionAllowed(ticket.status, "in_progress")) {
    return { error: `Cannot assign a ticket in status "${ticket.status}"` };
  }

  const { error } = await ctx.supabase
    .from("tickets")
    .update({
      assigned_to: staffId,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) return { error: error.message };

  const { error: histError } = await ctx.supabase.from("ticket_status_history").insert({
    ticket_id: ticketId,
    old_status: ticket.status,
    new_status: "in_progress",
    changed_by: ctx.user.id,
    notes: "Assigned to staff member",
  });

  if (histError) return { error: histError.message };

  return { success: true };
}

export async function updateTicketStatus(ticketId: string, status: string, notes?: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  if (!isAllowedStatus(status)) {
    return { error: "Invalid status value" };
  }

  const { data: ticket } = await ctx.supabase
    .from("tickets")
    .select("status")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { error: "Ticket not found" };

  if (!isTransitionAllowed(ticket.status, status)) {
    return { error: `Cannot change status from "${ticket.status}" to "${status}"` };
  }

  const { error } = await ctx.supabase
    .from("tickets")
    .update({
      status: status,
      updated_at: new Date().toISOString(),
      ...(status === "closed" ? { closed_at: new Date().toISOString() } : {}),
    })
    .eq("id", ticketId);

  if (error) return { error: error.message };

  const { error: histError } = await ctx.supabase.from("ticket_status_history").insert({
    ticket_id: ticketId,
    old_status: ticket.status,
    new_status: status,
    changed_by: ctx.user.id,
    notes: notes || `Status changed to ${status}`,
  });

  if (histError) return { error: histError.message };

  return { success: true, status };
}

export async function updateTicketPriority(ticketId: string, priority: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  if (!isAllowedPriority(priority)) {
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
    .update({
      priority: priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) return { error: error.message };

  return { success: true };
}

export async function addWorkRemark(ticketId: string, message: string, isInternal: boolean = false) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const trimmed = (message || "").trim();
  if (!trimmed) return { error: "Message cannot be empty" };
  if (trimmed.length > 5000) return { error: "Message is too long" };

  // Verify the ticket exists & is accessible to staff before inserting.
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

  return { success: true };
}

export async function requestMoreInfo(ticketId: string, message: string) {
  const ctx = await requireStaff();
  if (ctx.error || !ctx.user) return { error: ctx.error };

  const trimmed = (message || "").trim();
  if (!trimmed) return { error: "Please describe what information you need" };
  if (trimmed.length > 5000) return { error: "Message is too long" };

  const { data: ticket } = await ctx.supabase
    .from("tickets")
    .select("status")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { error: "Ticket not found" };

  const alreadyWaiting = ticket.status === "waiting_for_user";
  if (!alreadyWaiting && !isTransitionAllowed(ticket.status, "waiting_for_user")) {
    return { error: `Cannot set a ticket in status "${ticket.status}" to Waiting for User` };
  }

  // 1) The requester-visible information request message.
  const { error: msgError } = await ctx.supabase.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_id: ctx.user.id,
    message: trimmed,
    is_internal: false,
  });
  if (msgError) return { error: msgError.message };

  // 2) Move the ticket to WAITING_FOR_USER (unless it already is) + audit it.
  if (!alreadyWaiting) {
    const { error } = await ctx.supabase
      .from("tickets")
      .update({
        status: "waiting_for_user",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) return { error: error.message };

    const { error: histError } = await ctx.supabase.from("ticket_status_history").insert({
      ticket_id: ticketId,
      old_status: ticket.status,
      new_status: "waiting_for_user",
      changed_by: ctx.user.id,
      notes: "Additional information requested from requester",
    });

    if (histError) return { error: histError.message };
  }

  return { success: true, status: "waiting_for_user" };
}

