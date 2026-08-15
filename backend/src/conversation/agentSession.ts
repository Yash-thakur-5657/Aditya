import { getLlmClient, TOOLS } from "../services/llm";
import type { ConversationTurn, ToolCall } from "../services/llm/types";
import { SYSTEM_PROMPT, GREETING_EN } from "./prompts";
import { leads, calls } from "../db/repository";
import { matchProperties } from "../services/propertyMatcher";
import { sendPropertySummaryWhatsApp } from "../services/whatsapp/twilioWhatsapp";
import type { Property, PropertyType } from "../types";
import { logger } from "../utils/logger";

const MAX_TOOL_ITERATIONS = 4;

export interface AgentSessionOptions {
  callId: string;
  leadId: string;
  phoneNumber: string;
}

export interface AgentTurnResult {
  replyText: string;
  shouldEndCall: boolean;
}

export class AgentSession {
  readonly callId: string;
  readonly leadId: string;
  readonly phoneNumber: string;
  private history: ConversationTurn[] = [];
  private lastMatchedProperties: Property[] = [];

  constructor(opts: AgentSessionOptions) {
    this.callId = opts.callId;
    this.leadId = opts.leadId;
    this.phoneNumber = opts.phoneNumber;
  }

  greeting(): string {
    this.history.push({ role: "assistant", text: GREETING_EN, toolCalls: [] });
    calls.addMessage(this.callId, "agent", GREETING_EN, "en");
    return GREETING_EN;
  }

  async handleUserUtterance(text: string): Promise<AgentTurnResult> {
    calls.addMessage(this.callId, "caller", text);
    this.history.push({ role: "user", content: text });

    const llm = getLlmClient();
    let shouldEndCall = false;
    let iterations = 0;
    let finalText = "";

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      const reply = await llm.converse(this.history, TOOLS, SYSTEM_PROMPT);
      finalText = reply.text;

      this.history.push({ role: "assistant", text: reply.text, toolCalls: reply.toolCalls });

      if (reply.toolCalls.length === 0) break;

      const results: Array<{ toolCallId: string; toolName: string; output: unknown }> = [];
      for (const call of reply.toolCalls) {
        const output = await this.executeTool(call);
        if (call.name === "end_call") shouldEndCall = true;
        results.push({ toolCallId: call.id, toolName: call.name, output });
      }
      this.history.push({ role: "tool_results", results });
    }

    if (!finalText) {
      finalText =
        "Maaf kijiye, kya aap dobara bata sakte hain? Sorry, could you please repeat that?";
    }

    calls.addMessage(this.callId, "agent", finalText);
    return { replyText: finalText, shouldEndCall };
  }

  private async executeTool(toolCall: ToolCall): Promise<unknown> {
    const input = toolCall.input;
    try {
      switch (toolCall.name) {
        case "save_lead_info": {
          const updated = leads.updateRequirements(this.leadId, {
            fullName: input.fullName as string | undefined,
            city: input.city as string | undefined,
            state: input.state as string | undefined,
            locality: input.locality as string | undefined,
            propertyType: input.propertyType as PropertyType | undefined,
            budgetMinInr: input.budgetMinInr as number | undefined,
            budgetMaxInr: input.budgetMaxInr as number | undefined,
            bhkPreference: input.bhkPreference as number | undefined,
            preferredLanguage: input.preferredLanguage as "hi" | "en" | "mixed" | undefined,
          });
          return { ok: true, lead: updated };
        }
        case "search_properties": {
          const result = matchProperties({
            city: input.city as string | undefined,
            state: input.state as string | undefined,
            locality: input.locality as string | undefined,
            propertyType: input.propertyType as PropertyType | undefined,
            budgetMinInr: input.budgetMinInr as number | undefined,
            budgetMaxInr: input.budgetMaxInr as number | undefined,
            bhkPreference: input.bhkPreference as number | undefined,
            limit: 5,
          });
          this.lastMatchedProperties = result.properties;
          leads.setMatches(
            this.leadId,
            result.properties.map((p) => p.id)
          );
          return {
            ok: true,
            relaxed: result.relaxed,
            relaxedReason: result.relaxedReason,
            count: result.properties.length,
            properties: result.properties.map((p) => ({
              id: p.id,
              title: p.title,
              propertyType: p.propertyType,
              city: p.city,
              locality: p.locality,
              priceInr: p.priceInr,
              bhk: p.bhk,
              areaSqft: p.areaSqft,
              amenities: p.amenities,
            })),
          };
        }
        case "send_whatsapp_summary": {
          if (this.lastMatchedProperties.length === 0) {
            return { ok: false, reason: "no_properties_matched_yet" };
          }
          const intro =
            (input.confirmationMessage as string) ??
            "Here are the properties we discussed, as promised! / Yeh rahi wo properties jinki humne baat ki thi!";
          const sendResult = await sendPropertySummaryWhatsApp(
            this.leadId,
            this.phoneNumber,
            this.lastMatchedProperties,
            intro
          );
          leads.setStatus(this.leadId, "whatsapp_sent");
          return { ok: true, ...sendResult };
        }
        case "end_call": {
          leads.setStatus(this.leadId, this.lastMatchedProperties.length > 0 ? "matched" : "captured");
          return { ok: true };
        }
        default:
          return { ok: false, reason: `unknown_tool_${toolCall.name}` };
      }
    } catch (err) {
      logger.error({ err, tool: toolCall.name }, "tool execution failed");
      return { ok: false, reason: "tool_execution_error" };
    }
  }
}
