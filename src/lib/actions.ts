/**
 * Action-handler placeholders.
 *
 * These intentionally do NOT write to Supabase. They will later call the
 * n8n production webhooks that own approval and scenario orchestration.
 */
import { toast } from "sonner";

export async function approveRecommendation(recommendationId: string): Promise<void> {
  console.info("[action] approveRecommendation", { recommendationId });
  toast.success("Approval queued", {
    description: "This will call the n8n approval webhook once wired up.",
  });
}

export async function rejectRecommendation(
  recommendationId: string,
  comment: string,
): Promise<void> {
  console.info("[action] rejectRecommendation", { recommendationId, comment });
  toast.success("Rejection queued", {
    description: "This will call the n8n approval webhook once wired up.",
  });
}

export async function requestRecommendationChanges(
  recommendationId: string,
  comment: string,
): Promise<void> {
  console.info("[action] requestRecommendationChanges", { recommendationId, comment });
  toast.success("Change request queued", {
    description: "This will call the n8n approval webhook once wired up.",
  });
}

export async function activateScenario(scenarioId: string): Promise<void> {
  console.info("[action] activateScenario", { scenarioId });
  toast.success("Scenario activation queued", {
    description: "This will call the n8n scenario webhook once wired up.",
  });
}

export async function resetScenario(): Promise<void> {
  console.info("[action] resetScenario");
  toast.success("Reset queued", {
    description: "This will call the n8n reset webhook once wired up.",
  });
}
