# Dashboard workflow refresh

## Scope

Reviewed the active Admin, Brand and Partner workspaces against the workflow review in `docs/claude/dashboard-workflow-review-2026-09-14.md`. This pass continues the previously approved Overview, Users, Activity, Moderation, Challenges, Leaderboards, Rewards, Unlocks and Outreach changes.

- Compact titles, summaries and filters; fewer decorative containers.
- Full-width list/detail panes and tabbed reports instead of long stacked workspaces.
- Responsive table rows with labels on phones, wrapping controls and larger touch targets.
- Brand product search and pagination over the existing loaded catalog. Downloads still contain the full loaded catalog.
- Admin Products retains existing server filters and explicitly identifies the 500-row loaded scope.
- Admin platform reports, app analytics, maps, user/brand detail and Brand campaign reports use tabs. Mounted panes preserve form state.
- Partner history separates used and expired records. Existing fulfillment data and permissions are unchanged.
- English/Spanish labels follow the existing language setting; account and record data are not translated.
- Login inputs now have associated labels and autofill hints.
- The two map backgrounds used CARTO tiles that displayed an API-key-required watermark during live verification. They now use standard OpenStreetMap tiles with linked attribution and zoom capped at 19. Coordinates, points, filters and calculations are unchanged.

## Coverage

Admin: Overview, Users and detail, Activity, Moderation, Challenges and detail, Leaderboards, Rewards and detail, Unlocks, Outreach, Products, Recycling Intelligence, Brands and detail, Partners and detail, all report pages, both maps, Bins, Settings and Audit.

Brand: Overview, Products, Rewards, Challenges, report hub, Recycling, Campaigns, Behavior, Geo, Exports, Maps and Settings.

Partner: Overview, Rewards, Unlocks, History and Settings.

Recycling Intelligence already used compact collapsible sections and dialogs. Its source was left intact and its existing browser/unit checks were run. Unimplemented catch-all routes, configuration controls without backend support and audit persistence remain explicit future capabilities; this refresh does not invent them. Organization and public invitation flows are outside this three-role refresh and remain unchanged.

## Verification

- Production build and TypeScript compilation pass: 53 static pages plus dynamic routes.
- Focused ESLint passes for all modified TypeScript/TSX source and new shared components.
- All API call expressions in modified screens match the starting revision, checked using the TypeScript syntax tree. No API client, auth, route protection, database, backend or export contract changes.
- `workspaceRefresh.browser.test.cjs`: 37 routes at 390 and 1512 pixels in both languages, role-scoped navigation, tab/keyboard navigation, overflow checks, Brand identity privacy fixtures, product filters/search/paging, edit dialog and product loading/error/empty handling.
- Nine `admin*.browser.test.cjs` suites pass at their desktop/mobile widths: original workflows, filters, exports, certificate downloads, photos, email previews, mutations and failure safeguards. All writes were mocked; no real emails or production mutations.
- Sponsored submission tests pass (4). Their fixture was updated to stub the new presentation-only translation helper; all original assertions remain.
- Recycling Intelligence bulk and monitoring unit tests pass (37); completeness and individual-review browser suites pass on desktop/mobile using the required `127.0.0.1` preview hostname.
- Chart rendering after tab switches and final mobile map/history/bin/analytics labels were checked separately. Live Admin map was visually checked with existing session data.

## Existing limitations

- Repository-wide ESLint still has pre-existing errors in untouched Recycling Intelligence components, curation utilities and standalone test files. The changed source has no lint errors.
- Report data limits and server-side filtering behavior are unchanged. The Admin Export Center now states that its filters affect platform activity only; other downloads contain loaded records. This is not a backend report-scope repair.
- Brand/Partner regression verification uses isolated fixtures, not live customer accounts. No claim is made that every backend operation was tested against production.
- OpenStreetMap public tiles are best-effort, not an SLA-backed service. Use ordinary on-screen viewing, browser caching and visible attribution; do not add bulk/offline tile downloads. Review a managed provider if map traffic grows: https://operations.osmfoundation.org/policies/tiles/
- Previously missing backend features and unrelated business/data issues from the original audit remain outside this UI refresh.

## Deployment

Deployed on 14 September 2026 to the existing `greenloop-dashboard` Vercel project.

- Status: READY, production.
- ID: `dpl_FKeJSpf6ub2seh5uuUdoFzRuRRUK`.
- Deployment: https://greenloop-dashboard-ggk02ll7u-mortenbusiness1982s-projects.vercel.app
- Confirmed alias: https://dashboard.greenloopapp.com
- Vercel remote build passed with the same route set.
- Post-deployment: all 37 additional routes passed at 390 pixels in EN/ES against production assets with isolated API fixtures, including chart/tab rendering checks. Existing Admin session was reloaded and the new Overview visibly rendered with live data.
- Deployment-specific server error log query returned no entries. The user's Chrome session logged extension-origin storage warnings; the isolated browser suite reported no application runtime errors.
- No API deployment, production data mutation or email send was performed. Source changes remain uncommitted because this request authorized deployment, not a commit.
