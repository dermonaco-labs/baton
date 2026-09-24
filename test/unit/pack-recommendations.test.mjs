import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { run as validate } from '../../src/commands/validate.mjs';
import { run as doctor } from '../../src/commands/doctor.mjs';

const root = resolve(import.meta.dirname, '../..');

test('validate and doctor recommend each absent pack without escalating in strict mode', async () => {
  const validation = await validate(root, ['--path', 'README.md']);
  const recommendations = validation.warnings.filter(issue => issue.code === 'W_PACK_RECOMMENDED');
  assert.ok(recommendations.some(issue => issue.message.includes('review-plus') && issue.message.includes('performance-oracle')));
  assert.equal(new Set(recommendations.map(issue => issue.message.split(':')[0])).size, recommendations.length);

  const strict = await doctor(root, ['--strict']);
  assert.ok(strict.warnings.some(issue => issue.code === 'W_PACK_RECOMMENDED'));
  assert.ok(!strict.errors.some(issue => issue.code === 'W_PACK_RECOMMENDED'));
});

test('a derived repository retains recommendations after the pack definitions are removed', async () => {
  const derived = await mkdtemp(join(tmpdir(), 'baton-packs-'));
  try {
    await mkdir(join(derived, 'baton'), { recursive: true });
    await cp(join(root, 'baton/schemas'), join(derived, 'baton/schemas'), { recursive: true });
    await mkdir(join(derived, '.baton'), { recursive: true });
    await writeFile(join(derived, '.baton/manifest.json'), JSON.stringify({
      schema: 1, packs: ['core'], recommended_packs: [{ pack: 'review-plus', refs: ['performance-oracle'] }],
      files: [],
    }));
    const result = await validate(derived, ['--path', '.baton/manifest.json']);
    assert.ok(result.warnings.some(issue => issue.code === 'W_PACK_RECOMMENDED' && issue.message.includes('performance-oracle')));
  } finally {
    await rm(derived, { recursive: true, force: true });
  }
});
