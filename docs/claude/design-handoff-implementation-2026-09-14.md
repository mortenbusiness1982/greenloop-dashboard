# Claude design handoff: inspection and implementation

## Scope and verdict

Reviewed `GreenLoop Design New (13).zip` and `05-codex-prompt.md`, including the five handoff documents, tokens, component specifications, HTML/CSS references and rendered desktop/mobile examples. The package has selected high-fidelity prototypes and a 47-page coverage matrix, not a unique editable prototype for every route.

Agree with the compact CRM direction. Implemented a presentation-layer integration on `codex/claude-design-handoff`. Existing uncommitted dashboard work was preserved. No backend, API client, authentication, export data, email delivery or mobile-app changes. No deployment, commit or PR created.

This is not a claim of pixel-for-pixel completion of every proposal. The implemented changes and remaining design-only work are distinguished below.

## Shared changes

- 224px desktop sidebar; 56px tablet rail at 768-1099px; mobile drawer below 768px.
- Account and logout moved into sidebar footer. The mobile drawer traps keyboard focus, closes on Escape and restores focus to its trigger.
- Workspace-owned titles/actions render in the shared title bar through `WorkspaceHeader`. Handlers remain in their original components; there is no copied state or DOM mutation loop.
- 48px desktop title bar; mobile title/language row plus a wrapping action row when needed. Language remains reachable on every screen.
- Existing navigation and role separation preserved, including the Organization portal omitted from the supplied design. Active highlighting selects the most specific matching navigation link.
- Updated canvas/selection tokens, compact 13px operational text, 32px desktop controls, 44px mobile targets, visible keyboard focus, white working surfaces and joined KPI strips. Existing fonts retained; no new dependencies or remote font loading.
- Shared tables retain mobile stacked renderers. Tabs scroll horizontally rather than wrap. Existing loading, empty and error states remain.
- Muted text was not replaced wholesale with the prototype's pale grey-green. Existing more legible text colors remain. Card radii capped at 8px; letter spacing is zero.

## Route and component mapping

Paths in this table are repository-relative and were verified against the actual files.

