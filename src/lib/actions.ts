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
  experimentsQuery,
  fetchTable,
} from "@/lib/queries";
import { refetchAllQueries } from "@/lib/use-data";

export interface ActionProgress {
  (message: string): void;
}

/** Activates a scenario, then waits for a new recommendation to appear. */
export async function activateScenario(
  scenarioId: string,
  onProgress?: ActionProgress,
): Promise<{ timedOut: boolean }> {
  onProgress?.("Starting investigation…");

  let baselineIds = new Set<string>();
  try {
    baselineIds = new Set((await fetchTable(decisionsQuery)).map((d) => d.id));
  } catch {
    // A failed baseline read must not block the workflow.
  }

  await postScenarioAction("activate", scenarioId);
  refetchAllQueries();

  onProgress?.("Waiting for the investigation to produce a recommendation…");
  const settled = await pollUntil(
    async () => {
      const rows = await fetchTable(decisionsQuery);
      const isNew = rows.some((d) => !baselineIds.has(d.id));
      if (isNew) refetchAllQueries();
      return isNew;
    },
    { label: "poll:new-recommendation" },
  );

  refetchAllQueries();
  return { timedOut: !settled };
}

/** Resets a scenario (or the whole workspace with the `baseline` id). */
export async function resetScenario(
  scenarioId = "baseline",
  onProgress?: ActionProgress,
): Promise<void> {
  onProgress?.("Resetting workspace…");
  await postScenarioAction("reset", scenarioId);
  refetchAllQueries();
}

/** Records a human decision, then waits for the experiment outcome. */
export async function submitRecommendationDecision(input: {
  recommendationId: string;
  decision: DecisionValue;
  reason: string;
  decidedBy: string;
  onProgress?: ActionProgress;
}): Promise<{ timedOut: boolean }> {
  const { recommendationId, decision, reason, decidedBy, onProgress } = input;
  onProgress?.(
    decision === "approved" ? "Recording approval and launching experiment…" : "Recording decision…",
  );

  await postApprovalDecision({ recommendationId, decision, reason, decidedBy });
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
      if (completed && outcomeAgent) refetchAllQueries();
      return completed && outcomeAgent;
    },
    { label: "poll:experiment-outcome" },
  );

  refetchAllQueries();
  return { timedOut: !settled };
}
