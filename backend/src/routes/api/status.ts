import { Router } from "express";
import { config } from "../../config";

export const statusRouter = Router();

// A non-empty value isn't the same as a real credential - the .env.example
// template ships with placeholders like "sk-ant-xxxx..." that are non-empty
// but obviously not usable. Flag anything that still looks like the template.
function isRealValue(value: string): boolean {
  if (!value) return false;
  if (/x{4,}/i.test(value)) return false;
  if (value.includes("your-deployed-domain")) return false;
  return true;
}

statusRouter.get("/", (req, res) => {
  res.json({
    nodeEnv: config.nodeEnv,
    publicBaseUrl: config.publicBaseUrl,
    llmProvider: config.llm.provider,
    integrations: {
      anthropic: isRealValue(config.anthropic.apiKey),
      gemini: isRealValue(config.gemini.apiKey),
      deepgram: isRealValue(config.deepgram.apiKey),
      elevenlabs: isRealValue(config.elevenlabs.apiKey) && isRealValue(config.elevenlabs.voiceId),
      twilioVoice:
        isRealValue(config.twilio.accountSid) &&
        isRealValue(config.twilio.authToken) &&
        isRealValue(config.twilio.voiceNumber),
      twilioWhatsapp: isRealValue(config.twilio.accountSid) && isRealValue(config.twilio.authToken),
    },
    twilioVoiceNumber: isRealValue(config.twilio.voiceNumber) ? config.twilio.voiceNumber : null,
    twilioWhatsappNumber: config.twilio.whatsappNumber || null,
  });
});
