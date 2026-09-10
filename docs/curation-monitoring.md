# Curation monitoring — local implementation, not production deployment

The monitor reads actual Studio run reports through `/admin/recycling-intelligence/runs` using the existing admin-user JWT. Scoped report ingestion uses `/agent/recycling-curation/automation/runs/:id/report` from Studio only. Browser code never receives ADMIN_API_KEY, the automation token, storage credentials, local image paths or signed URLs. Queue monitoring requests project only display fields; old photo URLs are excluded.

The latest batch shows the first three results, complete-sentence finding summaries, date/time in Europe/Madrid, reserved/attempted/products visually reviewed/published/staged/deferred/failed counts and source split. See all opens paginated history, then full findings for the selected run with back navigation. A missing report is outcomes-unavailable, not an inferred failed or deferred batch. Zero publications is a valid completed run. Historical trial publication is not invented as a routine batch. Null historical start/end times remain unrecorded.

The old queue is explicitly labelled as primary-packaging/pending-evidence coverage. It does not pretend to include all secondary-component publications or give whole-product bin coverage. Search, filters, product details and paginated navigation remain. Legacy Process next batch, Retry, paid-AI settings and mutable classification controls are removed from this monitoring page; no worker settings are changed. The legacy export remains secondary in the overflow.

## Reload diagnosis and fix

Inspection found that the old Reload combined summary/queue with Promise.all, so either failure prevented both updates; it had no request deadline, cancellation, cache control, focus/online refresh or polling. Search could launch overlapping requests and an older response could replace a newer result. These are verified code defects; the specific production failure was not reproduced with the owner's live admin session, so Cloudflare/auth/network is not claimed as its cause.

The monitor now independently refreshes history and queue every 30 seconds while visible, and on focus/online/visibility return. Each resource admits one in-flight request, aborts after 20 seconds, cancels on filter/page change/unmount and ignores late stale responses. Successful refreshes preserve local filter/search/history/scroll state. Failed refreshes retain last good data and its timestamp, showing an explicit stale error. A small labelled refresh icon remains. Missing/expired/forbidden sessions surface real errors; no automation-key fallback. GET uses no-store and backend reads return private,no-store.

## Local verification

- Python: 69 adapter/research/reporting tests, including the previous contribution workflow.
- Backend: 54 isolated PostgreSQL/API tests, including previous photo access and atomic publication tests.
- Dashboard: 6 controller/API/history tests, TypeScript and focused ESLint checks.
- Existing mobile app readback: 8 tests.
- Browser: desktop and 390×844 viewport, actual authenticated ingestion/readback of the previously recorded 3-product Studio run, See all/detail/back, manual refresh, simulated network failure retaining results/stale notice, no horizontal overflow.
- Local preview: http://127.0.0.1:3096/curation-preview . Its development-only wrapper obtains a temporary fixture JWT from the loopback verification API, not a production credential. The page is 404 in production.
- Fixture queue rows are isolated copies used for layout verification; queue scan counts in that fixture are not production scan statistics. The batch findings/counts are from the recorded Studio run. The preview header labels this context.

Start `test/previewCurationMonitoring.cjs` in the backend worktree with the exact isolated socket and private sanitized report path (see task report), then run dashboard `WATCHPACK_POLLING=1000 NEXT_PUBLIC_API_URL=http://127.0.0.1:8096 npm run dev -- --webpack --hostname 127.0.0.1 --port 3096`. The local environment needed webpack/polling because Turbopack encountered workspace/watch and Tailwind resolution errors. No macOS limits or production settings were changed. Browser automation uses no AI chat command or paid provider.

## Deployment boundary

Not deployed. Before production: review/authorize the backend source delta and NEW migration `080_curation_run_reports.sql`; enable `CURATION_REPORTING_ENABLED` and, separately, catalogue fallback `CURATION_CATALOGUE_ENABLED`; verify with publication disabled; install the reviewed Studio adapter/report commands into the existing heartbeat; deploy this dashboard only if authorized. Do not repeat migrations 078/079 or Aromata publication. Do not deploy unrelated dirty app/backend work or overwrite newer remote changes. A new credential is not required. Full ordinary app scanning verification remains separate.

The current ACTIVE contribution routine and production publication scope are unchanged by these isolated implementation branches. Catalogue research/proposals are not yet active or persisted in live products.

Historical report integrity: the Studio adapter persists run-owned snapshots for each attempt/review and never reconstructs reports from replaceable retry/case rows. Missing legacy attempt/inspection details remain unknown and the UI displays separate unknown counts. A five-photo product contributes one product to the visual-review metric. The latest-batch freshness timestamp is cached with that first-page data, so visiting an older history page cannot make the cached latest batch appear newly refreshed.
