import { createHash } from 'node:crypto';
import { ATV_REPO, SPECKIT_REPO, UpstreamError } from './upstream.mjs';

/** @typedef {'speckit'|'atv'} UpstreamId */
/** @typedef {'release'|'main'} Policy */
/** @typedef {{version:string|null,commit:string,tree:string|null,bump:string}} Pin */
/** @typedef {{code:string,stage:string,excerpt:string,run:string}} Blocker */
/** @typedef {{upstream:string,pin:string,base:string,digest:string,closed:'obsolete'|null}} Marker */
/** @typedef {{number:number,state:'open'|'closed',merged:boolean,marker:Marker|null}} PrSnapshot */
/** @typedef {{sha:string,botOnly:boolean,content:string|null}} BranchSnapshot */
/** @typedef {'none'|'generate'|'unchanged'|'suppressed'|'waiting-human'|'close-obsolete'|'obsolete-human'|'blocked'} Action */
/** @typedef {{number:number,branch:string,state:'open-bot'|'open-human',marker:Marker|null}} CandidatePr */
/**
 * @typedef {{upstream:{id:UpstreamId,policy:Policy|null,current:Pin|null,latest:Pin|null},base:string,
 *   action:Action,pr:CandidatePr|null,blocker:Blocker|null,publish:boolean,branch:BranchSnapshot|null,
 *   info:string|null}} UpstreamPlan
 */
/** @typedef {{path:string,sha256:string,mode:string}} ManifestFile */
/**
 * @typedef {{schema:1,upstream:string,bump:string,pin:{version:string|null,commit:string,tree:string|null},
 *   base:string,changed:ManifestFile[],deleted:string[],summary:string,checks:Array<{name:string,result:string}>}} Manifest
 */
/** @typedef {{upstream:string,stage:string,outcome:string|null,pr:number|null,blocker:Blocker|null}} CandidateResult */

export const UPSTREAMS = Object.freeze(/** @type {const} */ (['speckit', 'atv']));
export const BOT_NAME = 'github-actions[bot]';
export const BOT_EMAIL = '41898282+github-actions[bot]@users.noreply.github.com';
export const ISSUE_TITLE = 'Upstream watch: releases and verification';
export const ISSUE_LABEL = 'upstream-bump';
export const ISSUE_NOTICE = 'Opens draft candidate PRs only; never merges, tags, releases or pushes to the default branch.';
export const CHECKS = Object.freeze([
  Object.freeze({ name: 'sync --bump', result: 'pass' }),
  Object.freeze({ name: 'npm run check', result: 'pass' })
]);
export const STAGES = Object.freeze(['detect', 'generate', 'validate', 'publish']);
const REPOS = Object.freeze({ speckit: SPECKIT_REPO, atv: ATV_REPO });
const PIN_FIELDS = ['version', 'tag', 'ref', 'commit', 'tree', 'requirements_sha256'];
const FIXED_PATHS = new Set(['baton.lock.json', 'docs/reference/upstream-diff.md']);
const REQUIREMENTS = new Set(['baton/upstream/specify-cli.requirements.in',
  'baton/upstream/specify-cli.requirements.txt']);
const FORBIDDEN_FILES = new Set(['package.json', 'package-lock.json', '.npmrc', 'uv.toml', 'pip.conf']);
const FORBIDDEN_PREFIXES = ['.github/workflows/', 'src/', 'test/', '.baton/'];
const STORED_PREFIX = /^(?:\.github\/agents\/|\.github\/skills\/|\.specify\/|packs\/[a-z0-9][a-z0-9-]*\/files\/)/;
const MARKER = /<!-- baton-upstream-candidate upstream=(speckit|atv) pin=(\S+) base=([0-9a-f]{40}) digest=([0-9a-f]{64})( closed=obsolete)? -->/;

/** @param {UpstreamId} id */
export const branchFor = id => `baton/upstream-upgrade/${id}`;
/** @param {unknown} value */
export const isVersion = value => typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);
/** @param {unknown} value */
export const isSha = value => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
/** @param {unknown} value */
export const isTag = value => typeof value === 'string' && /^v\d+\.\d+\.\d+$/.test(value);
/** @param {unknown} value */
const isDigest = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

