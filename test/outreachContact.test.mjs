import test from "node:test";
import assert from "node:assert/strict";
import { getContactTitle, withContactTitle } from "../lib/outreachContact.ts";

test("reads explicit contact title fields and saved Apollo person titles", () => {
  for (const metadata of [
    { contact_title: " Director " }, { job_title: "Director" },
    { lead_title: "Director" }, { contact_role: "Director" }, { contact: { title: "Director" } },
    { contact: { job_title: "Director" } }, { person: { title: "Director" } },
    { apollo_person: { title: "Director" } }, { apollo: { person: { title: "Director" } } },
  ]) assert.equal(getContactTitle(metadata), "Director");
});

test("does not confuse campaign titles or account roles with a person's title", () => {
  for (const metadata of [null, [], "Director", { title: "Campaign", role: "admin" }, { job_title: 123 }, { contact: [] }, { contact_role: "unknown" }]) {
    assert.equal(getContactTitle(metadata), "");
  }
});

test("saves overrides, preserves research metadata and allows clearing imported titles", () => {
  const original = { contact_title: "Director", research_notes: "Keep", apollo: { person: { title: "Director" } } };
  assert.equal(withContactTitle(original, "Director"), original);
  const edited = withContactTitle(original, " Head of partnerships ");
  assert.equal(getContactTitle(edited), "Head of partnerships");
  assert.deepEqual(edited.apollo, original.apollo);
  assert.equal(edited.research_notes, "Keep");
  assert.equal(getContactTitle(withContactTitle(edited, "")), "");
  assert.equal(getContactTitle(original), "Director");
  assert.deepEqual(withContactTitle({}, ""), {});
});