| Actual route(s) | Implementation | Applied design |
| --- | --- | --- |
| `/admin/overview` | `components/admin/AdminOverviewWorkspace.tsx` | Shared title/actions, joined KPI strip; all ten metrics, activity and city diagnostics preserved |
| `/admin/users` | `app/(dashboard)/admin/users/page.tsx` | Desktop list/detail split, full-width mobile detail, Escape close, selected row; all support tabs/actions and filters retained |
| `/admin/users/[id]` | `components/admin/AdminDetailWorkspaces.tsx` | Shared header and dense shared detail/table styles; existing full-page record route retained |
| `/admin/activity` | `app/(dashboard)/admin/activity/page.tsx` | Shared title/export action, compact controls/table, existing events/daily/location panes |
| `/admin/moderation` | `app/(dashboard)/admin/moderation/page.tsx` | Both evidence photos visible on mobile, enlarge/original actions preserved, details initially open, differentiated approve/reject footer |
| `/admin/challenges` | `components/admin/AdminChallengesWorkspace.tsx` | Shared title, reusable desktop record split for requests/certificates/inventory, mobile single pane, challenge action menu, sticky editor Save/Cancel |
| `/admin/challenges/[id]` | `components/admin/AdminDetailWorkspaces.tsx` | Existing detail route and participant capabilities preserved |
| `/admin/leaderboards` | `components/admin/AdminLeaderboardsWorkspace.tsx` | Shared title/action bar and compact controls |
| `/admin/rewards` | `components/admin/AdminRewardsWorkspace.tsx` | Shared list and editor title bars; existing multi-pane editor, archive/restore and code pools retained |
| `/admin/rewards/[id]` | `components/admin/AdminDetailWorkspaces.tsx` | Shared detail header/table styles |
| `/admin/rewards/unlocks` | `components/admin/AdminRewardUnlocksWorkspace.tsx` | Shared title/export controls; existing detail/status workflow preserved |
| `/admin/outreach` | `components/admin/AdminOutreachWorkspace.tsx` | Shared title/actions; Proposals and Sent approvals archive view switcher; email/PDF preview and send safeguards unchanged |
| `/admin/products`, `/admin/brands`, `/admin/partners` | `components/admin/AdminNetworkWorkspaces.tsx` | Shared title/actions, dense KPI/table surfaces and mobile renderer |
| `/admin/brands/[id]`, `/admin/partners/[id]` | `components/admin/AdminDetailWorkspaces.tsx` | Shared record header/styles |
| `/admin/recycling-intelligence` | `components/admin/AdminRecyclingIntelligenceWorkspace.tsx`, `IntelligenceStatistics.tsx` | Summary / Improvements / Contributions & batches / Review queue; queue cards become full-width rows, all evidence/privacy warnings retained |
| `/admin/reports`, `/admin/reports/{platform,brands,users,geo,exports}` | `components/admin/AdminReportsWorkspace.tsx` | Shared title/actions, report hub becomes compact link list, joined KPI strips, original downloads unchanged |
| `/admin/reports/app-analytics` | `components/admin/AdminAppAnalyticsWorkspace.tsx` | Shared title/actions and existing analysis panes |
| `/admin/maps`, `/admin/maps/recycling-heatmap` | `components/admin/AdminMapsWorkspace.tsx` | Shared title/action bar and compact shared controls; map data/controls unchanged |
| `/admin/bins`, `/admin/settings`, `/admin/audit` | `components/admin/AdminSystemWorkspaces.tsx` | Shared title/actions, KPI/table styles; existing available capabilities only |
| `/brand/products` | `app/(dashboard)/brand/products/page.tsx`, `components/brand/BrandProductsWorkspace.tsx` | Shared title and existing catalog operations; no product/API rewrite |
| `/brand/overview`, `/brand/rewards`, `/brand/challenges`, `/brand/maps`, `/brand/settings` | `components/brand/BrandCrmWorkspaces.tsx` | Shared title/actions, metric/table styles; scoped data preserved |
| `/brand/reports`, `/brand/reports/{recycling,campaigns,behavior,geo,exports}` | `components/brand/BrandCrmWorkspaces.tsx` | Route-based report switcher and shared layout. Links remain links, not fake in-page tabs |
| `/partner/{overview,rewards,unlocks,history,settings}` | `components/partner/PartnerCrmWorkspace.tsx` | Shared shell; overview has unlocks/rewards/history tabs with existing counts; full unlock route retained |

Editors are modes inside existing workspaces; the design's `/.../:id/edit` labels are not new routes. Report deep links and the two real partner overview/unlocks routes remain distinct. Organization, invitation and local curation-preview entry points remain available.

## Decision register

| Handoff item | Resolution |
| --- | --- |
| Overview period | No new period control or API parameter; current metric definitions retained |
| Needs-attention overview block / sidebar pending counts | Omitted: shell has no shared authoritative count source; did not introduce extra requests or partial counts |
| Activity status | Existing status renderers retained; no inferred validation state |
| Approve all low | Existing bulk actions retained with their exact scopes/confirmations; not relabeled as low-risk-only |
| Skip / Flag | Omitted; no new flag-writing or deferred-review semantics |
| Duplicate challenge | Omitted; no supported existing duplicate action wired |
| Challenge progress | Existing shared progress and required count retained; no fabricated participation numbers |
| Recent exports | Omitted; report hub uses real links without fake history |
| Partner Scan / per-row Redeem | Omitted; current `PartnerCrmWorkspace` has read-only fulfillment tables, not the scanner/prefilled redeem capability assumed by the prototype |
| User row selection/export | No new selection column. Existing CSV continues to export all filtered users, not just visible page rows |
| Dirty-state Save disabling | Existing per-form rules retained; no invented dirty tracking or unsaved prompts |
| Brand privacy | Brand screens keep anonymous/user IDs. Fixture tests explicitly reject user email/name exposure |

## Preserved action placement

