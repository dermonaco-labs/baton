import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isUserModified, writeManifest, readManifest, installedScript } from '../../src/lib/manifest.mjs';

test('manifest detects edits without treating missing files as unmodified', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-manifest-'));
  try {
    await mkdir(join(root, '.baton'));
    await writeFile(join(root, 'owned.txt'), 'original');
    const manifest = { schema: 1, baton_version: '0.1.0', installed_at: new Date().toISOString(), source: 'init', upstreams: {}, packs: ['core'], files: [], marker_sections: [] };
    await writeManifest(root, manifest);
    assert.deepEqual(await readManifest(root), manifest);
    assert.equal(await isUserModified(root, { path: 'owned.txt', sha256: 'not-the-hash' }), true);
    assert.equal(await isUserModified(root, { path: 'missing.txt', sha256: 'not-the-hash' }), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('installed script flavour prefers the canonical manifest script field over the x-script alias', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-manifest-'));
  try {
    assert.equal(await installedScript(root, { script: 'ps', 'x-script': 'py' }), 'ps');
    assert.equal(await installedScript(root, { 'x-script': 'py' }), 'py');
    assert.equal(await installedScript(root, {}), 'sh');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});