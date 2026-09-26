# GreenLoop Dashboard — Workflow Review and Interaction Design (Step 2)

Date: 14 September 2026 · Stage 2: independent review and design only · Reviewer: Claude · Next: Codex reconciles against the repository and implements only the approved scope.

Nothing in any repository was edited, created, committed, built, deployed or sent as part of this review. No production record was touched. No `.env`, credential or backup file was opened.

---

## 0. Baseline and method

| Item | Value |
|---|---|
| Dashboard revision reviewed | `d8f4445b370ef8e50067ab9d7cf734dfd741e9a9` (12 Sep 2026, "Collapse contributions and show latest saved product improvements") |
| Checkout used | `/Users/mortenorebodam/Documents/greenloop-dashboard`, branch `main`, clean, **equal to `origin/main` and `origin/HEAD`** at review time (`git ls-remote`) |
| Other checkouts | `/private/tmp/greenloop-photo-dashboard` still exists at the same commit (branch `photo-progress-20260912`). `/Users/mortenorebodam/greenloop-dashboard` is **still behind at `d58dda2`** (31 Aug). Codex must not implement in that checkout without fast-forwarding it first. The dashboard's own `CLAUDE.md` names `~/greenloop-dashboard` as "the repo"; that sentence is stale. |
| API sampled | `/Users/mortenorebodam/Documents/greenloop/greenloop-api` @ `9aa8390f…` (matches the audit), read-only, only for query-param and response-shape contracts cited below |
| How claims were checked | Every finding F01–F20 was re-verified at the current revision by reading the cited files in full; the shell, language provider and API client were read first-hand. Line numbers in this document are **current** and will drift after edits. |
| What was not done | No authenticated browser session in any role. No mutation, download, PDF/XLSX render or email send. Brand, Partner and Organization reviewed in source only, as the audit warns. No lint/build/test run. |

Repo instructions honoured (dashboard `CLAUDE.md`): inspect → identify UI vs logic → propose → wait → smallest file set → preserve handlers/fetching/role checks → never delete "unused" code → focused `npx tsc --noEmit` → summarise; `lib/api.ts`, `lib/auth.ts`, `(dashboard)/layout.tsx` and `CrmShell` are not visual-pass targets; no new dependencies; Claude-authored docs go to `docs/claude/`. Two statements in that file are stale and Codex should not rely on them: the token table (`app/globals.css:34-74` already carries the full mobile palette — `--gl-green #15785A`, cream/ink/amber/coral scales, hairlines, `--gl-green-ring` — so the "brand alignment open question" is resolved in code) and the repository path.

Categories used for every proposal, as the brief requires:

- **A** Presentation/layout only: classes, order of existing elements, copy in both languages, ARIA attributes, disabled states driven by existing state.
- **B** Frontend navigation or state handling: URL query state, pane switching, focus management, unsaved-change guards, dialog mechanics, per-record feedback slots, reading a field the API already returns.
- **C** Data loading: debouncing, aborting, retaining data during refresh, isolating section errors, fetching less, client-side pagination that changes *when* rows render. **Requires explicit review.**
- **D** Backend support or altered business behaviour: new params/endpoints, changed export scope, changed calculations, changed gates. **Never folded into the refresh; listed separately in §9.**

Severity: **High** blocks or misleads common work; **Medium** recurring friction; **Low** refinement.

---

## 1. Executive assessment

1. **The audit is accurate and, if anything, understated.** Nineteen of twenty findings are confirmed at the current revision; F18 is confirmed for coupling but the failure mode is "zeros plus a banner", not a blank page (Brand Products is the exception that does blank). Several findings are worse than written: Activity refetches and **unmounts the form on every keystroke** (F10); Outreach discards pending edits on every keystroke in the search or campaign box (F09); the Export Center filter bar sits above four exports that ignore it and two exports that are silently capped (F04); the brand date filter never reaches the events feed at all (F04, brand side).
2. **The shell is sound; the workspaces embed a second surface inside the list.** Users, Rewards, Challenges and Outreach each render a list *and* an always-mounted editor/aside in one page with local-only state. The remedy is one shape applied four times: list-first at full width; a record surface (route detail or in-page pane); small forms in native dialogs; URL-carried list context; a dirty guard. This is not a rebuild — it is a re-homing of existing JSX and handlers.
3. **Five defects the audit did not list should be treated as High** because they mislead operators or defeat a safeguard: Outreach reports a failed Resend delivery as "sent" (the API answers HTTP 200 with `ok:false`); Moderation hides pending events that have no `https://` image, so they can never be moderated; Challenges renders validation/save errors *behind* the edit modal; Users offers Deactivate as the primary green button with no confirmation and lets the role field be set to `admin` without confirmation; the Brand events JSON carries a raw user UUID under the name `anonymized_user_id` (a privacy boundary Codex must not widen).
4. **Recycling Intelligence already contains the target patterns** — native `<dialog>` + `showModal()` with `aria-labelledby` and opener-focus restore, collapsible `<details>` sections with counts, cursor/offset paging with disabled buttons while refreshing, 300 ms debounced search, `aria-live` freshness, `Intl.DateTimeFormat` with an explicit time zone, and a refresh controller that retains data on failure. The shared primitives proposed in §3 are extractions of those patterns, not a new design system.
5. **Most of the value is Category A/B.** The Category C items that matter (debounce filters, keep previous rows during refresh, abort stale requests, stop fetching the whole user base to fill a dropdown) are small but change loading behaviour and need their own review. Category D items (API sentinel date, brand event date filtering, hashed brand ids, server pagination, complete exports, admin preview of ongoing certificates, partner redeem action) are collected in §9 and are not prerequisites for the interface work.
6. **Recommended order:** shell + shared primitives → Outreach → Users → Challenges/Certificates → Rewards/Unlocks/Network context links → Activity + Moderation → Brand Products + Reports scope labels → consistency (i18n, tokens, placeholders). The smallest safe first batch is a single-file Outreach pass (§8).

---

## 2. Review of findings F01–F20

### 2.1 Verdicts and revised priority

| ID | Audit claim (short) | Verdict at `d8f4445` | Current evidence | Revised priority | Category of fix |
|---|---|---|---|---|---|
| F01 | Tables and editors compete for space | **Confirmed** (structure); pixel figures not derivable from source | Users `lg:grid-cols-[1.5fr_1fr]` + table `min-w-[1120px]` (`users/page.tsx:740-742`); Rewards/Challenges `xl:grid-cols-[minmax(0,1fr)_420px]` inside `max-w-7xl` with tables `min-w-[980px]`/`min-w-[1180px]` (`AdminRewardsWorkspace.tsx:448,467`; `AdminChallengesWorkspace.tsx:1775,1792`) → the 1fr column never exceeds ≈836 px, so sideways scroll is unconditional; Users' Email column is 11th, after Actions (`:755`) | **High** | A/B |
| F02 | Brand products beyond 20 unreachable | **Confirmed** | `BrandProductsWorkspace.tsx:492,552,575-579`; API returns the whole catalogue with no LIMIT and already accepts unused `q`/`status` (`brand.ts:818-873, 829-843`) | **High** | B (client search/pager); C if `q`/`status` are wired |
| F03 | Activity rows buried under summaries | **Confirmed**; "raw ISO" true for the daily list and CSV, not the table | `activity/page.tsx:363-460` order; `day.date` raw at `:379`; table uses `toLocaleString()` (`:56-61`) | **High** | A/B |
| F04 | Filters and exports do not share one scope | **Confirmed and understated** | Admin: only `/admin/reports/platform` receives from/to/city (`AdminReportsWorkspace.tsx:338-349`); filter bar rendered for `platform|geo|exports` (`:502-519`) above four exports that ignore it; Products export capped 500, Unlocks 1000 server-side. Brand: `GET /brand/reports/events` never reads `req.query` and returns the newest 1000 rows (`brand.ts:184-225`) so every events-derived KPI/chart/table/map ignores From/To; campaigns/behaviour default to 30 days; redemptions are all-time; city is client-side over events only (`BrandCrmWorkspaces.tsx:522-530`) | **High** | A (scope labels) now; D for real scoping |
| F05 | Activity CSV = returned rows, not full dataset | **Confirmed** | ≤500 **item lines** (`admin.ts:3153,3165,3173`), event `points_issued` repeated per line (`:3163`); CSV columns and "Unknown …" fallbacks `activity/page.tsx:127-150`; filename says `all` when unfiltered (`:168-171`); Maps sets `events=all` at `AdminMapsWorkspace.tsx:78` | **High** | A (truthful labels); D (complete exports) |
| F06 | Cross-module links drop context | **Confirmed** | Links `AdminNetworkWorkspaces.tsx:274-276,496`; destinations never read the query (`:296`; `AdminRewardUnlocksWorkspace.tsx:192-195`); only `useSearchParams` in the app is `app/organization/invite/page.tsx:10`; API honours `brandId`/`partnerId` (`admin.ts:1403,3609`) | **High** | B |
| F07 | Outreach actions far below the proposal | **Confirmed** (order and mechanism; pixel figures plausible) | Editor order `AdminOutreachWorkspace.tsx:1781-1988`: PDF panel `:1854-1886`, action bar `:1961-1988`; bulk bar is in the top KPI section `:1500-1550`; pane split is at `xl` (1280), not `lg` | **High** | A/B |
| F08 | Sent-archive selection does not set mobile pane | **Confirmed in source** (runtime not exercised) | `:2028-2033` omits `setMobilePane("editor")` and the scroll that `selectEmailForReview` (`:1079-1088`) performs | **High** | B (one call) |
| F09 | Selection/filters/tabs are temporary local state; no unsaved guard | **Confirmed; raise** | No `useSearchParams` in any workspace; no `beforeunload`/dirty tracking anywhere. Outreach rebuilds `form` whenever `selected` changes (`:1017-1021`) and refetches on every search/campaign keystroke (`:981-985`); Users resets `editForm`, both EcoPoints inputs and `manualPassword` on every activity load (`users/page.tsx:324-331`); Challenges re-seeds notes/drafts on every `loadData` (`:552-571`); Rewards `startEdit` overwrites silently (`:252-290`) | **High** (was Medium) | B (+ C for debounce) |
| F10 | Activity auto + explicit filter application | **Confirmed; stronger** | Effect depends on `filters` (`activity/page.tsx:119-124`) → fetch per keystroke; loading gate unmounts the whole page incl. the form (`:231-237`); Reset double-fetches (`:112`); no abort | **High** (was Medium) | B (draft/apply) + C (retain rows) |
| F11 | Certificate management is a long repeated form list | **Confirmed** | 16 expanded `<article>`s (`AdminChallengesWorkspace.tsx:1544-1772`), no collapse/filter; six download buttons per card | **Medium** | A/B |
| F12 | Requests tab naming/counts ambiguous | **Confirmed** | Badge = pending only (`:639`); default status filter `all` (`:492`); sponsored list has no status filter and lists every `review_status` with the same three buttons (`:1275-1346`) | **Medium** | A/B |
| F13 | Moderation shortcut targeting + partial-failure feedback | **Confirmed** | Window-level `a`/`r` act on `filteredEvents[0]` = newest pending, no hint, no confirm (`moderation/page.tsx:502-525`); bulk confirms only when `ids.length > 1`, swallows per-item errors, keeps only the last, removes failed ids from selection (`:474-486`) | **High** | B (needs its own review, as the audit says) |
| F14 | Missing activity shown as 1970 | **Confirmed; root cause is the API** | `admin.ts:1592-1595` `COALESCE(…, to_timestamp(0))`; normaliser passes it through (`:940`); dashboard `formatDateTime` guards only null (`users/page.tsx:122-127`); CSV writes the sentinel (`:586`); "Last activity to" filter includes never-active users (`:289`) | **Medium** | A (display) now; D (API null) |
| F15 | EN/ES incomplete | **Confirmed** | 13 files consume the provider; **15 client components do not**, including Users, Activity, Moderation, Maps, Rewards, all detail pages, Sponsored form, Partner, Organization, Invitation tools; `pathSegmentLabels` lacks `leaderboards/bins/audit/geo/recycling-heatmap` | **Medium** | A |
| F16 | Two `aria-current="page"` | **Confirmed** | `CrmShell.tsx:326-329` prefix match; `:507` | **Low** | B (one function) |
| F17 | Overlay/clickable-row accessibility | **Confirmed** | Div-layer overlays without `role="dialog"`/Escape/focus: Outreach archive (`:1993-2051`), Challenges editor (Escape+backdrop present, no focus trap; window Escape fires inside the AI-prompt textarea), Brand Products `ModalShell` (`:751-759`), shell drawer (`CrmShell.tsx:534-543`); native `<dialog>` exists in `CurationReviewDialog.tsx:95` and `BulkProductReview.tsx:32`; Challenges rows nest a Link + 4 buttons inside `role="button"` (`:1816-1890`) | **Medium** | B |
| F18 | Coupled loading fails together | **Partly** | Overview 7-way `Promise.all` incl. full `/admin/users` (`AdminOverviewWorkspace.tsx:300-308`) → zeros under a banner, not blank; Reports 2–6-way per `kind`, re-issued per City keystroke (250 ms); Brand six-way for every kind incl. settings/exports, re-fetched on language toggle (`BrandCrmWorkspaces.tsx:493-520`); Brand Products **does** replace the workspace (`:496-506`); Outreach list request blanks both panes on every fetch (`:956,965,1664`) | **Medium** | C |
| F19 | Placeholders overstate capabilities | **Confirmed** | `CrmPlaceholderPage.tsx:15-112` marks 11 live modules "planned", links to `/admin`; server component, English, slate/emerald palette; Settings/Audit static (`AdminSystemWorkspaces.tsx:325,348`); Bins real but reachable by URL only; Partner has no redeem action (API has only two GETs, `partner.ts:72-115`; redeem lives at `POST /rewards/consume`) | **Medium** | A |
| F20 | Repeated actions/summaries | **Confirmed** | Users two links to `/admin/activity` (`:640-651`); Activity two identical export triggers (`:352-359,410-417`); Overview hero repeats 5 of 10 KPIs and links Activity three times; Brand 8-tile band on eight kinds (`:650-661`) | **Low/Medium** | A |

