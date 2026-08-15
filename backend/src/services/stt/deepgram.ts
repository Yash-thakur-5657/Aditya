import { createClient, LiveTranscriptionEvents, type ListenLiveClient } from "@deepgram/sdk";
import { config } from "../../config";
import { logger } from "../../utils/logger";

export interface DeepgramStreamHandlers {
  onFinalTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onError?: (err: unknown) => void;
}

export interface DeepgramAudioFormat {
  encoding: "mulaw" | "linear16";
  sampleRate: 8000 | 16000;
}

/**
 * Opens a real-time Deepgram connection with Hindi+English code-switching support.
 * Defaults to Twilio's telephony format (8kHz mu-law); the browser test-widget
 * path uses 16kHz linear16 instead, since that's what the Web Audio API captures.
 */
export function openDeepgramStream(
  handlers: DeepgramStreamHandlers,
  audioFormat: DeepgramAudioFormat = { encoding: "mulaw", sampleRate: 8000 }
): ListenLiveClient {
  const deepgram = createClient(config.deepgram.apiKey);

  const connection = deepgram.listen.live({
    model: "nova-2",
    language: "multi",
    encoding: audioFormat.encoding,
    sample_rate: audioFormat.sampleRate,
    channels: 1,
    smart_format: true,
    interim_results: true,
    endpointing: 300,
    utterance_end_ms: 1000,
    vad_events: true,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    logger.debug("Deepgram connection opened");
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
    const alt = data?.channel?.alternatives?.[0];
    const transcript: string | undefined = alt?.transcript;
    if (!transcript) return;

    if (data.is_final) {
      handlers.onFinalTranscript(transcript.trim());
    } else {
      handlers.onInterimTranscript?.(transcript.trim());
    }
  });

  connection.on(LiveTranscriptionEvents.Error, (err: unknown) => {
    logger.error({ err }, "Deepgram stream error");
    handlers.onError?.(err);
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    logger.debug("Deepgram connection closed");
  });

  return connection;
}

export function sendAudioChunk(connection: ListenLiveClient, chunk: Buffer): void {
  const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
  connection.send(arrayBuffer as ArrayBuffer);
}

export function closeDeepgramStream(connection: ListenLiveClient): void {
  connection.requestClose();
}
