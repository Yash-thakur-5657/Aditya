import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-brand-100 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-brand-100/70 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-brand-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-brand-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "good" | "warning" | "serious" | "critical" | "neutral" | "accent";

const TONE_CLASSES: Record<Tone, string> = {
  good: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  serious: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  critical: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  accent: "bg-accent-100 text-accent-700 ring-1 ring-inset ring-accent-300",
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-brand-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-brand-400">{hint}</p>}
    </Card>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "bg-white text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-brand-600 hover:bg-brand-50",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-16 text-center">
      <p className="text-sm font-medium text-brand-700">{title}</p>
      {subtitle && <p className="text-xs text-brand-400">{subtitle}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    </div>
  );
}

export function leadStatusTone(status: string): Tone {
  switch (status) {
    case "in_progress":
      return "warning";
    case "captured":
      return "neutral";
    case "matched":
      return "good";
    case "whatsapp_sent":
      return "accent";
    case "abandoned":
      return "critical";
    default:
      return "neutral";
  }
}

export function callStatusTone(status: string): Tone {
  switch (status) {
    case "ringing":
      return "neutral";
    case "in_progress":
      return "warning";
    case "completed":
      return "good";
    case "failed":
      return "critical";
    default:
      return "neutral";
  }
}