### 2.2 Findings the audit missed (new IDs M01–M22)

| ID | Finding | Evidence | Severity | Category |
|---|---|---|---|---|
| M01 | **Outreach reports a failed delivery as sent.** `/send` returns HTTP 200 `{ok:false, email:{status:"failed"}}` when Resend rejects; `sendReal`, `sendTest` and bulk never read `ok`/`email.status` and show "sent"/count success; a `failed` record needs re-approval before `/send` accepts it again | `admin.ts:5467`; `outreachEmail.ts:190-204`; `AdminOutreachWorkspace.tsx:1378-1383,1355-1360,1424-1429` | **High** | B (read an existing response field) |
| M02 | Outreach row quick-Approve is not gated on `action` and its `finally` clears the single `action` slot mid-bulk-send, re-enabling every gated button | `:1171-1190,1728-1737` | Medium | B |
| M03 | A failed test send leaves an approved copy addressed to the test inbox that "Select all ready" later includes | `:1343-1360` | Medium | C (reload on failure) |
| M04 | Outreach hidden multi-selection can be bulk-sent: `selectedSendIds` is not cleared on status-pill change; auto-selection after load ignores the active pill; Disregarded pill counts `skipped` rows it never lists | `:1023-1025,972-975,1495,1559` vs `:871` | Medium | B |
| M05 | Outreach result banners render above the grid with no live region; at 390 px they are ≈2,000 px above the action bar | `:1630-1639` | High (mobile) | A |
| M06 | **Users: Deactivate has no confirmation and is the primary green CTA; Save Changes accepts role `admin` with no confirm/validation; every successful action wipes in-progress edits** | `users/page.tsx:846-856,489-517,1115,324-331` | **High** (safeguard) | A/B |
| M07 | Users: no `AbortSignal` → rapid row clicks leave the aside showing a different user than the highlighted row | `:305-338,769` | Medium | C |
| M08 | **Challenges: submit/validation errors render beneath the `z-40` backdrop while the modal stays open** | `AdminChallengesWorkspace.tsx:1222` vs `:1904,1912` | **High** | A/B |
| M09 | Challenges: certificate preview/PDF/XLSX buttons render on every card although the API returns 409 until the shared goal is met (admins get no bypass) and 404 when disabled; preview/PDF silently force `certificateEnabled=true`; XLSX on a disabled certificate returns "Challenge not found" | `impactAccess.ts:13-31`; `impact.ts:205-206,244-245`; ACW `:939,994,1024,1709-1748` | Medium | A copy + B disabled-with-reason; D for admin bypass |
| M10 | Challenges/Rewards/Org: every `loadData` re-seeds notes/drafts and blanks lists; image actions PATCH immediately outside the form transaction and Close does not revert | ACW `:552-571,1269,1392,1810,694-708`; ARW `:482,598-631`; OCW `:237-238` | High | B/C |
| M11 | **Moderation hides any event lacking an `https://` image on every tab** — legacy `file://` or no-media pending events can never be moderated here and the "pending in view" count under-reports; `/admin/events` is an unbounded full-history dump loaded on mount | `moderation/page.tsx:411-418,603`; `admin.ts:5069-5111` | **High** | A (disclose count) now; B for listing them (needs review under preservation item 8) |
| M12 | Every consumer of `platform.events` prints per-item rows carrying the whole event's `points_issued`; summing an exported `ecopoints` column over-counts; "Units" is always 1 | `admin.ts:3153,3163`; Activity/Reports/Overview/Maps tables and CSVs | Medium | A (labels) ; D (event-level export) |
| M13 | **Brand: `GET /brand/reports/events` ignores From/To and caps at the newest 1000 rows; the page shows three different windows (events all-time-1000, campaigns/behaviour 30-day default, redemptions all-time) under one filter bar labelled "across the selected period"** | `brand.ts:184-225,490-494,660-664`; `BrandCrmWorkspaces.tsx:188,332,495-498,650-661` | **High** | A (scope labels); D (API) |
| M14 | **Brand JSON carries the raw `users.id` UUID as `anonymized_user_id` and full-precision lat/lng**, unlike the hashed/rounded exports; the UI never renders it, but any shared table would | `brand.ts:201-204` vs `:776-779`; `services/brandReports.ts:285,299-300,337` | High (boundary) | D — UI rule: never render it |
| M15 | Brand Products: Mark-verified/Delete errors render only inside the closed product modal; import Cancel and "Uploading…" not disabled mid-upload; wrapper double-gates on `/brand/meta` before products | `BrandProductsWorkspace.tsx:664-668,620-629`; `brand/products/page.tsx:34,69-75` | Medium | A/B |
| M16 | Sponsored form: delete has no confirm and no try/catch (409 → unhandled rejection, no feedback); initial load errors swallowed → false "No sponsored challenges yet."; two different "campaign" sets on one page (sponsored by `sponsor_brand_id` vs campaigns by `brand_key ≈ name`) | `SponsoredChallengeManager.tsx:27-33,78-82,116`; `brand.ts:503-509,1209` | Medium | B / A |
| M17 | Silent truncation with no notice: Reports tables 200, Maps 100/15, Overview 8/5, Outreach 250, Unlocks 1000, `SimpleTable` 200 | `AdminReportsWorkspace.tsx:688,729`; `AdminMapsWorkspace.tsx:212,239`; `AdminDetailWorkspaces.tsx:539`; `admin.ts:5280,3682` | Medium | A |
| M18 | Overview/Brand detail download the full user list to count rows; Products workspace re-fetches `/admin/brands` on every keystroke; Maps re-downloads every item line per City keystroke | `AdminOverviewWorkspace.tsx:302,333-337`; `AdminDetailWorkspaces.tsx:177-182`; `AdminNetworkWorkspaces.tsx:311-314`; `AdminMapsWorkspace.tsx:74-91` | Medium | C |
| M19 | Shell: language provider initialises from `localStorage` inside `useState` → SSR/CSR text mismatch when `es` is stored; drawer has no Escape/focus trap/restore; `[...crm]` catch-all renders a placeholder for any typo instead of a 404 | `DashboardLanguage.tsx:21-28`; `CrmShell.tsx:534-543`; `admin/[...crm]/page.tsx:9` | Low/Medium | B / A |
| M20 | Unlocks CSV exports emails, tokens and promo codes with no confirmation; Partner tables display raw redeem tokens | `AdminRewardUnlocksWorkspace.tsx:245-286`; `PartnerCrmWorkspace.tsx:214-215` | Medium | B (confirm) ; design note for partner |
| M21 | Activity filter option lists are derived from the current ≤500 result rows, so alternatives vanish once a filter is applied | `activity/page.tsx:185-222` | Medium | A (label) ; D (lookup) |
| M22 | No `test` script, no CI, Playwright not a declared dependency; the only tests cover the email preview, the sponsored form and Recycling Intelligence libs | `package.json:5-10`; `tests/`, `test/` | Medium | process |

