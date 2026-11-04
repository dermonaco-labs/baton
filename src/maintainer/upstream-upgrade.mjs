#!/usr/bin/env node
// Maintainer-only entry point for .github/workflows/upstream-watch.yml. Uses Node built-ins and
// ../lib/upstream-candidates.mjs only; never imported by the Baton CLI and never executes artifact content.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOT_EMAIL, BOT_NAME, CHECKS, ISSUE_LABEL, ISSUE_TITLE, UPSTREAMS, branchFor, buildRunUrl, classifyBranch,
  commitMessage, contentTrailer, currentPin, isSha, makePin, parseMarker, planUpstream, policyOf, prTitle, renderIssue,
  renderMarker, renderPrBody, repoSlug, selectAtv, selectSpeckit, trustedResult, verifyCandidate
} from '../lib/upstream-candidates.mjs';
import { ATV_REPO, SPECKIT_REPO, UpstreamError } from '../lib/upstream.mjs';

/** @typedef {import('../lib/upstream-candidates.mjs').UpstreamPlan} UpstreamPlan */
/** @typedef {import('../lib/upstream-candidates.mjs').CandidateResult} CandidateResult */
/** @typedef {import('../lib/upstream-candidates.mjs').UpstreamId} UpstreamId */
/**
 * @typedef {{schema:1,repo:string,defaultBranch:string,base:string,publish:boolean,preview:boolean,runUrl:string,
 *   verification:{sync:string,links:string,syncExcerpt:string,linksExcerpt:string},plans:UpstreamPlan[]}} WatchPlan
 */
/**
 * @typedef {(args:string[], options?:{env?:Record<string,string>,input?:string|Buffer}) =>
 *   {status:number|null,stdout:Buffer,stderr:Buffer}} GitRunner
 */
/**
 * @typedef {{fetch:typeof fetch,git:GitRunner,env:Record<string,string|undefined>,cwd:string,remote?:string,
 *   log?:(line:string)=>void}} Deps
 */
/** @typedef {(path:string, options?:{method?:string,body?:unknown,allow404?:boolean}) => Promise<any>} Api */

const API = 'https://api.github.com';
const SPECKIT_API = `/repos/${repoSlug(SPECKIT_REPO)}`;
const ATV_API = `/repos/${repoSlug(ATV_REPO)}`;
const EXCERPT = 20000;
const ZERO = '0'.repeat(40);
const PR_PERMISSION = 'GitHub Actions is not permitted to create or approve pull requests';

/** @param {string} code @param {string} message */
const fail = (code, message) => new UpstreamError(code, message);

/** @param {string} cwd @returns {GitRunner} */
export function createGit(cwd) {
  return (args, { env = {}, input } = {}) => {
    const result = spawnSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.hooksPath=/dev/null', ...args],
      { cwd, env: { ...process.env, ...env }, input, maxBuffer: 256 * 1024 * 1024 });
    if (result.error) throw result.error;
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  };
}

/** @param {GitRunner} git @param {string[]} args @param {{env?:Record<string,string>,input?:string|Buffer}} [options] */
function gitText(git, args, options) {
  const result = git(args, options);
  if (result.status !== 0) throw fail('E_GIT', `git ${args[0]} failed: ${result.stderr.toString('utf8').trim()}`);
  return result.stdout.toString('utf8').trim();
}

/** Every path tracked by the trusted base commit, read from git objects. @param {GitRunner} git @param {string} base */
function baseTreePaths(git, base) {
  return new Set(gitText(git, ['ls-tree', '-r', '-z', '--name-only', base]).split('\0').filter(Boolean));
}

