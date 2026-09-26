/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser verification harness. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_DASHBOARD_ORIGIN || "http://localhost:3000";
const output = process.env.TEST_SCREENSHOT_DIR || "/private/tmp/greenloop-leaderboards-check";

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [360, 390, 768, 1512]) {
      const page = await browser.newPage({ viewport: { width, height: width < 400 ? 740 : 900 } });
      const errors = [], requests = [];
      let mode = "ready";
      const entries = Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1, entityId: "entity-" + i,
        displayName: i === 1 ? "Colegio Internacional de la Comunidad de Benalmadena con un nombre largo" : "Fixture community " + (i + 1),
        approvedRecycles: 12345 - i * 1200, memberCount: 100 - i * 10, isCurrentEntity: false,
      }));
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,OPTIONS" };
        if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
        assert.equal(route.request().method(), "GET", "Leaderboards must never mutate data");
        if (!url.pathname.startsWith("/leaderboards/")) return route.abort();
        assert.equal(url.search, "?limit=10", "Existing request limit preserved");
        requests.push(url.pathname);
        if (mode === "loading") await new Promise((resolve) => setTimeout(resolve, 700));
        if (mode === "error") return route.fulfill({ status: 500, headers, json: { error: "Fixture rankings unavailable" } });
        return route.fulfill({ headers, json: { leaderboard: {
          scope: url.pathname.split("/").at(-1), participantCount: mode === "empty" ? 0 : 43,
          countsOnlyApprovedRecycles: true, top: mode === "empty" ? [] : entries, currentEntities: [],
        } } });
      });
      await page.addInitScript(() => {
        localStorage.setItem("greenloop_jwt", "fixture." + btoa(JSON.stringify({ role: "admin", email: "admin@example.invalid", exp: 4102444800 })) + ".fixture");
        localStorage.setItem("greenloop_dashboard_language", "en");
      });
      await page.goto(origin + "/admin/leaderboards");
      const panel = page.locator("#leaderboard-panel");
      const ready = async () => {
        await panel.locator("tbody tr").first().waitFor();
        await page.waitForFunction(() => document.getElementById("leaderboard-panel").getAttribute("aria-busy") === "false");
      };
      await ready();
      assert.equal(await page.locator("main").count(), 1, "No nested page frame");
      for (const scope of ["team", "school", "hotel", "brand", "organization", "country"]) {
        const response = await page.locator("#leaderboard-tab-" + scope).getAttribute("aria-selected") === "true"
          ? null : page.waitForResponse((response) => new URL(response.url()).pathname === "/leaderboards/" + scope && response.request().method() === "GET");
        await page.locator("#leaderboard-tab-" + scope).click();
        if (response) await response;
        await ready();
        assert.equal(requests.at(-1), "/leaderboards/" + scope);
        assert.equal(await panel.locator("tbody tr").count(), 10);
        assert.ok((await panel.innerText()).includes("43 ranked"));
        assert.ok((await panel.locator("tbody tr").first().innerText()).includes("12,345"));
        assert.ok((await panel.locator("tbody tr").last().innerText()).includes("Fixture community 10"), "API order retained");
      }
      const teamResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/leaderboards/team" && response.request().method() === "GET");
      await page.locator("#leaderboard-tab-country").press("Home");
      await teamResponse;
      await ready();
      assert.equal(await page.locator("#leaderboard-tab-team").getAttribute("aria-selected"), "true");
      const schoolResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/leaderboards/school" && response.request().method() === "GET");
      await page.locator("#leaderboard-tab-team").press("ArrowRight");
      await schoolResponse;
      await ready();
      assert.equal(await page.locator("#leaderboard-tab-school").getAttribute("aria-selected"), "true");
      for (const lang of ["en", "es"]) {
        if (lang === "es") await page.getByRole("button", { name: "ES", exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "No horizontal page overflow");
        assert.equal(await panel.getByRole("region").evaluate((element) => element.scrollWidth > element.clientWidth), false, "Table fits on phones");
        assert.equal(await panel.locator("tbody th").nth(1).evaluate((element) => getComputedStyle(element).textOverflow), "clip", "Full name is not ellipsized");
        if (width < 400) assert.ok((await panel.locator("tbody th").first().innerText()).includes(lang === "es" ? "miembros" : "members"));
        await page.screenshot({ path: path.join(output, `rankings-${width}-${lang}.png`), fullPage: true });
      }
      await page.getByRole("button", { name: "EN", exact: true }).click();
      const refresh = page.getByRole("button", { name: "Refresh rankings", exact: true });
      mode = "loading";
      await refresh.click();
      await page.getByRole("status").waitFor();
      assert.equal(await refresh.isDisabled(), true);
      await ready();
      mode = "empty";
      await refresh.click();
      await page.getByText("No ranked communities yet.", { exact: true }).waitFor();
      mode = "error";
      await refresh.click();
      await page.getByRole("alert").getByText("Fixture rankings unavailable", { exact: true }).waitFor();
      mode = "ready";
      await refresh.click();
      await ready();
      assert.equal(await panel.getByRole("alert").count(), 0);
      assert.deepEqual(errors, []);
      console.log(`PASS leaderboards ${width}px: six scopes, top-10 order/counts, refresh, keyboard, EN/ES, loading/empty/error recovery, no overflow`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
