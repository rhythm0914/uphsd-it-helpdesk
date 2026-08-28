import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AI_ASSISTANT_NAME,
  AI_DISCLOSURE,
  AI_DISCLOSURE_SHORT,
  AI_PRIVACY_NOTICE_PATH,
} from "../../utils/ai/transparency";

// Phase 8.6 — AI transparency / privacy hardening checks.
// These verify the disclosures exist and that no conversation storage or
// tracking was introduced into the assistant client code.

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("AI transparency disclosures", () => {
  it("labels the assistant as an AI Assistant", () => {
    expect(AI_ASSISTANT_NAME).toMatch(/AI Assistant/i);
  });

  it("provides a clear AI-generated disclosure for first interaction", () => {
    expect(AI_DISCLOSURE).toMatch(/AI assistant/i);
    expect(AI_DISCLOSURE).toMatch(/AI-generated/i);
    expect(AI_DISCLOSURE).toMatch(/verification/i);
  });

  it("provides a compact persistent disclosure", () => {
    expect(AI_DISCLOSURE_SHORT).toMatch(/AI-generated/i);
  });

  it("exposes a privacy notice route", () => {
    expect(AI_PRIVACY_NOTICE_PATH).toBe("/portal/assistant/privacy");
  });

  it("renders the disclosure + privacy link on the dedicated assistant page", () => {
    const page = read("app/portal/assistant/page.tsx");
    expect(page).toContain("AI_DISCLOSURE");
    expect(page).toContain("AI_PRIVACY_NOTICE_PATH");
  });

  it("renders persistent disclosures in the chat and floating widget", () => {
    expect(read("app/portal/assistant/assistant-chat.tsx")).toContain("AI_DISCLOSURE_SHORT");
    expect(read("components/ui/chat-widget.tsx")).toContain("AI_DISCLOSURE_SHORT");
  });

  it("privacy notice documents no-conversation-storage and UPHSD placeholders", () => {
    const notice = read("app/portal/assistant/privacy/page.tsx");
    expect(notice).toMatch(/not stored/i);
    expect(notice).toMatch(/TO BE CONFIRMED BY UPHSD/);
    expect(notice).toMatch(/Data Privacy\s+Act of 2012/);
    expect(notice).toMatch(/Submit an IT Request/);
  });
});

describe("AI privacy: no storage / tracking in assistant clients", () => {
  const clientFiles = [
    "app/portal/assistant/assistant-chat.tsx",
    "components/ui/chat-widget.tsx",
  ];

  it.each(clientFiles)("introduces no browser storage or tracking in %s", (file) => {
    const src = read(file);
    expect(src).not.toMatch(/localStorage|sessionStorage/);
    expect(src).not.toMatch(/document\.cookie/);
    expect(src).not.toMatch(/gtag|analytics|fbq|posthog/i);
  });

  it("does not send the profile/role/email to the AI endpoint", () => {
    // Only message + history are posted to /api/assistant.
    const widget = read("components/ui/chat-widget.tsx");
    const chat = read("app/portal/assistant/assistant-chat.tsx");
    for (const src of [widget, chat]) {
      expect(src).toMatch(/message:\s*text/);
      expect(src).not.toMatch(/role:\s*profile|email:\s*profile|user_id/);
    }
  });
});

describe("AI accuracy rule", () => {
  it("system prompt instructs the verified-UPHSD uncertainty phrase", () => {
    const prompt = read("utils/ai/prompt.ts");
    expect(prompt).toContain("I don't have a verified UPHSD procedure for that.");
  });
});
