import { config } from "../../config";
import { logger } from "../../utils/logger";
import type { AssistantReply, ConversationTurn, LlmClient, ToolSchema } from "./types";

const GEMINI_URL = (model: string, apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

/**
 * Gemini's function-calling schema is an OpenAPI-subset that expects
 * UPPERCASE type names (STRING/NUMBER/INTEGER/BOOLEAN/ARRAY/OBJECT) rather
 * than plain JSON Schema's lowercase ones - convert recursively.
 */
function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (schema === null || typeof schema !== "object") return schema;

  const input = schema as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "type" && typeof value === "string") {
      output[key] = value.toUpperCase();
    } else if (key === "properties" && value && typeof value === "object") {
      const props: Record<string, unknown> = {};
      for (const [propKey, propValue] of Object.entries(value as Record<string, unknown>)) {
        props[propKey] = toGeminiSchema(propValue);
      }
      output[key] = props;
    } else if (key === "items") {
      output[key] = toGeminiSchema(value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function toGeminiTools(tools: ToolSchema[]) {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: toGeminiSchema(t.parameters),
      })),
    },
  ];
}

function toGeminiContents(history: ConversationTurn[]) {
  return history.map((turn) => {
    if (turn.role === "user") {
      return { role: "user", parts: [{ text: turn.content }] };
    }
    if (turn.role === "assistant") {
      const parts: unknown[] = [];
      if (turn.text) parts.push({ text: turn.text });
      for (const call of turn.toolCalls) {
        parts.push({ functionCall: { name: call.name, args: call.input } });
      }
      return { role: "model", parts };
    }
    return {
      role: "function",
      parts: turn.results.map((r) => ({
        functionResponse: { name: r.toolName, response: { result: r.output } },
      })),
    };
  });
}

export const geminiProvider: LlmClient = {
  async converse(history, tools, system): Promise<AssistantReply> {
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: toGeminiContents(history),
      tools: toGeminiTools(tools),
    };

    const response = await fetch(GEMINI_URL(config.gemini.model, config.gemini.apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      logger.error({ status: response.status, errBody }, "Gemini API request failed");
      throw new Error(`Gemini API failed: ${response.status} ${errBody}`);
    }

    const data = (await response.json()) as any;
    const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];

    const text = parts
      .filter((p) => typeof p.text === "string")
      .map((p) => p.text)
      .join(" ")
      .trim();

    const toolCalls = parts
      .filter((p) => p.functionCall)
      .map((p, i) => ({
        id: `${p.functionCall.name}_${i}`,
        name: p.functionCall.name as string,
        input: (p.functionCall.args ?? {}) as Record<string, unknown>,
      }));

    return { text, toolCalls };
  },
};
