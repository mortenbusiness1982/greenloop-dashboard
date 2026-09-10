const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { chromium } = require('playwright');

const source = fs.readFileSync(path.join(__dirname, '../lib/emailPreview.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsObject = {};
new Function('exports', compiled)(exportsObject);
const { buildIsolatedEmailPreview } = exportsObject;

test('outreach preview isolates scripts, storage, CSS, forms and tracking requests', async () => {
  const component = fs.readFileSync(path.join(__dirname, '../components/admin/AdminOutreachWorkspace.tsx'), 'utf8');
  assert.match(component, /<iframe[\s\S]*?sandbox=""[\s\S]*?referrerPolicy="no-referrer"[\s\S]*?srcDoc=\{buildIsolatedEmailPreview/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
  const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || undefined });
  try {
    const page = await browser.newPage();
    const outbound = [];
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url !== 'https://dashboard.test/') outbound.push(url);
      return route.fulfill({ contentType: 'text/html', body: '<html><body><h1 id="host">Dashboard</h1></body></html>' });
    });
    await page.goto('https://dashboard.test/');
    await page.evaluate(() => localStorage.setItem('token', 'fixture-only-token'));
    const malicious = `<style>body{background:rgb(255,0,0)}#host{display:none}</style>
      <script>parent.document.body.dataset.compromised='yes';fetch('https://tracker.test/script')</script>
      <img src="https://tracker.test/pixel" onerror="parent.document.body.dataset.compromised='yes'">
      <iframe src="https://tracker.test/frame"></iframe>
      <form action="https://tracker.test/form"><button>Submit</button></form>
      <p id="email-copy">Hello community</p><table><tr><td>GreenLoop signature</td></tr></table>`;
    await page.evaluate(doc => {
      const frame = document.createElement('iframe');
      frame.title = 'Email preview';
      frame.setAttribute('sandbox', '');
      frame.referrerPolicy = 'no-referrer';
      frame.style.cssText = 'height:540px;width:100%;box-sizing:border-box';
      frame.srcdoc = doc;
      document.body.append(frame);
    }, buildIsolatedEmailPreview(malicious));
    const preview = page.frameLocator('iframe[title="Email preview"]');
    await preview.locator('#email-copy').waitFor();
    await preview.getByRole('button', { name: 'Submit' }).click();
    assert.equal(await page.locator('#host').isVisible(), true);
    assert.equal(await page.locator('body').getAttribute('data-compromised'), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), 'fixture-only-token');
    assert.notEqual(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 0, 0)');
    const frame = page.frames().find(f => f !== page.mainFrame());
    assert.equal(await frame.evaluate(() => { try { return parent.localStorage.getItem('token'); } catch { return 'blocked'; } }), 'blocked');
    assert.deepEqual(outbound, []);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      assert.equal(await preview.locator('#email-copy').textContent(), 'Hello community');
      assert.ok((await page.locator('iframe[title="Email preview"]').boundingBox()).width <= width);
    }
  } finally {
    await browser.close();
  }
});
