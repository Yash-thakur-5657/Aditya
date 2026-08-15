import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { formatDay, formatDuration, formatPropertyType } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { Card, CardHeader, Spinner, StatTile, leadStatusTone } from "../components/ui";
import { Badge } from "../components/ui";
import type { AnalyticsSummary } from "../lib/types";
import { formatLeadStatus } from "../lib/format";

const SERIES_BLUE = "#2a78d6";
const GRID_COLOR = "#e1e0d9";
const AXIS_COLOR = "#898781";

export function Overview() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.analytics
      .summary()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Failed to load analytics: {error}</p>
      </div>
    );
  }
  if (!data) return <Spinner />;

  const maxStatusCount = Math.max(1, ...data.leadStatusBreakdown.map((s) => s.count));

  return (
    <div>
      <PageHeader title="Overview" subtitle="How the voice agent is performing across calls and leads" />
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Total calls" value={String(data.totalCalls)} />
          <StatTile label="Leads captured" value={String(data.totalLeads)} />
          <StatTile label="Conversion rate" value={`${data.conversionRate}%`} hint="leads with a property match" />
          <StatTile label="WhatsApp sent" value={String(data.whatsappSent)} />
          <StatTile label="Avg. call length" value={formatDuration(data.avgCallDurationSeconds)} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Calls, last 14 days" subtitle="Inbound calls handled by the agent" />
            <div className="h-64 px-2 py-4">
              {data.callsPerDay.length === 0 ? (
                <NoData />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.callsPerDay} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="callsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES_BLUE} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={SERIES_BLUE} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                    <XAxis
                      dataKey="day"
                      tickFormatter={formatDay}
                      tick={{ fontSize: 12, fill: AXIS_COLOR }}
                      axisLine={{ stroke: GRID_COLOR }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: AXIS_COLOR }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, "Calls"]}
                      labelFormatter={(label) => formatDay(String(label))}
                      contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID_COLOR }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={SERIES_BLUE}
                      strokeWidth={2}
                      fill="url(#callsFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Top cities" subtitle="Where callers are searching for property" />
            <div className="h-64 px-2 py-4">
              {data.topCities.length === 0 ? (
                <NoData />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topCities}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_COLOR }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="city"
                      tick={{ fontSize: 12, fill: "#0b0b0b" }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, "Leads"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID_COLOR }}
                    />
                    <Bar dataKey="count" fill={SERIES_BLUE} radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Property type demand" subtitle="What callers are asking for" />
            <div className="h-64 px-2 py-4">
              {data.propertyTypeBreakdown.length === 0 ? (
                <NoData />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.propertyTypeBreakdown.map((d) => ({
                      ...d,
                      label: formatPropertyType(d.propertyType),
                    }))}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: AXIS_COLOR }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#0b0b0b" }}
                      axisLine={false}
                      tickLine={false}
                      width={110}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, "Leads"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: GRID_COLOR }}
                    />
                    <Bar dataKey="count" fill={SERIES_BLUE} radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Lead pipeline" subtitle="Where leads currently stand" />
            <div className="space-y-3 px-5 py-5">
              {data.leadStatusBreakdown.length === 0 ? (
                <NoData />
              ) : (
                data.leadStatusBreakdown.map((s) => (
                  <div key={s.status} className="flex items-center gap-3">
                    <Badge tone={leadStatusTone(s.status)}>{formatLeadStatus(s.status)}</Badge>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-50">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${(s.count / maxStatusCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-sm tabular-nums text-brand-700">{s.count}</span>
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

function NoData() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-brand-400">
      No data yet — take a test call to populate this chart.
    </div>
  );
}
