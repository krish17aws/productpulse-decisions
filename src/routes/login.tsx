import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — ProductPulse AI Decision Room" },
      {
        name: "description",
        content:
          "Sign in to ProductPulse AI to review metric anomalies, agent investigations and product recommendations.",
      },
      { property: "og:title", content: "Sign in — ProductPulse AI" },
      {
        property: "og:description",
        content: "Secure access to the ProductPulse AI autonomous product decision room.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/command-center", replace: true });
  }, [loading, session, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      console.error("[auth] sign-in failed", signInError);
      setError("We couldn't sign you in. Check your email and password and try again.");
      return;
    }
    navigate({ to: "/command-center", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div>
          <p className="text-lg font-semibold text-sidebar-accent-foreground">ProductPulse AI</p>
          <p className="mt-1 text-sm text-sidebar-foreground/70">
            Autonomous Product Decision Room
          </p>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-semibold text-sidebar-accent-foreground">
            Deterministic detection. Accountable AI reasoning.
          </h2>
          <p className="text-sm text-sidebar-foreground/70">
            Rule-based anomaly detection launches three parallel investigation agents, followed by
            root-cause synthesis and independent risk review — every recommendation still needs
            human PM approval.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          Combines public Google Merchandise Store GA4 data with clearly labelled synthetic
          telemetry.
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your ProductPulse AI workspace account.
            </p>
          </div>

          {!supabaseConfigured ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
              The workspace connection is missing its publishable key, so sign-in is unavailable.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting || !supabaseConfigured}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
