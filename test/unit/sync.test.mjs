import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { diffDocument, generatedStable, lockFile, packDefinitions, prepareEntries, snapshotDrift } from '../../src/commands/sync.mjs';
import { ATV_COMMIT, ATV_TREE, OPTIONAL_SOURCES, SPECKIT_COMMIT, SPECKIT_VERSION, sha256 } from '../../src/lib/upstream.mjs';
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

async function optionalFixture() {
  const root = await mkdtemp(join(tmpdir(), 'baton-sync-optional-'));
  const generated = join(root, 'generated');
  const atv = join(root, 'atv');
  const source = join(root, 'source-token-budget');
  for (const dir of [generated, atv, join(source, 'commands')]) await mkdir(dir, { recursive: true });
  const contract = 'specs/001-baton-template/contracts/packs.md';
  await mkdir(join(root, contract, '..'), { recursive: true });
  await cp(join(sourceRoot, contract), join(root, contract));
  // Raw upstream bytes, including CRLF, must never be normalized for optional sources.
  const raw = Buffer.from('# Usage\r\nEstimate only.\n');
  await writeFile(join(source, 'commands', 'usage.md'), raw);
  const file = { from: 'token-budget', upstream_path: 'commands/usage.md',
    path: '.baton/vendor/token-budget/commands/usage.md' };
  const packs = [{ id: 'core', requires: [], conflicts: [], files: [] },
    { id: 'token-budget', requires: ['core'], conflicts: [], files: [file] }];
  return { root, generated, atv, source, raw, file, packs, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test('named optional sources keep raw provenance and refuse modified or misplaced payloads', async () => {
  const fixture = await optionalFixture();
  const { root, generated, atv, source, raw, file, packs } = fixture;
  try {
    const sources = { 'token-budget': source };
    const { vendored, authored } = prepareEntries(root, generated, atv, packs, [], null, false, sources);
    assert.deepEqual(authored, []);
    assert.equal(vendored.length, 1);
    const [entry] = vendored;
    assert.equal(entry.upstream, 'token-budget');
    assert.equal(entry.upstream_path, 'commands/usage.md');
    assert.equal(entry.path, file.path);
    assert.equal(entry.stored_at, `packs/token-budget/files/${file.path}`);
    assert.deepEqual(entry.bytes, raw);
    assert.equal(entry.sha256_upstream, sha256(raw));
    assert.equal(entry.sha256, sha256(raw));
    assert.equal(entry.repair, null);
    assert.equal(entry.license, 'MIT');
    assert.deepEqual(entry.packs, ['token-budget']);
    assert.equal(entry['x-baton-source'], undefined);

    const lock = { files: [{ path: file.path, packs: ['token-budget'], sha256_upstream: '0'.repeat(64) }] };
    for (const bump of [false, true]) {
      assert.throws(() => prepareEntries(root, generated, atv, packs, [], lock, bump, sources),
        /E_UPSTREAM_VERIFY.*usage\.md.*differs from the lock/);
    }
    assert.throws(() => prepareEntries(root, generated, atv, packs, [], null, false, {}),
      /E_UPSTREAM_VERIFY.*token-budget/);
    /** @param {object} changed @param {string} [id] */
    const variant = (changed, id = 'token-budget') => [packs[0],
      { ...packs[1], id, files: [{ ...file, ...changed }] }];
    for (const [changed, id] of [
      [{ path: '.github/skills/usage/SKILL.md' }],
      [{ path: '.specify/extensions/token-budget/extension.yml' }],
      [{ path: '.baton/vendor/optimize/commands/usage.md' }],
      [{ upstream_path: undefined }],
      [{ upstream_path: '../outside.md' }],
      [{ from: 'unregistered' }],
      [{}, 'optimize'],
    ]) {
      assert.throws(() => prepareEntries(root, generated, atv, variant(changed, id), [], null, false, sources),
        /E_UPSTREAM_VERIFY|E_DANGLING_REF/, JSON.stringify(changed));
    }
    await writeFile(join(source, 'commands', 'usage.md'), Buffer.from('# Usage\nEstimate only.\n'));
    const prior = { files: [{ path: file.path, packs: ['token-budget'], sha256_upstream: sha256(raw) }] };
    assert.throws(() => prepareEntries(root, generated, atv, packs, [], prior, false, sources),
      /E_UPSTREAM_VERIFY.*differs from the lock/);
  } finally {
    await fixture.cleanup();
  }
});

test('lock and snapshot document label optional provenance by its named source', () => {
  const entry = { path: '.baton/vendor/optimize/LICENSE', upstream: 'optimize', upstream_path: 'LICENSE',
    stored_at: 'packs/optimize/files/.baton/vendor/optimize/LICENSE', sha256_upstream: 'a'.repeat(64),
    sha256: 'a'.repeat(64), license: 'MIT', repair: null, packs: ['optimize'], bytes: Buffer.from('x') };
  const lock = lockFile([entry], 'b'.repeat(64), ATV_COMMIT, ATV_TREE, SPECKIT_VERSION, SPECKIT_COMMIT,
    { optimize: OPTIONAL_SOURCES.optimize });
  assert.deepEqual(Object.keys(lock.upstreams), ['speckit', 'atv', 'optimize']);
  assert.deepEqual(lock.upstreams.optimize, {
    version: '1.0.0', repo: 'sakitA/spec-kit-optimize', tag: 'v1.0.0',
    commit: 'd6dba6ae93bf60322deee3bdc4ffcf127e42b2b9', tree: 'c5bb7b7a37912ef26bc369397980c26c3d70cf7b', license: 'MIT',
  });
  assert.equal(lock.files[0].upstream, 'optimize');
  assert.equal(lock.files[0].bytes, undefined);
  const document = diffDocument(lock);
  assert.match(document, /- optimize: sakitA\/spec-kit-optimize v1\.0\.0 at `d6dba6ae93bf60322deee3bdc4ffcf127e42b2b9` \(tree `c5bb7b7a37912ef26bc369397980c26c3d70cf7b`\)/);
  assert.match(document, /\| `packs\/optimize\/files\/\.baton\/vendor\/optimize\/LICENSE` \| optimize \| `LICENSE` \|/);
  const core = lockFile([], 'b'.repeat(64), ATV_COMMIT, ATV_TREE, SPECKIT_VERSION, SPECKIT_COMMIT);
  assert.deepEqual(Object.keys(core.upstreams), ['speckit', 'atv']);
});

test('pack definitions require every original pack and accept additional optional packs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-sync-definitions-'));
  try {
    await mkdir(join(root, 'packs'));
    const required = ['core', 'design', 'docs-review', 'issues', 'learning', 'research', 'review-plus',
      'security', 'stack-python', 'stack-rails', 'stack-typescript'];
    for (const id of [...required, 'repairs']) await cp(join(sourceRoot, 'packs', `${id}.yml`), join(root, 'packs', `${id}.yml`));
    assert.equal(packDefinitions(root).packs.length, 11);
    await writeFile(join(root, 'packs', 'extra.yml'),
      'schema: 1\nid: extra\ndescription: Extra\nrequires: [core]\nconflicts: []\nfiles:\n  - { from: baton, path: x.md }\n');
    assert.deepEqual(packDefinitions(root).packs.map((pack) => pack.id).sort(), [...required, 'extra'].sort());
    await writeFile(join(root, 'packs', 'extra.yml'), 'schema: 1\nid: extra\nrequires: [core]\nconflicts: []\n');
    assert.throws(() => packDefinitions(root), /E_PREREQUISITE/);
    await writeFile(join(root, 'packs', 'extra.yml'),
      'schema: 1\nid: other\ndescription: Extra\nrequires: [core]\nconflicts: []\nfiles:\n  - { from: baton, path: x.md }\n');
    assert.throws(() => packDefinitions(root), /E_PREREQUISITE.*extra/);
    await rm(join(root, 'packs', 'extra.yml'));
    await rm(join(root, 'packs', 'security.yml'));
    assert.throws(() => packDefinitions(root), /E_PREREQUISITE.*security/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
