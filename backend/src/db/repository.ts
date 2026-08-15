import { v4 as uuid } from "uuid";
import { db } from "./db";
import type {
  Property,
  Lead,
  CallRecord,
  CallMessage,
  LeadRequirements,
  PropertySearchQuery,
} from "../types";

function rowToProperty(row: any): Property {
  return {
    id: row.id,
    title: row.title,
    propertyType: row.property_type,
    city: row.city,
    state: row.state,
    locality: row.locality,
    priceInr: row.price_inr,
    bhk: row.bhk,
    areaSqft: row.area_sqft,
    amenities: JSON.parse(row.amenities ?? "[]"),
    imageUrl: row.image_url,
    listingUrl: row.listing_url,
    description: row.description,
    createdAt: row.created_at,
  };
}

function rowToLead(row: any): Lead {
  return {
    id: row.id,
    fullName: row.full_name,
    phoneNumber: row.phone_number,
    preferredLanguage: row.preferred_language,
    city: row.city,
    state: row.state,
    locality: row.locality,
    propertyType: row.property_type,
    budgetMinInr: row.budget_min_inr,
    budgetMaxInr: row.budget_max_inr,
    bhkPreference: row.bhk_preference,
    status: row.status,
    source: row.source,
    callId: row.call_id,
    matchedPropertyIds: JSON.parse(row.matched_property_ids ?? "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToCall(row: any): CallRecord {
  return {
    id: row.id,
    leadId: row.lead_id,
    fromNumber: row.from_number,
    twilioCallSid: row.twilio_call_sid,
    source: row.source,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    status: row.status,
  };
}

export const properties = {
  all(): Property[] {
    return (db.prepare("SELECT * FROM properties ORDER BY created_at DESC").all() as any[]).map(
      rowToProperty
    );
  },
  get(id: string): Property | null {
    const row = db.prepare("SELECT * FROM properties WHERE id = ?").get(id);
    return row ? rowToProperty(row) : null;
  },
  create(p: Omit<Property, "id" | "createdAt">): Property {
    const id = uuid();
    db.prepare(
      `INSERT INTO properties
        (id, title, property_type, city, state, locality, price_inr, bhk, area_sqft, amenities, image_url, listing_url, description)
       VALUES (@id, @title, @propertyType, @city, @state, @locality, @priceInr, @bhk, @areaSqft, @amenities, @imageUrl, @listingUrl, @description)`
    ).run({ ...p, id, amenities: JSON.stringify(p.amenities) });
    return properties.get(id)!;
  },
  update(id: string, p: Partial<Omit<Property, "id" | "createdAt">>): Property | null {
    const existing = properties.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...p };
    db.prepare(
      `UPDATE properties SET
        title=@title, property_type=@propertyType, city=@city, state=@state, locality=@locality,
        price_inr=@priceInr, bhk=@bhk, area_sqft=@areaSqft, amenities=@amenities,
        image_url=@imageUrl, listing_url=@listingUrl, description=@description
       WHERE id=@id`
    ).run({ ...merged, id, amenities: JSON.stringify(merged.amenities) });
    return properties.get(id);
  },
  remove(id: string): void {
    db.prepare("DELETE FROM properties WHERE id = ?").run(id);
  },
  search(query: PropertySearchQuery): Property[] {
    const clauses: string[] = [];
    const params: Record<string, unknown> = {};

    if (query.city) {
      clauses.push("LOWER(city) = LOWER(@city)");
      params.city = query.city;
    }
    if (query.state) {
      clauses.push("LOWER(state) = LOWER(@state)");
      params.state = query.state;
    }
    if (query.locality) {
      clauses.push("LOWER(locality) LIKE LOWER(@locality)");
      params.locality = `%${query.locality}%`;
    }
    if (query.propertyType) {
      clauses.push("property_type = @propertyType");
      params.propertyType = query.propertyType;
    }
    if (query.budgetMaxInr) {
      // allow up to 15% over stated budget so close matches aren't dropped
      clauses.push("price_inr <= @budgetMax");
      params.budgetMax = Math.round(query.budgetMaxInr * 1.15);
    }
    if (query.budgetMinInr) {
      clauses.push("price_inr >= @budgetMin");
      params.budgetMin = Math.round(query.budgetMinInr * 0.7);
    }
    if (query.bhkPreference) {
      clauses.push("(bhk = @bhk OR bhk IS NULL)");
      params.bhk = query.bhkPreference;
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const limit = query.limit ?? 5;
    const rows = db
      .prepare(`SELECT * FROM properties ${where} ORDER BY price_inr ASC LIMIT @limit`)
      .all({ ...params, limit }) as any[];
    return rows.map(rowToProperty);
  },
};

export const calls = {
  create(input: {
    fromNumber: string | null;
    twilioCallSid: string | null;
    source: "call" | "web_test";
  }): CallRecord {
    const id = uuid();
    db.prepare(
      `INSERT INTO calls (id, from_number, twilio_call_sid, source, status) VALUES (?, ?, ?, ?, 'in_progress')`
    ).run(id, input.fromNumber, input.twilioCallSid, input.source);
    return calls.get(id)!;
  },
  get(id: string): CallRecord | null {
    const row = db.prepare("SELECT * FROM calls WHERE id = ?").get(id);
    return row ? rowToCall(row) : null;
  },
  list(limit = 100): CallRecord[] {
    return (
      db.prepare("SELECT * FROM calls ORDER BY started_at DESC LIMIT ?").all(limit) as any[]
    ).map(rowToCall);
  },
  finish(id: string, status: "completed" | "failed") {
    const call = calls.get(id);
    if (!call) return;
    const startedAt = new Date(call.startedAt).getTime();
    const durationSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    db.prepare(
      `UPDATE calls SET status = ?, ended_at = datetime('now'), duration_seconds = ? WHERE id = ?`
    ).run(status, durationSeconds, id);
  },
  linkLead(callId: string, leadId: string) {
    db.prepare("UPDATE calls SET lead_id = ? WHERE id = ?").run(leadId, callId);
  },
  addMessage(callId: string, role: CallMessage["role"], text: string, language: CallMessage["language"] = null) {
    const id = uuid();
    db.prepare(
      "INSERT INTO call_messages (id, call_id, role, text, language) VALUES (?, ?, ?, ?, ?)"
    ).run(id, callId, role, text, language);
  },
  messages(callId: string): CallMessage[] {
    return (
      db
        .prepare("SELECT * FROM call_messages WHERE call_id = ? ORDER BY created_at ASC")
        .all(callId) as any[]
    ).map((row) => ({
      id: row.id,
      callId: row.call_id,
      role: row.role,
      text: row.text,
      language: row.language,
      createdAt: row.created_at,
    }));
  },
};

export const leads = {
  createForCall(callId: string, phoneNumber: string, source: "call" | "web_test"): Lead {
    const id = uuid();
    db.prepare(
      `INSERT INTO leads (id, phone_number, source, call_id, status) VALUES (?, ?, ?, ?, 'in_progress')`
    ).run(id, phoneNumber, source, callId);
    calls.linkLead(callId, id);
    return leads.get(id)!;
  },
  get(id: string): Lead | null {
    const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(id);
    return row ? rowToLead(row) : null;
  },
  list(limit = 200): Lead[] {
    return (
      db.prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT ?").all(limit) as any[]
    ).map(rowToLead);
  },
  updateRequirements(id: string, req: LeadRequirements & { preferredLanguage?: Lead["preferredLanguage"] }): Lead | null {
    const existing = leads.get(id);
    if (!existing) return null;
    const merged = {
      fullName: req.fullName ?? existing.fullName,
      city: req.city ?? existing.city,
      state: req.state ?? existing.state,
      locality: req.locality ?? existing.locality,
      propertyType: req.propertyType ?? existing.propertyType,
      budgetMinInr: req.budgetMinInr ?? existing.budgetMinInr,
      budgetMaxInr: req.budgetMaxInr ?? existing.budgetMaxInr,
      bhkPreference: req.bhkPreference ?? existing.bhkPreference,
      preferredLanguage: req.preferredLanguage ?? existing.preferredLanguage,
    };
    db.prepare(
      `UPDATE leads SET
        full_name=@fullName, city=@city, state=@state, locality=@locality, property_type=@propertyType,
        budget_min_inr=@budgetMinInr, budget_max_inr=@budgetMaxInr, bhk_preference=@bhkPreference,
        preferred_language=@preferredLanguage, updated_at=datetime('now')
       WHERE id=@id`
    ).run({ ...merged, id });
    return leads.get(id);
  },
  setStatus(id: string, status: Lead["status"]) {
    db.prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  },
  setMatches(id: string, propertyIds: string[]) {
    db.prepare(
      "UPDATE leads SET matched_property_ids = ?, status = 'matched', updated_at = datetime('now') WHERE id = ?"
    ).run(JSON.stringify(propertyIds), id);
  },
};
