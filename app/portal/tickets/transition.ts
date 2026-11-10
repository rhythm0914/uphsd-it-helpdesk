"use server";

// The single server-side entry point for ticket state changes.
//
// Every status change in the application goes through `transitionTicket()`.
// It performs the same checks as the pure rules module (for a fast, precise
// error message) and then calls the authoritative `transition_ticket` SQL
// function, which re-validates the actor, the transition and the payload inside
// the database. Nothing here trusts client-supplied role or actor identity.

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  decideTransition,
  isTicketAction,
  statusLabel,
  type TicketAction,
} from "@/utils/tickets/constants";

export interface TransitionResult {
  success?: boolean;
  status?: string;
  error?: string;
}

function revalidateTicket(ticketId: string) {
  revalidatePath("/portal");
  revalidatePath("/portal/queue");
  revalidatePath(`/portal/queue/${ticketId}`);
  revalidatePath(`/portal/tickets/${ticketId}`);
}

/**
 * Move a ticket through the workflow.
 *
 * `ticketId` is the row id (UUID). `action` must be one of TICKET_ACTIONS.
 * `payload` carries the action's required fields (assigned_to, message,
 * resolution_note, reason, rating, comment, priority, rejection_category).
 */
export async function transitionTicket(
  ticketId: string,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<TransitionResult> {
  if (!ticketId) return { error: "Missing ticket id" };
  if (!isTicketAction(action)) return { error: `Unknown ticket action "${action}".` };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Read the role from the database, never from the client payload.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, status, requester_id, assigned_to")
    .eq("id", ticketId)
    .single();

  // RLS already limits which rows are readable; a missing row and a forbidden
  // row are reported identically on purpose.
  if (ticketError || !ticket) return { error: "Ticket not found" };

  const decision = decideTransition({
    action,
    status: ticket.status as string,
    assignedTo: ticket.assigned_to as string | null,
    actor: {
      role: profile?.role ?? null,
      isRequester: ticket.requester_id === user.id,
    },
    payload,
  });

  if (!decision.ok) return { error: decision.error };

  const { data, error } = await supabase.rpc("transition_ticket", {
    p_ticket_id: ticketId,
    p_action: decision.action satisfies TicketAction,
    p_payload: decision.payload,
  });

  if (error) return { error: error.message };

  revalidateTicket(ticketId);

  const newStatus = (data as { status?: string } | null)?.status ?? decision.to;

  return { success: true, status: newStatus };
}

/** Human-readable label for a status, for server-rendered confirmations. */
export async function describeStatus(status: string): Promise<string> {
  return statusLabel(status);
}
