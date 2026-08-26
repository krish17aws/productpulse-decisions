import { useDataQuery } from "@/lib/use-data";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ClampedText,
  FullAnalysisDialog,
  MarkdownText,
} from "@/components/ai-content";
import {
  Field,
  PageHeader,
  StatusBadge,
  formatDateTime,
} from "@/components/primitives";
import { LoadingCards, QueryBoundary } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { submitRecommendationDecision } from "@/lib/actions";
import type {
  DashboardDecision,
  DashboardInvestigation,
} from "@/lib/db-types";
import type { DecisionValue } from "@/lib/n8n";
import {
  approvalDecisionsQuery,
  decisionsQuery,
  investigationsQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendations — ProductPulse AI" },
      {
        name: "description",
        content:
          "Review AI-synthesised product recommendations with rationale, risks, guardrails and approval state.",
      },
    ],
  }),
  component: RecommendationsPage,
});

type DecisionDialog = { row: DashboardDecision; decision: DecisionValue };

const decisionLabel: Record<DecisionValue, string> = {
  approved: "Approve recommendation",
  changes_requested: "Request changes",
  rejected: "Reject recommendation",
};

function cleanStoredList(value?: string | null) {
  if (!value) return "—";
  return value
    .trim()
    .replace(/^=\s*/, "")
    .replace(/^•\s*/gm, "- ");
}