### 2.3 Revised priority order (what to fix first)

1. **Safeguard-adjacent, cheap:** M01 (delivery failure shown as success), M06 (Deactivate confirm, role confirm), M08 (hidden validation errors), F08 (archive → editor), M05 (banner placement).
2. **Primary-flow friction:** F07/F01 list-first + record surface (Outreach, Users, Challenges, Rewards); F09/F10/M10 (keystroke refetch, edits lost, page unmount); F06 (context links); F02 (products reachability).
3. **Truthfulness:** F04/F05/M12/M13/M17/M21 scope labels and counts; F14 display; F12 badge/default filter; M09 certificate gating copy.
4. **Moderation:** F13 + M11 as their own reviewed change.
5. **Consistency:** F15 (touched surfaces first), F16/M19 shell, F17 dialogs, F19 placeholders, F20 duplicates, M22 tests.

---

## 3. Shared interaction model (the contract Codex implements everywhere)

The model reuses mechanisms already in the codebase and adds at most four small shared files under `components/crm/` and `lib/`, each introduced in the phase that first needs it. No new dependency.

### 3.1 Navigation, page header and breadcrumbs

Current state (`components/crm/CrmShell.tsx`): static 18-rem sidebar at `lg`+ (`:530-533`); drawer with a backdrop button below `lg` (`:534-543`); non-collapsible groups (`:480-523`); header wayfinding is `formatPath()` — pathname split on `/` with per-segment labels, rendered as one capitalised `<p>` with no links and raw ids (`:386-392,559-561`); prefix `isActive()` (`:326-329`) marks parent and child active (F16). No decorative controls exist, so nothing needs removing.

Rules:
- **One current page.** `aria-current="page"` and the accent bar go to the *longest* matching `href`; a parent whose child is active keeps the soft tint only. (B, one function.)
- **Breadcrumb = path label made navigable.** Same `formatPath()` labels, rendered in `<nav aria-label="breadcrumb">`: every segment except the last is a `<Link>` when its prefix is a real route; a dynamic id segment shows the record's display name once the page provides it (via a tiny context `setBreadcrumbLabel(id, name)` exposed by the shell) and the id until then. Add the five missing ES segment labels. (A/B, `CrmShell.tsx` only — an explicit "chrome" change to approve.)
- **Return-to-list = breadcrumb parent + preserved list query.** Detail routes receive `?from=<encoded list query>`; the parent crumb and every "Back to list" link use it. Only filter/sort/page/tab tokens are ever placed in the URL — never tokens, passwords, emails bodies or notes.
- **In-page selections** (Outreach, Moderation, Recycling Intelligence) treat "Back"/"Close" as clearing the selection, not `router.back()`.
- **Secondary destinations** (Settings, Audit, Bins) are not added to the sidebar until they render real controls (F19).

### 3.2 Lists: search, filters, sorting, pagination, counts

- **Full width first**: title row (title · result count · one primary action) → filter toolbar → list → pager. No always-visible editor beside a list.
- **Toolbar**: search input (labelled), up to four selects, "More filters" disclosure (`<details>`) for the rest; date ranges live in "More filters" unless the page is a report.
- **Apply model is declared per page.** Client-side filters over an already-returned collection apply instantly (Users, Rewards, Challenges, Brand Products, Outreach audience/status). Server-side filters use *draft + Apply + Reset* (Activity, Reports, Maps, Unlocks search) and, while a request runs, keep the previous rows with an "Updating…" `role="status"` marker. Toolbar copy states which model applies.
- **Counts are truthful**: `N shown · M returned`, plus `returned rows are limited to M` whenever the endpoint caps (Outreach 250, Platform 500, Products 500, Unlocks 1000). Never display a total the client cannot know.
- **Pagination is client-side** over returned rows (25/50/100) wherever the whole collection is already in memory. Server pagination is a D item.
- **Sorting** only on columns whose values are already in the row objects; sort key/direction in the URL.
- **Row affordance**: one explicit "Open" control per row; a clickable row only when it also contains a focusable element; row-level actions beyond Open live in an overflow menu (a `<details>` popover on desktop, a bottom-sheet `<dialog>` on phones). Never nest links/buttons inside a `role="button"` row.
- **URL state** (`q`, `status`, `tab`, `page`, `sort`, `dir`, selected id) via `router.replace` for filters and `router.push` when opening a record. Consumers of `useSearchParams` must be wrapped in `<Suspense>` exactly as `app/organization/invite/page.tsx:3,8` does.

### 3.3 Opening a record and returning

| Shape | Modules | Rule |
|---|---|---|
| **Route detail** `/admin/<module>/[id]` | Users, Rewards, Challenges, Brands, Partners | The only place that renders the full record. Header = breadcrumb · name · status · contextual actions. Below `lg` it *is* the detail pane. Opening pushes `?from=`; Back restores list state. |
| **In-page split** | Outreach, Moderation, Recycling Intelligence | Full-width list until a record is selected; then `[minmax(320px,2fr)_3fr]` at `xl`+ with the selected row tinted and list scroll kept; Escape/Close returns to full width. Below `xl` (Outreach) or `lg` (others) exactly one pane is visible; the record pane has a sticky top bar (Back · title · status) and a sticky bottom action bar. |
| **Dialog** | Confirmations, quick edits ≤ 6 fields, previews, certificate work area on phones | Native `<dialog>` + `showModal()`, `aria-labelledby`, opener focus restore, Escape guarded while busy, backdrop click closes only when not dirty — the `CurationReviewDialog.tsx:95` / `BulkProductReview.tsx:32` / `AdminRecyclingIntelligenceWorkspace.tsx:219-220,637` pattern extracted into `components/crm/RecordDialog.tsx`. |

Rule of thumb: > 6 editable fields or > 3 actions → route detail or split pane, never a dialog.

### 3.4 Editing, saving, cancelling, unsaved changes

- Modes are explicit: View → Edit → View. Create is Edit on a new record opened from the list's primary action; never an always-visible form.
- Essential fields first; advanced groups as named `<details>` sections (Rewards already has `FormSection`s).
- Sticky action bar (bottom of the detail column on desktop; bottom of the viewport on phones): Cancel · secondary · **Save**. The pane gets bottom padding equal to the bar so nothing is covered.
- States: idle → saving (button disabled + spinner; inputs stay enabled) → saved (inline `role="status"` chip, 4 s) or error (inline `role="alert"` above the bar; **values preserved**). `apiFetch` errors carry only `message` and `status` (`lib/api.ts:70`); the UI shows that message and must not pretend to know the field.
- **Unsaved-change guard** (`lib/useUnsavedChanges.ts`): `dirty` = shallow compare of draft vs loaded record; guards record switch, Close, breadcrumb/Back, tab change, list refetch, and registers `beforeunload`. Uses the native `window.confirm` already used in eight files. Applied only to genuinely editable state.
- **Double-submit protection**: every mutating button is `disabled` while its request is in flight and its handler returns early if busy.

### 3.5 Contextual actions and destructive confirmations

- Primary action in the title row (lists) or the sticky bar (records); contextual record actions in the record header/bar; rare or destructive actions in the overflow.
- **Visibility and enabled rules do not change.** Every action renders exactly under the condition the current code gates it. The design moves it and changes emphasis; it never adds an enabled control the API would reject.
- Destructive actions keep the existing confirmation text and requirements; where none exists today and the action is irreversible or a safeguard (Deactivate, role change to admin, sponsored Reject/Pause, invitation-link revoke, sponsored campaign delete, unlock CSV with emails/tokens), add a `window.confirm` in both languages. Bulk actions state count and scope and show progress plus a per-item result summary.
- Success and error feedback render next to the action (`role="status"`/`role="alert"`), never only at the top of a long page.

### 3.6 Mobile list/detail navigation

- Breakpoints stay Tailwind defaults (`lg` 1024 for the shell; Outreach keeps `xl` 1280 for its split).
- One surface at a time below the split; record surface = sticky top bar + scrollable body + sticky bottom bar with ≤ 2 visible buttons + overflow. Back restores list scroll (store `scrollTop` in a ref before switching, restore after).
- Tables collapse to cards below `md`: identity line, two or three key values, status pill, Open. Tables that must stay tabular scroll inside their own `overflow-x-auto` with a sticky first column.
- Filters collapse into "Filters (n)" opening a bottom-sheet `<dialog>` with Apply/Reset.
- Global keyboard shortcuts are inert below `lg` and while a text control has focus.

### 3.7 Loading, errors, empty states, success, language

- Initial load: skeleton in the list area only; title, toolbar and counts render immediately.
- Refresh: previous data stays visible with "Updating…"; a failed refresh shows an inline banner and keeps the rows. (C, per module.)
- Multi-dataset pages: each section owns its loading/error; one failure never zeroes another section. (C.)
- Empty states name the filter that produced them and offer Reset.
- Every string introduced by these changes is added to the file's existing `{en, es}` dictionary or a new one keyed by `useDashboardLanguage()`. Dates via `Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-GB", …)` with an explicit `timeZone` for day-based data (the `Europe/Madrid` pattern at `AdminRecyclingIntelligenceWorkspace.tsx:232-239`); enums through a label map. No touched surface ships English-only strings.
- Accessibility floor: visible focus (`--gl-green-ring`), `aria-label` on icon-only buttons, `role="status"`/`aria-live="polite"` on progress text, 44 px targets on phones, `role="alert"` on error boxes.

---

## 4. Annotated layouts — Outreach, Users, Challenges/Certificates

