/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser regression check. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_DASHBOARD_ORIGIN || "http://localhost:3000";
const output = process.env.TEST_SCREENSHOT_DIR || "/private/tmp/greenloop-moderation-check";
const evidence = fs.readFileSync(process.env.TEST_EVIDENCE_IMAGE || path.join(__dirname, "../public/greenloop-logo.jpg"));

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const [width, height] of [[360, 800], [375, 667], [390, 844], [768, 900], [1280, 900], [1512, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 640 });
      const errors = [], writes = [], confirms = [];
      let accept = true, failAction = false, mode = "ready";
      const events = Array.from({ length: 33 }, (_, i) => ({
        id: "event-" + i, user_id: "user-" + i, user_display_name: "Fixture Recycler " + i,
        user_email: "recycler" + i + "@example.invalid", created_at: new Date(Date.UTC(2026, 8, 14, 0, i)).toISOString(),
        verification_status: i === 31 ? "approved" : i === 32 ? "rejected" : "pending",
        city: "Benalmadena", province: "Malaga", country: "Spain", latitude: "36.7", longitude: "-4.4",
        validation_status: i % 3 === 0 ? "flagged" : i % 3 === 1 ? "auto_approved" : null,
        validation_score: i % 3 === 0 ? 40 : i % 3 === 1 ? 95 : 70,
        validation_flags: i % 3 === 0 ? ["evidence_requires_review"] : [],
      }));
      events[29].user_display_name = "Fixture Recycler 29 with a particularly long display name";
      events[29].city = "A very long city name for mobile layout verification";
      events[5].city = null; events[5].province = null; events[5].country = null;
      function rows() {
        return events.flatMap((event) => [
          { ...event, type: "bag", url: event.id === "event-3" ? "file:///legacy.jpg" : event.id === "event-4" ? "https://fixture.invalid/broken-bag.jpg" : event.id === "event-5" ? null : "https://fixture.invalid/bag.jpg" },
          { ...event, type: "container", url: "https://fixture.invalid/container.jpg" },
        ]).concat([{ id: "legacy-only", verification_status: "pending", type: "bag", url: "file:///old.jpg" }]);
      }
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("dialog", async (dialog) => { confirms.push(dialog.message()); if (accept) await dialog.accept(); else await dialog.dismiss(); });
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        if (url.hostname === "fixture.invalid") return url.pathname.includes("broken") ? route.fulfill({ status: 404, body: "Missing fixture photo" }) : route.fulfill({ status: 200, contentType: "image/jpeg", body: evidence });
        const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,OPTIONS" };
        const method = route.request().method();
        if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
        if (url.pathname === "/admin/events" && method === "GET") {
          if (mode === "loading") await new Promise((resolve) => setTimeout(resolve, 1000));
          if (mode === "error") return route.fulfill({ status: 500, headers, json: { error: "Fixture queue unavailable" } });
          return route.fulfill({ headers, json: { events: mode === "empty" ? [] : rows() } });
        }
        const match = url.pathname.match(/^\/admin\/events\/(event-\d+)\/(approve|reject)$/);
        if (match && method === "POST") {
          writes.push({ id: match[1], action: match[2] });
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (failAction) return route.fulfill({ status: 500, headers, json: { error: "Fixture action failed" } });
          events.find((event) => event.id === match[1]).verification_status = match[2] === "approve" ? "approved" : "rejected";
          return route.fulfill({ headers, json: { ok: true } });
        }
        return route.abort();
      });
      await page.addInitScript(() => {
        localStorage.setItem("greenloop_jwt", "fixture." + btoa(JSON.stringify({ role: "admin", email: "admin@example.invalid", exp: 4102444800 })) + ".fixture");
        localStorage.setItem("greenloop_dashboard_language", "en");
      });
      await page.goto(origin + "/admin/moderation");
      const queue = page.getByRole("region", { name: "Scan queue", exact: true });
      const review = page.locator("#scan-review-pane");
      await queue.waitFor();
      assert.equal(await queue.getByRole("checkbox").count(), 25, "Two photos grouped into one scan");
      assert.ok((await queue.getByRole("button", { pressed: true }).innerText()).includes("Fixture Recycler 30"), "Newest first");
      await page.screenshot({ path: path.join(output, "queue-" + width + ".png"), fullPage: true });
      const openScan = async (number) => {
        if (width < 1280 && await review.isVisible()) await review.getByRole("button", { name: "Queue", exact: true }).click();
        await queue.getByRole("button", { name: new RegExp("^Fixture Recycler " + number + "\\b") }).click();
        await review.getByRole("heading", { name: new RegExp("^Fixture Recycler " + number + "\\b") }).waitFor();
      };
      await openScan(30);
      for (const lang of ["en", "es"]) {
        if (lang === "es") await page.getByRole("button", { name: "ES", exact: true }).click();
        const enlarge = review.getByRole("button", { name: lang === "en" ? "Enlarge Bag" : "Ampliar Bolsa", exact: true });
        await enlarge.locator("img").evaluate((img) => img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = resolve; }));
        assert.ok(await enlarge.locator("img").evaluate((img) => img.naturalWidth > 0 && getComputedStyle(img).objectFit === "contain"));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (width < 640) {
          const action = await review.getByRole("button", { name: lang === "en" ? "Approve" : "Aprobar", exact: true }).boundingBox();
          assert.ok(action.y >= 0 && action.y + action.height <= height + 1, "Phone moderation actions stay within the viewport");
        }
        await page.screenshot({ path: path.join(output, "review-" + width + "-" + lang + ".png"), fullPage: true });
        await enlarge.click();
        const viewer = page.getByRole("dialog");
        await viewer.waitFor();
        assert.ok((await viewer.innerText()).includes("Fixture Recycler 30"));
        assert.ok((await viewer.innerText()).includes("Benalmadena"));
        await page.keyboard.press("r");
        assert.equal(writes.length, 0, "Shortcuts cannot moderate while viewing a photo");
        await page.screenshot({ path: path.join(output, "photo-" + width + "-" + lang + ".png") });
        await viewer.getByRole("button", { name: lang === "en" ? "Zoom in" : "Acercar", exact: true }).click();
        assert.ok(await viewer.locator("img").evaluate((img) => img.parentElement.clientWidth > img.parentElement.parentElement.clientWidth));
        await page.keyboard.press("Escape");
        await viewer.waitFor({ state: "detached" });
        await page.waitForFunction((label) => document.activeElement?.getAttribute("aria-label") === label, lang === "en" ? "Enlarge Bag" : "Ampliar Bolsa");
      }
      await page.getByRole("button", { name: "EN", exact: true }).click();
      if (width < 640) {
        await review.getByRole("button", { name: "Enlarge Container", exact: true }).waitFor();
        assert.equal(await review.getByRole("button", { name: "Enlarge Bag", exact: true }).isVisible(), true, "Both evidence photos remain visible on mobile");
      }
      assert.equal(await review.locator("details").last().getAttribute("open"), "", "Scan details are visible without another click");
      assert.ok((await review.innerText()).includes("36.70000, -4.40000"));
      assert.ok((await review.innerText()).includes("recycler30@example.invalid"));
      if (width < 1280) await review.getByRole("button", { name: "Queue", exact: true }).click();
      await queue.getByRole("button", { name: "Next page", exact: true }).click();
      await openScan(3);
      await review.getByText("Legacy image (not available)").waitFor();
      await openScan(4);
      await review.getByText("Photo could not be loaded").waitFor();
      await openScan(5);
      await review.getByText("Missing photo").waitFor();
      assert.ok((await review.innerText()).includes("36.70000, -4.40000"), "GPS fallback preserved");
      if (width < 1280) await review.getByRole("button", { name: "Queue", exact: true }).click();
      assert.ok(await queue.getByRole("button", { name: /^Fixture Recycler 5\b/ }).isVisible(), "Back retains page");
      await queue.getByRole("button", { name: "Previous page", exact: true }).click();
      await openScan(29);
      failAction = true;
      await review.getByRole("button", { name: "Reject", exact: true }).click();
      await page.getByRole("alert").getByText("Fixture action failed").waitFor();
      assert.equal(events[29].verification_status, "pending");
      failAction = false;
      await review.getByRole("button", { name: "Reject", exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('main [role="status"]'));
      assert.equal(events[29].verification_status, "rejected");
      await openScan(28);
      await page.keyboard.press("a");
      await page.waitForFunction(() => !document.querySelector('main [role="status"]'));
      assert.equal(events[28].verification_status, "approved", "Shortcut targets the reviewed scan");
      assert.equal(events[30].verification_status, "pending", "Shortcut must not target first queue row");
      if (width < 1280) await review.getByRole("button", { name: "Queue", exact: true }).click();
      await queue.getByLabel("Select event event-30", { exact: true }).check();
      await queue.getByLabel("Select event event-27", { exact: true }).check();
      const beforeTyping = writes.length;
      await queue.getByLabel("Select event event-27", { exact: true }).press("r");
      assert.equal(writes.length, beforeTyping, "Typing/checkbox shortcut guard preserved");
      await page.locator("summary").filter({ hasText: /^Bulk actions/ }).click();
      accept = false;
      await page.getByRole("button", { name: "Approve selected", exact: true }).click();
      assert.equal(writes.length, beforeTyping, "Cancelled bulk operation makes no requests");
      accept = true;
      await page.getByRole("button", { name: "Approve selected", exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('#moderation-tab-approved').disabled);
      assert.deepEqual(writes.slice(-2), [{ id: "event-30", action: "approve" }, { id: "event-27", action: "approve" }]);
      assert.ok(confirms.some((message) => message.includes("approve 2 recycling events")));
      await page.getByRole("tab", { name: "Approved", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "Approve selected", exact: true }).count(), 0);
      await queue.waitFor();
      assert.equal(await queue.getByRole("checkbox").count(), 0);
      await page.getByRole("tab", { name: "Approved", exact: true }).press("ArrowRight");
      assert.equal(await page.getByRole("tab", { name: "Rejected", exact: true }).getAttribute("aria-selected"), "true");
      await page.getByRole("tab", { name: "Rejected", exact: true }).press("Home");
      await page.locator("summary").filter({ hasText: /^Bulk actions/ }).click();
      const remaining = events.filter((event) => event.verification_status === "pending").length;
      await page.getByRole("button", { name: "Reject all", exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('#moderation-tab-approved').disabled);
      assert.ok(confirms.at(-1).includes("reject " + remaining + " recycling events"));
      assert.equal(events.filter((event) => event.verification_status === "pending").length, 0, "All targets entire filtered queue, not just first page");
      await page.getByText("No events in this queue.").waitFor();
      mode = "error";
      await page.getByRole("button", { name: "Refresh queue", exact: true }).click();
      await page.getByRole("alert").getByText("Fixture queue unavailable").waitFor();
      mode = "empty";
      await page.getByRole("button", { name: "Refresh queue", exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('main [role="alert"]'));
      mode = "loading";
      await page.reload();
      await page.getByRole("status").getByText("Loading moderation queue...").waitFor();
      await page.getByText("No events in this queue.").waitFor();
      assert.deepEqual(errors, []);
      console.log("PASS moderation " + width + "px: grouped queue, responsive photos/zoom, EN/ES, actions, shortcuts, bulk confirmation, states");
      await page.close();
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