/** @param {string} code @param {string} message */
const fail = (code, message) => new UpstreamError(code, message);

/** @param {string} a @param {string} b */
export function compareVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

/**
 * Strip control characters, cap the length and fence the text so it renders inertly.
 * @param {unknown} text @param {number} [limit] @param {{head?:boolean}} [options]
 */
export function sanitizeExcerpt(text, limit = 2000, { head = false } = {}) {
  let value = String(text ?? '').replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim();
  if (value.length > limit) {
    value = head ? `${value.slice(0, limit)}\n[truncated]` : `[truncated]\n${value.slice(-limit)}`;
  }
  const longest = Math.max(0, ...[...value.matchAll(/`+/g)].map(match => match[0].length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}text\n${value || '(no output)'}\n${fence}`;
}

/** @param {Record<string,string|undefined>} env */
export function buildRunUrl(env) {
  const server = env.GITHUB_SERVER_URL;
  const repo = env.GITHUB_REPOSITORY;
  const run = env.GITHUB_RUN_ID;
  if (typeof server !== 'string' || !/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(server) ||
    typeof repo !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) ||
    typeof run !== 'string' || !/^\d+$/.test(run)) {
    throw fail('E_SOURCE_FORMAT', 'Invalid GitHub run environment');
  }
  return `${server}/${repo}/actions/runs/${run}`;
}

/**
 * The upgrade policy recorded by the lock; any other tracked ref is unsupported.
 * @param {UpstreamId} id @param {any} entry @returns {Policy}
 */
export function policyOf(id, entry) {
  if (id === 'speckit') {
    if (isVersion(entry?.version) && entry.tag === `v${entry.version}` && entry.ref === undefined) return 'release';
  } else if (entry?.version === null && entry.ref === 'main' && entry.tag === undefined) {
    return 'main';
  } else if (isVersion(entry?.version) && entry.tag === `v${entry.version}` && entry.ref === entry.tag) {
    return 'release';
  }
  throw fail('E_UNSUPPORTED_REF', `${id}: lock pins an unsupported ref (${JSON.stringify(entry?.ref ?? entry?.tag ?? null)})`);
}

/**
 * Validate an external pin and record its exact `sync --bump` argument.
 * @param {UpstreamId} id @param {{version:string|null,commit:string,tree:string|null}} value @returns {Pin}
 */
export function makePin(id, { version, commit, tree }) {
  const ok = isSha(commit) && (version === null ? id === 'atv' : isVersion(version)) &&
    (id === 'atv' ? isSha(tree) : tree === null || isSha(tree));
  if (!ok) throw fail('E_SOURCE_FORMAT', `${id}: invalid pin ${JSON.stringify({ version, commit, tree })}`);
  return { version, commit, tree, bump: `${id}=${version ?? commit}` };
}

/** @param {UpstreamId} id @param {any} entry */
export function currentPin(id, entry) {
  policyOf(id, entry);
  return makePin(id, { version: entry.version, commit: entry.commit, tree: id === 'atv' ? entry.tree : null });
}

/** @param {Policy} policy @param {Pin} current @param {Pin} latest */
export function isNewer(policy, current, latest) {
  if (policy === 'main') return latest.version === null && latest.commit !== current.commit;
  return latest.version !== null && current.version !== null && compareVersions(latest.version, current.version) > 0;
}

/** @param {Array<any>} releases */
function newestRelease(releases) {
  const versions = (Array.isArray(releases) ? releases : [])
    .filter(item => item && item.draft === false && item.prerelease === false && isTag(item.tag_name))
    .map(item => item.tag_name.slice(1)).sort(compareVersions);
  return versions.at(-1) ?? null;
}

/**
 * Spec Kit candidates must be published both on PyPI and as a GitHub release.
 * @param {{pypi:any,releases:Array<any>}} sources
 */
export function selectSpeckit({ pypi, releases }) {
  const published = Object.entries(pypi?.releases ?? {})
    .filter(([version, files]) => isVersion(version) && Array.isArray(files) && files.length > 0 &&
      files.some(file => file?.yanked !== true))
    .map(([version]) => version).sort(compareVersions);
  const pypiLatest = published.at(-1) ?? null;
  const githubLatest = newestRelease(releases);
  if (!pypiLatest || pypiLatest !== githubLatest) {
    throw fail('E_SOURCE_MISMATCH', `Spec Kit: PyPI ${pypiLatest ?? 'none'} differs from GitHub release ${githubLatest ?? 'none'}`);
  }
  return pypiLatest;
}

/**
 * @param {{policy:Policy,current:Pin,releases:Array<any>,head:{commit:string,tree:string}}} sources
 * @returns {{target:{kind:'commit',commit:string,tree:string}|{kind:'tag',version:string},info:string|null}}
 */
export function selectAtv({ policy, releases, head }) {
  if (!isSha(head?.commit) || !isSha(head?.tree)) throw fail('E_SOURCE_FORMAT', 'ATV: invalid main commit or tree');
  if (policy === 'main') return { target: { kind: 'commit', commit: head.commit, tree: head.tree }, info: null };
  const version = newestRelease(releases);
  if (!version) throw fail('E_SOURCE_MISMATCH', 'ATV: no stable GitHub release found');
  return { target: { kind: 'tag', version }, info: head.commit };
}

/**
 * Whether a marker pin is no newer than the default branch, so its PR is obsolete.
 * @param {Policy} policy @param {Pin} current @param {Pin|null} latest @param {string} pin
 */
function markerObsolete(policy, current, latest, pin) {
  const value = pin.slice(pin.indexOf('=') + 1);
  if (policy === 'main') {
    return !isSha(value) || value === current.commit || latest?.commit === current.commit;
  }
  return !isVersion(value) || current.version === null || compareVersions(value, current.version) <= 0;
}

/**
 * Select the next action for one upstream, in the documented order.
 * @param {{id:UpstreamId,base:string,publish:boolean,policy:Policy|null,current:Pin|null,latest:Pin|null,
 *   blocker:Blocker|null,prs:PrSnapshot[],branch:BranchSnapshot|null,info:string|null}} input
 * @returns {UpstreamPlan}
 */
export function planUpstream({ id, base, publish, policy, current, latest, blocker, prs, branch, info }) {
  const open = prs.find(pr => pr.state === 'open') ?? null;
  const botOwned = Boolean(open?.marker && branch?.botOnly);
  /** @type {CandidatePr|null} */
  const pr = open && { number: open.number, branch: branchFor(id), state: botOwned ? 'open-bot' : 'open-human',
    marker: open.marker };
  /** @param {Action} action @param {Blocker|null} [problem] @returns {UpstreamPlan} */
  const result = (action, problem = null) => ({ upstream: { id, policy, current, latest }, base, action, pr,
    blocker: problem, publish, branch, info });
  if (blocker || !policy || !current) {
    return result('blocked', blocker ?? { code: 'E_UPSTREAM_VERIFY', stage: 'detect', excerpt: 'Detection failed', run: '' });
  }
  if (open?.marker && markerObsolete(policy, current, latest, open.marker.pin)) {
    return result(botOwned ? 'close-obsolete' : 'obsolete-human');
  }
  if (!latest || !isNewer(policy, current, latest)) return result('none');
  const suppressed = prs.some(item => item.state === 'closed' && !item.merged && item.marker &&
    item.marker.closed !== 'obsolete' && item.marker.pin === latest.bump);
  if (suppressed) return result('suppressed');
  if ((open && !botOwned) || (!open && branch && !branch.botOnly)) return result('waiting-human');
  if (open?.marker && open.marker.pin === latest.bump && open.marker.base === base &&
    branch?.content === open.marker.digest) return result('unchanged');
  return result('generate');
}

const isBot = (/** @type {any} */ person) => person?.name === BOT_NAME && person?.email === BOT_EMAIL;

/**
 * A branch is bot-only when every commit beyond the base is authored and committed by the bot.
 * @param {Array<any>} commits
 */
export function classifyBranch(commits) {
  return commits.every(item => isBot(item?.commit?.author) && isBot(item?.commit?.committer));
}

/** @param {{upstream:string,pin:string,base:string,digest:string,closed?:'obsolete'|null}} marker */
export function renderMarker({ upstream, pin, base, digest, closed = null }) {
  return `<!-- baton-upstream-candidate upstream=${upstream} pin=${pin} base=${base} digest=${digest}` +
    `${closed === 'obsolete' ? ' closed=obsolete' : ''} -->`;
}

/** @param {string|null|undefined} text @returns {Marker|null} */
export function parseMarker(text) {
  const match = typeof text === 'string' ? MARKER.exec(text) : null;
  if (!match) return null;
  const [, upstream, pin, base, digest, closed] = match;
  const [prefix, value] = [pin.slice(0, pin.indexOf('=')), pin.slice(pin.indexOf('=') + 1)];
  const valid = prefix === upstream && (isVersion(value) || (upstream === 'atv' && isSha(value)));
  return valid ? { upstream, pin, base, digest, closed: closed ? 'obsolete' : null } : null;
}

/** @param {unknown} value @returns {unknown} */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort()
      .map(key => [key, canonical(/** @type {Record<string,unknown>} */ (value)[key])]));
  }
  return value;
}
/** @param {unknown} a @param {unknown} b */
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/** Content digest: sha256 of the canonical manifest without its checks. @param {Record<string,any>} manifest */
export function contentDigest(manifest) {
  const { checks, ...content } = manifest;
  return createHash('sha256').update(JSON.stringify(canonical(content))).digest('hex');
}

