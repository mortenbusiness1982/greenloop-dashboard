/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression harness. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_DASHBOARD_ORIGIN || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [390, 900, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', async route => {
        if (new URL(route.request().url()).origin === origin) return route.continue();
        const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' };
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        assert.equal(route.request().method(), 'GET');
        return route.fulfill({ headers, json: { users: [], brands: [], products: [], events: [], totals: {}, geoBreakdown: [] } });
      });
      await page.addInitScript(() => {
        localStorage.setItem('greenloop_jwt', 'fixture.' + btoa(JSON.stringify({ role: 'admin', email: 'admin@example.invalid', exp: 4102444800 })) + '.fixture');
        localStorage.setItem('greenloop_dashboard_language', 'en');
      });
      await page.goto(origin + '/admin/users');
      await page.getByRole('heading', { name: 'Users', exact: true }).waitFor();
      assert.equal(await page.locator('h1:visible').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width === 390) {
        const open = page.getByRole('button', { name: 'Open navigation', exact: true });
        await open.click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        assert.equal(await dialog.getByRole('button', { name: 'Logout', exact: true }).isVisible(), true);
        for (let i = 0; i < 30; i++) {
          await page.keyboard.press('Tab');
          assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true, 'Drawer traps keyboard focus');
        }
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        await open.evaluate(node => { if (document.activeElement !== node) throw Error('Menu focus not restored'); });
        await open.click();
        await dialog.getByRole('link', { name: 'Overview', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        await page.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
      } else {
        const aside = page.locator('aside:visible');
        const bounds = await aside.boundingBox();
        assert.equal(bounds.width, width === 900 ? 56 : 224);
        assert.equal(await aside.locator('a[aria-current=page]').count(), 1);
      }
      await page.getByRole('button', { name: 'ES', exact: true }).click();
      assert.equal(await page.locator('h1:visible').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      console.log(`PASS shell ${width}: single title, navigation, language, focus and responsive widths`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
