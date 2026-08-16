import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Field, PageHeader, StatusBadge, formatDateTime } from "@/components/primitives";
import { ErrorBlock, LoadingBlock, LoadingCards, QueryBoundary } from "@/components/states";
import { Button } from "@/components/ui/button";
import { activateScenario, resetScenario } from "@/lib/actions";
import { demoSettingsQuery, testScenariosQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/scenario-lab")({
  head: () => ({
    meta: [
      { title: "Scenario Lab — ProductPulse AI" },
      {
        name: "description",
        content:
          "Activate deterministic test scenarios such as UPI routing failure, gateway outage or coupon stacking.",
      },
      { property: "og:title", content: "Scenario Lab — ProductPulse AI" },
      {
        property: "og:description",
        content: "Deterministic test scenarios that drive the detection and investigation loop.",
      },
    ],
  }),
  component: ScenarioLab,
});

function ScenarioLab() {
  const scenarios = useQuery(testScenariosQuery);
  const settings = useQuery(demoSettingsQuery);
  const active = settings.data?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scenario Lab"
        description="Scenario definitions drive synthetic telemetry so detection rules can be exercised end to end."
        actions={
          <Button variant="outline" size="sm" onClick={() => void resetScenario()}>
            Reset workspace
          </Button>
        }
      />

      <div className="panel p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Currently active
        </p>
        {settings.isPending ? (
          <LoadingBlock rows={1} />
        ) : settings.isError ? (
          <ErrorBlock onRetry={() => void settings.refetch()} />
        ) : (
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <Field label="Scenario ID">
              <span className="num text-xs">{active?.active_scenario_id ?? "—"}</span>
            </Field>
            <Field label="Test run">
              <span className="num text-xs">{active?.active_test_run_id ?? "—"}</span>
            </Field>
            <Field label="Activated">{formatDateTime(active?.scenario_activated_at ?? null)}</Field>
          </div>
        )}
      </div>

      <QueryBoundary
        isPending={scenarios.isPending}
        isError={scenarios.isError}
        data={scenarios.data}
        refetch={() => void scenarios.refetch()}
        loading={<LoadingCards count={6} />}
        emptyTitle="No scenarios defined"
        emptyDescription="The workspace has no test scenario definitions registered."
      >
        {(rows) => (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((s) => {
              const isActive = active?.active_scenario_id === s.id;
              return (
                <article key={s.id} className="panel flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold">
                      {s.scenario_name ?? s.name ?? "Scenario"}
                    </h2>
                    {isActive ? <StatusBadge value="active" tone="success" /> : null}
                  </div>
                  <p className="flex-1 text-sm text-muted-foreground">
                    {s.description ?? "No description provided."}
                  </p>
                  {s.expected_outcome ? (
                    <Field label="Expected outcome">{s.expected_outcome}</Field>
                  ) : null}
                  <div className="flex gap-2 border-t border-border pt-3">
                    <Button size="sm" onClick={() => void activateScenario(s.id)}>
                      Activate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void resetScenario()}>
                      Reset
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </QueryBoundary>

      <p className="text-xs text-muted-foreground">
        Activate and Reset are orchestration placeholders — they will call the n8n production
        webhooks and never write to the database from the browser.
      </p>
    </div>
  );
}
