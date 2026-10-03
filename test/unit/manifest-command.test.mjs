import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { run } from '../../src/commands/manifest.mjs';
import { sourceRoot } from '../helpers/index.mjs';

test('committed source manifest equals canonical regeneration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-source-manifest-'));
  try {
    const lock = JSON.parse(await readFile(join(sourceRoot, 'baton.lock.json'), 'utf8'));
    const paths = ['baton.lock.json', 'package.json', '.baton/manifest.json',
      '.baton/config.yml', '.github/copilot-instructions.md',
      ...lock.files.filter(entry => entry.packs.includes('core')).map(entry => entry.stored_at)];
    for (const path of paths) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await cp(join(sourceRoot, path), join(root, path));
    }
    await mkdir(join(root, 'packs'));
    for (const name of (await readdir(join(sourceRoot, 'packs'))).filter(item => item.endsWith('.yml'))) {
      await cp(join(sourceRoot, 'packs', name), join(root, 'packs', name));
    }
    await run(root, []);
    assert.equal(await readFile(join(root, '.baton/manifest.json'), 'utf8'),
      await readFile(join(sourceRoot, '.baton/manifest.json'), 'utf8'),
      'run npm run manifest after canonical sync or instruction-marker changes');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('manifest records only installed core files and a stable instruction marker', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-manifest-'));
  try {
    const lock = JSON.parse(await readFile(join(sourceRoot, 'baton.lock.json'), 'utf8'));
    const entry = lock.files.find((file) => file.packs.includes('core'));
    lock.files = [entry];
    await writeFile(join(root, 'baton.lock.json'), JSON.stringify(lock));
    await cp(join(sourceRoot, 'package.json'), join(root, 'package.json'));
    for (const path of [entry.path, '.github/copilot-instructions.md', 'baton/templates/config.yml']) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await cp(join(sourceRoot, path), join(root, path));
    }
    await mkdir(join(root, 'packs'));
    for (const name of (await readdir(join(sourceRoot, 'packs'))).filter((item) => item.endsWith('.yml'))) {
      await cp(join(sourceRoot, 'packs', name), join(root, 'packs', name));
    }
    assert.equal((await run(root, [])).data.files, 1);
    const content = await readFile(join(root, '.baton/manifest.json'), 'utf8');
    const manifest = JSON.parse(content);
    assert.equal(manifest.source, 'template');
    assert.equal(manifest.files[0].path, entry.path);
    assert.equal(manifest.marker_sections[0].marker, 'BATON');
    assert.match(await readFile(join(root, '.baton/config.yml'), 'utf8'), /run: npm run check/);
    await run(root, []);
    assert.equal(await readFile(join(root, '.baton/manifest.json'), 'utf8'), content);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
