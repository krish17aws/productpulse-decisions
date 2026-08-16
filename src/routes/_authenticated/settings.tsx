import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Field, PageHeader, StatusBadge, formatDateTime } from "@/components/primitives";
import { ErrorBlock, LoadingBlock } from "@/components/states";
import { useAuth } from "@/hooks/use-auth";
import { supabaseConfigured } from "@/integrations/supabase/client";
import { demoSettingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ProductPulse AI" },
      {
        name: "description",
        content: "Workspace connection, session details and decision-loop architecture notes.",
      },
      { property: "og:title", content: "Settings — ProductPulse AI" },
      {
        property: "og:description",
        content: "Workspace connection and decision-loop architecture notes.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const settings = useQuery(demoSettingsQuery);
  const active = settings.data?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Read-only workspace information. This application never modifies database schema."
      />

      <div className="panel space-y-4 p-6">
        <h2 className="text-sm font-semibold">Session</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Signed in as">{user?.email ?? "—"}</Field>
          <Field label="User ID">
            <span className="num break-all text-xs">{user?.id ?? "—"}</span>
          </Field>
        </div>
      </div>

      <div className="panel space-y-4 p-6">
        <h2 className="text-sm font-semibold">Workspace connection</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Connection">
            <StatusBadge
              value={supabaseConfigured ? "connected" : "not configured"}
              tone={supabaseConfigured ? "success" : "danger"}
            />
          </Field>
          <Field label="Access model">Publishable key with row-level security only</Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Schema is owned externally. This dashboard performs read-only queries and never uses a
          service-role key in the browser.
        </p>
      </div>

      <div className="panel space-y-4 p-6">
        <h2 className="text-sm font-semibold">Active scenario</h2>
        {settings.isPending ? (
          <LoadingBlock rows={1} />
        ) : settings.isError ? (
          <ErrorBlock onRetry={() => void settings.refetch()} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Scenario ID">
              <span className="num text-xs">{active?.active_scenario_id ?? "—"}</span>
            </Field>
            <Field label="Test run">
              <span className="num text-xs">{active?.active_test_run_id ?? "—"}</span>
            </Field>
            <Field label="Last updated">{formatDateTime(active?.updated_at ?? null)}</Field>
          </div>
        )}
      </div>

      <div className="panel space-y-2 p-6">
        <h2 className="text-sm font-semibold">Decision-loop architecture</h2>
        <p className="text-sm text-muted-foreground">
          Deterministic signal detection launches three parallel investigation agents, followed by
          root-cause synthesis and independent risk review. Approval always requires a human product
          manager, and approved actions are monitored as experiments.
        </p>
      </div>
    </div>
  );
}
