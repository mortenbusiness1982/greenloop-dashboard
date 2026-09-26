/* eslint-disable @typescript-eslint/no-require-imports -- Standalone mocked browser test. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_DASHBOARD_ORIGIN || "http://localhost:3000";
const output = "/private/tmp/greenloop-outreach-check";
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of process.env.TEST_WIDTH ? [Number(process.env.TEST_WIDTH)] : [360, 390, 768, 1512]) {
      const page = await browser.newPage({ viewport: { width, height: width < 400 ? 740 : 900 } });
      const errors = [], writes = [];
      let saveFailure = false, sendFailure = "";
      const emails = Array.from({ length: 18 }, (_, i) => ({
        id: "email" + i, lead_email: `person${i}@example.invalid`, lead_name: "Alex Smith",
        organization_name: "Fixture Organization " + i, audience_type: "school", campaign_name: "Fixture September",
        subject: "A local recycling proposal " + i, html_body: '<!doctype html><html lang="es"><meta charset="utf-8"><title>Fixture proposal</title><style>p{line-height:1.55}</style><p>Fixture email body</p></html>',
        status: i === 4 ? "sent" : i >= 1 && i <= 3 ? "approved" : "drafted",
        created_at: "2026-09-14T10:00:00Z", sent_at: i === 4 ? "2026-09-14T11:00:00Z" : null,
        resend_email_id: i === 4 ? "fixture-resend4" : null,
        attachments: [{ filename: "Fixture proposal.pdf", content: Buffer.from("%PDF-1.4\nFixture PDF\n%%EOF").toString("base64"), content_type: "application/pdf" }],
        metadata: { why_this_lead: "A researched community opportunity", priority: 9, confidence: 8, research_notes: "Fixture notes", source_links: ["https://example.invalid/research"] },
      }));
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin === origin) return route.continue();
        const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS" };
        if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
        if (req.resourceType() === "image") return route.fulfill({ contentType: "image/jpeg", body: fs.readFileSync(path.join(__dirname, "../public/greenloop-logo.jpg")) });
        if (!url.pathname.startsWith("/admin/outreach/emails")) return route.abort();
        if (url.pathname === "/admin/outreach/emails" && req.method() === "GET") {
          assert.equal(url.searchParams.get("view"), "summary");
          return route.fulfill({ headers, json: { ok: true, emails: emails.map((row) => ({ ...row, html_body: null })) } });
        }
        const id = url.pathname.split("/")[4];
        const row = emails.find((email) => email.id === id);
        if (req.method() === "GET") return route.fulfill({ headers, json: { ok: true, email: row } });
        const body = req.postData() ? req.postDataJSON() : null;
        writes.push({ path: url.pathname, method: req.method(), body });
        if (saveFailure || (url.pathname.endsWith("/send") && id === sendFailure)) return route.fulfill({ status: 500, headers, json: { error: "Fixture operation failed" } });
        let result = row;
        if (req.method() === "POST" && url.pathname === "/admin/outreach/emails") {
          result = { ...emails[0], ...body, id: "created" + writes.length }; emails.push(result);
        } else if (url.pathname.endsWith("/send")) {
          assert.equal(row.status, "approved", "Only approved rows can be sent");
          Object.assign(row, { status: "sent", sent_at: "2026-09-14T12:00:00Z", resend_email_id: "fixture-resend-" + id });
        } else if (req.method() === "DELETE") Object.assign(row, { status: "deleted" });
        else Object.assign(row, body);
        return route.fulfill({ headers, json: { ok: true, email: result, id } });
      });
      await page.addInitScript(() => {
        if (window.top !== window) return;
        localStorage.setItem("greenloop_jwt", "fixture." + btoa(JSON.stringify({ role: "admin", email: "admin@example.invalid", exp: 4102444800 })) + ".fixture");
        localStorage.setItem("greenloop_dashboard_language", "en");
        window.openedAttachments = [];
        const click = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
          if (this.target === "_blank") { window.openedAttachments.push(this.href); return; }
          return click.call(this);
        };
      });
      await page.goto(origin + "/admin/outreach");
      const button = (name) => page.getByRole("button", { name, exact: true });
      const tab = (id) => page.locator("#outreach-tab-" + id).click();
      const list = page.getByRole("region", { name: "Proposals", exact: true });
      await list.getByRole("button").first().waitFor();
      await page.screenshot({ path: path.join(output, `draft-list-${width}.png`), fullPage: true });
      await button("Open proposal Fixture Organization 0").click();
      const panel = page.locator("#outreach-editor-panel");
      await panel.waitFor();
      await button("Fixture proposal.pdf · Open PDF").click();
      const attachment = await page.evaluate(async () => fetch(window.openedAttachments.at(-1)).then((response) => response.text()));
      assert.ok(attachment.startsWith("%PDF-1.4"), "Base64 attachment still opens as a PDF blob");
      assert.equal(await panel.locator("iframe").getAttribute("sandbox"), "");
      await panel.frameLocator("iframe").getByText("Fixture email body", { exact: true }).waitFor();
      const initialFrame = await panel.locator("iframe").elementHandle();
      assert.equal(await button("Send approved email").isDisabled(), true);
      await tab("message");
      await page.getByLabel("Subject", { exact: true }).fill("Edited fixture subject");
      await page.getByLabel("Edit message", { exact: true }).fill("Fixture edited body\n\nSecond paragraph");
      await tab("contact");
      await page.getByLabel("Contact name", { exact: true }).fill("Alex Edited");
      await tab("research");
      await page.getByLabel("Research notes", { exact: true }).fill("Updated fixture research");
      await tab("preview");
      assert.ok((await panel.innerText()).includes("Edited fixture subject"));
      assert.ok((await panel.locator("iframe").getAttribute("srcdoc")).includes("Fixture edited body"));
      assert.equal(await initialFrame.evaluate((frame) => frame.isConnected), false, "Body changes replace the preview document, including in WebKit");
      await panel.frameLocator("iframe").getByText("Fixture edited body", { exact: true }).waitFor();
      assert.equal(await panel.frameLocator("iframe").getByText("No email message yet.").count(), 0);
      saveFailure = true;
      await button("Save changes").press("Enter");
      await page.getByRole("alert").getByText("Fixture operation failed").waitFor();
      await tab("message");
      assert.equal(await page.getByLabel("Subject", { exact: true }).inputValue(), "Edited fixture subject");
      saveFailure = false;
      await button("Approve draft").click();
      await button("Send approved email").waitFor({ state: "visible" });
      await page.waitForFunction(() => !Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "Send approved email").disabled);
      const approved = writes.at(-1);
      assert.equal(approved.body.status, "approved");
      assert.equal(approved.body.lead_email, "person0@example.invalid");
      assert.equal(approved.body.metadata.research_notes, "Updated fixture research");
      assert.equal(approved.body.attachments[0].filename, "Fixture proposal.pdf");
      await button("Send test").click();
      await page.getByRole("status").filter({ hasText: "Test email sent" }).waitFor();
      const testCreate = writes.at(-2);
      assert.equal(testCreate.body.lead_email, "mortenbusiness@gmail.com");
      assert.equal(testCreate.body.metadata.original_recipient_email, "person0@example.invalid");
      assert.equal(testCreate.body.metadata.test_copy, true);
      assert.equal(writes.at(-1).method, "POST");
      const before = writes.length;
      page.once("dialog", (dialog) => dialog.dismiss());
      await button("Send approved email").click();
      assert.equal(writes.length, before);
      for (const lang of ["en", "es"]) {
        if (lang === "es") await button("ES").click();
        for (const pane of ["preview", "contact", "message", "research"]) {
          await tab(pane);
          await page.evaluate(() => window.scrollTo({ top: 0 }));
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          await page.screenshot({ path: path.join(output, `${pane}-${width}-${lang}.png`), fullPage: true });
        }
      }
      await button("EN").click();
      await button("Back to proposals").click();
      await page.getByText(/^Bulk actions/).click();
      await page.getByRole("button", { name: /^Select all ready/ }).click();
      assert.equal(await list.getByRole("checkbox").count(), 4);
      sendFailure = "email3";
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: /^Send selected \(4\)/ }).click();
      await page.getByRole("button", { name: /^Send selected \(1\)/ }).waitFor();
      assert.equal(emails.filter((email) => ["email0", "email1", "email2"].includes(email.id) && email.status === "sent").length, 3);
      sendFailure = "";
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: /^Send selected \(1\)/ }).click();
      await page.getByRole("status").filter({ hasText: "1 approved emails sent" }).waitFor();
      await button("New draft").click();
      await page.getByLabel("Organization name", { exact: true }).fill("New Fixture Org");
      await page.getByLabel("Real recipient email", { exact: true }).fill("new@example.invalid");
      await tab("message");
      await page.getByLabel("Subject", { exact: true }).fill("New fixture");
      await page.getByLabel("Edit message", { exact: true }).fill("New fixture message");
      await button("Create draft").click();
      await page.getByRole("status").filter({ hasText: "Draft created." }).waitFor();
      assert.equal(writes.at(-1).body.status, "drafted");
      await button("Save for later").click();
      await page.getByRole("status").filter({ hasText: "Draft saved for later." }).waitFor();
      await button("Disregard draft").click();
      await page.getByRole("status").filter({ hasText: "Draft moved to disregarded" }).waitFor();
      page.once("dialog", (dialog) => dialog.accept());
      await button("Delete draft").click();
      await page.getByRole("status").filter({ hasText: "1 outreach records deleted" }).waitFor();
      await button("Back to proposals").click();
      await page.getByRole("button", { name: /^Sent \(/ }).click();
      await page.getByRole("heading", { name: "Sent approvals archive" }).waitFor();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(output, `archive-${width}.png`), fullPage: true });
      await button("Fixture Organization 4").click();
      await panel.waitFor();
      assert.equal(await button("Send approved email").isDisabled(), true);
      assert.equal(await button("Save changes").isDisabled(), true);
      await button("Back to proposals").click();
      await page.screenshot({ path: path.join(output, `list-${width}.png`), fullPage: true });
      assert.deepEqual(errors, []);
      console.log(`PASS outreach ${width}px: panes, PDF blob, isolated preview, payloads, test/real-send safeguards, bulk retries, create/later/disregard/delete, sent archive, EN/ES`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
