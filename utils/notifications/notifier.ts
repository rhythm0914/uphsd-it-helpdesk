// Notification channel interface.
//
// The in-app notification channel is the base channel: every transition writes
// an in-app row inside the same transaction as the ticket change. Email is an
// optional, best-effort secondary channel: it never blocks a ticket transition,
// and if no provider key is configured it logs a warning and falls back to
// in-app only.
//
// Providers implement the Notifier interface. The factory (index.ts) picks a
// provider based on NEXT_PUBLIC_SUPABASE_* env vars — never client-side.

export type NotificationChannel = "in_app" | "email";
export type NotificationStatus = "sent" | "failed" | "pending";

export interface NotificationPayload {
  /** Human-readable subject line. */
  subject: string;
  /** Plain-text body. */
  body: string;
  /** Optional HTML body (email providers may use it). */
  html?: string;
}

export interface DeliveryRecord {
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  error?: string;
  sentAt?: Date;
}

/** A notification provider: in-app is always available, email is optional. */
export interface Notifier {
  readonly channel: NotificationChannel;
  /** Best-effort send. Never throws: errors are captured in the result. */
  send(to: string, payload: NotificationPayload): Promise<DeliveryRecord>;
}

/** In-app channel: no external send needed, the DB trigger already wrote the row. */
export class InAppNotifier implements Notifier {
  readonly channel = "in_app" as const;

  async send(): Promise<DeliveryRecord> {
    return {
      notificationId: "",
      channel: "in_app",
      status: "sent",
      sentAt: new Date(),
    };
  }
}

/** Result of attempting all configured channels for one notification. */
export interface SendResult {
  inApp: DeliveryRecord;
  email?: DeliveryRecord;
  emailConfigured: boolean;
}
