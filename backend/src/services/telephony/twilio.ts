import twilio from "twilio";
import type { Request, Response, NextFunction } from "express";
import { config } from "../../config";

/**
 * Builds the TwiML that connects an inbound call to our real-time Media Stream
 * websocket, passing our internal call id through as a custom stream parameter
 * so the websocket handler can look up the right AgentSession.
 */
export function buildStreamTwiml(ourCallId: string): string {
  const response = new twilio.twiml.VoiceResponse();
  const wsBase = config.publicBaseUrl.replace(/^http/, "ws");
  const connect = response.connect();
  const stream = connect.stream({ url: `${wsBase}/media-stream` });
  stream.parameter({ name: "ourCallId", value: ourCallId });
  return response.toString();
}

export function buildRejectTwiml(message: string): string {
  const response = new twilio.twiml.VoiceResponse();
  response.say({ voice: "Polly.Aditi" }, message);
  response.hangup();
  return response.toString();
}

/**
 * Verifies the X-Twilio-Signature header so only genuine Twilio requests can
 * trigger call/webhook handling. Skips validation in non-production so local
 * testing (e.g. via curl) doesn't require a real signature.
 */
export function validateTwilioRequest(req: Request, res: Response, next: NextFunction): void {
  if (config.nodeEnv !== "production") {
    next();
    return;
  }

  const signature = req.header("X-Twilio-Signature");
  const publicUrl = `${config.publicBaseUrl}${req.originalUrl}`;

  if (!signature || !twilio.validateRequest(config.twilio.authToken, signature, publicUrl, req.body)) {
    res.status(403).send("Invalid Twilio signature");
    return;
  }
  next();
}
