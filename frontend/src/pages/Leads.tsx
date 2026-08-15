import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatDateTime, formatLeadStatus, formatPropertyType } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { Badge, Card, EmptyState, Spinner, leadStatusTone } from "../components/ui";
import type { Lead, LeadStatus } from "../lib/types";

const STATUSES: LeadStatus[] = ["in_progress", "captured", "matched", "whatsapp_sent", "abandoned"];

export function Leads() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api.leads
      .list()
      .then(setLeads)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!leads) return [];
    return statusFilter ? leads.filter((l) => l.status === statusFilter) : leads;
  }, [leads, statusFilter]);

  return (
    <div>
      <PageHeader title="Leads" subtitle="Everyone the voice agent has spoken to" />
      <div className="space-y-4 p-8">
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {formatLeadStatus(s)}
              </option>
            ))}
          </select>
        </div>

        <Card>
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {!leads ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <EmptyState title="No leads yet" subtitle="Leads appear here as soon as a call comes in" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wide text-brand-400">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">Looking for</th>
                    <th className="px-5 py-3 font-medium">Source</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr
                      key={lead.id}
                      className="cursor-pointer border-b border-brand-50 last:border-0 hover:bg-brand-50/50"
                    >
                      <td className="px-5 py-3">
                        <Link to={`/leads/${lead.id}`} className="font-medium text-brand-900 hover:underline">
                          {lead.fullName ?? "Unknown caller"}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-brand-600">{lead.phoneNumber}</td>
                      <td className="px-5 py-3 text-brand-600">
                        {lead.propertyType ? formatPropertyType(lead.propertyType) : "–"}
                        {lead.city ? ` in ${lead.city}` : ""}
                      </td>
                      <td className="px-5 py-3 text-brand-600">{lead.source === "call" ? "Phone call" : "Web test"}</td>
                      <td className="px-5 py-3">
                        <Badge tone={leadStatusTone(lead.status)}>{formatLeadStatus(lead.status)}</Badge>
                      </td>
                      <td className="px-5 py-3 text-brand-500">{formatDateTime(lead.createdAt)}</td>
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
