# Dashboard design restoration

Restored the newer local CRM design after later releases were deployed from older source snapshots.

## Production release

- Project: greenloop-dashboard / prj_V6lzNrRHdqfjQKtkeFUKmpWcFgna
- Scope: mortenbusiness1982s-projects
- Deployment: dpl_6GPZ2vVZbWZeYBriU6DYPjR4UgwE (READY)
- Dashboard: https://dashboard.greenloopapp.com
- Invitation alias: https://join.greenloopapp.com
- Release source: /private/tmp/greenloop-dashboard-restored-20260926
- Canonical working source: /Users/mortenorebodam/Documents/greenloop-dashboard

## Preserved changes

- Compact CRM shell, responsive sidebar, workspace headers, Users split view and other local design changes.
- Signup city/country, provenance, timestamp, search and CSV fields from the September 23 release.
- Invitation language handling from September 25.
- Outreach link isolation fix from origin/main a5ee99d.

The merged files were saved back into the canonical working source. The redesign remains uncommitted there; do not deploy a clean checkout or an older isolated snapshot and assume it includes this release. Reconcile and commit the working changes before subsequent Git-based releases. No source files were reverted.

## Verification

- 45 focused unit tests passed (bulk review, curation monitoring, invitations, sponsored submissions).
- Vercel production compilation, TypeScript check, and generation of 53 static pages passed.
- Local standalone type-check stalled and was stopped; production TypeScript check succeeded.
- Authenticated production overview loaded live data.
- Visually checked overview at 1440px, tablet-width default and 390px; mobile navigation opens and closes.
- Users split view and signup location fields verified live.
- Browser logs include storage-context errors also associated with an extension; exercised dashboard views still rendered and loaded data. No claim of a full browser-console clean sweep.
- No API, OTA, native build, database or production configuration changes.