Text wireframes with fictitious data. Desktop = content area after the 288 px sidebar; phone = 390 px. `[…]` control, `(…)` annotation, `★` primary. Each annotation names where the element comes from today so Codex re-homes existing JSX rather than inventing UI.

### 4.1 Outreach — `components/admin/AdminOutreachWorkspace.tsx`

What stays exactly as it is: every handler and gate (approval paths, test-send copy mechanics, real-send `window.confirm`, bulk confirm/progress/partial-failure reset, `sending` exclusions, display-only attachment chips, `iframe sandbox="" referrerPolicy="no-referrer" srcDoc={buildIsolatedEmailPreview(...)}` — the attribute order is asserted by `tests/emailPreview.browser.test.cjs:16-17` and must not change).

Desktop (≥ 1280) — list mode:

```
┌─ Outreach ─────────────────────────────────────────────────────────────────┐
│ Outreach · Prospección                                  [Sent archive (218)]│
│ Drafts 41 · Ready 7 · Saved 12 · Disregarded 5 · Failed 2     (W:1490-1499) │
│ ★[New draft]  [Reload]                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ (Drafts 41)(Ready 7)(Saved 12)(Disregarded 5)(Deleted)(Sent)(All)  W:1554   │
│ [Search organisation, contact, subject…] [Audience ▾] [Campaign — exact ▾]  │
│ 41 shown of 41 returned · newest 250 only                    (new count line)│
├─────────────────────────────────────────────────────────────────────────────┤
│ ☐ │ Organisation / contact           │ Subject           │ Status │ Flags │ ⋯ │
│ ☐ │ Ayuntamiento de Ribera           │ Recycling pilot…  │ Ready  │ 📎 HV │[Open]│
│   │ Marta Vidal · m.vidal@ribera.es  │                   │        │       │     │
│ ☐ │ Café Solana                      │ Join GreenLoop…   │ Draft  │ Needs │[Open]│
│   │ Needs contact                    │                   │        │contact│     │
│ …                                          ‹ 1 2 › · 25 ▾                   │
└─────────────────────────────────────────────────────────────────────────────┘
Sticky bulk bar, only while ☐ > 0:  3 selected · all Ready  [Approve visible] ★[Send selected (3)] [Clear]
```

- The editor column (`W:1768-1991`) is rendered only when `selectedId || isCreating`; otherwise the list spans the grid (`W:1641`). (A/B)
- Row content is the existing row (`W:1686-1760`) in columns; the quick "Approve" moves to the `⋯` overflow and gains `disabled={Boolean(action)}` (M02). (A/B)
- Labels on the two selects (`W:1599-1618`); "exact" on Campaign because the API compares equality (`admin.ts:5220`). (A)
- Bulk bar = the existing buttons from `W:1500-1550`, rendered only with a non-empty `selectedSendIds`, which is now also cleared on pill change (M04). (B)
- Client-side pager over `listEmails`. (B)

Desktop — record mode:

```
┌─ ‹ Outreach / Ayuntamiento de Ribera ──────────────────────[Sent archive]───┐
│ LIST (2fr, condensed,     │ ┌ Sticky record header ─────────────────────────┐│
│  selected row tinted,     │ │ Ayuntamiento de Ribera      [Ready]  [Close ×] ││
│  scroll kept)             │ │ Real recipient: m.vidal@ribera.es · 📎 1 PDF   ││
│                           │ │ (Preview) (Content) (Advanced)                 ││
│                           │ └────────────────────────────────────────────────┘│
│                           │ ⚠ Real recipient warning (W:1807)                 │
│                           │ Contact quality · Why this lead (W:1813-1839)     │
│                           │ ── Preview: [Open PDF: pilot-brief.pdf] (W:1854)  │
│                           │    ┌ iframe (W:1887-1893, unchanged) ───────────┐ │
│                           │ ── Content: 6 fields + Subject + textarea         │
│                           │ ── Advanced: notes, source links, Resend/Error    │
│                           │ ┌ Sticky action bar ────────────────────────────┐ │
│                           │ │ [Delete][Disregard][Save for later] · [Send test]│
│                           │ │ [Save] ★[Approve]  (or ★[Send] when approved)   │ │
│                           │ └────────────────────────────────────────────────┘ │
└───────────────────────────┴──────────────────────────────────────────────────┘
```

- Tabs are a view switch (`editorTab` local state) over existing sections; nothing is removed. Default Preview for existing records, Content for a new draft. (B)
- Action bar = existing buttons (`W:1961-1988`) with fixed order; primary slot by status: `approved` → Send; `drafted|saved_for_later` → Approve; else none. Gates unchanged. (A/B)
- Banners (`W:1630-1639`) move inside the record pane above the bar with `role="status"`/`role="alert"` (M05). The `/send` response's `email.status` is read; `"failed"` renders the error banner "Delivery failed: <error_message>" (M01). (B)
- Dirty guard on record switch, Close, Reload, New draft, list refetch; while dirty the `form` rebuild effect (`W:1017-1021`) early-returns; search/campaign refetch debounced 300 ms (F09/F18). (B; debounce is C.)
- Archive overlay becomes `RecordDialog`; rows get `tabIndex=0`/Enter; row selection calls `selectEmailForReview()` so pane + scroll are set (F08). (B)

Phone (390):

```
LIST                                   RECORD
┌──────────────────────────────┐       ┌──────────────────────────────┐
│ ☰ Outreach             EN|ES │       │ ‹ Back  Ayuntamiento…  Ready │ sticky
│ Drafts 41 · Ready 7 · …      │       │ Preview | Content | Advanced │ sticky
│ ★[New draft]  [Sent (218)]   │       ├──────────────────────────────┤
│ [Search…]      [Filters (2)] │       │ m.vidal@ribera.es · 📎 1 PDF │
├──────────────────────────────┤       │ ⚠ Real recipient warning     │
│ ☐ Ayuntamiento de Ribera     │       │ [Open PDF: pilot-brief.pdf]  │
│   Recycling pilot for…       │       │ ┌ iframe 60vh ─────────────┐ │
│   Ready · 📎 · HV     [Open] │       │ └──────────────────────────┘ │
│ ☐ Café Solana                │       ├──────────────────────────────┤
│   …                          │       │ ✓ Saved · 14:02   (status)   │
│ ‹ 1 2 ›                      │       │ [Send test][Save] ★[Approve] │ sticky
├──────────────────────────────┤       │                          [⋯] │
│ 3 selected  ★[Send selected] │       └──────────────────────────────┘
└──────────────────────────────┘
```

- `mobilePane` already gives one surface at a time (`W:1642-1647,1768-1773`); this adds the sticky top bar (Back = `returnToMobileList`), PDF chips at the top of Preview, and the sticky bottom bar with two visible buttons + overflow (Save for later / Disregard / Delete). Answers F07 without moving a gate.
- Scroll restore: save `listRef.current.scrollTop` before switching to the editor; restore after switching back (the inner scroller is `display:none` while in editor mode, `W:1663,1645`). (B)
- Filters bottom sheet is a `RecordDialog` over the existing pill/select state.

### 4.2 Users — `app/(dashboard)/admin/users/page.tsx` + `components/admin/AdminDetailWorkspaces.tsx`

What stays: every support handler, endpoint, validation and confirmation (Add/Remove EcoPoints, avatar-reset confirm, Deactivate/Reactivate PATCH, Save Changes payload, Set New Password confirm, Remove-from-challenge confirm, CSV of the filtered set).

Desktop — list (full width):

