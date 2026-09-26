# Dashboard release safety

The approved CRM design is part of the source tree, not a deployment-only overlay.
Keep the shared CrmShell CSS module, WorkspaceHeader portal, responsive navigation,
and record-detail workspaces when making feature changes.

Before releasing, fetch origin and integrate current origin/main into the release
branch. Never publish a stale Studio checkout or an old temporary snapshot over
production. Do not overwrite or discard dirty work in either Mac's checkout.

Production normally deploys from Git main in the existing Vercel project:
prj_V6lzNrRHdqfjQKtkeFUKmpWcFgna / team_TfhIEuQF3ChfzfFXLAkvSZJj.
Both dashboard.greenloopapp.com and join.greenloopapp.com use that project.
Run npm run release:check (requires a clean checkout containing current main,
then runs the build and design contract) and relevant tests before push.
Verify the resulting production commit and both dashboard/invitation routes.

Do not bypass design tests to deploy. For an intentional redesign, obtain owner
approval and update visual tests and the contract together. Do not roll back to a
pre-restoration artifact merely to release an unrelated feature.