/**
 * Why a changed or deleted path is not an allowed regenerated output, or null.
 * @param {string} path @param {'changed'|'deleted'} kind @param {UpstreamId} id
 * @param {{baseLock:any,candidateLock:any}} locks
 */
export function pathPolicyIssue(path, kind, id, { baseLock, candidateLock }) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(path) || path.split('/').some(part => part === '' || part === '.' || part === '..')) {
    return `${JSON.stringify(path)} is not a normalized relative path`;
  }
  if (FORBIDDEN_FILES.has(path) || FORBIDDEN_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return `${path} is outside the regenerated outputs`;
  }
  if (FIXED_PATHS.has(path)) return null;
  if (REQUIREMENTS.has(path)) return id === 'speckit' ? null : `${path} may change only in a Spec Kit candidate`;
  /** @param {any} lock */
  const stored = lock => Array.isArray(lock?.files) && lock.files.some((/** @type {any} */ file) => file?.stored_at === path);
  if (STORED_PREFIX.test(path) && (stored(baseLock) || (kind === 'changed' && stored(candidateLock)))) return null;
  return `${path} is not a locked upstream output`;
}

/**
 * The pin fields a candidate lock entry must hold for the expected pin.
 * @param {UpstreamId} id @param {Pin} pin
 */
function expectedPinFields(id, pin) {
  if (id === 'speckit') return { version: pin.version, tag: `v${pin.version}`, commit: pin.commit };
  return pin.version === null ?
    { version: null, ref: 'main', commit: pin.commit, tree: pin.tree } :
    { version: pin.version, tag: `v${pin.version}`, ref: `v${pin.version}`, commit: pin.commit, tree: pin.tree };
}

