export type PropertyType =
  | "apartment"
  | "villa"
  | "independent_house"
  | "plot"
  | "commercial"
  | "pg";

export interface Property {
  id: string;
  title: string;
  propertyType: PropertyType;
  city: string;
  state: string;
  locality: string;
  priceInr: number;
  bhk: number | null;
  areaSqft: number;
  amenities: string[];
  imageUrl: string;
  listingUrl: string;
  description: string;
  createdAt: string;
}

export type LeadStatus = "in_progress" | "captured" | "matched" | "whatsapp_sent" | "abandoned";

export interface Lead {
  id: string;
  fullName: string | null;
  phoneNumber: string;
  preferredLanguage: "hi" | "en" | "mixed" | null;
  city: string | null;
  state: string | null;
  locality: string | null;
  propertyType: PropertyType | null;
  budgetMinInr: number | null;
  budgetMaxInr: number | null;
  bhkPreference: number | null;
  status: LeadStatus;
  source: "call" | "web_test";
  callId: string | null;
  matchedPropertyIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CallMessage {
  id: string;
  callId: string;
  role: "agent" | "caller" | "system";
  text: string;
  language: string | null;
  createdAt: string;
}

export interface CallRecord {
  id: string;
  leadId: string | null;
  fromNumber: string | null;
  twilioCallSid: string | null;
  source: "call" | "web_test";
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  status: "ringing" | "in_progress" | "completed" | "failed";
  messages?: CallMessage[];
}

export interface LeadDetail extends Lead {
  call: CallRecord | null;
  messages: CallMessage[];
  matchedProperties: Property[];
}

export interface AnalyticsSummary {
  totalCalls: number;
  totalLeads: number;
  matchedLeads: number;
  whatsappSent: number;
  conversionRate: number;
  avgCallDurationSeconds: number | null;
  callsPerDay: Array<{ day: string; count: number }>;
  topCities: Array<{ city: string; count: number }>;
  propertyTypeBreakdown: Array<{ propertyType: PropertyType; count: number }>;
  leadStatusBreakdown: Array<{ status: LeadStatus; count: number }>;
}

export interface StatusResponse {
  nodeEnv: string;
  publicBaseUrl: string;
  llmProvider: "anthropic" | "gemini";
  integrations: {
    anthropic: boolean;
    gemini: boolean;
    deepgram: boolean;
    elevenlabs: boolean;
    twilioVoice: boolean;
    twilioWhatsapp: boolean;
  };
  twilioVoiceNumber: string | null;
  twilioWhatsappNumber: string | null;
}
