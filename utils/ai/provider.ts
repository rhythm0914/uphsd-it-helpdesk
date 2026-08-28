// AI provider abstraction for the UPHSD IT Help Desk Assistant.
//
// The provider interface is intentionally tiny: the assistant needs one
// operation — generate a chat completion from a list of messages. Swapping
// Workers AI for another provider (OpenAI, Anthropic, self-hosted, ...)
// means adding one file that implements ChatProvider and registering it in
// getChatProvider(); no route or UI code changes.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResult {
  /** The assistant's reply text. */
  text: string;
}

export interface ChatProvider {
  readonly name: string;
  generateChat(
    messages: ChatMessage[],
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<ChatCompletionResult>;
}

export class AIUnavailableError extends Error {
  constructor(message = "AI binding is not available in this runtime") {
    super(message);
    this.name = "AIUnavailableError";
  }
}