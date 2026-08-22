import { externalSupabase as supabase } from "@/integrations/supabase/external-client";
import { supabaseConfigured } from "@/lib/supabase-status";
import type {
  AgentFinding,
  DashboardAgentActivity,
  DashboardDecision,
  DashboardFunnel,
  DashboardInvestigation,
  DashboardKpiComparison,
  DashboardMetricTimeseries,
  DashboardReleaseTimeline,
  DatasetRegistry,
  DemoSettings,
  Experiment,
  ExperimentResult,
  Hypothesis,
  SourceDailyMetric,
  SourceEventDistribution,
  TestScenario,
} from "@/lib/db-types";

/** Thrown for any Supabase failure. Message is user-safe; details go to console. */
export class DataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataError";
  }
}

/** Declarative description of one read against the external project. */
export interface TableQuery<T> {
  /** Stable name used for logging and cache keys. */
  name: string;
  table: string;
  columns: string;
  /** Phantom type marker — never populated at runtime. */
  readonly __row?: T;
}

function tableQuery<T>(table: string, columns = "*"): TableQuery<T> {
  return { name: table, table, columns };
}

/**
 * Runs a single read. No retries, no timeouts, no fetch wrapper — one request
 * through the shared external client, with concise logging.
 */
export async function fetchTable<T>(query: TableQuery<T>): Promise<T[]> {
  if (!supabaseConfigured) {
    throw new DataError("The analytics workspace is not connected yet.");
  }
  const startedAt = performance.now();
  console.info(`[query:${query.name}] start`);

  const { data, error } = await (
    supabase.from(query.table as never) as never as {
      select: (columns: string) => Promise<{ data: unknown; error: unknown }>;
    }
  ).select(query.columns);

  const ms = Math.round(performance.now() - startedAt);
  if (error) {
    console.error(`[query:${query.name}] failed after ${ms}ms`, error);
    throw new DataError("We couldn't load this data right now.");
  }
  const rows = (data ?? []) as T[];
  console.info(`[query:${query.name}] done in ${ms}ms — ${rows.length} row(s)`);
  return rows;
}

export const kpiQuery = tableQuery<DashboardKpiComparison>("dashboard_kpi_comparison");
export const demoSettingsQuery = tableQuery<DemoSettings>("demo_settings");
export const timeseriesQuery = tableQuery<DashboardMetricTimeseries>("dashboard_metric_timeseries");
export const releaseTimelineQuery = tableQuery<DashboardReleaseTimeline>(
  "dashboard_release_timeline",
);
export const funnelQuery = tableQuery<DashboardFunnel>("dashboard_funnel");
export const investigationsQuery = tableQuery<DashboardInvestigation>("dashboard_investigations");
export const agentActivityQuery = tableQuery<DashboardAgentActivity>("dashboard_agent_activity");
export const hypothesesQuery = tableQuery<Hypothesis>("hypotheses");
export const decisionsQuery = tableQuery<DashboardDecision>("dashboard_decisions");
export const experimentsQuery = tableQuery<Experiment>("experiments");
export const experimentResultsQuery = tableQuery<ExperimentResult>("experiment_results");
export const agentFindingsQuery = tableQuery<AgentFinding>("agent_findings");
export const testScenariosQuery = tableQuery<TestScenario>("test_scenarios");
export const datasetRegistryQuery = tableQuery<DatasetRegistry>("dataset_registry");
export const eventDistributionQuery = tableQuery<SourceEventDistribution>(
  "source_event_distribution",
);
export const sourceDailyMetricsQuery = tableQuery<SourceDailyMetric>("source_daily_metrics");
