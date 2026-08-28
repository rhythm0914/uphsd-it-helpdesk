// AI Assistant composition root (server-side only).
//
// Route handlers and server actions import from this module — never from
// the Cloudflare-specific provider directly — so the provider can be
// swapped later without touching feature code.

export { AIUnavailableError, type ChatMessage, type ChatProvider } from "./provider";
export { createCloudflareWorkersAIProvider, DEFAULT_AI_MODEL } from "./cloudflare-workers-ai";
export { getWorkerEnv, hasAIBinding, setWorkerEnv, type WorkerEnv, type WorkersAIBinding } from "./env";
export { buildMessages, SYSTEM_INSTRUCTION } from "./prompt";
export {
  extractSearchTerms,
  rankArticles,
  retrieveKnowledge,
  type RetrievedArticle,
} from "./retrieval";
export {
  checkRateLimit,
  recordRateLimitHit,
  resetRateLimits,
  type RateLimitResult,
} from "./rate-limit";
export {
  MAX_HISTORY_MESSAGES,
  MAX_HISTORY_MESSAGE_LENGTH,
  MAX_MESSAGE_LENGTH,
  validateAssistantRequest,
  type ValidationError,
  type ValidatedAssistantRequest,
} from "./validation";

import { createCloudflareWorkersAIProvider } from "./cloudflare-workers-ai";
import type { ChatProvider } from "./provider";

/**
 * Resolves the active chat provider. Currently only Cloudflare Workers AI is
 * wired up; adding another provider means implementing ChatProvider and
 * extending this function (e.g. choosing by an env var).
 */
export function getChatProvider(): ChatProvider {
  return createCloudflareWorkersAIProvider();
}