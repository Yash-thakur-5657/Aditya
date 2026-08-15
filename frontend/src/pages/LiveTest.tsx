import { useEffect, useRef, useState } from "react";
import { wsBaseUrl } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Button, Card, CardHeader } from "../components/ui";

type CallState = "idle" | "connecting" | "active" | "ended";

interface TranscriptEntry {
  role: "caller" | "agent";
  text: string;
}

export function LiveTest() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => () => cleanup(), []);

  async function startCall() {
    setError(null);
    setTranscript([]);
    setCallState("connecting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      await audioContext.audioWorklet.addModule("/pcm-worklet.js");

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, "pcm-recorder");
      workletNodeRef.current = workletNode;
      source.connect(workletNode);

      const ws = new WebSocket(`${wsBaseUrl()}/test-widget`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "start", testPhoneNumber: testPhoneNumber || undefined }));
        setCallState("active");
        workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(event.data);
        };
      };

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          const msg = JSON.parse(event.data);
          if (msg.type === "transcript") {
            setTranscript((t) => [...t, { role: "caller", text: msg.text }]);
          } else if (msg.type === "agent_text") {
            setTranscript((t) => [...t, { role: "agent", text: msg.text }]);
          } else if (msg.type === "call_ended") {
            setCallState("ended");
            cleanup();
          } else if (msg.type === "error") {
            setError(msg.message);
          }
        } else {
          const blob = new Blob([event.data], { type: "audio/mpeg" });
          const url = URL.createObjectURL(blob);
          if (audioElRef.current) {
            audioElRef.current.src = url;
            void audioElRef.current.play();
          }
        }
      };

      ws.onerror = () => setError("Connection to the voice agent failed.");
      ws.onclose = () => {
        if (callState !== "ended") setCallState("ended");
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone access failed.");
      setCallState("idle");
      cleanup();
    }
  }

  function endCall() {
    wsRef.current?.send(JSON.stringify({ type: "end_call" }));
    setCallState("ended");
    cleanup();
  }

  function cleanup() {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
  }

  return (
    <div>
      <PageHeader
        title="Live Test Call"
        subtitle="Talk to Aditi right in the browser - the exact same conversation, matching, and voice pipeline used on real phone calls"
      />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Start a test call" />
          <div className="space-y-4 px-5 py-5">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-brand-600">
                Your phone number (optional, for testing the WhatsApp follow-up)
              </span>
              <input
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="+91XXXXXXXXXX"
                disabled={callState === "active" || callState === "connecting"}
                className="input"
              />
            </label>

            <div className="flex flex-col items-center gap-3 py-4">
              <MicIndicator state={callState} speaking={agentSpeaking} />
              {callState === "idle" || callState === "ended" ? (
                <Button onClick={startCall} className="w-full">
                  {callState === "ended" ? "Call again" : "Start call"}
                </Button>
              ) : (
                <Button onClick={endCall} variant="danger" className="w-full" disabled={callState === "connecting"}>
                  {callState === "connecting" ? "Connecting..." : "End call"}
                </Button>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-xs text-brand-400">
              Requires microphone access. Uses the same Claude + Deepgram + ElevenLabs pipeline as real phone
              calls, so this is a true end-to-end test of conversation quality.
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Live transcript" />
          <div className="flex h-[28rem] flex-col gap-3 overflow-y-auto px-5 py-4">
            {transcript.length === 0 ? (
              <p className="text-sm text-brand-400">Start a call to see the conversation appear here.</p>
            ) : (
              transcript.map((entry, i) => (
                <div key={i} className={`flex ${entry.role === "agent" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3.5 py-2 text-sm ${
                      entry.role === "agent" ? "bg-brand-50 text-brand-900" : "bg-accent-100 text-accent-900"
                    }`}
                  >
                    <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide opacity-60">
                      {entry.role === "agent" ? "Aditi" : "You"}
                    </p>
                    {entry.text}
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </Card>
      </div>

      <audio
        ref={audioElRef}
        onPlay={() => setAgentSpeaking(true)}
        onEnded={() => setAgentSpeaking(false)}
        className="hidden"
      />
    </div>
  );
}

function MicIndicator({ state, speaking }: { state: CallState; speaking: boolean }) {
  const active = state === "active";
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      {active && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
            speaking ? "bg-accent-300" : "bg-brand-300"
          } opacity-40`}
        />
      )}
      <span
        className={`relative flex h-16 w-16 items-center justify-center rounded-full text-white ${
          active ? (speaking ? "bg-accent-500" : "bg-brand-600") : "bg-brand-200"
        }`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M19 11a7 7 0 0 1-14 0M12 18v3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </div>
  );
}