/** The token is only ever sent to the GitHub API origin. @param {Deps} deps @returns {Api} */
function github(deps) {
  const token = deps.env.GITHUB_TOKEN;
  return async (path, { method = 'GET', body, allow404 = false } = {}) => {
    const response = await deps.fetch(`${API}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'baton-upstream-watch', ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      if (response.status === 403 && text.includes(PR_PERMISSION)) {
        throw fail('E_PR_PERMISSION',
          `${PR_PERMISSION}; a maintainer must enable the repository setting before the watcher can open draft PRs`);
      }
      throw fail('E_GITHUB_API', `${method} ${path}: HTTP ${response.status}`);
    }
    return response.status === 204 ? null : response.json();
  };
}

/** Unauthenticated read of a fixed public source. @param {Deps} deps @param {string} url */
async function publicJson(deps, url) {
  const response = await deps.fetch(url, { headers: { 'User-Agent': 'baton-upstream-watch' } });
  if (!response.ok) throw fail('E_UPSTREAM_VERIFY', `${url}: HTTP ${response.status}`);
  return response.json();
}

/** @param {Record<string,string|undefined>} env @param {string} name @param {string} value */
function setOutput(env, name, value) {
  if (/[\r\n]/.test(value)) throw fail('E_OUTPUT', `${name} output must be a single line`);
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

/** @param {string|undefined} path */
function tail(path) {
  if (!path || !existsSync(path)) return '';
  const text = readFileSync(path, 'utf8');
  return text.length > EXCERPT ? text.slice(-EXCERPT) : text;
}

/** @param {unknown} error @param {string} [fallback] */
function codeOf(error, fallback = 'E_UPSTREAM_VERIFY') {
  const code = /** @type {any} */ (error)?.code;
  return typeof code === 'string' && /^E_[A-Z_]{1,40}$/.test(code) ? code : fallback;
}

/** @param {unknown} error */
const messageOf = error => error instanceof Error ? error.message : String(error);

/** @param {Record<string,string|undefined>} env */
function repoOf(env) {
  const repo = env.GITHUB_REPOSITORY ?? '';
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw fail('E_SOURCE_FORMAT', 'Invalid GITHUB_REPOSITORY');
  return repo;
}

/** Resolve a release tag to its commit, dereferencing annotated tags. @param {Api} api @param {string} repoApi @param {string} tag */
async function tagCommit(api, repoApi, tag) {
  let object = (await api(`${repoApi}/git/ref/tags/${tag}`))?.object;
  for (let depth = 0; object?.type === 'tag' && depth < 3; depth++) {
    object = (await api(`${repoApi}/git/tags/${object.sha}`))?.object;
  }
  if (object?.type !== 'commit' || !isSha(object.sha)) {
    throw fail('E_SOURCE_FORMAT', `${tag} does not resolve to a commit`);
  }
  return object.sha;
}

/** @param {UpstreamId} id @param {any} entry @param {Api} api @param {Deps} deps */
async function detectLatest(id, entry, api, deps) {
  const policy = policyOf(id, entry);
  const current = currentPin(id, entry);
  if (id === 'speckit') {
    const pypi = await publicJson(deps, 'https://pypi.org/pypi/specify-cli/json');
    const releases = await api(`${SPECKIT_API}/releases?per_page=50`);
    const version = selectSpeckit({ pypi, releases });
    const latest = version === current.version ? current :
      makePin('speckit', { version, commit: await tagCommit(api, SPECKIT_API, `v${version}`), tree: null });
    return { policy, current, latest, info: null };
  }
  const head = await api(`${ATV_API}/commits/main`);
  const releases = policy === 'release' ? await api(`${ATV_API}/releases?per_page=50`) : [];
  const { target, info } = selectAtv({ policy, current, releases,
    head: { commit: head?.sha, tree: head?.commit?.tree?.sha } });
  if (target.kind === 'commit') {
    return { policy, current, latest: makePin('atv', { version: null, commit: target.commit, tree: target.tree }), info };
  }
  if (target.version === current.version) return { policy, current, latest: current, info };
  const commit = await tagCommit(api, ATV_API, `v${target.version}`);
  const tree = (await api(`${ATV_API}/git/commits/${commit}`))?.tree?.sha;
  return { policy, current, latest: makePin('atv', { version: target.version, commit, tree }), info };
}

/** Candidate PRs and branch ownership for one upstream. @param {UpstreamId} id @param {string} repo @param {string} base @param {Api} api */
async function candidateState(id, repo, base, api) {
  const branch = branchFor(id);
  const owner = repo.split('/')[0];
  const pulls = await api(`/repos/${repo}/pulls?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=100`);
  const prs = (Array.isArray(pulls) ? pulls : [])
    .filter(pull => pull?.head?.ref === branch && Number.isSafeInteger(pull.number))
    .map(pull => {
      const marker = parseMarker(pull.body);
      return {
        number: /** @type {number} */ (pull.number),
        state: pull.state === 'open' ? /** @type {const} */ ('open') : /** @type {const} */ ('closed'),
        merged: Boolean(pull.merged_at),
        marker: marker?.upstream === id ? marker : null
      };
    }).sort((a, b) => b.number - a.number);
  const ref = await api(`/repos/${repo}/git/ref/heads/${branch}`, { allow404: true });
  if (!ref) return { prs, branch: null };
  const sha = ref?.object?.sha;
  if (!isSha(sha)) throw fail('E_SOURCE_FORMAT', `${branch}: invalid ref`);
  const compare = await api(`/repos/${repo}/compare/${base}...${sha}`);
  const commits = Array.isArray(compare?.commits) ? compare.commits : [];
  const complete = compare?.total_commits === commits.length;
  return { prs, branch: { sha, botOnly: complete && classifyBranch(commits),
    content: contentTrailer(commits.at(-1)?.commit?.message) } };
}

/** Read-only detection; its plan output is the trusted input of publish and report. @param {Deps} deps */
export async function detect(deps) {
  const { env } = deps;
  const repo = repoOf(env);
  const runUrl = buildRunUrl(env);
  const api = github(deps);
  const base = gitText(deps.git, ['rev-parse', 'HEAD']);
  const lock = JSON.parse(readFileSync(join(deps.cwd, 'baton.lock.json'), 'utf8'));
  const defaultBranch = (await api(`/repos/${repo}`))?.default_branch;
  if (typeof defaultBranch !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(defaultBranch)) {
    throw fail('E_SOURCE_FORMAT', 'Invalid default branch');
  }
  const preview = env.PREVIEW === 'true';
  const publish = !preview && env.GITHUB_REF === `refs/heads/${defaultBranch}`;
  const plans = [];
  for (const id of UPSTREAMS) {
    /** @type {any} */
    let found = { policy: null, current: null, latest: null, info: null };
    let blocker = null;
    /** @type {{prs:any[],branch:any}} */
    let state = { prs: [], branch: null };
    try {
      found = await detectLatest(id, lock.upstreams?.[id], api, deps);
      state = await candidateState(id, repo, base, api);
    } catch (error) {
      blocker = { code: codeOf(error), stage: 'detect', excerpt: messageOf(error), run: runUrl };
    }
    plans.push(planUpstream({ id, base, publish, ...found, blocker, ...state }));
  }
  const links = env.LINKS_OUTCOME === 'success' && env.LINKS_RESULT === '0' ? 'pass' : 'fail';
  const sync = env.SYNC_RESULT === 'pass' ? 'pass' : 'fail';
  /** @type {WatchPlan} */
  const plan = {
    schema: 1, repo, defaultBranch, base, publish, preview, runUrl,
    verification: {
      sync, links,
      syncExcerpt: sync === 'pass' ? '' : tail(env.SYNC_LOG) || 'Step did not complete.',
      linksExcerpt: links === 'pass' ? '' : tail(env.LINKS_REPORT) || `See the workflow run for the link-check error: ${runUrl}`
    },
    plans
  };
  const generate = plans.filter(item => item.action === 'generate');
  setOutput(env, 'plan', JSON.stringify(plan));
  setOutput(env, 'base', base);
  setOutput(env, 'publish', String(publish));
  setOutput(env, 'generate', String(generate.length > 0));
  setOutput(env, 'matrix', JSON.stringify({ include: generate.map(item => ({ upstream: item.upstream.id,
    bump: /** @type {any} */ (item.upstream.latest).bump })) }));
  for (const item of plans) deps.log?.(`${item.upstream.id}: ${item.action}${item.blocker ? ` ${item.blocker.code}` : ''}`);
  return plan;
}

/** @param {string|undefined} text @returns {WatchPlan} */
function parsePlan(text) {
  let plan;
  try {
    plan = JSON.parse(text ?? '');
  } catch {
    throw fail('E_PLAN', 'Invalid watch plan');
  }
  if (plan?.schema !== 1 || !Array.isArray(plan.plans) || !isSha(plan.base) ||
    typeof plan.repo !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(plan.repo)) {
    throw fail('E_PLAN', 'Invalid watch plan');
  }
  return plan;
}

/** @param {Buffer} bytes */
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** @param {Buffer} buffer */
const nulList = buffer => buffer.toString('utf8').split('\0').filter(Boolean);

/**
 * Package the regenerated working tree of one generate leg. Runs in the untrusted job; publish
 * re-verifies everything it writes, so this output is advisory only.
 * @param {Deps} deps @returns {boolean}
 */
export function packageCandidate(deps) {
  const { env, cwd, git } = deps;
  const plan = parsePlan(env.PLAN);
  const id = /** @type {UpstreamId} */ (env.UPSTREAM);
  const entry = plan.plans.find(item => item.upstream.id === id);
  if (!UPSTREAMS.includes(id) || !entry?.upstream.latest) throw fail('E_PLAN', `No plan for ${env.UPSTREAM}`);
  const out = env.CANDIDATE_DIR ?? '';
  if (!out) throw fail('E_PLAN', 'CANDIDATE_DIR is required');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  /** @param {CandidateResult} result */
  const writeResult = result => writeFileSync(join(out, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  /** @param {string} code @param {string} stage @param {string} excerpt */
  const blocked = (code, stage, excerpt) => {
    writeResult({ upstream: id, stage, outcome: 'failed', pr: null, blocker: { code, stage, excerpt, run: plan.runUrl } });
    return false;
  };
  if (env.BUMP_OUTCOME !== 'success') {
    return blocked('E_UPSTREAM_VERIFY', 'generate', tail(env.BUMP_LOG) || 'sync --bump did not complete');
  }
  if (env.CHECK_OUTCOME !== 'success') {
    return blocked('E_CHECK_FAILED', 'validate', tail(env.CHECK_LOG) || 'npm run check did not complete');
  }
  try {
    if (gitText(git, ['rev-parse', 'HEAD']) !== plan.base) throw fail('E_CANDIDATE_VERIFY', 'checkout is not the planned base');
    const status = nulList(git(['diff', '--name-status', '--no-renames', '-z', plan.base]).stdout);
    const changed = new Set(nulList(git(['ls-files', '-o', '--exclude-standard', '-z']).stdout));
    /** @type {Set<string>} */
    const deleted = new Set();
    for (let index = 0; index + 1 < status.length; index += 2) {
      (status[index] === 'D' ? deleted : changed).add(status[index + 1]);
    }
    /** @type {Map<string,{bytes:Buffer,symlink:boolean}>} */
    const files = new Map();
    const entries = [];
    for (const path of [...changed].sort()) {
      const stat = lstatSync(join(cwd, ...path.split('/')));
      if (!stat.isFile()) throw fail('E_PATH_POLICY', `${path} is not a regular file`);
      const bytes = readFileSync(join(cwd, ...path.split('/')));
      files.set(path, { bytes, symlink: false });
      entries.push({ path, sha256: sha256(bytes), mode: stat.mode & 0o111 ? '100755' : '100644' });
    }
    const lockBytes = files.get('baton.lock.json')?.bytes;
    const latest = entry.upstream.latest;
    const manifest = {
      schema: /** @type {const} */ (1), upstream: id, bump: latest.bump,
      pin: { version: latest.version, commit: latest.commit, tree: latest.tree },
      base: plan.base, changed: entries, deleted: [...deleted].sort(),
      summary: lockBytes ? String(JSON.parse(lockBytes.toString('utf8'))['x-bump-summary'] ?? '') : '',
      checks: CHECKS.map(check => ({ ...check }))
    };
    const baseLock = JSON.parse(gitText(git, ['show', `${plan.base}:baton.lock.json`]));
    const { digest } = verifyCandidate({ plan: entry, manifest, files, baseLock, baseTree: baseTreePaths(git, plan.base) });
    for (const [path, { bytes }] of files) {
      const target = join(out, 'files', ...path.split('/'));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, bytes);
    }
    writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    writeResult({ upstream: id, stage: 'validate', outcome: null, pr: null, blocker: null });
    setOutput(env, 'digest', digest);
    return true;
  } catch (error) {
    return blocked(codeOf(error, 'E_CANDIDATE_VERIFY'), 'validate', messageOf(error));
  }
}

/** Read an untrusted artifact tree without following links. @param {string} root */
function readArtifact(root) {
  /** @type {Map<string,{bytes:Buffer,symlink:boolean}>} */
  const files = new Map();
  const filesRoot = join(root, 'files');
  /** @param {string} directory */
  const walk = directory => {
    for (const name of readdirSync(directory)) {
      const full = join(directory, name);
      const stat = lstatSync(full);
      if (stat.isDirectory()) walk(full);
      else files.set(relative(filesRoot, full).split(sep).join('/'),
        { bytes: stat.isFile() ? readFileSync(full) : Buffer.alloc(0), symlink: !stat.isFile() });
    }
  };
  if (existsSync(filesRoot) && lstatSync(filesRoot).isDirectory()) walk(filesRoot);
  const manifestPath = join(root, 'manifest.json');
  if (!existsSync(manifestPath) || !lstatSync(manifestPath).isFile()) return null;
  try {
    return { manifest: JSON.parse(readFileSync(manifestPath, 'utf8')), files };
  } catch {
    throw fail('E_CANDIDATE_VERIFY', 'manifest.json is not valid JSON');
  }
}

/** @param {string} root */
function readResult(root) {
  const path = join(root, 'result.json');
  if (!existsSync(path) || !lstatSync(path).isFile()) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Build the single bot commit on base from verified blobs, without a working tree or hooks.
 * @param {GitRunner} git @param {UpstreamPlan} plan @param {any} manifest
 * @param {Map<string,{bytes:Buffer}>} files @param {string} digest
 */
function buildCommit(git, plan, manifest, files, digest) {
  const indexDir = mkdtempSync(join(tmpdir(), 'baton-upgrade-'));
  const env = { GIT_INDEX_FILE: join(indexDir, 'index') };
  try {
    gitText(git, ['read-tree', plan.base], { env });
    const lines = [];
    for (const item of manifest.changed) {
      const blob = gitText(git, ['hash-object', '-w', '--no-filters', '--stdin'], { input: files.get(item.path)?.bytes });
      lines.push(`${item.mode} ${blob}\t${item.path}`);
    }
    for (const path of manifest.deleted) lines.push(`0 ${ZERO}\t${path}`);
    gitText(git, ['update-index', '--index-info'], { env, input: `${lines.join('\n')}\n` });
    const tree = gitText(git, ['write-tree'], { env });
    return gitText(git, ['commit-tree', tree, '-p', plan.base, '-F', '-'], {
      input: commitMessage(plan, digest),
      env: { GIT_AUTHOR_NAME: BOT_NAME, GIT_AUTHOR_EMAIL: BOT_EMAIL, GIT_COMMITTER_NAME: BOT_NAME,
        GIT_COMMITTER_EMAIL: BOT_EMAIL }
    });
  } finally {
    rmSync(indexDir, { recursive: true, force: true });
  }
}

/**
 * Lease-protected push; the token travels in process-scoped git config, never in argv.
 * @param {Deps} deps @param {string} repo @param {string} branch @param {string} commit @param {string} observed
 */
function push(deps, repo, branch, commit, observed) {
  const auth = Buffer.from(`x-access-token:${deps.env.GITHUB_TOKEN ?? ''}`).toString('base64');
  const remote = deps.remote ?? `https://github.com/${repo}.git`;
  const result = deps.git(['push', '--porcelain', `--force-with-lease=refs/heads/${branch}:${observed}`, remote,
    `${commit}:refs/heads/${branch}`], {
    env: { GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
      GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${auth}` }
  });
  if (result.status !== 0) {
    const text = `${result.stdout.toString('utf8')}${result.stderr.toString('utf8')}`;
    const remote = /\[remote rejected\]\s*(?:\(([^)\r\n]{0,200})\))?/.exec(text);
    if (remote) throw fail('E_PUSH', `remote rejected the push to ${branch}: ${remote[1] ?? 'no reason given'}`);
    if (/stale info|\[rejected\]|fetch first|non-fast-forward/.test(text)) {
      throw fail('E_LEASE', `${branch} changed since detection; nothing was overwritten`);
    }
    throw fail('E_PUSH', `push to ${branch} failed`);
  }
}

/**
 * Close a bot-only obsolete candidate in a fixed order. The branch is never deleted.
 * @param {Api} api @param {WatchPlan} plan @param {UpstreamPlan} item @param {number} number
 */
async function closeObsolete(api, plan, item, number) {
  const pull = await api(`/repos/${plan.repo}/pulls/${number}`);
  if (pull?.state !== 'open' || pull?.head?.sha !== item.branch?.sha) return null;
  const marker = parseMarker(pull.body);
  if (!marker) throw fail('E_PLAN', `#${number} lost its candidate marker`);
  const body = String(pull.body).replace(renderMarker(marker), renderMarker({ ...marker, closed: 'obsolete' }));
  await api(`/repos/${plan.repo}/pulls/${number}`, { method: 'PATCH', body: { body } });
  const pin = /** @type {any} */ (item.upstream.current).bump;
  await api(`/repos/${plan.repo}/issues/${number}/comments`, { method: 'POST', body: {
    body: `Closing as obsolete: \`${plan.defaultBranch}\` already pins \`${pin}\`, which is the same as or newer ` +
      'than this candidate. The branch is kept.'
  } });
  await api(`/repos/${plan.repo}/pulls/${number}`, { method: 'PATCH', body: { state: 'closed' } });
  return 'closed-obsolete';
}

/**
 * Publish verified candidates and close obsolete bot-only PRs. Never merges, reviews, tags or releases.
 * @param {Deps} deps @returns {Promise<Record<string,CandidateResult>>}
 */
export async function publish(deps) {
  const { env } = deps;
  const plan = parsePlan(env.PLAN);
  const api = github(deps);
  /** @type {Record<string,CandidateResult>} */
  const results = {};
  if (!plan.publish) {
    setOutput(env, 'results', JSON.stringify(results));
    return results;
  }
  if (gitText(deps.git, ['rev-parse', 'HEAD']) !== plan.base) throw fail('E_PLAN', 'checkout is not the planned base');
  const baseLock = JSON.parse(gitText(deps.git, ['show', `${plan.base}:baton.lock.json`]));
  const baseTree = baseTreePaths(deps.git, plan.base);
  for (const item of plan.plans) {
    const id = item.upstream.id;
    /** @param {string|null} outcome @param {number|null} [pr] */
    const record = (outcome, pr = item.pr?.number ?? null) => {
      results[id] = { upstream: id, stage: 'publish', outcome, pr, blocker: null };
    };
    try {
      if (item.action === 'close-obsolete' && item.pr) {
        record(await closeObsolete(api, plan, item, item.pr.number));
        continue;
      }
      if (item.action === 'unchanged') {
        record('unchanged');
        continue;
      }
      if (item.action !== 'generate') continue;
      const root = join(env.ARTIFACTS_DIR ?? '', id);
      const reported = existsSync(root) ? readResult(root) : null;
      if (!reported || reported.blocker) continue;
      const artifact = readArtifact(root);
      if (!artifact) continue;
      const { digest, manifest } = verifyCandidate({ plan: item, manifest: artifact.manifest, files: artifact.files,
        baseLock, baseTree });
      const attested = env[`DIGEST_${id.toUpperCase()}`];
      if (!attested) {
        throw fail('E_CANDIDATE_VERIFY', `${id} has no digest attested by the generate job (DIGEST_${id.toUpperCase()} is empty)`);
      }
      if (attested !== digest) {
        throw fail('E_CANDIDATE_VERIFY', `${id} artifact does not match the digest attested by the generate job`);
      }
      const marker = item.pr?.marker;
      if (marker && marker.digest === digest && marker.base === plan.base && marker.pin === manifest.bump &&
        item.branch?.content === digest) {
        record('unchanged');
        continue;
      }
      if (item.pr) {
        const current = await api(`/repos/${plan.repo}/pulls/${item.pr.number}`);
        if (current?.state !== 'open' || current?.head?.sha !== item.branch?.sha) {
          throw fail('E_PR_CHANGED', `#${item.pr.number} was closed or changed since detection; nothing was pushed`);
        }
      } else {
        const owner = plan.repo.split('/')[0];
        const head = encodeURIComponent(`${owner}:${branchFor(id)}`);
        const opened = await api(`/repos/${plan.repo}/pulls?state=open&head=${head}&per_page=100`);
        const found = (Array.isArray(opened) ? opened : [])
          .find(pull => pull?.state === 'open' && pull?.head?.ref === branchFor(id));
        if (found) {
          throw fail('E_PR_CHANGED', `#${found.number} was opened on ${branchFor(id)} since detection; nothing was pushed`);
        }
      }
      const branch = branchFor(id);
      const commit = buildCommit(deps.git, item, manifest, artifact.files, digest);
      push(deps, plan.repo, branch, commit, item.branch?.sha ?? '');
      const body = renderPrBody({ plan: item, manifest, digest, runUrl: plan.runUrl });
      if (item.pr) {
        await api(`/repos/${plan.repo}/pulls/${item.pr.number}`, { method: 'PATCH', body: { title: prTitle(item), body } });
        record('updated');
      } else {
        const created = await api(`/repos/${plan.repo}/pulls`, { method: 'POST', body: {
          title: prTitle(item), head: branch, base: plan.defaultBranch, body, draft: true, maintainer_can_modify: false
        } });
        record('opened', Number.isSafeInteger(created?.number) ? created.number : null);
      }
    } catch (error) {
      results[id] = { upstream: id, stage: 'publish', outcome: 'failed', pr: item.pr?.number ?? null,
        blocker: { code: codeOf(error, 'E_PUBLISH'), stage: 'publish', excerpt: messageOf(error), run: plan.runUrl } };
    }
  }
  setOutput(env, 'results', JSON.stringify(results));
  if (Object.values(results).some(result => result.blocker)) process.exitCode = 1;
  return results;
}

/** @param {string} repo @param {string} runUrl @param {boolean} preview @returns {WatchPlan} */
function failedPlan(repo, runUrl, preview) {
  const blocker = { code: 'E_UPSTREAM_VERIFY', stage: 'detect', excerpt: 'Detection did not complete.', run: runUrl };
  return {
    schema: 1, repo, defaultBranch: '', base: ZERO, publish: false, preview, runUrl,
    verification: { sync: 'fail', links: 'fail', syncExcerpt: 'Detection did not complete.',
      linksExcerpt: 'Detection did not complete.' },
    plans: UPSTREAMS.map(id => planUpstream({ id, base: ZERO, publish: false, policy: null, current: null, latest: null,
      blocker, prs: [], branch: null, info: null }))
  };
}

/**
 * Merge trusted publish results with validated artifact results for each planned upstream.
 * @param {WatchPlan} plan @param {Record<string,string|undefined>} env @param {string} runUrl
 */
function collectResults(plan, env, runUrl) {
  /** @type {Record<string,any>} */
  let published = {};
  try {
    published = JSON.parse(env.RESULTS || '{}') ?? {};
  } catch {
    published = {};
  }
  /** @type {Record<string,CandidateResult|null>} */
  const results = {};
  for (const item of plan.plans) {
    const id = item.upstream.id;
    const fromPublish = trustedResult(published[id], runUrl);
    if (item.action !== 'generate' || fromPublish?.blocker || (fromPublish && fromPublish.outcome !== null)) {
      results[id] = fromPublish;
      continue;
    }
    const fromArtifact = env.ARTIFACTS_DIR ?
      trustedResult(readResult(join(env.ARTIFACTS_DIR, id)), runUrl) : null;
    const pr = item.pr?.number ?? null;
    if (fromArtifact?.blocker) results[id] = { ...fromArtifact, pr };
    else if (!fromArtifact) {
      results[id] = { upstream: id, stage: 'generate', outcome: 'failed', pr, blocker: { code: 'E_CHECK_FAILED',
        stage: 'generate', excerpt: 'Candidate generation did not complete.', run: runUrl } };
    } else if (!plan.publish) results[id] = { ...fromArtifact, outcome: 'preview', pr };
    else {
      results[id] = { upstream: id, stage: 'publish', outcome: 'failed', pr, blocker: { code: 'E_PUBLISH',
        stage: 'publish', excerpt: 'Publishing did not complete.', run: runUrl } };
    }
  }
  return results;
}

/**
 * Update the single tracking issue, or only the step summary in preview mode.
 * @param {Deps} deps @returns {Promise<{open:boolean,failed:boolean,body:string}>}
 */
export async function report(deps) {
  const { env } = deps;
  const repo = repoOf(env);
  const runUrl = buildRunUrl(env);
  const previewInput = env.PREVIEW === 'true';
  /** @type {WatchPlan} */
  let plan;
  try {
    plan = parsePlan(env.PLAN);
  } catch {
    plan = failedPlan(repo, runUrl, previewInput);
  }
  const results = collectResults(plan, env, runUrl);
  const { body, open } = renderIssue({ plans: plan.plans, results, verification: plan.verification,
    server: /** @type {string} */ (env.GITHUB_SERVER_URL), repo, runUrl });
  const jobFailed = ['DETECT_RESULT', 'GENERATE_RESULT', 'PUBLISH_RESULT'].some(name => env[name] === 'failure');
  const failed = jobFailed || plan.verification.sync !== 'pass' || plan.verification.links !== 'pass' ||
    plan.plans.some(item => item.blocker) || Object.values(results).some(result => result?.blocker);
  if (plan.preview || previewInput) {
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `## Upstream watch preview\n\n${body}\n`);
  } else {
    await updateIssue(github(deps), repo, body, open, runUrl);
  }
  if (failed) process.exitCode = 1;
  return { open, failed, body };
}

/** @param {Api} api @param {string} repo @param {string} body @param {boolean} open @param {string} runUrl */
async function updateIssue(api, repo, body, open, runUrl) {
  const base = `/repos/${repo}`;
  let tracking = null;
  for (let page = 1; !tracking; page++) {
    const issues = await api(`${base}/issues?state=all&labels=${ISSUE_LABEL}&per_page=100&page=${page}`);
    const list = Array.isArray(issues) ? issues : [];
    tracking = list.find(issue => !issue.pull_request && issue.title === ISSUE_TITLE) ?? null;
    if (list.length < 100) break;
  }
  if (!open) {
    if (tracking?.state === 'open') {
      await api(`${base}/issues/${tracking.number}`, { method: 'PATCH', body: { state: 'closed',
        body: `All pinned upstreams and external documentation links verified. [Workflow run](${runUrl})` } });
    }
    return;
  }
  if (tracking) {
    if (tracking.state !== 'open' || tracking.body !== body) {
      await api(`${base}/issues/${tracking.number}`, { method: 'PATCH', body: { body, state: 'open' } });
    }
    return;
  }
  if (!(await api(`${base}/labels/${ISSUE_LABEL}`, { allow404: true }))) {
    await api(`${base}/labels`, { method: 'POST', body: { name: ISSUE_LABEL, color: 'd4c5f9',
      description: 'Upstream release or pin update' } });
  }
  await api(`${base}/issues`, { method: 'POST', body: { title: ISSUE_TITLE, body, labels: [ISSUE_LABEL] } });
}

/** @param {string[]} argv @param {Partial<Deps>} [overrides] */
export async function main(argv, overrides = {}) {
  const cwd = overrides.cwd ?? process.cwd();
  /** @type {Deps} */
  const deps = { fetch: globalThis.fetch, git: createGit(cwd), env: process.env, cwd,
    log: line => process.stdout.write(`${line}\n`), ...overrides };
  try {
    if (argv[0] === 'detect') await detect(deps);
    else if (argv[0] === 'package') {
      if (!packageCandidate(deps)) process.exitCode = 1;
    } else if (argv[0] === 'publish') await publish(deps);
    else if (argv[0] === 'report') await report(deps);
    else throw fail('E_USAGE', 'usage: upstream-upgrade.mjs detect|package|publish|report');
  } catch (error) {
    process.stderr.write(`${codeOf(error, 'E_INTERNAL')}: ${messageOf(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main(process.argv.slice(2));
