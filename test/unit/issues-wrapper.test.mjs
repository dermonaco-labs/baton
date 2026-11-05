import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sourceRoot } from '../helpers/index.mjs';

const stored = 'packs/issues/files/.github/skills/speckit-taskstoissues/SKILL.md';
const source = 'baton/skills/speckit-taskstoissues/SKILL.md';
const message = '"`/speckit-github-taskstoissues` is not installed. Install Baton\'s `issues` pack, which ships '
  + 'Spec Kit\'s `github` extension; `/speckit-taskstoissues` only delegates to it."';

test('the issues compatibility wrapper only delegates to the github extension command', async () => {
  const bytes = await readFile(join(sourceRoot, stored));
  assert.deepEqual(bytes, await readFile(join(sourceRoot, source)));
  const text = bytes.toString('utf8');
  assert.match(text, /^---\r?\nname: speckit-taskstoissues\r?\n/);
  const references = new Set([...text.matchAll(/\/(speckit-[\w-]+)/g)].map(([, name]) => name));
  references.delete('speckit-taskstoissues');
  assert.deepEqual([...references], ['speckit-github-taskstoissues']);
  assert.ok(text.replace(/\s+/g, ' ').includes(message), 'missing-command message must name the issues pack');
  for (const forbidden of [/issue_write/, /list_issues/, /gh issue/, /scripts\//, /\.(?:sh|ps1|py)\b/]) {
    assert.doesNotMatch(text, forbidden);
  }
});
