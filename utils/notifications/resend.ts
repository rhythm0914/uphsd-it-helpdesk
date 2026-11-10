// Resend email provider.
//
// Reads RESEND_API_KEY from the environment (Worker secret or Next.js server
// env). Never bundled to the client. If the key is missing, send() returns a
// "failed" record and the caller falls back to in-app only.
//
// Resend API: POST https://api.resend.com/emails
//   Header: Authorization: Bearer RESEND_API_KEY
//   Body: { from, to, subject, html, text }

import type { Notifier, NotificationPayload, DeliveryRecord, NotificationStatus } from "./notifier";

const RESEND_API_URL = "https://api.resend.com/emails";

export class ResendNotifier implements Notifier {
  readonly channel = "email" as const;

  private readonly apiKey: string | undefined;
  private readonly from: string;

  constructor(apiKey?: string, from = "UPHSD IT Help Desk <noreply@uphsd.edu.ph>") {
    this.apiKey = apiKey;
    this.from = from;
  }

  /** True when a provider key is configured. */
  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async send(to: string, payload: NotificationPayload): Promise<DeliveryRecord> {
    if (!this.apiKey) {
      return {
        notificationId: "",
        channel: "email",
        status: "failed",
        error: "RESEND_API_KEY is not configured; email notification skipped.",
      };
    }

    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to,
          subject: payload.subject,
          text: payload.body,
          ...(payload.html ? { html: payload.html } : {}),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        return {
          notificationId: "",
          channel: "email",
          status: "failed",
          error: `Resend API error (${response.status}): ${errorBody}`,
        };
      }

      const data = (await response.json()) as { id?: string };
      return {
        notificationId: data.id ?? "",
        channel: "email",
        status: "sent",
        sentAt: new Date(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        notificationId: "",
        channel: "email",
        status: "failed",
        error: `Email send failed: ${message}`,
      };
    }
  }
}

/** Normalizes a NotificationStatus from a provider result. */
export function coerceStatus(value: unknown): NotificationStatus {
  if (value === "sent" || value === "failed" || value === "pending") return value;
  return "pending";
}
