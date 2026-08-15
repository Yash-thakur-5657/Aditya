import { config } from "../../config";
import { logger } from "../../utils/logger";

const ELEVENLABS_STREAM_URL = (voiceId: string, outputFormat: string) =>
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=${outputFormat}`;

export type TtsOutputFormat = "ulaw_8000" | "mp3_44100_128";

/**
 * Streams synthesized speech for `text`. Defaults to raw 8kHz mu-law bytes - the
 * exact format Twilio Media Streams expects, so no resampling/encoding is needed
 * on the phone-call path. The browser test-widget path requests mp3 instead, since
 * mu-law isn't natively decodable by <audio>/Web Audio without extra work.
 * Yields Buffer chunks as they arrive from ElevenLabs for low-latency playback.
 */
export async function* synthesizeSpeechStream(
  text: string,
  outputFormat: TtsOutputFormat = "ulaw_8000"
): AsyncGenerator<Buffer> {
  if (!text.trim()) return;

  const response = await fetch(ELEVENLABS_STREAM_URL(config.elevenlabs.voiceId, outputFormat), {
    method: "POST",
    headers: {
      "xi-api-key": config.elevenlabs.apiKey,
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify({
      text,
      model_id: config.elevenlabs.modelId,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok || !response.body) {
    const errBody = await response.text().catch(() => "");
    logger.error({ status: response.status, errBody }, "ElevenLabs TTS request failed");
    throw new Error(`ElevenLabs TTS failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) yield Buffer.from(value);
    }
  } finally {
    reader.releaseLock();
  }
}
