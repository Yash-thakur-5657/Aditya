import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatDateTime, formatDuration } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { Badge, Card, CardHeader, Spinner, callStatusTone } from "../components/ui";
import type { CallRecord } from "../lib/types";

export function CallDetail() {
  const { id } = useParams<{ id: string }>();
  const [call, setCall] = useState<CallRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.calls
      .get(id)
      .then(setCall)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="p-8 text-sm text-red-600">{error}</p>;
  if (!call) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={call.fromNumber ?? "Unknown caller"}
        subtitle={`${call.source === "call" ? "Phone call" : "Web test call"} · started ${formatDateTime(call.startedAt)}`}
        action={<Badge tone={callStatusTone(call.status)}>{call.status}</Badge>}
      />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Call details" />
          <dl className="space-y-3 px-5 py-4 text-sm">
            <Row label="Duration" value={formatDuration(call.durationSeconds)} />
            <Row label="Twilio Call SID" value={call.twilioCallSid ?? "–"} />
            <Row label="Started" value={formatDateTime(call.startedAt)} />
            <Row label="Ended" value={call.endedAt ? formatDateTime(call.endedAt) : "–"} />
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Transcript" />
          <div className="max-h-[32rem] space-y-3 overflow-y-auto px-5 py-4">
            {!call.messages || call.messages.length === 0 ? (
              <p className="text-sm text-brand-400">No transcript recorded.</p>
            ) : (
              call.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "agent" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3.5 py-2 text-sm ${
                      m.role === "agent" ? "bg-brand-50 text-brand-900" : "bg-accent-100 text-accent-900"
                    }`}
                  >
                    <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide opacity-60">
                      {m.role === "agent" ? "Aditi" : "Caller"}
                    </p>
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-brand-500">{label}</dt>
      <dd className="font-medium text-brand-900">{value}</dd>
    </div>
  );
}
