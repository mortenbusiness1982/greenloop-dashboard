/* eslint-disable @typescript-eslint/no-require-imports -- Standalone mocked browser verification. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_DASHBOARD_ORIGIN || "http://localhost:3000";
const output = "/private/tmp/greenloop-rewards-check";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS9sAAAAASUVORK5CYII=", "base64");

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [360, 390, 768, 1512]) {
      const page = await browser.newPage({ viewport: { width, height: width < 400 ? 740 : 900 } });
      const errors = [], writes = [];
      let failure = false;
      const rewards = Array.from({ length: 31 }, (_, i) => ({
        id: "reward-" + i, title: "Fixture reward " + i,
        description: "A complete reward description for the local fixture.",
        cost_points: 200 + i, partner_name: "Fixture Partner " + i,
        active: i !== 2, status: i === 2 ? "archived" : "active",
        archived_at: i === 2 ? "2026-09-01T12:00:00Z" : null,
        redemption_type: "link_with_code", fulfillment_type: "promo_code", code_mode: "shared",
        shared_code: "FIXTURE25", promo_code: "FIXTURE25", affiliate_url: "https://example.invalid/reward",
        acquisition_mode: "redeem", available_worldwide: false, eligible_country_codes: ["ES"],
        banner_image_url: "https://fixture.invalid/reward.png", category_id: "cat1",
      }));
      rewards[1].title = "A long reward title with enough words to verify the phone layout remains readable";
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin === origin) return route.continue();
        const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS" };
        if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
        if (url.hostname === "fixture.invalid") return route.fulfill({ contentType: "image/png", body: png });
        if (req.method() === "GET") {
          if (url.pathname === "/admin/rewards") return route.fulfill({ headers, json: { rewards } });
          if (url.pathname === "/admin/reward-categories") return route.fulfill({ headers, json: { categories: [{ id: "cat1", label: "Food" }] } });
          return route.abort();
        }
        const data = url.pathname === "/uploads/photo" ? null : req.postDataJSON();
        writes.push({ path: url.pathname, method: req.method(), data });
        if (failure) return route.fulfill({ status: 500, headers, json: { error: "Fixture save failed" } });
        if (url.pathname === "/uploads/photo") return route.fulfill({ headers, json: { url: "https://fixture.invalid/uploaded.png" } });
        if (url.pathname === "/admin/rewards" && req.method() === "POST") {
          rewards.push({ id: "new-reward", ...data, active: data.status === "active" });
          return route.fulfill({ headers, json: { id: "new-reward" } });
        }
        const match = url.pathname.match(/^\/admin\/rewards\/([^/]+)(?:\/(toggle|restore|promo-codes))?$/);
        assert.ok(match, "Unexpected write: " + url.pathname);
        const reward = rewards.find((item) => item.id === match[1]);
        assert.ok(reward);
        if (match[2] === "toggle") { reward.active = !reward.active; reward.status = reward.active ? "active" : "paused"; }
        else if (match[2] === "restore") { reward.active = true; reward.status = "active"; reward.archived_at = null; }
        else if (req.method() === "DELETE") { reward.active = false; reward.status = "archived"; reward.archived_at = "2026-09-14T00:00:00Z"; }
        else if (!match[2]) Object.assign(reward, data);
        return route.fulfill({ headers, json: { reward } });
      });
      await page.addInitScript(() => {
        localStorage.setItem("greenloop_jwt", "fixture." + btoa(JSON.stringify({ role: "admin", email: "admin@example.invalid", exp: 4102444800 })) + ".fixture");
        localStorage.setItem("greenloop_dashboard_language", "en");
      });
      await page.goto(origin + "/admin/rewards");
      const list = page.getByRole("region", { name: "Reward list", exact: true });
      const open = (name) => page.getByRole("button", { name: "Open " + name, exact: true }).click();
      const tab = (id) => page.locator("#reward-tab-" + id).click();
      const field = (name) => page.getByLabel(name, { exact: true });
      const button = (name) => page.getByRole("button", { name, exact: true });
      const detail = page.getByRole("region", { name: "Reward details", exact: true });
      await list.locator("button").first().waitFor();
      assert.equal(await list.locator("button").count(), 31);
      assert.equal(await page.locator("form:visible").count(), 0, "Editor does not squeeze list");
      assert.equal(await page.getByRole("link", { name: "Unlock history" }).getAttribute("href"), "/admin/rewards/unlocks");
      await field("Search rewards").fill("Partner 2");
      assert.equal(await list.locator("button").count(), 11);
      await field("Reward status").selectOption("archived");
      assert.equal(await list.locator("button").count(), 1);
      await open("Fixture reward 2");
      assert.ok((await detail.innerText()).includes("Shared code"));
      page.once("dialog", (dialog) => dialog.accept());
      await button("Restore").click();
      await button("Archive").waitFor();
      assert.equal(writes.at(-1).path, "/admin/rewards/reward-2/restore");
      await button("Back to list").click();
      assert.equal(await field("Search rewards").inputValue(), "Partner 2");
      await field("Search rewards").fill("");
      await field("Reward status").selectOption("all");
      await open("Fixture reward 0");
      await button("Pause").click();
      await button("Activate").waitFor();
      assert.equal(writes.at(-1).method, "PATCH");
      assert.equal(writes.at(-1).path, "/admin/rewards/reward-0/toggle");
      const count = writes.length;
      page.once("dialog", (dialog) => dialog.dismiss());
      await button("Archive").click();
      assert.equal(writes.length, count, "Cancelled archive cannot mutate");
      page.once("dialog", (dialog) => dialog.accept());
      await button("Archive").click();
      await button("Restore").waitFor();
      assert.equal(writes.at(-1).method, "DELETE");
      page.once("dialog", (dialog) => dialog.accept());
      await button("Restore").click();
      await button("Archive").waitFor();
      await button("Edit reward").click();
      await field("Title").fill("Edited fixture reward");
      await tab("delivery");
      await field("Unlock instructions").fill("Fixture instructions retained across panes");
      await field("Code mode").selectOption("pooled");
      await field("Add promo codes, one per line").fill("CODE-A\nCODE-B");
      await tab("limits");
      await field("EcoPoints cost").fill("450");
      await field("Max total claims").fill("50");
      await tab("visibility");
      await field("Eligible countries").fill("es, FR; es");
      await tab("preview");
      assert.ok((await page.getByRole("tabpanel").innerText()).includes("Edited fixture reward"));
      failure = true;
      await button("Update reward").click();
      await page.getByRole("alert").getByText("Fixture save failed", { exact: true }).waitFor();
      await tab("details");
      assert.equal(await field("Title").inputValue(), "Edited fixture reward");
      failure = false;
      await button("Update reward").click();
      await button("Edit reward").waitFor();
      const save = writes.findLast((write) => write.data?.title === "Edited fixture reward");
      assert.equal(save.path, "/admin/rewards/reward-0");
      assert.equal(save.data.cost_points, 450);
      assert.equal(save.data.max_total_claims, 50);
      assert.deepEqual(save.data.eligible_country_codes, ["ES", "FR"]);
      assert.equal(save.data.instructions, "Fixture instructions retained across panes");
      assert.deepEqual(writes.at(-1), { path: "/admin/rewards/reward-0/promo-codes", method: "POST", data: { codes: ["CODE-A", "CODE-B"] } });
      await button("Edit reward").click();
      await page.locator("input[type=file]").setInputFiles({ name: "fixture.png", mimeType: "image/png", buffer: png });
      await page.waitForFunction(() => document.querySelector("form img")?.getAttribute("src")?.includes("uploaded.png"));
      await page.waitForFunction(() => !document.querySelector("input[type=file]").disabled);
      assert.deepEqual(writes.at(-1).data, { banner_image_url: "https://fixture.invalid/uploaded.png" });
      await button("Remove").click();
      await page.waitForFunction(() => !document.querySelector("form img"));
      await page.waitForFunction(() => !document.querySelector("input[type=file]").disabled);
      assert.deepEqual(writes.at(-1).data, { banner_image_url: null });
      for (const lang of ["en", "es"]) {
        if (lang === "es") await button("ES").click();
        for (const pane of ["details", "delivery", "limits", "visibility", "preview"]) {
          await tab(pane);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "No page overflow " + pane);
          await page.screenshot({ path: path.join(output, `${pane}-${width}-${lang}.png`), fullPage: true });
        }
      }
      await button("EN").click();
      await button("Back").click();
      await button("Back to list").click();
      await page.screenshot({ path: path.join(output, `list-${width}.png`), fullPage: true });
      await button("New reward").click();
      await tab("preview");
      const beforeCreate = writes.length;
      await button("Create reward").click();
      await page.waitForFunction(() => document.getElementById("reward-tab-details").getAttribute("aria-selected") === "true");
      assert.equal(writes.length, beforeCreate, "Required fields block submit even in hidden panes");
      await field("Title").fill("New challenge fixture");
      await field("Short description").fill("Challenge-only description");
      await field("Partner name").fill("Fixture partner");
      await field("Reward type").selectOption("challenge_completion");
      await tab("preview");
      await button("Create reward").click();
      await page.waitForFunction(() => document.getElementById("reward-tab-delivery").getAttribute("aria-selected") === "true");
      assert.equal(writes.length, beforeCreate, "Required affiliate URL blocks submit");
      await field("Unlock type").selectOption("manual_claim");
      await button("Create reward").click();
      await button("New reward").waitFor();
      const created = writes.at(-1);
      assert.equal(created.method, "POST");
      assert.equal(created.data.cost_points, 0);
      assert.equal(created.data.reward_type, "challenge_reward");
      assert.equal(created.data.unlock_method, "challenge");
      assert.equal(created.data.visible_in_wallet_catalog, false);
      assert.equal(created.data.available_worldwide, true);
      assert.deepEqual(created.data.eligible_country_codes, []);
      assert.equal(created.data.promo_code, null);
      assert.equal(created.data.code_mode, null);
      assert.equal(created.data.fulfillment_type, "qr_token");
      assert.deepEqual(errors, []);
      console.log(`PASS rewards ${width}px: filters, detail/edit panes, archive/restore/toggle, failed-save drafts, code pools, uploads, preview, hidden validation, challenge create, EN/ES, no overflow`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
