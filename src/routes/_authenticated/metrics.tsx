import { useDataQuery } from "@/lib/use-data";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader, formatDateTime, formatNumber } from "@/components/primitives";
import { LoadingBlock, QueryBoundary } from "@/components/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { kpiQuery, timeseriesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/metrics")({
  head: () => ({
    meta: [
      { title: "Metrics — ProductPulse AI" },
      {
        name: "description",
        content: "Explore product metric time series and baseline comparisons per metric.",
      },
      { property: "og:title", content: "Metrics — ProductPulse AI" },
      {
        property: "og:description",
        content: "Product metric time series and baseline comparisons.",
      },
    ],
  }),
  component: MetricsPage,
});

function MetricsPage() {
  const ts = useDataQuery(timeseriesQuery);
  const kpis = useDataQuery(kpiQuery);
  const [selected, setSelected] = useState<string | null>(null);

  const rows = (ts.data ?? []) as Record<string, unknown>[];
  const names = Array.from(new Set(rows.map((r) => String(r["metric_name"] ?? "series")))).filter(
    Boolean,
  );
  const active = selected ?? names[0] ?? null;
  const filtered = active ? rows.filter((r) => String(r["metric_name"] ?? "series") === active) : rows;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metrics"
        description="Raw metric readings from the connected analytics workspace. Values are never substituted or estimated."
      />

      <div className="panel p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {names.map((n) => (
            <button
              key={n}
              onClick={() => setSelected(n)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                n === active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {n.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <QueryBoundary
          isPending={ts.isPending}
          isError={ts.isError}
          data={rows}
          refetch={() => void ts.refetch()}
          loading={<LoadingBlock rows={4} />}
          emptyTitle="No metric readings"
          emptyDescription="The workspace has no time-series rows for the active scenario."
        >
          {() => (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={filtered}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="observed_at" tick={{ fontSize: 11 }} minTickGap={28} />
                <YAxis tick={{ fontSize: 11 }} width={60} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="metric_value"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </QueryBoundary>
      </div>

      <div className="panel overflow-x-auto">
        <div className="p-5 pb-0">
          <h2 className="text-sm font-semibold">Current vs baseline</h2>
        </div>
        <QueryBoundary
          isPending={kpis.isPending}
          isError={kpis.isError}
          data={kpis.data}
          refetch={() => void kpis.refetch()}
          loading={<div className="p-5"><LoadingBlock /></div>}
          emptyTitle="No KPI comparisons"
          emptyDescription="No baseline comparison rows are available."
        >
          {(list) => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Baseline</TableHead>
                  <TableHead>Δ</TableHead>
                  <TableHead>Δ %</TableHead>
                  <TableHead>Observed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((k) => (
                  <TableRow key={k.metric_name}>
                    <TableCell className="font-medium">
                      {k.metric_name.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="num">
                      {formatNumber(k.current_value)} {k.unit ?? ""}
                    </TableCell>
                    <TableCell className="num">{formatNumber(k.baseline_value)}</TableCell>
                    <TableCell className="num">{formatNumber(k.absolute_change)}</TableCell>
                    <TableCell className="num">
                      {formatNumber(k.relative_change_percent)}%
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(k.observed_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </QueryBoundary>
      </div>
    </div>
  );
}
