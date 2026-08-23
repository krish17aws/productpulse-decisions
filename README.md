# ProductPulse Decisions

Build a responsive enterprise SaaS dashboard named “ProductPulse AI — Autonomous Product Decision Room”.

IMPORTANT BACKEND RULES:

- This project is already connected to an existing external Supabase project.

- Use the existing Supabase tables and views.

- Do not create, rename, delete or modify database tables, columns, views, functions, triggers or RLS policies.

- Do not generate placeholder business data.

- Do not use Lovable Cloud as a separate database.

- Never use a Supabase service-role key in frontend code.

- Add loading, empty and error states for every Supabase query.

- Use TypeScript types for Supabase responses.

PRODUCT PURPOSE:

ProductPulse AI detects product metric anomalies using deterministic rules, launches parallel AI investigation agents through n8n, synthesises root-cause hypotheses, recommends product actions, requires human PM approval and monitors experiment outcomes.

DESIGN:

- Professional enterprise product analytics dashboard

- Dark navy sidebar and light content area

- Clean, modern and recruiter-ready

- Desktop-first and responsive

- Use cards, charts, tables, status badges, timelines and detail drawers

- Avoid excessive gradients

- Clearly label synthetic and public data

- Preserve distinction between deterministic detection and AI reasoning

AUTHENTICATION:

- Implement email/password login using the connected Supabase Auth project.

- Redirect unauthenticated users to /login.

- Add logout in the sidebar.

- Do not create custom user-profile tables.

SIDEBAR:

1. Command Center

2. Metrics

3. Investigations

4. Agent Decision Room

5. Recommendations

6. Experiments

7. Scenario Lab

8. Data Sources

9. Settings

COMMAND CENTER:

Read live KPI values from:

public.dashboard_kpi_comparison

Fields:

- metric_name

- current_value

- baseline_value

- absolute_change

- relative_change_percent

- unit

- observed_at

Display:

- checkout_conversion

- payment_success

- revenue_run_rate

- gross_margin

- complaint_count

- payment_timeout_rate

Read the active scenario from:

public.demo_settings

Use:

- active_scenario_id

- active_test_run_id

- scenario_activated_at

- updated_at

Read chart data from:

public.dashboard_metric_timeseries

Read recent releases from:

public.dashboard_release_timeline

Read the funnel from:

public.dashboard_funnel

INVESTIGATIONS:

Read investigations from:

public.dashboard_investigations

Provide:

- Search

- Severity filter

- Status filter

- Investigation detail drawer

- Real UUIDs

- Scenario

- Severity

- Status

- Detected time

- Agent finding count

AGENT DECISION ROOM:

Read agent results from:

public.dashboard_agent_activity

Show:

- agent_name

- status

- finding_summary

- confidence

- input_record_count

- started_at

- completed_at

Also read structured hypotheses from:

public.hypotheses

Important architecture wording:

“Deterministic signal detection launches three parallel investigation agents, followed by root-cause synthesis and independent risk review.”

Do not state that all six agents run in parallel.

RECOMMENDATIONS:

Read from:

public.dashboard_decisions

Display:

- Recommendation

- Rationale

- Expected impact

- Risks

- Guardrails

- Confidence

- Approval state

- Experiment state

Include:

- Approve

- Reject

- Request Changes

Require a comment before rejection.

Do not connect these buttons directly to the database yet.

Create action-handler placeholders named:

- approveRecommendation

- rejectRecommendation

- requestRecommendationChanges

EXPERIMENTS:

Read from:

public.experiments

public.experiment_results

Show:

- Experiment status

- Control versus treatment results

- Success criteria

- Guardrails

- Final outcome

- Recommendation relationship

SCENARIO LAB:

Read scenario definitions from:

public.test_scenarios

Show:

- Healthy Baseline

- UPI Routing Failure

- Search Improvement

- Gateway Outage

- Mandatory Login

- Coupon Stacking

Read the active scenario from:

public.demo_settings

Create buttons for Activate and Reset, but do not write directly to Supabase.

Create action-handler placeholders named:

- activateScenario

- resetScenario

These handlers will later call n8n production webhooks.

DATA SOURCES:

Read source information from:

public.dataset_registry

public.source_event_distribution

public.source_daily_metrics

Clearly identify:

- Google Merchandise Store GA4 as public data

- Releases as synthetic data

- Payment telemetry as synthetic data

- Customer feedback as synthetic data

Use the real imported Google event count. Do not display invented values such as 4.2 million events.

ERROR HANDLING:

- Show skeleton loading states.

- Show a useful empty state when no investigation or recommendation exists.

- Show a non-technical error message when Supabase queries fail.

- Log technical errors only to the browser console.

- Never silently fall back to placeholder data.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4bb96d15-bc57-4e08-98ed-5c267c13cf6e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
