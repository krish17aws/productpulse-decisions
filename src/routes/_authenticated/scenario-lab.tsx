import { useDataQuery } from "@/lib/use-data";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Field, PageHeader, StatusBadge, formatDateTime } from "@/components/primitives";
import { ErrorBlock, LoadingBlock, LoadingCards, QueryBoundary } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type Pending = {
  action: "activate" | "reset";
  scenarioId: string;
  label: string;
};

function ScenarioLab() {
  const scenarios = useDataQuery(testScenariosQuery);
  const settings = useDataQuery(demoSettingsQuery);
  const active = settings.data?.[0];

  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busyKey = (p: Pending) => `${p.action}:${p.scenarioId}`;

  async function run(pending: Pending) {
    if (busy) return;
    setBusy(busyKey(pending));
    setError(null);
    try {
      if (pending.action === "activate") {
        const { timedOut } = await activateScenario(pending.scenarioId, setProgress);
        if (timedOut) {
          toast.info("Still processing", {
            description: "The investigation continues in the background. Data will refresh.",
          });
        } else {
          toast.success("Investigation complete", {
            description: "A new recommendation is available.",
          });
        }
      } else {
        await resetScenario(pending.scenarioId, setProgress);
        toast.success("Workspace reset requested");
      }
      setConfirm(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The request failed.";
      setError(message);
      toast.error("Action failed", { description: message });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scenario Lab"
        description="Scenario definitions drive synthetic telemetry so detection rules can be exercised end to end."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() =>
              setConfirm({ action: "reset", scenarioId: "baseline", label: "the whole workspace" })
            }
          >
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

      {progress ? (
        <div className="panel p-4 text-sm text-muted-foreground" role="status" aria-live="polite">
          {progress}
        </div>
      ) : null}

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
              const title = s.scenario_name ?? s.name ?? "Scenario";
              return (
                <article key={s.id} className="panel flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    {isActive ? <StatusBadge value="active" tone="success" /> : null}
                  </div>
                  <p className="flex-1 text-sm text-muted-foreground">
                    {s.description ?? "No description provided."}
                  </p>
                  {s.expected_outcome ? (
                    <Field label="Expected outcome">{s.expected_outcome}</Field>
                  ) : null}
                  <div className="flex gap-2 border-t border-border pt-3">
                    <Button
                      size="sm"
                      disabled={busy !== null}
                      onClick={() =>
                        setConfirm({ action: "activate", scenarioId: s.id, label: title })
                      }
                    >
                      {busy === `activate:${s.id}` ? "Starting…" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => setConfirm({ action: "reset", scenarioId: s.id, label: title })}
                    >
                      {busy === `reset:${s.id}` ? "Resetting…" : "Reset"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </QueryBoundary>

      <p className="text-xs text-muted-foreground">
        Activate and Reset call the n8n production webhooks — the browser never writes to the
        database.
      </p>

      <Dialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setConfirm(null);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.action === "activate" ? "Activate scenario" : "Reset"}
            </DialogTitle>
            <DialogDescription>
              {confirm?.action === "activate"
                ? `This starts a signal-detection run for “${confirm.label}”.`
                : `This resets ${confirm?.label ?? "the workspace"} through the n8n workflow.`}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Scenario ID: <span className="num">{confirm?.scenarioId}</span>
          </p>
          {progress ? (
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              {progress}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={busy !== null} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy !== null}
              onClick={() => {
                if (confirm) void run(confirm);
              }}
            >
              {busy ? "Working…" : error ? "Retry" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
