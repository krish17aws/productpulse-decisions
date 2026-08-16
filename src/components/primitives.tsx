import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClass: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground border-border",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground border-warning/35",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  info: "bg-info/10 text-info border-info/25",
};

export function toneFor(value?: string | null): Tone {
  const v = (value ?? "").toLowerCase();
  if (/(critical|high|failed|error|reject|breach|outage|degraded)/.test(v)) return "danger";
  if (/(warn|medium|pending|awaiting|review|in_progress|in progress|running|active)/.test(v))
    return "warning";
  if (/(success|complete|healthy|approved|pass|resolved|low|win)/.test(v)) return "success";
  if (/(info|queued|draft|new|proposed)/.test(v)) return "info";
  return "neutral";
}

export function StatusBadge({
  value,
  tone,
  className,
}: {
  value?: string | null;
  tone?: Tone;
  className?: string;
}) {
  const label = value ?? "unknown";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        toneClass[tone ?? toneFor(label)],
        className,
      )}
    >
      {String(label).replace(/_/g, " ")}
    </span>
  );
}

export function DataOriginBadge({ kind }: { kind: "public" | "synthetic" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        kind === "public"
          ? "border-info/30 bg-info/10 text-info"
          : "border-warning/40 bg-warning/15 text-warning-foreground",
      )}
    >
      {kind === "public" ? "Public data" : "Synthetic data"}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatNumber(value?: number | null, digits = 2) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}
