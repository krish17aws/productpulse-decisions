/**
 * Hand-written TypeScript shapes for the existing external Supabase
 * tables and views. Read-only — this project never modifies schema.
 */

export interface DashboardKpiComparison {
  metric_name: string;
  current_value: number | null;
  baseline_value: number | null;
  absolute_change: number | null;
  relative_change_percent: number | null;
  unit: string | null;
  observed_at: string | null;
}

export interface DemoSettings {
  active_scenario_id: string | null;
  active_test_run_id: string | null;
  scenario_activated_at: string | null;
  updated_at: string | null;
}

export interface DashboardMetricTimeseries {
  metric_name?: string | null;
  observed_at?: string | null;
  metric_value?: number | null;
  [key: string]: unknown;
}

export interface DashboardReleaseTimeline {
  release_name?: string | null;
  released_at?: string | null;
  description?: string | null;
  [key: string]: unknown;
}

export interface DashboardFunnel {
  stage_name?: string | null;
  stage_order?: number | null;
  user_count?: number | null;
  [key: string]: unknown;
}

export interface DashboardInvestigation {
  id: string;
  scenario_name?: string | null;
  scenario_id?: string | null;
  severity?: string | null;
  status?: string | null;
  detected_at?: string | null;
  title?: string | null;
  summary?: string | null;
  agent_finding_count?: number | null;
  [key: string]: unknown;
}

export interface DashboardAgentActivity {
  id?: string | null;
  investigation_id?: string | null;
  agent_name?: string | null;
  status?: string | null;
  finding_summary?: string | null;
  confidence?: number | null;
  input_record_count?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  [key: string]: unknown;
}

export interface Hypothesis {
  id: string;
  investigation_id?: string | null;
  hypothesis?: string | null;
  description?: string | null;
  confidence?: number | null;
  status?: string | null;
  is_primary?: boolean | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface DashboardDecision {
  id: string;
  investigation_id?: string | null;
  recommendation?: string | null;
  rationale?: string | null;
  expected_impact?: string | null;
  risks?: string | null;
  guardrails?: string | null;
  confidence?: number | null;
  approval_state?: string | null;
  experiment_state?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface Experiment {
  id: string;
  name?: string | null;
  status?: string | null;
  recommendation_id?: string | null;
  success_criterion?: string | null;
  guardrail_metrics?: unknown;
  started_at?: string | null;
  completed_at?: string | null;
  [key: string]: unknown;
}

export interface ExperimentResult {
  experiment_id?: string | null;
  metric_name?: string | null;
  control_value?: number | null;
  treatment_value?: number | null;
  relative_uplift?: number | null;
  sample_size_control?: number | null;
  sample_size_treatment?: number | null;
  guardrail_breached?: boolean | null;
  observed_at?: string | null;
  [key: string]: unknown;
}

export interface AgentFinding {
  investigation_id?: string | null;
  agent_name?: string | null;
  finding_summary?: string | null;
  confidence?: number | null;
  completed_at?: string | null;
  [key: string]: unknown;
}

export interface TestScenario {
  id: string;
  scenario_name?: string | null;
  name?: string | null;
  description?: string | null;
  category?: string | null;
  expected_outcome?: string | null;
  [key: string]: unknown;
}

export interface DatasetRegistry {
  dataset_name?: string | null;
  source_type?: string | null;
  description?: string | null;
  record_count?: number | null;
  [key: string]: unknown;
}

export interface SourceEventDistribution {
  event_name?: string | null;
  event_count?: number | null;
  [key: string]: unknown;
}

export interface SourceDailyMetric {
  event_date?: string | null;
  event_count?: number | null;
  [key: string]: unknown;
}
