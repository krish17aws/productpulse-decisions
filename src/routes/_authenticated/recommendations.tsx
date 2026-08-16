import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Field, PageHeader, StatusBadge, formatDateTime } from "@/components/primitives";
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
import {
  approveRecommendation,
  rejectRecommendation,
  requestRecommendationChanges,
} from "@/lib/actions";
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
      { property: "og:title", content: "Recommendations — ProductPulse AI" },
      {
        property: "og:description",
        content: "Recommendations awaiting human PM approval, with rationale and guardrails.",
      },
    ],
  }),
  component: RecommendationsPage,
});

type CommentMode = "reject" | "changes";

function RecommendationsPage() {
  const { data, isPending, isError, refetch } = useQuery(decisionsQuery);
  const [dialog, setDialog] = useState<{ id: string; mode: CommentMode } | null>(null);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  async function submitComment() {
    if (!dialog) return;
    if (!comment.trim()) {
      setCommentError("A comment is required before this decision can be recorded.");
      return;
    }
    if (dialog.mode === "reject") await rejectRecommendation(dialog.id, comment.trim());
    else await requestRecommendationChanges(dialog.id, comment.trim());
    setDialog(null);
    setComment("");
    setCommentError(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recommendations"
        description="AI-synthesised product actions. Nothing ships without explicit human PM approval."
      />

      <QueryBoundary
        isPending={isPending}
        isError={isError}
        data={data}
        refetch={() => void refetch()}
        loading={<LoadingCards count={3} />}
        emptyTitle="No recommendations yet"
        emptyDescription="No investigation has produced a recommended product action so far."
      >
        {(rows) => (
          <div className="space-y-4">
            {rows.map((d) => (
              <article key={d.id} className="panel space-y-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="max-w-3xl text-base font-semibold">
                    {d.recommendation ?? "Recommendation"}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={d.approval_state ?? "pending"} />
                    <StatusBadge value={d.experiment_state ?? "not started"} tone="neutral" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Rationale">{d.rationale ?? "—"}</Field>
                  <Field label="Expected impact">{d.expected_impact ?? "—"}</Field>
                  <Field label="Risks">{d.risks ?? "—"}</Field>
                  <Field label="Guardrails">{d.guardrails ?? "—"}</Field>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>
                      Confidence:{" "}
                      <span className="num text-foreground">
                        {d.confidence === null || d.confidence === undefined
                          ? "—"
                          : `${d.confidence <= 1 ? Math.round(d.confidence * 100) : Math.round(d.confidence)}%`}
                      </span>
                    </span>
                    <span>Created {formatDateTime(d.created_at)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void approveRecommendation(d.id)}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDialog({ id: d.id, mode: "changes" })}
                    >
                      Request Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDialog({ id: d.id, mode: "reject" })}
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
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setComment("");
            setCommentError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "reject" ? "Reject recommendation" : "Request changes"}
            </DialogTitle>
            <DialogDescription>
              A written comment is required so the reasoning stays auditable.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Explain your decision…"
            rows={4}
          />
          {commentError ? (
            <p role="alert" className="text-sm text-destructive">
              {commentError}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={dialog?.mode === "reject" ? "destructive" : "default"}
              onClick={() => void submitComment()}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
