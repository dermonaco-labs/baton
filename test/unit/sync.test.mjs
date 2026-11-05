import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { diffDocument, formatBumpSummary, generatedStable, lockFile, packDefinitions, pinnedNames, prepareEntries, snapshotDrift } from '../../src/commands/sync.mjs';
import { OPTIONAL_PIN_FIELDS, OPTIONAL_SOURCES, SPECKIT_REPO, sha256, verifyMitLicense } from '../../src/lib/upstream.mjs';
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

test('Spec Kit github extension entries come only from the extension tree into the issues pack', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-sync-extension-'));
  try {
    const generated = join(root, 'generated');
    const extension = join(root, 'project-github');
    const atv = join(root, 'atv');
    const skill = '.github/skills/speckit-github-taskstoissues/SKILL.md';
    const paths = [
      skill,
      '.specify/extensions/github/extension.yml',
      '.specify/extensions/github/README.md',
      '.specify/extensions/github/commands/speckit.github.taskstoissues.md',
      '.specify/extensions/github/scripts/bash/resolve-tasks.sh',
      '.specify/extensions/github/scripts/powershell/resolve-tasks.ps1',
      '.specify/extensions/github/scripts/python/resolve_tasks.py',
    ];
    const skillText = '---\nname: speckit-github-taskstoissues\ndescription: Create GitHub issues from tasks.\n---\n\nBody.\n';
    /** @param {string} base @param {string} path @param {string|Buffer} bytes */
    const put = async (base, path, bytes) => {
      await mkdir(join(base, path, '..'), { recursive: true });
      await writeFile(join(base, path), bytes);
    };
    for (const base of [generated, extension]) {
      await put(base, '.specify/scripts/bash/common.sh', 'echo core\n');
    }
    await put(generated, '.specify/extensions.yml', 'installed: []\r\n');
    await put(generated, '.specify/extensions/.registry', '{"extensions":{}}\n');
    await put(extension, '.specify/extensions.yml', 'installed: [github]\n');
    await put(extension, '.specify/extensions/.registry', '{"extensions":{"github":{}}}\n');
    for (const path of paths) {
      await put(extension, path, path === skill ? skillText.replaceAll('\n', '\r\n') : `fixture ${path}\n`);
    }
    await put(root, 'specs/001-baton-template/contracts/packs.md',
      await readFile(join(sourceRoot, 'specs/001-baton-template/contracts/packs.md')));
    const packs = [
      { id: 'core', requires: [], conflicts: [], files: [] },
      { id: 'issues', requires: ['core'], conflicts: [],
        files: paths.map(path => ({ from: 'speckit', extension: 'github', path })) },
    ];
    const { vendored } = prepareEntries(root, generated, atv, packs, [], null, false, {}, { github: extension });
    for (const path of paths) {
      const entry = vendored.find(row => row.path === path);
      assert.ok(entry, path);
      const { bytes, sha256: digest, sha256_upstream: upstreamDigest, ...row } = entry;
      assert.deepEqual(row, {
        path, upstream: 'speckit', upstream_path: path, stored_at: `packs/issues/files/${path}`,
        license: 'MIT', repair: null, packs: ['issues'], 'x-speckit-extension': 'github',
      });
      assert.equal(digest, sha256(bytes));
      assert.equal(upstreamDigest, digest);
    }
    assert.deepEqual(vendored.find(row => row.path === skill).bytes, Buffer.from(skillText));
    const core = vendored.filter(row => row.packs.includes('core'));
    assert.ok(core.every(row => !row.path.startsWith('.specify/extensions/github/') &&
      !row.path.includes('speckit-github-taskstoissues') && !('x-speckit-extension' in row)));
    assert.deepEqual(core.find(row => row.path === '.specify/extensions.yml').bytes, Buffer.from('installed: []\n'));
    assert.deepEqual(core.find(row => row.path === '.specify/extensions/.registry').bytes,
      Buffer.from('{"extensions":{}}\n'));
    assert.ok(pinnedNames(generated, atv, [extension]).has('speckit-github-taskstoissues'));
    assert.ok(!pinnedNames(generated, atv).has('speckit-github-taskstoissues'));

    assert.throws(() => prepareEntries(root, generated, atv, packs, [], null, false, {}),
      error => error.code === 'E_UPSTREAM_VERIFY' && /extension github/.test(error.message));
    for (const from of ['baton', 'atv']) {
      const misrouted = [packs[0], { ...packs[1], files: [{ from, extension: 'github', path: skill }] }];
      assert.throws(() => prepareEntries(root, generated, atv, misrouted, [], null, false, {}, { github: extension }),
        error => error.code === 'E_UPSTREAM_VERIFY');
    }
    const unsupported = [packs[0], { ...packs[1], files: [{ from: 'speckit', extension: 'gitlab', path: skill }] }];
    assert.throws(() => prepareEntries(root, generated, atv, unsupported, [], null, false, {},
      { github: extension, gitlab: extension }),
    error => error.code === 'E_UPSTREAM_VERIFY' && /unsupported Spec Kit extension gitlab/.test(error.message));
    const readme = join(extension, '.specify/extensions/github/README.md');
    const original = await readFile(readme);
    await rm(readme);
    assert.throws(() => prepareEntries(root, generated, atv, packs, [], null, false, {}, { github: extension }),
      error => error.code === 'E_UPSTREAM_VERIFY' && error.message.includes('README.md'));
    await put(root, 'outside/README.md', original);
    let linked = true;
    try {
      await symlink(join(root, 'outside/README.md'), readme);
    } catch {
      linked = false;
    }
    if (linked) {
      assert.throws(() => prepareEntries(root, generated, atv, packs, [], null, false, {}, { github: extension }),
        error => error.code === 'E_UPSTREAM_VERIFY' && error.message.includes('README.md'));
    }
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

const lockedPins = () => {
  const base = JSON.parse(readFileSync(new URL('../../baton.lock.json', import.meta.url), 'utf8'));
  const { speckit, atv } = base.upstreams;
  return { base, speckit: { version: speckit.version, commit: speckit.commit, requirements_sha256: 'b'.repeat(64) },
    atv: { version: atv.version, commit: atv.commit, tree: atv.tree } };
};

test('lock and snapshot document label optional provenance by its named source', () => {
  const entry = { path: '.baton/vendor/optimize/LICENSE', upstream: 'optimize', upstream_path: 'LICENSE',
    stored_at: 'packs/optimize/files/.baton/vendor/optimize/LICENSE', sha256_upstream: 'a'.repeat(64),
    sha256: 'a'.repeat(64), license: 'MIT', repair: null, packs: ['optimize'], bytes: Buffer.from('x') };
  const lock = lockFile([entry], lockedPins(), { optimize: OPTIONAL_SOURCES.optimize });
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
  const core = lockFile([], lockedPins());
  assert.deepEqual(Object.keys(core.upstreams), ['speckit', 'atv']);
});

test('snapshot document nests the bump summary under its h1 with blank-line-separated lists', () => {
  const pins = (/** @type {string} */ version, /** @type {string} */ commit) => ({
    speckit: { version, commit }, atv: { ref: 'main', version: null, commit: 'b'.repeat(40) } });
  const before = { upstreams: pins('1.0.0', 'a'.repeat(40)), files: [{ stored_at: 'kept.md', sha256: '1'.repeat(64) }] };
  const after = { upstreams: pins('1.1.0', 'c'.repeat(40)),
    files: [{ stored_at: 'kept.md', sha256: '2'.repeat(64) }, { stored_at: 'new.md', sha256: '3'.repeat(64) }] };
  const summary = formatBumpSummary(before, after);
  assert.ok(summary.startsWith('### Upstream bump (PR summary)\n\n'));
  assert.match(summary, /\*\*Added \(1\)\*\*\n- `new\.md`/);
  const document = diffDocument({ ...after, 'x-bump-summary': summary });
  const start = document.indexOf('## Upstream bump');
  assert.ok(start > 0);
  assert.equal(document.slice(start, document.indexOf('| Stored at |')), [
    '## Upstream bump (PR summary)', '',
    `- Spec Kit: 1.0.0 (\`${'a'.repeat(40)}\`) → 1.1.0 (\`${'c'.repeat(40)}\`). [Releases](${SPECKIT_REPO}/releases).`, '',
    '**Added (1)**', '', '- `new.md`', '',
    '**Changed (1)**', '', '- `kept.md`', '',
    '**Removed (0)**', '', '- None', '',
    'Reproduce: `baton sync --bump speckit=1.1.0`, then `baton sync --check`.', '', '',
  ].join('\n'));
  assert.doesNotMatch(document, /^### /m);
  assert.equal(diffDocument(after).includes('Upstream bump'), false);
});

test('optional pin fields are one immutable list matching the locked projection order', () => {
  assert.deepEqual(OPTIONAL_PIN_FIELDS, ['version', 'repo', 'tag', 'commit', 'tree', 'license']);
  assert.ok(Object.isFrozen(OPTIONAL_PIN_FIELDS));
  const lock = lockFile([], lockedPins(), OPTIONAL_SOURCES);
  for (const id of Object.keys(OPTIONAL_SOURCES)) {
    assert.deepEqual(Object.keys(lock.upstreams[id]), [...OPTIONAL_PIN_FIELDS]);
  }
});

test('MIT license verifier keeps each source copyright requirement', () => {
  const atv = 'MIT License\n\nCopyright (c) 2026 All The Vibes\n';
  assert.doesNotThrow(() => verifyMitLicense(atv, 'Copyright (c) 2026 All The Vibes', 'ATV'));
  assert.throws(() => verifyMitLicense(atv, OPTIONAL_SOURCES.optimize.copyright, 'optimize'),
    { code: 'E_LICENSE', message: 'E_LICENSE Pinned optimize LICENSE is not the expected MIT license' });
  assert.throws(() => verifyMitLicense('Apache License\nCopyright (c) 2026 All The Vibes\n', 'Copyright (c) 2026 All The Vibes', 'ATV'),
    { code: 'E_LICENSE', message: 'E_LICENSE Pinned ATV LICENSE is not the expected MIT license' });
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
