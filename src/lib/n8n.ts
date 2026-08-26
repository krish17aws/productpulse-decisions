/**
 * n8n production webhook client.
 *
 * Every mutation (scenario activation/reset, recommendation decisions) goes
 * through n8n. The browser never writes to Supabase directly, and no API key,
 * token or response header is ever surfaced in an error message.
 */

const SIGNAL_DETECTION_WEBHOOK =
  "https://krishaws17.app.n8n.cloud/webhook/productpulse-signal-detection";
const HUMAN_APPROVAL_WEBHOOK =
  "https://krishaws17.app.n8n.cloud/webhook/productpulse-human-approval";
const INVESTIGATION_DELETE_WEBHOOK = (
  import.meta.env["VITE_N8N_INVESTIGATION_DELETE_WEBHOOK"] as string | undefined
)?.trim();

export const investigationDeletionConfigured = Boolean(
  INVESTIGATION_DELETE_WEBHOOK,
);

export class WebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookError";
  }
}

/** Extracts a short, safe message from a JSON or text (never HTML) body. */
function safeErrorDetail(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (/^\s*</.test(trimmed)) return ""; // HTML error page — never shown raw
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      for (const key of ["message", "error", "hint", "detail"]) {
        const value = record[key];
        if (typeof value === "string" && value.trim())
          return value.trim().slice(0, 200);
      }
      return "";
    }
    if (typeof parsed === "string") return parsed.slice(0, 200);
  } catch {
    // plain text
  }
  return trimmed.replace(/\s+/g, " ").slice(0, 200);
}

/** In-flight requests keyed by action+record, so double clicks send one POST. */
const inFlight = new Map<string, Promise<unknown>>();

async function postJson(
  url: string,
  payload: unknown,
  label: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const startedAt = performance.now();
  console.info(`[n8n:${label}] start`, payload);
  let response: Response;
  try {
    const init: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
    if (signal) init.signal = signal;
    response = await fetch(url, init);
  } catch (caught) {
    if ((caught as { name?: string })?.name === "AbortError") throw caught;
    console.error(`[n8n:${label}] network error`, caught);
    throw new WebhookError(
      "Could not reach the automation service. Check your connection.",
    );
  }

  const text = await response.text();
  const ms = Math.round(performance.now() - startedAt);

  if (!response.ok) {
    console.error(
      `[n8n:${label}] failed ${response.status} after ${ms}ms`,
      text,
    );
    const detail = safeErrorDetail(text);
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

/** Deduplicated POST — a second call with the same key reuses the in-flight one. */
function postOnce(
  key: string,
  url: string,
  payload: unknown,
  label: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const existing = inFlight.get(key);
  if (existing) {
    console.info(
      `[n8n:${label}] duplicate suppressed — reusing in-flight request`,
    );
    return existing;
  }
  const request = postJson(url, payload, label, signal).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, request);
  return request;
}

export type ScenarioAction = "activate" | "reset";

export function postScenarioAction(
  action: ScenarioAction,
  scenarioId: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return postOnce(
    `scenario:${action}:${scenarioId}`,
    SIGNAL_DETECTION_WEBHOOK,
    { action, scenario_id: scenarioId },
    `signal-detection:${action}`,
    signal,
  );
}

export type DecisionValue = "approved" | "changes_requested" | "rejected";

export function postApprovalDecision(
  input: {
    recommendationId: string;
    decision: DecisionValue;
    reason: string;
    decidedBy: string;
  },
  signal?: AbortSignal,
): Promise<unknown> {
  return postOnce(
    `decision:${input.decision}:${input.recommendationId}`,
    HUMAN_APPROVAL_WEBHOOK,
    {
      recommendation_id: input.recommendationId,
      decision: input.decision,
      reason: input.reason,
      decided_by: input.decidedBy,
    },
    `human-approval:${input.decision}`,
    signal,
  );
}

/**
 * Permanently removes one investigation through a dedicated, server-side n8n
 * workflow. The workflow owns all cascading/archival rules; the browser never
 * deletes Supabase rows directly.
 */
export function postInvestigationDeletion(
  input: { investigationId: string; requestedBy: string },
  signal?: AbortSignal,
): Promise<unknown> {
  if (!INVESTIGATION_DELETE_WEBHOOK) {
    return Promise.reject(
      new WebhookError(
        "Investigation deletion is not configured. Add VITE_N8N_INVESTIGATION_DELETE_WEBHOOK in Vercel after publishing the deletion workflow in n8n.",
      ),
    );
  }
  return postOnce(
    `investigation:delete:${input.investigationId}`,
    INVESTIGATION_DELETE_WEBHOOK,
    {
      action: "delete",
      investigation_id: input.investigationId,
      requested_by: input.requestedBy,
    },
    "investigation-delete",
    signal,
  );
}

/**
 * Polls a read-only predicate every `intervalMs` until it returns true or the
 * timeout elapses. A timeout is not a failure — the workflow keeps running.
 * Aborting via `signal` stops the loop immediately (used on unmount).
 */
export async function pollUntil(
  predicate: () => Promise<boolean>,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    label?: string;
    signal?: AbortSignal;
  },
): Promise<boolean> {
  const intervalMs = options?.intervalMs ?? 5000;
  const timeoutMs = options?.timeoutMs ?? 180_000;
  const label = options?.label ?? "poll";
  const signal = options?.signal;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      console.info(`[${label}] aborted`);
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    if (signal?.aborted) {
      console.info(`[${label}] aborted`);
      return false;
    }
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
