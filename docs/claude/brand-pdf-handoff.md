# Brand PDF + Impact Certificate PDF — backend handoff

**Status:** spec only. This work lives in the **backend API repo** (`~/Documents/greenloop/greenloop-api`), which the dashboard project must not edit. Do this in a session rooted at the API repo.

**Goal:** make the generated PDFs use the current GreenLoop logo (the green "G in a circle" mark) and align their colors to the canonical brand green. Presentation only — do not change any data aggregation, queries, routes, metric sets, or column sets.

---

## Canonical brand reference (from the dashboard)

- Brand green: `#15785A` · deep: `#0F2B21` · forest: `#0A1F18`
- Cream page: `#F3F0E2` · paper: `#FFFFFF` · card cream: `#FCFCF8`
- Ink: `#14211B` · ink-soft: `#3D4A43` · ink-muted: `#6C8077`
- Amber accent: `#F1A531` (ink `#7A4E00`) · Coral: `#C95B3E` (ink `#7A2E18`)
- Current logo = the green "G in a circle" mark (NOT the older triquetra symbol).

**PDFKit constraint:** `doc.image()` supports **PNG and JPEG only — not SVG.** The logo must be supplied as a PNG (or JPG). Export the official "G in a circle" mark to PNG and place it in `greenloop-api/assets/` (suggested name `greenloop-mark.png`).

---

## File 1 — Brand report PDF: `src/services/brandPdf.ts`

Current state:
- Header draws the **old triquetra** symbol: `SYMBOL_LOGO_PATH = assets/greenloop-symbol-green.png` (~line 28), with `FALLBACK_LOGO_PATH = assets/greenloop-logo.jpg` (~line 29). Drawn via `doc.image(...)` at ~lines 52 and 59.
- Color palette uses `primary: "#0F6E56"` / `primaryDark: "#085041"` (~lines 7–8) — a different green from the canonical `#15785A`.

Changes:
1. Add `assets/greenloop-mark.png` (the G-in-circle PNG).
2. Repoint `SYMBOL_LOGO_PATH` to the new mark. Keep the fallback logic. Re-check the `fit:` dimensions so it sits correctly in the header.
3. Swap the palette to the canonical green: `primary: "#15785A"`, `primaryDark: "#0F2B21"`. Leave amber/coral accents as-is if present.
4. Regenerate a sample via `/brand/export/report.pdf` and eyeball the header + colors.

## File 2 — Impact certificate PDF: `src/services/impactCertificatePdf.ts`

Current state:
- Already uses `green: "#15785A"` (~line 47) — **palette is already correct, no color change needed.**
- **No logo is drawn currently** — the header is text-only ("GreenLoop Sustainability Impact Certificate").

Changes:
1. Add the G-in-circle logo to the header (use the same `assets/greenloop-mark.png`).
2. Optional polish: tighten header hierarchy so the recipient/organization name remains the focal point.
3. **Do not change** the footer text — it must stay exactly: `Generated from verified GreenLoop recycling activity.`
4. **Do not change** the certificate's metric set, column set, row granularity, or any aggregation.

---

## Hard guardrails

- No changes to SQL, routes, query logic, request/response shapes, or the data the PDF receives.
- Visual/drawing only.
- Follow the API repo's own CLAUDE.md / conventions.
- Run the repo's build/test before shipping.
