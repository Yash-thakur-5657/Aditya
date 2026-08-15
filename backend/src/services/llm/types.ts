/** Provider-agnostic shapes so agentSession.ts doesn't care whether Claude or Gemini is answering. */

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AssistantReply {
  text: string;
  toolCalls: ToolCall[];
}

export type ConversationTurn =
  | { role: "user"; content: string }
  | { role: "assistant"; text: string; toolCalls: ToolCall[] }
  | { role: "tool_results"; results: Array<{ toolCallId: string; toolName: string; output: unknown }> };

export interface LlmClient {
  converse(history: ConversationTurn[], tools: ToolSchema[], system: string): Promise<AssistantReply>;
}
