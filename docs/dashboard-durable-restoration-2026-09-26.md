# Durable dashboard design restoration

Production deployment dpl_B1HrWWAsXL9T6TVkp2e4Gup2thib came from Git main
at e0d396b. The approved CRM design was still uncommitted on the MacBook's
codex/claude-design-handoff checkout. Git deployments therefore legitimately
rebuilt the older source and replaced the manually restored design.

This restoration starts at e0d396b and three-way merges the approved working
design. The public community review endpoint, pending queue, and approve/reject
actions are retained in the compact layout. Invitation localization, signup
location fields, contact titles, and sandboxed email previews remain intact.
The original MacBook checkout is not reset or overwritten.

The shared Git source now contains the design and its browser regression tests.
Every normal npm build checks the shell/layout and moderation contract.
npm run release:check additionally rejects dirty or stale release checkouts.
Use normal fast-forward Git publication; never force-push an older Studio branch.

These checks do not prevent an authorized operator from manually promoting an
old Vercel artifact or bypassing the normal build command. Such rollbacks require
explicit review of the design and functional changes they would remove.

Local verification: production build including TypeScript and 53 static pages
passed; 47 focused unit/contract checks and 4 sponsored-submission checks passed.
Changed TypeScript/TSX/MJS lint has no errors (one pre-existing unused-variable
warning). Full-repository lint has legacy failures; it is not claimed as passing.
Fresh visual verification requires the Mac to be unlocked.
