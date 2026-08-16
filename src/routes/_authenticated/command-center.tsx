import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyBlock, ErrorBlock, LoadingBlock, LoadingCards, QueryBoundary } from "@/components/states";
import { PageHeader, StatusBadge, formatDateTime, formatNumber } from "@/components/primitives";
import {
  demoSettingsQuery,
  funnelQuery,
  kpiQuery,
  releaseTimelineQuery,
  timeseriesQuery,
} from "@/lib/queries";
import type { DashboardKpiComparison } from "@/lib/db-types";

export const Route = createFileRoute("/_authenticated/command-center")({
  head: () => ({
    meta: [
      { title: "Command Center — ProductPulse AI" },
      {
        name: "description",
        content:
          "Live product KPIs, active scenario, metric trends, release timeline and checkout funnel.",
      },
      { property: "og:title", content: "Command Center — ProductPulse AI" },
      {
        property: "og:description",
        content: "Live product KPIs, active scenario and metric trends in one decision room.",
      },
    ],
  }),
  component: CommandCenter,
});

const KPI_ORDER = [
  "checkout_conversion",
  "payment_success",
  "revenue_run_rate",
  "gross_margin",
  "complaint_count",
  "payment_timeout_rate",
];

const LOWER_IS_BETTER = new Set(["complaint_count", "payment_timeout_rate"]);

function KpiCard({ kpi }: { kpi: DashboardKpiComparison }) {
  const change = kpi.relative_change_percent;
  const better =
    change === null || change === undefined
      ? null
      : LOWER_IS_BETTER.has(kpi.metric_name)
        ? change < 0
        : change > 0;
  const Icon = change == null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="panel p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {kpi.metric_name.replace(/_/g, " ")}
      </p>
      <p className="num mt-2 text-2xl font-semibold text-foreground">
        {formatNumber(kpi.current_value)}
        {kpi.unit ? <span className="ml-1 text-sm text-muted-foreground">{kpi.unit}</span> : null}
      </p>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <span
          className={
            better === null
              ? "text-muted-foreground"
              : better
                ? "text-success"
                : "text-destructive"
          }
        >
          <Icon className="inline size-4" aria-hidden /> {formatNumber(change)}%
        </span>
        <span className="text-xs text-muted-foreground">
          vs baseline {formatNumber(kpi.baseline_value)}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Δ {formatNumber(kpi.absolute_change)} · {formatDateTime(kpi.observed_at)}
      </p>
    </div>
  );
}

function ScenarioBanner() {
  const { data, isPending, isError, refetch } = useQuery(demoSettingsQuery);
  if (isPending) return <LoadingBlock rows={1} />;
  if (isError) return <ErrorBlock onRetry={() => void refetch()} />;
  const settings = data?.[0];
  if (!settings)
    return (
      <EmptyBlock
        title="No active scenario"
        description="No scenario is currently activated for this workspace."
      />
    );

  return (
    <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Active scenario
        </p>
        <p className="num mt-1 text-sm font-medium text-foreground">
          {settings.active_scenario_id ?? "—"}
        </p>
        <p className="num mt-1 text-xs text-muted-foreground">
          Test run: {settings.active_test_run_id ?? "—"}
        </p>
      </div>
      <div className="text-xs text-muted-foreground">
        <p>Activated {formatDateTime(settings.scenario_activated_at)}</p>
        <p>Updated {formatDateTime(settings.updated_at)}</p>
      </div>
    </div>
  );
}

function pickKey(row: Record<string, unknown>, candidates: string[], fallback?: string) {
  for (const c of candidates) if (c in row) return c;
  return fallback ?? Object.keys(row)[0]!;
}

