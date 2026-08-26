import { useDataQuery } from "@/lib/use-data";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ClampedText, FullAnalysisDialog } from "@/components/ai-content";
import {
  Field,
  PageHeader,
  StatusBadge,
  formatDateTime,
  formatNumber,
} from "@/components/primitives";
import { LoadingCards, QueryBoundary } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { normalizeAiOutput } from "@/lib/ai-output";
import { agentActivityQuery, hypothesesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/agent-decision-room")({
  head: () => ({
    meta: [
      { title: "Agent Decision Room — ProductPulse AI" },
      {
        name: "description",
        content:
          "Agent run status, findings and confidence alongside structured root-cause hypotheses.",
      },
      {
        property: "og:title",
        content: "Agent Decision Room — ProductPulse AI",
      },
      {
        property: "og:description",
        content:
          "Investigation agent activity and structured root-cause hypotheses.",
      },
    ],
  }),
  component: AgentDecisionRoom,
});

function confidencePercent(value?: number | null) {
  if (value === null || value === undefined) return null;
  return value <= 1 ? Math.round(value * 100) : Math.round(value);
}

function AgentDecisionRoom() {
  const agents = useDataQuery(agentActivityQuery);
  const hypotheses = useDataQuery(hypothesesQuery);
  const [selectedAgent, setSelectedAgent] = useState<
    NonNullable<typeof agents.data>[number] | null
  >(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Decision Room"
        description="Deterministic signal detection launches three parallel investigation agents, followed by root-cause synthesis and independent risk review."
      />

      <div className="panel p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge value="Rule-based detection" tone="info" />
          <span className="text-muted-foreground">→</span>
          <StatusBadge value="3 parallel investigation agents" tone="neutral" />
          <span className="text-muted-foreground">→</span>
          <StatusBadge value="Root-cause synthesis" tone="neutral" />
          <span className="text-muted-foreground">→</span>
          <StatusBadge value="Independent risk review" tone="warning" />
          <span className="text-muted-foreground">→</span>
          <StatusBadge value="Human PM approval" tone="success" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Detection stays deterministic and auditable. Only the investigation,
          synthesis and risk stages use AI reasoning, and each finding keeps its
          own confidence and evidence count.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Agent activity</h2>
        <QueryBoundary
          isPending={agents.isPending}
          isError={agents.isError}
          data={agents.data}
          refetch={() => void agents.refetch()}
          loading={<LoadingCards count={6} />}
          emptyTitle="No agent runs yet"
          emptyDescription="No investigation agent has been launched for the active scenario."
        >
          {(rows) => (
            <div className="grid auto-rows-fr gap-4 lg:grid-cols-2">
              {rows.map((a, i) => {
                const pct = confidencePercent(a.confidence);
                const summary = normalizeAiOutput(a.finding_summary).summary;
                return (
                  <article
                    key={a.id ?? i}
                    className="panel flex min-w-0 flex-col gap-3 p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold">
                        {a.agent_name ?? "Agent"}
                      </h3>
                      <StatusBadge value={a.status} />
                    </div>
                    <ClampedText
                      text={summary || "No finding summary reported."}
                      lines={5}
                      className="min-h-[6.5rem]"
                    />
                    {a.finding_summary ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="self-start"
                        onClick={() => setSelectedAgent(a)}
                      >
                        View full analysis
                      </Button>
                    ) : null}
                    <div className="mt-auto space-y-3">
                      {pct !== null ? (
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Confidence</span>
                            <span className="num">{pct}%</span>
                          </div>
                          <Progress value={pct} className="mt-1 h-1.5" />
                        </div>
                      ) : null}
                      <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                        <div>
                          <dt>Records analysed</dt>
                          <dd className="num text-foreground">
                            {formatNumber(a.input_record_count, 0)}
                          </dd>
                        </div>
                        <div>
                          <dt>Started</dt>
                          <dd className="text-foreground">
                            {formatDateTime(a.started_at)}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt>Completed</dt>
                          <dd className="text-foreground">
                            {formatDateTime(a.completed_at)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </QueryBoundary>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Structured hypotheses</h2>
        <QueryBoundary
          isPending={hypotheses.isPending}
          isError={hypotheses.isError}
          data={hypotheses.data}
          refetch={() => void hypotheses.refetch()}
          emptyTitle="No hypotheses recorded"
          emptyDescription="Root-cause synthesis has not produced hypotheses for this investigation yet."
        >
          {(rows) => (
            <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((h) => {
                const pct = confidencePercent(h.confidence);
                return (
                  <article
                    key={h.id}
                    className="panel flex min-w-0 flex-col gap-3 p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold">
                        {h.hypothesis ??
                          (h["title"] as string | undefined) ??
                          "Hypothesis"}
                      </h3>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {h.is_primary ? (
                          <StatusBadge value="Primary" tone="info" />
                        ) : null}
                        {h.status ? <StatusBadge value={h.status} /> : null}
                      </div>
                    </div>
                    {h.description ? (
                      <p className="text-sm text-muted-foreground">
                        {h.description}
                      </p>
                    ) : null}
                    <div className="mt-auto grid grid-cols-2 gap-3 border-t border-border pt-3">
                      <Field label="Confidence">
                        <span className="num">
                          {pct === null ? "—" : `${pct}%`}
                        </span>
                      </Field>
                      <Field label="Created">
                        {formatDateTime(h.created_at)}
                      </Field>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </QueryBoundary>
      </section>

      <FullAnalysisDialog
        open={selectedAgent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAgent(null);
        }}
        title={selectedAgent?.agent_name ?? "Agent analysis"}
        description="Complete stored agent finding, shown without changing the database value."
        value={selectedAgent?.finding_summary}
      />
    </div>
  );
}
