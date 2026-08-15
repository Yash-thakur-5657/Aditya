import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../config";
import type { AssistantReply, ConversationTurn, LlmClient, ToolSchema } from "./types";

const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

function toAnthropicTools(tools: ToolSchema[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool.InputSchema,
  }));
}

function toAnthropicMessages(history: ConversationTurn[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];
  for (const turn of history) {
    if (turn.role === "user") {
      messages.push({ role: "user", content: turn.content });
    } else if (turn.role === "assistant") {
      const content: Array<Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam> = [];
      if (turn.text) content.push({ type: "text", text: turn.text });
      for (const call of turn.toolCalls) {
        content.push({ type: "tool_use", id: call.id, name: call.name, input: call.input });
      }
      messages.push({ role: "assistant", content });
    } else {
      const content: Anthropic.ToolResultBlockParam[] = turn.results.map((r) => ({
        type: "tool_result",
        tool_use_id: r.toolCallId,
        content: JSON.stringify(r.output),
      }));
      messages.push({ role: "user", content });
    }
  }
  return messages;
}

export const anthropicProvider: LlmClient = {
  async converse(history, tools, system): Promise<AssistantReply> {
    const response = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 600,
      system,
      tools: toAnthropicTools(tools),
      messages: toAnthropicMessages(history),
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();

    const toolCalls = response.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> }));

    return { text, toolCalls };
  },
};