function RecommendationsPage() {
  const query = useDataQuery(decisionsQuery);
  const approvals = useDataQuery(approvalDecisionsQuery);
  const investigations = useDataQuery(investigationsQuery);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [decisionDialog, setDecisionDialog] = useState<DecisionDialog | null>(
    null,
  );
  const [analysis, setAnalysis] = useState<DashboardDecision | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [queueView, setQueueView] = useState<"pending" | "history">("pending");
  const [processedIds, setProcessedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const email = user?.email ?? null;
  const investigationById = useMemo(
    () =>
      new Map(
        (investigations.data ?? []).map((investigation) => [
          investigation.id,
          investigation,
        ]),
      ),
    [investigations.data],
  );
  const latestDecisionByRecommendationId = useMemo(() => {
    const latest = new Map<string, { decision: string; timestamp: number }>();

    for (const approval of approvals.data ?? []) {
      if (!approval.recommendation_id) continue;
      const decision = (approval.decision ?? "")
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
      const timestamp = Date.parse(
        approval.decided_at ?? approval.created_at ?? "",
      );
      const previous = latest.get(approval.recommendation_id);
      if (!previous || (Number.isFinite(timestamp) ? timestamp : 0) >= previous.timestamp) {
        latest.set(approval.recommendation_id, {
          decision,
          timestamp: Number.isFinite(timestamp) ? timestamp : 0,
        });
      }
    }

    return latest;
  }, [approvals.data]);

  const decidedRecommendationIds = useMemo(
    () =>
      new Set(
        [...latestDecisionByRecommendationId.entries()]
          .filter(([, value]) =>
            ["approved", "rejected", "changes_requested"].includes(
              value.decision,
            ),
          )
          .map(([recommendationId]) => recommendationId),
      ),
    [latestDecisionByRecommendationId],
  );

  const actionableRecommendations = query.data?.filter((row) => {
    const state = (row.approval_state ?? "pending")
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    return (
      !processedIds.has(row.id) &&
      !decidedRecommendationIds.has(row.id) &&
      (state === "pending" || state === "pending_approval")
    );
  });
  const historicalRecommendations = query.data?.filter((row) =>
    decidedRecommendationIds.has(row.id),
  );
  const displayedRecommendations =
    queueView === "pending"
      ? actionableRecommendations
      : historicalRecommendations;

  function openDecision(row: DashboardDecision, decision: DecisionValue) {
    if (busy) return;
    setDecisionDialog({ row, decision });
    setReason(decision === "approved" ? "Approved by Product Manager" : "");
    setReasonError(null);
    setRequestError(null);
    setProgress(null);
  }

  async function submitDecision() {
    if (!decisionDialog || busy) return;
    if (!email) {
      setRequestError(
        "Your authenticated email is unavailable. Sign out and sign in again.",
      );
      return;
    }
    const trimmedReason = reason.trim();
    if (decisionDialog.decision !== "approved" && !trimmedReason) {
      setReasonError("A reason is required for this decision.");
      return;
    }

    setBusy(true);
    setReasonError(null);
    setRequestError(null);
    try {
      const result = await submitRecommendationDecision({
        recommendationId: decisionDialog.row.id,
        decision: decisionDialog.decision,
        reason:
          trimmedReason ||
          (decisionDialog.decision === "approved"
            ? "Approved by Product Manager"
            : ""),
        decidedBy: email,
        onProgress: setProgress,
      });

      if (result.timedOut) {
        toast.info("Processing continues in the background", {
          description:
            "The dashboard will show the experiment outcome when it is available.",
        });
      } else {
        toast.success(
          decisionDialog.decision === "approved"
            ? "Approval recorded and experiment completed"
            : "Decision recorded",
        );
      }
      // Hide the completed decision only after n8n accepted it. The row remains
      // in Supabase for audit history and will stay hidden after the refetch
      // because its approval_state is no longer actionable.
      setProcessedIds((current) => {
        const next = new Set(current);
        next.add(decisionDialog.row.id);
        return next;
      });
      setDecisionDialog(null);
      setReason("");
      setProgress(null);
      void query.refetch();
      void approvals.refetch();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "The request failed.";
      setRequestError(message);
      toast.error("Decision failed", { description: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recommendations"
        description="Decision-ready actions grouped by their originating issue. Nothing ships without explicit human PM approval."
      />

      <div className="panel p-5">
        <p className="text-sm font-medium">How to read this page</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge value="Detected issue" tone="info" />
          <span className="text-muted-foreground">→</span>
          <StatusBadge value="Root-cause hypotheses" tone="neutral" />
          <span className="text-muted-foreground">→</span>
          <StatusBadge value="Recommended action" tone="warning" />
          <span className="text-muted-foreground">→</span>
          <StatusBadge value="PM decision" tone="success" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          A hypothesis is a ranked possible explanation for an issue. It is
          evidence for the decision—not the action itself. This page only shows
          pending actions and completed decisions are separated so the audit
          history remains visible without cluttering the PM queue.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={queueView === "pending" ? "default" : "outline"}
            onClick={() => setQueueView("pending")}
          >
            Pending decisions ({actionableRecommendations?.length ?? 0})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={queueView === "history" ? "default" : "outline"}
            onClick={() => setQueueView("history")}
          >
            Decision history ({historicalRecommendations?.length ?? 0})
          </Button>
        </div>
      </div>

      <QueryBoundary
        isPending={
          query.isPending || approvals.isPending || investigations.isPending
        }
        isError={query.isError || approvals.isError || investigations.isError}
        data={displayedRecommendations}
        refetch={() => {
          void query.refetch();
          void approvals.refetch();
          void investigations.refetch();
        }}
        loading={<LoadingCards count={3} />}
        emptyTitle={
          queueView === "pending"
            ? "No pending recommendations"
            : "No decision history"
        }
        emptyDescription={
          queueView === "pending"
            ? "All existing recommendations have been decided, or PP-03 has not produced a recommendation for the selected issue yet. Open Decision History to review older actions."
            : "No approved, rejected or changes-requested recommendations were returned by the approvals table."
        }
      >
        {(rows) => (
          <div className="space-y-4">
            {rows.map((row) => {
              const recordedDecision =
                latestDecisionByRecommendationId.get(row.id)?.decision;
              const investigation = row.investigation_id
                ? investigationById.get(row.investigation_id)
                : undefined;
              return (
              <article
                key={row.id}
                className="panel flex min-w-0 flex-col gap-4 p-6"
              >
                <IssueContext
                  investigation={investigation}
                  investigationId={row.investigation_id}
                  onView={() =>
                    void navigate({
                      to: "/investigations",
                      search: { investigationId: row.investigation_id ?? "" },
                    } as never)
                  }
                />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="max-w-3xl text-base font-semibold [overflow-wrap:anywhere]">
                    {row.recommendation ?? row.recommended_action ?? "Recommendation"}
                  </h2>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <StatusBadge
                      value={recordedDecision ?? row.approval_state ?? "pending"}
                    />
                    <StatusBadge
                      value={row.experiment_state ?? "not started"}
                      tone="neutral"
                    />
                  </div>
                </div>

                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <div className="min-w-0 rounded-lg border border-border p-4">
                    <Field label="Rationale">
                      <ClampedText text={row.rationale ?? "—"} lines={6} />
                    </Field>
                  </div>
                  <div className="min-w-0 rounded-lg border border-border p-4">
                    <Field label="Expected impact">
                      <ClampedText
                        text={row.expected_impact ?? "—"}
                        lines={6}
                      />
                    </Field>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="self-start"
                  onClick={() => setAnalysis(row)}
                >
                  View rationale, risks and guardrails
                </Button>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>
                      Confidence:{" "}
                      <span className="num text-foreground">
                        {row.confidence === null || row.confidence === undefined
                          ? "—"
                          : `${row.confidence <= 1 ? Math.round(row.confidence * 100) : Math.round(row.confidence)}%`}
                      </span>
                    </span>
                    <span>Created {formatDateTime(row.created_at)}</span>
                  </div>
                  {queueView === "pending" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => openDecision(row, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => openDecision(row, "changes_requested")}
                    >
                      Request Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => openDecision(row, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                  ) : (
                    <StatusBadge
                      value={recordedDecision ?? "decided"}
                      tone="neutral"
                    />
                  )}
                </div>
              </article>
              );
            })}
          </div>
        )}
      </QueryBoundary>

      <Dialog
        open={decisionDialog !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setDecisionDialog(null);
            setReason("");
            setReasonError(null);
            setRequestError(null);
            setProgress(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionDialog
                ? decisionLabel[decisionDialog.decision]
                : "Record decision"}
            </DialogTitle>
            <DialogDescription>
              This decision is sent to the n8n production workflow and remains
              auditable.
            </DialogDescription>
          </DialogHeader>
          <Field label="Decision maker">{email ?? "Email unavailable"}</Field>
          <Field label="Recommendation ID">
            <span className="num break-all text-xs">
              {decisionDialog?.row.id ?? "—"}
            </span>
          </Field>
          <div>
            <label htmlFor="decision-reason" className="text-sm font-medium">
              Reason{" "}
              {decisionDialog?.decision === "approved"
                ? "(optional)"
                : "(required)"}
            </label>
            <Textarea
              id="decision-reason"
              className="mt-2"
              value={reason}
              disabled={busy}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError(null);
              }}
              placeholder="Explain the product decision…"
              rows={4}
            />
          </div>
          {progress ? (
            <p
              className="text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {progress}
            </p>
          ) : null}
          {reasonError ? (
            <p className="text-sm text-destructive">{reasonError}</p>
          ) : null}
          {requestError ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/25 bg-destructive/5 p-3"
            >
              <p className="text-sm text-destructive">{requestError}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Review the message, then use Retry to send the same decision
                again.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDecisionDialog(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={busy}
              variant={
                decisionDialog?.decision === "rejected"
                  ? "destructive"
                  : "default"
              }
              onClick={() => void submitDecision()}
            >
              {busy ? "Working…" : requestError ? "Retry" : "Confirm decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FullAnalysisDialog
        open={analysis !== null}
        onOpenChange={(open) => {
          if (!open) setAnalysis(null);
        }}
        title={
          analysis?.recommendation ??
          analysis?.recommended_action ??
          "Recommendation analysis"
        }
        description="Stored recommendation details, formatted for review without changing the source data."
        value={analysis?.rationale}
        extra={
          analysis ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <Field label="Expected impact">
                  <MarkdownText text={cleanStoredList(analysis.expected_impact)} />
                </Field>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <Field label="Risks">
                  <MarkdownText text={cleanStoredList(analysis.risks)} />
                </Field>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <Field label="Guardrails">
                  <MarkdownText text={cleanStoredList(analysis.guardrails)} />
                </Field>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}

function IssueContext({
  investigation,
  investigationId,
  onView,
}: {
  investigation?: DashboardInvestigation;
  investigationId?: string | null;
  onView: () => void;
}) {
  const title =
    investigation?.scenario_name ??
    investigation?.title ??
    "Investigation context unavailable";

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Issue this recommendation addresses
          </p>
          <p className="mt-1 font-semibold [overflow-wrap:anywhere]">{title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {investigation?.severity ? (
              <StatusBadge value={investigation.severity} />
            ) : null}
            {investigation?.status ? (
              <StatusBadge value={investigation.status} tone="neutral" />
            ) : null}
            <span className="text-xs text-muted-foreground">
              Detected {formatDateTime(investigation?.detected_at)}
            </span>
          </div>
          <p className="num mt-2 break-all text-xs text-muted-foreground">
            Investigation: {investigationId ?? "Not linked"}
          </p>
        </div>
        {investigationId ? (
          <Button type="button" size="sm" variant="outline" onClick={onView}>
            View issue
          </Button>
        ) : null}
      </div>
    </div>
  );
}
