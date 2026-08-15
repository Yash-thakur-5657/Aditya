import twilio from "twilio";
import { config } from "../../config";
import type { Property } from "../../types";
import { propertyToWhatsAppLine } from "../propertyMatcher";
import { db } from "../../db/db";
import { v4 as uuid } from "uuid";

let client: twilio.Twilio | null = null;
function getClient(): twilio.Twilio {
  if (!client) client = twilio(config.twilio.accountSid, config.twilio.authToken);
  return client;
}

function toWhatsAppAddress(phone: string): string {
  return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
}

export async function sendPropertySummaryWhatsApp(
  leadId: string,
  toPhoneNumber: string,
  properties: Property[],
  intro: string
): Promise<{ sid: string | null; status: string }> {
  const body = [intro, "", ...properties.map(propertyToWhatsAppLine)].join("\n\n").slice(0, 1590);

  const record = { id: uuid(), leadId, toNumber: toPhoneNumber, body };

  if (!config.twilio.accountSid || !config.twilio.authToken) {
    db.prepare(
      "INSERT INTO whatsapp_messages (id, lead_id, to_number, body, status) VALUES (?, ?, ?, ?, 'skipped_no_credentials')"
    ).run(record.id, record.leadId, record.toNumber, record.body);
    return { sid: null, status: "skipped_no_credentials" };
  }

  try {
    const message = await getClient().messages.create({
      from: toWhatsAppAddress(config.twilio.whatsappNumber),
      to: toWhatsAppAddress(toPhoneNumber),
      body,
    });
    db.prepare(
      "INSERT INTO whatsapp_messages (id, lead_id, to_number, body, twilio_sid, status) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(record.id, record.leadId, record.toNumber, record.body, message.sid, message.status);
    return { sid: message.sid, status: message.status };
  } catch (err) {
    db.prepare(
      "INSERT INTO whatsapp_messages (id, lead_id, to_number, body, status) VALUES (?, ?, ?, ?, 'failed')"
    ).run(record.id, record.leadId, record.toNumber, record.body);
    throw err;
  }
}