/**
 * Differences that a candidate lock may not contain (FR-012).
 * @param {UpstreamId} id @param {any} base @param {any} candidate @param {Pin} latest @returns {string[]}
 */
export function lockDiffIssues(id, base, candidate, latest) {
  const issues = [];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return ['candidate lock is not an object'];
  const topKeys = new Set([...Object.keys(base), ...Object.keys(candidate)]);
  for (const key of topKeys) {
    if (key === 'upstreams' || key === 'files' || key === 'x-bump-summary') continue;
    if (!same(base[key], candidate[key])) issues.push(`top-level ${key} changed`);
  }
  if (!Array.isArray(candidate.files)) issues.push('files is not a list');
  const upstreams = candidate.upstreams ?? {};
  for (const key of new Set([...Object.keys(base.upstreams), ...Object.keys(upstreams)])) {
    if (key !== id && !same(base.upstreams[key], upstreams[key])) issues.push(`upstreams.${key} changed`);
  }
  const own = upstreams[id];
  if (!own || typeof own !== 'object') return [...issues, `upstreams.${id} missing`];
  const before = base.upstreams[id] ?? {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(own)])) {
    if (!PIN_FIELDS.includes(key) && !same(before[key], own[key])) issues.push(`upstreams.${id}.${key} changed`);
  }
  const expected = expectedPinFields(id, latest);
  for (const key of PIN_FIELDS) {
    if (key === 'requirements_sha256') continue;
    const want = Object.hasOwn(expected, key) ? expected[/** @type {keyof typeof expected} */ (key)] : undefined;
    if (!same(own[key], want)) issues.push(`upstreams.${id}.${key} is not the expected pin`);
  }
  const requirements = own.requirements_sha256;
  if (id === 'speckit' ? !isDigest(requirements) : requirements !== before.requirements_sha256) {
    issues.push(`upstreams.${id}.requirements_sha256 is invalid`);
  }
  return issues;
}

