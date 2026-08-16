import { useDataQuery } from "@/lib/use-data";
import { createFileRoute } from "@tanstack/react-router";

import { Field, PageHeader, StatusBadge, formatDateTime, formatNumber } from "@/components/primitives";
import { EmptyBlock, LoadingCards, QueryBoundary } from "@/components/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { experimentResultsQuery, experimentsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/experiments")({
  head: () => ({
    meta: [
      { title: "Experiments — ProductPulse AI" },
      {
        name: "description",
        content:
          "Monitor experiment status, control versus treatment results, success criteria and guardrails.",
      },
      { property: "og:title", content: "Experiments — ProductPulse AI" },
      {
        property: "og:description",
        content: "Control versus treatment experiment outcomes tied back to recommendations.",
      },
    ],
  }),
  component: ExperimentsPage,
});

function ExperimentsPage() {
  const experiments = useDataQuery(experimentsQuery);
  const results = useDataQuery(experimentResultsQuery);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Experiments"
        description="Approved recommendations become monitored experiments. Outcomes feed back into the decision loop."
      />

      <QueryBoundary
        isPending={experiments.isPending}
        isError={experiments.isError}
        data={experiments.data}
        refetch={() => void experiments.refetch()}
        loading={<LoadingCards count={2} />}
        emptyTitle="No experiments running"
        emptyDescription="No approved recommendation has been promoted to an experiment yet."
      >
        {(rows) => (
          <div className="space-y-5">
            {rows.map((e) => {
              const linked = (results.data ?? []).filter((r) => r.experiment_id === e.id);
              return (
                <article key={e.id} className="panel space-y-4 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">{e.name ?? "Experiment"}</h2>
                      <p className="num mt-1 text-xs text-muted-foreground">
                        Recommendation: {e.decision_id ?? e.recommendation_id ?? "—"}
                      </p>
                    </div>
                    <StatusBadge value={e.status} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Success criteria">{e.success_criteria ?? "—"}</Field>
                    <Field label="Guardrails">{e.guardrails ?? "—"}</Field>
                    <Field label="Final outcome">
                      {e.final_outcome ? <StatusBadge value={e.final_outcome} /> : "Pending"}
                    </Field>
                    <Field label="Window">
                      {formatDateTime(e.started_at)} → {formatDateTime(e.ended_at)}
                    </Field>
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Control vs treatment
                    </p>
                    {results.isPending ? (
                      <LoadingCards count={2} />
                    ) : linked.length === 0 ? (
                      <EmptyBlock
                        title="No results recorded"
                        description="This experiment has not reported control or treatment measurements yet."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Variant</TableHead>
                              <TableHead>Metric</TableHead>
                              <TableHead>Value</TableHead>
                              <TableHead>Sample size</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {linked.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="font-medium capitalize">
                                  {r.variant ?? "—"}
                                </TableCell>
                                <TableCell>{r.metric_name ?? "—"}</TableCell>
                                <TableCell className="num">
                                  {formatNumber(r.metric_value)}
                                </TableCell>
                                <TableCell className="num">
                                  {formatNumber(r.sample_size, 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
