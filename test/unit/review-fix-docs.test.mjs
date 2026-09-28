import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { maintainerWorkflows } from '../../src/lib/maintainer-workflows.mjs';

test('shipped troubleshooting uses registry-neutral mirror guidance', async () => {
  const text = await readFile(new URL('../../docs/08-troubleshooting.md', import.meta.url), 'utf8');
  assert.doesNotMatch(text, /packagefeedproxy\.microsoft\.io/);
  assert.match(text, /npm_config_registry/);
  assert.match(text, /UV_DEFAULT_INDEX/);
});

test('adopter command table remains contiguous', async () => {
  const text = await readFile(new URL('../../specs/001-baton-template/contracts/cli.md', import.meta.url), 'utf8');
  const table = text.split('## Adopter commands\n')[1].split('\n## Maintainer commands')[0];
  assert.match(table, /\| `handoff migrate`[^\n]*\n\| `models apply`/);
});

test('review instructions explain the normalized handoff payload', async () => {
  const text = await readFile(new URL('../../baton/skills/baton-review/SKILL.md', import.meta.url), 'utf8');
  assert.match(text, /findings_path/);
  assert.match(text, /blocking_findings/);
  assert.match(text, /automatically routes/);
});

test('Windows smoke workflow is classified as maintainer-only', () => {
  assert.ok(maintainerWorkflows.includes('mvp-windows-smoke.yml'));
});