function TrendChart() {
  const { data, isPending, isError, refetch } = useQuery(timeseriesQuery);
  return (
    <div className="panel p-5">
      <h2 className="text-sm font-semibold text-foreground">Metric trend</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Deterministic time-series readings from the connected workspace.
      </p>
      <QueryBoundary
        isPending={isPending}
        isError={isError}
        data={data}
        refetch={() => void refetch()}
        loading={<LoadingBlock rows={3} />}
        emptyTitle="No time-series data"
        emptyDescription="The workspace has not recorded metric readings for this scenario yet."
      >
        {(rows) => {
          const first = rows[0] as Record<string, unknown>;
          const xKey = pickKey(first, ["observed_at", "bucket", "event_date", "day"]);
          const yKey = pickKey(first, ["metric_value", "value", "current_value"]);
          const seriesKey = "metric_name" in first ? "metric_name" : null;
          const names = seriesKey
            ? Array.from(new Set(rows.map((r) => String(r[seriesKey] ?? ""))))
            : [];
          const active = names[0];
          const filtered = active
            ? rows.filter((r) => String((r as Record<string, unknown>)[seriesKey!]) === active)
            : rows;
          return (
            <>
              {active ? (
                <p className="mb-2 text-xs font-medium text-foreground">{active}</p>
              ) : null}
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={filtered as Record<string, unknown>[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey={xKey} tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} width={56} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey={yKey}
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          );
        }}
      </QueryBoundary>
    </div>
  );
}

function FunnelPanel() {
  const { data, isPending, isError, refetch } = useQuery(funnelQuery);
  return (
    <div className="panel p-5">
      <h2 className="text-sm font-semibold text-foreground">Conversion funnel</h2>
      <p className="mb-4 text-xs text-muted-foreground">Stage-by-stage user progression.</p>
      <QueryBoundary
        isPending={isPending}
        isError={isError}
        data={data}
        refetch={() => void refetch()}
        loading={<LoadingBlock rows={3} />}
        emptyTitle="No funnel data"
        emptyDescription="No funnel stages have been recorded for the active scenario."
      >
        {(rows) => {
          const first = rows[0] as Record<string, unknown>;
          const xKey = pickKey(first, ["stage_name", "stage", "step_name"]);
          const yKey = pickKey(first, ["user_count", "users", "sessions", "event_count"]);
          return (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rows as Record<string, unknown>[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={56} />
                <Tooltip />
                <Bar dataKey={yKey} fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          );
        }}
      </QueryBoundary>
    </div>
  );
}

function ReleasePanel() {
  const { data, isPending, isError, refetch } = useQuery(releaseTimelineQuery);
  return (
    <div className="panel p-5">
      <h2 className="text-sm font-semibold text-foreground">Recent releases</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Release events correlated with metric movement.
      </p>
      <QueryBoundary
        isPending={isPending}
        isError={isError}
        data={data}
        refetch={() => void refetch()}
        emptyTitle="No releases recorded"
        emptyDescription="No release events exist in the connected workspace yet."
      >
        {(rows) => (
          <ol className="relative space-y-5 border-l border-border pl-5">
            {rows.slice(0, 8).map((r, i) => {
              const row = r as Record<string, unknown>;
              const name = (row["release_name"] ?? row["name"] ?? row["title"] ?? "Release") as string;
              const at = (row["released_at"] ?? row["release_date"] ?? row["created_at"]) as
                | string
                | undefined;
              const desc = (row["description"] ?? row["notes"] ?? "") as string;
              return (
                <li key={i} className="relative">
                  <span className="absolute -left-[27px] top-1.5 size-2.5 rounded-full bg-primary" />
                  <p className="text-sm font-medium text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(at ?? null)}</p>
                  {desc ? <p className="mt-1 text-sm text-muted-foreground">{desc}</p> : null}
                </li>
              );
            })}
          </ol>
        )}
      </QueryBoundary>
    </div>
  );
}

function CommandCenter() {
  const { data, isPending, isError, refetch } = useQuery(kpiQuery);

  const ordered = (data ?? [])
    .filter((k) => KPI_ORDER.includes(k.metric_name))
    .sort((a, b) => KPI_ORDER.indexOf(a.metric_name) - KPI_ORDER.indexOf(b.metric_name));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        description="Deterministic rule-based detection across live product KPIs. AI reasoning starts only after a signal is confirmed."
        actions={<StatusBadge value="Deterministic detection" tone="info" />}
      />

      <ScenarioBanner />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Key performance indicators</h2>
        {isPending ? (
          <LoadingCards count={6} />
        ) : isError ? (
          <ErrorBlock onRetry={() => void refetch()} />
        ) : ordered.length === 0 ? (
          <EmptyBlock
            title="No KPI readings"
            description="The workspace has no current KPI comparison rows to display."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ordered.map((kpi) => (
              <KpiCard key={kpi.metric_name} kpi={kpi} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <TrendChart />
        <FunnelPanel />
      </div>

      <ReleasePanel />
    </div>
  );
}
