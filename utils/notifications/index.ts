// Notification channel factory and send helper.
//
// Email is optional: if RESEND_API_KEY is not set, email is skipped with a
// console warning and in-app remains the only channel. No secret reaches the
// client — RESEND_API_KEY is read only in server/Worker code.

import { InAppNotifier } from "./notifier";
import { ResendNotifier } from "./resend";
import type {
  Notifier,
  NotificationPayload,
  DeliveryRecord,
  SendResult,
} from "./notifier";

export type {
  Notifier,
  NotificationPayload,
  DeliveryRecord,
  SendResult,
} from "./notifier";

let notifier: Notifier | null = null;

/** Builds the notifier chain: in-app always, email when configured. */
function buildNotifier(): Notifier {
  const apiKey =
    typeof process !== "undefined" && process.env
      ? (process.env.RESEND_API_KEY as string | undefined)
      : undefined;

  const email = new ResendNotifier(apiKey);
  if (email.isConfigured) {
    console.info("[notifications] email channel configured (Resend)");
    return email;
  }

  console.warn(
    "[notifications] RESEND_API_KEY is not set — email notifications disabled; in-app only.",
  );
  return new InAppNotifier();
}

/** Returns the shared notifier (lazily built). */
export function getNotifier(): Notifier {
  if (!notifier) notifier = buildNotifier();
  return notifier;
}

/** True when the email provider is configured. */
export function isEmailConfigured(): boolean {
  return getNotifier().channel === "email";
}

/**
 * Attempts to deliver one notification across all configured channels.
 *
 * Never throws: channel failures are captured in DeliveryRecord and the
 * ticket transition is never blocked by email.
 *
 * @param notificationId - the public.notifications row id
 * @param to - recipient email address
 * @param payload - subject/body/html
 */
export async function sendNotification(
  notificationId: string,
  to: string,
  payload: NotificationPayload,
): Promise<SendResult> {
  const notifier = getNotifier();

  const inApp: DeliveryRecord = {
    notificationId,
    channel: "in_app",
    status: "sent",
    sentAt: new Date(),
  };

  let email: DeliveryRecord | undefined;
  let emailConfigured = false;

  if (notifier.channel === "email") {
    emailConfigured = true;
    email = await notifier.send(to, payload);
  } else {
    console.warn(
      "[notifications] email channel not configured; in-app only for notification",
      notificationId,
    );
  }

  return { inApp, email, emailConfigured };
}

/** Resend sender convenience: direct fire-and-send for one-off emails. */
export async function sendResendEmail(
  apiKey: string,
  to: string,
  payload: NotificationPayload,
  from?: string,
): Promise<DeliveryRecord> {
  const notifier = new ResendNotifier(apiKey, from);
  return notifier.send(to, payload);
}
