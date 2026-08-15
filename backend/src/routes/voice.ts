import { Router } from "express";
import { calls, leads } from "../db/repository";
import { createSession, destroySession } from "../conversation/sessionStore";
import { buildStreamTwiml, buildRejectTwiml, validateTwilioRequest } from "../services/telephony/twilio";
import { logger } from "../utils/logger";

export const voiceRouter = Router();

// Twilio hits this when a call comes in on the configured voice number.
voiceRouter.post("/incoming", validateTwilioRequest, (req, res) => {
  const from = (req.body.From as string) ?? "unknown";
  const twilioCallSid = (req.body.CallSid as string) ?? null;

  try {
    const call = calls.create({ fromNumber: from, twilioCallSid, source: "call" });
    const lead = leads.createForCall(call.id, from, "call");
    createSession({ callId: call.id, leadId: lead.id, phoneNumber: from });

    logger.info({ callId: call.id, from }, "Incoming call - session created");
    res.type("text/xml").send(buildStreamTwiml(call.id));
  } catch (err) {
    logger.error({ err }, "Failed to set up incoming call");
    res
      .type("text/xml")
      .send(
        buildRejectTwiml(
          "Sorry, our property assistant is unavailable right now. Please try again shortly."
        )
      );
  }
});

// Twilio call status callback - keeps the DB call record accurate even if the
// media stream websocket disconnects abnormally (network drop, caller hangs up, etc).
voiceRouter.post("/status", validateTwilioRequest, (req, res) => {
  const twilioCallSid = req.body.CallSid as string;
  const callStatus = req.body.CallStatus as string;
  logger.info({ twilioCallSid, callStatus }, "Twilio call status callback");

  if (["completed", "busy", "failed", "no-answer", "canceled"].includes(callStatus)) {
    const match = calls.list(500).find((c) => c.twilioCallSid === twilioCallSid);
    if (match && match.status !== "completed") {
      calls.finish(match.id, callStatus === "completed" ? "completed" : "failed");
      destroySession(match.id);
    }
  }
  res.sendStatus(200);
});
