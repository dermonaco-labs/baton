import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { sourceRoot } from '../helpers/index.mjs';
import * as candidates from '../../src/lib/upstream-candidates.mjs';
import { isSha, isVersion } from '../../src/lib/upstream.mjs';

const {
  BOT_EMAIL, BOT_NAME, ISSUE_NOTICE, branchFor, buildRunUrl, classifyBranch, commitMessage, compareVersions,
  contentDigest, contentTrailer, currentPin, isNewer, isTag, lockDiffIssues, makePin,
  parseMarker, pathPolicyIssue, planUpstream, policyOf, prTitle, renderIssue, renderMarker, renderPrBody,
  sanitizeExcerpt, selectAtv, selectSpeckit, verifyCandidate
} = candidates;

const sha = (/** @type {string} */ c) => c.repeat(40);
const hex = (/** @type {Buffer|string} */ bytes) => createHash('sha256').update(bytes).digest('hex');
/** A lock row of exactly the shape sync writes for a generated `.specify/` file. */
const specifyRow = (/** @type {string} */ path, /** @type {Buffer|string} */ bytes) => ({
  license: 'MIT', packs: ['core'], path, repair: null, sha256: hex(bytes), sha256_upstream: hex(bytes), stored_at: path,
  upstream: 'speckit', upstream_path: path
});
const baseLock = () => JSON.parse(readFileSync(join(sourceRoot, 'baton.lock.json'), 'utf8'));
/** The committed tree's tracked paths, read the way the trusted jobs read the base commit. */
const baseTree = new Set(execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', 'HEAD'], { cwd: sourceRoot })
  .toString('utf8').split('\0').filter(Boolean));
/** Tracked stored paths with no lock row: the constitution, Baton skills and unlocked pack files. */
const unlockedStored = () => {
  const rows = new Set(baseLock().files.map((/** @type {any} */ file) => file.stored_at));
  return [...baseTree].filter(path => /^(?:\.github\/agents\/|\.github\/skills\/|\.specify\/|packs\/[a-z0-9-]+\/files\/)/
    .test(path) && !rows.has(path));
};
const BASE = sha('b');
const bot = { name: BOT_NAME, email: BOT_EMAIL };
const human = { name: 'Maintainer', email: 'maintainer@example.com' };
const commit = (/** @type {any} */ author, /** @type {any} */ committer = author, message = 'x') =>
  ({ commit: { author, committer, message } });

/** @param {string} code */
const fails = code => (/** @type {any} */ error) => error?.code === code;

const speckitCurrent = () => currentPin('speckit', baseLock().upstreams.speckit);
const speckitLatest = (version = '9.9.9') => makePin('speckit', { version, commit: sha('9'), tree: null });

/** @param {Record<string,any>} overrides */
function plan(overrides = {}) {
  return planUpstream({ id: 'speckit', base: BASE, publish: true, policy: 'release', current: speckitCurrent(),
    latest: speckitLatest(), blocker: null, prs: [], branch: null, info: null, ...overrides });
}

/** Build a valid Spec Kit candidate against the real lock. */
function speckitCandidate(overrides = {}) {
  const base = baseLock();
  const latest = speckitLatest();
  const lock = structuredClone(base);
  Object.assign(lock.upstreams.speckit, { version: latest.version, tag: `v${latest.version}`, commit: latest.commit,
    requirements_sha256: 'c'.repeat(64) });
  lock['x-bump-summary'] = 'Bump summary';
  const target = base.files.find((/** @type {any} */ file) => file.upstream === 'speckit').stored_at;
  const fileBytes = Buffer.from('regenerated\n');
  const row = lock.files.find((/** @type {any} */ file) => file.stored_at === target);
  row.sha256 = row.sha256_upstream = hex(fileBytes);
  const lockBytes = Buffer.from(`${JSON.stringify(lock, null, 2)}\n`);
  const reqBytes = Buffer.from('specify-cli==9.9.9 --hash=sha256:00\n');
  /** @type {Map<string,{bytes:Buffer,symlink:boolean}>} */
  const files = new Map([
    ['baton.lock.json', { bytes: lockBytes, symlink: false }],
    [target, { bytes: fileBytes, symlink: false }],
    ['baton/upstream/specify-cli.requirements.txt', { bytes: reqBytes, symlink: false }]
  ]);
  const manifest = {
    schema: 1, upstream: 'speckit', bump: latest.bump,
    pin: { version: latest.version, commit: latest.commit, tree: null }, base: BASE,
    changed: [...files].map(([path, { bytes }]) => ({ path, sha256: hex(bytes), mode: '100644' })),
    deleted: [], summary: 'Bump summary',
    checks: [{ name: 'sync --bump', result: 'pass' }, { name: 'npm run check', result: 'pass' }],
    ...overrides
  };
  return { base, lock, files, manifest, target, plan: plan({ latest }),
    written: new Map(manifest.changed.map(item => [item.path, item.sha256])) };
}

