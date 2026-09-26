/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node browser check, matching the existing test harness. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const origin = process.env.TEST_DASHBOARD_ORIGIN || "http://localhost:3000";
const output = process.env.TEST_SCREENSHOT_DIR || "/private/tmp/greenloop-overview-check";
const events = Array.from({ length: 9 }, (_, index) => ({
  created_at: `2026-09-14T${String(18 - index).padStart(2, "0")}:30:00Z`,
  product_name: index === 0 ? "Reusable beverage packaging - family size" : `Recycled product ${index + 1}`,
  barcode: `840000000000${index}`,
  display_name: index === 0 ? "Sample participant with a long display name" : `Participant ${index + 1}`,
  email: `participant${index + 1}@example.invalid`,
  city: "Benalmadena",
  units: 1,
  points_issued: 10,
  scan_status: index === 1 ? "pending" : "approved",
}));
const fixtures = {
  "/admin/reports/platform": {
    totals: { totalUnits: 2500, totalEvents: 1000, ecoPointsIssued: 25000 },
    geoBreakdown: [
      { city: "Benalmadena", units: 1000 }, { city: "Malaga", units: 500 },
      { city: "Fuengirola", units: 200 }, { city: "Torremolinos", units: 100 },
      { city: "Alhaurin de la Torre", units: 50 }, { city: "Mijas", units: 20 },
      { city: null, units: 100 },
    ],
    cityDiagnostics: { eventCityMissingUnits: 700, unresolvedCityUnits: 630 },
    events,
  },
  "/admin/users": [{ id: "u1", created_at: new Date().toISOString() }, { id: "u2", created_at: "2020-01-01" }],
  "/admin/rewards": [{ id: "r1", active: true }, { id: "r2", status: "active" }, { id: "r3", active: true, archived_at: "2026-01-01" }],
  "/admin/challenges": [{ id: "c1", active: true }, { id: "c2", active: false }],
  "/admin/rewards/unlocks": [{ id: "unlock1" }],
  "/admin/brands": [{ id: "b1" }, { id: "b2" }, { id: "b3" }],
  "/admin/partners": [{ id: "p1" }, { id: "p2", deactivated_at: "2026-01-01" }],
};

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [360, 390, 768, 1280, 1512]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      const requests = [];
      let responseMode = "normal";
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,OPTIONS" };
        if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
        assert.equal(route.request().method(), "GET", "Fixture checks must never mutate data");
        assert.ok(Object.hasOwn(fixtures, url.pathname), `Unexpected external request: ${url.pathname}`);
        requests.push(url.pathname + url.search);
        if (responseMode === "error") return route.fulfill({ status: 500, headers, json: { error: "Overview fixture failure" } });
        if (responseMode === "loading") await new Promise((resolve) => setTimeout(resolve, 1500));
        return route.fulfill({ headers, json: responseMode === "empty" ? [] : fixtures[url.pathname] });
      });
      await page.addInitScript(() => {
        // A fake client session for intercepted fixture requests only; no production credentials.
        localStorage.setItem("greenloop_jwt", `fixture.${btoa(JSON.stringify({ role: "admin", email: "admin@example.invalid", exp: 4102444800 }))}.fixture`);
        localStorage.setItem("greenloop_dashboard_language", "en");
      });
      await page.goto(origin + "/admin/overview");
      await page.locator("#overview-activity table tbody tr").nth(7).waitFor({ state: "attached" });
      assert.equal(new Set(requests).size, 7);
      assert.ok(requests.includes("/admin/rewards/unlocks?status=active"));
      assert.equal(await page.locator(".crm-page-heading h1").innerText(), "Overview");
      assert.equal(await page.locator("#overview-activity table tbody tr").count(), 8);
      assert.equal(await page.locator("#overview-activity details").count(), 8);
      assert.equal(await page.locator("main").getByText("Operational modules", { exact: true }).count(), 0);
      assert.equal(await page.locator("main a[href='/admin/activity']").count(), 1);
      assert.equal(await page.locator(".crm-page-heading a[href='/admin/reports/exports']").count(), 1);
      const metrics = await page.locator("main [aria-busy] > div").allTextContents();
      assert.equal(metrics.length, 10);
      for (const [index, value] of [[0, "2"], [1, "1"], [2, "2,500"], [3, "1,000"], [4, "25,000"], [5, "2"], [6, "1"], [7, "1"], [8, "3"], [9, "1"]]) {
        assert.ok(metrics[index].includes(value), `Metric ${index} retains ${value}`);
      }
      for (const lang of ["en", "es"]) {
        if (lang === "es") {
          await page.getByRole("button", { name: "ES", exact: true }).click();
          await page.locator("#overview-activity table tbody tr").nth(7).waitFor({ state: "attached" });
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No page overflow at ${width}/${lang}`);
        if (width >= 1280) {
          assert.ok(await page.locator("#overview-activity").isVisible());
          assert.ok(await page.locator("#overview-cities").isVisible());
          const table = await page.locator("#overview-activity table").evaluate((el) => ({ width: el.scrollWidth, container: el.parentElement.clientWidth }));
          assert.ok(table.width <= table.container + 1, `No desktop table scroll at ${width}/${lang}`);
        } else {
          const citiesTab = page.getByRole("tab", { name: lang === "es" ? "Ciudades" : "Cities", exact: true });
          await citiesTab.click();
          assert.ok(await page.locator("#overview-cities").isVisible());
          assert.equal(await page.locator("#overview-activity").isVisible(), false);
          await page.screenshot({ path: path.join(output, `cities-${width}-${lang}.png`), fullPage: true });
          await citiesTab.press("ArrowLeft");
          assert.ok(await page.locator("#overview-activity").isVisible());
          assert.equal(await page.getByRole("tab", { name: lang === "es" ? "Actividad" : "Activity", exact: true }).getAttribute("aria-selected"), "true");
        }
        const citiesText = await page.locator("#overview-cities").textContent();
        assert.ok(citiesText.includes(lang === "es" ? "Otras ciudades" : "Other cities"));
        assert.ok(citiesText.includes(lang === "es" ? "Sin ciudad registrada" : "No city recorded"));
        assert.ok(citiesText.includes("630"), "Missing-city reconciliation preserved");
        if (width < 768) {
          const first = page.locator("#overview-activity details").first();
          await first.locator("summary").click();
          assert.ok(await first.getByText("participant1@example.invalid", { exact: false }).isVisible());
          await first.locator("summary").click();
        }
        await page.screenshot({ path: path.join(output, `overview-${width}-${lang}.png`), fullPage: true });
      }
      if (width === 390) {
        responseMode = "loading";
        await page.reload();
        await page.getByText("Loading overview...", { exact: true }).last().waitFor();
        await page.locator("#overview-activity table tbody tr").nth(7).waitFor({ state: "attached" });
        responseMode = "empty";
        await page.reload();
        await page.getByText("No recent activity available.", { exact: true }).last().waitFor();
        await page.getByRole("tab", { name: "Cities", exact: true }).click();
        await page.getByText("No city data available.", { exact: true }).waitFor();
        responseMode = "error";
        await page.reload();
        await page.getByRole("alert").getByText("Overview fixture failure").waitFor();
      }
      assert.deepEqual(errors, [], "No client exceptions");
      console.log(`PASS ${width}px: EN/ES, metrics, layout, city totals and pane behavior`);
      await page.close();
    }
    console.log("PASS loading/empty/error states; fixture-only GET requests");
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
