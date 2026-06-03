# Greenloop — Dashboard (web)

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 web dashboard. The repo lives at `~/greenloop-dashboard`.

Sibling repos — **do not edit them from this project:**

- Mobile app: `~/Documents/greenloop-app` (React Native / Expo)
- Backend API: `~/Documents/greenloop/greenloop-api`

If a request is actually about the mobile app or the API, stop and tell the user.

---

## Workflow contract (visual-only by default)

Same discipline as the mobile project: the user's role for Claude here is **UI / visual design drafts only** unless explicitly told otherwise. Past broad rewrites have caused regressions, so scope is tight.

**Never change without explicit ask:**

- Business logic, calculations, role/permission gating, reward/challenge logic, auth
- API calls (`lib/api.ts`, `lib/auth.ts`), request payloads, response parsing
- Routes under `app/(dashboard)/`, route group structure, dynamic-segment shapes
- Environment variables (`NEXT_PUBLIC_API_URL`)
- Data models or anything the API returns / expects

**For every screen / component change, follow this sequence:**

1. **Inspect** the relevant file(s) first.
2. **Identify** what's UI-only vs logic — call out the boundary.
3. **Propose** the scoped visual changes briefly (list of token swaps / Tailwind class edits / style block edits).
4. **Wait for approval** before editing. If unsure, ask.
5. Make **only scoped visual changes** in the smallest set of files.
6. **Preserve** all data fetching, handlers, role checks, and `<Link>` / `<button>` outer elements.
7. **Do not delete "unused" classes or imports.** Surprise deletions break trust. Dead code is fine.
8. After editing, run `npx tsc --noEmit` on touched files and report errors **for those files only**.
9. **Summarize** exactly which files changed and confirm everything was visual-only.

A normal pass touches one workspace or one component file. Bundling many workspaces into one edit is a smell — split it.

---

## Stack (current reality)

```
next                16.1.6     (App Router)
react / react-dom   19.2.3
typescript          ^5
tailwindcss         ^4         (@import "tailwindcss" + @theme inline)
recharts            ^3.7.0     charts
leaflet             ^1.9.4     base map
react-leaflet       ^5.0.0     React bindings
react-leaflet-cluster ^4.0.0   marker clustering
lucide-react        ^0.577.0   icons
```

**Don't add new dependencies for visual passes.** If a chart/map need feels unmet, ask first — these libs cover it.

---

## Project structure (current reality)

```
app/
  layout.tsx                  ← root layout (loads globals.css + leaflet css)
  page.tsx                    ← root landing
  globals.css                 ← Tailwind v4 + GL CSS vars
  login/
  (dashboard)/                ← route group sharing CrmShell chrome
    layout.tsx                ← wraps children in <CrmShell>
    admin/                    overview, activity, audit, bins, brands,
                              challenges, maps, moderation, partners,
                              products, reports, rewards, settings, users,
                              [...crm]
    brand/                    overview, challenges, maps, products,
                              reports, rewards, settings, [...crm]
    partner/                  overview, history, rewards, settings,
                              unlocks, [...crm]
components/
  AdminRecyclingHeatmap.tsx
  InfoTooltip.tsx
  RecyclingMap.tsx
  admin/                      Admin*Workspace.tsx (one per nav item)
  brand/                      Brand*Workspace.tsx (BrandTabs.tsx removed — sidebar nav covers it)
  partner/                    PartnerCrmWorkspace.tsx
  crm/                        CrmShell.tsx (shared chrome), CrmPlaceholderPage.tsx
lib/
  api.ts                      apiFetch() — central HTTP client
  auth.ts                     session / token handling
```

**Three audiences, three role surfaces:** `admin` (broadest), `brand`, `partner`. They share the `CrmShell` chrome but each has its own set of workspaces.

### `src/` is legacy — ignore

The repo also has a top-level `src/` directory with `main.tsx`, `pages/`, `layouts/`, etc. That's leftover Vite scaffolding from before this project moved to Next.js. **Nothing in `app/`, `components/`, or `lib/` imports from it.** Don't read it for patterns, don't edit it, don't reference it. If a request seems to require touching `src/`, stop and ask — it's almost certainly a misunderstanding.

---

## Design tokens (current `app/globals.css`)

```css
--gl-green:      #2d6a4f;
--gl-green-soft: #40916c;     /* (also defined as #edf7f2 earlier — duplicate, see "Known cleanups" below) */
--gl-bg:         #f8faf9;
--gl-border:     #e5e7eb;
--gl-radius:     12px;
--gl-shadow-sm:  0 1px 2px rgba(0,0,0,0.04);
--gl-shadow-md:  0 8px 20px rgba(0,0,0,0.06);
```

Body font: **Inter, system-ui, sans-serif**.