/**
 * Verify an untrusted candidate against the trusted plan and the base lock.
 * @param {{plan:UpstreamPlan,manifest:any,files:Map<string,{bytes:Buffer,symlink:boolean}>,baseLock:any}} input
 * @returns {{digest:string,manifest:Manifest,lock:any}}
 */
export function verifyCandidate({ plan, manifest, files, baseLock }) {
  const reject = (/** @type {string} */ message) => fail('E_CANDIDATE_VERIFY', `${plan.upstream.id}: ${message}`);
  const latest = plan.upstream.latest;
  if (plan.action !== 'generate' || !latest) throw reject(`plan action ${plan.action} has no candidate`);
  if (!manifest || typeof manifest !== 'object' || manifest.schema !== 1) throw reject('unsupported manifest');
  const allowed = new Set(['schema', 'upstream', 'bump', 'pin', 'base', 'changed', 'deleted', 'summary', 'checks']);
  if (Object.keys(manifest).some(key => !allowed.has(key))) throw reject('unexpected manifest field');
  if (manifest.upstream !== plan.upstream.id || manifest.bump !== latest.bump || manifest.base !== plan.base ||
    !same(manifest.pin, { version: latest.version, commit: latest.commit, tree: latest.tree })) {
    throw reject('manifest does not match the plan');
  }
  if (!same(manifest.checks, CHECKS)) throw reject('required checks did not pass');
  if (!Array.isArray(manifest.changed) || !Array.isArray(manifest.deleted) || typeof manifest.summary !== 'string') {
    throw reject('malformed manifest');
  }
  const seen = new Set();
  for (const path of [...manifest.changed.map((/** @type {any} */ item) => item?.path), ...manifest.deleted]) {
    if (typeof path !== 'string' || seen.has(path)) throw reject(`duplicate or invalid path ${JSON.stringify(path)}`);
    seen.add(path);
  }
  for (const item of manifest.changed) {
    if (Object.keys(item).sort().join() !== 'mode,path,sha256' || !['100644', '100755'].includes(item.mode)) {
      throw reject(`${item.path}: invalid entry`);
    }
    const file = files.get(item.path);
    if (!file || file.symlink || !Buffer.isBuffer(file.bytes)) throw reject(`${item.path}: missing or not a regular file`);
    if (createHash('sha256').update(file.bytes).digest('hex') !== item.sha256) throw reject(`${item.path}: hash mismatch`);
  }
  if (files.size !== manifest.changed.length) throw reject('artifact contains files outside the manifest');
  const lockFile = files.get('baton.lock.json');
  if (!lockFile) throw reject('candidate does not change baton.lock.json');
  let lock;
  try {
    lock = JSON.parse(lockFile.bytes.toString('utf8'));
  } catch {
    throw reject('candidate lock is not JSON');
  }
  if ((lock?.['x-bump-summary'] ?? '') !== manifest.summary) throw reject('summary differs from the candidate lock');
  const id = /** @type {UpstreamId} */ (plan.upstream.id);
  const policy = [
    ...manifest.changed.map((/** @type {any} */ item) => pathPolicyIssue(item.path, 'changed', id, { baseLock, candidateLock: lock })),
    ...manifest.deleted.map((/** @type {string} */ path) => pathPolicyIssue(path, 'deleted', id, { baseLock, candidateLock: lock })),
    ...lockDiffIssues(id, baseLock, lock, latest)
  ].filter(Boolean);
  if (policy.length) throw fail('E_PATH_POLICY', `${id}: ${policy.join('; ')}`);
  return { digest: contentDigest(manifest), manifest, lock };
}

