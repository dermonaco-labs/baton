import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generatedStable, prepareEntries, snapshotDrift } from '../../src/commands/sync.mjs';
import { sha256 } from '../../src/lib/upstream.mjs';
import { sourceRoot } from '../helpers/index.mjs';

test('pinned generator can refresh Baton-authored handoff outputs without blessing upstream drift', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-sync-owned-'));
  try {
    const generated = join(root, 'generated');
    const atv = join(root, 'atv');
    const hook = '.specify/extensions/baton/.specify-dev/extension-skills/speckit-baton-handoff/SKILL.md';
    const installed = '.github/skills/speckit-baton-handoff/SKILL.md';
    const script = '.specify/scripts/bash/common.sh';
    const command = '.specify/extensions/baton/commands/handoff.md';
    const source = 'baton/speckit-extension/commands/handoff.md';
    const lock = JSON.parse(await readFile(join(sourceRoot, 'baton.lock.json'), 'utf8'));
    // These are the two stale hashes at the failed release RC, not invented test digests.
    for (const path of [hook, installed]) {
      lock.files.find(entry => entry.path === path).sha256_upstream =
        '892e4bcb62250ec2edf361cf2a2738cec724cde776c0600ba5bb8caf70e9bd93';
    }
    const packs = [{
      id: 'core', requires: [], conflicts: [],
      files: [{ from: 'baton', path: installed }],
      optional_refs: ['speckit-analyze', 'speckit-specify'].map(ref =>
        ({ ref, reason: 'upstream-absent', note: 'Not needed in this focused generation fixture' })),
    }];
    const fixture = Buffer.from((await readFile(join(sourceRoot,
      'test/fixtures/sync/speckit-baton-handoff.md'), 'utf8')).replaceAll('\r\n', '\n'));
    const stale = Buffer.from(fixture.toString().replace(
      'command (`after_converge` maps to `implement` with `--mode converge`);\nstandalone calls must supply `--phase`.',
      'command (`after_converge` maps to `implement`); standalone calls must supply\n`--phase`.',
    ).replace(
      '(and `--mode converge` for after_converge, or `--analysis-from <file>`\nfor analyze). Include a brief `summary`,',
      '(and `--analysis-from <file>` for analyze). Include a brief `summary`,',
    ));
    assert.equal(sha256(stale), lock.files.find(entry => entry.path === hook).sha256_upstream,
      'stale fixture must reproduce the exact failing release hash');
    for (const path of [hook, installed, script, command, '.specify/extensions.yml']) {
      await mkdir(join(generated, path, '..'), { recursive: true });
      const bytes = [hook, installed].includes(path) ? fixture : await readFile(join(sourceRoot, path));
      await writeFile(join(generated, path), [hook, installed, '.specify/extensions.yml'].includes(path)
        ? bytes.toString().replaceAll('\n', '\r\n') : bytes);
    }
    for (const path of [source, 'specs/001-baton-template/contracts/packs.md']) {
      await mkdir(join(root, path, '..'), { recursive: true });
      await cp(join(sourceRoot, path), join(root, path));
    }
    // Unmodified pinned scripts remain raw bytes, even on Windows.
    await cp(join(sourceRoot, script), join(generated, script));
    const entries = prepareEntries(root, generated, atv, packs, [], lock, false).vendored;
    for (const path of [hook, installed]) {
      const entry = entries.find(entry => entry.path === path);
      assert.deepEqual(entry.bytes, fixture);
      assert.equal(entry.sha256, sha256(fixture));
      assert.equal(entry['x-baton-source'], source);
      assert.equal(entry['x-baton-source-sha256'], sha256(await readFile(join(root, source))));
    }
    assert.equal(entries.find(entry => entry.path === script).sha256_upstream,
      lock.files.find(entry => entry.path === script).sha256_upstream);
    assert.equal(entries.find(entry => entry.path === '.specify/extensions.yml').sha256_upstream,
      lock.files.find(entry => entry.path === '.specify/extensions.yml').sha256_upstream);
    const repeated = prepareEntries(root, generated, atv, packs, [], lock, false).vendored;
    assert.deepEqual(repeated, entries);
    const expected = entries.map(entry => ({ path: entry.stored_at, bytes: entry.bytes }));
    for (const { path, bytes } of expected) {
      await mkdir(join(root, path, '..'), { recursive: true });
      await writeFile(join(root, path), bytes);
    }
    assert.deepEqual(snapshotDrift(root, expected, true), []);
    for (const path of [hook, installed, script]) {
      const original = await readFile(join(root, path));
      const changes = [Buffer.from('tampered snapshot'), ...([hook, installed].includes(path) ? [stale] : [])];
      for (const bytes of changes) {
        await writeFile(join(root, path), bytes);
        assert.throws(() => snapshotDrift(root, expected, true),
          error => error.code === 'E_SYNC_DRIFT' && error.message.includes(path));
      }
      await writeFile(join(root, path), original);
    }
    assert.deepEqual(snapshotDrift(root, expected, true), []);
    await writeFile(join(generated, command), 'tampered generated source copy');
    assert.throws(() => prepareEntries(root, generated, atv, packs, [], lock, false),
      /E_UPSTREAM_VERIFY.*generated copy differs/);
    await cp(join(root, source), join(generated, command));
    await writeFile(join(generated, script), 'tampered upstream script');
    assert.throws(() => prepareEntries(root, generated, atv, packs, [], lock, false),
      /E_UPSTREAM_VERIFY.*common\.sh/);
    await cp(join(sourceRoot, script), join(generated, script));
    const lookalike = '.specify/extensions/baton/commands/other.md';
    await mkdir(join(generated, lookalike, '..'), { recursive: true });
    await writeFile(join(generated, lookalike), 'changed third-party extension');
    lock.files.push({ path: lookalike, packs: ['core'], sha256_upstream: '0'.repeat(64) });
    assert.throws(() => prepareEntries(root, generated, atv, packs, [], lock, false),
      /E_UPSTREAM_VERIFY.*commands\/other/);
    await rm(join(generated, lookalike));
    const atvPath = 'pkg/scaffold/templates/unchanged.md';
    await mkdir(join(atv, atvPath, '..'), { recursive: true });
    await writeFile(join(atv, atvPath), 'tampered ATV payload');
    packs[0].files.push({ from: 'atv', path: 'unchanged.md', upstream_path: atvPath });
    lock.files.push({ path: 'unchanged.md', packs: ['core'], sha256_upstream: '0'.repeat(64) });
    assert.throws(() => prepareEntries(root, generated, atv, packs, [], lock, false),
      /E_UPSTREAM_VERIFY.*unchanged\.md/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('generated registry preserves verified bytes when only installation time changes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-registry-'));
  try {
    const path = '.specify/extensions/.registry';
    const target = join(root, path);
    await mkdir(join(root, '.specify/extensions'), { recursive: true });
    const original = Buffer.from(JSON.stringify({
      schema_version: '1.0', extensions: { baton: { enabled: true, installed_at: '2026-09-24T00:00:00Z' } },
    }, null, 2));
    await writeFile(target, original);
    const generated = Buffer.from(JSON.stringify({
      schema_version: '1.0', extensions: { baton: { enabled: true, installed_at: '2026-09-24T00:00:01Z' } },
    }, null, 2));
    assert.deepEqual(generatedStable(generated, path, root), await readFile(target));

    const workflow = '.specify/workflows/workflow-registry.json';
    const workflowPath = join(root, workflow);
    await mkdir(join(root, '.specify/workflows'), { recursive: true });
    const oldWorkflow = Buffer.from(JSON.stringify({
      workflows: { speckit: { installed_at: '2026-09-24T00:00:00Z', updated_at: '2026-09-24T00:00:01Z' } },
    }, null, 2));
    await writeFile(workflowPath, oldWorkflow);
    const newWorkflow = Buffer.from(JSON.stringify({
      workflows: { speckit: { installed_at: '2026-09-24T00:00:02Z', updated_at: '2026-09-24T00:00:03Z' } },
    }, null, 2));
    assert.deepEqual(generatedStable(newWorkflow, workflow, root), oldWorkflow);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('generated Spec Kit manifest preserves locked bytes when file keys are reordered', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-manifest-'));
  try {
    const path = '.specify/integrations/speckit.manifest.json';
    const target = join(root, path);
    await mkdir(join(root, '.specify/integrations'), { recursive: true });
    const original = Buffer.from(JSON.stringify({
      integration: 'speckit',
      installed_at: '2026-09-24T00:00:00Z',
      files: { 'scripts/b.sh': 'hash-b', 'scripts/a.sh': 'hash-a' },
    }, null, 2));
    await writeFile(target, original);
    const generated = Buffer.from(JSON.stringify({
      integration: 'speckit',
      installed_at: '2026-09-27T00:00:00Z',
      files: { 'scripts/a.sh': 'hash-a', 'scripts/b.sh': 'hash-b' },
    }, null, 2));
    assert.deepEqual(generatedStable(generated, path, root), original);

    const changed = Buffer.from(JSON.stringify({
      integration: 'speckit',
      installed_at: '2026-09-27T00:00:00Z',
      files: { 'scripts/a.sh': 'changed-hash', 'scripts/b.sh': 'hash-b' },
    }, null, 2));
    assert.notDeepEqual(generatedStable(changed, path, root), original);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
