// Server-side notification delivery for ticket transitions.
//
// Called from Server Actions after a successful transition_ticket() call.
// Email is best-effort: failures are logged and recorded but never block the
// ticket state change. In-app notifications are already written by the DB
// trigger inside the same transaction.

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import {
  sendNotification,
  type NotificationPayload,
} from "@/utils/notifications";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

/** Email body templates, matched to the notification types the DB trigger writes. */
export function notificationEmail(
  type: string,
  ticketNumber: string,
  title: string,
  body: string,
): NotificationPayload {
  const htmlBody = `
    <h2>${title}</h2>
    <p>${body}</p>
    <p><strong>Request:</strong> ${ticketNumber}</p>
    <hr />
    <p style="color:#666;font-size:12px">UPHSD IT Help Desk — this is an automated notification.</p>
  `;
  return {
    subject: `[UPHSD IT Help Desk] ${title}`,
    body: `${title}\n\n${body}\n\nRequest: ${ticketNumber}\n`,
    html: htmlBody,
  };
}

/**
 * Send an email for a newly created in-app notification and record delivery.
 *
 * Fire-and-forget: errors are captured in the delivery record and do not
 * propagate to the caller. Returns the delivery result for logging.
 */
export async function deliverNotificationEmail(
  notificationId: string,
  toEmail: string,
  type: string,
  ticketNumber: string,
  title: string,
  body: string,
): Promise<void> {
  const payload = notificationEmail(type, ticketNumber, title, body);

  try {
    await sendNotification(notificationId, toEmail, payload);
  } catch (error) {
    // Never block the transition on email failure.
    console.error("[notifications] email delivery error:", error);
  }
}

/**
 * Convenience: look up the recipient's email from a ticket's requester or
 * assignee profile, then send. Used by Server Actions after a transition.
 */
export async function emailTicketActor(
  notificationId: string,
  ticketId: string,
  actor: "requester" | "assignee",
  type: string,
  ticketNumber: string,
  title: string,
  body: string,
): Promise<void> {
  const supabase = await getSupabase();
  const ticketResult = actor === "requester"
    ? await supabase.from("tickets").select("requester_id").eq("id", ticketId).single()
    : await supabase.from("tickets").select("assigned_to, requester_id").eq("id", ticketId).single();

  const ticket = ticketResult.data as { requester_id?: string; assigned_to?: string } | null;
  if (!ticket) return;

  const actorId = actor === "requester" ? ticket.requester_id : ticket.assigned_to;
  if (!actorId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", actorId)
    .single();

  if (!profile?.email) return;

  await deliverNotificationEmail(
    notificationId,
    profile.email,
    type,
    ticketNumber,
    title,
    body,
  );
}

/**
 * After a successful transition, find the in-app notification the DB trigger
 * just created and attempt email delivery. Fire-and-forget: never blocks the
 * caller.
 *
 * @param supabase - the server Supabase client (already authenticated)
 * @param ticketId - the ticket that changed
 * @param type - the notification type the trigger wrote (e.g. 'ticket_resolved')
 * @param actor - who should receive the email ('requester' or 'assignee')
 * @param title - email subject line
 * @param body - email body text
 */
export async function notifyAfterTransition(
  supabase: any,
  ticketId: string,
  type: string,
  actor: "requester" | "assignee",
  title: string,
  body: string,
): Promise<void> {
  const { data: ticket } = await supabase
    .from("tickets")
    .select("ticket_number")
    .eq("id", ticketId)
    .single();
  if (!ticket) return;

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id")
    .eq("ticket_id", ticketId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1);

  const notificationId = notifications?.[0]?.id;
  if (!notificationId) return;

  await emailTicketActor(
    notificationId,
    ticketId,
    actor,
    type,
    ticket.ticket_number,
    title,
    body,
  );
}
