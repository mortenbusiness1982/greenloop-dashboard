const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

test('Android App Links include the certificates reported by Play Console', () => {
  const statements = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/.well-known/assetlinks.json'), 'utf8'));
  const app = statements.find(({ target }) => target.package_name === 'com.mortenodam.greenloopapp');
  assert.ok(app);
  assert.deepEqual(app.relation, ['delegate_permission/common.handle_all_urls']);
  assert.equal(app.target.namespace, 'android_app');
  const fingerprints = app.target.sha256_cert_fingerprints;
  assert.equal(new Set(fingerprints).size, fingerprints.length);
  for (const fingerprint of fingerprints) assert.match(fingerprint, /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/);
  for (const fingerprint of [
    '15:FB:D5:EC:A6:5A:4B:55:E0:7B:FF:1D:E6:52:34:D7:8D:8F:97:E7:CE:14:5C:42:FB:60:78:4B:22:55:2D:7F',
    'F2:E4:8D:FD:B2:12:37:8D:0E:BB:5B:B5:0B:E3:F2:56:17:B4:3E:8E:C9:55:91:B0:B5:E0:0D:77:85:D4:21:3A',
    'A5:59:A5:CE:DF:4A:31:89:32:6F:59:16:1A:98:FD:23:0E:0C:5C:E1:0E:0D:25:3F:FD:3C:7E:BC:34:BE:8B:33',
    '55:C7:06:44:81:38:8B:DD:36:F6:D0:53:B2:D1:17:69:C2:C1:11:8F:17:B7:F5:7E:75:73:33:25:27:E2:AF:3A',
  ]) assert.ok(fingerprints.includes(fingerprint));
});