- Export/refresh/new commands move with their original handlers to the shared header. Existing report-specific export buttons remain in context.
- User point adjustment, password, avatar reset, account edits, activation, challenge removal and history stay in the existing support tabs.
- Challenge Edit, Change image and View record remain visible. Activate/deactivate and Delete move into the Challenge actions menu; deletion still uses the existing confirmation.
- Request review/publishing and certificate recipient metadata, preview/PDF/XLSX actions remain in their respective record panes.
- Moderation photo enlargement and original-file links remain separate real actions. Original bulk scopes and approval/rejection request payloads remain unchanged.
- Outreach archive becomes a view choice; existing back/close controls remain as additional exits. No changes to sending, recipients, retry rules or PDF handling.

## Deliberate differences / remaining design-only work

- Record selection stays in the current workspace's state; existing full-page record links are retained. Universal URL-backed split panes and query-backed tab persistence are not implemented. They need a separate routing/state migration, rather than silently changing deep-link behavior.
- Desktop split panes are implemented for Users and Challenges. Rewards, unlocks, products and network records retain their previously working detail modes/full-page routes inside the new shell. A universal pane migration remains.
- Native date inputs and existing live filter timing remain. Combined date presets, mobile filter bottom sheets and removable chips are not implemented.
- Existing form field order and validation are preserved; challenge Save/Cancel is sticky, but the full proposed fieldset reordering is not implemented.
- Existing browser confirmations remain. A universal styled confirmation dialog, destructive-menu migration across every module and new dirty tracking are not included.
- Intelligence uses compact rows rather than a compressed table, preserving source, missing-field and privacy warnings for each product.
- All ten Overview metrics stay visible as a joined strip, rather than changing their meaning by combining primary values and sub-values.
- Maps retain the actual map/heatmap routes and existing panes rather than route consolidation. Partner overview/unlocks are not merged into one URL.
- Existing loaders remain; not every table has been replaced with a skeleton primitive. Header actions may use a second row on mobile instead of hiding labels behind icons.
- Exact 40px rows are not enforced for multiline records; content can grow without clipping. In the narrow desktop user split, secondary columns remain accessible in the selected user's detail/full record and in the full-width list/export.

## Verification

- Production build and TypeScript pass: 53 statically generated routes plus existing dynamic routes.
- Focused lint for shared shell, new components and migrated workspaces: no errors. Intelligence retains one pre-existing unused `latestUpdated` warning.
- Cross-role browser suite: 37 additional routes at 390px and 1440px, English and Spanish; navigation, visible charts, no horizontal page overflow, brand user-identity privacy.
- Admin workflow suites cover overview, users, activity, moderation, challenges, leaderboards, rewards, unlocks and outreach with intercepted/mock API responses. Request payload and export-content assertions remain.
- Intelligence tests cover individual review, partial bulk success, retained failed selections, data freshness, product photos, filter choices and new tab navigation.
- 41 unit tests pass for bulk review, curation monitoring and sponsored submissions.
- Dedicated shell tests cover 390px drawer focus/Escape, 900px icon rail, 1440px sidebar, single visible title and language switching.
- No emails sent and no production account/data mutations in verification. Device checks are browser emulation, not physical iOS/Android keyboard testing.

## Visual evidence

Reference images: `/private/tmp/greenloop-claude-design-v13/dashboard/handoff/screens/`.

Implemented screenshots are generated by the checked-in browser harnesses:

- `/private/tmp/greenloop-workspaces-check/`: all 37 additional routes at 390/1440 in EN/ES.
- `/private/tmp/greenloop-users-check/`: list and every user pane, including long names and email addresses.
- `/private/tmp/greenloop-moderation-check/`: queue, both photos and expanded viewer, EN/ES.
- `/private/tmp/greenloop-challenges-check/`: requests, certificates, inventory, editor and selected panes.
- `/private/tmp/greenloop-overview-check/`: metrics, city attribution, loading/empty/error states.
- Other admin harnesses save corresponding activity, rewards, unlocks and outreach captures under their `TEST_SCREENSHOT_DIR` defaults.

These are test-fixture screenshots, not live customer records. They are not all pixel-aligned comparisons at identical widths: the main role sweep uses the 1440/390 references; earlier detailed workflow harnesses also cover 360/375/768/1280/1512.
