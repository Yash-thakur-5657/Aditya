import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatDateTime, formatLeadStatus, formatPriceInr, formatPropertyType } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { Badge, Card, CardHeader, Spinner, leadStatusTone } from "../components/ui";
import type { LeadDetail as LeadDetailType } from "../lib/types";

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.leads
      .get(id)
      .then(setLead)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="p-8 text-sm text-red-600">{error}</p>;
  if (!lead) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={lead.fullName ?? "Unknown caller"}
        subtitle={lead.phoneNumber}
        action={<Badge tone={leadStatusTone(lead.status)}>{formatLeadStatus(lead.status)}</Badge>}
      />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader title="Requirements captured" />
            <dl className="space-y-3 px-5 py-4 text-sm">
              <Row label="City" value={lead.city} />
              <Row label="State" value={lead.state} />
              <Row label="Locality" value={lead.locality} />
              <Row label="Property type" value={lead.propertyType ? formatPropertyType(lead.propertyType) : null} />
              <Row
                label="Budget"
                value={
                  lead.budgetMinInr || lead.budgetMaxInr
                    ? `${lead.budgetMinInr ? formatPriceInr(lead.budgetMinInr) : "–"} to ${
                        lead.budgetMaxInr ? formatPriceInr(lead.budgetMaxInr) : "–"
                      }`
                    : null
                }
              />
              <Row label="BHK preference" value={lead.bhkPreference ? String(lead.bhkPreference) : null} />
              <Row
                label="Language"
                value={
                  lead.preferredLanguage === "hi"
                    ? "Hindi"
                    : lead.preferredLanguage === "en"
                      ? "English"
                      : lead.preferredLanguage === "mixed"
                        ? "Hindi + English"
                        : null
                }
              />
              <Row label="Captured at" value={formatDateTime(lead.createdAt)} />
            </dl>
          </Card>

          {lead.call && (
            <Card>
              <CardHeader title="Call" />
              <div className="px-5 py-4 text-sm text-brand-600">
                <p>
                  <Link to={`/calls/${lead.call.id}`} className="font-medium text-brand-700 hover:underline">
                    View full call record →
                  </Link>
                </p>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Matched properties" subtitle={`${lead.matchedProperties.length} sent to the caller`} />
            {lead.matchedProperties.length === 0 ? (
              <p className="px-5 py-6 text-sm text-brand-400">No properties matched yet.</p>
            ) : (
              <div className="divide-y divide-brand-50">
                {lead.matchedProperties.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-brand-900">{p.title}</p>
                      <p className="text-xs text-brand-500">
                        {formatPropertyType(p.propertyType)} · {p.locality}, {p.city}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-brand-900">{formatPriceInr(p.priceInr)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Conversation transcript" />
            <div className="max-h-[28rem] space-y-3 overflow-y-auto px-5 py-4">
              {lead.messages.length === 0 ? (
                <p className="text-sm text-brand-400">No transcript recorded.</p>
              ) : (
                lead.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "agent" ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[80%] rounded-xl px-3.5 py-2 text-sm ${
                        m.role === "agent"
                          ? "bg-brand-50 text-brand-900"
                          : "bg-accent-100 text-accent-900"
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
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-brand-500">{label}</dt>
      <dd className="font-medium text-brand-900">{value ?? "–"}</dd>
    </div>
  );
}