/** @param {Pin} pin */
const display = pin => pin.version ?? pin.commit;
/** @param {Pin|null} pin */
const label = pin => pin ? (pin.version ? `${pin.version} (\`${pin.commit.slice(0, 12)}\`)` : `\`${pin.commit.slice(0, 12)}\``) : '—';

/** @param {UpstreamPlan} plan */
export const prTitle = plan => `Upstream: bump ${plan.upstream.id} to ${display(/** @type {Pin} */ (plan.upstream.latest))}`;

/** @param {UpstreamPlan} plan @param {string} digest */
export function commitMessage(plan, digest) {
  const latest = /** @type {Pin} */ (plan.upstream.latest);
  return `chore(upstream): bump ${plan.upstream.id} to ${display(latest)}\n\n` +
    `Baton-Upstream: ${plan.upstream.id}\nBaton-Pin: ${latest.bump}\nBaton-Base: ${plan.base}\nBaton-Content: ${digest}\n`;
}

/** @param {string|null|undefined} message */
export function contentTrailer(message) {
  return /^Baton-Content: ([0-9a-f]{64})$/m.exec(message ?? '')?.[1] ?? null;
}

/** Links built only from fixed repositories and validated pins. @param {UpstreamPlan} plan */
function pinLinks(plan) {
  const { id, current, latest } = plan.upstream;
  const repo = REPOS[id];
  if (!latest) return [];
  const links = [];
  if (latest.version) links.push(`[Release v${latest.version}](${repo}/releases/tag/v${latest.version})`);
  if (current) links.push(`[Compare](${repo}/compare/${current.commit}...${latest.commit})`);
  if (id === 'speckit' && latest.version) links.push(`[PyPI](https://pypi.org/project/specify-cli/${latest.version}/)`);
  return links;
}

/** @param {{plan:UpstreamPlan,manifest:Manifest,digest:string,runUrl:string}} input */
export function renderPrBody({ plan, manifest, digest, runUrl }) {
  const { id, current, latest } = plan.upstream;
  const next = /** @type {Pin} */ (latest);
  /** @param {Pin|null} pin @param {keyof Pin} key */
  const cell = (pin, key) => pin?.[key] ? `\`${pin[key]}\`` : '—';
  const list = (/** @type {string[]} */ paths) => paths.length > 200 ?
    [...paths.slice(0, 200).map(path => `- \`${path}\``), `- … ${paths.length - 200} more`] :
    paths.map(path => `- \`${path}\``);
  return [
    renderMarker({ upstream: id, pin: next.bump, base: plan.base, digest }),
    '',
    `Automated draft candidate for \`${next.bump}\` on base \`${plan.base}\`. ${ISSUE_NOTICE}`,
    '',
    '## Pins',
    '',
    '| Field | Current | Candidate |',
    '| --- | --- | --- |',
    `| version | ${cell(current, 'version')} | ${cell(next, 'version')} |`,
    `| commit | ${cell(current, 'commit')} | ${cell(next, 'commit')} |`,
    `| tree | ${cell(current, 'tree')} | ${cell(next, 'tree')} |`,
    '',
    pinLinks(plan).join(' · '),
    '',
    '## Generated change summary',
    '',
    sanitizeExcerpt(manifest.summary, 20000, { head: true }),
    '',
    `Changed files (${manifest.changed.length}):`,
    '',
    ...list(manifest.changed.map(item => item.path)),
    '',
    `Removed files (${manifest.deleted.length}):`,
    '',
    ...(manifest.deleted.length ? list(manifest.deleted) : ['- none']),
    '',
    '## Validation',
    '',
    ...manifest.checks.map(check => `- \`${check.name}\`: ${check.result}`),
    `- [Workflow run](${runUrl})`,
    '',
    '## Reviewer checklist',
    '',
    '- [ ] Upstream compatibility with Baton contracts reviewed',
    '- [ ] Licenses and `THIRD_PARTY_NOTICES.md` still accurate',
    '- [ ] Recorded repairs still apply and remain necessary',
    '- [ ] Pack reference closure is intact',
    '- [ ] All changed agent and skill prompts read in full',
    '- [ ] All normal Baton gates and release checks pass',
    '',
    '## How checks start',
    '',
    'Pushes made with the workflow token do not start other workflows. Mark this PR ready for review, ' +
      'or approve the pending workflow runs, to start the required checks. Merging and release stay manual.',
    ''
  ].join('\n');
}

