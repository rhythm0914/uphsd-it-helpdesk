import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---- Capture fetch calls so we can assert Resend API usage without network ----
const fetchMock = vi.fn();

vi.hoisted(() => {
  // No env vars required at import time; buildNotifier() reads lazily.
});

vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  delete process.env.RESEND_API_KEY;
  // Reset the cached notifier so each test builds fresh.
  vi.resetModules();
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
});

describe("ResendNotifier", () => {
  it("sends an email via the Resend API when configured", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "resend_email_123" }),
    });

    const { ResendNotifier } = await import("@/utils/notifications/resend");
    const notifier = new ResendNotifier("re_test_key");

    const result = await notifier.send("alice@uphsd.edu.ph", {
      subject: "Verify your request",
      body: "Please confirm the fix.",
      html: "<p>Please confirm the fix.</p>",
    });

    expect(result.status).toBe("sent");
    expect(result.sentAt).toBeInstanceOf(Date);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(init.body as string);
    expect(body.to).toBe("alice@uphsd.edu.ph");
    expect(body.subject).toBe("Verify your request");
    expect(body.text).toBe("Please confirm the fix.");
    expect(body.html).toBe("<p>Please confirm the fix.</p>");
    expect(body.from).toContain("UPHSD IT Help Desk");
  });

  it("returns failed without calling the API when no key is configured", async () => {
    const { ResendNotifier } = await import("@/utils/notifications/resend");
    const notifier = new ResendNotifier(undefined);

    const result = await notifier.send("alice@uphsd.edu.ph", {
      subject: "Verify",
      body: "Body",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("RESEND_API_KEY is not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns failed on network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("DNS failure"));

    const { ResendNotifier } = await import("@/utils/notifications/resend");
    const notifier = new ResendNotifier("re_test_key");

    const result = await notifier.send("alice@uphsd.edu.ph", {
      subject: "Verify",
      body: "Body",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("DNS failure");
  });

  it("returns failed on non-ok Resend response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const { ResendNotifier } = await import("@/utils/notifications/resend");
    const notifier = new ResendNotifier("re_test_key");

    const result = await notifier.send("alice@uphsd.edu.ph", {
      subject: "Verify",
      body: "Body",
    });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("401");
  });
});

describe("sendNotification (channel factory)", () => {
  it("falls back to in-app only when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;

    const { sendNotification } = await import("@/utils/notifications");
    const result = await sendNotification("notif_1", "alice@uphsd.edu.ph", {
      subject: "Verify",
      body: "Please confirm.",
    });

    expect(result.inApp.status).toBe("sent");
    expect(result.email).toBeUndefined();
    expect(result.emailConfigured).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends email when RESEND_API_KEY is configured", async () => {
    process.env.RESEND_API_KEY = "re_test_key";

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "resend_1" }),
    });

    const { sendNotification } = await import("@/utils/notifications");
    const result = await sendNotification("notif_2", "bob@uphsd.edu.ph", {
      subject: "Reminder",
      body: "Reply within 2 days.",
    });

    expect(result.emailConfigured).toBe(true);
    expect(result.email?.status).toBe("sent");
    expect(result.inApp.status).toBe("sent");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("records a failed email delivery without throwing", async () => {
    process.env.RESEND_API_KEY = "re_test_key";

    fetchMock.mockRejectedValueOnce(new Error("Network down"));

    const { sendNotification } = await import("@/utils/notifications");
    const result = await sendNotification("notif_3", "alice@uphsd.edu.ph", {
      subject: "Verify",
      body: "Please confirm.",
    });

    expect(result.emailConfigured).toBe(true);
    expect(result.email?.status).toBe("failed");
    expect(result.inApp.status).toBe("sent");
  });
});

describe("coerceStatus", () => {
  it("normalizes known statuses", async () => {
    const { coerceStatus } = await import("@/utils/notifications/resend");
    expect(coerceStatus("sent")).toBe("sent");
    expect(coerceStatus("failed")).toBe("failed");
    expect(coerceStatus("pending")).toBe("pending");
    expect(coerceStatus("garbage")).toBe("pending");
    expect(coerceStatus(undefined)).toBe("pending");
  });
});
