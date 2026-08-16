import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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

import { DataOriginBadge, PageHeader, formatNumber } from "@/components/primitives";
import { LoadingBlock, QueryBoundary } from "@/components/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  datasetRegistryQuery,
  eventDistributionQuery,
  sourceDailyMetricsQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/data-sources")({
  head: () => ({
    meta: [
      { title: "Data Sources — ProductPulse AI" },
      {
        name: "description",
        content:
          "Public Google Merchandise Store GA4 data and clearly labelled synthetic release, payment and feedback telemetry.",
      },
      { property: "og:title", content: "Data Sources — ProductPulse AI" },
      {
        property: "og:description",
        content: "Provenance of every dataset powering the decision room.",
      },
    ],
  }),
  component: DataSourcesPage,
});

const PROVENANCE: { name: string; origin: "public" | "synthetic"; note: string }[] = [
  {
    name: "Google Merchandise Store GA4",
    origin: "public",
    note: "Publicly available GA4 sample e-commerce event data, imported as-is.",
  },
  {
    name: "Releases",
    origin: "synthetic",
    note: "Generated release timeline used to correlate deployments with metric shifts.",
  },
  {
    name: "Payment telemetry",
    origin: "synthetic",
    note: "Generated gateway, timeout and settlement events for failure scenarios.",
  },
  {
    name: "Customer feedback",
    origin: "synthetic",
    note: "Generated complaint and support text used by the feedback investigation agent.",
  },
];

function DataSourcesPage() {
  const registry = useQuery(datasetRegistryQuery);
  const distribution = useQuery(eventDistributionQuery);
  const daily = useQuery(sourceDailyMetricsQuery);

  const totalEvents = (distribution.data ?? []).reduce(
    (sum, row) => sum + (Number(row.event_count) || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Sources"
        description="Every dataset is labelled by provenance. Event counts come from the real import — no estimated or illustrative totals."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PROVENANCE.map((p) => (
          <article key={p.name} className="panel space-y-2 p-5">
            <DataOriginBadge kind={p.origin} />
            <h2 className="text-sm font-semibold">{p.name}</h2>
            <p className="text-sm text-muted-foreground">{p.note}</p>
          </article>
        ))}
      </section>

      <div className="panel p-5">
        <h2 className="text-sm font-semibold">Imported Google event volume</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Summed directly from the event distribution view.
        </p>
        {distribution.isPending ? (
          <LoadingBlock rows={1} />
        ) : (
          <p className="num mt-3 text-3xl font-semibold">
            {distribution.isError ? "—" : formatNumber(totalEvents, 0)}
            <span className="ml-2 text-sm font-normal text-muted-foreground">events</span>
          </p>
        )}
      </div>

      <div className="panel overflow-x-auto">
        <div className="p-5 pb-0">
          <h2 className="text-sm font-semibold">Dataset registry</h2>
        </div>
        <QueryBoundary
          isPending={registry.isPending}
          isError={registry.isError}
          data={registry.data}
          refetch={() => void registry.refetch()}
          loading={
            <div className="p-5">
              <LoadingBlock />
            </div>
          }
          emptyTitle="No datasets registered"
          emptyDescription="The workspace registry contains no dataset entries."
        >
          {(rows) => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Source type</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.dataset_name ?? "—"}</TableCell>
                    <TableCell>{r.source_type ?? "—"}</TableCell>
                    <TableCell className="num">{formatNumber(r.record_count, 0)}</TableCell>
                    <TableCell className="max-w-md text-muted-foreground">
                      {r.description ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </QueryBoundary>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-5">
          <h2 className="text-sm font-semibold">Event distribution</h2>
          <p className="mb-4 text-xs text-muted-foreground">Top events in the imported dataset.</p>
          <QueryBoundary
            isPending={distribution.isPending}
            isError={distribution.isError}
            data={distribution.data}
            refetch={() => void distribution.refetch()}
            loading={<LoadingBlock rows={3} />}
            emptyTitle="No event distribution"
            emptyDescription="No event rows are available from the source dataset."
          >
            {(rows) => (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={rows.slice(0, 12) as Record<string, unknown>[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="event_name" tick={{ fontSize: 10 }} interval={0} angle={-25} height={60} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} width={64} />
                  <Tooltip />
                  <Bar dataKey="event_count" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </QueryBoundary>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold">Daily source volume</h2>
          <p className="mb-4 text-xs text-muted-foreground">Events per day in the source data.</p>
          <QueryBoundary
            isPending={daily.isPending}
            isError={daily.isError}
            data={daily.data}
            refetch={() => void daily.refetch()}
            loading={<LoadingBlock rows={3} />}
            emptyTitle="No daily metrics"
            emptyDescription="No daily source metrics are available."
          >
            {(rows) => (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={rows as Record<string, unknown>[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="event_date" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} width={64} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="event_count"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </QueryBoundary>
        </div>
      </div>
    </div>
  );
}
