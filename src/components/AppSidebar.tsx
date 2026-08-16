import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Beaker,
  Database,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";

import { externalSupabase as supabase } from "@/integrations/supabase/external-client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/command-center", label: "Command Center", icon: LayoutDashboard },
  { to: "/metrics", label: "Metrics", icon: Gauge },
  { to: "/investigations", label: "Investigations", icon: Search },
  { to: "/agent-decision-room", label: "Agent Decision Room", icon: Sparkles },
  { to: "/recommendations", label: "Recommendations", icon: Activity },
  { to: "/experiments", label: "Experiments", icon: FlaskConical },
  { to: "/scenario-lab", label: "Scenario Lab", icon: Beaker },
  { to: "/data-sources", label: "Data Sources", icon: Database },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{
            className:
              "bg-sidebar-primary/15 text-sidebar-accent-foreground ring-1 ring-inset ring-sidebar-primary/40",
          }}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-5">
        <p className="text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
          ProductPulse AI
        </p>
        <p className="mt-0.5 text-xs text-sidebar-foreground/60">
          Autonomous Product Decision Room
        </p>
      </div>
      <NavList {...(onNavigate ? { onNavigate } : {})} />
      <div className="border-t border-sidebar-border p-3">
        <p className="truncate px-2 pb-2 text-xs text-sidebar-foreground/60">
          {user?.email ?? "Signed in"}
        </p>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-64">
          <SidebarBody />
        </div>
      </aside>

      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
        <button
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="rounded-md border border-border p-2"
        >
          <Menu className="size-4" aria-hidden />
        </button>
        <span className="text-sm font-semibold">ProductPulse AI</span>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className={cn("absolute inset-y-0 left-0 w-72 shadow-xl")}>
            <button
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-md p-1 text-sidebar-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
