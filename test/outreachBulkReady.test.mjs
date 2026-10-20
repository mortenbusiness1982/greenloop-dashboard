import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("components/admin/AdminOutreachWorkspace.tsx", "utf8");
const body = source.split("const approveAllVisibleDrafts = async () => {")[1]
  .split("\n  const deleteSelected")[0].replace(/;\s*$/, "");
const handler = `async () => {${body}`.replace(/apiFetch<OutreachMutationResponse>/g, "apiFetch");

test("bulk approval preserves proposals and only updates visible eligible drafts", async () => {
  const rows = [
    { id: "draft", status: "drafted", attachments: [{ filename: "proposal.pdf" }] },
    { id: "sent", status: "sent" },
  ];
  const requests = [];
  let emails = rows;
  const context = {
    getToken: () => "fixture",
    listEmails: rows,
    window: { confirm: () => true },
    c: { approveAllConfirm: String, approveAllDone: String },
    setAction() {}, setError() {}, setMessage() {},
    setEmails: (update) => { emails = update(emails); },
    apiFetch: async (url, options) => {
      requests.push({ url, options });
      return { email: { ...rows[0], status: "approved" } };
    },
  };
  await vm.runInNewContext(handler, context)();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/admin/outreach/emails/draft");
  assert.equal(requests[0].options.method, "PATCH");
  assert.equal(JSON.stringify(requests[0].options.body), '{"status":"approved"}');
  assert.deepEqual(emails[0].attachments, rows[0].attachments);
  assert.equal(emails[1].status, "sent");
});

test("cancelled confirmation makes no requests", async () => {
  let calls = 0;
  await vm.runInNewContext(handler, {
    getToken: () => "fixture", listEmails: [{ id: "draft", status: "drafted" }],
    window: { confirm: () => false }, c: { approveAllConfirm: String },
    apiFetch: () => { calls++; },
  })();
  assert.equal(calls, 0);
});

test("visible bulk button is confined to Drafts and disabled while busy or empty", () => {
  assert.match(source, /statusFilter === "drafted" && !sentArchiveOpen/);
  assert.match(source, /disabled=\{Boolean\(action\) \|\| listEmails.length === 0\}/);
  assert.match(source, /Move drafts to Ready to send/);
  assert.match(source, /Mover borradores a Listos para enviar/);
});
