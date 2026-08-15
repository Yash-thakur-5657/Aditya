import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-brand-100 bg-white px-8 py-6">
      <div>
        <h1 className="text-lg font-semibold text-brand-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-brand-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
