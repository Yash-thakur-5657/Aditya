import "dotenv/config";
import path from "node:path";

function required(name: string, fallbackForDev = ""): string {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : fallbackForDev;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  nodeEnv: process.env.NODE_ENV ?? "development",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:8080",
  databasePath: process.env.DATABASE_PATH ?? path.join(__dirname, "..", "data", "realty.db"),
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((s) => s.trim()),

  llm: {
    // "anthropic" (Claude, paid) or "gemini" (free tier available, no card required)
    provider: (process.env.LLM_PROVIDER ?? "anthropic") as "anthropic" | "gemini",
  },
  anthropic: {
    apiKey: required("ANTHROPIC_API_KEY"),
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  },
  gemini: {
    apiKey: required("GEMINI_API_KEY"),
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  },
  deepgram: {
    apiKey: required("DEEPGRAM_API_KEY"),
  },
  elevenlabs: {
    apiKey: required("ELEVENLABS_API_KEY"),
    voiceId: required("ELEVENLABS_VOICE_ID"),
    modelId: process.env.ELEVENLABS_MODEL_ID ?? "eleven_flash_v2_5",
  },
  twilio: {
    accountSid: required("TWILIO_ACCOUNT_SID"),
    authToken: required("TWILIO_AUTH_TOKEN"),
    voiceNumber: process.env.TWILIO_VOICE_NUMBER ?? "",
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER ?? "whatsapp:+14155238886",
  },
};

export function assertProductionConfig(): string[] {
  const missing: string[] = [];
  if (config.nodeEnv !== "production") return missing;
  const checks: Array<[string, string]> = [
    config.llm.provider === "gemini"
      ? ["GEMINI_API_KEY", config.gemini.apiKey]
      : ["ANTHROPIC_API_KEY", config.anthropic.apiKey],
    ["DEEPGRAM_API_KEY", config.deepgram.apiKey],
    ["ELEVENLABS_API_KEY", config.elevenlabs.apiKey],
    ["ELEVENLABS_VOICE_ID", config.elevenlabs.voiceId],
    ["TWILIO_ACCOUNT_SID", config.twilio.accountSid],
    ["TWILIO_AUTH_TOKEN", config.twilio.authToken],
    ["TWILIO_VOICE_NUMBER", config.twilio.voiceNumber],
  ];
  for (const [name, value] of checks) {
    if (!value) missing.push(name);
  }
  return missing;
}
