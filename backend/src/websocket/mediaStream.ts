import type { WebSocket } from "ws";
import { LiveTranscriptionEvents, type ListenLiveClient } from "@deepgram/sdk";
import { openDeepgramStream, sendAudioChunk, closeDeepgramStream } from "../services/stt/deepgram";
import { synthesizeSpeechStream } from "../services/tts/elevenlabs";
import { getSession, destroySession } from "../conversation/sessionStore";
import { calls } from "../db/repository";
import { logger } from "../utils/logger";
import type { AgentSession } from "../conversation/agentSession";

interface CallState {
  ourCallId: string;
  streamSid: string;
  session: AgentSession;
  deepgram: ListenLiveClient;
  isAgentSpeaking: boolean;
  currentSpeechAborted: boolean;
  processingTurn: boolean;
}

async function speak(ws: WebSocket, state: CallState, text: string): Promise<void> {
  state.isAgentSpeaking = true;
  state.currentSpeechAborted = false;
  try {
    for await (const chunk of synthesizeSpeechStream(text)) {
      if (state.currentSpeechAborted || ws.readyState !== ws.OPEN) break;
      ws.send(
        JSON.stringify({
          event: "media",
          streamSid: state.streamSid,
          media: { payload: chunk.toString("base64") },
        })
      );
    }
    if (!state.currentSpeechAborted && ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({
          event: "mark",
          streamSid: state.streamSid,
          mark: { name: "agent-finished-speaking" },
        })
      );
    }
  } catch (err) {
    logger.error({ err, callId: state.ourCallId }, "TTS playback failed");
  } finally {
    state.isAgentSpeaking = false;
  }
}

function bargeIn(ws: WebSocket, state: CallState): void {
  if (!state.isAgentSpeaking) return;
  state.currentSpeechAborted = true;
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ event: "clear", streamSid: state.streamSid }));
  }
}

export function handleMediaStreamConnection(ws: WebSocket): void {
  let state: CallState | null = null;

  ws.on("message", async (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.event) {
      case "connected": {
        logger.debug("Twilio media stream connected");
        break;
      }

      case "start": {
        const ourCallId: string | undefined = msg.start?.customParameters?.ourCallId;
        const streamSid: string = msg.start?.streamSid;
        if (!ourCallId || !streamSid) {
          logger.error({ msg }, "Missing ourCallId/streamSid on media stream start");
          ws.close();
          return;
        }
        const session = getSession(ourCallId);
        if (!session) {
          logger.error({ ourCallId }, "No AgentSession found for incoming media stream");
          ws.close();
          return;
        }

        const deepgram = openDeepgramStream({
          onFinalTranscript: (text) => {
            if (!state || !text) return;
            void handleFinalTranscript(ws, state, text);
          },
        });

        deepgram.on(LiveTranscriptionEvents.SpeechStarted, () => {
          if (state) bargeIn(ws, state);
        });

        state = {
          ourCallId,
          streamSid,
          session,
          deepgram,
          isAgentSpeaking: false,
          currentSpeechAborted: false,
          processingTurn: false,
        };

        const greeting = session.greeting();
        void speak(ws, state, greeting);
        break;
      }

      case "media": {
        if (!state) return;
        const payload: string = msg.media?.payload;
        if (!payload) return;
        sendAudioChunk(state.deepgram, Buffer.from(payload, "base64"));
        break;
      }

      case "stop": {
        cleanup();
        break;
      }

      default:
        break;
    }
  });

  ws.on("close", cleanup);
  ws.on("error", (err) => {
    logger.error({ err, callId: state?.ourCallId }, "Media stream websocket error");
    cleanup();
  });

  function cleanup() {
    if (!state) return;
    closeDeepgramStream(state.deepgram);
    calls.finish(state.ourCallId, "completed");
    destroySession(state.ourCallId);
    logger.info({ callId: state.ourCallId }, "Call cleaned up");
    state = null;
  }
}

async function handleFinalTranscript(ws: WebSocket, state: CallState, text: string): Promise<void> {
  if (state.processingTurn) return;
  state.processingTurn = true;
  try {
    const { replyText, shouldEndCall } = await state.session.handleUserUtterance(text);
    await speak(ws, state, replyText);
    if (shouldEndCall && ws.readyState === ws.OPEN) {
      setTimeout(() => ws.close(), 500);
    }
  } catch (err) {
    logger.error({ err, callId: state.ourCallId }, "Failed to handle caller turn");
    await speak(
      ws,
      state,
      "Sorry, I'm having a little trouble right now. Could you please say that again?"
    );
  } finally {
    state.processingTurn = false;
  }
}
