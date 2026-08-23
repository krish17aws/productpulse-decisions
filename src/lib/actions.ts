/**
 * UI action handlers.
 *
 * Every mutation is delegated to the n8n production webhooks — this app never
 * writes scenario, recommendation, approval or experiment data from the browser.
 * After a webhook completes we refetch the read-only Supabase views and, for
 * long-running workflows, poll those same views until the result lands.
 */
import {
  postApprovalDecision,
  postScenarioAction,
  pollUntil,
  type DecisionValue,
} from "@/lib/n8n";
import {
  agentFindingsQuery,
  decisionsQuery,
  demoSettingsQuery,
  experimentsQuery,
  fetchTable,
} from "@/lib/queries";
import { refetchAllQueries } from "@/lib/use-data";

export interface ActionProgress {
  (message: string): void;
}

export interface ActionOptions {
  onProgress?: ActionProgress;
  signal?: AbortSignal;
}

/** Activates a scenario, then waits for the new run to produce a recommendation. */
export async function activateScenario(
  scenarioId: string,
  options: ActionOptions = {},
): Promise<{ timedOut: boolean }> {
  const { onProgress, signal } = options;
  onProgress?.("Starting investigation…");

  // Capture the current run + recommendations so a NEW result is detectable.
  let baselineRunId: string | null = null;
  let baselineIds = new Set<string>();
  try {
    const [settings, decisions] = await Promise.allSettled([
      fetchTable(demoSettingsQuery),
      fetchTable(decisionsQuery),
    ]);
    if (settings.status === "fulfilled") {
      baselineRunId = settings.value[0]?.active_test_run_id ?? null;
    }
    if (decisions.status === "fulfilled") {
      baselineIds = new Set(decisions.value.map((d) => d.id));
    }
  } catch {
    // A failed baseline read must not block the workflow.
  }

  await postScenarioAction("activate", scenarioId, signal);
  refetchAllQueries();

  onProgress?.("Waiting for the investigation to produce a recommendation…");
  const settled = await pollUntil(
    async () => {
      const [settings, decisions] = await Promise.allSettled([
        fetchTable(demoSettingsQuery),
        fetchTable(decisionsQuery),
      ]);
      const runId =
        settings.status === "fulfilled" ? (settings.value[0]?.active_test_run_id ?? null) : null;
      const rows = decisions.status === "fulfilled" ? decisions.value : [];
      const newRecommendation = rows.some((d) => !baselineIds.has(d.id));
      const newRun = runId !== null && runId !== baselineRunId;
      refetchAllQueries();
      return newRecommendation && (newRun || baselineRunId === null);
    },
    { label: "poll:new-recommendation", ...(signal ? { signal } : {}) },
  );

  refetchAllQueries();
  return { timedOut: !settled };
}

/** Resets a scenario (or the whole workspace with the `baseline` id). */
export async function resetScenario(
  scenarioId = "baseline",
  options: ActionOptions = {},
): Promise<void> {
  const { onProgress, signal } = options;
  onProgress?.("Resetting workspace…");
  await postScenarioAction("reset", scenarioId, signal);
  refetchAllQueries();
}

/** Records a human decision, then waits for the experiment outcome. */
export async function submitRecommendationDecision(input: {
  recommendationId: string;
  decision: DecisionValue;
  reason: string;
  decidedBy: string;
  onProgress?: ActionProgress;
  signal?: AbortSignal;
}): Promise<{ timedOut: boolean }> {
  const { recommendationId, decision, reason, decidedBy, onProgress, signal } = input;
  onProgress?.(
    decision === "approved"
      ? "Recording approval and launching experiment…"
      : decision === "rejected"
        ? "Recording rejection…"
        : "Recording requested changes…",
  );

  await postApprovalDecision({ recommendationId, decision, reason, decidedBy }, signal);
  refetchAllQueries();

  if (decision !== "approved") return { timedOut: false };

  onProgress?.("Waiting for the experiment to complete…");
  const settled = await pollUntil(
    async () => {
      const [experiments, findings] = await Promise.all([
        fetchTable(experimentsQuery),
        fetchTable(agentFindingsQuery),
      ]);
      const completed = experiments.some(
        (e) =>
          e.recommendation_id === recommendationId &&
          (e.status ?? "").toLowerCase() === "completed",
      );
      const outcomeAgent = findings.some((f) =>
        (f.agent_name ?? "").toLowerCase().includes("outcome monitoring"),
      );
      refetchAllQueries();
      return completed && outcomeAgent;
    },
    { label: "poll:experiment-outcome", ...(signal ? { signal } : {}) },
  );

  refetchAllQueries();
  return { timedOut: !settled };
}
