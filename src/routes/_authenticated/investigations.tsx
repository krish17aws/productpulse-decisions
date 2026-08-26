import { useDataQuery } from "@/lib/use-data";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Field,
  PageHeader,
  StatusBadge,
  formatDateTime,
} from "@/components/primitives";
import { EmptyBlock, QueryBoundary } from "@/components/states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { agentActivityQuery, investigationsQuery } from "@/lib/queries";
import { normalizeAiOutput } from "@/lib/ai-output";
import type { DashboardInvestigation } from "@/lib/db-types";
import { useAuth } from "@/hooks/use-auth";
import {
  investigationDeletionConfigured,
  postInvestigationDeletion,
} from "@/lib/n8n";

export const Route = createFileRoute("/_authenticated/investigations")({
  validateSearch: (search: Record<string, unknown>) => ({
    investigationId:
      typeof search.investigationId === "string"
        ? search.investigationId
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Investigations — ProductPulse AI" },
      {
        name: "description",
        content:
          "Search, filter and inspect anomaly investigations with severity, status and agent findings.",
      },
      { property: "og:title", content: "Investigations — ProductPulse AI" },
      {
        property: "og:description",
        content:
          "Anomaly investigations with severity, status and agent finding counts.",
      },
    ],
  }),
  component: InvestigationsPage,
});

function InvestigationsPage() {
  const { investigationId } = Route.useSearch();
  const { data, isPending, isError, refetch } =
    useDataQuery(investigationsQuery);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<DashboardInvestigation | null>(null);

  useEffect(() => {
    if (!investigationId || !data) return;
    const match = data.find((row) => row.id === investigationId);
    if (match) setSelected(match);
  }, [data, investigationId]);

  const rows = data ?? [];
  const severities = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.severity).filter(Boolean)),
      ) as string[],
    [rows],
  );
  const statuses = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.status).filter(Boolean)),
      ) as string[],
    [rows],
  );

  const filtered = rows.filter((r) => {
    const haystack = JSON.stringify(r).toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (severity !== "all" && r.severity !== severity) return false;
    if (status !== "all" && r.status !== status) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigations"
        description="Every investigation begins with a deterministic rule trigger. Closed and rejected records remain visible as audit history; use the status filter or the controlled delete action when removal is required."
      />

      <div className="panel space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            placeholder="Search investigations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search investigations"
          />
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger aria-label="Filter by severity">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {severities.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <QueryBoundary
          isPending={isPending}
          isError={isError}
          data={rows}
          refetch={() => void refetch()}
          emptyTitle="No investigations yet"
          emptyDescription="No anomaly has crossed a detection rule threshold in this workspace."
        >
          {() =>
            filtered.length === 0 ? (
              <EmptyBlock
                title="No matching investigations"
                description="Try clearing the search box or resetting the severity and status filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scenario</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detected</TableHead>
                      <TableHead>Findings</TableHead>
                      <TableHead>ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-medium">
                          {r.scenario_name ?? r.title ?? "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={r.severity} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={r.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(r.detected_at)}
                        </TableCell>
                        <TableCell className="num">
                          {r.agent_finding_count ?? 0}
                        </TableCell>
                        <TableCell className="num max-w-[220px] truncate text-xs text-muted-foreground">
                          {r.id}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          }
        </QueryBoundary>
      </div>

      <InvestigationDrawer
        investigation={selected}
        onClose={() => setSelected(null)}
        onDeleted={async () => {
          setSelected(null);
          await refetch();
        }}
      />
    </div>
  );
}

function InvestigationDrawer({
  investigation,
  onClose,
  onDeleted,
}: {
  investigation: DashboardInvestigation | null;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const { data, isPending, isError, refetch } = useDataQuery(
    agentActivityQuery,
    { enabled: Boolean(investigation) },
  );

  const findings = (data ?? []).filter(
    (a) => !investigation || a.investigation_id === investigation.id,
  );

  async function deleteInvestigation() {
    if (!investigation || isDeleting) return;
    setIsDeleting(true);
    try {
      await postInvestigationDeletion({
        investigationId: investigation.id,
        requestedBy: user?.email ?? "unknown",
      });
      toast.success("Investigation deleted", {
        description: "The audit views are being refreshed.",
      });
      await queryClient.invalidateQueries();
      await onDeleted();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The investigation could not be deleted.";
      toast.error("Deletion failed", { description: message });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Sheet
      open={Boolean(investigation)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {investigation?.scenario_name ??
              investigation?.title ??
              "Investigation"}
          </SheetTitle>
        </SheetHeader>
        {investigation ? (
          <div className="space-y-5 p-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Severity">
                <StatusBadge value={investigation.severity} />
              </Field>
              <Field label="Status">
                <StatusBadge value={investigation.status} />
              </Field>
              <Field label="Detected">
                {formatDateTime(investigation.detected_at)}
              </Field>
              <Field label="Agent findings">
                {investigation.agent_finding_count ?? 0}
              </Field>
            </div>
            <Field label="Investigation ID">
              <span className="num break-all text-xs">{investigation.id}</span>
            </Field>
            {investigation.summary ? (
              <Field label="Summary">{investigation.summary}</Field>
            ) : null}

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Agent findings
              </p>
              <QueryBoundary
                isPending={isPending}
                isError={isError}
                data={findings}
                refetch={() => void refetch()}
                emptyTitle="No agent findings"
                emptyDescription="No investigation agent has reported a finding for this signal yet."
              >
                {(list) => (
                  <ul className="space-y-3">
                    {list.map((a, i) => {
                      const summary = normalizeAiOutput(
                        a.finding_summary,
                      ).summary;
                      return (
                        <li
                          key={a.id ?? i}
                          className="rounded-md border border-border p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {a.agent_name ?? "Agent"}
                            </p>
                            <StatusBadge value={a.status} />
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {summary || "No summary provided."}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </QueryBoundary>
            </div>

            <div className="rounded-md border border-destructive/25 bg-destructive/5 p-4">
              <p className="text-sm font-semibold">Investigation lifecycle</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Deletion removes this investigation through the n8n governance
                workflow. Related findings, hypotheses, recommendations,
                approvals and experiments must be handled by that workflow
                before the parent record is removed.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="mt-3"
                    variant="destructive"
                    size="sm"
                    disabled={!investigationDeletionConfigured || isDeleting}
                  >
                    <Trash2 className="size-4" />
                    {isDeleting ? "Deleting…" : "Delete investigation"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete this investigation?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This is a destructive, audited n8n action for
                      investigation {investigation.id}. It cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => void deleteInvestigation()}
                    >
                      Delete permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {!investigationDeletionConfigured ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Deletion is disabled until
                  VITE_N8N_INVESTIGATION_DELETE_WEBHOOK is configured.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
