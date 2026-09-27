import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tempRepo, runCli, sourceRoot } from '../helpers/index.mjs';
import { digest } from '../../src/lib/overlay.mjs';

const changed = '.github/agents/correctness-reviewer.agent.md';
const unchanged = '.github/agents/testing-reviewer.agent.md';
const instructions = '.github/copilot-instructions.md';
const section = /<!-- BATON:START -->\r?\n([\s\S]*?)<!-- BATON:END -->/;

async function fixture() {
  const repo = await tempRepo('prev-release');
  const old = await Promise.all([changed, unchanged].map(async path => ({
    path, sha256: digest(await readFile(join(repo.root, path))), pack: 'core', owner: 'atv', managed: true
  })));
  const content = await readFile(join(repo.root, instructions), 'utf8');
  const manifest = {
    schema: 1, baton_version: '0.0.9', installed_at: '2026-01-01T00:00:00Z',
    source: 'init', upstreams: { speckit: '1.0.10@old', atv: 'main@old' },
    packs: ['core'], files: old,
    marker_sections: [{ path: instructions, marker: 'BATON', sha256: digest(section.exec(content)[1]) }]
  };
  await mkdir(join(repo.root, '.baton'), { recursive: true });
  await writeFile(join(repo.root, '.baton/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(join(repo.root, changed), 'local custom reviewer\n');
  return repo;
}

async function exists(root, path) {
  try { await stat(join(root, path)); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

test('update replaces only unmodified managed files and reports changed files with .new copies', async () => {
  const { root, cleanup } = await fixture();
  try {
    const previous = await readFile(join(root, unchanged));
    const result = await runCli(root, ['update', '--json']);
    assert.equal(result.code, 4, result.stdout + result.stderr);
    assert.equal(await readFile(join(root, changed), 'utf8'), 'local custom reviewer\n');
    assert.notDeepEqual(await readFile(join(root, unchanged)), previous);
    assert.deepEqual(await readFile(join(root, unchanged)), await readFile(join(sourceRoot, unchanged)));
    assert.deepEqual(await readFile(join(root, `.baton/conflicts/${changed}.new`)),
      await readFile(join(sourceRoot, changed)));
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.equal(manifest.baton_version, '0.1.0');
    assert.equal(manifest.source, 'init');
    assert.equal(manifest.installed_at, '2026-01-01T00:00:00Z');
    assert.equal(manifest.files.find(file => file.path === changed).sha256,
      digest(await readFile(join(sourceRoot, 'test/fixtures/prev-release', changed))));
    assert.equal(manifest.files.find(file => file.path === unchanged).sha256,
      digest(await readFile(join(sourceRoot, unchanged))));
    assert.match(result.stdout, /user-modified|conflict/i);
  } finally { await cleanup(); }
});

test('update preserves unrelated instruction bytes and only replaces a pristine BATON section', async () => {
  const { root, cleanup } = await fixture();
  try {
    const result = await runCli(root, ['update']);
    assert.equal(result.code, 4, result.stdout + result.stderr);
    const text = await readFile(join(root, instructions), 'utf8');
    assert.match(text, /^Project preface\.\r?\n/);
    assert.match(text, /Project suffix\.\r?\n$/);
    assert.doesNotMatch(text, /Old Baton instructions/);
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.equal(manifest.marker_sections[0].sha256, digest(section.exec(text)[1]));
  } finally { await cleanup(); }
});

test('update preserves edited BATON section and unmanaged destination files', async () => {
  const { root, cleanup } = await fixture();
  try {
    const original = (await readFile(join(root, instructions), 'utf8')).replace('Old Baton instructions.', 'My custom instructions.');
    await writeFile(join(root, instructions), original);
    const unmanaged = '.github/agents/maintainability-reviewer.agent.md';
    await mkdir(dirname(join(root, unmanaged)), { recursive: true });
    await writeFile(join(root, unmanaged), 'My unmanaged agent.\n');
    const result = await runCli(root, ['update', '--json']);
    assert.equal(result.code, 4, result.stdout + result.stderr);
    assert.equal(await readFile(join(root, instructions), 'utf8'), original);
    assert.equal(await readFile(join(root, unmanaged), 'utf8'), 'My unmanaged agent.\n');
    assert.ok(await exists(root, `.baton/conflicts/${instructions}.new`));
    assert.ok(await exists(root, `.baton/conflicts/${unmanaged}.new`));
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    const originalFixture = await readFile(join(sourceRoot, 'test/fixtures/prev-release', instructions), 'utf8');
    assert.equal(manifest.marker_sections[0].sha256, digest(section.exec(originalFixture)[1]));
  } finally { await cleanup(); }
});

test('update --dry-run changes no bytes, including manifest and conflict report', async () => {
  const { root, cleanup } = await fixture();
  try {
    const before = await Promise.all([changed, unchanged, instructions, '.baton/manifest.json']
      .map(async path => readFile(join(root, path))));
    const result = await runCli(root, ['update', '--dry-run']);
    assert.equal(result.code, 4, result.stdout + result.stderr);
    const after = await Promise.all([changed, unchanged, instructions, '.baton/manifest.json']
      .map(async path => readFile(join(root, path))));
    assert.deepEqual(after, before);
    assert.equal(await exists(root, '.baton/conflicts/report.json'), false);
  } finally { await cleanup(); }
});

test('update needs an existing manifest and rejects unknown flags', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    const missing = await runCli(root, ['update', '--json']);
    assert.equal(missing.code, 5, missing.stdout + missing.stderr);
    assert.match(missing.stdout + missing.stderr, /manifest/i);
    const unknown = await runCli(root, ['update', '--bogus']);
    assert.equal(unknown.code, 2);
    const moving = await runCli(root, ['update', '--to', 'latest']);
    assert.equal(moving.code, 2);
  } finally { await cleanup(); }
});
