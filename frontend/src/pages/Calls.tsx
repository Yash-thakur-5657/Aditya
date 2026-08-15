import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatDateTime, formatDuration } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { Badge, Card, EmptyState, Spinner, callStatusTone } from "../components/ui";
import type { CallRecord } from "../lib/types";

export function Calls() {
  const [calls, setCalls] = useState<CallRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.calls
      .list()
      .then(setCalls)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <PageHeader title="Calls" subtitle="Every call the agent has answered, phone and web test alike" />
      <div className="p-8">
        <Card>
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {!calls ? (
            <Spinner />
          ) : calls.length === 0 ? (
            <EmptyState title="No calls yet" subtitle="Point a Twilio number here, or try the Live Test Call page" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-brand-400">
                    <th className="px-5 py-3 font-medium">From</th>
                    <th className="px-5 py-3 font-medium">Source</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Duration</th>
                    <th className="px-5 py-3 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((c) => (
                    <tr key={c.id} className="border-b border-brand-50 last:border-0 hover:bg-brand-50/50">
                      <td className="px-5 py-3">
                        <Link to={`/calls/${c.id}`} className="font-medium text-brand-900 hover:underline">
                          {c.fromNumber ?? "Unknown"}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-brand-600">{c.source === "call" ? "Phone call" : "Web test"}</td>
                      <td className="px-5 py-3">
                        <Badge tone={callStatusTone(c.status)}>{c.status}</Badge>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-brand-600">{formatDuration(c.durationSeconds)}</td>
                      <td className="px-5 py-3 text-brand-500">{formatDateTime(c.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
