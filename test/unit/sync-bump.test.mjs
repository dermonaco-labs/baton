import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { formatBumpSummary, lockFile, parseBump, run, sync } from '../../src/commands/sync.mjs';
import * as upstream from '../../src/lib/upstream.mjs';
import { sourceRoot } from '../helpers/index.mjs';

const sha = (/** @type {string} */ char) => char.repeat(40);
const baseLock = () => ({
  upstreams: {
    speckit: { package: 'specify-cli', version: '1.0.11', repo: 'github/spec-kit', tag: 'v1.0.11', commit: sha('a'),
      requirements: 'baton/upstream/specify-cli.requirements.txt', requirements_sha256: 'e'.repeat(64),
      license: 'MIT', init_args: ['--integration', 'copilot', '--script', 'sh', '--maintainer-owned'] },
    atv: { package: 'atv-starterkit-maintainer', version: null, repo: 'All-The-Vibes/ATV-StarterKit', ref: 'main',
      commit: sha('b'), tree: sha('c'), license: 'MIT', note: 'maintainer note' },
  },
  files: [],
});
const speckitPin = { version: '1.0.11', commit: sha('a'), requirements_sha256: 'e'.repeat(64) };

test('sync bump accepts only immutable Spec Kit versions and ATV commits or release versions', () => {
  assert.deepEqual(parseBump('speckit=1.2.3'), { upstream: 'speckit', kind: 'version', value: '1.2.3' });
  assert.deepEqual(parseBump(`atv=${sha('0')}`), { upstream: 'atv', kind: 'commit', value: sha('0') });
  assert.deepEqual(parseBump('atv=1.2.3'), { upstream: 'atv', kind: 'version', value: '1.2.3' });
  for (const value of ['atv=v1.2.3', 'atv=main', `speckit=${sha('0')}`, `atv=${sha('A')}`, 'atv=1.2', 'speckit=1.2.3-rc1',
    'atv=1.2.3\n', 'speckit=$(id)']) {
    assert.equal(parseBump(value), null, value);
    const result = run(process.cwd(), ['--bump', value]);
    assert.equal(result.exitCode, 2, value);
    assert.equal(result.errors[0].code, 'E_USAGE', value);
  }
});

test('lock file records ATV release tracking for a version bump', () => {
  const lock = lockFile([], { base: baseLock(), speckit: speckitPin,
    atv: { version: '2.7.0', commit: sha('d'), tree: sha('f') } });
  assert.deepEqual(lock.upstreams.atv, {
    package: 'atv-starterkit-maintainer', version: '2.7.0', repo: 'All-The-Vibes/ATV-StarterKit', tag: 'v2.7.0',
    ref: 'v2.7.0', commit: sha('d'), tree: sha('f'), license: 'MIT', note: 'maintainer note',
  });
});

test('lock file records ATV main tracking for a commit bump', () => {
  const base = baseLock();
  Object.assign(base.upstreams.atv, { version: '2.7.0', tag: 'v2.7.0', ref: 'v2.7.0' });
  const lock = lockFile([], { base, speckit: speckitPin, atv: { version: null, commit: sha('d'), tree: sha('f') } });
  assert.equal(lock.upstreams.atv.ref, 'main');
  assert.equal(lock.upstreams.atv.version, null);
  assert.equal('tag' in lock.upstreams.atv, false);
  assert.deepEqual(Object.keys(lock.upstreams.atv),
    ['package', 'version', 'repo', 'ref', 'commit', 'tree', 'license', 'note']);
});

test('lock file preserves maintainer-owned fields from the base lock', () => {
  const lock = lockFile([], { base: baseLock(), speckit: { ...speckitPin, version: '1.2.3', commit: sha('9') },
    atv: { version: null, commit: sha('b'), tree: sha('c') } });
  assert.equal(lock.upstreams.atv.package, 'atv-starterkit-maintainer');
  assert.equal(lock.upstreams.atv.note, 'maintainer note');
  assert.deepEqual(lock.upstreams.speckit.init_args, ['--integration', 'copilot', '--script', 'sh', '--maintainer-owned']);
  assert.equal(lock.upstreams.speckit.tag, 'v1.2.3');
  assert.equal(lock.upstreams.speckit.commit, sha('9'));
});

test('the lock is the only Spec Kit and ATV pin record', () => {
  for (const name of ['SPECKIT_VERSION', 'SPECKIT_COMMIT', 'ATV_COMMIT', 'ATV_TREE']) {
    assert.equal(Object.hasOwn(upstream, name), false, name);
  }
});

/** @param {string} root */
async function fixture(root) {
  for (const name of await readdir(join(sourceRoot, 'packs'))) {
    if (name.endsWith('.yml')) await cp(join(sourceRoot, 'packs', name), join(root, 'packs', name));
  }
  await mkdir(join(root, 'baton', 'upstream'), { recursive: true });
  for (const name of ['specify-cli.requirements.in', 'specify-cli.requirements.txt']) {
    await cp(join(sourceRoot, 'baton', 'upstream', name), join(root, 'baton', 'upstream', name));
  }
}

