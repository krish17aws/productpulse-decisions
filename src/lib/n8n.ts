/**
 * n8n production webhook client.
 *
 * Every mutation (scenario activation/reset, recommendation decisions) goes
 * through n8n. The browser never writes to Supabase directly.
 */

const SIGNAL_DETECTION_WEBHOOK =
  "https://krishaws17.app.n8n.cloud/webhook/productpulse-signal-detection";
const HUMAN_APPROVAL_WEBHOOK =
  "https://krishaws17.app.n8n.cloud/webhook/productpulse-human-approval";

export class WebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookError";
  }
}

async function postJson(url: string, payload: unknown, label: string): Promise<unknown> {
  const startedAt = performance.now();
  console.info(`[n8n:${label}] start`, payload);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (caught) {
    console.error(`[n8n:${label}] network error`, caught);
    throw new WebhookError("Could not reach the automation service. Check your connection.");
  }

  const text = await response.text();
  const ms = Math.round(performance.now() - startedAt);

  if (!response.ok) {
    console.error(`[n8n:${label}] failed ${response.status} after ${ms}ms`, text);
    const detail = text.trim().slice(0, 200);
    throw new WebhookError(
      `Workflow returned ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`,
    );
  }

  console.info(`[n8n:${label}] done in ${ms}ms`);
  try {
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    return text;
  }
}

export type ScenarioAction = "activate" | "reset";

export function postScenarioAction(action: ScenarioAction, scenarioId: string): Promise<unknown> {
  return postJson(
    SIGNAL_DETECTION_WEBHOOK,
    { action, scenario_id: scenarioId },
    `signal-detection:${action}`,
  );
}

export type DecisionValue = "approved" | "changes_requested" | "rejected";

export function postApprovalDecision(input: {
  recommendationId: string;
  decision: DecisionValue;
  reason: string;
  decidedBy: string;
}): Promise<unknown> {
  return postJson(
    HUMAN_APPROVAL_WEBHOOK,
    {
      recommendation_id: input.recommendationId,
      decision: input.decision,
      reason: input.reason,
      decided_by: input.decidedBy,
    },
    `human-approval:${input.decision}`,
  );
}

/**
 * Polls a read-only predicate every `intervalMs` until it returns true or the
 * timeout elapses. A timeout is not a failure — the workflow keeps running.
 */
export async function pollUntil(
  predicate: () => Promise<boolean>,
  options?: { intervalMs?: number; timeoutMs?: number; label?: string },
): Promise<boolean> {
  const intervalMs = options?.intervalMs ?? 5000;
  const timeoutMs = options?.timeoutMs ?? 180_000;
  const label = options?.label ?? "poll";
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    try {
      if (await predicate()) {
        console.info(`[${label}] condition met`);
        return true;
      }
    } catch (caught) {
      console.warn(`[${label}] poll attempt failed`, caught);
    }
  }
  console.info(`[${label}] timed out — processing continues in the background`);
  return false;
}
