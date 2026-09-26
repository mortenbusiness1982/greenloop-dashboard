/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node browser check, matching the existing harness. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_DASHBOARD_ORIGIN || "http://localhost:3000";
const output = process.env.TEST_SCREENSHOT_DIR || "/private/tmp/greenloop-activity-check";

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [360, 390, 768, 1280, 1512]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [], requests = [];
      let mode = "ready";
      const events = Array.from({ length: 61 }, (_, i) => ({
        event_id: "event" + i, created_at: new Date(Date.UTC(2026, 8, 14, 0, i)).toISOString(),
        user_id: "user" + i, display_name: "Fixture User " + i,
        email: "participant" + i + "@example.invalid", city: i % 2 ? "Malaga" : "Benalmadena",
        product_name: "Fixture bottle " + i, barcode: "8400000000" + i, units: i + 1,
        points_issued: (i + 1) * 10, lat: 36.7, lng: -4.4, bin_id: "bin1", scan_status: "approved",
      }));
      events[59].product_name = 'Long fixture product, "recycled bottle" with a particularly long name';
      events[59].display_name = "Fixture participant with a particularly long display name";
      events[59].email = "long-participant-address-for-layout@example.invalid";
      events[58].city = null;
      events[58].display_name = null;
      const report = {
        totals: { totalUnits: 4000, totalEvents: 900, uniqueConsumers: 80, ecoPointsIssued: 40000 },
        dailyTrend: Array.from({ length: 90 }, (_, i) => ({ date: new Date(Date.UTC(2026, 5, i + 1)).toISOString().slice(0, 10), units: i + 1 })),
        geoBreakdown: [{ city: "Malaga", units: 2100, consumers: 30 }, { city: "Benalmadena", units: 1800, consumers: 45 }, { city: null, units: 100, consumers: 5 }],
        events,
      };
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        const method = route.request().method();
        const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,OPTIONS" };
        if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
        assert.equal(method, "GET", "Activity must never mutate data");
        if (url.pathname !== "/admin/reports/platform") return route.abort();
        requests.push(url.search);
        if (mode === "loading") await new Promise((resolve) => setTimeout(resolve, 1000));
        if (mode === "error") return route.fulfill({ status: 500, headers, json: { error: "Fixture report unavailable" } });
        return route.fulfill({ headers, json: mode === "empty" ? {} : report });
      });
      await page.addInitScript(() => {
        localStorage.setItem("greenloop_jwt", "fixture." + btoa(JSON.stringify({ role: "admin", email: "admin@example.invalid", exp: 4102444800 })) + ".fixture");
        localStorage.setItem("greenloop_dashboard_language", "en");
      });
      await page.goto(origin + "/admin/activity");
      const list = page.getByRole("region", { name: "Recycling rows", exact: true });
      await list.waitFor();
      const eventPanel = page.locator("#activity-panel-events");
      assert.equal(await eventPanel.locator("tbody tr").count(), 25);
      assert.ok((await eventPanel.locator("tbody tr").first().innerText()).includes("Fixture bottle 60"), "Newest first");
      assert.ok((await page.getByRole("region", { name: "Activity totals" }).innerText()).includes("4000"), "Full aggregate retained");
      assert.equal(await page.getByRole("button", { name: "Export CSV", exact: true }).count(), 1);
      await page.getByRole("button", { name: "Next page", exact: true }).click();
      assert.ok((await eventPanel.locator("tbody tr").first().innerText()).includes("Fixture bottle 35"));
      await page.getByRole("tab", { name: /^Daily totals/ }).click();
      const daily = page.locator("#activity-panel-daily");
      assert.equal(await daily.locator("tbody tr").count(), 90);
      assert.ok((await daily.locator("tbody tr").first().innerText()).includes(report.dailyTrend[89].date), "Latest day first");
      await page.getByRole("tab", { name: /^Daily totals/ }).press("ArrowRight");
      assert.equal(await page.getByRole("tab", { name: /^Locations/ }).getAttribute("aria-selected"), "true");
      assert.equal(await page.locator("#activity-panel-locations tbody tr").count(), 3);
      assert.ok((await page.locator("#activity-panel-locations").innerText()).includes("Unknown city"), "Unknown city not dropped");
      await page.getByRole("tab", { name: /^Locations/ }).press("Home");
      assert.ok((await eventPanel.locator("tbody tr").first().innerText()).includes("Fixture bottle 35"), "Panes retain page");
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Export CSV", exact: true }).click();
      const download = await downloadPromise;
      const bytes = fs.readFileSync(await download.path());
      assert.equal(bytes.subarray(0, 3).toString("hex"), "efbbbf");
      const csv = bytes.toString("utf8").slice(1);
      assert.equal(csv.split("\n").length, 62, "CSV exports all returned rows, not visible page");
      assert.equal(csv.split("\n")[0], '"created_at","user","email","user_id","city","product_name","barcode","units","ecopoints","scan_status","lat","lng","bin_id","event_id"');
      assert.ok(csv.split("\n")[1].includes('"event60"'));
      assert.ok(csv.includes('""recycled bottle""'), "CSV escaping retained");
      assert.ok(csv.includes('"36.7","-4.4","bin1"'), "Diagnostics retained in CSV");
      assert.equal(download.suggestedFilename(), "greenloop-recycling-activity-all-to-all.csv");
      await page.getByLabel("Rows", { exact: true }).selectOption("50");
      assert.equal(await eventPanel.locator("tbody tr").count(), 50);
      await page.getByLabel("Rows", { exact: true }).selectOption("25");
      await page.getByText("Find a city or user", { exact: true }).click();
      await page.getByLabel("Search city", { exact: true }).fill("Malaga");
      assert.equal(await page.getByLabel("City", { exact: true }).locator("option").count(), 2);
      await page.getByLabel("Search user", { exact: true }).fill("participant60@");
      assert.equal(await page.getByLabel("User", { exact: true }).locator("option").count(), 2);
      await page.getByLabel("City", { exact: true }).selectOption("Malaga");
      await list.waitFor();
      await page.getByLabel("User", { exact: true }).selectOption("user60");
      await list.waitFor();
      await page.getByLabel("From", { exact: true }).fill("2026-09-01");
      await list.waitFor();
      await page.getByLabel("To", { exact: true }).fill("2026-09-14");
      await list.waitFor();
      await page.getByRole("button", { name: "Refresh activity", exact: true }).click();
      await list.waitFor();
      assert.deepEqual(Object.fromEntries(new URLSearchParams(requests.at(-1))), { from: "2026-09-01", to: "2026-09-14", city: "Malaga", userId: "user60" });
      await page.getByRole("button", { name: "Reset filters", exact: true }).click();
      await list.waitFor();
      assert.equal(requests.at(-1), "");
      assert.equal(await page.getByLabel("From", { exact: true }).inputValue(), "");
      for (const lang of ["en", "es"]) {
        if (lang === "es") await page.getByRole("button", { name: "ES", exact: true }).click();
        for (const pane of ["events", "daily", "locations"]) {
          await page.locator("#activity-tab-" + pane).click();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "No page overflow");
          if (width >= 1280 && pane === "events") assert.equal(await eventPanel.getByRole("region").evaluate((element) => element.scrollWidth > element.clientWidth), false, "Desktop table fits");
          await page.screenshot({ path: path.join(output, pane + "-" + width + "-" + lang + ".png"), fullPage: true });
        }
      }
      await page.getByRole("button", { name: "EN", exact: true }).click();
      await page.locator("#activity-tab-events").click();
      if (width < 1280) {
        const first = eventPanel.locator("article").first();
        await first.locator("summary").click();
        assert.ok((await first.innerText()).includes("participant60@example.invalid"));
        assert.ok((await first.innerText()).includes("840000000060"));
      }
      mode = "loading";
      await page.getByRole("button", { name: "Refresh activity", exact: true }).click();
      await page.getByRole("status").getByText("Loading recycling activity...", { exact: true }).waitFor();
      await list.waitFor();
      mode = "empty";
      await page.getByRole("button", { name: "Refresh activity", exact: true }).click();
      await list.getByText("No recycling events found for the current filter.").waitFor();
      assert.equal(await page.getByRole("button", { name: "Export CSV", exact: true }).isEnabled(), false);
      await page.locator("#activity-tab-daily").click();
      await page.getByText("No daily recycling activity for this filter.").waitFor();
      await page.locator("#activity-tab-locations").click();
      await page.getByText("No location data for this filter.").waitFor();
      mode = "error";
      await page.getByRole("button", { name: "Refresh activity", exact: true }).click();
      await page.getByRole("alert").getByText("Fixture report unavailable").waitFor();
      mode = "ready";
      await page.getByRole("button", { name: "Refresh activity", exact: true }).click();
      await page.locator("#activity-panel-locations tbody tr").first().waitFor();
      assert.equal(await page.locator("main [role='alert']").count(), 0);
      assert.deepEqual(errors, []);
      console.log("PASS activity " + width + "px: panes, filters, paging, complete CSV, EN/ES, states, no overflow");
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
