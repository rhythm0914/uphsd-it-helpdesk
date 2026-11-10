"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isITStaff } from "@/utils/authorization";
import { transitionTicket } from "../transition";
import { notifyAfterTransition } from "@/utils/notifications/server";
import { writeAuditLog } from "@/utils/audit/server";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

function revalidateTicket(ticketId: string) {
  revalidatePath("/portal");
  revalidatePath(`/portal/tickets/${ticketId}`);
  revalidatePath(`/portal/queue/${ticketId}`);
  revalidatePath("/portal/queue");
}

/**
 * Reply to a ticket.
 *
 * A staff reply or a requester reply on a non-waiting ticket is just a message.
 * A requester reply on an Awaiting Student ticket is a workflow transition, so
 * it goes through transitionTicket() — which also inserts the message, in the
 * same transaction as the status change.
 */
export async function sendTicketReply(ticketId: string, message: string) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const trimmed = (message || "").trim();
  if (!trimmed) return { error: "Message cannot be empty" };
  if (trimmed.length > 5000) return { error: "Message is too long" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isStaff = isITStaff(profile?.role);

  const { data: ticket } = await supabase
    .from("tickets")
    .select("requester_id, status, assigned_to")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { error: "Ticket not found" };

  const isRequester = ticket.requester_id === user.id;
  if (!isRequester && !isStaff) return { error: "Forbidden" };

  // The requester answering an information request moves the ticket back into
  // the working queue. transitionTicket() inserts the message and the audit row.
  if (isRequester && ticket.status === "waiting_for_user") {
    const result = await transitionTicket(ticketId, "student_reply", { message: trimmed });
    if (result.error) return { error: result.error };
    revalidateTicket(ticketId);

    // Email the assignee that the requester replied (fire-and-forget).
    const supabase = await (async () => {
      const cookieStore = await cookies();
      return createClient(cookieStore);
    })();
    notifyAfterTransition(
      supabase,
      ticketId,
      "ticket_reply",
      "assignee",
      "Requester replied to " + ticketId,
      "The requester provided the requested information.",
    );

    // Otherwise this is a staff reply or a requester reply on a non-waiting
    // ticket: just record the message.
  } else {
    const { error: msgError } = await supabase.from("ticket_messages").insert({
      ticket_id: ticketId,
      sender_id: user.id,
      message: trimmed,
      is_internal: false,
    });
    if (msgError) return { error: msgError.message };
  }

  revalidateTicket(ticketId);
  return { success: true };
}

/** Requester cancels their own request while Open or Awaiting Student. */
export async function cancelTicket(ticketId: string) {
  const supabase = await (async () => {
    const cookieStore = await cookies();
    return createClient(cookieStore);
  })();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const result = await transitionTicket(ticketId, "cancel", {});

  if (result.error) return { error: result.error };

  revalidatePath("/portal/track");
  revalidatePath(`/portal/tickets/${ticketId}`);

  await writeAuditLog({
    action: "cancel_ticket",
    targetType: "ticket",
    targetId: ticketId,
    details: { cancelled_by: user.id },
  });

  return { success: true };
}

/**
 * Requester confirms the fix AND rates the service in one atomic action.
 * The rating is only ever writable through this transition.
 */
export async function verifyFix(ticketId: string, rating: number, comment?: string) {
  const result = await transitionTicket(ticketId, "verify_fixed", {
    rating,
    ...(comment ? { comment } : {}),
  });

  if (result.error) return { error: result.error };

  revalidateTicket(ticketId);

  // Email the assignee that the fix was verified (fire-and-forget).
  const supabase = await (async () => {
    const cookieStore = await cookies();
    return createClient(cookieStore);
  })();
  notifyAfterTransition(
    supabase,
    ticketId,
    "ticket_verified",
    "assignee",
    "Fix confirmed on " + ticketId,
    "The requester confirmed the fix. This ticket is Closed (Verified Fixed).",
  );

  return { success: true };
}

/** Requester reports the issue is still broken: same ticket, reopened. */
export async function reportStillBroken(ticketId: string, reason: string) {
  const result = await transitionTicket(ticketId, "report_still_broken", { reason });

  if (result.error) return { error: result.error };

  revalidateTicket(ticketId);

  // Email the assignee that the ticket was reopened (fire-and-forget).
  const supabase = await (async () => {
    const cookieStore = await cookies();
    return createClient(cookieStore);
  })();
  notifyAfterTransition(
    supabase,
    ticketId,
    "ticket_reopened",
    "assignee",
    "Reopened: " + ticketId,
    "The requester reports the issue is still broken: " + reason,
  );

  return { success: true };
}
