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
  status: "in_progress" | "captured" | "matched" | "whatsapp_sent" | "abandoned";
  source: "call" | "web_test";
  callId: string | null;
  matchedPropertyIds: string[];
  createdAt: string;
  updatedAt: string;
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
}

export interface CallMessage {
  id: string;
  callId: string;
  role: "agent" | "caller" | "system";
  text: string;
  language: "hi" | "en" | "mixed" | null;
  createdAt: string;
}

export interface LeadRequirements {
  fullName?: string;
  city?: string;
  state?: string;
  locality?: string;
  propertyType?: PropertyType;
  budgetMinInr?: number;
  budgetMaxInr?: number;
  bhkPreference?: number;
}

export interface PropertySearchQuery {
  city?: string;
  state?: string;
  locality?: string;
  propertyType?: PropertyType;
  budgetMinInr?: number;
  budgetMaxInr?: number;
  bhkPreference?: number;
  limit?: number;
}