```
┌─ Users ────────────────────────────────────────────────────────────────────┐
│ Users · Usuarios                                          [Export CSV (412)]│
│ 412 shown of 3,908 · 4 filters active                    [Recycling activity]│
├─────────────────────────────────────────────────────────────────────────────┤
│ [Search name, email or id…] [Role ▾] [Status ▾] [Platform ▾] [More filters ▾]│
├─────────────────────────────────────────────────────────────────────────────┤
│ Name · Email                 │ Role │ Wallet │ Events │ Units │ Last activity ▾│ Status │ [Open] │
│ Lucía Ferrer                 │ user │ 1,240  │ 38     │ 91    │ 12 Sep 2026    │ Active │ [Open] │
│ lucia.f@example.com · iOS 2.0.10                                                                  │
│ Tomás Reig                   │ user │ 0      │ 0      │ 0     │ No activity yet│ Active │ [Open] │
│ …                                          ‹ 1 2 3 … 17 › · 25 ▾                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Aside removed from the list route; `lg:grid-cols-[1.5fr_1fr]` (`:740`) becomes one column; its blocks move to the detail route. (A/B)
- Name + Email first (Email is column 11 today, `:755`); Signed-up moves to "More filters"/detail; row actions (`:815-856`) leave the table for the record. (A)
- "No activity yet" when `new Date(v).getTime() === 0`; the "Last activity to" filter ignores the sentinel. (A/B; API fix is D)
- 12-field filter card (`:679-738`) → toolbar with three selects visible and the rest in "More filters"; all still client-side/instant; `q/role/status/platform/page/sort` mirrored to the URL. (B)
- Sorting on Last activity / Wallet / Events / Units. (B)
- The two `/admin/activity` links (`:640-651`) collapse to one. (A)

Desktop — record (`/admin/users/[id]`):

```
┌ ‹ Users / Lucía Ferrer ────────────────────────────────────────────────────┐
│ Lucía Ferrer [Active]  user · iOS 2.0.10 · joined 3 Mar 2026                │
│ lucia.f@example.com · id 8c1f…                                              │
│ ★[Add EcoPoints] [Edit user] [Set password] [Reset companion] [⋯ Deactivate]│
├──────────────────────────┬──────────────────────────────────────────────────┤
│ Wallet 1,240 · Events 38 │ (Recycling history) (Scans) (Challenges) (Account)│
│ Units 91 · CO₂ 12.4 kg   │ [From] [To] [Apply] [Reset]                       │
│ Last activity 12 Sep     │ 12 Sep 2026 · Lavapiés · 3 items · +30 · Approved │
│ Latest city Lavapiés     │ … (25 per page)                                   │
└──────────────────────────┴──────────────────────────────────────────────────┘
```

- The record page is the existing route (`ADW:47-160`) plus the aside's support blocks; each action opens a `RecordDialog` containing the *existing* form and handler (Add/Remove EcoPoints `:938-1007`, Edit user `:1084-1145`, Set password `:1147-1177`). Reset companion keeps `window.confirm` (`:413`); Deactivate gains one and leaves the primary colour (M06); Save Changes confirms when the role changes. Because dialog state is local, activity reloads no longer wipe edits (`:324-331`). (A/B)
- Parent crumb carries `?from=`; summary tiles render "—" while loading instead of `0` (`ADW:106-111`); `SimpleTable`'s silent 200-row cap (`ADW:539`) becomes a pager. (A/B)

Phone: cards replace the table below `md`; record = same route with sticky top bar and a bottom bar (Add EcoPoints · Edit · ⋯ Set password / Reset companion / Deactivate); CSV export stays on the list header (in `⋯` on phones).

### 4.3 Challenges and certificates — `components/admin/AdminChallengesWorkspace.tsx` (+ challenge section of `AdminDetailWorkspaces.tsx`)

What stays: request/sponsored handlers; certificate persist → preview/PDF/XLSX sequences, `?lang=` options, approved-only API metrics, client filenames; create/update payloads; Toggle/Delete handlers and confirms; image persistence handlers.

Desktop — tabs and requests (default tab):

```
┌─ Challenges ───────────────────────────────────────────────────────────────┐
│ Challenges                                              ★[New challenge]    │
│ (Requests · 3 pending) (Live challenges · 58) (Impact documents · 16)  ?tab=│
├─────────────────────────────────────────────────────────────────────────────┤
│ Sponsored campaign reviews      [Status: Pending review ▾]   2 shown of 9   │
│ Vidal Foods — "Summer cans"   Pending review · 20 Aug → 30 Sep [Open review]│
│ Community challenge requests    [Status: Pending ▾]          1 shown of 27  │
│ Colegio Arboleda — "Botellas" Pending · requested 11 Sep      [Open request]│
└─────────────────────────────────────────────────────────────────────────────┘
Open → pane (desktop) / surface (phone):
│ Vidal Foods — "Summer cans" [Pending review]                       [Close ×]│
│ brand · dates · individual goal · collective target · reward (existing copy)│
│ Notes [textarea = sponsoredReviewNotes[id]]      ✓/✗ per-record banner slot │
│ [Reject] [Pause]                                     ★[Approve + publish]   │
```

- Badge says "3 pending"; both request lists default to Pending with a status filter (today sponsored has none, community defaults to `all`, `:492,1275-1346`). Listing rules unchanged. (A/B)
- Per-record pane and per-record feedback (sponsored results no longer land in the community header, `:1385-1389`). Reject/Pause on sponsored campaigns gain a bilingual `window.confirm` (they hide a live campaign and pause its reward, `admin.ts:4384-4399`); Approve keeps none. (B)
- `loadData()` no longer re-seeds drafts/notes that are dirty (`:552-571`). (B)

Desktop — Impact documents (replaces the 16 open certificate cards):

```
│ [Search…] [Stage ▾] [Certificate ▾]                              16 shown   │
│ Challenge                 │ Stage     │ Progress │ Certificate │ Recipient      │[Open]│
│ Botellas Arboleda 2026    │ Completed │ 500/500  │ Generated   │ Colegio Arbol. │[Open]│
│ Ribera recicla            │ Ongoing   │ 212/400  │ Enabled     │ Ayto. Ribera   │[Open]│
Open → work area:
│ Botellas Arboleda 2026 [Completed] [Generated 02 Sep]               [Close ×]│
│ Recipient name [Colegio Arboleda]  Type [School ▾]  ☑ Enable certificate     │
│ [Save settings]   Preview: 500 products · 43 participants (after Save+preview)│
│ Language (EN)(ES)   [Save + preview] [Save + PDF] [Download XLSX]            │
│ ⓘ Saving + preview/PDF also enables the certificate. PDF/XLSX become        │
│   available once the shared goal is reached.                                │
```

- List = new presentation over `communityChallenges` (`:620-631`) using `getChallengeStage`, `getCertificateStatus`, progress and the draft recipient. (A)
- Work area = the existing card's right column and preview panel (`:1622-1676`) for one challenge; six buttons collapse to a language segmented control + three actions calling the *same* handlers with the chosen language; save-before-download semantics, `?lang=`, filenames and the forced-enable behaviour are unchanged and now stated in copy. (A/B)
- PDF/XLSX are disabled with the ⓘ reason while `stage === "Ongoing"`, mirroring the API's 409 (`impactAccess.ts:13-31`). Letting admins preview ongoing challenges is D (§9). (B)

Desktop — Live challenges: full-width 11-column table with search/type/status and a pager; row Open → `/admin/challenges/[id]`, which gains Edit opening the existing form in `RecordDialog` (replacing the hand-rolled backdrop `:1899-1914`); the page-level error (`:1222`) moves inside the dialog (M08); immediate-PATCH image actions are labelled "Saves immediately"; Toggle's label becomes Deactivate/Activate by `active`. ★New challenge opens the same dialog in create mode; the always-visible right-column form goes away. (A/B)

Phone: tabs as a scrollable pill row; cards per tab; record surfaces with sticky bars; the editor dialog is full-screen below `md`.

---

## 5. Module-by-module recommendations

Format per row: friction (evidence) → proposal → desktop/mobile → files → preserved → category → tests. "Tests" means: **B-test** = browser check at 390 and 1512 px against route-mocked data in the style of `test/individualReview.browser.cjs` (Playwright, `page.route`), **U-test** = `node --test` unit of a pure helper, **M** = manual checklist item.

### 5.1 Outreach (`components/admin/AdminOutreachWorkspace.tsx`)

| # | Friction | Proposal | Desktop / Mobile | Preserved | Cat | Tests |
|---|---|---|---|---|---|---|
| O1 | Archive row selection leaves phone users on the list (F08, `:2028-2033`) | Call the same path as `selectEmailForReview` (set pane + scroll) | — / editor opens with the sent record | status filter set to `sent`, disabled editor for sent | B | B-test: tap archive row at 390 → editor visible |
| O2 | Actions ≈2,300 px below the heading at 390 (F07) | Sticky bottom action bar below `xl`; two visible + overflow; primary by status; attachment count in heading | Bar sticky to detail column / viewport | every gate (`:1451`, `:1370`), test-send flow, Send confirm | A/B | B-test: bar visible on open; buttons' `disabled` equal to today's per status |
| O3 | Result banners off-screen and silent (M05, `:1630-1639`) | Render in the record pane above the bar with `role="status"`/`alert` | Same | banner texts | A | B-test: after Save, banner within viewport |
| O4 | Delivery failure shown as sent (M01) | After `/send`, read `email.status`; `failed` → error banner with `error_message`; bulk counts `failed` separately; test-send likewise | Same | request/confirm unchanged | B | B-test with mocked `{ok:false,email:{status:"failed"}}` → error banner, row chip Failed, not counted as sent |
| O5 | Quick Approve ungated / clears `action` mid-bulk (M02) | `disabled={Boolean(action)}`; move to row overflow | Overflow menu / bottom sheet | handler | A/B | B-test: during bulk send the control is disabled |
| O6 | Hidden multi-selection sendable; auto-select ignores pill (M04) | Clear `selectedSendIds` on pill change; auto-select only within `listEmails`; Disregarded pill counts what it lists | Same | selection semantics for visible rows | B | U-test on the derived-list helpers if extracted; B-test |
| O7 | Every search/campaign keystroke refetches, blanks both panes, discards edits (F09/F18) | Debounce 300 ms; keep previous rows with "Updating…"; dirty guard; skip `form` rebuild while dirty | Same | server filters, `campaign` exact match | **C** (debounce/retain) + B (guard) | B-test: type 5 chars → 1 request; edit + refetch → edits kept |
| O8 | Editor always mounted beside the list; sections in one long column (F01/F07) | List-first; record mode split; Preview/Content/Advanced tabs | Split at `xl`; one pane below | all sections and their content | A/B | B-test: no selection → list full width; tabs switch without losing form state |
| O9 | Archive overlay inaccessible (F17) | `RecordDialog`; keyboard rows; bilingual headers | Same | archive contents | B/A | M: Escape closes, focus returns to "Sent" button |
| O10 | Silent 250 cap; unlabeled selects; `Label` renders `<p>` (M17, C13) | Count line; `<label htmlFor>`; `aria-label` on selects | Same | — | A | M |
| O11 | Failed test send strands an approved copy (M03) | On test-send failure call `loadEmails()` so the copy appears under Ready | Same | test-send creation | **C** | B-test |

### 5.2 Users (`app/(dashboard)/admin/users/page.tsx`, `components/admin/AdminDetailWorkspaces.tsx`, `app/(dashboard)/admin/users/[id]/page.tsx`)

| # | Friction | Proposal | Desktop / Mobile | Preserved | Cat | Tests |
|---|---|---|---|---|---|---|
| U1 | Table + aside split; Email last; Actions off-screen (F01) | Full-width list; column order; actions on the record | Table / cards | list data, CSV of filtered rows | A | B-test: at 1512 no horizontal scroll needed to see Email/Open |
| U2 | Deactivate no confirm + primary colour; role → admin no confirm (M06) | Bilingual `window.confirm` on Deactivate and on role change; neutral styling | Overflow on phone | PATCH payloads | A/B | B-test: cancel confirm → no request |
| U3 | Support forms wiped by reloads (F09/M06) | Forms into `RecordDialog`s on the detail route with local state | Dialog / full-screen dialog | validation (`:343-347`, `:522`), confirms (`:413,:444,:533`) | B | B-test: open Add EcoPoints, trigger reload, values persist |
| U4 | Detail route has no support actions (F09) | Detail route gains the action bar and tabs | Route / same route | `ADW` handlers | A/B | M |
| U5 | Filters/selection not in URL; no pager/sort (F09) | `useListQueryState`; pager; sort; `?from=` on Open | Same | client-side filter logic | B | B-test: reload keeps filters; Back from detail restores page |
| U6 | 1970 sentinel (F14) | "No activity yet" when epoch; filter ignores sentinel; CSV writes empty | Same | API contract | A/B | U-test on `formatDateTime` guard |
| U7 | Two Activity links; "Add EcoPoints" row button is a no-op selector (F20) | One link; row action removed (record has it) | Same | — | A | M |
| U8 | Row-click races (M07) | Pass `AbortSignal` to `apiFetch` for activity loads | Same | endpoint | **C** | B-test with delayed mocks |
| U9 | English only; browser-locale dates (F15) | Local `{en,es}` dictionary; `Intl.DateTimeFormat` | Same | — | A | M (ES toggle) |

### 5.3 Challenges and certificates (`components/admin/AdminChallengesWorkspace.tsx`, challenge section of `AdminDetailWorkspaces.tsx`)

| # | Friction | Proposal | Desktop / Mobile | Preserved | Cat | Tests |
|---|---|---|---|---|---|---|
| C1 | Errors hidden behind the modal (M08) | Editor in `RecordDialog`; error inside it | Dialog / full-screen | `handleSubmit` validation and payload | A/B | B-test: submit invalid → message visible inside dialog |
| C2 | Tab/filter/editor not in URL (F09) | `?tab=`, `?status=`, `?q=` via `useListQueryState` | Same | — | B | B-test: reload keeps tab |
| C3 | Requests badge/defaults (F12) | "n pending" badge; default Pending; status filter on sponsored too | Same | list contents under "all" | A/B | M |
| C4 | Sponsored feedback in the wrong section; no confirm on Reject/Pause | Per-record banner; bilingual confirm | Same | PATCH `{status, notes}` | A/B | B-test |
| C5 | 16 open certificate cards (F11) | Documents list + one work area; language control + three actions | Pane / surface | persist→download sequences, `?lang=`, filenames | A/B | B-test: PDF click sends `?format=pdf&lang=es` after PATCH; XLSX sends no PATCH |
| C6 | Buttons always fail on Ongoing; silent enable (M09) | Disabled with reason while Ongoing; copy states forced enable | Same | API gate | A/B | B-test: Ongoing → buttons disabled + reason |
| C7 | Reload wipes notes/drafts, blanks lists (M10) | Dirty map prevents re-seed; keep rows during `loadData` | Same | data | B/**C** | B-test |
| C8 | Nested controls in `role="button"` rows (F17) | Explicit Open control; row not a button | Cards on phone | actions | A | M (SR/keyboard) |
| C9 | Always-visible create form (F01) | ★New challenge opens the dialog | Same | payload | A/B | M |
| C10 | Toggle label direction; window Escape from AI textarea | "Deactivate/Activate"; Escape handled by `<dialog>` only | Same | toggle endpoint | A/B | M |
| C11 | English-heavy (F15) | Extend the existing partial dictionary | Same | — | A | M |

### 5.4 Rewards and unlocks (`AdminRewardsWorkspace.tsx`, `AdminRewardUnlocksWorkspace.tsx`, reward section of `AdminDetailWorkspaces.tsx`, `AdminNetworkWorkspaces.tsx` products)

| # | Friction | Proposal | Desktop / Mobile | Preserved | Cat | Tests |
|---|---|---|---|---|---|---|
| R1 | Form + preview always visible; table scrolls (F01) | List-first; Create/Edit as a route-detail edit mode (`/admin/rewards/[id]` + `/admin/rewards/new`) or `RecordDialog` if a new route is not approved; sections stay collapsible | Route / same | payload derivation (`:306-346`), promo-code POST, archive/restore confirms, toggle | A/B | B-test: create → POST body identical to today (snapshot from mock) |
| R2 | Silent replace of a half-filled form (F09) | Dirty guard | Same | — | B | B-test |
| R3 | No success feedback | Inline `role="status"` after create/update/toggle/archive/restore | Same | — | A | M |
| R4 | Dead `terms_text`; Restore copy mentions a visibility toggle that does not exist (M-notes) | Hide the field behind "Advanced" with copy "internal note, not saved"; reword Restore confirm | Same | payload | A | M |
| R5 | Unlocks ignore `?partnerId=` (F06) | Initialise from the URL; show a "Partner: …" chip with Clear | Same | server filter | B | B-test: link from partner detail → filtered request |
| R6 | Products ignore `?brandId=` (F06) | Initialise `brandId` from the URL; chip | Same | server filter | B | B-test |
| R7 | Unlocks CSV with emails/tokens, no confirm (M20) | Bilingual confirm stating contents | Same | columns | B | M |
| R8 | English only in Rewards (F15) | Dictionary (Unlocks is the model) | Same | — | A | M |
| R9 | Detail derives unlocks by title search; whole list fetched (M18) | Out of scope (C/D); note only | — | — | C/D | — |

### 5.5 Recycling Activity and Moderation (`app/(dashboard)/admin/activity/page.tsx`, `app/(dashboard)/admin/moderation/page.tsx`)

| # | Friction | Proposal | Desktop / Mobile | Preserved | Cat | Tests |
|---|---|---|---|---|---|---|
| A1 | Fetch per keystroke; page unmounts (F10) | Draft filters + Apply/Reset; keep page mounted; previous rows with "Updating…" | Same | params sent, endpoint | B + **C** | B-test: typing → 0 requests; Apply → 1 |
| A2 | Summaries before the table (F03) | Compact 4-KPI row; Daily totals and Top locations inside collapsed `<details>`; table first with pager | Same / cards | data | A/B | M |
| A3 | Counts and CSV scope misleading (F05, M12, M17) | "500 newest item lines returned" copy; "EcoPoints (event total, repeated per item)" header; filename without `all`; one export button | Same | CSV columns | A | U-test on filename helper |
| A4 | Raw daily dates; English (F03/F15) | `Intl.DateTimeFormat` with `Europe/Madrid`; dictionary | Same | — | A | M |
| A5 | Dropdown options from result set (M21) | Label "Options from current results" | Same | — | A | M |
| MOD1 | Shortcut target ambiguous (F13) | Shortcuts act on the *focused/selected* card only; on-screen hint; inert below `lg` and while typing | Same | approve/reject calls | B (separate review) | B-test: `a` with no focus → no request |
| MOD2 | Bulk partial failure invisible (F13) | Collect per-item results; summary "3 approved · 1 failed: <ids>"; failed ids stay selected | Same | sequential calls, confirm text | B | B-test with one failing mock |
| MOD3 | Hidden un-moderatable events (M11) | Phase 1: banner "N pending events hidden (no photo evidence)"; Phase 2 (separate review): list them with an explicit "No evidence" state | Same | evidence rules | A → B | B-test |
| MOD4 | Context rendered 3× per card; tall cards | Context once, in the aside; images side by side at `md` | Cards | grouping, risk | A | M |
| MOD5 | Unbounded dump on mount (M11) | Note only (D: status filter/limit) | — | — | D | — |

### 5.6 Brand products and reports (`components/brand/BrandProductsWorkspace.tsx`, `components/brand/BrandCrmWorkspaces.tsx`, `components/brand/SponsoredChallengeManager.tsx`, `components/admin/AdminReportsWorkspace.tsx`)

| # | Friction | Proposal | Desktop / Mobile | Preserved | Cat | Tests |
|---|---|---|---|---|---|---|
| BP1 | First 20 only (F02) | Client-side search (name/EAN) + status filter + pager over `products` | Table / cards | CRUD/import/export handlers | B | B-test: 45 mocked products all reachable |
| BP2 | Optionally send `q`/`status` the API already accepts | Only after review | — | — | **C** | — |
| BP3 | Silent errors; import Cancel live (M15) | Errors inline in the table area; disable Cancel/Upload while importing; `RecordDialog` | Same | endpoints | A/B | B-test |
| BP4 | Wrapper double gate (M15) | Note only (C) | — | — | C | — |
| SC1 | Delete no confirm/no catch; load error swallowed; English (M16, F15) | Bilingual confirm; try/catch with message; dictionary | Same | `requestId` idempotency, forced `public` (test `sponsoredSubmission.test.cjs` must keep passing) | B/A | U-test existing + B-test |
| BR1 | One filter bar over three windows; events ignore dates (M13, F04) | Scope line under the filter bar per kind: "Events: newest 1,000, all time, city filter applies · Campaigns/Behaviour: selected dates (default 30 days) · Redemptions: all time"; export cards say "From/To only; city not applied" | Same | requests | A | M (copy in EN/ES) |
| BR2 | 8-tile band repeated (F20) | Band only on Overview and Reports hub; sub-reports show their own 3–4 KPIs | Same | values | A | M |
| BR3 | Six-way fetch on every kind incl. settings/exports; refetch on language toggle (F18) | Fetch by `kind`; drop `copy` from the loader deps | Same | endpoints | **C** | B-test: settings page → 1 request |
| BR4 | Map dead space (640 vs 460) | Match heights | Same | — | A | M |
| BR5 | Brand anonymity (M14) | Rule for Codex: never render `anonymized_user_id`, never add user columns to brand tables/exports; keep tables private to `BrandCrmWorkspaces` | — | boundary | — | Review checklist |
| AR1 | Export Center filter bar over exports that ignore it; capped exports (F04, M17) | Show the bar only on Platform/Geo; each card states scope and cap ("Products: first 500", "Unlocks: first 1,000") | Same | handlers | A | M |
| AR2 | `SimpleTable`/`EventTable` slice 200 silently | Pager or "showing 200 of N" | Same | — | A/B | M |

### 5.7 Other surfaces (short)

- **Overview** (`AdminOverviewWorkspace.tsx`): drop the hero tiles that repeat KPI cards; keep one "Recycling activity" link; render "—" instead of `0` after a failed load; per-section errors (C). The 7-way fetch incl. the full user list is C (M18).
- **Network** (`AdminNetworkWorkspaces.tsx`): rows get an explicit Open; the dead `?brandId`/`?partnerId` links stay but their destinations consume them (R5/R6); products stop re-fetching brands per keystroke (C).
- **Shell** (`CrmShell.tsx`): longest-match `aria-current`; breadcrumb links; five ES labels; drawer as `<dialog>` or with Escape + focus restore; fix the `useState` initialiser hydration mismatch by reading `localStorage` in an effect (B, tiny, in `DashboardLanguage.tsx` — a chrome file, approve explicitly).
- **Placeholders** (`CrmPlaceholderPage.tsx`, `AdminSystemWorkspaces.tsx`): rewrite the module map to link to real routes and drop "planned" on live modules; label Settings and Audit "Information only" honestly; add nothing to the sidebar (F19). Do not build audit/settings/partner-redeem (D).
- **Partner** (`PartnerCrmWorkspace.tsx`): dictionary + tokens; mask redeem tokens behind a "Show" toggle with copy; do not add validate/redeem controls (D). Keep consumer email columns (fulfilment needs them; different privacy policy from Brand, as the audit notes).
- **Organization** (`OrganizationChallengeWorkspace.tsx`): do not blank the page on refresh (C); `loadTeams` try/catch (B); dictionary; no XLSX button is added unless approved (the endpoint exists; adding the button is a new capability → D-lite, list in §9).
- **Recycling Intelligence**: no changes; source of the extracted primitives. Do not touch `createMetadataApplication` even though `apply()` is never called.

---

## 6. Phased implementation plan

Each phase is one PR-sized unit; each keeps to the dashboard `CLAUDE.md` sequence (inspect → propose → approve → edit → focused `tsc` → summarise). Files are verified to exist at `d8f4445`. Line refs are for orientation only.

### Phase 0 — Prerequisites (no UI)
- Fast-forward `~/greenloop-dashboard` to `origin/main` or implement in `~/Documents/greenloop-dashboard`; update the path sentence in `CLAUDE.md` (doc-only).
- Optional, needs approval: add `"test": "node --test tests/ test/"` to `package.json` and declare `playwright` as a devDependency so the existing tests are runnable; add `docs/claude/` if absent. (Process; not part of any UI scope.)
- Risk: none. Acceptance: `npx tsc --noEmit` baseline recorded.

### Phase 1 — Shell wayfinding + shared primitives (A/B; explicit chrome approval)
- Files: `components/crm/CrmShell.tsx` (longest-match active; breadcrumb `<nav>`; five ES labels; drawer Escape/focus restore); new `components/crm/RecordDialog.tsx`; new `lib/useUnsavedChanges.ts`; new `lib/useListQueryState.ts`; new `components/crm/Pager.tsx` (+ `usePagedRows`).
- Preserved: nav structure, role gating, logout, language toggle, `lib/auth.ts`, `lib/api.ts` untouched.
- Risks: breadcrumb links must not create routes that do not exist (use the nav table + known list routes only); `useSearchParams` consumers need `<Suspense>`.
- Acceptance: on `/admin/reports/exports` exactly one `aria-current="page"`; breadcrumb segments navigate; Escape closes the drawer and focus returns to the menu button; `RecordDialog` traps focus and restores it (B-test at 390/1512); `tsc` 0 new errors.

### Phase 2 — Outreach (§5.1 O1–O11)
- File: `components/admin/AdminOutreachWorkspace.tsx` (+ Phase 1 primitives).
- Order inside the phase: 2a = §8 first batch (O1, O2, O3, O5, O10); 2b = O8, O9, O6; 2c = O4 (read `email.status`); 2d = O7/O11 (**C**, separate approval).
- Preserved: all gates, confirm texts, test-send mechanics, iframe attribute order, bulk semantics.
- Risks: `tests/emailPreview.browser.test.cjs` regex; `xl` split; `action` slot semantics.
- Acceptance: B-tests listed in §5.1; manual: approve → send test → send real (mock) at both widths; ES copy complete for new strings.

### Phase 3 — Users (§5.2)
- Files: `app/(dashboard)/admin/users/page.tsx`, `components/admin/AdminDetailWorkspaces.tsx` (user section only), `app/(dashboard)/admin/users/[id]/page.tsx` (Suspense wrapper if query state is read).
- Preserved: every payload/validation/confirm; CSV columns (except the 1970 sentinel → empty, which is a display correction to approve explicitly).
- Risks: moving forms into dialogs changes *where* state lives — keep handler bodies verbatim; the detail route must keep working for direct links.
- Acceptance: §5.2 tests; Back from detail restores page/filters; ES toggle shows no English on the two pages.

### Phase 4 — Challenges and certificates (§5.3)
- Files: `components/admin/AdminChallengesWorkspace.tsx`; challenge section of `AdminDetailWorkspaces.tsx` (Edit action); `app/(dashboard)/admin/challenges/page.tsx` (Suspense).
- Preserved: certificate sequences and languages, request/sponsored endpoints, hard-delete confirms, image PATCH behaviour (labelled).
- Risks: the certificate handlers are parameterised by language today via six buttons — the segmented control must pass the same literal `"en"|"es"`; `loadData` all-or-nothing behaviour is unchanged unless the C item is approved.
- Acceptance: §5.3 tests; PDF/XLSX request URLs identical to today for both languages; validation error visible inside the dialog.

### Phase 5 — Rewards, unlocks, network context (§5.4, R5/R6)
- Files: `components/admin/AdminRewardsWorkspace.tsx`, `components/admin/AdminRewardUnlocksWorkspace.tsx`, `components/admin/AdminNetworkWorkspaces.tsx` (products `brandId` intake only), reward section of `AdminDetailWorkspaces.tsx`, page wrappers for Suspense.
- Preserved: payload derivation, promo-code POST, archive/restore/toggle, unlock status PATCH, CSV columns.
- Risks: a new `/admin/rewards/new` route is a route change (needs explicit approval per `CLAUDE.md`); fallback is a dialog.
- Acceptance: create/update bodies byte-identical to today under mocks; partner/brand chips filter requests.

### Phase 6 — Activity and Moderation (§5.5)
- Files: `app/(dashboard)/admin/activity/page.tsx`, `app/(dashboard)/admin/moderation/page.tsx`.
- Split: 6a Activity (A1 B part, A2–A5); 6b Activity C part (retain rows); 6c Moderation MOD1–MOD4 as its own reviewed change (preservation item 8).
- Acceptance: typing never fetches; Apply fetches once; `a`/`r` only act on the focused card; bulk summary lists failures; hidden-evidence count shown.

### Phase 7 — Brand products, brand reports, admin exports (§5.6)
- Files: `components/brand/BrandProductsWorkspace.tsx`, `components/brand/BrandCrmWorkspaces.tsx`, `components/brand/SponsoredChallengeManager.tsx`, `components/admin/AdminReportsWorkspace.tsx`.
- Preserved: export handlers and params, CRUD/import, `requestId` idempotency, `anonymized_user_id` never rendered.
- Acceptance: all mocked products reachable; scope lines present in EN/ES on every report kind; `tests/sponsoredSubmission.test.cjs` passes.

### Phase 8 — Consistency
- i18n sweep of every surface touched in Phases 2–7 plus Maps, Overview, Partner, Organization; `role="alert"` on error boxes; token replacement of `red-*`/`slate-*`/`emerald-*`; placeholder copy reconciliation; Overview duplicate removal; `DashboardLanguage.tsx` hydration fix.
- Acceptance: grep for hard-coded English in touched files returns none; ES walkthrough at 390/1512 of every touched route.

---

## 7. Preservation checklist and regression-test matrix

### 7.1 Preservation checklist (what Codex signs off per phase)

1. Role workspaces separate; `lib/auth.ts`, `lib/api.ts`, `(dashboard)/layout.tsx` unchanged; route files only gain `<Suspense>` wrappers or, if approved, `/admin/rewards/new`.
2. Brand surfaces never render `anonymized_user_id`, names or emails; no admin table component is shared into `components/brand/`; export handlers unchanged (M14).
3. Challenge type copy and fields unchanged (global per-user, community shared, personal); `challengeSummary`, target kinds, bonus semantics intact.
4. Certificates: `persistCertificateSettings` → preview/PDF order; forced enable on preview/PDF; XLSX without save; `?lang=en|es`; client filenames; approved-only metrics are API-side and untouched.
5. Organization invitations/tokens/teams untouched; no organization assignment added to certificates.
6. Reward engine fields, derivations (`fulfillment_type`, `visible_in_wallet_catalog`), pooled-code POST, archive/restore rules unchanged.
7. Users: points validation, password ≥ 8 + confirm, avatar-reset confirm, deactivate PATCH, role/brand edit payload, challenge-removal confirm unchanged (new confirms only add a step).
8. Moderation: grouping by event, bag/container slots, risk tiers, approve/reject endpoints and their order unchanged; targeting/feedback changed only in Phase 6c after review.
9. Outreach: approval paths, test-send copy creation, `approved`-only send, bulk confirm/progress/reset-to-failed, `sending` exclusions, attachment display, iframe isolation attributes and order.
10. Recycling Intelligence untouched; `RecordDialog` copies its behaviour rather than modifying it.
11. Export columns, identifiers, units, encoding/BOM and file names unchanged except the approved 1970-sentinel correction.
12. No metric recalculation, no endpoint invention, no dependency added, no deletion of "unused" code, no deploy.

### 7.2 Regression-test matrix

| Scenario | Preserved behaviour to assert | How (harness) | Widths |
|---|---|---|---|
| Outreach select proposal / archive row | editor visible, `mobilePane="editor"`, status filter, disabled state for sent | Playwright route mocks (`tests/` style) | 390, 1512 |
| Outreach save/approve/test/send | request bodies and confirm prompts identical; `ok:false` → error banner; banner in viewport | mocks + `page.on('dialog')` | 390, 1512 |
| Outreach bulk send with one failure | sequential POSTs; progress; failed ids re-selected; summary text | mocks | 1512 |
| Outreach dirty guard | switching records with edits prompts; cancelling keeps edits; refetch keeps edits | mocks | 1512 |
| Email preview isolation | existing `tests/emailPreview.browser.test.cjs` passes unchanged | node --test | — |
| Users list → open → back | filters/page in URL restored; no aside on list; Email visible without scroll | mocks | 390, 1512 |
| Users support dialogs | Add/Remove points validation; password confirm; deactivate confirm; role-change confirm; payloads unchanged | mocks + dialog capture | 390, 1512 |
| Users 1970 | "No activity yet" in table/detail; CSV cell empty; filter excludes sentinel | unit + mocks | — |
| Challenges tabs/URL | `?tab=` restores; badge "n pending"; sponsored/community default Pending | mocks | 1512 |
| Certificate actions | PATCH then GET order; `lang` param; XLSX no PATCH; Ongoing disabled with reason | mocks | 1512, 390 |
| Challenge editor | validation error visible in dialog; Escape only from dialog; image PATCH labelled | mocks | 1512 |
| Rewards create/edit | POST/PATCH bodies snapshot-equal to today; promo-code POST after create; archive/restore prompts | mocks | 1512 |
| Unlocks `?partnerId=` / Products `?brandId=` | request includes the id; chip visible; Clear removes it | mocks | 1512 |
| Activity filters | 0 requests while typing; Apply → 1 request with same params; previous rows retained; single export; counts copy | mocks | 390, 1512 |
| Moderation (6c) | `a`/`r` act only on focused card; bulk summary; hidden-evidence count; approve/reject bodies unchanged | mocks | 1512 |
| Brand products | all rows reachable via search/pager; CRUD/import/export unchanged; errors visible | mocks | 390, 1512 |
| Brand reports scope | scope line per kind in EN/ES; export requests unchanged (from/to only) | mocks | 1512 |
| Sponsored form | existing `tests/sponsoredSubmission.test.cjs` passes; delete confirm | node --test + mocks | — |
| Shell | one `aria-current`; breadcrumb links; drawer Escape/focus; ES labels for all segments | mocks | 390, 1512 |
| Type check | `npx tsc --noEmit` — 0 new errors for touched files | CLI | — |
| Language | every touched route in ES shows no English strings; dates localised | manual | 390, 1512 |

---

## 8. Smallest first implementation batch (recommended for Codex after approval)

**Batch 1 — Outreach mobile reachability and truthful feedback (one file).**

File: `components/admin/AdminOutreachWorkspace.tsx` only. No shared primitive required.

1. **F08** — in the archive row handler (`:2028-2033`) call the same selection routine as `selectEmailForReview` (`:1079-1088`) so `mobilePane` becomes `"editor"` and the pane scrolls into view. (B, ~3 lines.)
2. **F07** — below `xl`, render the existing action bar (`:1961-1988`) as a sticky bottom bar with two visible buttons (state-dependent primary + Save) and an overflow `<details>` for Save for later / Disregard / Delete; add `pb-24` to the pane; show the attachment count next to the heading (`formAttachments.length`, `:930`). No gate changes. (A/B.)
3. **M05** — move the error/success banners (`:1630-1639`) into the editor pane directly above the action bar and add `role="alert"`/`role="status"`. (A.)
4. **M02** — add `disabled={Boolean(action)}` to the row quick-Approve button (`:1728-1737`). (A.)
5. **O10** — visible `<label>`s for the status/audience selects (`:1599-1618`) and a count line "N shown · newest 250" in `copy[language]`. (A.)

Explicitly excluded from Batch 1 (later steps): reading `email.status` (M01, needs a mocked-failure test), debouncing/retaining (C), dirty guard, tabs, archive dialog.

Acceptance for Batch 1: at 390 px, tapping a sent-archive row opens the editor; the action bar is visible on open without scrolling; after Save the banner is within the viewport; quick Approve is disabled during any in-flight action; `tests/emailPreview.browser.test.cjs` still matches (iframe attribute order untouched); `npx tsc --noEmit` reports 0 new errors; all new strings present in both `en` and `es`.

---

## 9. Separate backlog — Category C (data loading) and D (backend / business behaviour)

Not part of the interface refresh. Each needs its own approval.

**C — data loading (dashboard only)**
- Debounce Outreach search/campaign (300 ms) and abort stale requests; skip `setSelectedDetail(null)` on refresh; retry detail after a failed fetch (O7, F18).
- Activity/Reports/Maps/Unlocks: keep previous rows during refresh; `AbortController` on filter changes; Activity Reset single fetch.
- Overview and Brand: fetch by `kind`; per-section error isolation; stop downloading the full user list to count (M18); Products stop re-fetching brands per keystroke; Brand loader not keyed on `copy`.
- Users: `AbortSignal` on activity loads (M07).
- Challenges/Rewards/Organization: do not blank lists during `loadData`; do not re-seed dirty drafts.
- Brand Products: send `q`/`status` the API already accepts (`brand.ts:829-843`) instead of client filtering; remove the `/brand/meta` double gate.

**D — backend or business behaviour**
- `GET /admin/users`: return `null` instead of `to_timestamp(0)` for `last_activity_at` (`admin.ts:1592-1595`) and sort accordingly (F14 root cause).
- `GET /brand/reports/events`: honour `from/to` (and `city` if approved), or make the UI's period claim true some other way; consider serving `/brand/reports/traceability` (`brand.ts:323-478`, unused) to the brand overview (M13).
- Hash `anonymized_user_id` and round coordinates in the brand events JSON as the exports already do (`brand.ts:776-779`) (M14).
- Server-side pagination/`limit`/`offset` for `/admin/users`, `/admin/rewards`, `/admin/challenges`, `/admin/outreach/emails`, `/brand/products`; a status filter and limit for `/admin/events` (M11).
- Event-level (not item-line) export rows or a units column that is not always 1 (M12); complete filtered exports with size limits (F05).
- `/admin/outreach/emails/:id/send`: non-2xx on provider failure or a documented `ok` contract; bulk endpoint use (M01/C11).
- Admin bypass or explicit "draft preview" for certificates on ongoing challenges (`impactAccess.ts:13-31`) (M09); optional: do not stamp `certificate_generated_at` on admin test downloads.
- Field-level validation details in API error bodies so forms can highlight fields (`lib/api.ts` would then surface `details`).
- Lookup endpoints for Activity city/user filters (M21).
- Partner redeem action in the dashboard (`POST /rewards/consume` exists; no UI) — product decision, not UI polish (F19).
- Organization XLSX button (`/organization/challenges/:id/recycling-actions.xlsx` exists; no UI).
- Audit-log backend, editable Settings, Bins management — remain "information only" until built (F19).
- Note for the API team: the sponsored-review UPDATE writes `challenges.updated_at`; migration `sql/078_challenges_updated_at.sql` defines the column at `9aa8390`, so the UI path is safe at schema level — whether that migration is in the deploy pipeline is outside this review `[unverified]`.

---

## 10. Unsupported assumptions, unverified items and requests

- Pixel measurements quoted by the audit (691/461/730 px, 1,284/2,270 px) are consistent with the source but were not measured here; nothing in the plan depends on them.
- Runtime behaviour not exercised: `scrollIntoView` timing after the pane's `hidden` class is removed; inner-scroller position after `display:none`; popup-blocker behaviour for PDF blobs on iOS Safari; `next/image` remote behaviour; React hydration warning frequency from the language initialiser.
- API behaviour not verified beyond the cited lines: whether `PATCH /admin/challenges/:id` / `/admin/rewards/:id` accept partial bodies without clobbering; whether `PATCH /admin/rewards/unlocks/:id` accepts `active` for an expired unlock; whether editing an archived reward with `status:"paused"` un-archives it; server time zone for date-only `to` comparisons; pg serialisation of `DATE` for daily trends.
- Tests: the Playwright tests exist but `package.json` has no `test` script and no `playwright` dependency; how they are run locally was not determined. Recommendation in Phase 0.
- Brand, Partner and Organization: source-only review; no role session was available. Before Phase 7 ships, an authorised brand/partner test account walkthrough is required.
- No additional source files are needed for this stage. If Codex wants the per-cluster verification notes (structural maps, action inventories, line-by-line evidence) they are available on request as five markdown files produced during this review.

---

## Appendix A — File → phase map

| File | Phases |
|---|---|
| `components/crm/CrmShell.tsx` | 1, 8 |
| `components/crm/DashboardLanguage.tsx` | 8 (hydration fix, approve explicitly) |
| `components/crm/RecordDialog.tsx` (new), `lib/useUnsavedChanges.ts` (new), `lib/useListQueryState.ts` (new), `components/crm/Pager.tsx` (new) | 1 |
| `components/admin/AdminOutreachWorkspace.tsx` | 2 |
| `app/(dashboard)/admin/users/page.tsx`, `app/(dashboard)/admin/users/[id]/page.tsx`, `components/admin/AdminDetailWorkspaces.tsx` | 3 (user), 4 (challenge Edit), 5 (reward) |
| `components/admin/AdminChallengesWorkspace.tsx`, `app/(dashboard)/admin/challenges/page.tsx` | 4 |
| `components/admin/AdminRewardsWorkspace.tsx`, `components/admin/AdminRewardUnlocksWorkspace.tsx`, `components/admin/AdminNetworkWorkspaces.tsx` | 5 |
| `app/(dashboard)/admin/activity/page.tsx`, `app/(dashboard)/admin/moderation/page.tsx` | 6 |
| `components/brand/BrandProductsWorkspace.tsx`, `components/brand/BrandCrmWorkspaces.tsx`, `components/brand/SponsoredChallengeManager.tsx`, `components/admin/AdminReportsWorkspace.tsx` | 7 |
| `components/admin/AdminOverviewWorkspace.tsx`, `components/admin/AdminMapsWorkspace.tsx`, `components/partner/PartnerCrmWorkspace.tsx`, `components/organization/OrganizationChallengeWorkspace.tsx`, `components/crm/CrmPlaceholderPage.tsx`, `components/admin/AdminSystemWorkspaces.tsx` | 8 |

## Appendix B — Implementation notes for Codex

- `useSearchParams` consumers must sit under `<Suspense>` (pattern: `app/organization/invite/page.tsx:3,8`); page wrappers are server components with `params: Promise<{id}>` (`admin/users/[id]/page.tsx`).
- Tailwind v4 default breakpoints (`sm` 640, `md` 768, `lg` 1024, `xl` 1280); the shell splits at `lg`, Outreach at `xl`.
- `tests/emailPreview.browser.test.cjs:16-17` regex-asserts the iframe JSX shape: keep `<iframe … sandbox="" … referrerPolicy="no-referrer" … srcDoc={buildIsolatedEmailPreview` in that order and keep `dangerouslySetInnerHTML` absent from the file.
- `greenloop-api/src/routes/brand.ts` is treated as binary by `grep` (BOM/NUL inside a regex literal at `:74`); use `grep -a`.
- `tsconfig` is `strict: true`; the repo has no `test` script and no CI — record the `tsc` baseline before Phase 1.
- Do not delete "unused" styles, copy keys or code (repo rule); dead copy keys in Outreach (`actions.sending`, `list.title`, …) may simply become used.
