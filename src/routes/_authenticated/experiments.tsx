import { useDataQuery } from "@/lib/use-data";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import {
  Field,
  PageHeader,
  StatusBadge,
  formatDateTime,
  formatNumber,
} from "@/components/primitives";
import { EmptyBlock, LoadingCards, QueryBoundary } from "@/components/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  agentFindingsQuery,
  decisionsQuery,
  experimentResultsQuery,
  experimentsQuery,
} from "@/lib/queries";
import type { AgentFinding } from "@/lib/db-types";

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
        content:
          "Control versus treatment experiment outcomes tied back to recommendations.",
      },
    ],
  }),
  component: ExperimentsPage,
});

const OUTCOME_ORDER = ["EXPAND", "CONTINUE", "ITERATE", "STOP"] as const;

function outcomeFromFinding(summary?: string | null): string {
  const text = summary ?? "";
  for (const outcome of OUTCOME_ORDER) {
    if (text.includes(`Recommendation: ${outcome}`)) return outcome;
  }
  return "Review required";
}

function formatUplift(value?: number | null) {
  if (value === null || value === undefined) return "—";
  const pct = Number(value) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function latestFinding(findings: AgentFinding[]): AgentFinding | undefined {
  return [...findings].sort(
    (a, b) =>
      new Date(b.completed_at ?? 0).getTime() -
      new Date(a.completed_at ?? 0).getTime(),
  )[0];
}

function referencesExperiment(finding: AgentFinding, experimentId: string) {
  return JSON.stringify(finding).includes(experimentId);
}

function toText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ExperimentsPage() {
  const experiments = useDataQuery(experimentsQuery);
  const results = useDataQuery(experimentResultsQuery);
  const decisions = useDataQuery(decisionsQuery);
  const findings = useDataQuery(agentFindingsQuery);

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
              const linked = (results.data ?? []).filter(
                (r) => r.experiment_id === e.id,
              );
              const allPassed =
                linked.length > 0 &&
                linked.every((r) => r.guardrail_breached === false);

              const recommendation = (decisions.data ?? []).find(
                (d) => d.id === e.recommendation_id,
              );
              const investigationId = recommendation?.investigation_id ?? null;
              const investigationExperiments = (experiments.data ?? []).filter(
                (candidate) => {
                  const candidateRecommendation = (decisions.data ?? []).find(
                    (d) => d.id === candidate.recommendation_id,
                  );
                  return (
                    candidateRecommendation?.investigation_id ===
                    investigationId
                  );
                },
              );
              const possibleOutcomes = investigationId
                ? (findings.data ?? []).filter(
                    (f) =>
                      f.investigation_id === investigationId &&
                      f.agent_name === "Outcome Monitoring Agent",
                  )
                : [];
              const exactOutcome = possibleOutcomes.filter((finding) =>
                referencesExperiment(finding, e.id),
              );
              // A finding may safely fall back to the investigation only when
              // that investigation has exactly one experiment.
              const outcomeFinding = latestFinding(
                exactOutcome.length > 0
                  ? exactOutcome
                  : investigationExperiments.length === 1
                    ? possibleOutcomes
                    : [],
              );
              const finalOutcome = outcomeFinding
                ? outcomeFromFinding(outcomeFinding.finding_summary)
                : null;

              return (
                <article key={e.id} className="panel space-y-4 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">
                        {e.name ?? "Experiment"}
                      </h2>
                      <p className="num mt-1 text-xs text-muted-foreground">
                        Recommendation: {e.recommendation_id ?? "—"}
                      </p>
                    </div>
                    <StatusBadge value={e.status} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Success criterion">
                      {toText(e.success_criterion)}
                    </Field>
                    <Field label="Guardrail metrics">
                      {toText(e.guardrail_metrics)}
                    </Field>
                    <Field label="Final outcome">
                      {finalOutcome ? (
                        <StatusBadge value={finalOutcome} />
                      ) : (
                        "Pending"
                      )}
                    </Field>
                    <Field label="Window">
                      {formatDateTime(e.started_at)} →{" "}
                      {formatDateTime(e.completed_at)}
                    </Field>
                  </div>

                  {allPassed ? (
                    <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-sm font-medium text-success">
                      <CheckCircle2 className="size-4" aria-hidden />
                      All guardrails passed
                    </div>
                  ) : null}

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
                              <TableHead>Metric</TableHead>
                              <TableHead>Variant</TableHead>
                              <TableHead>Value</TableHead>
                              <TableHead>Sample size</TableHead>
                              <TableHead>Change</TableHead>
                              <TableHead>Guardrail</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {linked.flatMap((r, index) => {
                              const key = `${r.experiment_id}-${r.metric_name}-${index}`;
                              return [
                                <TableRow key={`${key}-control`}>
                                  <TableCell
                                    rowSpan={2}
                                    className="font-medium"
                                  >
                                    {r.metric_name ?? "—"}
                                  </TableCell>
                                  <TableCell>Control</TableCell>
                                  <TableCell className="num">
                                    {formatNumber(r.control_value, 3)}
                                  </TableCell>
                                  <TableCell className="num">
                                    {formatNumber(r.sample_size_control, 0)}
                                  </TableCell>
                                  <TableCell rowSpan={2} className="num">
                                    {formatUplift(r.relative_uplift)}
                                  </TableCell>
                                  <TableCell rowSpan={2}>
                                    <StatusBadge
                                      value={
                                        r.guardrail_breached
                                          ? "Breached"
                                          : "Passed"
                                      }
                                      tone={
                                        r.guardrail_breached
                                          ? "danger"
                                          : "success"
                                      }
                                    />
                                  </TableCell>
                                </TableRow>,
                                <TableRow key={`${key}-treatment`}>
                                  <TableCell>Treatment</TableCell>
                                  <TableCell className="num">
                                    {formatNumber(r.treatment_value, 3)}
                                  </TableCell>
                                  <TableCell className="num">
                                    {formatNumber(r.sample_size_treatment, 0)}
                                  </TableCell>
                                </TableRow>,
                              ];
                            })}
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
