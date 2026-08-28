// Cloudflare Workers AI chat provider.
//
// Calls the `AI` Worker binding server-side — no API keys, no secrets, no
// outbound AI vendor traffic. The binding runs inside the same Worker that
// already serves the Help Desk.
//
// MODEL SELECTION (documented for Phase 8):
//   `@cf/meta/llama-3.1-8b-instruct-fast` — the active (non-deprecated) fast
//   variant of the Llama 3.1 8B instruction-tuned chat model on Workers AI,
//   included in the Workers Free plan allocation. NOTE: the older
//   `@cf/meta/llama-3.1-8b-instruct` slug is now flagged Deprecated by the
//   Cloudflare model catalog and its model page returns 404 — it must not be
//   used. The identifier is overridable via the non-secret `AI_MODEL` wrangler
//   var without a code change, so a newer model can be adopted by config alone.

import { AIUnavailableError, type ChatProvider } from "./provider";
import { getWorkerEnv } from "./env";

export const DEFAULT_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

function resolveModel(): string {
  const configured = getWorkerEnv()?.AI_MODEL;
  return configured && configured.trim() ? configured.trim() : DEFAULT_AI_MODEL;
}

/**
 * Normalizes the various response shapes Workers AI can return. Covers:
 *   - top-level string
 *   - { response: string }                          (llama-3.1-8b-instruct-fast sync)
 *   - OpenAI-compatible { choices: [{ message: { content } }] }  (newer bindings)
 *   - { result: { response: string } } / { result: [{ response }] } (legacy chat)
 */
function extractText(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    if (typeof r.response === "string") return r.response;
    if (Array.isArray(r.choices)) {
      // OpenAI-compatible chat completion shape (new bindings / `/v1`).
      for (const choice of r.choices as unknown[]) {
        if (choice && typeof choice === "object") {
          const msg = (choice as Record<string, unknown>).message as Record<string, unknown> | undefined;
          if (msg && typeof msg.content === "string") return msg.content;
          if (typeof (choice as Record<string, unknown>).text === "string") return (choice as Record<string, unknown>).text as string;
        }
      }
    }
    if (Array.isArray(r.result)) {
      // chat-completion style: { result: { response } } or message arrays
      for (const item of r.result as unknown[]) {
        if (item && typeof item === "object") {
          const c = (item as Record<string, unknown>).response ?? (item as Record<string, unknown>).content;
          if (typeof c === "string") return c;
        }
      }
    }
    if (result && typeof (result as Record<string, unknown>).result === "object") {
      const inner = (result as Record<string, unknown>).result as Record<string, unknown>;
      if (typeof inner.response === "string") return inner.response;
    }
  }
  throw new Error("Unrecognized Workers AI response shape");
}

export function createCloudflareWorkersAIProvider(): ChatProvider {
  return {
    name: "cloudflare-workers-ai",
    async generateChat(messages, options) {
      const binding = getWorkerEnv()?.AI;
      if (!binding) throw new AIUnavailableError();

      // Workers AI chat-style input: the binding accepts a messages array
      // for instruct/chat models. Keep max_tokens modest — Help Desk answers
      // should be short (see the system prompt) and the free allocation is a
      // shared, limited resource.
      const result = await binding.run(resolveModel(), {
        messages,
        max_tokens: options?.maxTokens ?? 600,
        temperature: options?.temperature ?? 0.3,
      });

      const text = extractText(result).trim();
      if (!text) throw new Error("Empty AI response");
      return { text };
    },
  };
}