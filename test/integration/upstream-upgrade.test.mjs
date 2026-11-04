import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { sourceRoot } from '../helpers/index.mjs';
import { BOT_EMAIL, BOT_NAME, ISSUE_NOTICE, ISSUE_TITLE } from '../../src/lib/upstream-candidates.mjs';
import { createGit, detect, packageCandidate, publish, report } from '../../src/maintainer/upstream-upgrade.mjs';

const REPO = 'dermonaco-labs/baton';
const BRANCH = 'baton/upstream-upgrade/speckit';
const REQUIREMENTS = 'baton/upstream/specify-cli.requirements.txt';
const RUN_URL = `https://github.com/${REPO}/actions/runs/42`;
const sha = (/** @type {string} */ c) => c.repeat(40);
const hex = (/** @type {Buffer|string} */ bytes) => createHash('sha256').update(bytes).digest('hex');
const humanEnv = { GIT_AUTHOR_NAME: 'Maintainer', GIT_AUTHOR_EMAIL: 'maintainer@example.com',
  GIT_COMMITTER_NAME: 'Maintainer', GIT_COMMITTER_EMAIL: 'maintainer@example.com' };
const botEnv = { GIT_AUTHOR_NAME: BOT_NAME, GIT_AUTHOR_EMAIL: BOT_EMAIL, GIT_COMMITTER_NAME: BOT_NAME,
  GIT_COMMITTER_EMAIL: BOT_EMAIL };

