# Local review usability verification — 2026-09-10

Verified with agent-browser and Chrome against the dev-only `/curation-preview` page on 127.0.0.1:3097, API fixture on 127.0.0.1:8097 and an isolated PostgreSQL schema. No production authentication, writes, publication or paid enrichment.

- English 390×844: compact overview, green overall progress, four honest latest-batch metrics, three linked products. No horizontal overflow.
- English 1280×900: MAHOU proposal opens, current and reviewed values side by side, exact Consum source href, no mutation controls. Real saved MAHOU value is distinct from the absent current brand and is labelled unpublished.
- Spanish 390×844: localized summary, counts, statuses, controls and packaging enum labels. Original evidence remains in its recorded language. No horizontal overflow.
- Fanta opens identity conflict with saved Coca-Cola evidence; milk queue row opens explicit missing-authoritative-evidence and missing-photo states. An image submitted against a barcode is not asserted to establish identity.
- Tónica displays its actual available OFF photo (complete and naturalWidth > 0), safe external links and no Apply/Approve/Publish controls. Authenticated storage access is separately covered by isolated API tests.
- See all opens 20 history rows; next page opens the final 2 rows with disabled Next and enabled Previous. Back restores latest batch. Expanded fixture history is synthetic.
- In an open Tónica review, toggling only `/fixture-change` and waiting for the 30-second poll preserves the existing title and shows a new-evidence alert. The summary changes from synthetic 60/100 to 61/100 automatically. Explicit Load latest evidence changes the title while preserving the open dialog. The fixture was reset afterward.
- Close restores keyboard focus to the opening button. Escape dismissal was checked in English; native dialog provides modal focus containment. Programmatic browser clicks explicitly focus their opener for focus-return assertions.
- Pure unit tests cover coalesced manual refresh, polling/focus/online refresh, retained last-good state on failures, cancellation, unknown outcome counts, zero denominators, invalid totals, specific statuses, missing names and safe full links.

Screenshots are saved locally at `/Users/nina/AI/GreenLoop/tmp/curation-review-usability/`: mobile-overview.png, desktop-overview.png, desktop-proposal.png, mobile-conflict.png, mobile-spanish.png, mobile-spanish-proposal.png, mobile-spanish-stale.png. Synthetic catalogue totals must not be represented as production metrics.

Some agent-browser native clicks did not dispatch to offscreen controls; these were checked through focused DOM activation and fresh snapshots instead. One browser session became unresponsive and was replaced by an isolated session. This is recorded as tooling behavior, not a production check. Production dashboard authentication and ordinary mobile-app scan verification remain separate outstanding checks.
