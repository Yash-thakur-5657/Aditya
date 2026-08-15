import type {
  AnalyticsSummary,
  CallRecord,
  Lead,
  LeadDetail,
  Property,
  StatusResponse,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  properties: {
    list: (params?: { city?: string; propertyType?: string; q?: string }) => {
      const entries = Object.entries(params ?? {}).filter(
        (entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== ""
      );
      const qs = new URLSearchParams(entries).toString();
      return request<Property[]>(`/api/properties${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<Property>(`/api/properties/${id}`),
    create: (data: Omit<Property, "id" | "createdAt">) =>
      request<Property>("/api/properties", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Omit<Property, "id" | "createdAt">>) =>
      request<Property>(`/api/properties/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/api/properties/${id}`, { method: "DELETE" }),
  },
  leads: {
    list: () => request<Lead[]>("/api/leads"),
    get: (id: string) => request<LeadDetail>(`/api/leads/${id}`),
  },
  calls: {
    list: () => request<CallRecord[]>("/api/calls"),
    get: (id: string) => request<CallRecord>(`/api/calls/${id}`),
  },
  analytics: {
    summary: () => request<AnalyticsSummary>("/api/analytics/summary"),
  },
  status: {
    get: () => request<StatusResponse>("/api/status"),
  },
};

export function wsBaseUrl(): string {
  if (API_BASE) return API_BASE.replace(/^http/, "ws");
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}
