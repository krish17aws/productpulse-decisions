import { useDataQuery } from "@/lib/use-data";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import type { DashboardDecision } from "@/lib/db-types";
import type { DecisionValue } from "@/lib/n8n";
import { decisionsQuery } from "@/lib/queries";

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

function RecommendationsPage() {
  const query = useDataQuery(decisionsQuery);
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

  const email = user?.email ?? null;

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
      setDecisionDialog(null);
      setReason("");
      setProgress(null);
      void query.refetch();
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
        description="AI-synthesised product actions. Nothing ships without explicit human PM approval."
      />

      <QueryBoundary
        isPending={query.isPending}
        isError={query.isError}
        data={query.data}
        refetch={() => void query.refetch()}
        loading={<LoadingCards count={3} />}
        emptyTitle="No recommendations yet"
        emptyDescription="No investigation has produced a recommended product action so far."
      >
        {(rows) => (
          <div className="space-y-4">
            {rows.map((row) => (
              <article
                key={row.id}
                className="panel flex min-w-0 flex-col gap-4 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="max-w-3xl text-base font-semibold [overflow-wrap:anywhere]">
                    {row.recommendation ?? "Recommendation"}
                  </h2>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <StatusBadge value={row.approval_state ?? "pending"} />
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
                </div>
              </article>
            ))}
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
        title={analysis?.recommendation ?? "Recommendation analysis"}
        description="Stored recommendation details, formatted for review without changing the source data."
        value={analysis?.rationale}
        extra={
          analysis ? (
            <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
              <Field label="Expected impact">
                <MarkdownText text={analysis.expected_impact ?? "—"} />
              </Field>
              <Field label="Risks">
                <MarkdownText text={analysis.risks ?? "—"} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Guardrails">
                  <MarkdownText text={analysis.guardrails ?? "—"} />
                </Field>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}
