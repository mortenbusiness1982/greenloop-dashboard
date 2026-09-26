/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser regression check. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_DASHBOARD_ORIGIN || "http://localhost:3000";
const output = process.env.TEST_SCREENSHOT_DIR || "/private/tmp/greenloop-challenges-check";

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const [width, height] of [[375, 667], [390, 844], [768, 900], [1512, 900]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [], writes = [], downloads = [], confirms = [];
      let accept = true, failSave = false, mode = "ready";
      let challenges = Array.from({ length: 31 }, (_, i) => ({
        id: "c" + i, title: "Fixture challenge " + String(i).padStart(2, "0"), description: "A fixture challenge description.",
        challenge_type: i % 3 === 0 ? "community" : i % 3 === 1 ? "global" : "personal", target_kind: "any",
        required_count: 300, bonus_points: 50, shared_progress_count: 100, active: true,
        starts_at: "2026-09-01T10:00:00Z", ends_at: "2027-09-30T10:00:00Z",
        certificate_recipient_name: "Fixture school", certificate_recipient_type: "school", certificate_enabled: true,
        owner_user_id: "owner1", owner_display_name: "Fixture Owner", owner_email: "owner@example.invalid",
        completion_reward_id: "reward1", completion_reward_title: "Fixture reward",
        hero_image_url: "https://fixture.invalid/challenge.jpg",
      }));
      challenges[0].description = "A long description that must stay readable on a narrow phone screen, without truncating the challenge details.";
      let requests = Array.from({ length: 20 }, (_, i) => ({
        id: "r" + i, challenge_name: "Fixture request " + i, community_name: "Fixture school", community_type: "school",
        target_items: 500, description: "Collect and recycle together.", start_date: "2026-09-01", end_date: "2027-09-01",
        contact_name: "Fixture Contact", contact_email: "long-contact-address-for-layout@example.invalid", status: "pending", city: "Benalmadena", created_at: "2026-09-14", admin_notes: "",
      }));
      const sponsored = [{ id: "s1", title: "Fixture sponsored challenge", sponsor_brand_name: "Fixture Brand", review_status: "pending_review", required_count: 100, reward_title: "Sponsor reward", redemption_type: "link_only", starts_at: "2026-09-01", ends_at: "2027-09-01" }];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("dialog", async (dialog) => { confirms.push(dialog.message()); if (accept) await dialog.accept(); else await dialog.dismiss(); });
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        if (route.request().resourceType() === "image") return route.fulfill({ contentType: "image/jpeg", body: fs.readFileSync(path.join(__dirname, "../public/greenloop-logo.jpg")) });
        const method = route.request().method(), endpoint = url.pathname;
        const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS" };
        if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
        let json = {};
        if (method !== "GET") {
          const body = route.request().postDataJSON(); writes.push({ method, endpoint, body });
          if (failSave) return route.fulfill({ status: 500, headers, json: { error: "Fixture save failed" } });
          if (endpoint === "/admin/challenges/generate-image") json = { url: "https://fixture.invalid/generated.jpg" };
          else if (endpoint === "/admin/challenges" && method === "POST") { challenges.push({ ...body, id: "new", active: true }); }
          else if (/^\/admin\/challenges\/[^/]+\/toggle$/.test(endpoint)) { const c = challenges.find((c) => endpoint.includes("/" + c.id + "/")); c.active = !c.active; }
          else if (/^\/admin\/challenges\/[^/]+$/.test(endpoint)) {
            const id = endpoint.split("/").at(-1);
            if (method === "DELETE") challenges = challenges.filter((c) => c.id !== id);
            else Object.assign(challenges.find((c) => c.id === id), body);
          } else if (endpoint.startsWith("/admin/challenge-requests/")) {
            const r = requests.find((r) => endpoint.endsWith("/" + r.id));
            Object.assign(r, body);
            if (body.status === "approved") { r.status = "converted"; r.approved_challenge_id = "c0"; }
            json = { request: r, emailSent: true };
          } else if (endpoint === "/admin/sponsored-challenges/s1/review") { sponsored[0].review_status = body.status; sponsored[0].sponsor_review_notes = body.notes; }
          else throw Error("Unexpected write " + endpoint);
        } else if (endpoint.startsWith("/impact/")) {
          if (url.searchParams.get("format") === "pdf" || endpoint.endsWith(".xlsx")) {
            downloads.push(endpoint + url.search);
            return route.fulfill({ headers, contentType: endpoint.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf", body: Buffer.from("fixture-download") });
          }
          json = { challenge: { id: "c0", title: challenges[0].title, type: "community", status: "ongoing" }, recipient: { name: "Updated school", type: "school" }, metrics: { totalRecyclingEvents: 10, totalProductsRecycled: 100, estimatedCO2Saved: 2.5, uniqueParticipants: 4, startDate: "2026-09-01", endDate: "2027-09-30" }, generatedAt: "2026-09-14" };
        } else {
          if (mode === "error") return route.fulfill({ status: 500, headers, json: { error: "Fixture data unavailable" } });
          if (endpoint === "/admin/challenges") json = { challenges: mode === "empty" ? [] : challenges };
          else if (endpoint === "/admin/challenge-requests") json = { requests: mode === "empty" ? [] : requests };
          else if (endpoint === "/admin/sponsored-challenges") json = { challenges: mode === "empty" ? [] : sponsored };
          else if (endpoint === "/admin/rewards") json = { rewards: [{ id: "reward1", title: "Fixture reward", active: true, acquisition_mode: "challenge_completion" }] };
          else if (endpoint === "/admin/brands") json = { brands: [{ id: "brand1", name: "Fixture Brand" }] };
          else if (endpoint === "/admin/users") json = { users: [{ id: "owner1", display_name: "Fixture Owner", email: "owner@example.invalid" }, { id: "owner2", display_name: "New Owner", email: "new@example.invalid" }] };
          else return route.abort();
        }
        return route.fulfill({ headers, json });
      });
      await page.addInitScript(() => { localStorage.setItem("greenloop_jwt", "fixture." + btoa(JSON.stringify({ role: "admin", email: "admin@example.invalid", exp: 4102444800 })) + ".fixture"); localStorage.setItem("greenloop_dashboard_language", "en"); });
      await page.goto(origin + "/admin/challenges");
      const pane = page.locator("#challenge-workspace"), editor = page.locator("#challenge-editor");
      await page.getByRole("button", { name: "Open Fixture request 0", exact: true }).click();
      assert.equal(await page.getByRole("article").count(), 1, "Only the selected record is expanded");
      await page.getByLabel("Admin notes", { exact: true }).fill("Keep this draft");
      await page.getByRole("button", { name: "Back to list", exact: true }).click();
      await page.getByRole("button", { name: "Open Fixture request 0", exact: true }).click();
      assert.equal(await page.getByLabel("Admin notes", { exact: true }).inputValue(), "Keep this draft");
      await page.getByRole("button", { name: "Save admin notes", exact: true }).click();
      await page.getByRole("status").getByText("Admin notes saved.").waitFor();
      assert.deepEqual(writes.at(-1).body, { adminNotes: "Keep this draft" });
      await page.getByRole("button", { name: "Approve + publish challenge", exact: true }).click();
      await page.getByText("Published as a Community challenge", { exact: true }).waitFor();
      assert.deepEqual(writes.at(-1).body, { status: "approved", adminNotes: "Keep this draft" });
      await page.getByRole("radio", { name: "Sponsored", exact: true }).check();
      await page.getByRole("button", { name: "Open Fixture sponsored challenge", exact: true }).click();
      await page.getByLabel("Brand review notes", { exact: true }).fill("Ready for release");
      await page.getByRole("button", { name: "Approve + publish", exact: true }).click();
      await page.getByRole("status").getByText(/approved and live/).waitFor();
      assert.deepEqual(writes.at(-1).body, { status: "approved", notes: "Ready for release" });
      await page.locator("#challenge-tab-community").click();
      await page.getByRole("button", { name: "Open Fixture challenge 00", exact: true }).click();
      await page.getByLabel("Recipient name", { exact: true }).fill("Updated school");
      await page.getByRole("button", { name: "Save + preview data", exact: true }).click();
      await page.getByRole("heading", { name: "Preview certificate data", exact: true }).waitFor();
      assert.deepEqual(writes.at(-1).body, { certificateRecipientName: "Updated school", certificateRecipientType: "school", certificateEnabled: true });
      for (const lang of ["en", "es"]) {
        await page.getByLabel("Export language", { exact: true }).selectOption(lang);
        for (const label of ["Save + download PDF", "Recycling actions XLSX"]) {
          const promise = page.waitForEvent("download"); await page.getByRole("button", { name: label, exact: true }).click();
          const file = await promise;
          assert.equal(fs.readFileSync(await file.path(), "utf8"), "fixture-download");
          assert.ok(file.suggestedFilename().includes("updated-school"));
          await page.waitForFunction(() => { const field = document.querySelector('select[aria-label="Export language"]'); return field && !field.matches(":disabled"); });
        }
      }
      assert.deepEqual(downloads, ["/impact/challenges/c0/certificate?format=pdf&lang=en", "/impact/challenges/c0/recycling-actions.xlsx?lang=en", "/impact/challenges/c0/certificate?format=pdf&lang=es", "/impact/challenges/c0/recycling-actions.xlsx?lang=es"]);
      await page.getByRole("button", { name: "Edit target, owner, and description", exact: true }).click();
      await editor.waitFor();
      await page.getByLabel("Shared item target", { exact: true }).fill("1000");
      await page.getByLabel("Challenge owner", { exact: true }).selectOption("owner2");
      await page.getByLabel("Description", { exact: true }).fill("Updated description");
      failSave = true;
      await editor.getByRole("button", { name: "Update challenge", exact: true }).click();
      await page.getByRole("alert").getByText("Fixture save failed").waitFor();
      assert.equal(await page.getByLabel("Shared item target", { exact: true }).inputValue(), "1000");
      failSave = false;
      await editor.getByRole("button", { name: "Update challenge", exact: true }).click();
      await editor.waitFor({ state: "hidden" });
      assert.equal(writes.at(-1).body.required_count, 1000);
      assert.equal(writes.at(-1).body.ownerUserId, "owner2");
      assert.equal(writes.at(-1).body.description, "Updated description");
      assert.ok(await page.getByRole("button", { name: "Open Fixture challenge 00", exact: true }).isVisible(), "Editor close from certificate returns to a usable inventory");
      await page.getByLabel("Search challenges", { exact: true }).fill("Fixture challenge 00");
      await page.getByRole("button", { name: "Open Fixture challenge 00", exact: true }).click();
      await page.locator('summary[aria-label="Challenge actions"]').click();
      await page.getByRole("button", { name: "Deactivate", exact: true }).click();
      await page.getByRole("button", { name: "Activate", exact: true, includeHidden: true }).waitFor({ state: "attached" });
      if (!await page.getByRole("button", { name: "Activate", exact: true }).isVisible()) await page.locator('summary[aria-label="Challenge actions"]').click();
      assert.equal(challenges[0].active, false);
      await page.getByRole("button", { name: "Change image", exact: true }).click();
      await page.getByLabel("Image description", { exact: false }).count();
      assert.ok(await page.locator("#challenge-image-editor").isVisible());
      await page.locator("#challenge-image-prompt").fill("A clean illustrated recycling challenge for a community");
      await editor.getByRole("button", { name: /Generate image/i }).click();
      await page.waitForFunction(() => { const field = document.querySelector('#challenge-image-prompt'); return field && !field.matches(":disabled"); });
      assert.ok(writes.some((write) => write.endpoint === "/admin/challenges/generate-image" && write.body.challengeType === "community"));
      assert.ok(writes.some((write) => write.endpoint === "/admin/challenges/c0" && write.body?.heroImageUrl === "https://fixture.invalid/generated.jpg"));
      await editor.getByRole("button", { name: "Back", exact: true }).click();
      accept = false;
      const writeCount = writes.length;
      await pane.locator('summary[aria-label="Challenge actions"]').click();
      await pane.getByRole("button", { name: "Delete", exact: true }).click();
      assert.equal(writes.length, writeCount);
      accept = true;
      await pane.getByRole("button", { name: "Delete", exact: true }).click();
      await page.getByText("No challenges match the current filters.").waitFor();
      assert.ok(confirms.at(-1).includes("cannot be undone"));
      await page.getByRole("button", { name: "New challenge", exact: true }).click();
      await editor.getByLabel("Challenge type", { exact: true }).selectOption("community");
      await editor.getByLabel("Target type", { exact: true }).selectOption("any");
      await editor.getByLabel("Title", { exact: true }).fill("New fixture challenge");
      await editor.getByLabel("Description", { exact: true }).fill("A brand new fixture");
      await editor.getByLabel("Shared item target", { exact: true }).fill("750");
      await editor.getByLabel("Starts at", { exact: true }).fill("2026-09-01T10:00");
      await editor.getByLabel("Ends at", { exact: true }).fill("2027-09-01T10:00");
      await editor.getByRole("button", { name: "Create challenge", exact: true }).click();
      await editor.waitFor({ state: "hidden" });
      assert.equal(writes.at(-1).method, "POST");
      assert.equal(writes.at(-1).body.required_count, 750);
      for (const lang of ["en", "es"]) {
        if (lang === "es") await page.getByRole("button", { name: "ES", exact: true }).click();
        for (const tab of ["requests", "community", "all"]) {
          await page.locator("#challenge-tab-" + tab).click();
          if (tab === "all") await pane.locator('input').first().fill("");
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          await page.screenshot({ path: path.join(output, tab + "-" + width + "-" + lang + ".png"), fullPage: true });
          await pane.getByRole("button", { name: /^(Open|Abrir) / }).first().click();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          await page.screenshot({ path: path.join(output, tab + "-detail-" + width + "-" + lang + ".png"), fullPage: true });
          if (tab === "all") {
            await page.getByRole("button", { name: lang === "en" ? "Edit" : "Editar", exact: true }).click();
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(output, "editor-" + width + "-" + lang + ".png"), fullPage: true });
            await editor.getByRole("button", { name: lang === "en" ? "Back" : "Volver", exact: true }).click();
          }
        }
      }
      assert.deepEqual(errors, []);
      console.log("PASS challenges " + width + "px: request/sponsor decisions, certificate preview/PDF/XLSX, edit/create/image/toggle/delete, responsive panes EN/ES");
      await page.close();
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
