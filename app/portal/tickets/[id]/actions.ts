"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isITStaffRole } from "@/app/portal/queue/ticket-rules";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

/**
 * Requester (or staff) replies to an existing ticket — the requester never
 * needs to file a new ticket to provide more information.
 *
 * The message is always inserted as PUBLIC (requester-visible). Internal notes
 * are a staff-only capability and live in the IT queue's remark UI.
 *
 * When the ticket's own requester replies to a WAITING_FOR_USER ticket, the
 * ticket is returned to IN_PROGRESS and the transition is audited via the
 * SECURITY DEFINER `requester_provide_info` RPC (staff-scoped history inserts
 * can't be done directly by a requester).
 */
export async function sendTicketReply(ticketId: string, message: string) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const trimmed = (message || "").trim();
  if (!trimmed) return { error: "Message cannot be empty" };
  if (trimmed.length > 5000) return { error: "Message is too long" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isStaff = isITStaffRole(profile?.role);

  const { data: ticket } = await supabase
    .from("tickets")
    .select("requester_id, status")
    .eq("id", ticketId)
    .single();

  if (!ticket) return { error: "Ticket not found" };

  const isRequester = ticket.requester_id === user.id;
  if (!isRequester && !isStaff) return { error: "Forbidden" };

  // Insert the public reply. RLS enforces sender = auth.uid() and that the
  // user can access this ticket; internal messages are never authored here.
  const { error: msgError } = await supabase.from("ticket_messages").insert({
    ticket_id: ticketId,
    sender_id: user.id,
    message: trimmed,
    is_internal: false,
  });
  if (msgError) return { error: msgError.message };

  // Keep the queue/detail surfaces in sync after a reply.
  revalidatePath(`/portal/tickets/${ticketId}`);
  revalidatePath(`/portal/queue/${ticketId}`);
  revalidatePath("/portal/queue");

  // A requester providing info returns a WAITING_FOR_USER ticket to IN_PROGRESS
  // and records the transition in history (SECURITY DEFINER RPC).
  if (isRequester && ticket.status === "waiting_for_user") {
    const { error: rpcError } = await supabase.rpc("requester_provide_info", {
      p_ticket_id: ticketId,
    });
    if (rpcError) return { error: rpcError.message };
  }

  return { success: true };
}