/** @param {unknown} value */
const escapeCell = value => String(value ?? '—').replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ');

/**
 * Validate a result from an artifact or job output before it is rendered.
 * @param {any} result @param {string} runUrl @returns {CandidateResult|null}
 */
export function trustedResult(result, runUrl) {
  if (!result || typeof result !== 'object' || !UPSTREAMS.includes(result.upstream)) return null;
  const outcomes = ['opened', 'updated', 'unchanged', 'closed-obsolete', 'preview', 'failed', null];
  const blocker = result.blocker && typeof result.blocker === 'object' ? {
    code: /^E_[A-Z_]{1,40}$/.test(result.blocker.code) ? result.blocker.code : 'E_CHECK_FAILED',
    stage: STAGES.includes(result.blocker.stage) ? result.blocker.stage : 'generate',
    excerpt: String(result.blocker.excerpt ?? '').slice(-20000),
    run: runUrl
  } : null;
  return {
    upstream: result.upstream,
    stage: STAGES.includes(result.stage) ? result.stage : 'generate',
    outcome: outcomes.includes(result.outcome) ? result.outcome : 'failed',
    pr: Number.isSafeInteger(result.pr) && result.pr > 0 ? result.pr : null,
    blocker
  };
}

/**
 * Render the single tracking issue and decide whether it stays open.
 * @param {{plans:UpstreamPlan[],results:Record<string,CandidateResult|null|undefined>,
 *   verification:{sync:string,links:string,syncExcerpt?:string,linksExcerpt?:string},server:string,repo:string,
 *   runUrl?:string}} input
 */
export function renderIssue({ plans, results, verification, server, repo, runUrl = '' }) {
  const rows = [];
  const blockers = [];
  let pending = false;
  for (const plan of plans) {
    const result = results[plan.upstream.id] ?? null;
    const blocker = plan.blocker ?? result?.blocker ?? null;
    const number = result?.pr ?? plan.pr?.number ?? null;
    const link = number ? ` [#${number}](${server}/${repo}/pull/${number})` : '';
    const candidate = `${result?.outcome ?? plan.action}${link}`;
    const latest = `${label(plan.upstream.latest)}${pinLinks(plan).length ? ` ${pinLinks(plan).join(' · ')}` : ''}` +
      (plan.info ? ` (main moved to \`${plan.info}\`; informational)` : '');
    const blockerCell = blocker ? `${blocker.code} (${blocker.stage})${blocker.run ? ` [run](${blocker.run})` : ''}` : '—';
    rows.push(`| ${plan.upstream.id} | ${label(plan.upstream.current)} | ${latest} | ${escapeCell(candidate)} | ${blockerCell} |`);
    if (blocker) blockers.push(`### ${plan.upstream.id}: ${blocker.code}`, '', sanitizeExcerpt(blocker.excerpt), '');
    const settled = plan.action === 'none' && !plan.pr ||
      plan.action === 'close-obsolete' && result?.outcome === 'closed-obsolete';
    if (!settled || blocker) pending = true;
  }
  const verified = verification.sync === 'pass' && verification.links === 'pass';
  const body = [
    `Automated weekly upstream watch. ${ISSUE_NOTICE}`,
    '',
    '| Upstream | Current pin | Latest pin | Candidate | Blocker |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
    ...(blockers.length ? ['## Blockers', '', ...blockers] : []),
    '## Verification and external links',
    '',
    verification.sync === 'pass' ? '- `baton sync --check` passed.' :
      `- \`baton sync --check\` failed (pin drift, unreachable commit or wheel hash):\n\n${sanitizeExcerpt(verification.syncExcerpt, 4000)}`,
    verification.links === 'pass' ? '- External documentation links passed.' :
      `- External documentation links failed:\n\n${sanitizeExcerpt(verification.linksExcerpt, 6000)}`,
    '',
    ...(runUrl ? [`[Workflow run](${runUrl})`] : [])
  ].join('\n');
  return { body, open: pending || !verified };
}
