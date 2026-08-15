import type { LeadStatus, PropertyType } from "./types";

export function formatPriceInr(price: number): string {
  if (price >= 10000000) {
    const crore = price / 10000000;
    return `₹${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Cr`;
  }
  if (price >= 100000) {
    const lakh = price / 100000;
    return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} L`;
  }
  return `₹${price.toLocaleString("en-IN")}`;
}

export function formatPropertyType(type: PropertyType): string {
  const labels: Record<PropertyType, string> = {
    apartment: "Apartment",
    villa: "Villa",
    independent_house: "Independent House",
    plot: "Plot",
    commercial: "Commercial",
    pg: "PG",
  };
  return labels[type] ?? type;
}

export function formatLeadStatus(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
    in_progress: "In progress",
    captured: "Captured",
    matched: "Matched",
    whatsapp_sent: "WhatsApp sent",
    abandoned: "Abandoned",
  };
  return labels[status] ?? status;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "–";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : `${iso}Z`);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
