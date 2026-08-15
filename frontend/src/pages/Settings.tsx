import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Badge, Card, CardHeader, Spinner } from "../components/ui";
import type { StatusResponse } from "../lib/types";

const LLM_PROVIDERS = ["anthropic", "gemini"] as const;

const INTEGRATION_LABELS: Record<
  Exclude<keyof StatusResponse["integrations"], "anthropic" | "gemini">,
  { label: string; hint: string }
> = {
  deepgram: { label: "Deepgram (speech-to-text)", hint: "DEEPGRAM_API_KEY" },
  elevenlabs: { label: "ElevenLabs (voice)", hint: "ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID" },
  twilioVoice: { label: "Twilio Voice", hint: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VOICE_NUMBER" },
  twilioWhatsapp: { label: "Twilio WhatsApp", hint: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_NUMBER" },
};

const LLM_LABELS: Record<(typeof LLM_PROVIDERS)[number], { label: string; hint: string }> = {
  anthropic: { label: "Claude (conversation brain)", hint: "ANTHROPIC_API_KEY - paid, no free tier" },
  gemini: { label: "Gemini (conversation brain)", hint: "GEMINI_API_KEY - free tier available" },
};

export function Settings() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.status
      .get()
      .then(setStatus)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="p-8 text-sm text-red-600">{error}</p>;
  if (!status) return <Spinner />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Deployment environment and integration health" />
      <div className="space-y-6 p-8">
        <Card>
          <CardHeader
            title="Integration status"
            subtitle="Configured via environment variables on the backend - checked for real values, not just non-empty ones"
          />
          <div className="divide-y divide-brand-50">
            {LLM_PROVIDERS.map((provider) => {
              const active = status.llmProvider === provider;
              const configured = status.integrations[provider];
              return (
                <div key={provider} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-brand-900">
                      {LLM_LABELS[provider].label}
                      {active && <span className="ml-2 text-xs font-normal text-brand-400">(active provider)</span>}
                    </p>
                    <p className="text-xs text-brand-400">{LLM_LABELS[provider].hint}</p>
                  </div>
                  {active ? (
                    <Badge tone={configured ? "good" : "critical"}>{configured ? "Configured" : "Missing"}</Badge>
                  ) : (
                    <Badge tone="neutral">Not active</Badge>
                  )}
                </div>
              );
            })}
            {(Object.keys(INTEGRATION_LABELS) as Array<keyof typeof INTEGRATION_LABELS>).map((key) => (
              <div key={key} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-brand-900">{INTEGRATION_LABELS[key].label}</p>
                  <p className="text-xs text-brand-400">{INTEGRATION_LABELS[key].hint}</p>
                </div>
                <Badge tone={status.integrations[key] ? "good" : "critical"}>
                  {status.integrations[key] ? "Configured" : "Missing"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Deployment" />
          <dl className="space-y-3 px-5 py-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-brand-500">Environment</dt>
              <dd className="font-medium text-brand-900">{status.nodeEnv}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-brand-500">Public base URL</dt>
              <dd className="font-medium text-brand-900">{status.publicBaseUrl}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-brand-500">Voice number</dt>
              <dd className="font-medium text-brand-900">{status.twilioVoiceNumber ?? "–"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-brand-500">WhatsApp sender</dt>
              <dd className="font-medium text-brand-900">{status.twilioWhatsappNumber ?? "–"}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
