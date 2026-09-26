import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('approved dashboard shell and responsive layout are retained', () => {
  const shell = source('components/crm/CrmShell.tsx');
  assert.match(shell, /CrmShell\.module\.css/);
  assert.match(shell, /WorkspaceHeaderTarget\.Provider/);
  const css = source('components/crm/CrmShell.module.css');
  assert.match(css, /224px minmax/);
  assert.match(css, /56px minmax/);
  assert.match(source('components/crm/WorkspaceHeader.tsx'), /createPortal/);
});

test('key workspaces retain the shared design', () => {
  for (const path of [
    'app/(dashboard)/admin/users/page.tsx',
    'components/admin/AdminOverviewWorkspace.tsx',
    'components/admin/AdminChallengesWorkspace.tsx',
    'components/admin/AdminOutreachWorkspace.tsx',
  ]) assert.match(source(path), /<WorkspaceHeader\b/, path);
  assert.match(source('components/admin/AdminChallengesWorkspace.tsx'), /<RecordSplit\b/);
});

test('restoration retains public community moderation', () => {
  const challenges = source('components/admin/AdminChallengesWorkspace.tsx');
  assert.match(challenges, /\/admin\/community-challenges\/\$\{challenge\.id\}\/review/);
  assert.match(challenges, /reviewStatus === "pending_review"/);
  assert.match(challenges, /!challenge\.organizationId/);
  assert.match(challenges, /reviewUserCommunityChallenge\(challenge, "approved"\)/);
  assert.match(challenges, /reviewUserCommunityChallenge\(challenge, "rejected"\)/);
});
