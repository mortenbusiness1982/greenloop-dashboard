/* eslint-disable @typescript-eslint/no-require-imports -- Standalone mocked browser verification. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_DASHBOARD_ORIGIN || "http://localhost:3000";
const output = "/private/tmp/greenloop-unlocks-check";

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [360, 390, 768, 1512]) {
      const page = await browser.newPage({ viewport: { width, height: width < 400 ? 740 : 900 } });
      const errors = [], writes = [], requests = [];
      let failure = false, loadFailure = false;
      const unlocks = Array.from({ length: 61 }, (_, i) => ({
        id: "unlock" + i, user_id: "user" + i, reward_id: "reward" + i,
        token: "fixture-token-" + i + "-abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz",
        promo_code: 'FIXTURE"CODE-' + i, instructions: "Full instructions for the fixture reward.\nSecond line of instructions must remain readable.",
        created_at: "2026-09-14T10:00:00Z", expires_at: "2026-10-14T10:00:00Z",
        redeemed_at: "2026-09-14T11:00:00Z", unlock_status: i % 2 ? "used" : "active",
        unlock_method: "challenge", challenge_title: "Fixture community challenge", click_count: i,
        last_clicked_at: "2026-09-14T10:30:00Z", redeemed_by_partner_email: "fulfillment@example.invalid",
        fulfillment_type: "promo_code", reward: { title: "Fixture reward " + i, partner_name: "Fixture partner",
          redemption_type: "link_with_code", affiliate_url: "https://example.invalid/rewards/long-url-with-a-long-tracking-parameter?campaign=fixture&partner=greenloop" },
        user: { display_name: "Fixture User " + i, email: "participant" + i + "@example.invalid" },
      }));
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin === origin) return route.continue();
        const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,PATCH,OPTIONS" };
        if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
        if (!url.pathname.startsWith("/admin/rewards/unlocks")) return route.abort();
        if (req.method() === "PATCH") {
          const data = req.postDataJSON();
          writes.push({ path: url.pathname, data });
          if (failure) return route.fulfill({ status: 500, headers, json: { error: "Fixture update failed" } });
          const row = unlocks.find((item) => item.id === url.pathname.split("/").at(-1));
          assert.ok(row); row.unlock_status = data.status;
          return route.fulfill({ headers, json: { ok: true } });
        }
        assert.equal(req.method(), "GET");
        requests.push(Object.fromEntries(url.searchParams));
        if (loadFailure) return route.fulfill({ status: 500, headers, json: { error: "Fixture load failed" } });
        const status = url.searchParams.get("status"), search = (url.searchParams.get("search") || "").toLowerCase();
        const rows = unlocks.filter((item) => (!status || item.unlock_status === status) && (!search || JSON.stringify(item).toLowerCase().includes(search)));
        return route.fulfill({ headers, json: { unlocks: rows } });
      });
      await page.addInitScript(() => {
        localStorage.setItem("greenloop_jwt", "fixture." + btoa(JSON.stringify({ role: "admin", email: "admin@example.invalid", exp: 4102444800 })) + ".fixture");
        localStorage.setItem("greenloop_dashboard_language", "en");
      });
      await page.goto(origin + "/admin/rewards/unlocks");
      const button = (name) => page.getByRole("button", { name, exact: true });
      const list = page.getByRole("region", { name: "Unlock list", exact: true });
      const detail = page.getByRole("region", { name: "Unlock details", exact: true });
      await list.locator("button").first().waitFor();
      assert.equal(await list.locator("button").count(), 25);
      assert.equal(await list.locator("button").first().getAttribute("id"), "unlock-row-unlock0");
      assert.equal(await page.getByRole("link", { name: "All rewards", exact: true }).getAttribute("href"), "/admin/rewards");
      await button("Next page").click();
      assert.equal(await list.locator("button").first().getAttribute("id"), "unlock-row-unlock25");
      const downloadPromise = page.waitForEvent("download");
      await button("Export CSV").click();
      const download = await downloadPromise;
      const csv = fs.readFileSync(await download.path(), "utf8");
      assert.equal(csv.split("\n").length, 62, "Export includes every loaded row, not just page 2");
      assert.equal(csv.split("\n")[0], '"id","status","reward_title","user_email","partner_name","promo_code","token","unlock_method","redemption_type","click_count","created_at","expires_at","redeemed_at","redeemed_by_partner_email"');
      assert.ok(csv.includes('"FIXTURE""CODE-25"'), "CSV escaping retained");
      assert.ok(csv.includes("participant60@example.invalid"));
      assert.match(download.suggestedFilename(), /^greenloop-reward-unlocks-\d{4}-\d{2}-\d{2}\.csv$/);
      await page.evaluate(() => window.scrollTo({ top: 200 }));
      const listScroll = await page.evaluate(() => window.scrollY);
      await button("Open unlock unlock25").click();
      await page.waitForFunction(() => window.scrollY === 0);
      assert.equal(await list.isVisible(), false);
      for (const value of [unlocks[25].token, unlocks[25].promo_code, unlocks[25].instructions, "fulfillment@example.invalid", "participant25@example.invalid", "Fixture community challenge"]) assert.ok((await detail.innerText()).includes(value), "Detail retains " + value);
      assert.equal(await detail.getByRole("link").getAttribute("href"), unlocks[25].reward.affiliate_url);
      failure = true;
      await button("Reactivate").click();
      await page.getByRole("alert").getByText("Fixture update failed").waitFor();
      assert.equal(await button("Reactivate").isEnabled(), true);
      failure = false;
      await button("Reactivate").click();
      await button("Mark used").waitFor();
      assert.deepEqual(writes.at(-1), { path: "/admin/rewards/unlocks/unlock25", data: { status: "active" } });
      await button("Mark used").click();
      await button("Reactivate").waitFor();
      assert.deepEqual(writes.at(-1).data, { status: "used" });
      await button("Cancel").click();
      await detail.getByText("Cancelled", { exact: true }).waitFor();
      assert.deepEqual(writes.at(-1).data, { status: "cancelled" });
      for (const lang of ["en", "es"]) {
        if (lang === "es") await button("ES").click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(output, `detail-${width}-${lang}.png`), fullPage: true });
      }
      await button("EN").click();
      await button("Back to list").click();
      await page.waitForFunction(() => document.activeElement?.id === "unlock-row-unlock25");
      assert.equal(await page.evaluate(() => window.scrollY), listScroll, "Back restores page position");
      assert.equal(await list.locator("button").first().getAttribute("id"), "unlock-row-unlock25");
      for (const lang of ["en", "es"]) {
        if (lang === "es") await button("ES").click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(output, `list-${width}-${lang}.png`), fullPage: true });
      }
      await button("EN").click();
      const search = page.getByLabel("Search unlocks", { exact: true });
      await search.fill("participant25@");
      await page.waitForFunction(() => document.querySelectorAll("[id^=unlock-row-]").length === 1);
      assert.equal(requests.at(-1).search, "participant25@");
      await page.getByLabel("Unlock status", { exact: true }).selectOption("cancelled");
      await page.waitForResponse((response) => response.url().includes("status=cancelled"));
      await button("Open unlock unlock25").click();
      await button("Reactivate").click();
      await page.getByText("No unlocks match the current filters.", { exact: true }).waitFor();
      assert.equal(await detail.count(), 0, "Status change leaving filter returns to list");
      assert.equal(await button("Export CSV").isDisabled(), true);
      loadFailure = true;
      await search.fill("missing");
      await page.getByRole("alert").getByText("Fixture load failed").waitFor();
      loadFailure = false;
      await search.fill("");
      await page.getByLabel("Unlock status", { exact: true }).selectOption("");
      await list.locator("button").first().waitFor();
      assert.deepEqual(errors, []);
      console.log(`PASS unlocks ${width}px: paging, full CSV, complete detail, status transitions/failure, server filters, focus return, EN/ES, no overflow`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
