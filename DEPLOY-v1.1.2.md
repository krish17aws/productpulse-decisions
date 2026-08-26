# ProductPulse AI v1.1.2

## Visible checks

- Sidebar and Investigations release check show `v1.1.2`.
- Recommendations has `Pending decisions` and `Decision history` views.
- Agent Decision Room explains whether PP-03 has not completed or completed
  without saving hypotheses.
- Investigations has an Actions column with a visible deletion state.

## Local version override

If the UI still shows an older version, update the local `.env` entry:

```text
VITE_APP_VERSION=1.1.2
```

Stop and restart `npm run dev` after editing `.env`; Vite reads environment
variables only when the dev server starts.

## Backend requirements

Hypotheses and recommendations are created by PP-03. When both are missing for
one investigation, open n8n, locate PP-03 for that investigation ID, resolve
the Gemini/JSON error, and retry that failed execution once.

Permanent investigation deletion requires an active n8n workflow at the URL
configured by `VITE_N8N_INVESTIGATION_DELETE_WEBHOOK`. The frontend deliberately
does not perform cascading audit-data deletion directly.

