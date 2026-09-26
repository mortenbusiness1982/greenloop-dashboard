# Outreach contact job title

Adds Job title / Cargo to Contact, the contact summary, proposal summaries and local search. Values are stored as metadata.contact_job_title through the existing save endpoint; no schema or send-workflow change.

Existing explicit contact_title, job_title, lead_title, contact.job_title/title, person.title, apollo_person.title and apollo.person.title values are supported. These are compatibility paths, not confirmation that the current importer populates each one. Generic metadata.title and role are intentionally not interpreted as a person's job title. An explicit cleared dashboard title suppresses imported fallback values.

Three unit tests passed, covering compatible shapes, malformed/missing values, overrides, clearing and preservation of unrelated metadata. No real emails or contact records were changed during verification.

Follow-up after explicit Studio authorization: verified the canonical writer at /Users/nina/AI/Nina/bin/nina-greenloop-dashboard-drafts.js. It already resolves verified contact names and emails, and requires metadata.contact_role. The dashboard now reads that existing role, filters unknown placeholders, and labels the field Job title / contact role to avoid presenting a department as a personal title.

The active Studio writer now also persists contact_title and contact_title_source directly from the verified recipient reference. Existing recipient binding, approval and sending gates remain unchanged. All 16 outreach end-to-end tests passed, including title persistence assertions; the three dashboard helper tests also passed.

Read-only production audit: 206 total records, 28 active proposals (drafted/approved/saved_for_later), 26 with usable stored contact roles, one unknown role and one missing role. Four exact recipient-email matches in the fresh verified Apollo cache; no cached title for the two missing/unknown entries. No fresh paid Apollo enrichments, no production record writes and no email sends. Existing titles appear through the corrected read mapping, without a database migration/backfill.

Based on the restored dashboard working source, not an old Git snapshot. Copy changes back to the canonical dashboard repository before subsequent releases.
