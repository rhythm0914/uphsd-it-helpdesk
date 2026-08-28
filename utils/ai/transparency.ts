// AI transparency & privacy disclosure constants (Phase 8.6).
//
// Single source of truth for the AI identity + disclosure wording used by
// both the /portal/assistant page and the floating chat widget. Kept as
// constants so tests can assert the disclosures exist and stay consistent.
//
// NOTE: These are UI transparency strings, not legal advice. Organizational
// details (controller identity, DPO contact, retention) are intentional
// placeholders requiring UPHSD confirmation — see /portal/assistant/privacy.

export const AI_ASSISTANT_NAME = "AI Assistant";

/** Visible, persistent disclosure shown at/before first interaction. */
export const AI_DISCLOSURE =
  "You are interacting with an AI assistant. Responses are AI-generated and may require verification.";

/** Short label variant for compact spaces (widget header). */
export const AI_DISCLOSURE_SHORT = "AI-generated responses — may require verification.";

/** Route of the AI privacy notice. */
export const AI_PRIVACY_NOTICE_PATH = "/portal/assistant/privacy";