/** @param {string} dir @returns {Promise<Record<string,string>>} */
async function snapshot(dir) {
  /** @type {Record<string,string>} */
  const files = {};
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    files[relative(dir, path)] = upstream.sha256(await readFile(path));
  }
  return files;
}

test('sync without a lock fails instead of falling back to built-in pins', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-sync-nolock-'));
  try {
    await fixture(root);
    const result = run(root, []);
    assert.equal(result.exitCode, 1);
    assert.equal(result.errors[0].code, 'E_SYNC_DRIFT');
    assert.match(result.errors[0].message, /baton\.lock\.json is required/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync bump verifies before writing and restores the requirements on an injected failure', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-sync-verify-'));
  try {
    await fixture(root);
    await cp(join(sourceRoot, 'baton.lock.json'), join(root, 'baton.lock.json'));
    const before = await snapshot(root);
    /** @type {string[]} */
    const calls = [];
    assert.throws(() => sync({ cwd: root, bump: 'speckit=9.9.9', deps: {
      regenerateRequirements: (/** @type {string} */ dir, /** @type {string} */ version) => {
        calls.push(`requirements ${version}`);
        writeFileSync(join(dir, 'baton', 'upstream', 'specify-cli.requirements.in'), `specify-cli==${version}\n`);
        writeFileSync(join(dir, 'baton', 'upstream', 'specify-cli.requirements.txt'), 'changed\n');
        return 'f'.repeat(64);
      },
      resolveTag: (/** @type {{tag:string}} */ { tag }) => { calls.push(`tag ${tag}`); return { commit: sha('1'), tree: sha('2') }; },
      resolveCommit: () => { throw new Error('ATV is not bumped'); },
      fetchAtv: () => { calls.push('atv'); return root; },
      fetchSource: (/** @type {{id:string}} */ { id }) => { calls.push(`source ${id}`); return root; },
      prepareSpeckit: () => { throw new upstream.UpstreamError('E_UPSTREAM_VERIFY', 'injected verification failure'); },
    } }), { code: 'E_UPSTREAM_VERIFY', message: /injected verification failure/ });
    assert.deepEqual(calls.slice(0, 3), ['requirements 9.9.9', 'tag v9.9.9', 'atv']);
    assert.deepEqual(await snapshot(root), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('sync bump explains pin and file changes for a PR body', () => {
  const before = {
    upstreams: { speckit: { version: '1.0.11', commit: 'a'.repeat(40) },
      atv: { ref: 'main', commit: 'b'.repeat(40) } },
    files: [{ stored_at: 'a.md', sha256: '1'.repeat(64) },
      { stored_at: 'removed.md', sha256: '2'.repeat(64) }]
  };
  const after = {
    upstreams: { speckit: { version: '1.0.12', commit: 'c'.repeat(40) },
      atv: { ref: 'main', commit: 'b'.repeat(40) } },
    files: [{ stored_at: 'a.md', sha256: '3'.repeat(64) },
      { stored_at: 'added.md', sha256: '4'.repeat(64) }]
  };
  const summary = formatBumpSummary(before, after);
  assert.match(summary, /Spec Kit.*1\.0\.11.*1\.0\.12/);
  assert.match(summary, /Changed \(1\).*a\.md/s);
  assert.match(summary, /Added \(1\).*added\.md/s);
  assert.match(summary, /Removed \(1\).*removed\.md/s);
  assert.match(summary, /baton sync --bump speckit=1\.0\.12/);
});

test('sync bump summary reproduces the ATV bump form that was used', () => {
  const lock = (/** @type {object} */ atv) => ({ upstreams: { speckit: { version: '1.0.11', commit: sha('a') }, atv }, files: [] });
  const main = lock({ ref: 'main', version: null, commit: sha('b') });
  const release = lock({ ref: 'v2.7.0', version: '2.7.0', tag: 'v2.7.0', commit: sha('d') });
  assert.match(formatBumpSummary(main, release), /baton sync --bump atv=2\.7\.0`/);
  assert.match(formatBumpSummary(release, lock({ ref: 'main', version: null, commit: sha('e') })),
    new RegExp(`baton sync --bump atv=${sha('e')}\``));
});

test('sync rejects unpinned bump values and check/bump combination', () => {
  assert.equal(run(process.cwd(), ['--bump', 'atv=main']).exitCode, 2);
  assert.equal(run(process.cwd(), ['--bump', 'speckit=latest']).exitCode, 2);
  assert.equal(run(process.cwd(), ['--check', '--bump', 'speckit=1.0.12']).exitCode, 2);
});
