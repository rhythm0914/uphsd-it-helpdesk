// Runs the scheduled maintenance passes from the Cloudflare cron handler.
//
// Both passes live in Postgres as SECURITY DEFINER functions, because both must
// go through public.transition_ticket() — the only writer of ticket state. This
// module only authenticates and calls them, so a failure here can never leave a
// ticket half-updated.
//
// After each DB pass succeeds, email delivery is attempted for the in-app
// notifications the trigger just wrote. Email is best-effort: a missing key or
// provider failure logs a warning and falls back to in-app only. It never
// blocks the scheduled job.
//
// Requires SUPABASE_SERVICE_ROLE_KEY (a Worker secret). Without it the job
// reports `ran: false` instead of throwing, so a misconfigured deploy does not
// break the site — it just does not run the automation.

import { createClient } from "@supabase/supabase-js";
import { ResendNotifier } from "@/utils/notifications/resend";

export interface ScheduledEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RESEND_API_KEY?: string;
}

export interface ScheduledResult {
  ran: boolean;
  reason?: string;
  noResponse?: { reminded: number; closed: number };
  escalation?: { escalated: number };
  emails?: { sent: number; failed: number };
  errors: string[];
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function emailBody(
  type: string,
  ticketNumber: string,
  title: string,
  body: string,
): { subject: string; body: string; html?: string } {
  return {
    subject: `[UPHSD IT Help Desk] ${title}`,
    body: `${title}\n\n${body}\n\nRequest: ${ticketNumber}\n\n— UPHSD IT Help Desk (automated)`,
    html: `
      <h2>${title}</h2>
      <p>${body}</p>
      <p><strong>Request:</strong> ${ticketNumber}</p>
      <hr />
      <p style="color:#666;font-size:12px">UPHSD IT Help Desk — this is an automated notification.</p>
    `,
  };
}

/**
 * Send email for notifications of the given types created in the last window
 * that do not yet have an email delivery record. Returns sent/failed counts.
 * Never throws.
 */
async function deliverPendingEmails(
  supabase: any,
  types: string[],
  windowMinutes: number,
  resendKey: string | undefined,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  if (!resendKey) {
    console.warn(
      "[scheduled] RESEND_API_KEY not set — email delivery skipped for types",
      types.join(","),
    );
    return { sent: 0, failed: 0 };
  }

  const notifier = new ResendNotifier(resendKey);
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, user_id, ticket_id, type, title, body, created_at")
    .in("type", types)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (!notifications || notifications.length === 0) {
    return { sent: 0, failed: 0 };
  }

  // Check which already have email delivery records.
  const ids = notifications.map((n: any) => n.id);
  const { data: existing } = await supabase
    .from("notification_delivery")
    .select("notification_id")
    .in("notification_id", ids)
    .eq("channel", "email");

  const alreadySent = new Set((existing || []).map((d: any) => d.notification_id));

  // Fetch recipient emails via profiles (service role bypasses RLS).
  const userIds = [...new Set(notifications.map((n: any) => n.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);
  const emailByUser = new Map(
    (profiles || []).map((p: any) => [p.id, p.email] as [string, string | null]),
  );

  // Fetch ticket numbers.
  const ticketIds = [...new Set(notifications.map((n: any) => n.ticket_id).filter(Boolean))];
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, ticket_number")
    .in("id", ticketIds);
  const numberByTicket = new Map(
    (tickets || []).map((t: any) => [t.id, t.ticket_number] as [string, string]),
  );

  for (const n of notifications) {
    if (alreadySent.has(n.id)) continue;

    const to = emailByUser.get(n.user_id) ?? null;
    if (!to) {
      failed++;
      continue;
    }
    const recipient: string = to as string;

    const ticketNumber = (n.ticket_id ? (numberByTicket.get(n.ticket_id) || n.ticket_id) : "") as string;
    const payload = emailBody(n.type, ticketNumber, n.title, n.body);

    const delivery = await notifier.send(recipient, payload);

    // Record delivery attempt.
    await supabase.from("notification_delivery").insert({
      notification_id: n.id,
      channel: "email",
      status: delivery.status,
      error: delivery.error ?? null,
      sent_at: delivery.sentAt?.toISOString() ?? null,
    });

    if (delivery.status === "sent") sent++;
    else failed++;
  }

  return { sent, failed };
}

export async function runScheduledJobs(
  env: ScheduledEnv,
  now: Date = new Date(),
): Promise<ScheduledResult> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = env.RESEND_API_KEY;

  if (!url || !serviceKey) {
    return {
      ran: false,
      reason: "SUPABASE_SERVICE_ROLE_KEY is not configured; scheduled passes skipped.",
      errors: [],
    };
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const errors: string[] = [];
  const result: ScheduledResult = { ran: true, errors };

  const stamp = now.toISOString();

  // 3-day reminder / 5-day No Response close.
  const noResponse = await supabase.rpc("run_no_response_job", { p_now: stamp });
  if (noResponse.error) {
    errors.push(`no_response: ${noResponse.error.message}`);
  } else {
    const row = Array.isArray(noResponse.data) ? noResponse.data[0] : noResponse.data;
    result.noResponse = {
      reminded: toNumber(row?.reminded),
      closed: toNumber(row?.closed),
    };

    // Email reminders and no-response closes created in the last 70 minutes.
    try {
      const emails = await deliverPendingEmails(
        supabase,
        ["ticket_reminder", "ticket_rejected"],
        70,
        resendKey,
      );
      result.emails = { sent: emails.sent, failed: emails.failed };
    } catch (err) {
      errors.push(`email_reminder: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // SLA breach / repeat-reopen escalation.
  const escalation = await supabase.rpc("run_sla_escalation", { p_now: stamp });
  if (escalation.error) {
    errors.push(`escalation: ${escalation.error.message}`);
  } else {
    const row = Array.isArray(escalation.data) ? escalation.data[0] : escalation.data;
    result.escalation = { escalated: toNumber(row?.escalated) };

    // Email escalations created in the last 70 minutes.
    try {
      const emails = await deliverPendingEmails(
        supabase,
        ["ticket_escalated"],
        70,
        resendKey,
      );
      result.emails = result.emails
        ? { sent: result.emails.sent + emails.sent, failed: result.emails.failed + emails.failed }
        : { sent: emails.sent, failed: emails.failed };
    } catch (err) {
      errors.push(`email_escalation: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
