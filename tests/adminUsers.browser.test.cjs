/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node browser check, matching the existing harness. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_DASHBOARD_ORIGIN || "http://localhost:3000";
const output = process.env.TEST_SCREENSHOT_DIR || "/private/tmp/greenloop-users-check";

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [360, 390, 768, 1280, 1512]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [], writes = [], confirmations = [], reads = [];
      let failPoints = false;
      const users = Array.from({ length: 61 }, (_, i) => ({
        id: "fixture-" + i, display_name: "Fixture User " + String(i + 1).padStart(3, "0"),
        email: "participant" + i + "@example.invalid", role: "user", brand_id: null,
        created_at: "2026-06-01T10:15:00Z", deactivated_at: null,
        wallet_points: 100 + i, scan_events_count: 3, redeemed_rewards_count: 2,
        recycling_events_count: 2, recycled_units_count: 5, last_activity_at: "2026-09-14T10:00:00Z",
        latest_city: "Malaga", latest_province: "Malaga", app_platform: "ios", app_version: "2.0.10",
      }));
      users[1].display_name = "Fixture participant with a particularly long display name";
      users[1].email = "long-participant-address-for-layout@example.invalid";
      let challenges = [{ user_challenge_id: "uc1", id: "c1", title: "Community fixture", challenge_type: "community", required_count: 100, progress_count: 20, bonus_points: 10, accepted_at: "2026-09-01" }];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("dialog", async (dialog) => { confirmations.push(dialog.message()); await dialog.accept(); });
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        const method = route.request().method();
        const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS" };
        if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
        const endpoint = url.pathname;
        let json;
        if (method !== "GET") {
          const body = route.request().postDataJSON();
          writes.push({ endpoint, method, body });
          if (endpoint.endsWith("/ecopoints")) {
            if (failPoints) return route.fulfill({ status: 500, headers, json: { error: "Fixture adjustment failed" } });
            users[0].wallet_points += body.action === "add" ? body.points : -body.points;
          } else if (endpoint.endsWith("/deactivate")) users[0].deactivated_at = users[0].deactivated_at ? null : new Date().toISOString();
          else if (endpoint.endsWith("/challenges/c1")) challenges = [];
          else if (endpoint === "/admin/users/fixture-0") Object.assign(users[0], body);
          else assert.ok(endpoint.endsWith("/password") || endpoint.endsWith("/companion/reset"), "Unexpected mutation");
          json = { ok: true };
        } else {
          reads.push(endpoint + url.search);
          if (endpoint === "/admin/users") json = { users };
          else if (endpoint === "/admin/brands") json = { brands: [{ id: "brand1", name: "Fixture Brand" }] };
          else if (/\/admin\/users\/fixture-\d+\/activity$/.test(endpoint)) {
            const user = users.find((item) => endpoint.includes("/" + item.id + "/"));
            json = {
              user, active_challenges: challenges,
              scan_events: [{ id: "scan1", barcode: "8400000000001", trust_tier: "trusted", created_at: "2026-09-14T10:00:00Z", lat: 36.7, lng: -4.4 }],
              recycling_events: [{ id: "event1", created_at: "2026-09-14T10:00:00Z", city: "Malaga", province: "Malaga", lat: 36.7, lng: -4.4, verification_status: "approved", units: 5, points_issued: 50, items: [{ barcode: "8400000000001", product_name: "Fixture recycled bottle" }] }],
            };
          } else return route.abort();
        }
        return route.fulfill({ headers, json });
      });
      await page.addInitScript(() => {
        localStorage.setItem("greenloop_jwt", "fixture." + btoa(JSON.stringify({ role: "admin", email: "admin@example.invalid", exp: 4102444800 })) + ".fixture");
        localStorage.setItem("greenloop_dashboard_language", "en");
      });
      await page.goto(origin + "/admin/users");
      const list = page.getByRole("region", { name: "User list", exact: true });
      await list.waitFor();
      assert.equal(await page.getByRole("tablist", { name: "User workspace" }).isVisible(), false);
      assert.equal(await page.locator("table tbody tr").count(), 25);
      assert.equal(await page.locator(".crm-page-heading a[href='/admin/activity']").count(), 1);
      await page.getByText("More filters", { exact: true }).click();
      for (const label of ["Name", "Email", "Min wallet", "Min rewards", "Min recycling events", "Min units", "Signed up from", "Signed up to", "Last activity from", "Last activity to"]) assert.ok(await page.getByLabel(label, { exact: true }).isVisible());
      await page.getByLabel("Min wallet", { exact: true }).fill("150");
      assert.equal(await page.locator("table tbody tr").count(), 11);
      await page.getByRole("button", { name: "Reset filters", exact: true }).click();
      await page.locator("summary").filter({ hasText: "More filters" }).click();
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Export CSV", exact: true }).click();
      const download = await downloadPromise;
      const csv = fs.readFileSync(await download.path(), "utf8");
      assert.equal(csv.split("\n").length, 62, "Export includes all filtered users, not just the page");
      assert.equal(csv.split("\n")[0], '"display_name","email","role","app_platform","app_version","app_seen_at","created_at","status","wallet_points","redeemed_rewards_count","recycling_events_count","recycled_units_count","last_activity_at","latest_city","latest_province"');
      await page.getByRole("button", { name: "Next page", exact: true }).click();
      const secondPageUser = list.getByRole("button", { name: /^Fixture User 026/ });
      await secondPageUser.click();
      await page.getByRole("heading", { name: "Fixture User 026", exact: true }).waitFor();
      await page.getByRole("button", { name: "Users", exact: true }).click();
      assert.ok(await secondPageUser.isVisible(), "Back preserves pagination");
      await page.getByRole("button", { name: "Previous page", exact: true }).click();
      for (const lang of ["en", "es"]) {
        if (lang === "es") await page.getByRole("button", { name: "ES", exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (width >= 1280) assert.equal(await page.locator("table").evaluate((table) => table.scrollWidth > table.parentElement.clientWidth), false, "Desktop list fits its pane");
        await page.screenshot({ path: path.join(output, "users-" + width + "-" + lang + ".png"), fullPage: true });
      }
      await page.getByRole("button", { name: "EN", exact: true }).click();
      await list.getByRole("button", { name: /^Fixture User 001/ }).click();
      await page.getByRole("heading", { name: "Fixture User 001", exact: true }).waitFor();
      const overview = page.getByRole("tabpanel", { name: "Overview", exact: true });
      const account = page.getByRole("tabpanel", { name: "Account", exact: true });
      await overview.getByLabel("EcoPoints amount").fill("1.5");
      await overview.getByRole("button", { name: "Add points", exact: true }).click();
      await page.getByRole("alert").getByText("EcoPoints amount must be a positive whole number.").waitFor();
      assert.equal(writes.length, 0);
      failPoints = true;
      await overview.getByLabel("EcoPoints amount").fill("15");
      await overview.getByRole("button", { name: "Add points", exact: true }).click();
      await page.getByRole("alert").getByText("Fixture adjustment failed").waitFor();
      assert.equal(await overview.getByLabel("EcoPoints amount").inputValue(), "15");
      failPoints = false;
      await overview.getByRole("button", { name: "Add points", exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#user-panel-overview input[type="number"]').value === "");
      await overview.getByRole("radio", { name: "Remove", exact: true }).check();
      await overview.getByLabel("EcoPoints amount").fill("5");
      await overview.getByRole("button", { name: "Remove points", exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#user-panel-overview input[type="number"]').value === "");
      assert.equal(users[0].wallet_points, 110);
      assert.deepEqual(writes.filter((write) => write.endpoint.endsWith("/ecopoints")).map((write) => write.body), [{ points: 15, action: "add" }, { points: 15, action: "add" }, { points: 5, action: "remove" }]);
      await page.getByRole("tab", { name: "Account", exact: true }).click();
      await account.getByLabel("Display name").fill("Updated Fixture User");
      await page.getByRole("tab", { name: "Overview", exact: true }).click();
      await page.getByRole("tab", { name: "Account", exact: true }).click();
      assert.equal(await account.getByLabel("Display name").inputValue(), "Updated Fixture User", "Tab changes retain draft fields");
      await account.getByLabel("Brand", { exact: true }).selectOption("brand1");
      await account.getByRole("button", { name: "Save changes", exact: true }).click();
      await page.getByRole("heading", { name: "Updated Fixture User", exact: true }).waitFor();
      assert.deepEqual(writes.find((write) => write.endpoint === "/admin/users/fixture-0").body, { display_name: "Updated Fixture User", role: "user", brand_id: "brand1" });
      await account.getByLabel("New password", { exact: true }).fill("short");
      assert.equal(await account.getByRole("button", { name: "Set new password", exact: true }).isEnabled(), false);
      await account.getByLabel("New password", { exact: true }).fill("mock-support-password");
      await account.getByRole("button", { name: "Set new password", exact: true }).click();
      await page.waitForFunction(() => document.querySelector('input[autocomplete="new-password"]').value === "");
      await account.getByRole("button", { name: "Reset to Turtle", exact: true }).click();
      await account.getByRole("button", { name: "Deactivate", exact: true }).click();
      await account.getByRole("button", { name: "Reactivate", exact: true }).waitFor();
      await account.getByRole("button", { name: "Reactivate", exact: true }).click();
      await account.getByRole("button", { name: "Deactivate", exact: true }).waitFor();
      await page.getByRole("tab", { name: "Challenges", exact: true }).click();
      await page.getByRole("tabpanel", { name: "Challenges", exact: true }).getByRole("button", { name: "Remove", exact: true }).click();
      await page.getByText("No active joined challenges.", { exact: true }).waitFor();
      await page.getByRole("tab", { name: "Activity", exact: true }).click();
      const activity = page.getByRole("tabpanel", { name: "Activity", exact: true });
      await activity.getByLabel("From", { exact: true }).fill("2026-09-01");
      await activity.getByLabel("To", { exact: true }).fill("2026-09-14");
      await activity.getByRole("button", { name: "Apply", exact: true }).click();
      await activity.getByRole("button", { name: "Apply", exact: true }).waitFor();
      await page.waitForFunction(() => !document.querySelector("fieldset").disabled);
      assert.ok(reads.includes("/admin/users/fixture-0/activity?from=2026-09-01&to=2026-09-14"));
      await activity.locator("summary").first().click();
      await activity.getByText("Fixture recycled bottle", { exact: true }).waitFor();
      await activity.locator("summary").filter({ hasText: "Recent scan events" }).click();
      await activity.getByText("trusted", { exact: true }).waitFor();
      assert.ok(confirmations.some((text) => text.includes("turtle at 0 points")));
      assert.ok(confirmations.some((text) => text.includes("Set a new password")));
      assert.ok(confirmations.some((text) => text.includes("Community fixture")));
      for (const tab of ["Overview", "Activity", "Account"]) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(output, "user-" + tab.toLowerCase() + "-" + width + ".png"), fullPage: true });
      }
      await page.getByRole("tab", { name: "Account", exact: true }).press("Home");
      assert.equal(await page.getByRole("tab", { name: "Overview", exact: true }).getAttribute("aria-selected"), "true");
      await page.getByRole("button", { name: "ES", exact: true }).click();
      for (const [name, file] of [["Resumen", "overview"], ["Actividad", "activity"], ["Retos", "challenges"], ["Cuenta", "account"]]) {
        await page.getByRole("tab", { name, exact: true }).click();
        assert.ok(await page.getByRole("tabpanel", { name, exact: true }).isVisible());
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(output, "user-" + file + "-" + width + "-es.png"), fullPage: true });
      }
      assert.deepEqual(errors, []);
      console.log("PASS " + width + "px: filters, paging, full CSV, EN/ES list, tabs, points, edits, password, avatar, activation, challenge removal and history (mocked)");
      await page.close();
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
