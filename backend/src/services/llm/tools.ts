import type { ToolSchema } from "./types";

export const TOOLS: ToolSchema[] = [
  {
    name: "save_lead_info",
    description:
      "Save or update any piece of the caller's requirements as soon as it is learned during the conversation. Call this incrementally - do not wait until you have everything.",
    parameters: {
      type: "object",
      properties: {
        fullName: { type: "string", description: "Caller's full name" },
        city: { type: "string", description: "City the caller wants to buy/rent in" },
        state: { type: "string", description: "State the caller wants to buy/rent in" },
        locality: { type: "string", description: "Specific locality/area/neighbourhood, if mentioned" },
        propertyType: {
          type: "string",
          enum: ["apartment", "villa", "independent_house", "plot", "commercial", "pg"],
          description: "Type of property the caller is looking for",
        },
        budgetMinInr: { type: "number", description: "Lower bound of budget in INR (rupees, not lakhs)" },
        budgetMaxInr: { type: "number", description: "Upper bound of budget in INR (rupees, not lakhs)" },
        bhkPreference: { type: "number", description: "Preferred number of bedrooms (BHK), if relevant" },
        preferredLanguage: {
          type: "string",
          enum: ["hi", "en", "mixed"],
          description: "Language/mix the caller is most comfortable speaking in",
        },
      },
    },
  },
  {
    name: "search_properties",
    description:
      "Search the live property listings database for properties matching the caller's stated requirements. Returns up to 5 ranked matches. Call this once you have at least city, property type, and a budget.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string" },
        state: { type: "string" },
        locality: { type: "string" },
        propertyType: {
          type: "string",
          enum: ["apartment", "villa", "independent_house", "plot", "commercial", "pg"],
        },
        budgetMinInr: { type: "number" },
        budgetMaxInr: { type: "number" },
        bhkPreference: { type: "number" },
      },
      required: ["city", "propertyType"],
    },
  },
  {
    name: "send_whatsapp_summary",
    description:
      "Send a WhatsApp message to the caller's phone number summarizing the matched properties with photos and listing links. Call this once, after you have verbally presented the matches to the caller.",
    parameters: {
      type: "object",
      properties: {
        confirmationMessage: {
          type: "string",
          description: "Short note to prepend to the WhatsApp message, in the caller's language",
        },
      },
    },
  },
  {
    name: "end_call",
    description: "Signal that the conversation is complete and the call should be wrapped up after this reply.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string" },
      },
    },
  },
];