/** @param {string} cwd @param {string[]} args @param {Record<string,string>} [env] */
const sh = (cwd, args, env = {}) => execFileSync('git', args,
  { cwd, env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();

/** @param {string} root @param {string} path @param {string|Buffer} content */
function write(root, path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

/** A work clone of a local bare remote holding a real lock, one stored file and the requirements file. */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'baton-upgrade-'));
  const work = join(root, 'work');
  const remote = join(root, 'remote.git');
  mkdirSync(work);
  sh(root, ['init', '-q', '--bare', remote]);
  sh(root, ['--git-dir', remote, 'symbolic-ref', 'HEAD', 'refs/heads/main']);
  sh(work, ['init', '-q']);
  sh(work, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
  sh(work, ['config', 'core.autocrlf', 'true']);
  const lock = JSON.parse(readFileSync(join(sourceRoot, 'baton.lock.json'), 'utf8'));
  const target = lock.files.find((/** @type {any} */ file) => file.upstream === 'speckit').stored_at;
  write(work, 'baton.lock.json', `${JSON.stringify(lock, null, 2)}\n`);
  write(work, target, 'base\n');
  write(work, REQUIREMENTS, 'specify-cli==1.0.11\n');
  sh(work, ['add', '-A']);
  sh(work, ['-c', 'core.autocrlf=false', 'commit', '-q', '-m', 'base'], humanEnv);
  sh(work, ['push', '-q', remote, 'main']);
  return { root, work, remote, lock, target, artifacts: join(root, 'artifacts'), seq: 0,
    cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** @param {ReturnType<typeof fixture>} fx @param {string} branch */
function remoteRef(fx, branch) {
  try {
    return sh(fx.root, ['--git-dir', fx.remote, 'rev-parse', '--verify', '-q', `refs/heads/${branch}`]);
  } catch {
    return null;
  }
}

/** Recording emulation of the GitHub and PyPI endpoints the watcher uses. @param {ReturnType<typeof fixture>} fx */
function mockGitHub(fx) {
  const state = {
    speckit: '9.9.9', speckitCommit: sha('9'), pypiBroken: false, denyPr: false, nextPr: 100, nextIssue: 1,
    /** @type {any[]} */ prs: [], /** @type {any[]} */ issues: [], /** @type {any[]} */ comments: [],
    /** @type {Set<string>} */ labels: new Set(),
    /** @type {Array<{method:string,host:string,path:string,body:any,auth:string|null}>} */ calls: [],
    /** @type {typeof fetch} */ fetch: /** @type {any} */ (null)
  };
  /** @param {number} status @param {unknown} body */
  const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body) });
  const view = (/** @type {any} */ pr) => ({ ...pr, head: { ...pr.head, sha: remoteRef(fx, pr.head.ref) } });
  state.fetch = /** @type {any} */ (async (/** @type {string} */ url, /** @type {any} */ init = {}) => {
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    const u = new URL(url);
    const p = u.pathname;
    state.calls.push({ method, host: u.host, path: `${p}${u.search}`, body, auth: init.headers?.Authorization ?? null });
    if (u.host === 'pypi.org' && p === '/pypi/specify-cli/json') {
      return res(200, state.pypiBroken ? { releases: { 'not-a-version': [{}] } } :
        { releases: { '1.0.11': [{ yanked: false }], [state.speckit]: [{ yanked: false }] } });
    }
    if (u.host !== 'api.github.com') return res(599, 'unexpected host');
    const own = `/repos/${REPO}`;
    /** @type {RegExpExecArray|null} */
    let m;
    if (p === own) return res(200, { default_branch: 'main' });
    if (p === '/repos/github/spec-kit/releases') {
      return res(200, [{ tag_name: `v${state.speckit}`, draft: false, prerelease: false },
        { tag_name: 'v1.0.11', draft: false, prerelease: false }]);
    }
    if (p === `/repos/github/spec-kit/git/ref/tags/v${state.speckit}`) {
      return res(200, { object: { type: 'commit', sha: state.speckitCommit } });
    }
    if (p === '/repos/All-The-Vibes/ATV-StarterKit/commits/main') {
      return res(200, { sha: fx.lock.upstreams.atv.commit, commit: { tree: { sha: fx.lock.upstreams.atv.tree } } });
    }
    if (p === `${own}/pulls` && method === 'GET') {
      return res(200, state.prs.filter(pr => `dermonaco-labs:${pr.head.ref}` === u.searchParams.get('head')).map(view));
    }
    if (p === `${own}/pulls` && method === 'POST') {
      if (state.denyPr) return res(403, { message: 'GitHub Actions is not permitted to create or approve pull requests.' });
      const pr = { number: state.nextPr++, state: 'open', merged_at: null, draft: body.draft, title: body.title,
        body: body.body, head: { ref: body.head }, base: { ref: body.base } };
      state.prs.push(pr);
      return res(201, view(pr));
    }
    if ((m = new RegExp(`^${own}/pulls/(\\d+)$`).exec(p))) {
      const pr = state.prs.find(item => item.number === Number(m?.[1]));
      if (!pr) return res(404, {});
      if (method === 'PATCH') Object.assign(pr, body);
      return res(200, view(pr));
    }
    if ((m = new RegExp(`^${own}/git/ref/heads/(.+)$`).exec(p))) {
      const ref = remoteRef(fx, decodeURIComponent(m[1]));
      return ref ? res(200, { object: { type: 'commit', sha: ref } }) : res(404, {});
    }
    if ((m = new RegExp(`^${own}/compare/([0-9a-f]{40})\\.\\.\\.([0-9a-f]{40})$`).exec(p))) {
      const log = sh(fx.root, ['--git-dir', fx.remote, 'log', '--reverse', '--format=%an%x1f%ae%x1f%cn%x1f%ce%x1f%B%x1e', `${m[1]}..${m[2]}`]);
      const commits = log.split('\x1e').map(item => item.replace(/^\n/, '')).filter(Boolean).map(item => {
        const [an, ae, cn, ce, message] = item.split('\x1f');
        return { commit: { author: { name: an, email: ae }, committer: { name: cn, email: ce }, message } };
      });
      return res(200, { total_commits: commits.length, commits });
    }
    if (p === `${own}/issues` && method === 'GET') return res(200, u.searchParams.get('page') === '1' ? state.issues : []);
    if (p === `${own}/issues` && method === 'POST') {
      const issue = { number: state.nextIssue++, state: 'open', title: body.title, body: body.body, labels: body.labels };
      state.issues.push(issue);
      return res(201, issue);
    }
    if ((m = new RegExp(`^${own}/issues/(\\d+)/comments$`).exec(p)) && method === 'POST') {
      state.comments.push({ number: Number(m[1]), body: body.body });
      return res(201, {});
    }
    if ((m = new RegExp(`^${own}/issues/(\\d+)$`).exec(p)) && method === 'PATCH') {
      const issue = state.issues.find(item => item.number === Number(m?.[1]));
      Object.assign(issue, body);
      return res(200, issue);
    }
    if (p === `${own}/labels/upstream-bump`) return state.labels.has('upstream-bump') ? res(200, {}) : res(404, {});
    if (p === `${own}/labels` && method === 'POST') {
      state.labels.add(body.name);
      return res(201, {});
    }
    return res(599, `unexpected ${method} ${p}`);
  });
  return state;
}

/** @param {ReturnType<typeof mockGitHub>} gh */
const writes = gh => gh.calls.filter(call => call.method !== 'GET');

/**
 * Run one stage with a recording git runner and a fresh GITHUB_OUTPUT file.
 * @param {(deps:any)=>any} fn @param {ReturnType<typeof fixture>} fx @param {ReturnType<typeof mockGitHub>} gh
 * @param {Record<string,string>} [env]
 */
