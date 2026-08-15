import { config } from "../../config";
import { anthropicProvider } from "./anthropicProvider";
import { geminiProvider } from "./geminiProvider";
import type { LlmClient } from "./types";

export function getLlmClient(): LlmClient {
  return config.llm.provider === "gemini" ? geminiProvider : anthropicProvider;
}

export type { AssistantReply, ConversationTurn, ToolCall, ToolSchema, LlmClient } from "./types";
export { TOOLS } from "./tools";
