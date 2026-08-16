import { queryOptions } from "@tanstack/react-query";

import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import type {
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

async function selectAll<T>(table: string, columns = "*"): Promise<T[]> {
  if (!supabaseConfigured) {
    throw new DataError("The analytics workspace is not connected yet.");
  }
  const { data, error } = await supabase.from(table).select(columns);
  if (error) {
    console.error(`[supabase] select ${table} failed`, error);
    throw new DataError("We couldn't load this data right now.");
  }
  return (data ?? []) as T[];
}

export const kpiQuery = queryOptions({
  queryKey: ["dashboard_kpi_comparison"],
  queryFn: () => selectAll<DashboardKpiComparison>("dashboard_kpi_comparison"),
});

export const demoSettingsQuery = queryOptions({
  queryKey: ["demo_settings"],
  queryFn: () => selectAll<DemoSettings>("demo_settings"),
});

export const timeseriesQuery = queryOptions({
  queryKey: ["dashboard_metric_timeseries"],
  queryFn: () => selectAll<DashboardMetricTimeseries>("dashboard_metric_timeseries"),
});

export const releaseTimelineQuery = queryOptions({
  queryKey: ["dashboard_release_timeline"],
  queryFn: () => selectAll<DashboardReleaseTimeline>("dashboard_release_timeline"),
});

export const funnelQuery = queryOptions({
  queryKey: ["dashboard_funnel"],
  queryFn: () => selectAll<DashboardFunnel>("dashboard_funnel"),
});

export const investigationsQuery = queryOptions({
  queryKey: ["dashboard_investigations"],
  queryFn: () => selectAll<DashboardInvestigation>("dashboard_investigations"),
});

export const agentActivityQuery = queryOptions({
  queryKey: ["dashboard_agent_activity"],
  queryFn: () => selectAll<DashboardAgentActivity>("dashboard_agent_activity"),
});

export const hypothesesQuery = queryOptions({
  queryKey: ["hypotheses"],
  queryFn: () => selectAll<Hypothesis>("hypotheses"),
});

export const decisionsQuery = queryOptions({
  queryKey: ["dashboard_decisions"],
  queryFn: () => selectAll<DashboardDecision>("dashboard_decisions"),
});

export const experimentsQuery = queryOptions({
  queryKey: ["experiments"],
  queryFn: () => selectAll<Experiment>("experiments"),
});

export const experimentResultsQuery = queryOptions({
  queryKey: ["experiment_results"],
  queryFn: () => selectAll<ExperimentResult>("experiment_results"),
});

export const testScenariosQuery = queryOptions({
  queryKey: ["test_scenarios"],
  queryFn: () => selectAll<TestScenario>("test_scenarios"),
});

export const datasetRegistryQuery = queryOptions({
  queryKey: ["dataset_registry"],
  queryFn: () => selectAll<DatasetRegistry>("dataset_registry"),
});

export const eventDistributionQuery = queryOptions({
  queryKey: ["source_event_distribution"],
  queryFn: () => selectAll<SourceEventDistribution>("source_event_distribution"),
});

export const sourceDailyMetricsQuery = queryOptions({
  queryKey: ["source_daily_metrics"],
  queryFn: () => selectAll<SourceDailyMetric>("source_daily_metrics"),
});
