import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPacks, resolvePacks, validatePackClosure } from '../../src/lib/packs.mjs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const definitions = new Map([
  ['core', { id: 'core', requires: [], conflicts: [] }],
  ['learning', { id: 'learning', requires: ['core'], conflicts: [] }],
  ['docs', { id: 'docs', requires: ['learning'], conflicts: ['security'] }],
  ['security', { id: 'security', requires: [], conflicts: [] }],
]);

test('pack closure includes core once and detects conflicts', () => {
  assert.deepEqual(resolvePacks(definitions, ['docs']), ['core', 'learning', 'docs']);
  assert.throws(() => resolvePacks(definitions, ['docs', 'security']), /conflict/i);
  assert.throws(() => resolvePacks(definitions, ['missing']), /unknown pack/i);
});

test('each shipped pack has a closed dependency set', async () => {
  const root = resolve(import.meta.dirname, '../..');
  const shipped = await loadPacks(root);
  for (const id of shipped.keys()) {
    const installed = resolvePacks(shipped, [id]);
    const contents = new Map();
    for (const name of installed) {
      for (const file of shipped.get(name).files) {
        const stored = name === 'core' ? file.path : `packs/${name}/files/${file.path}`;
        contents.set(file.path, await readFile(resolve(root, stored), 'utf8'));
      }
    }
    assert.deepEqual(validatePackClosure(shipped, id, contents), [], id);
  }
});

test('a docs-review pack missing its dispatched persona fails closed', () => {
  const defs = new Map([
    ['core', { id: 'core', requires: [], conflicts: [], files: [] }],
    ['docs-review', { id: 'docs-review', requires: ['core'], conflicts: [],
      files: [{ path: '.github/skills/document-review/SKILL.md' }], optional_refs: [] }],
  ]);
  const contents = new Map([['.github/skills/document-review/SKILL.md', 'subagent_type: adversarial-document-reviewer']]);
  assert.ok(validatePackClosure(defs, 'docs-review', contents).some((error) => error.code === 'E_DANGLING_REF'));
});

test('closure detects optional specialized agents with non-reviewer role suffixes', () => {
  const defs = new Map([['core', { id: 'core', requires: [], conflicts: [],
    files: [{ path: '.github/skills/ce-compound/SKILL.md' }], optional_refs: [] }]]);
  const contents = new Map([['.github/skills/ce-compound/SKILL.md', [
    'Based on problem type, optionally invoke specialized agents:',
    '- **performance_issue** → `performance-oracle`',
    '- **database_issue** → `data-integrity-guardian`',
    '- **pattern-recognition-specialist**: Identifies repeating issues',
    '- **best-practices-researcher**: Enriches the documentation',
    '- **framework-docs-researcher**: Links reference documentation',
    '- **every-style-editor**: Reviews documentation style',
  ].join('\n')]]);
  const issues = validatePackClosure(defs, 'core', contents);
  for (const name of ['performance-oracle', 'data-integrity-guardian', 'pattern-recognition-specialist',
    'best-practices-researcher', 'framework-docs-researcher', 'every-style-editor']) {
    assert.ok(issues.some((issue) => issue.message.includes(`Reference ${name} `)), name);
  }
});

test('closure ignores CSS, tool decorators and browser element locators', () => {
  const defs = new Map([['core', { id: 'core', requires: [], conflicts: [],
    files: [{ path: '.github/skills/example/SKILL.md' }], optional_refs: [] }]]);
  const contents = new Map([['.github/skills/example/SKILL.md',
    '`@tool` decorators, `@font-face` declarations, `@package` instead of `@package@version`; agent-browser hover @e1']]);
  assert.deepEqual(validatePackClosure(defs, 'core', contents), []);
});
