import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { sourceRoot } from '../helpers/index.mjs';
import * as candidates from '../../src/lib/upstream-candidates.mjs';

const {
  BOT_EMAIL, BOT_NAME, ISSUE_NOTICE, branchFor, buildRunUrl, classifyBranch, commitMessage, compareVersions,
  contentDigest, contentTrailer, currentPin, isNewer, isSha, isTag, isVersion, lockDiffIssues, makePin,
  parseMarker, pathPolicyIssue, planUpstream, policyOf, prTitle, renderIssue, renderMarker, renderPrBody,
  sanitizeExcerpt, selectAtv, selectSpeckit, verifyCandidate
} = candidates;

const sha = (/** @type {string} */ c) => c.repeat(40);
const hex = (/** @type {Buffer|string} */ bytes) => createHash('sha256').update(bytes).digest('hex');
const baseLock = () => JSON.parse(readFileSync(join(sourceRoot, 'baton.lock.json'), 'utf8'));
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
  const lockBytes = Buffer.from(`${JSON.stringify(lock, null, 2)}\n`);
  const fileBytes = Buffer.from('regenerated\n');
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
  return { base, lock, files, manifest, target, plan: plan({ latest }) };
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
    const context = { baseLock: base, candidateLock: base };
    const stored = (/** @type {string} */ prefix) =>
      base.files.find((/** @type {any} */ file) => file.stored_at.startsWith(prefix)).stored_at;
    for (const path of ['baton.lock.json', 'docs/reference/upstream-diff.md', 'baton/upstream/specify-cli.requirements.in',
      'baton/upstream/specify-cli.requirements.txt', stored('.github/agents/'), stored('.github/skills/'),
      stored('.specify/'), stored('packs/')]) {
      assert.equal(pathPolicyIssue(path, 'changed', 'speckit', context), null, path);
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
  });

  test('a candidate lock may change only its own pin fields, files and bump summary', () => {
    const { base, lock } = speckitCandidate();
    const latest = speckitLatest();
    assert.deepEqual(lockDiffIssues('speckit', base, lock, latest), []);
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
      assert.notDeepEqual(lockDiffIssues('speckit', base, changed, latest), [], mutate.toString());
    }
  });

  test('manifest verification binds plan, bytes, modes, paths and digest', () => {
    const valid = speckitCandidate();
    const verified = verifyCandidate({ plan: valid.plan, manifest: valid.manifest, files: valid.files, baseLock: valid.base });
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
      ['E_CANDIDATE_VERIFY', c => { c.manifest.checks = [{ name: 'npm run check', result: 'fail' }]; }],
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
        baseLock: candidate.base }), fails(code), mutate.toString());
    }
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
    const context = { baseLock: base, candidateLock: lock };
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
    assert.equal(plan({ prs: [open(null)], branch: branch() }).action, 'waiting-human');
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
