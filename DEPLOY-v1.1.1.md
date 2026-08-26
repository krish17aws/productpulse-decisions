# ProductPulse AI v1.1.1 deployment

This release is installed correctly only when the Investigations page visibly
shows `v1.1.1` above the table and the table has an **Actions** column.

## Copy into the local Git repository

Extract the ZIP directly into the local `productpulse-decisions` repository and
allow existing files to be replaced. The ZIP already contains the correct
relative folders.

Then run:

```bash
npm run build
git add package.json package-lock.json src
git commit -m "Release ProductPulse AI v1.1.1"
git push origin main
git log -1 --oneline
```

In Vercel, confirm the newest deployment uses the same commit hash printed by
`git log -1 --oneline`. Do not redeploy an older deployment.

## Required Vercel variables

Keep the existing Supabase variables and add:

```text
VITE_APP_VERSION=1.1.1
VITE_N8N_INVESTIGATION_DELETE_WEBHOOK=https://krishaws17.app.n8n.cloud/webhook/productpulse-investigation-delete
```

The delete button is deliberately disabled until the second URL points to an
active n8n production workflow. Frontend code must not directly cascade-delete
audit records from Supabase.

After changing variables, redeploy the newest commit and hard-refresh the page.

