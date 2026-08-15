import type { WebSocket } from "ws";
import { LiveTranscriptionEvents, type ListenLiveClient } from "@deepgram/sdk";
import { openDeepgramStream, sendAudioChunk, closeDeepgramStream } from "../services/stt/deepgram";
import { synthesizeSpeechStream } from "../services/tts/elevenlabs";
import { createSession, destroySession } from "../conversation/sessionStore";
import { calls, leads } from "../db/repository";
import { logger } from "../utils/logger";
import type { AgentSession } from "../conversation/agentSession";

/**
 * Browser-based "Live Test Call" widget. Lets the team demo/QA the exact same
 * conversation + matching + TTS pipeline used on real phone calls, without
 * needing a provisioned Twilio number. Protocol (over one websocket):
 *   client -> server: {type:"start", testPhoneNumber?} JSON, then raw PCM16
 *                      mono 16kHz binary frames while the mic is live,
 *                      then {type:"end_call"} JSON.
 *   server -> client: {type:"transcript"|"agent_text"|"call_ended"|"error"} JSON,
 *                      and binary mp3 buffers for the agent's spoken reply.
 */
export function handleTestWidgetConnection(ws: WebSocket): void {
  let session: AgentSession | null = null;
  let deepgram: ListenLiveClient | null = null;
  let ourCallId: string | null = null;
  let processingTurn = false;

  ws.on("message", async (raw, isBinary) => {
    if (isBinary) {
      if (deepgram) sendAudioChunk(deepgram, raw as Buffer);
      return;
    }

    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "start") {
      const phoneNumber = msg.testPhoneNumber || `web-test-${Date.now()}`;
      const call = calls.create({ fromNumber: phoneNumber, twilioCallSid: null, source: "web_test" });
      const lead = leads.createForCall(call.id, phoneNumber, "web_test");
      session = createSession({ callId: call.id, leadId: lead.id, phoneNumber });
      ourCallId = call.id;

      deepgram = openDeepgramStream(
        {
          onFinalTranscript: (text) => {
            if (!text) return;
            void handleTurn(text);
          },
        },
        { encoding: "linear16", sampleRate: 16000 }
      );
      deepgram.on(LiveTranscriptionEvents.Error, (err: unknown) => {
        logger.error({ err, ourCallId }, "Deepgram error in test widget");
        safeSend({ type: "error", message: "Speech recognition error" });
      });

      const greeting = session.greeting();
      safeSend({ type: "agent_text", text: greeting });
      await speakToWidget(greeting);
      return;
    }

    if (msg.type === "end_call") {
      cleanup();
      safeSend({ type: "call_ended" });
      ws.close();
    }
  });

  ws.on("close", cleanup);
  ws.on("error", (err) => {
    logger.error({ err, ourCallId }, "Test widget websocket error");
    cleanup();
  });

  async function handleTurn(text: string) {
    if (!session || processingTurn) return;
    processingTurn = true;
    safeSend({ type: "transcript", text });
    try {
      const { replyText, shouldEndCall } = await session.handleUserUtterance(text);
      safeSend({ type: "agent_text", text: replyText });
      await speakToWidget(replyText);
      if (shouldEndCall) {
        cleanup();
        safeSend({ type: "call_ended" });
      }
    } catch (err) {
      logger.error({ err, ourCallId }, "Failed to handle test widget turn");
      safeSend({ type: "error", message: "The agent hit an error processing that. Please try again." });
    } finally {
      processingTurn = false;
    }
  }

  async function speakToWidget(text: string) {
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of synthesizeSpeechStream(text, "mp3_44100_128")) {
        chunks.push(chunk);
      }
      if (chunks.length && ws.readyState === ws.OPEN) {
        ws.send(Buffer.concat(chunks));
      }
    } catch (err) {
      logger.error({ err, ourCallId }, "TTS failed in test widget");
      safeSend({ type: "error", message: "Voice synthesis failed." });
    }
  }

  function safeSend(payload: unknown) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
  }

  function cleanup() {
    if (deepgram) {
      closeDeepgramStream(deepgram);
      deepgram = null;
    }
    if (ourCallId) {
      calls.finish(ourCallId, "completed");
      destroySession(ourCallId);
    }
    session = null;
    ourCallId = null;
  }
}