async function stage(fn, fx, gh, env = {}) {
  const output = join(fx.root, `output-${++fx.seq}`);
  writeFileSync(output, '');
  /** @type {string[][]} */
  const gitCalls = [];
  const real = createGit(fx.work);
  const git = (/** @type {string[]} */ args, /** @type {any} */ options) => {
    gitCalls.push(args);
    return real(args, options);
  };
  const previous = process.exitCode;
  process.exitCode = undefined;
  try {
    const value = await fn({ fetch: gh.fetch, git, cwd: fx.work, remote: fx.remote, env: {
      GITHUB_REPOSITORY: REPO, GITHUB_SERVER_URL: 'https://github.com', GITHUB_RUN_ID: '42',
      GITHUB_REF: 'refs/heads/main', GITHUB_TOKEN: 'test-token', SYNC_RESULT: 'pass', LINKS_OUTCOME: 'success',
      LINKS_RESULT: '0', GITHUB_OUTPUT: output, ...env } });
    const outputs = Object.fromEntries(readFileSync(output, 'utf8').split('\n').filter(Boolean)
      .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
    return { value, outputs, exitCode: process.exitCode ?? 0, pushes: gitCalls.filter(args => args[0] === 'push') };
  } finally {
    process.exitCode = previous;
  }
}

/** Emulate a successful `sync --bump` in the work tree. @param {ReturnType<typeof fixture>} fx @param {string} version @param {string} commit */
function simulateBump(fx, version, commit, { summary = true } = {}) {
  const lock = JSON.parse(readFileSync(join(fx.work, 'baton.lock.json'), 'utf8'));
  const requirements = `specify-cli==${version} --hash=sha256:${'0'.repeat(64)}\n`;
  Object.assign(lock.upstreams.speckit, { version, tag: `v${version}`, commit, requirements_sha256: hex(requirements) });
  if (summary) lock['x-bump-summary'] = `Spec Kit ${version}: 1 file regenerated.`;
  write(fx.work, 'baton.lock.json', `${JSON.stringify(lock, null, 2)}\n`);
  write(fx.work, fx.target, `regenerated ${version}\r\n`);
  write(fx.work, REQUIREMENTS, requirements);
}

/** @param {ReturnType<typeof fixture>} fx */
function resetWork(fx) {
  sh(fx.work, ['-c', 'core.autocrlf=false', 'checkout', '-q', '--', '.']);
  sh(fx.work, ['clean', '-qfdx']);
}

/** @param {ReturnType<typeof fixture>} fx @param {ReturnType<typeof mockGitHub>} gh @param {Record<string,string>} [env] */
const detectStage = (fx, gh, env) => stage(detect, fx, gh, env);

/**
 * @param {ReturnType<typeof fixture>} fx @param {ReturnType<typeof mockGitHub>} gh @param {string} plan
 * @param {Record<string,string>} [env]
 */
async function packageStage(fx, gh, plan, env = {}) {
  const leg = JSON.parse(plan).plans.find((/** @type {any} */ item) => item.upstream.id === 'speckit');
  if (env.BUMP_OUTCOME !== 'failure') simulateBump(fx, leg.upstream.latest.version, leg.upstream.latest.commit);
  try {
    return await stage(packageCandidate, fx, gh, { PLAN: plan, UPSTREAM: 'speckit', BUMP_OUTCOME: 'success',
      CHECK_OUTCOME: 'success', CANDIDATE_DIR: join(fx.artifacts, 'candidate-speckit'), ...env });
  } finally {
    resetWork(fx);
  }
}

/** @param {ReturnType<typeof fixture>} fx @param {ReturnType<typeof mockGitHub>} gh @param {string} plan */
const publishStage = (fx, gh, plan) => stage(publish, fx, gh, { PLAN: plan, ARTIFACTS_DIR: fx.artifacts });

/**
 * @param {ReturnType<typeof fixture>} fx @param {ReturnType<typeof mockGitHub>} gh @param {string} plan
 * @param {string} results @param {Record<string,string>} [env]
 */
const reportStage = (fx, gh, plan, results, env = {}) => stage(report, fx, gh,
  { PLAN: plan, RESULTS: results, ARTIFACTS_DIR: fx.artifacts, DETECT_RESULT: 'success', GENERATE_RESULT: 'success',
    PUBLISH_RESULT: 'success', ...env });

/** detect → package → publish for the current mock pin. @param {ReturnType<typeof fixture>} fx @param {ReturnType<typeof mockGitHub>} gh */
async function openCandidate(fx, gh) {
  const detected = await detectStage(fx, gh);
  assert.equal(detected.outputs.generate, 'true');
  const packaged = await packageStage(fx, gh, detected.outputs.plan);
  assert.equal(packaged.value, true);
  const published = await publishStage(fx, gh, detected.outputs.plan);
  return { detected, published, results: published.outputs.results };
}

/** @param {any} plan @param {string} id */
const action = (plan, id) => JSON.parse(plan).plans.find((/** @type {any} */ item) => item.upstream.id === id).action;

/** Add a commit to the remote candidate branch. @param {ReturnType<typeof fixture>} fx @param {Record<string,string>} env */
function commitOnBranch(fx, env, name = 'note.md') {
  sh(fx.work, ['fetch', '-q', fx.remote, BRANCH]);
  sh(fx.work, ['-c', 'core.autocrlf=false', 'checkout', '-q', '-B', 'edit', 'FETCH_HEAD']);
  write(fx.work, name, 'human note\n');
  sh(fx.work, ['add', name]);
  sh(fx.work, ['-c', 'core.autocrlf=false', 'commit', '-q', '-m', 'edit'], env);
  sh(fx.work, ['push', '-q', fx.remote, `edit:refs/heads/${BRANCH}`]);
  sh(fx.work, ['-c', 'core.autocrlf=false', 'checkout', '-q', 'main']);
  return remoteRef(fx, BRANCH);
}

/** Move the default branch so it already pins the candidate. @param {ReturnType<typeof fixture>} fx */
function mergeElsewhere(fx, version = '9.9.9', commit = sha('9')) {
  simulateBump(fx, version, commit, { summary: false });
  sh(fx.work, ['add', '-A']);
  sh(fx.work, ['-c', 'core.autocrlf=false', 'commit', '-q', '-m', `bump ${version}`], humanEnv);
  sh(fx.work, ['push', '-q', fx.remote, 'main']);
}

const ALLOWED_WRITES = [
  /^POST \/repos\/dermonaco-labs\/baton\/pulls$/, /^PATCH \/repos\/dermonaco-labs\/baton\/pulls\/\d+$/,
  /^POST \/repos\/dermonaco-labs\/baton\/issues\/\d+\/comments$/, /^POST \/repos\/dermonaco-labs\/baton\/issues$/,
  /^PATCH \/repos\/dermonaco-labs\/baton\/issues\/\d+$/, /^POST \/repos\/dermonaco-labs\/baton\/labels$/
];

/** FR-016: no merge, review, ready-for-review, tag or release calls and no default-branch push. */
function assertNoForbiddenCalls(/** @type {any} */ gh, /** @type {any} */ fx, /** @type {string} */ mainBefore) {
  for (const call of writes(gh)) {
    assert.ok(ALLOWED_WRITES.some(pattern => pattern.test(`${call.method} ${call.path}`)), `${call.method} ${call.path}`);
    const keys = Object.keys(call.body ?? {});
    assert.ok(keys.every(key => !/merge|review|event/.test(key)), `${call.method} ${call.path}: ${keys}`);
    if (call.method === 'POST' && /\/pulls$/.test(call.path)) assert.equal(call.body.draft, true);
    if (call.method === 'PATCH' && /\/pulls\/\d+$/.test(call.path)) assert.equal(call.body.draft, undefined);
  }
  assert.ok(gh.calls.every((/** @type {any} */ call) => !/merge|reviews|ready_for_review|\/git\/refs|\/releases\b(?!\?)/
    .test(call.path) || call.method === 'GET'));
  assert.equal(remoteRef(fx, 'main'), mainBefore);
}

describe('upstream upgrade publish', () => {
  test('package then publish opens one draft bot candidate PR', async () => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      const mainBefore = remoteRef(fx, 'main');
      const { detected, published } = await openCandidate(fx, gh);
      assert.deepEqual(JSON.parse(detected.outputs.matrix), { include: [{ upstream: 'speckit', bump: 'speckit=9.9.9' }] });
      assert.equal(action(detected.outputs.plan, 'atv'), 'none');
      assert.equal(detected.outputs.publish, 'true');
      assert.deepEqual(JSON.parse(published.outputs.results).speckit,
        { upstream: 'speckit', stage: 'publish', outcome: 'opened', pr: 100, blocker: null });
      assert.equal(gh.prs.length, 1);
      const [pr] = gh.prs;
      assert.equal(pr.draft, true);
      assert.equal(pr.title, 'Upstream: bump speckit to 9.9.9');
      assert.equal(pr.head.ref, BRANCH);
      assert.equal(pr.base.ref, 'main');
      assert.match(pr.body, /<!-- baton-upstream-candidate upstream=speckit pin=speckit=9\.9\.9 base=[0-9a-f]{40} digest=[0-9a-f]{64} -->/);
      assert.equal(sh(fx.root, ['--git-dir', fx.remote, 'rev-list', '--count', `main..${BRANCH}`]), '1');
      const people = sh(fx.root, ['--git-dir', fx.remote, 'log', '-1', '--format=%an <%ae>|%cn <%ce>', BRANCH]);
      assert.equal(people, `${BOT_NAME} <${BOT_EMAIL}>|${BOT_NAME} <${BOT_EMAIL}>`);
      const message = sh(fx.root, ['--git-dir', fx.remote, 'log', '-1', '--format=%B', BRANCH]);
      for (const trailer of ['Baton-Upstream: speckit', 'Baton-Pin: speckit=9.9.9', `Baton-Base: ${mainBefore}`]) {
        assert.ok(message.includes(trailer), trailer);
      }
      assert.match(message, /^Baton-Content: [0-9a-f]{64}$/m);
      const blob = execFileSync('git', ['--git-dir', fx.remote, 'cat-file', 'blob', `${BRANCH}:${fx.target}`],
        { cwd: fx.root });
      assert.deepEqual(blob, Buffer.from('regenerated 9.9.9\r\n'));
      assert.equal(sh(fx.work, ['config', '--get', 'core.autocrlf']), 'true');
      assert.equal(createGit(fx.work)(['config', '--get', 'core.autocrlf']).stdout.toString().trim(), 'false');
      assert.equal(published.pushes.length, 1);
      assert.ok(published.pushes[0].every(arg => !arg.includes('test-token') &&
        !arg.includes(Buffer.from('x-access-token:test-token').toString('base64'))));
      assert.ok(gh.calls.filter(call => call.host !== 'api.github.com').every(call => call.auth === null));
      assertNoForbiddenCalls(gh, fx, /** @type {string} */ (mainBefore));
    } finally {
      fx.cleanup();
    }
  });

  test('tampered candidates are rejected before any push', async t => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      const { outputs } = await detectStage(fx, gh);
      const dir = join(fx.artifacts, 'candidate-speckit');
      const manifestPath = join(dir, 'manifest.json');
      /** @param {(m:any)=>void} edit */
      const editManifest = edit => {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        edit(manifest);
        writeFileSync(manifestPath, JSON.stringify(manifest));
      };
      /** @type {Array<[string,string,()=>boolean|void]>} */
      const cases = [
        ['tampered hash', 'E_CANDIDATE_VERIFY', () => writeFileSync(join(dir, 'files', fx.target), 'tampered\n')],
        ['symlink', 'E_CANDIDATE_VERIFY', () => {
          unlinkSync(join(dir, 'files', fx.target));
          try {
            symlinkSync(manifestPath, join(dir, 'files', fx.target));
          } catch (error) {
            if (/** @type {any} */ (error).code === 'EPERM') return false;
            throw error;
          }
        }],
        ['forbidden path', 'E_PATH_POLICY', () => {
          const bytes = Buffer.from('on: push\n');
          write(join(dir, 'files'), '.github/workflows/evil.yml', bytes);
          editManifest(m => m.changed.push({ path: '.github/workflows/evil.yml', sha256: hex(bytes), mode: '100644' }));
        }],
        ['mode', 'E_CANDIDATE_VERIFY', () => editManifest(m => { m.changed[0].mode = '120000'; })],
        ['base mismatch', 'E_CANDIDATE_VERIFY', () => editManifest(m => { m.base = sha('a'); })],
        ['bump mismatch', 'E_CANDIDATE_VERIFY', () => editManifest(m => { m.bump = 'speckit=9.9.8'; })]
      ];
      for (const [name, code, tamper] of cases) {
        await packageStage(fx, gh, outputs.plan);
        if (tamper() === false) {
          t.diagnostic(`${name}: symlinks unavailable on this platform; case skipped`);
          continue;
        }
        const before = gh.calls.length;
        const published = await publishStage(fx, gh, outputs.plan);
        const result = JSON.parse(published.outputs.results).speckit;
        assert.equal(result.blocker?.code, code, name);
        assert.equal(published.exitCode, 1, name);
        assert.equal(published.pushes.length, 0, name);
        assert.equal(gh.calls.slice(before).filter(call => call.method !== 'GET').length, 0, name);
        assert.equal(remoteRef(fx, BRANCH), null, name);
      }
    } finally {
      fx.cleanup();
    }
  });

  test('preview and non-default refs never push or write', async () => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      for (const env of [{ PREVIEW: 'true' }, { GITHUB_REF: 'refs/heads/feature' }]) {
        const detected = await detectStage(fx, gh, env);
        assert.equal(detected.outputs.publish, 'false');
        await packageStage(fx, gh, detected.outputs.plan);
        const published = await publishStage(fx, gh, detected.outputs.plan);
        assert.equal(published.pushes.length, 0);
        assert.deepEqual(JSON.parse(published.outputs.results), {});
      }
      const summary = join(fx.root, 'summary.md');
      const detected = await detectStage(fx, gh, { PREVIEW: 'true' });
      await packageStage(fx, gh, detected.outputs.plan);
      const reported = await reportStage(fx, gh, detected.outputs.plan, '{}', { PREVIEW: 'true', GITHUB_STEP_SUMMARY: summary });
      assert.match(readFileSync(summary, 'utf8'), /## Upstream watch preview[\s\S]*\| speckit \|[^\n]*preview/);
      assert.equal(reported.exitCode, 0);
      assert.equal(writes(gh).length, 0);
      assert.equal(remoteRef(fx, BRANCH), null);
    } finally {
      fx.cleanup();
    }
  });

  test('403 on PR creation maps to E_PR_PERMISSION', async () => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      gh.denyPr = true;
      const { published } = await openCandidate(fx, gh);
      const result = JSON.parse(published.outputs.results).speckit;
      assert.equal(result.outcome, 'failed');
      assert.equal(result.blocker.code, 'E_PR_PERMISSION');
      assert.equal(published.exitCode, 1);
      assert.equal(gh.prs.length, 0);
    } finally {
      fx.cleanup();
    }
  });

  test('report records a failed validation with a fenced excerpt and exits non-zero', async () => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      const log = join(fx.root, 'check.log');
      writeFileSync(log, 'npm ERR! lint failed in docs/07-updating.md\n');
      const detected = await detectStage(fx, gh);
      const packaged = await packageStage(fx, gh, detected.outputs.plan, { CHECK_OUTCOME: 'failure', CHECK_LOG: log });
      assert.equal(packaged.value, false);
      const published = await publishStage(fx, gh, detected.outputs.plan);
      assert.equal(published.pushes.length, 0);
      assert.equal(writes(gh).length, 0);
      const reported = await reportStage(fx, gh, detected.outputs.plan, published.outputs.results,
        { GENERATE_RESULT: 'failure' });
      assert.equal(reported.exitCode, 1);
      assert.equal(gh.issues.length, 1);
      const [issue] = gh.issues;
      assert.equal(issue.title, ISSUE_TITLE);
      assert.equal(issue.state, 'open');
      assert.deepEqual(issue.labels, ['upstream-bump']);
      assert.ok(issue.body.includes(ISSUE_NOTICE));
      assert.match(issue.body, /\| speckit \| 1\.0\.11 [^|]*\| 9\.9\.9 [^|]*\| failed \| E_CHECK_FAILED \(validate\) \[run\]\(https:\/\/github\.com\/dermonaco-labs\/baton\/actions\/runs\/42\) \|/);
      assert.match(issue.body, /### speckit: E_CHECK_FAILED\n\n```+text\nnpm ERR! lint failed in docs\/07-updating\.md\n```+/);
      assert.ok(gh.labels.has('upstream-bump'));
    } finally {
      fx.cleanup();
    }
  });

  test('detect blocks an upstream whose sources disagree and generates nothing', async () => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      gh.pypiBroken = true;
      const detected = await detectStage(fx, gh);
      assert.equal(action(detected.outputs.plan, 'speckit'), 'blocked');
      assert.equal(JSON.parse(detected.outputs.plan).plans[0].blocker.code, 'E_SOURCE_MISMATCH');
      assert.equal(detected.outputs.generate, 'false');
      const reported = await reportStage(fx, gh, detected.outputs.plan, '{}');
      assert.equal(reported.exitCode, 1);
      assert.equal(gh.issues[0].state, 'open');
    } finally {
      fx.cleanup();
    }
  });

  test('maintainer modules import only Node built-ins and relative modules', () => {
    for (const file of ['src/maintainer/upstream-upgrade.mjs', 'src/lib/upstream-candidates.mjs', 'src/lib/upstream.mjs']) {
      const source = readFileSync(join(sourceRoot, file), 'utf8');
      const specifiers = [...source.matchAll(/^import\s[^'"]*['"]([^'"]+)['"]/gm)].map(match => match[1]);
      assert.ok(specifiers.length > 0, file);
      for (const specifier of specifiers) assert.match(specifier, /^(node:|\.\.?\/)/, `${file}: ${specifier}`);
      assert.doesNotMatch(source, /(^|[^{\w])import\(/m, file);
    }
  });
});

describe('upstream upgrade lifecycle', () => {
  test('rerunning an unchanged candidate makes no pushes or writes', async () => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      const first = await openCandidate(fx, gh);
      await reportStage(fx, gh, first.detected.outputs.plan, first.results);
      for (const round of [1, 2]) {
        const before = gh.calls.length;
        const detected = await detectStage(fx, gh);
        assert.equal(action(detected.outputs.plan, 'speckit'), 'unchanged');
        assert.equal(detected.outputs.generate, 'false');
        const published = await publishStage(fx, gh, detected.outputs.plan);
        assert.equal(published.pushes.length, 0);
        assert.equal(JSON.parse(published.outputs.results).speckit.outcome, 'unchanged');
        await reportStage(fx, gh, detected.outputs.plan, published.outputs.results);
        const changed = gh.calls.slice(before).filter(call => call.method !== 'GET');
        assert.equal(changed.filter(call => /\/pulls/.test(call.path)).length, 0);
        if (round === 2) assert.equal(changed.length, 0);
      }
      assert.equal(gh.prs.length, 1);
      assert.equal(gh.issues[0].state, 'open');
    } finally {
      fx.cleanup();
    }
  });

  test('a human commit on the candidate branch prevents pushes', async () => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      await openCandidate(fx, gh);
      const edited = commitOnBranch(fx, humanEnv);
      gh.speckit = '9.9.10';
      gh.speckitCommit = sha('8');
      const before = gh.calls.length;
      const detected = await detectStage(fx, gh);
      assert.equal(action(detected.outputs.plan, 'speckit'), 'waiting-human');
      assert.equal(detected.outputs.generate, 'false');
      const published = await publishStage(fx, gh, detected.outputs.plan);
      assert.equal(published.pushes.length, 0);
      assert.equal(gh.calls.slice(before).filter(call => call.method !== 'GET').length, 0);
      assert.equal(remoteRef(fx, BRANCH), edited);
      await reportStage(fx, gh, detected.outputs.plan, published.outputs.results);
      assert.equal(gh.issues[0].state, 'open');
      assert.match(gh.issues[0].body, /\| speckit \|[^\n]*waiting-human \[#100\]/);
    } finally {
      fx.cleanup();
    }
  });

  test('a newer pin updates the same bot PR with a lease-protected push', async () => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      await openCandidate(fx, gh);
      const old = remoteRef(fx, BRANCH);
      gh.speckit = '9.9.10';
      gh.speckitCommit = sha('8');
      const { detected, published } = await openCandidate(fx, gh);
      assert.equal(action(detected.outputs.plan, 'speckit'), 'generate');
      assert.deepEqual(JSON.parse(published.outputs.results).speckit,
        { upstream: 'speckit', stage: 'publish', outcome: 'updated', pr: 100, blocker: null });
      assert.ok(published.pushes[0].includes(`--force-with-lease=refs/heads/${BRANCH}:${old}`));
      assert.equal(gh.prs.length, 1);
      assert.equal(gh.prs[0].title, 'Upstream: bump speckit to 9.9.10');
      assert.match(gh.prs[0].body, /pin=speckit=9\.9\.10 /);
      assert.equal(sh(fx.root, ['--git-dir', fx.remote, 'rev-list', '--count', `main..${BRANCH}`]), '1');
    } finally {
      fx.cleanup();
    }
  });

  test('a branch moved after detection fails with E_LEASE', async () => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      await openCandidate(fx, gh);
      gh.speckit = '9.9.10';
      gh.speckitCommit = sha('8');
      const detected = await detectStage(fx, gh);
      await packageStage(fx, gh, detected.outputs.plan);
      const moved = commitOnBranch(fx, botEnv, 'concurrent.md');
      const before = gh.calls.length;
      const published = await publishStage(fx, gh, detected.outputs.plan);
      assert.equal(JSON.parse(published.outputs.results).speckit.blocker.code, 'E_LEASE');
      assert.equal(published.exitCode, 1);
      assert.equal(remoteRef(fx, BRANCH), moved);
      assert.equal(gh.calls.slice(before).filter(call => call.method !== 'GET').length, 0);
    } finally {
      fx.cleanup();
    }
  });

  test('an obsolete bot PR is marked, commented and closed in order and the branch kept', async () => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      const first = await openCandidate(fx, gh);
      await reportStage(fx, gh, first.detected.outputs.plan, first.results);
      const branchSha = remoteRef(fx, BRANCH);
      mergeElsewhere(fx);
      const before = gh.calls.length;
      const detected = await detectStage(fx, gh);
      assert.equal(action(detected.outputs.plan, 'speckit'), 'close-obsolete');
      const published = await publishStage(fx, gh, detected.outputs.plan);
      assert.equal(JSON.parse(published.outputs.results).speckit.outcome, 'closed-obsolete');
      const sequence = gh.calls.slice(before).filter(call => call.method !== 'GET');
      assert.deepEqual(sequence.map(call => `${call.method} ${call.path}`), [
        `PATCH /repos/${REPO}/pulls/100`, `POST /repos/${REPO}/issues/100/comments`, `PATCH /repos/${REPO}/pulls/100`
      ]);
      assert.match(sequence[0].body.body, / closed=obsolete -->/);
      assert.match(gh.comments[0].body, /obsolete[\s\S]*branch is kept/);
      assert.deepEqual(sequence[2].body, { state: 'closed' });
      assert.equal(remoteRef(fx, BRANCH), branchSha);
      assert.equal(published.pushes.length, 0);
      await reportStage(fx, gh, detected.outputs.plan, published.outputs.results);
      assert.equal(gh.issues[0].state, 'closed');
      assert.match(gh.issues[0].body, /All pinned upstreams and external documentation links verified\. \[Workflow run\]/);
      const again = await detectStage(fx, gh);
      assert.equal(action(again.outputs.plan, 'speckit'), 'none');
    } finally {
      fx.cleanup();
    }
  });

  test('failed legs and human-edited obsolete PRs receive no writes', async () => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      const detected = await detectStage(fx, gh);
      const log = join(fx.root, 'bump.log');
      writeFileSync(log, 'resolution failed\n');
      const packaged = await packageStage(fx, gh, detected.outputs.plan, { BUMP_OUTCOME: 'failure', BUMP_LOG: log });
      assert.equal(packaged.value, false);
      const result = JSON.parse(readFileSync(join(fx.artifacts, 'candidate-speckit', 'result.json'), 'utf8'));
      assert.equal(result.blocker.code, 'E_UPSTREAM_VERIFY');
      assert.equal(result.blocker.stage, 'generate');
      assert.equal(existsSync(join(fx.artifacts, 'candidate-speckit', 'manifest.json')), false);
      const skipped = await publishStage(fx, gh, detected.outputs.plan);
      assert.equal(skipped.pushes.length, 0);
      assert.equal(writes(gh).length, 0);
      await openCandidate(fx, gh);
      const edited = commitOnBranch(fx, humanEnv);
      mergeElsewhere(fx);
      const before = gh.calls.length;
      const obsolete = await detectStage(fx, gh);
      assert.equal(action(obsolete.outputs.plan, 'speckit'), 'obsolete-human');
      const published = await publishStage(fx, gh, obsolete.outputs.plan);
      assert.equal(published.pushes.length, 0);
      assert.equal(gh.calls.slice(before).filter(call => call.method !== 'GET').length, 0);
      assert.equal(gh.prs[0].state, 'open');
      assert.equal(remoteRef(fx, BRANCH), edited);
    } finally {
      fx.cleanup();
    }
  });

  test('the tracking issue stays open while candidates need humans and closes when current', async () => {
    const fx = fixture();
    try {
      const gh = mockGitHub(fx);
      const first = await openCandidate(fx, gh);
      await reportStage(fx, gh, first.detected.outputs.plan, first.results);
      assert.equal(gh.issues[0].state, 'open');
      assert.match(gh.issues[0].body, /\| speckit \|[^\n]*opened \[#100\]/);
      gh.prs[0].state = 'closed';
      const suppressed = await detectStage(fx, gh);
      assert.equal(action(suppressed.outputs.plan, 'speckit'), 'suppressed');
      assert.equal(suppressed.outputs.generate, 'false');
      const reported = await reportStage(fx, gh, suppressed.outputs.plan, '{}');
      assert.equal(reported.exitCode, 0);
      assert.equal(gh.issues[0].state, 'open');
      gh.speckit = '1.0.11';
      gh.speckitCommit = fx.lock.upstreams.speckit.commit;
      const current = await detectStage(fx, gh);
      assert.equal(action(current.outputs.plan, 'speckit'), 'none');
      const closed = await reportStage(fx, gh, current.outputs.plan, '{}');
      assert.equal(closed.exitCode, 0);
      assert.equal(gh.issues[0].state, 'closed');
      assert.equal(gh.issues.length, 1);
    } finally {
      fx.cleanup();
    }
  });
});