### Brand alignment — open question

The mobile app uses a richer palette anchored on `#15785A` (brand green) plus cream / amber / coral / lime / scanMint and a full ink scale. The dashboard currently uses a different green (`#2d6a4f`) and only four CSS variables. **Treat any cross-surface "brand" claim as unresolved** until the user confirms whether the dashboard should converge on the mobile palette or stay distinct. Don't silently change `--gl-green` to match mobile — ask.

Mobile palette for reference (do not import without approval):

| Token       | Hex       | Use (mobile)                   |
| ----------- | --------- | ------------------------------ |
| green       | `#15785A` | Brand green, primary CTAs      |
| greenDeep   | `#0F2B21` | Deep green, ink on green       |
| greenForest | `#0A1F18` | Hero backgrounds               |
| pageCream   | `#F3F0E2` | Page background                |
| ink         | `#14211B` | Primary text                   |
| amber       | `#F1A531` | EcoPoints, attention magnet    |
| coral       | `#C95B3E` | Community, Care                |

### Identity color per challenge type (locked on mobile)

Global = amber · Personal = green · Community = coral. If a dashboard view shows the same taxonomy (admin/brand challenges, etc.), reuse the convention.

---

## Brand voice & copy

Same tone as mobile: **warm, premium, calm. Human, not robotic.** Avoid aggressive AI/sparkle tropes and emoji clutter. The dashboard is a more functional surface than the consumer app, but the voice rule still applies to empty states, button labels, success/error toasts, and onboarding copy.

When copy is uncertain, prefer the mobile vocabulary already established ("EcoPoints", "items today", "Nice recycle"/"Nice haul" where contextual), and never invent new product terms without checking.

---

## Per-role quick reference

- **Admin** — broadest surface. Overview + ops (activity, audit, moderation), network (partners, brands, users, bins), content (challenges, products, rewards), analytics (maps, reports), settings. The `[...crm]` catch-all renders the CRM detail views via `CrmShell`.
- **Brand** — partner-facing self-serve. Overview, products, challenges, rewards, maps, reports, settings.
- **Partner** — collection-point operator. Overview, history, unlocks, rewards, settings. Smallest surface.

Workspace files live in `components/<role>/`. The route's `page.tsx` is normally a thin wrapper that renders the workspace component.

---

## Maps and charts

- **Maps** use `react-leaflet` + `react-leaflet-cluster`. Leaflet CSS is loaded once in `app/layout.tsx` — don't re-import it. Heatmap views: see `AdminRecyclingHeatmap.tsx`.
- **Charts** use `recharts`. Stick to its built-in components; don't pull in a second chart lib.

---

## Common pitfalls to avoid

- Editing `lib/api.ts` or `lib/auth.ts` during a visual pass. These are the HTTP and session boundary.
- Touching the `(dashboard)/layout.tsx` or `CrmShell` without an explicit "change the chrome" request — every role inherits from them.
- "Cleaning up" the duplicate `:root` block in `app/globals.css` mid-pass. It's a known cleanup (below), do it as its own change.
- Working in `src/` (the dead Vite scaffolding).
- Inventing new colors. Use the existing `--gl-*` vars; if a need feels unmet, ask before adding.
- Adding a new dep "to make this easier." Always ask first.

---

## Known cleanups (raise before doing them — never bundle into a visual pass)

- `app/globals.css` defines `:root` twice and `--gl-green-soft` resolves to two different colors (`#edf7f2` then `#40916c`). One should win. Ask before consolidating.
- `app/dashboard/` (no parens) exists as an empty directory alongside `app/(dashboard)/` (the route group). Likely intentional? Worth confirming.
- `src/` (entire directory) is dead Vite scaffolding. Removal needs an explicit ask.

---

## Verification

After editing, run a focused TS check on the touched files and report errors **for those files only**:

```bash
npx tsc --noEmit
```

(Until per-file scoping is set up, run the full check and grep for the touched file paths.) Report "0 new errors" or "TS unchanged at N pre-existing" — the absolute count is noisy on its own.

For visual changes, also start the dev server (`npm run dev`) when the user wants to eyeball the result, and call out the exact route to open (e.g. `/admin/overview`).

---

## Where Claude-authored docs go

Create `docs/claude/` at the repo root and put audits, design notes, proposals, mockups, and exploration there. Never the project root, never `docs/` root. Same convention as the mobile project.

---

## Cross-project boundaries (repeat, because it matters)

- This repo = **web dashboard** only.
- Mobile UI/3D/companion work → `~/Documents/greenloop-app` (it has its own `CLAUDE.md`).
- API / data shape / endpoint work → `~/Documents/greenloop/greenloop-api`.

If a request crosses these lines, stop and confirm before editing.
