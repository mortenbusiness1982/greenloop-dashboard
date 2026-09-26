import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
assert.equal(git('status', '--porcelain'), '', 'Release requires a clean committed checkout; preserve and reconcile local changes first.');
git('fetch', 'origin', 'main');
try {
  git('merge-base', '--is-ancestor', 'origin/main', 'HEAD');
} catch {
  throw new Error('Stale release checkout: integrate current origin/main before publishing. Do not deploy an old Studio snapshot.');
}
console.log('Release ancestry and clean checkout verified.');
