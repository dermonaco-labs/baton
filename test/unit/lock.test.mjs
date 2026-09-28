import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { sha256 } from '../../src/lib/upstream.mjs';
import { run as lock } from '../../src/commands/lock.mjs';
import { sourceRoot } from '../helpers/index.mjs';

test('lock verify accepts matching files and reports tampering as E_LOCK_MISMATCH', async () => {
  const root = await mkdtemp(join(sourceRoot, 'test/fixtures/lock-check-'));
  try {
    await mkdir(join(root, 'baton/upstream'), { recursive: true });
    await mkdir(join(root, 'packs'), { recursive: true });
    const requirement = 'specify-cli==1.0.11\n';
    const asset = 'pack contents\n';
    await writeFile(join(root, 'baton/upstream/specify-cli.requirements.in'), requirement);
    await writeFile(join(root, 'baton/upstream/specify-cli.requirements.txt'), 'pinned dependencies\n');
    await writeFile(join(root, 'packs/core.yml'), asset);
    await writeFile(join(root, 'baton.lock.json'), JSON.stringify({
      schema: 1,
      upstreams: { speckit: {
        version: '1.0.11',
        requirements: 'baton/upstream/specify-cli.requirements.txt',
        requirements_sha256: sha256('pinned dependencies\n'),
      } },
      files: [{ stored_at: 'packs/core.yml', sha256: sha256(asset) }],
    }));
    assert.deepEqual(lock(root, ['verify']), { data: { ok: true, files: 1 }, errors: [] });

    await writeFile(join(root, 'packs/core.yml'), 'tampered pack\n');
    const tampered = lock(root, ['verify']);
    assert.equal(tampered.exitCode, 1);
    assert.ok(tampered.errors.some(({ code, message }) => code === 'E_LOCK_MISMATCH' && message.includes('packs/core.yml')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('lock verify reports malformed JSON as E_LOCK_MISMATCH instead of throwing', async () => {
  const root = await mkdtemp(join(sourceRoot, 'test/fixtures/lock-malformed-'));
  try {
    await writeFile(join(root, 'baton.lock.json'), '{ invalid json');
    const result = lock(root, ['verify']);
    assert.equal(result.exitCode, 1);
    assert.ok(result.errors.some(({ code }) => code === 'E_LOCK_MISMATCH'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