describe('upstream candidates formats', () => {
  test('strict version, sha and tag formats reject mutable or hostile values', () => {
    assert.ok(isVersion('1.2.3') && isVersion('10.0.12'));
    for (const value of ['v1.2', '1.2', '1.2.3-rc1', '1.2.3\n', '$(id)', ' 1.2.3', '1.2.3.4']) {
      assert.equal(isVersion(value), false, value);
    }
    assert.ok(isSha(sha('a')));
    for (const value of [sha('A'), 'a'.repeat(39), `${sha('a')}\n`, `$(${'a'.repeat(37)})`]) {
      assert.equal(isSha(value), false, value);
    }
    assert.ok(isTag('v1.2.3'));
    for (const value of ['v1.2', '1.2.3', 'v1.2.3-rc1', 'v1.2.3\n', 'v$(id)']) assert.equal(isTag(value), false, value);
    assert.equal(isVersion(/** @type {any} */ (123)), false);
  });

  test('versions compare numerically', () => {
    assert.ok(compareVersions('1.10.0', '1.9.9') > 0);
    assert.ok(compareVersions('0.0.9', '0.1.0') < 0);
    assert.equal(compareVersions('2.6.3', '2.6.3'), 0);
  });

  test('excerpts are stripped of control characters, capped and fenced', () => {
    const text = sanitizeExcerpt('ok\u0000\u001b[31m red\r\nline ```` fence');
    const fence = text.split('\n')[0];
    assert.match(fence, /^`{5,}text$/);
    assert.ok(!/[\u0000-\u0008\u000b-\u001f\u007f]/.test(text));
    assert.ok(text.includes('line ```` fence'));
    assert.ok(text.endsWith(fence.replace('text', '')));
    const long = sanitizeExcerpt('x'.repeat(5000));
    assert.ok(long.length < 2100);
    assert.match(long, /x{2000}/);
    assert.doesNotMatch(long, /x{2001}/);
  });

  test('run links are built only from validated environment values', () => {
    const env = { GITHUB_SERVER_URL: 'https://github.com', GITHUB_REPOSITORY: 'dermonaco-labs/baton', GITHUB_RUN_ID: '42' };
    assert.equal(buildRunUrl(env), 'https://github.com/dermonaco-labs/baton/actions/runs/42');
    for (const bad of [{ GITHUB_SERVER_URL: 'javascript:alert(1)' }, { GITHUB_REPOSITORY: 'a b/c' },
      { GITHUB_RUN_ID: '42)' }, { GITHUB_RUN_ID: undefined }]) {
      assert.throws(() => buildRunUrl({ ...env, ...bad }), fails('E_SOURCE_FORMAT'));
    }
  });

  test('the maintainer entry point is never imported by the CLI or bundled code', () => {
    /** @param {string} directory @returns {string[]} */
    const walk = directory => readdirSync(directory).flatMap(name => {
      const path = join(directory, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
    const sources = walk(join(sourceRoot, 'src')).filter(path => path.endsWith('.mjs') &&
      !relative(join(sourceRoot, 'src'), path).startsWith('maintainer'));
    assert.ok(sources.some(path => path.endsWith('cli.mjs')));
    for (const path of sources) assert.doesNotMatch(readFileSync(path, 'utf8'), /maintainer\//, path);
  });
});

describe('upstream candidates speckit', () => {
  const releases = [
    { tag_name: 'v1.3.0', draft: true, prerelease: false },
    { tag_name: 'v1.2.5', draft: false, prerelease: true },
    { tag_name: 'v1.2.4', draft: false, prerelease: false },
    { tag_name: 'v1.2.3', draft: false, prerelease: false },
    { tag_name: 'v1.2.9;id', draft: false, prerelease: false }
  ];
  const file = [{ yanked: false }];

  test('selection takes the newest stable version published on PyPI and as a GitHub release', () => {
    const pypi = { releases: { '1.2.3': file, '1.2.4': file, '1.3.0rc1': file, '1.3.0': [{ yanked: true }] } };
    assert.equal(selectSpeckit({ pypi, releases }), '1.2.4');
  });

  test('a PyPI and GitHub release mismatch is a source mismatch', () => {
    const pypi = { releases: { '1.2.3': file } };
    assert.throws(() => selectSpeckit({ pypi, releases }), fails('E_SOURCE_MISMATCH'));
  });

  test('pins validate every external value and record the exact bump form', () => {
    assert.deepEqual(makePin('speckit', { version: '1.2.4', commit: sha('a'), tree: null }),
      { version: '1.2.4', commit: sha('a'), tree: null, bump: 'speckit=1.2.4' });
    assert.throws(() => makePin('speckit', { version: '1.2', commit: sha('a'), tree: null }), fails('E_SOURCE_FORMAT'));
    assert.throws(() => makePin('speckit', { version: '1.2.4', commit: sha('A'), tree: null }), fails('E_SOURCE_FORMAT'));
    assert.equal(policyOf('speckit', baseLock().upstreams.speckit), 'release');
    const current = speckitCurrent();
    assert.equal(current.bump, `speckit=${current.version}`);
    assert.equal(isNewer('release', current, speckitLatest()), true);
    assert.equal(isNewer('release', current, current), false);
  });

  test('planning follows the documented state order', () => {
    const blocker = { code: 'E_SOURCE_FORMAT', stage: 'detect', excerpt: 'x', run: 'https://github.com/a/b/actions/runs/1' };
    const current = speckitCurrent();
    const marker = (pin = 'speckit=9.9.9', extra = {}) => ({ upstream: 'speckit', pin, base: BASE, digest: 'd'.repeat(64), ...extra });
    const open = (/** @type {any} */ m) => [{ number: 7, state: 'open', merged: false, marker: m }];
    const botBranch = { sha: sha('e'), botOnly: true, content: 'd'.repeat(64) };
    const humanBranch = { ...botBranch, botOnly: false };
    assert.equal(plan({ blocker, prs: open(marker(current.bump)), branch: botBranch }).action, 'blocked');
    assert.equal(plan({ prs: open(marker(current.bump)), branch: botBranch }).action, 'close-obsolete');
    assert.equal(plan({ prs: open(marker(current.bump)), branch: humanBranch }).action, 'obsolete-human');
    assert.equal(plan({ latest: current }).action, 'none');
    assert.equal(plan({ latest: null }).action, 'none');
    assert.equal(plan({ prs: [{ number: 6, state: 'closed', merged: false, marker: marker() }] }).action, 'suppressed');
    assert.equal(plan({ prs: open(marker('speckit=9.9.8')), branch: humanBranch }).action, 'waiting-human');
    assert.equal(plan({ prs: open(marker()), branch: botBranch }).action, 'unchanged');
    assert.equal(plan({ prs: open(marker('speckit=9.9.8')), branch: botBranch }).action, 'generate');
    assert.equal(plan({}).action, 'generate');
    const generated = plan({ prs: open(marker('speckit=9.9.8')), branch: botBranch });
    assert.equal(generated.pr?.number, 7);
    assert.equal(generated.pr?.state, 'open-bot');
    assert.equal(generated.pr?.branch, branchFor('speckit'));
  });

  test('the path policy allows only regenerated outputs', () => {
    const base = baseLock();
    const context = { baseLock: base, candidateLock: base, baseTree };
    const stored = (/** @type {string} */ prefix, upstream = 'speckit') => base.files.find((/** @type {any} */ file) =>
      file.stored_at.startsWith(prefix) && file.upstream === upstream).stored_at;
    for (const path of ['baton.lock.json', 'docs/reference/upstream-diff.md', 'baton/upstream/specify-cli.requirements.in',
      'baton/upstream/specify-cli.requirements.txt', stored('.github/skills/'), stored('.specify/'), stored('packs/')]) {
      assert.equal(pathPolicyIssue(path, 'changed', 'speckit', context), null, path);
    }
    for (const path of [stored('.github/agents/', 'atv'), stored('.github/skills/', 'atv'), stored('packs/', 'atv')]) {
      assert.equal(pathPolicyIssue(path, 'changed', 'atv', context), null, path);
    }
    for (const path of ['.github/workflows/ci.yml', 'src/cli.mjs', 'test/run.mjs', '.baton/bin/baton.mjs',
      'package.json', 'package-lock.json', '.npmrc', 'uv.toml', 'pip.conf', 'packs/core/../../src/x.mjs',
      '/etc/passwd', '.github\\agents\\x.md', '.github/agents/unlisted.agent.md', 'README.md', '.specify/./x',
      'packs/core/files/x\u0000']) {
      assert.notEqual(pathPolicyIssue(path, 'changed', 'speckit', context), null, path);
    }
    for (const path of ['baton/upstream/specify-cli.requirements.in', 'baton/upstream/specify-cli.requirements.txt']) {
      assert.notEqual(pathPolicyIssue(path, 'changed', 'atv', context), null, path);
    }
    assert.notEqual(pathPolicyIssue('.npmrc', 'deleted', 'speckit', context), null);
    const owned = (/** @type {string} */ upstream) =>
      base.files.find((/** @type {any} */ file) => file.upstream === upstream).stored_at;
    for (const [id, other] of [['speckit', 'atv'], ['speckit', 'optimize'], ['atv', 'speckit'], ['atv', 'token-budget']]) {
      for (const kind of /** @type {const} */ (['changed', 'deleted'])) {
        assert.equal(pathPolicyIssue(owned(other), kind, /** @type {any} */ (id), context),
          `${owned(other)} is owned by "${other}", not ${id}`, `${id} ${kind} ${other}`);
      }
    }
    assert.equal(pathPolicyIssue('.specify/a`b.md', 'changed', 'speckit', context),
      '".specify/a`b.md" contains a character outside [A-Za-z0-9._/@+-]');
    assert.equal(pathPolicyIssue('packs/core/files/x y.md', 'changed', 'speckit', context),
      '"packs/core/files/x y.md" contains a character outside [A-Za-z0-9._/@+-]');
    const added = structuredClone(base);
    added.files.push({ ...base.files.find((/** @type {any} */ file) => file.upstream === 'speckit'),
      stored_at: '.specify/templates/new-template.md' });
    const withNew = { baseLock: base, candidateLock: added, baseTree };
    assert.equal(pathPolicyIssue('.specify/templates/new-template.md', 'changed', 'speckit', withNew), null);
    assert.equal(pathPolicyIssue('.specify/templates/new-template.md', 'changed', 'speckit',
      { baseLock: base, candidateLock: added }), '.specify/templates/new-template.md: the base tree is unavailable');
    assert.equal(pathPolicyIssue('.specify/templates/new-template.md', 'changed', 'atv', withNew),
      '.specify/templates/new-template.md is owned by "speckit", not atv');
    assert.equal(pathPolicyIssue('.specify/templates/new-template.md', 'deleted', 'speckit', withNew),
      '.specify/templates/new-template.md is not a locked upstream output');
  });

  test('a candidate lock may change only its own pin fields, files and bump summary', () => {
    const { base, lock, written } = speckitCandidate();
    const latest = speckitLatest();
    const context = { baseTree, written };
    assert.deepEqual(lockDiffIssues('speckit', base, lock, latest, context), []);
    assert.deepEqual(lockDiffIssues('speckit', base, lock, latest),
      [`files ${base.files.find((/** @type {any} */ file) => file.upstream === 'speckit').stored_at} changes sha256 ` +
        'without a changed file']);
    const cases = [
      (/** @type {any} */ l) => { l.upstreams.atv.commit = sha('1'); },
      (/** @type {any} */ l) => { l.upstreams.speckit.init_args = []; },
      (/** @type {any} */ l) => { l.upstreams.speckit.repo = 'evil/spec-kit'; },
      (/** @type {any} */ l) => { l.generated_by = 'other'; },
      (/** @type {any} */ l) => { l.upstreams.optimize = { ...l.upstreams.optimize, commit: sha('2') }; },
      (/** @type {any} */ l) => { l.upstreams.speckit.commit = sha('3'); }
    ];
    for (const mutate of cases) {
      const changed = structuredClone(lock);
      mutate(changed);
      assert.notDeepEqual(lockDiffIssues('speckit', base, changed, latest, context), [], mutate.toString());
    }
    const row = (/** @type {any} */ l, /** @type {string} */ upstream) =>
      l.files.find((/** @type {any} */ file) => file.upstream === upstream);
    const key = (/** @type {string} */ upstream) => row(base, upstream).stored_at;
    const fresh = '.specify/templates/new-template.md';
    /** @type {Array<[string[], (l:any)=>void]>} */
    const rows = [
      [[`files ${key('speckit')} sha256 does not match the written file`],
        l => { row(l, 'speckit').sha256 = row(l, 'speckit').sha256_upstream = 'a'.repeat(64); }],
      [[`files ${key('speckit')} removed: speckit adds or removes files only under .specify/`],
        l => { l.files = l.files.filter((/** @type {any} */ file) => file !== row(l, 'speckit')); }],
      [[`files ${fresh} added with upstream_path ${JSON.stringify(key('speckit'))}, not ${fresh}`],
        l => { l.files.push({ ...row(l, 'speckit'), stored_at: fresh }); }],
      [[`files ${fresh} added without a changed file`], l => { l.files.push(specifyRow(fresh, 'new\n')); }],
      [[`files ${key('atv')} (atv) changed`], l => { row(l, 'atv').sha256 = 'a'.repeat(64); }],
      [[`files ${key('optimize')} (optimize) changed`], l => { row(l, 'optimize').mode = '100755'; }],
      [[`files ${key('token-budget')} (token-budget) removed`],
        l => { l.files = l.files.filter((/** @type {any} */ file) => file !== row(l, 'token-budget')); }],
      [[`files ${key('atv')} changed upstream from "atv" to "speckit"`], l => { row(l, 'atv').upstream = 'speckit'; }],
      [[`files ${key('speckit')} changed upstream from "speckit" to "atv"`], l => { row(l, 'speckit').upstream = 'atv'; }],
      [['files .github/agents/new.agent.md ("atv") added'],
        l => { l.files.push({ ...row(l, 'atv'), stored_at: '.github/agents/new.agent.md' }); }],
      [[`files ${key('speckit')} is listed twice`], l => { l.files.push({ ...row(l, 'speckit') }); }],
      [[`files[${lock.files.length}] has no stored_at`], l => { l.files.push({ upstream: 'speckit' }); }]
    ];
    for (const [expected, mutate] of rows) {
      const changed = structuredClone(lock);
      mutate(changed);
      assert.deepEqual(lockDiffIssues('speckit', base, changed, latest, context), expected, mutate.toString());
    }
    const added = structuredClone(lock);
    added.files.push(specifyRow(fresh, 'new\n'));
    assert.deepEqual(lockDiffIssues('speckit', base, added, latest,
      { baseTree, written: new Map([...written, [fresh, hex('new\n')]]) }), []);
    assert.deepEqual(lockDiffIssues('speckit', base, added, latest, { written: new Map([...written, [fresh, hex('new\n')]]) }),
      [`files ${fresh} added: ${fresh}: the base tree is unavailable`]);
  });

  test('a candidate row cannot claim a tracked path or a directory holding files its upstream does not own', () => {
    const base = baseLock();
    const latest = speckitLatest();
    const unlocked = unlockedStored();
    for (const path of ['.specify/memory/constitution.md', '.github/skills/baton/SKILL.md',
      '.github/skills/baton-land/SKILL.md', '.github/skills/baton-review/SKILL.md', 'packs/learning/files/.atv/.gitignore']) {
      assert.ok(unlocked.includes(path), path);
    }
    assert.ok(unlocked.length >= 13, String(unlocked.length));
    const claim = (/** @type {any} */ lock, /** @type {string} */ id, /** @type {string} */ path) => {
      const copy = structuredClone(lock);
      copy.files.push({ ...base.files.find((/** @type {any} */ file) => file.upstream === id), stored_at: path });
      return copy;
    };
    for (const path of unlocked) {
      for (const id of /** @type {const} */ (['speckit', 'atv'])) {
        const candidateLock = claim(base, id, path);
        const reason = `${path} is tracked in the base tree without a base lock row`;
        assert.equal(pathPolicyIssue(path, 'changed', id, { baseLock: base, candidateLock, baseTree }), reason, `${id} ${path}`);
        assert.equal(pathPolicyIssue(path, 'deleted', id, { baseLock: base, candidateLock, baseTree }),
          `${path} is not a locked upstream output`, `${id} delete ${path}`);
        const pin = id === 'speckit' ? latest : makePin('atv', { version: null, commit: sha('a'), tree: sha('c') });
        assert.ok(lockDiffIssues(id, base, candidateLock, pin, { baseTree, written: new Map([[path, hex('x')]]) })
          .includes(`files ${path} added: ${reason}`), `${id} row ${path}`);
      }
    }
    const speckitGrowth = 'is new; speckit adds or removes files only under .specify/';
    const atvGrowth = 'is new; atv adds or removes files only through a Baton pack definition';
    /** @type {Array<[import('../../src/lib/upstream-candidates.mjs').UpstreamId, string, string|null]>} */
    const cases = [
      ['speckit', '.specify/templates/new-template.md', null],
      ['speckit', '.specify/new.json', null],
      ['speckit', '.specify/extensions.yml.d/new.yml', null],
      ['speckit', '.github/skills/speckit-new/SKILL.md', speckitGrowth],
      ['speckit', '.github/agents/new.agent.md', speckitGrowth],
      ['speckit', '.github/skills/baton/references/x.md', speckitGrowth],
      ['speckit', 'packs/optimize/files/.github/skills/new/SKILL.md', speckitGrowth],
      ['speckit', 'packs/issues/files/new/x.md', speckitGrowth],
      ['speckit', 'packs/newpack/files/x.md', speckitGrowth],
      ['atv', '.github/agents/new.agent.md', atvGrowth],
      ['atv', '.github/skills/atv-new/SKILL.md', atvGrowth],
      ['atv', '.github/skills/baton-land/x.md', atvGrowth],
      ['atv', '.github/hooks/new.json', 'is not a locked upstream output'],
      ['atv', 'packs/learning/files/.atv/new.md', atvGrowth],
      ['atv', 'packs/optimize/files/x.md', atvGrowth],
      ['atv', 'packs/token-budget/files/x.md', atvGrowth],
      ['atv', 'packs/issues/files/new/x.md', atvGrowth],
      ['atv', 'packs/design/files/.github/agents/new.agent.md', atvGrowth],
      ['atv', '.specify/new.json', atvGrowth],
      ['speckit', '.specify/memory/new.md', 'is new; .specify/memory/ is protected'],
      ['speckit', '.specify/memory/deep/new.md', 'is new; .specify/memory/ is protected'],
      ['speckit', '.specify/extensions/new.yml', 'is new; .specify/extensions/ is protected'],
      ['speckit', '.specify/extensions/baton/commands/new.md', 'is new; .specify/extensions/ is protected'],
      ['speckit', '.specify/memory/Constitution.md', 'differs only in letter case from a tracked file'],
      ['speckit', '.github/skills/BATON/x.md', 'differs only in letter case from a tracked directory'],
      ['speckit', '.specify/Templates/x.md', 'differs only in letter case from a tracked directory'],
      ['speckit', '.specify/templates', 'is a tracked directory'],
      ['speckit', '.specify/memory/constitution.md/x.md', 'is below the tracked file .specify/memory/constitution.md']
    ];
    for (const [id, path, reason] of cases) {
      const issue = pathPolicyIssue(path, 'changed', id, { baseLock: base, candidateLock: claim(base, id, path), baseTree });
      assert.equal(issue, reason === null ? null : `${path} ${reason}`, `${id} ${path}`);
    }
    for (const path of ['.specify/../.github/workflows/x.yml', '.specify/./x.md', '.specify/x y.md']) {
      const issue = lockDiffIssues('speckit', base, claim(base, 'speckit', path), latest,
        { baseTree, written: new Map([[path, hex('x')]]) });
      assert.ok(issue.some(text => text.startsWith(`files ${path} added: ${JSON.stringify(path)} `)), `${path}: ${issue}`);
    }
    const synthetic = (/** @type {string[]} */ paths, /** @type {string} */ path) => pathPolicyIssue(path, 'changed', 'speckit',
      { baseLock: base, candidateLock: claim(base, 'speckit', path), baseTree: new Set(paths) });
    assert.equal(synthetic(['.specify/x/unlocked.md'], '.specify/x/new.md'),
      '.specify/x/new.md would be added in a directory with .specify/x/unlocked.md, which speckit does not own');
    assert.equal(synthetic(['README.md'], '.specify/new.md'), '.specify/new.md is not under a stored root the base tree tracks');
    const own = base.files.find((/** @type {any} */ file) => file.upstream === 'speckit');
    const renamed = structuredClone(base);
    renamed.files = renamed.files.filter((/** @type {any} */ file) => file.stored_at !== own.stored_at);
    renamed.files.push({ ...own, stored_at: '.specify/memory/constitution.md' });
    assert.ok(lockDiffIssues('speckit', base, renamed, latest,
      { baseTree, written: new Map([['.specify/memory/constitution.md', own.sha256]]) })
      .includes('files .specify/memory/constitution.md added: .specify/memory/constitution.md is tracked in the base ' +
        'tree without a base lock row'));
  });

  test('a candidate that writes a claimed tracked path is rejected while a genuinely new .specify file verifies', () => {
    const write = (/** @type {ReturnType<typeof speckitCandidate>} */ c, /** @type {string} */ path) => {
      const lock = structuredClone(c.lock);
      const bytes = Buffer.from('replaced\n');
      lock.files.push(specifyRow(path, bytes));
      const lockBytes = Buffer.from(`${JSON.stringify(lock, null, 2)}\n`);
      c.files.set('baton.lock.json', { bytes: lockBytes, symlink: false });
      c.files.set(path, { bytes, symlink: false });
      c.manifest.changed[0].sha256 = hex(lockBytes);
      c.manifest.changed.push({ path, sha256: hex(bytes), mode: '100644' });
      return c;
    };
    for (const path of unlockedStored()) {
      const c = write(speckitCandidate(), path);
      assert.throws(() => verifyCandidate({ plan: c.plan, manifest: c.manifest, files: c.files, baseLock: c.base, baseTree }),
        (/** @type {any} */ error) => error?.code === 'E_PATH_POLICY' && error.message.includes(path), path);
    }
    const fresh = write(speckitCandidate(), '.specify/templates/new-template.md');
    assert.match(verifyCandidate({ plan: fresh.plan, manifest: fresh.manifest, files: fresh.files, baseLock: fresh.base,
      baseTree }).digest, /^[0-9a-f]{64}$/);
    const blind = write(speckitCandidate(), '.specify/templates/new-template.md');
    assert.throws(() => verifyCandidate({ plan: blind.plan, manifest: blind.manifest, files: blind.files,
      baseLock: blind.base, baseTree: /** @type {any} */ (undefined) }), fails('E_PATH_POLICY'));
  });

  test('manifest verification binds plan, bytes, modes, paths and digest', () => {
    const valid = speckitCandidate();
    const verified = verifyCandidate({ plan: valid.plan, manifest: valid.manifest, files: valid.files, baseLock: valid.base,
      baseTree });
    const { checks, ...withoutChecks } = valid.manifest;
    assert.equal(verified.digest, contentDigest(valid.manifest));
    assert.equal(verified.digest, contentDigest({ ...withoutChecks, checks: [] }));
    assert.match(verified.digest, /^[0-9a-f]{64}$/);
    /** @type {Array<[string, (c: ReturnType<typeof speckitCandidate>) => void]>} */
    const tampered = [
      ['E_CANDIDATE_VERIFY', c => { c.manifest.base = sha('c'); }],
      ['E_CANDIDATE_VERIFY', c => { c.manifest.bump = 'speckit=9.9.8'; }],
      ['E_CANDIDATE_VERIFY', c => { c.manifest.upstream = 'atv'; }],
      ['E_CANDIDATE_VERIFY', c => { c.manifest.changed[1].sha256 = 'f'.repeat(64); }],
      ['E_CANDIDATE_VERIFY', c => { c.manifest.changed[1].mode = '120000'; }],
      ['E_CANDIDATE_VERIFY', c => { c.files.set(c.target, { bytes: Buffer.from('x'), symlink: true }); }],
      ['E_CANDIDATE_VERIFY', c => { c.manifest.changed.push({ ...c.manifest.changed[1] }); }],
      ['E_CANDIDATE_VERIFY', c => { c.files.set('extra.txt', { bytes: Buffer.from('x'), symlink: false }); }],
      ['E_CANDIDATE_VERIFY', c => { c.manifest.summary = 'forged'; }],
      ['E_CANDIDATE_VERIFY', c => { c.manifest.pin = { ...c.manifest.pin, commit: sha('8') }; }],
      ['E_CANDIDATE_VERIFY', c => { c.manifest.checks = [{ name: 'npm run check', result: 'fail' }]; }],
      ['E_PATH_POLICY', c => {
        const lock = structuredClone(c.lock);
        lock.files.find((/** @type {any} */ file) => file.upstream === 'atv').sha256 = 'a'.repeat(64);
        const bytes = Buffer.from(`${JSON.stringify(lock, null, 2)}\n`);
        c.files.set('baton.lock.json', { bytes, symlink: false });
        c.manifest.changed[0].sha256 = hex(bytes);
      }],
      ['E_PATH_POLICY', c => {
        const bytes = Buffer.from('on: push\n');
        c.files.set('.github/workflows/x.yml', { bytes, symlink: false });
        c.manifest.changed.push({ path: '.github/workflows/x.yml', sha256: hex(bytes), mode: '100644' });
      }],
      ['E_PATH_POLICY', c => { c.manifest.deleted.push('src/cli.mjs'); }]
    ];
    for (const [code, mutate] of tampered) {
      const candidate = speckitCandidate();
      mutate(candidate);
      assert.throws(() => verifyCandidate({ plan: candidate.plan, manifest: candidate.manifest, files: candidate.files,
        baseLock: candidate.base, baseTree }), fails(code), mutate.toString());
    }
    const schema = speckitCandidate();
    schema.manifest.checks = [{ name: 'npm run check', result: 'fail' }];
    assert.throws(() => verifyCandidate({ plan: schema.plan, manifest: schema.manifest, files: schema.files,
      baseLock: schema.base, baseTree }), { message: 'E_CANDIDATE_VERIFY speckit: manifest checks do not match the required check schema' });
  });

  test('markers render and parse round-trip; malformed markers are ignored', () => {
    const value = { upstream: 'speckit', pin: 'speckit=1.2.3', base: BASE, digest: 'd'.repeat(64) };
    const text = renderMarker(value);
    assert.equal(text, `<!-- baton-upstream-candidate upstream=speckit pin=speckit=1.2.3 base=${BASE} digest=${'d'.repeat(64)} -->`);
    assert.deepEqual(parseMarker(`intro\n${text}\nrest`), { ...value, closed: null });
    assert.deepEqual(parseMarker(renderMarker({ ...value, closed: 'obsolete' })), { ...value, closed: 'obsolete' });
    for (const bad of [text.replace('speckit=1.2.3', 'speckit=main'), text.replace('pin=speckit', 'pin=atv'),
      text.replace(BASE, 'B'.repeat(40)), 'no marker', null]) {
      assert.equal(parseMarker(/** @type {any} */ (bad)), null);
    }
  });

  test('PR body has sections 1-6 in order with validated links and no release notes', () => {
    const { plan: p, manifest } = speckitCandidate();
    const body = renderPrBody({ plan: p, manifest, digest: 'd'.repeat(64), runUrl: 'https://github.com/dermonaco-labs/baton/actions/runs/1' });
    const order = ['<!-- baton-upstream-candidate', '## Pins', '## Generated change summary', '## Validation',
      '## Reviewer checklist', '## How checks start'].map(heading => body.indexOf(heading));
    assert.ok(order.every((index, i) => index >= 0 && (i === 0 || index > order[i - 1])), order.join());
    assert.ok(body.startsWith('<!-- baton-upstream-candidate upstream=speckit pin=speckit=9.9.9'));
    assert.match(body, /https:\/\/github\.com\/github\/spec-kit\/releases\/tag\/v9\.9\.9/);
    assert.match(body, new RegExp(`https://github\\.com/github/spec-kit/compare/${p.upstream.current.commit}\\.\\.\\.${sha('9')}`));
    assert.match(body, /https:\/\/pypi\.org\/project\/specify-cli\/9\.9\.9\//);
    for (const item of ['compatibility', 'THIRD_PARTY_NOTICES.md', 'repairs', 'reference closure',
      'changed agent and skill prompts read in full', 'normal Baton gates']) assert.ok(body.includes(item), item);
    assert.match(body, /ready for review/);
    assert.match(body, /Merging and release stay manual/);
    assert.match(body, /actions\/runs\/1/);
    assert.ok(body.includes('These results are attested by the read-only generate job. The required PR checks run after ' +
      'this PR is marked ready for review and remain the gate before merge.'));
    assert.equal(prTitle(p), 'Upstream: bump speckit to 9.9.9');
    const message = commitMessage(p, 'd'.repeat(64));
    assert.ok(message.startsWith('chore(upstream): bump speckit to 9.9.9\n\n'));
    for (const trailer of ['Baton-Upstream: speckit', 'Baton-Pin: speckit=9.9.9', `Baton-Base: ${BASE}`,
      `Baton-Content: ${'d'.repeat(64)}`]) assert.ok(message.includes(trailer), trailer);
    assert.equal(contentTrailer(message), 'd'.repeat(64));
  });

  test('tracking issue states the draft-only boundary and one row per upstream', () => {
    const p = plan({});
    const { body } = renderIssue({ plans: [p], results: {}, verification: { sync: 'pass', links: 'pass' },
      server: 'https://github.com', repo: 'dermonaco-labs/baton' });
    assert.ok(body.includes('Opens draft candidate PRs only; never merges, tags, releases or pushes to the default branch.'));
    assert.equal(ISSUE_NOTICE.includes('Opens draft candidate PRs only'), true);
    assert.match(body, /\| Upstream \| Current pin \| Latest pin \| Candidate \| Blocker \|/);
    assert.match(body, /\| speckit \|/);
  });
});

describe('upstream candidates atv', () => {
  const lockAtv = () => baseLock().upstreams.atv;
  const head = { commit: sha('7'), tree: sha('8') };
  const releases = [
    { tag_name: 'v2.7.0', draft: false, prerelease: false },
    { tag_name: 'v2.6.3', draft: false, prerelease: false },
    { tag_name: 'v2.8.0', draft: false, prerelease: true }
  ];

  test('main policy candidates are the main HEAD commit and tree', () => {
    const entry = lockAtv();
    assert.equal(policyOf('atv', entry), 'main');
    const current = currentPin('atv', entry);
    assert.equal(current.bump, `atv=${entry.commit}`);
    const selection = selectAtv({ policy: 'main', current, releases, head });
    assert.deepEqual(selection.target, { kind: 'commit', commit: head.commit, tree: head.tree });
    const latest = makePin('atv', { version: null, commit: head.commit, tree: head.tree });
    assert.equal(latest.bump, `atv=${head.commit}`);
    assert.equal(isNewer('main', current, latest), true);
    assert.equal(isNewer('main', current, current), false);
    assert.throws(() => selectAtv({ policy: 'main', current, releases, head: { commit: 'main', tree: head.tree } }),
      fails('E_SOURCE_FORMAT'));
  });

  test('release policy candidates are the newest stable release; a moved main is informational only', () => {
    const entry = { ...lockAtv(), version: '2.6.3', tag: 'v2.6.3', ref: 'v2.6.3' };
    assert.equal(policyOf('atv', entry), 'release');
    const current = currentPin('atv', entry);
    assert.equal(current.bump, 'atv=2.6.3');
    const selection = selectAtv({ policy: 'release', current, releases, head });
    assert.deepEqual(selection.target, { kind: 'tag', version: '2.7.0' });
    assert.equal(selection.info, head.commit);
    const same = selectAtv({ policy: 'release', current, releases: releases.slice(1), head });
    assert.deepEqual(same.target, { kind: 'tag', version: '2.6.3' });
    const latest = makePin('atv', { version: '2.6.3', commit: current.commit, tree: current.tree });
    const p = planUpstream({ id: 'atv', base: BASE, publish: true, policy: 'release', current, latest,
      blocker: null, prs: [], branch: null, info: same.info });
    assert.equal(p.action, 'none');
    assert.equal(p.info, head.commit);
    const { body } = renderIssue({ plans: [p], results: {}, verification: { sync: 'pass', links: 'pass' },
      server: 'https://github.com', repo: 'dermonaco-labs/baton' });
    assert.ok(body.includes(head.commit));
  });

  test('any other tracked ref is an unsupported-ref blocker', () => {
    for (const entry of [{ ...lockAtv(), ref: 'develop' }, { ...lockAtv(), version: '2.6.3', ref: 'main' },
      { ...lockAtv(), version: '2.6.3', tag: 'v2.6.3', ref: 'v2.6.4' }]) {
      assert.throws(() => policyOf('atv', entry), fails('E_UNSUPPORTED_REF'));
    }
  });

  test('upstream plans are independent and an ATV candidate cannot touch Spec Kit', () => {
    const base = baseLock();
    const latest = makePin('atv', { version: null, commit: head.commit, tree: head.tree });
    const lock = structuredClone(base);
    Object.assign(lock.upstreams.atv, { commit: head.commit, tree: head.tree });
    assert.deepEqual(lockDiffIssues('atv', base, lock, latest), []);
    const touched = structuredClone(lock);
    touched.upstreams.speckit.version = '9.9.9';
    assert.notDeepEqual(lockDiffIssues('atv', base, touched, latest), []);
    const noted = structuredClone(lock);
    noted.upstreams.atv.note = 'changed';
    assert.notDeepEqual(lockDiffIssues('atv', base, noted, latest), []);
    for (const other of ['speckit', 'token-budget']) {
      const rowChanged = structuredClone(lock);
      const row = rowChanged.files.find((/** @type {any} */ file) => file.upstream === other);
      row.sha256 = 'a'.repeat(64);
      assert.deepEqual(lockDiffIssues('atv', base, rowChanged, latest), [`files ${row.stored_at} (${other}) changed`]);
    }
    const context = { baseLock: base, candidateLock: lock, baseTree };
    assert.notEqual(pathPolicyIssue('baton/upstream/specify-cli.requirements.txt', 'changed', 'atv', context), null);
    const speckit = plan({});
    const atv = planUpstream({ id: 'atv', base: BASE, publish: true, policy: 'main', current: currentPin('atv', base.upstreams.atv),
      latest, blocker: { code: 'E_UPSTREAM_VERIFY', stage: 'detect', excerpt: 'x', run: 'https://github.com/a/b/actions/runs/1' },
      prs: [], branch: null, info: null });
    assert.equal(speckit.action, 'generate');
    assert.equal(atv.action, 'blocked');
    assert.equal(branchFor('atv'), 'baton/upstream-upgrade/atv');
  });
});

describe('upstream candidates speckit and atv row ownership policy', () => {
  /** A bumped candidate lock for `id` and its expected pin. @param {'speckit'|'atv'} id */
  const bumped = id => {
    const base = baseLock();
    const lock = structuredClone(base);
    if (id === 'speckit') {
      const latest = speckitLatest();
      Object.assign(lock.upstreams.speckit, { version: latest.version, tag: `v${latest.version}`, commit: latest.commit });
      return { base, lock, latest };
    }
    const latest = makePin('atv', { version: null, commit: sha('a'), tree: sha('c') });
    Object.assign(lock.upstreams.atv, { commit: latest.commit, tree: latest.tree });
    return { base, lock, latest };
  };
  /** @param {any} lock @param {string} path */
  const at = (lock, path) => lock.files.find((/** @type {any} */ file) => file.stored_at === path);
  /** Issues of a candidate `mutate` builds; each written path records the row's sha256 unless a hash is given. */
  const issuesOf = (/** @type {'speckit'|'atv'} */ id,
    /** @type {(lock:any) => {write?:Array<string|[string,string]>,delete?:string[]}|void} */ mutate) => {
    const { base, lock, latest } = bumped(id);
    const effect = mutate(lock) ?? {};
    const written = new Map((effect.write ?? []).map(item => typeof item === 'string' ?
      [item, at(lock, item)?.sha256 ?? hex(item)] : item));
    return lockDiffIssues(id, base, lock, latest, { baseTree, written, deleted: new Set(effect.delete ?? []) });
  };
  /** One owned row per upstream and stored root (Baton-sourced extension files aside), so every install root is used. */
  const ownedRoots = (/** @type {'speckit'|'atv'} */ id) => {
    const seen = new Map();
    for (const row of baseLock().files.filter((/** @type {any} */ file) => file.upstream === id &&
      !(file['x-baton-source'] && !file.stored_at.endsWith('/SKILL.md')))) {
      const parts = row.stored_at.split('/');
      const root = parts.slice(0, row.stored_at.startsWith('packs/') ? 5 : 2).join('/');
      if (!seen.has(root)) seen.set(root, row.stored_at);
    }
    return [...seen.values()];
  };

  test('the committed lock satisfies every owned-row invariant for both upstreams', () => {
    const base = baseLock();
    for (const row of base.files) {
      const match = /^packs\/([a-z0-9-]+)\/files\/(.+)$/.exec(row.stored_at);
      assert.deepEqual([row.path, row.packs], match ? [match[2], [match[1]]] : [row.stored_at, ['core']], row.stored_at);
    }
    for (const id of /** @type {const} */ (['speckit', 'atv'])) assert.deepEqual(issuesOf(id, () => {}), [], id);
    assert.ok(ownedRoots('speckit').length >= 8 && ownedRoots('atv').length >= 10);
  });

  test('a regenerated owned file under every owned stored root and a new .specify file are accepted', () => {
    for (const id of /** @type {const} */ (['speckit', 'atv'])) {
      for (const path of ownedRoots(id)) {
        assert.deepEqual(issuesOf(id, lock => {
          at(lock, path).sha256 = at(lock, path).sha256_upstream = hex(`new ${path}`);
          return { write: [path] };
        }), [], `${id} ${path}`);
      }
    }
    const dirs = [...new Set([...baseTree].filter(path => path.startsWith('.specify/'))
      .map(path => path.slice(0, path.lastIndexOf('/'))))]
      .filter(dir => !/^\.specify\/(?:memory|extensions)(?:\/|$)/.test(dir));
    assert.ok(dirs.length >= 8, dirs.join());
    for (const dir of dirs) {
      const path = `${dir}/baton-new-upstream-file.md`;
      assert.deepEqual(issuesOf('speckit', lock => { lock.files.push(specifyRow(path, path)); return { write: [path] }; }), [],
        path);
    }
    const repaired = ownedRoots('atv')[0];
    assert.deepEqual(issuesOf('atv', lock => {
      Object.assign(at(lock, repaired), { sha256: hex('repaired'), sha256_upstream: hex('raw'),
        repair: { id: 'r1', reason: 'fix', upstream_issue: 'https://github.com/All-The-Vibes/ATV-StarterKit/issues/1' } });
      return { write: [repaired] };
    }), []);
  });

  test('no upstream adds or removes rows outside its growth root, and protected paths never grow or shrink', () => {
    const packRoots = [...new Set([...baseTree].filter(path => /^packs\/[^/]+\/files\//.test(path))
      .map(path => path.split('/').slice(0, 3).join('/')))];
    assert.ok(['packs/optimize/files', 'packs/token-budget/files', 'packs/issues/files', 'packs/learning/files']
      .every(root => packRoots.includes(root)), packRoots.join());
    const targets = [...packRoots.map(root => `${root}/new/x.md`), ...packRoots.map(root => `${root}/.github/skills/n/SKILL.md`),
      '.github/agents/new.agent.md', '.github/skills/new/SKILL.md', '.github/hooks/new.json'];
    for (const id of /** @type {const} */ (['speckit', 'atv'])) {
      const growth = id === 'speckit' ? 'speckit adds or removes files only under .specify/' :
        'atv adds or removes files only through a Baton pack definition';
      for (const path of targets) {
        const target = /^packs\/([a-z0-9-]+)\/files\/(.+)$/.exec(path);
        const row = { ...specifyRow(path, path), upstream: id, path: target ? target[2] : path,
          packs: target ? [target[1]] : ['core'] };
        assert.deepEqual(issuesOf(id, lock => { lock.files.push(row); return { write: [path] }; }),
          [`files ${path} added: ${path} is new; ${growth}`], `${id} ${path}`);
      }
      for (const path of ownedRoots(id).filter(stored => !stored.startsWith('.specify/'))) {
        assert.deepEqual(issuesOf(id, lock => {
          lock.files = lock.files.filter((/** @type {any} */ file) => file.stored_at !== path);
          return { delete: [path] };
        }), [`files ${path} removed: ${growth}`], `${id} remove ${path}`);
      }
    }
    for (const path of ['.specify/extensions.yml', '.specify/extensions/.registry', '.specify/extensions/baton/extension.yml',
      '.specify/memory/.constitution-template.json']) {
      const guarded = path.startsWith('.specify/memory/') ? '.specify/memory/' :
        path === '.specify/extensions.yml' ? '.specify/extensions.yml' : '.specify/extensions/';
      assert.deepEqual(issuesOf('speckit', lock => {
        lock.files = lock.files.filter((/** @type {any} */ file) => file.stored_at !== path);
        return { delete: [path] };
      }), [`files ${path} removed: ${guarded} is protected`], path);
    }
    const template = baseLock().files.find((/** @type {any} */ file) => file.stored_at.startsWith('.specify/templates/'))
      .stored_at;
    const drop = (/** @type {any} */ lock) => { lock.files = lock.files.filter((/** @type {any} */ f) => f.stored_at !== template); };
    assert.deepEqual(issuesOf('speckit', lock => { drop(lock); return { delete: [template] }; }), []);
    assert.deepEqual(issuesOf('speckit', lock => { drop(lock); }), [`files ${template} removed without deleting the file`]);
    assert.deepEqual(issuesOf('speckit', () => ({ delete: [template] })),
      [`files ${template} is still locked although the file is deleted`]);
    const moved = template.replace(/[^/]+$/, 'moved-template.md');
    assert.deepEqual(issuesOf('speckit', lock => {
      lock.files.push({ ...specifyRow(moved, 'moved') });
      drop(lock);
      return { write: [moved], delete: [template] };
    }), []);
    const skill = ownedRoots('speckit').find(path => path.startsWith('.github/skills/'));
    const renamedSkill = skill.replace(/speckit-[^/]+/, 'speckit-renamed');
    assert.deepEqual(issuesOf('speckit', lock => {
      const row = at(lock, skill);
      lock.files = lock.files.filter((/** @type {any} */ file) => file !== row);
      lock.files.push({ ...row, stored_at: renamedSkill, path: renamedSkill, upstream_path: renamedSkill });
      return { write: [renamedSkill], delete: [skill] };
    }), [`files ${skill} removed: speckit adds or removes files only under .specify/`,
      `files ${renamedSkill} added: ${renamedSkill} is new; speckit adds or removes files only under .specify/`]);
  });

  test('owned rows keep their install target, provenance, license and shape; hashes match the written bytes', () => {
    const forbidden = ['.github/workflows/ci.yml', '.specify/memory/constitution.md', '.specify/extensions.yml',
      '.baton/config.yml', '.baton/bin/baton.mjs', 'specs/003-upstream-upgrade-prs/handoff.md', 'AGENTS.md', 'package.json',
      'src/cli.mjs'];
    for (const id of /** @type {const} */ (['speckit', 'atv'])) {
      for (const path of ownedRoots(id)) {
        const old = at(baseLock(), path);
        for (const target of forbidden.filter(target => target !== old.path)) {
          assert.deepEqual(issuesOf(id, lock => { at(lock, path).path = target; }),
            [`files ${path} changes path from ${JSON.stringify(old.path)} to ${JSON.stringify(target)}`], `${path} -> ${target}`);
        }
        for (const packs of [['core'], ['optimize'], ['token-budget'], ['issues'], [...old.packs, 'learning'], []]) {
          if (JSON.stringify(packs) === JSON.stringify(old.packs)) continue;
          assert.deepEqual(issuesOf(id, lock => { at(lock, path).packs = packs; }),
            [`files ${path} changes packs from ${JSON.stringify(old.packs)} to ${JSON.stringify(packs)}`], `${path} ${packs}`);
        }
        for (const [field, value] of /** @type {Array<[string, any]>} */ ([['upstream_path', 'evil/x.md'],
          ['license', 'GPL-3.0'], ['x-baton-source', 'baton/evil.md'], ['x-baton-source-sha256', 'e'.repeat(64)]])) {
          if (old[field] === undefined) {
            assert.deepEqual(issuesOf(id, lock => { at(lock, path)[field] = value; }), [`files ${path} changes its field set`]);
          } else {
            assert.deepEqual(issuesOf(id, lock => { at(lock, path)[field] = value; }),
              [`files ${path} changes ${field} from ${JSON.stringify(old[field])} to ${JSON.stringify(value)}`], field);
          }
        }
        assert.deepEqual(issuesOf(id, lock => { delete at(lock, path).repair; }), [`files ${path} changes its field set`]);
        assert.deepEqual(issuesOf(id, lock => { at(lock, path).sha256 = hex('x'); return { write: [path] }; }),
          [`files ${path} has no repair but sha256 differs from sha256_upstream`]);
        assert.deepEqual(issuesOf(id, lock => { at(lock, path).sha256 = at(lock, path).sha256_upstream = 'X'; }),
          [`files ${path} has an invalid sha256 or sha256_upstream`]);
        assert.deepEqual(issuesOf(id, lock => { at(lock, path).sha256 = at(lock, path).sha256_upstream = hex('y'); }),
          [`files ${path} changes sha256 without a changed file`]);
        assert.deepEqual(issuesOf(id, lock => {
          at(lock, path).sha256 = at(lock, path).sha256_upstream = hex('y');
          return { write: [[path, hex('other')]] };
        }), [`files ${path} sha256 does not match the written file`]);
      }
    }
    const fresh = '.specify/templates/fresh.md';
    /** @type {Array<[string, (row:any) => void]>} */
    const fresher = [
      [`installs at ".github/workflows/ci.yml" for ["core"], not ${fresh} for ["core"]`,
        row => { row.path = '.github/workflows/ci.yml'; }],
      [`installs at ${JSON.stringify(fresh)} for ["optimize"], not ${fresh} for ["core"]`, row => { row.packs = ['optimize']; }],
      [`added with upstream_path "templates/fresh.md", not ${fresh}`, row => { row.upstream_path = 'templates/fresh.md'; }],
      ['added with fields other than license, packs, path, repair, sha256, sha256_upstream, stored_at, upstream, upstream_path',
        row => { row['x-baton-source'] = 'baton/x.md'; }],
      ['has license "GPL-3.0", not "MIT"', row => { row.license = 'GPL-3.0'; }],
      ['has an invalid repair', row => { row.repair = { id: 'r', reason: 'x', upstream_issue: 'u' }; }],
      ['has no repair but sha256 differs from sha256_upstream', row => { row.sha256_upstream = hex('raw'); }],
      ['sha256 does not match the written file', row => { row.sha256 = row.sha256_upstream = hex('other'); }]
    ];
    for (const [issue, mutate] of fresher) {
      assert.deepEqual(issuesOf('speckit', lock => {
        const row = specifyRow(fresh, 'fresh');
        lock.files.push(row);
        mutate(row);
        return { write: [[fresh, hex('fresh')]] };
      }), [`files ${fresh} ${issue}`], issue);
    }
    const atv = ownedRoots('atv')[0];
    for (const repair of [{ id: 'r' }, { id: 'r', reason: 'x', upstream_issue: '' }, [], 'r',
      { id: 'r', reason: 'x', upstream_issue: 'u', extra: 'y' }]) {
      assert.deepEqual(issuesOf('atv', lock => { at(lock, atv).repair = repair; }), [`files ${atv} has an invalid repair`],
        JSON.stringify(repair));
    }
    const speckit = ownedRoots('speckit')[0];
    assert.deepEqual(issuesOf('speckit', lock => { at(lock, speckit).repair = { id: 'r', reason: 'x', upstream_issue: 'u' }; }),
      [`files ${speckit} has an invalid repair`]);
    const provenance = baseLock().files.filter((/** @type {any} */ file) => file['x-baton-source'] &&
      !file.stored_at.endsWith('/SKILL.md'));
    assert.ok(provenance.length >= 4);
    for (const row of provenance) {
      assert.deepEqual(issuesOf('speckit', lock => {
        at(lock, row.stored_at).sha256 = at(lock, row.stored_at).sha256_upstream = hex('forged');
        return { write: [row.stored_at] };
      }), [`files ${row.stored_at} differs from its Baton source ${row['x-baton-source']}`], row.stored_at);
    }
  });

  test('install targets outside the upstream install roots are rejected even for a base-locked row', () => {
    const base = baseLock();
    const latest = speckitLatest();
    for (const path of ['.github/workflows/x.yml', '.baton/x.md', 'specs/x.md', 'packs/optimize/files/.baton/vendor/x.md']) {
      const target = /^packs\/([a-z0-9-]+)\/files\/(.+)$/.exec(path);
      const row = { ...specifyRow(path, 'old'), path: target ? target[2] : path, packs: target ? [target[1]] : ['core'] };
      const trusted = structuredClone(base);
      trusted.files.push(row);
      const lock = structuredClone(trusted);
      Object.assign(lock.upstreams.speckit, { version: latest.version, tag: `v${latest.version}`, commit: latest.commit });
      assert.deepEqual(lockDiffIssues('speckit', trusted, lock, latest, { baseTree }),
        [`files ${path} installs at ${row.path}, outside the upstream install roots`], path);
    }
  });
});

describe('upstream candidates lifecycle', () => {
  test('a branch is bot-only only when every commit is authored and committed by the bot', () => {
    assert.equal(classifyBranch([commit(bot)]), true);
    assert.equal(classifyBranch([]), true);
    assert.equal(classifyBranch([commit(bot), commit(human)]), false);
    assert.equal(classifyBranch([commit(human, bot)]), false);
    assert.equal(classifyBranch([commit(bot, { name: 'GitHub', email: 'noreply@github.com' })]), false);
    assert.equal(classifyBranch([commit({ ...bot, name: 'Mallory' }, bot)]), false);
  });

  const marker = (pin = 'speckit=9.9.9', extra = {}) =>
    ({ upstream: 'speckit', pin, base: BASE, digest: 'd'.repeat(64), closed: null, ...extra });
  const branch = (extra = {}) => ({ sha: sha('e'), botOnly: true, content: 'd'.repeat(64), ...extra });
  const open = (/** @type {any} */ m) => ({ number: 7, state: 'open', merged: false, marker: m });

  test('the same pin, base and digest is unchanged; a new base or content regenerates', () => {
    assert.equal(plan({ prs: [open(marker())], branch: branch() }).action, 'unchanged');
    assert.equal(plan({ prs: [open(marker('speckit=9.9.9', { base: sha('c') }))], branch: branch() }).action, 'generate');
    assert.equal(plan({ prs: [open(marker())], branch: branch({ content: 'e'.repeat(64) }) }).action, 'generate');
  });

  test('a human-edited candidate with a newer pin waits for the human', () => {
    const waiting = plan({ prs: [open(marker('speckit=9.9.8'))], branch: branch({ botOnly: false }) });
    assert.equal(waiting.action, 'waiting-human');
    assert.equal(waiting.pr?.state, 'open-human');
    assert.equal(plan({ prs: [], branch: branch({ botOnly: false }) }).action, 'waiting-human');
  });

  test('a candidate PR without a valid marker blocks for manual repair; its title is never trusted', () => {
    const titled = { title: 'Upstream: bump speckit to 9.9.8' };
    /** @type {Array<[any, any]>} */
    const cases = [
      [{ ...open(null), ...titled }, branch()],
      [{ ...open(null), ...titled }, branch({ botOnly: false })],
      [{ number: 7, state: 'closed', merged: false, marker: null, ...titled }, null],
      [{ number: 7, state: 'closed', merged: false, marker: null, ...titled }, branch({ botOnly: false })]
    ];
    for (const [pr, head] of cases) {
      for (const latest of [speckitLatest(), speckitLatest('9.9.8')]) {
        const blocked = plan({ prs: [pr], branch: head, latest });
        assert.equal(blocked.action, 'blocked', JSON.stringify(pr));
        assert.equal(blocked.blocker?.code, 'E_PR_MARKER');
        assert.equal(blocked.blocker?.excerpt, `#7 (${pr.state}) on baton/upstream-upgrade/speckit has no valid candidate ` +
          'marker; restore the marker in its description, then rerun');
      }
    }
    const merged = { number: 7, state: 'closed', merged: true, marker: null };
    assert.equal(plan({ prs: [merged] }).action, 'generate', 'a merged PR never blocks');
  });

  test('a closed candidate with a restored marker suppresses its pin or, when marked obsolete, releases it', () => {
    const closed = { number: 7, state: 'closed', merged: false, marker: marker('speckit=9.9.9') };
    assert.equal(plan({ prs: [closed] }).action, 'suppressed');
    assert.equal(plan({ prs: [{ ...closed, marker: marker('speckit=9.9.9', { closed: 'obsolete' }) }] }).action, 'generate');
  });

  test('a human close suppresses exactly that pin; a newer pin generates again', () => {
    const closed = { number: 5, state: 'closed', merged: false, marker: marker('speckit=9.9.9') };
    assert.equal(plan({ prs: [closed] }).action, 'suppressed');
    assert.equal(plan({ prs: [closed], latest: speckitLatest('9.9.10') }).action, 'generate');
    assert.equal(plan({ prs: [{ ...closed, merged: true }] }).action, 'generate');
  });

  test('the automation obsolete close never suppresses', () => {
    const closed = { number: 5, state: 'closed', merged: false, marker: marker('speckit=9.9.9', { closed: 'obsolete' }) };
    assert.equal(plan({ prs: [closed] }).action, 'generate');
  });

  test('when the default branch pins the same or newer, bot-only PRs close and human PRs are reported', () => {
    const current = speckitCurrent();
    for (const pin of [current.bump, 'speckit=0.0.1']) {
      assert.equal(plan({ prs: [open(marker(pin))], branch: branch() }).action, 'close-obsolete', pin);
      assert.equal(plan({ prs: [open(marker(pin))], branch: branch({ botOnly: false }) }).action, 'obsolete-human', pin);
    }
  });
});
