const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');

function fixture() {
  const updates = [], requests = [];
  let stateIndex = 0, resolvePost, rejectPost, failLoad = false;
  const values = { title: 'Community challenge', description: 'Community recycling campaign',
    visibility: 'public', requiredCount: '10', startsAt: '2026-09-01T00:00', endsAt: '2026-10-01T00:00',
    rewardTitle: 'Our reward', affiliateUrl: 'https://example.test', instructions: 'Open offer' };
  const apiFetch = async (url, options) => {
    if (options.method === 'POST') {
      requests.push(options.body);
      return new Promise((resolve, reject) => { resolvePost = resolve; rejectPost = reject; });
    }
    if (failLoad) throw Error('List unavailable');
    return { challenges: [] };
  };
  const react = { useState: initial => {
    const index = stateIndex++;
    return [index === 0 ? true : initial, value => updates.push({ index, value })];
  }, useRef: value => ({ current: value }), useEffect() {}, useCallback: fn => fn };
  const source = fs.readFileSync(path.join(__dirname, '../components/brand/SponsoredChallengeManager.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exported = {};
  const context = { exports: exported, crypto: { randomUUID },
    FormData: class { constructor(form) { assert.equal(form.marker, 'form'); } get(key) { return values[key] ?? null; } },
    require: id => id === 'react' ? react : id === '@/lib/api' ? { apiFetch } :
      id === '@/lib/auth' ? { getToken: () => 'fixture-token' } : require(id),
  };
  vm.runInNewContext(compiled, context);
  const tree = exported.SponsoredChallengeManager({ products: [] });
  function findForm(node) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'form') return node;
    return [node.props?.children].flat(Infinity).map(findForm).find(Boolean);
  }
  const handler = findForm(tree).props.onSubmit;
  let resets = 0;
  return { updates, requests, values, resetCount: () => resets,
    submit() {
      const event = { preventDefault() {}, currentTarget: { marker: 'form', reset() { resets++; } } };
      const pending = handler(event);
      // React clears currentTarget after synchronous event dispatch.
      event.currentTarget = null;
      return pending;
    }, complete: () => resolvePost({ ok: true }), fail: () => rejectPost(Error('Connection lost')),
    failList: () => { failLoad = true; },
  };
}

test('successful async submission resets the captured form once and blocks duplicate clicks', async () => {
  const f = fixture();
  const first = f.submit(), duplicate = f.submit();
  assert.equal(f.requests.length, 1);
  f.complete(); await Promise.all([first, duplicate]);
  assert.equal(f.resetCount(), 1);
  assert.ok(f.updates.some(u => u.value === 'Submitted for GreenLoop review.'));
});

test('sponsored campaigns only submit the public visibility accepted by the API', async () => {
  const f = fixture();
  f.values.visibility = 'private';
  const pending = f.submit();
  assert.equal(f.requests[0].visibility, 'public');
  f.complete(); await pending;
});

test('uncertain retries reuse the request ID; edited content receives a new ID', async () => {
  const f = fixture();
  const first = f.submit(); f.fail(); await first;
  const retry = f.submit();
  assert.equal(f.requests[0].requestId, f.requests[1].requestId);
  f.fail(); await retry;
  f.values.title = 'A different campaign';
  const edited = f.submit();
  assert.notEqual(f.requests[2].requestId, f.requests[1].requestId);
  f.complete(); await edited;
});

test('a list refresh failure does not report a successful creation as failed', async () => {
  const f = fixture(); f.failList();
  const pending = f.submit(); f.complete(); await pending;
  assert.equal(f.resetCount(), 1);
  assert.ok(f.updates.some(u => u.value === 'Submitted for GreenLoop review. Refresh to see the updated list.'));
});
