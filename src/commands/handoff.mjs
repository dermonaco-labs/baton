import { readFile, readdir, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { isDeepStrictEqual, promisify } from 'node:util';
import { BatonError } from '../lib/report.mjs';
import { readHandoff, writeHandoff, validateHandoff, gateVocabulary, approvedRole, actorRole, attachmentSources } from '../lib/handoff.mjs';
import { writerHash, checkoutHash } from '../lib/writer.mjs';
import { withinRoot } from '../lib/manifest.mjs';
import { hashFile } from '../lib/hash.mjs';
import { hashBytes } from '../lib/hash.mjs';
import { changedFiles, reviewBase } from '../lib/checks.mjs';
import { loadPhases, phaseForLane, evaluateChecks } from '../lib/phases.mjs';
import { evaluateBuiltIn } from '../lib/checks.mjs';
import { serializeFrontmatter } from '../lib/frontmatter.mjs';
import { loadModelSettings, resolveModel, modelPolicyIssue } from '../lib/models.mjs';

const execFileAsync = promisify(execFile);
/** @param {string} message */
const usage = (message) => new BatonError('E_USAGE', message, 2);
/** @param {Record<string,any>} data */
const attachment = (data) => data.decisions?.find((/** @type {{tag?:string}} */ d) => d.tag === 'attached');
/** @param {Record<string,any>} data @param {string} tag */
const lastDecision = (data, tag) => data.decisions?.filter((/** @type {{tag?:string}} */ d) => d.tag === tag).at(-1);
/** @param {string} root @param {string|undefined} base */
async function reviewedTree(root, base) {
  const files = await changedFiles(root, { subject: true, base });
  if (!files) throw new BatonError('E_CHECK_FAILED', 'Cannot resolve changed files for review', 1);
  const entries = [];
  for (const file of files.sort()) {
    try {
      entries.push([file, await hashFile(withinRoot(root, file))]);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
      entries.push([file, 'deleted']);
    }
  }
  return hashBytes(JSON.stringify(entries));
}
/** @param {string} next */
const headingBody = (next) => `## Goal\nKeep the work in scope.\n\n## What changed\nPending phase work.\n\n## Next steps\n1. \`/${next}\`\n\n## Watch out for\n- Escalate decisions that change behaviour or public contracts.\n`;
/** @param {string} root */
async function commitId(root) {
  return fullCommitId(root, ['rev-parse', '--short', 'HEAD']);
}
/** @param {string} root @param {string[]} [args] */
async function fullCommitId(root, args = ['rev-parse', 'HEAD']) {
  try {
    return (await execFileAsync('git', args, { cwd: root, windowsHide: true })).stdout.trim();
  } catch (error) {
    if ([128, 'ENOENT'].includes(/** @type {{code?:number|string}} */ (error).code ?? '')) return null;
    throw error;
  }
}
/** @param {string} root @param {Record<string,any>} data */
async function verifyAttachment(root, data) {
  const attached = attachment(data);
  if (!attached) return;
  const head = attached['x-imported-head'];
  try {
    const git = async (/** @type {string[]} */ args) =>
      (await execFileAsync('git', args, { cwd: root, windowsHide: true })).stdout.trim();
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(head) ||
        await git(['rev-parse', '--verify', `${head}^{commit}`]) !== head ||
        await git(['merge-base', head, 'origin/HEAD']) !== attached['x-delivery-base']) throw Error();
    await git(['merge-base', '--is-ancestor', head, 'HEAD']);
  } catch {
    throw new BatonError('E_CHECK_FAILED', 'Unverifiable attachment ancestry or origin/HEAD base', 1);
  }
}
/** @param {string} root @param {Record<string,any>} data @param {string} actor @param {string} phase @param {string} [batonPath] */
async function updateMetadata(root, data, actor, phase, batonPath) {
  data.updated_at = new Date().toISOString();
  data.updated_by = actor;
  const routing = resolveModel(await loadModelSettings(root), phase, data.model_role);
  data.model_role = routing.role;
  data.suggested_model = routing.model;
  for (const item of [...(data.read_first ?? []), ...(data.artifacts ?? [])]) {
    if (batonPath && item.path === batonPath) delete item.sha256;
    else if (item.sha256) item.sha256 = await hashFile(withinRoot(root, item.path));
  }
}
/** @param {string} root @param {string} path @param {Record<string,any>} data */
async function requireApprovedSourcesFresh(root, path, data) {
  for (const item of /** @type {Array<{path:string,sha256?:string}>} */ (data.artifacts ?? [])) {
    if (!/\/(?:spec|plan)\.md$/.test(item.path) || !item.sha256) continue;
    if (await hashFile(withinRoot(root, item.path)) !== item.sha256) {
      throw new BatonError('E_STALE_ARTIFACT', `${item.path} changed; refresh and obtain a new gate approval before answering or escalating`, 1, path);
    }
  }
}
/** @param {Array<{id:string}>} entries @param {string} prefix */
function nextId(entries, prefix) {
  return `${prefix}${Math.max(0, ...entries.map((item) => Number(new RegExp(`^${prefix}(\\d+)$`).exec(item.id)?.[1] ?? 0))) + 1}`;
}

/** @param {Record<string,any>} data @param {Record<string,any>} fields */
function addDecision(data, fields) {
  data.decisions ??= [];
  const id = nextId(data.decisions, 'D');
  data.decisions.push({ id, ...fields });
  return id;
}

/** @param {string} feature @param {string} completed @param {string} next @param {string} owner @param {string} now */
function featureData(feature, completed, next, owner, now) {
  return {
    baton: 1, lane: 'feature', feature, phase_completed: completed, next_phase: next, next_owner: owner,
    status: 'ready', model_role: 'planning', suggested_model: /** @type {string|null} */ (null),
    summary: 'First feature handoff', read_first: /** @type {Array<Record<string,any>>} */ ([]),
    artifacts: /** @type {Array<Record<string,any>>} */ ([]), entry_checked: [],
    exit_criteria: /** @type {Awaited<ReturnType<typeof evaluateChecks>>} */ ([]),
    open_questions: /** @type {Array<Record<string,any>>} */ ([]),
    decisions: /** @type {Array<Record<string,any>>} */ ([]),
    gate: { required: false, approved_by: /** @type {string|null} */ (null), approved_at: /** @type {string|null} */ (null) },
    history: /** @type {Array<Record<string,any>>} */ ([]), updated_at: now, updated_by: 'baton',
  };
}

/** @param {string} root @param {string} path */
async function readAgentJson(root, path) {
  try {
    return JSON.parse(await readFile(withinRoot(root, path), 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw usage(`Invalid JSON in ${path}: ${error.message}`);
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT' || /Path escapes repository:/.test(String(error))) {
      throw usage(`Cannot read --from-json ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }
}

/** @param {unknown} data @param {string[]} fields */
function unexpectedFields(data, fields) {
  return !data || typeof data !== 'object' || Array.isArray(data) ||
    Object.keys(data).some((key) => !fields.includes(key));
}

/** @param {string} root @param {Record<string,any>} data @param {string} decision @param {string} rationale @param {string|null} [base] */
async function recordDiffBase(root, data, decision, rationale, base = null) {
  base ??= attachment(data)?.['x-delivery-base'] ?? await fullCommitId(root);
  if (!base) throw new BatonError('E_CHECK_FAILED', 'Cannot record diff base without a Git HEAD', 1);
  addDecision(data, {
    decision,
    rationale, tag: 'diff-base', 'x-base-commit': base, by: 'baton',
  });
}

/** @param {string[]} args */
function parseOptions(args) {
  /** @type {Record<string,string|boolean>} */
  const options = {};
  const values = new Set(['--feature', '--quick', '--phase', '--mode', '--by', '--via', '--at', '--reason', '--note', '--from-json', '--next', '--analysis-from', '--from-brainstorm', '--from-quick', '--check', '--tag', '--find', '--replace']);
  const switches = new Set(['--infer', '--dry-run']);
  for (let i = 0; i < args.length; i++) {
    if (values.has(args[i])) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw usage(`${args[i]} needs a value`);
      options[args[i].slice(2)] = args[++i];
    } else if (switches.has(args[i])) options[args[i].slice(2)] = true;
    else throw usage(`Unknown handoff flag: ${args[i]}`);
  }
  return options;
}

/** @param {string} root @param {Record<string, string|boolean>} options */
async function locate(root, options) {
  if (options.quick && options.feature) throw usage('Use --quick or --feature, not both');
  if (typeof options.quick === 'string') {
    if (!/^[a-z0-9][a-z0-9-]{0,47}[a-z0-9]$/.test(options.quick)) throw usage('Quick slug must be kebab-case (2-49 characters)');
    return `.baton/quick/${options.quick}.md`;
  }
  if (typeof options.feature === 'string') {
    if (!/^\d{3}-[a-z0-9-]+$/.test(options.feature)) throw usage('Feature name must be NNN-slug');
    return `specs/${options.feature}/handoff.md`;
  }
  const entries = (await readdir(withinRoot(root, 'specs'), { withFileTypes: true }).catch((error) => {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return [];
    throw error;
  })).filter((entry) => entry.isDirectory() && /^\d{3}-[a-z0-9-]+$/.test(entry.name));
  if (entries.length !== 1) {
    const names = entries.map((entry) => entry.name);
    try {
      const branch = (await execFileAsync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd: root, windowsHide: true })).stdout.trim();
      const candidate = branch.match(/(?:^|\/)(\d{3}-[a-z0-9-]+)$/)?.[1];
      if (candidate && names.includes(candidate)) return `specs/${candidate}/handoff.md`;
    } catch (error) {
      if (![1, 128, 'ENOENT'].includes(/** @type {{code?:number|string}} */ (error).code ?? '')) throw error;
    }
    try {
      const selected = JSON.parse(await readFile(withinRoot(root, '.specify/feature.json'), 'utf8'));
      const candidate = basename(selected.feature_directory ?? '');
      if (names.includes(candidate)) return `specs/${candidate}/handoff.md`;
    } catch (error) {
      if (!(error instanceof SyntaxError) && /** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    }
    throw usage(`Specify --feature NNN-slug; candidates: ${names.join(', ') || '(none)'}`);
  }
  return `specs/${entries[0].name}/handoff.md`;
}

/** @param {Record<string,any>} data @param {string} field @param {Array<Record<string,any>>} incoming */
function appendOnly(data, field, incoming) {
  if (!Array.isArray(incoming)) throw usage(`${field} must be an array`);
  const existing = data[field] ?? [];
  const byId = new Map(/** @type {Array<{id:string}>} */ (existing).map((item) => [item.id, item]));
  /** @type {Array<Record<string,any>>} */
  const additions = [];
  for (const item of incoming) {
    if (typeof item?.id !== 'string') throw usage(`${field} entries need an id`);
    if (byId.has(item.id)) {
      if (!isDeepStrictEqual(byId.get(item.id), item)) throw usage(`${field} ${item.id} cannot be changed by write`);
    } else {
      if (field === 'decisions' && (typeof item.by === 'string' && item.by.startsWith('human:') ||
        ['attached', 'attach-approved', 'diff-base', 'reviewed-tree', 'self-review-override', 'acceptance-waiver'].includes(item.tag))) {
        throw usage('Reserved decisions can only be recorded by the CLI');
      }
      if (additions.some((other) => other.id === item.id)) throw usage(`Duplicate ${field} id ${item.id}`);
      additions.push(item);
    }
  }
  data[field] = [...existing, ...additions];
}

/** @param {string} root @param {string} path @param {Record<string,any>} data @param {import('../lib/phases.mjs').Phase} contract @param {string} phase @param {boolean} [writing] */
async function entryErrors(root, path, data, contract, phase, writing = false) {
  const errors = [];
  if (data.gate?.required && !data.gate.approved_by) errors.push({ code: 'E_GATE_PENDING', file: path, message: 'Human approval is required before receiving this phase' });
  if (data.status === 'needs-human') errors.push({ code: 'E_BLOCKING_OPEN', file: path, message: 'A human decision is required' });
  if (phase === 'land' && data.review?.findings_path !== (data.lane === 'quick'
    ? `.baton/quick/${data.feature}.review.json` : `${dirname(path).replaceAll('\\', '/')}/review.json`)) {
    errors.push({ code: 'E_REVIEW_BLOCKING', file: path, message: 'Land requires the canonical review findings file' });
  }
  if (!errors.length) {
    const entry = phaseForLane(contract, data.lane).entry.flatMap((check) => {
      if (!writing || check.id !== 'fresh') return [check];
      if (phase !== 'implement' || !check.names) return [check];
      const names = check.names.filter((name) => name !== 'tasks');
      return names.length ? [{ ...check, names }] : [];
    });
    const checks = await evaluateChecks(entry,
      (check) => evaluateBuiltIn(root, path, data, check));
    for (const check of checks.filter((item) => !item.met)) {
      const code = check.id === 'gate-approved' ? 'E_GATE_PENDING'
        : check.id.startsWith('fresh:') ? 'E_STALE_ARTIFACT'
        : check.id === 'acceptance-registered' ? 'E_NO_PREREG'
        : check.id === 'from-phase' || check.id === 'no-feature-tasks' ? 'E_TRANSITION'
        : check.id === 'no-blocking-findings' ? 'E_REVIEW_BLOCKING'
        : check.id === 'no-blocking-questions' ? 'E_BLOCKING_OPEN'
        : check.id === 'local-checks-pass' ? 'E_CHECK_FAILED' : 'E_MISSING_ARTIFACT';
      errors.push({ code, file: path, message: `${check.id} unmet: ${check.evidence}${check.members ? ` (${check.members.map((item) => `${item.id}: ${item.met}`).join(', ')})` : ''}` });
    }
  }
  return errors;
}

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  const [action, ...raw] = args;
  if (!action) throw usage('handoff requires an action');
  let rest = raw;
  let answer;
  if (action === 'answer') {
    if (raw.length < 2 || raw[0].startsWith('--') || raw[1].startsWith('--')) throw usage('answer needs a question ID and choice');
    answer = { id: raw[0], choice: raw[1] };
    rest = raw.slice(2);
  }
  const options = parseOptions(rest);
  if (options['dry-run'] && action !== 'migrate') throw usage('handoff --dry-run is not supported for this action');
  const writer = await writerHash(root);
  const worktree = await checkoutHash(root);
  /** @param {Record<string,any>} data @param {string} by @param {string} phase @param {string} [actionName] */
  const record = async (data, by, phase, actionName = 'write') => {
    if (phase === 'none') return;
    data.history = [...(data.history ?? []), {
      phase, at: new Date().toISOString(), by, writer, ...(worktree ? { 'x-worktree': worktree } : {}),
      commit: await commitId(root), 'x-action': actionName,
    }].slice(-20);
  };
  /** @param {Record<string,any>} data @param {string} phase */
  const selfReview = (data, phase) => {
    if (!['review', 'land'].includes(phase)) return false;
    const implement = /** @type {Array<{phase:string,at?:string,writer?:string,'x-worktree'?:string,'x-action'?:string}>} */ (data.history ?? [])
      .filter((item) => item.phase === (data.lane === 'quick' ? 'work' : 'implement') &&
        (!item['x-action'] || item['x-action'] === 'write')).at(-1);
    const sameCheckout = (data['x-implementation-writer'] ?? implement?.writer) === writer ||
      (worktree !== null && (data['x-implementation-worktree'] ?? implement?.['x-worktree']) === worktree);
    const cycle = data['x-implementation-cycle'] ?? implement?.at;
    return Boolean(sameCheckout &&
      !/** @type {Array<{tag?:string,by?:string,'x-implementation-cycle'?:string}>} */ (data.decisions ?? [])
      .some((item) => item.tag === 'self-review-override' && item.by?.startsWith('human:') &&
        cycle && item['x-implementation-cycle'] === cycle));
  };
  if (action === 'receive' && options.phase === 'specify' && !options.feature && !options.quick) {
    let selected;
    try {
      selected = await locate(root, options);
    } catch (error) {
      if (!(error instanceof BatonError) || error.code !== 'E_USAGE') throw error;
    }
    if (!selected) {
      return { errors: [], data: { read_first: [], do_not_read: [] }, exitCode: 0 };
    }
    try {
      const { data } = await readHandoff(root, selected);
      if (data.next_phase !== 'specify') {
        return { errors: [], data: { read_first: [], do_not_read: [] }, exitCode: 0 };
      }
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
      return { errors: [], data: { read_first: [], do_not_read: [] }, exitCode: 0 };
    }
  }
  const path = await locate(root, options);
  const featureDir = dirname(path).replaceAll('\\', '/');
  const humanActor = typeof options.by === 'string' ? `human:${options.by.replaceAll(' ', '-')}` : '';
  if (typeof options.quick === 'string' && action !== 'new') {
    try {
      await readFile(withinRoot(root, path));
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
      throw usage(`Quick baton ${path} does not exist; use handoff new --quick ${options.quick} --reason <why>`);
    }
  }
  if (action === 'redact') {
    if (typeof options.reason !== 'string' || typeof options.find !== 'string' ||
      typeof options.replace !== 'string' || options.find === options.replace) {
      throw usage('redact requires --find, --replace and --reason');
    }
    const { data, body } = await readHandoff(root, path);
    if (!body.includes(options.find)) throw usage('Text to redact was not found in the baton body');
    const replacement = body.replaceAll(options.find, options.replace);
    const errors = await validateHandoff(root, path, serializeFrontmatter(data, replacement))
      .then((issues) => issues.filter((issue) => !['E_STALE_ARTIFACT', 'E_EXIT_UNMET'].includes(issue.code)));
    if (errors.length) return { errors, exitCode: 1 };
    addDecision(data, { decision: 'Handoff body redacted',
      rationale: options.reason, by: 'baton' });
    data.updated_at = new Date().toISOString();
    data.updated_by = 'baton';
    await record(data, 'baton', data.phase_completed, 'redact');
    await writeHandoff(root, path, data, replacement);
    return { data: { path, redacted: true } };
  }
  if (action === 'revoke-waivers') {
    if (typeof options.reason !== 'string' || !options.reason.trim()) throw usage('revoke-waivers requires --reason');
    const { data, body } = await readHandoff(root, path);
    if (data.lane !== 'feature') throw usage('Only feature batons have acceptance waivers');
    const hash = await hashFile(withinRoot(root, `${dirname(path)}/tasks.md`));
    const invalid = /** @type {Array<{id:string,tag?:string,'x-evidence-sha256'?:string}>} */ (data.decisions ?? [])
      .filter((item) => item.tag === 'acceptance-waiver' && item['x-evidence-sha256'] !== hash);
    if (!invalid.length) throw usage('No invalid acceptance waivers to revoke');
    data.decisions = data.decisions.filter((/** @type {{id:string}} */ item) => !invalid.some((removed) => removed.id === item.id));
    addDecision(data, { decision: 'Invalid acceptance waivers revoked',
      rationale: options.reason, by: 'baton', 'x-revoked': invalid.map((item) => item.id) });
    data.updated_at = new Date().toISOString();
    data.updated_by = 'baton';
    await record(data, 'baton', data.phase_completed, 'revoke-waivers');
    await writeHandoff(root, path, data, body);
    return { data: { revoked: invalid.map((item) => item.id) } };
  }
  if (action === 'question') {
    const { data, body } = await readHandoff(root, path);
    if (typeof options.reason !== 'string' || !options.reason.trim()) throw usage('question requires --reason');
    const check = options.check;
    const override = options.tag === 'self-review-override';
    if (check && (typeof check !== 'string' || !data.acceptance_checks?.some((/** @type {{id:string}} */ item) => item.id === check) ||
      data.lane !== 'feature' || data.next_phase !== 'implement')) {
      throw usage('Question check must be registered on an implement handoff');
    }
    if (!check && !override || check && options.tag || override && !['review', 'land'].includes(data.next_phase)) {
      throw usage('question requires --check on implement or --tag self-review-override on review/land');
    }
    const id = nextId(data.open_questions ?? [], 'Q');
    data.open_questions ??= [];
    data.open_questions.push({
      id, question: options.reason, blocking: true,
      options: check ? [`Waive ${check}`, 'Keep requirement'] : ['Allow self-review', 'Require independent review'],
      ...(check ? { 'x-check': check } : { 'x-tag': 'self-review-override' }),
    });
    data.status = 'needs-human';
    data.updated_at = new Date().toISOString();
    data.updated_by = 'baton';
    await record(data, 'baton', data.phase_completed, 'question');
    await writeHandoff(root, path, data, body);
    return { data: { question: id, status: data.status } };
  }
  if (action === 'new' && typeof options.feature === 'string' || action === 'init') {
    if (typeof options.feature !== 'string' || options.quick ||
        (action === 'init' && !options.infer)) {
      throw usage('Feature creation needs --feature; init also needs --infer');
    }
    if (options.phase && (action !== 'init' || options.phase !== 'implement' || typeof options.reason !== 'string')) {
      throw usage('init requires --phase implement --reason R');
    }
    try {
      await readFile(withinRoot(root, path));
      throw new BatonError('E_CONFLICT', 'Feature baton already exists', 4);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    }
    const spec = `${featureDir}/spec.md`;
    let digest;
    try {
      digest = await hashFile(withinRoot(root, spec));
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
      return { errors: [{ code: 'E_MISSING_ARTIFACT', file: spec, message: 'The specification must exist before creating a feature baton' }], exitCode: 1 };
    }
    const { config: phases } = await loadPhases(root);
    const inferred = action === 'init';
    const now = new Date().toISOString();
    const next = options.phase === 'implement' ? 'implement' : 'clarify';
    const routing = resolveModel(await loadModelSettings(root), next, phases.phases[next].model_role);
    const data = {
      ...featureData(options.feature, next === 'implement' ? 'none' : 'specify', next, phases.phases[next].owner, now),
      status: inferred && next === 'clarify' ? 'needs-human' : 'ready',
      model_role: routing.role, suggested_model: routing.model,
      summary: inferred ? 'Confirm the inferred phase of the existing feature' : 'Specification ready for clarification',
      read_first: [{ path: spec, why: 'Specification and scope', sha256: digest }],
      artifacts: [{ path: spec, role: 'source-of-truth', sha256: digest }],
      open_questions: inferred && next === 'clarify' ? [{
        id: 'Q1', question: 'Is the existing specification complete and ready for clarification?',
        blocking: true, options: ['Continue with clarification', 'Revise specification first'],
      }] : [],
      gate: { required: next === 'implement', approved_by: null, approved_at: null },
      history: /** @type {Array<Record<string,any>>} */ (next === 'implement' ? [] : [{ phase: 'specify', at: now, by: 'baton', writer, commit: await commitId(root) }]),
    };
    if (options.phase === 'implement') {
      const supplied = typeof options['from-json'] === 'string' ? await readAgentJson(root, options['from-json']) : {};
      if (unexpectedFields(supplied, ['acceptance_checks', 'summary', 'read_first', 'assumptions', 'risks'])) {
        throw usage('Unexpected attachment fields');
      }
      if (supplied.read_first !== undefined && !Array.isArray(supplied.read_first)) throw usage('read_first must be an array');
      const artifacts = data.artifacts;
      for (const name of ['plan', 'tasks']) {
        const source = `${featureDir}/${name}.md`;
        try {
          artifacts.push({ path: source, role: 'source-of-truth', sha256: await hashFile(withinRoot(root, source)) });
        } catch (error) {
          if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
          return { errors: [{ code: 'E_MISSING_ARTIFACT', file: source, message: 'Attachment source is missing' }], exitCode: 1 };
        }
      }
      const base = await fullCommitId(root, ['merge-base', 'HEAD', 'origin/HEAD']);
      if (!base) throw new BatonError('E_CHECK_FAILED', 'Cannot resolve delivery base with origin/HEAD', 1);
      const tasks = await readFile(withinRoot(root, artifacts[2].path), 'utf8');
      Object.assign(data, supplied, {
        summary: supplied.summary ?? options.reason,
        read_first: [
          ...artifacts.map((item) => ({ path: item.path, why: 'Imported source of truth', sha256: item.sha256 })),
          ...(supplied.read_first ?? []),
        ],
        decisions: [
          { id: 'D1', decision: 'Attach pre-Baton feature', rationale: options.reason, tag: 'attached', by: 'baton',
            'x-attached-phase': 'implement', 'x-imported-head': await fullCommitId(root), 'x-delivery-base': base,
            'x-attached-at': now.slice(0, 10),
            'x-checked-tasks': [...tasks.matchAll(/^\s*-\s+\[[xX]\]\s+T\d{3}\b/gm)].length },
        ],
      });
      await recordDiffBase(root, data, 'Record delivery review base', 'Full delivery requires review', base);
    } else {
      data.exit_criteria = await evaluateChecks(phaseForLane(phases.phases.specify, 'feature').exit,
        (check) => evaluateBuiltIn(root, path, data, check));
    }
    const body = headingBody(data.next_owner);
    const errors = await validateHandoff(root, path, serializeFrontmatter(data, body));
    if (errors.length) return { errors, exitCode: 1 };
    await writeHandoff(root, path, data, body);
    return { data: { path, next_phase: data.next_phase, status: data.status } };
  }
  if (action === 'new') {
    if (typeof options.quick !== 'string' || typeof options.reason !== 'string' || options.feature) throw usage('new requires --quick <slug> --reason <why>');
    try {
      await readFile(withinRoot(root, path));
      throw new BatonError('E_CONFLICT', 'Quick baton already exists', 4);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    }
    const contract = (await loadPhases(root)).config.phases.work;
    const routing = resolveModel(await loadModelSettings(root), 'work', contract.model_role);
    const data = {
      baton: 1, lane: 'quick', feature: options.quick, phase_completed: 'none',
      next_phase: 'work', next_owner: contract.owner, status: 'ready',
      model_role: routing.role, suggested_model: routing.model,
      summary: `Quick-lane change: ${options.reason}`, read_first: [{ path, why: 'Quick-lane scope and reason' }],
      artifacts: [], entry_checked: [], exit_criteria: [], open_questions: [],
      decisions: [{ id: 'D1', decision: 'Start a quick lane', tag: 'quick-eligible', rationale: options.reason, by: 'baton' }],
      gate: { required: false, approved_by: null, approved_at: null }, history: [],
      updated_at: new Date().toISOString(), updated_by: 'baton',
    };
    const base = await fullCommitId(root);
    if (!base) throw new BatonError('E_CHECK_FAILED', 'Quick-lane review needs a git HEAD for its diff base', 1);
    await recordDiffBase(root, data, 'Record quick-lane review base', 'Work starts at this commit', base);
    await mkdir(dirname(withinRoot(root, path)), { recursive: true });
    await writeHandoff(root, path, data, headingBody('ce-work'));
    return { data: { path, next_phase: 'work' } };
  }
  if (action === 'migrate') {
    const { data } = await readHandoff(root, path);
    if (data.baton !== 1) throw new BatonError('E_SCHEMA', `No migration is available for baton schema ${data.baton}`, 1);
    return { data: { path, migrated: false, schema: 1 } };
  }
  if (action === 'receive') {
    if (typeof options.phase !== 'string') throw usage('receive requires --phase');
    if (options.phase === 'specify' && typeof options.quick === 'string') {
      const { data } = await readHandoff(root, path);
      const errors = await validateHandoff(root, path);
      if (data.lane !== 'quick' || data.status !== 'ready' || data.next_phase !== 'specify' ||
          !['work', 'review'].includes(data.phase_completed)) {
        errors.push({ code: 'E_TRANSITION', file: path, message: 'Quick baton must be escalated from work or review first' });
      }
      return { errors, data: errors.length ? null : { read_first: [{ path, why: 'Escalated quick-lane baton' }], do_not_read: [] },
        exitCode: errors.length ? 1 : 0 };
    }
    let handoff;
    try {
      handoff = await readHandoff(root, path);
    } catch (error) {
      if (options.phase !== 'specify' || /** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
      const source = options['from-quick'] ?? options['from-brainstorm'];
      if (typeof source === 'string') {
        if (options['from-quick']) {
          const parsed = await readHandoff(root, source);
          const errors = await validateHandoff(root, source);
          if (parsed.data.lane !== 'quick' || parsed.data.status !== 'ready' || parsed.data.next_phase !== 'specify' ||
              !['work', 'review'].includes(parsed.data.phase_completed)) {
            errors.push({ code: 'E_TRANSITION', file: source, message: 'Quick baton must be escalated from work or review first' });
          }
          if (errors.length) return { errors, exitCode: 1 };
        } else await readFile(withinRoot(root, source));
      }
      return { errors: [], data: { read_first: source ? [{ path: source, why: 'Source of the feature handoff' }] : [], do_not_read: [] }, exitCode: 0 };
    }
    const { data } = handoff;
    const errors = await validateHandoff(root, path);
    if (!errors.length) await verifyAttachment(root, data);
    if (selfReview(data, options.phase)) {
      errors.push({ code: 'E_SELF_REVIEW', file: path, message: 'End this session; start a fresh review session, or ask the repository owner to answer a self-review-override question' });
    }
    if (options.phase === 'land') {
      const reviewed = lastDecision(data, 'reviewed-tree');
      if (reviewed && reviewed['x-tree-sha256'] !== await reviewedTree(root, reviewed['x-base-commit'])) {
        errors.push({ code: 'E_STALE_REVIEW', file: path, message: 'Code changed after review; return to review before landing' });
      }
    }
    const { config: phases } = await loadPhases(root);
    const contract = phases.phases[options.phase];
    if (!contract) throw usage(`Unknown phase ${options.phase}`);
    if (!contract.lane.includes(data.lane)) errors.push({ code: 'E_LANE_MISMATCH', file: path, message: `${options.phase} does not accept ${data.lane} batons` });
    if (data.next_phase !== options.phase && !(options.phase === 'implement' && options.mode === 'converge' && data.phase_completed === 'implement')) {
      errors.push({ code: 'E_TRANSITION', file: path, message: `Expected ${data.next_phase}, received ${options.phase}` });
    }
    if (!errors.length) errors.push(...await entryErrors(root, path, data, contract, options.phase));
    return {
      errors,
      data: errors.length ? null : { read_first: data.read_first, do_not_read: data.do_not_read ?? [] },
      exitCode: errors.some((issue) => ['E_GATE_PENDING', 'E_BLOCKING_OPEN', 'E_ANALYSIS_CRITICAL', 'E_SELF_REVIEW'].includes(issue.code)) ? 3 : errors.length ? 1 : 0,
    };
  }
  if (action === 'escalate') {
    if (typeof options.quick !== 'string' || typeof options.reason !== 'string') throw usage('escalate requires --quick <slug> --reason');
    const { data, body } = await readHandoff(root, path);
    await requireApprovedSourcesFresh(root, path, data);
    if (data.lane !== 'quick' || !['work', 'review'].includes(data.phase_completed)) throw new BatonError('E_TRANSITION', 'Only a quick work or review can escalate', 1);
    data.next_phase = 'specify';
    data.next_owner = 'speckit-specify';
    data.model_role = 'planning';
    data.status = /** @type {Array<{blocking:boolean}>} */ (data.open_questions ?? []).some((item) => item.blocking) ? 'needs-human' : 'ready';
    addDecision(data, { decision: 'Escalate to feature lane', rationale: options.reason, tag: 'escalated', by: 'baton' });
    await record(data, 'baton', data.phase_completed, 'escalate');
    await updateMetadata(root, data, 'baton', 'specify');
    await writeHandoff(root, path, data, body);
    return { data: { command: '/speckit-specify', from_quick: path } };
  }
  if (action === 'answer') {
    if (typeof options.by !== 'string' || !answer) throw usage('answer requires --by <role>');
    const vocabulary = await gateVocabulary(root);
    if (!vocabulary.roles.includes(options.by)) throw new BatonError('E_APPROVER_FORMAT', 'Choose a configured role, not a personal identity', 2);
    const { data, body } = await readHandoff(root, path);
    await requireApprovedSourcesFresh(root, path, data);
    const index = /** @type {Array<{id:string,question:string,blocking:boolean,options?:string[]}>} */ (data.open_questions ?? []).findIndex((item) => item.id === answer.id);
    if (index < 0) throw usage(`Unknown question ${answer.id}`);
    const question = data.open_questions[index];
    if (question.options?.length && !question.options.includes(answer.choice)) throw usage('Choice must be one of the recorded options');
    const check = question['x-check'];
    if (check !== undefined && (!/** @type {Array<{id:string}>|undefined} */ (data.acceptance_checks)?.some((item) => item.id === check) ||
      typeof check !== 'string' || !/^AC-US[1-9]\d*-[1-9]\d*$/.test(check))) {
      throw usage('Waiver question must identify a registered acceptance check');
    }
    data.open_questions.splice(index, 1);
    addDecision(data, {
      decision: answer.choice, rationale: question.question,
      by: humanActor,
      ...(check && /^Waive\b/i.test(answer.choice) ? {
        tag: 'acceptance-waiver', 'x-check': check,
        'x-evidence-sha256': await hashFile(withinRoot(root, `${dirname(path)}/tasks.md`)),
      } : {}),
      ...(question['x-tag'] === 'self-review-override' && answer.choice === 'Allow self-review'
        ? { tag: 'self-review-override', 'x-implementation-cycle': data['x-implementation-cycle'] ??
          data.history?.filter((/** @type {{phase:string,'x-action'?:string}} */ item) => ['work', 'implement'].includes(item.phase) &&
            (!item['x-action'] || item['x-action'] === 'write')).at(-1)?.at } : {}),
    });
    data.status = /** @type {Array<{blocking:boolean}>} */ (data.open_questions).some((item) => item.blocking) ? 'needs-human' : 'ready';
    await updateMetadata(root, data, humanActor, data.next_phase);
    await record(data, humanActor, data.phase_completed, 'answer');
    await writeHandoff(root, path, data, body);
    return { data: { question: answer.id, status: data.status } };
  }
  if (action === 'write') {
    if (typeof options.phase !== 'string' || typeof options['from-json'] !== 'string') throw usage('write requires --phase and --from-json');
    const brainstorm = options['from-brainstorm'];
    const quick = options['from-quick'];
    if (brainstorm && quick) throw usage('Choose one source for the first feature handoff');
    if ((brainstorm || quick) && options.phase !== 'specify') {
      throw usage('Cross-source evidence requires specify');
    }
    let data;
    let body;
    let sourceQuick;
    if (brainstorm || quick) {
      try {
        await readFile(withinRoot(root, path));
        throw new BatonError('E_CONFLICT', 'The first feature handoff already exists', 4);
      } catch (error) {
        if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
      }
      const source = /** @type {string} */ (brainstorm ?? quick);
      if (brainstorm && !/^docs\/brainstorms\/[^/]+\.md$/.test(source)) {
        throw usage('Brainstorm source must be a document under docs/brainstorms');
      }
      if (quick && !/^\.baton\/quick\/[a-z0-9][a-z0-9-]{1,48}\.md$/.test(source)) {
        throw usage('Quick source must be a baton under .baton/quick');
      }
      if (quick) {
        const original = await readFile(withinRoot(root, source), 'utf8');
        const parsed = await readHandoff(root, source);
        const issues = await validateHandoff(root, source);
        if (issues.length || parsed.data.lane !== 'quick' || parsed.data.status !== 'ready' ||
            parsed.data.next_phase !== 'specify' || !['work', 'review'].includes(parsed.data.phase_completed)) {
          return { errors: issues.length ? issues : [{ code: 'E_TRANSITION', file: source, message: 'Quick baton must be escalated from work or review first' }], exitCode: 1 };
        }
        sourceQuick = { source, original, ...parsed };
      }
      const digest = await hashFile(withinRoot(root, source));
      const now = new Date().toISOString();
      const origin = sourceQuick?.data.phase_completed ?? 'brainstorm';
      data = {
        ...featureData(basename(dirname(path)), origin, 'specify', 'speckit-specify', now),
        read_first: [{ path: source, why: 'Source of the feature handoff' }],
        artifacts: [{ path: source, role: 'evidence', sha256: digest }],
        history: sourceQuick?.data.history?.length
          ? [structuredClone(sourceQuick.data.history.at(-1))]
          : [{ phase: 'brainstorm', at: now, by: 'ce-brainstorm', commit: null }],
      };
      body = headingBody('speckit-specify');
    } else {
      try {
        ({ data, body } = await readHandoff(root, path));
      } catch (error) {
        if (options.phase !== 'specify' ||
            /** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
        const spec = `${featureDir}/spec.md`;
        let digest;
        try {
          digest = await hashFile(withinRoot(root, spec));
        } catch (missing) {
          if (/** @type {NodeJS.ErrnoException} */ (missing).code !== 'ENOENT') throw missing;
          return { errors: [{ code: 'E_MISSING_ARTIFACT', file: spec, message: 'Specification must exist before the first handoff' }], exitCode: 1 };
        }
        data = {
          ...featureData(basename(dirname(path)), 'none', 'specify', 'speckit-specify', new Date().toISOString()),
          read_first: [{ path: spec, why: 'Specification and scope', sha256: digest }],
          artifacts: [{ path: spec, role: 'source-of-truth', sha256: digest }],
        };
        body = headingBody('speckit-specify');
      }
    }
    const { config: phases, errors } = await loadPhases(root);
    if (errors.length) return { errors, exitCode: 1 };
    const contract = phases.phases[options.phase];
    if (!contract || !contract.lane.includes(data.lane)) throw new BatonError('E_LANE_MISMATCH', `Phase ${options.phase} does not accept ${data.lane}`, 1);
    if (data.next_phase !== options.phase &&
        !(options.phase === 'implement' && options.mode === 'converge' && data.phase_completed === 'implement')) {
      throw new BatonError('E_TRANSITION', `Expected ${data.next_phase}, not ${options.phase}`, 1);
    }
    if (selfReview(data, options.phase)) {
      return { errors: [{ code: 'E_SELF_REVIEW', file: path, message: 'End this session; start a fresh review session or request a human self-review-override' }], exitCode: 3 };
    }
    if (options.phase === 'land') {
      const reviewed = lastDecision(data, 'reviewed-tree');
      if (reviewed && reviewed['x-tree-sha256'] !== await reviewedTree(root, reviewed['x-base-commit'])) {
        return { errors: [{ code: 'E_STALE_REVIEW', file: path, message: 'Code changed after review; return to review before landing' }], exitCode: 1 };
      }
    }
    const preflight = await entryErrors(root, path, data, contract, options.phase, true);
    if (preflight.length) {
      return { errors: preflight, exitCode: preflight.some((issue) => ['E_GATE_PENDING', 'E_BLOCKING_OPEN'].includes(issue.code)) ? 3 : 1 };
    }
    const supplied = await readAgentJson(root, options['from-json']);
    if (unexpectedFields(supplied, ['summary', 'read_first', 'do_not_read', 'artifacts', 'decisions', 'open_questions', 'assumptions', 'risks', 'acceptance_checks', 'review', 'analysis', 'pr'])) throw usage('Agent data contains unexpected or deterministic fields');
    if (options.phase !== 'review' && Object.hasOwn(supplied, 'review')) throw usage('Review findings can only be supplied during review');
    if (Array.isArray(supplied.artifacts)) {
      for (const item of supplied.artifacts) {
        const existing = data.artifacts?.find((/** @type {{path:string,role:string}} */ artifact) => artifact.path === item.path);
        if (existing && existing.role !== item.role) throw usage(`Artifact role cannot change: ${item.path}`);
      }
    }
    if (Object.hasOwn(supplied, 'acceptance_checks') && !['specify', 'clarify', 'plan', 'tasks'].includes(options.phase)) {
      appendOnly(data, 'acceptance_checks', supplied.acceptance_checks);
      delete supplied.acceptance_checks;
    }
    for (const field of ['decisions', 'open_questions', 'risks']) {
      if (Object.hasOwn(supplied, field)) {
        appendOnly(data, field, supplied[field]);
        delete supplied[field];
      }
    }
    Object.assign(data, supplied);
    if (brainstorm || quick) {
      const source = /** @type {string} */ (brainstorm ?? quick);
      const digest = await hashFile(withinRoot(root, source));
      data.artifacts = [...(data.artifacts ?? []).filter((/** @type {{path:string}} */ item) => item.path !== source),
        { path: source, role: 'evidence', sha256: digest }];
      if (!data.read_first?.length) data.read_first = [{ path: source, why: 'Source of the feature handoff' }];
    }
    if (typeof options['analysis-from'] === 'string') {
      if (options.phase !== 'analyze' || data.lane !== 'feature') throw usage('--analysis-from requires feature analyze');
      if (!data.analysis || !Number.isInteger(data.analysis.critical) || !Number.isInteger(data.analysis.high)) {
        throw usage('Agent data must provide explicit analysis critical/high counts');
      }
      const destination = `${featureDir}/analysis.md`;
      await copyFile(withinRoot(root, options['analysis-from']), withinRoot(root, destination));
      data.analysis.report_path = destination;
    }
    if (options.phase === 'review') {
      const findingsPath = data.review?.findings_path;
      if (typeof findingsPath !== 'string') {
        return { errors: [{ code: 'E_REVIEW_MISSING', file: path, message: 'Review findings path is required' }], exitCode: 1 };
      }
      const canonical = data.lane === 'quick'
        ? `.baton/quick/${data.feature}.review.json` : `${featureDir}/review.json`;
      if (findingsPath !== canonical) {
        throw usage(`Review findings_path must be ${canonical}`);
      }
      let findings;
      try {
        findings = JSON.parse(await readFile(withinRoot(root, findingsPath), 'utf8'));
      } catch (error) {
        return { errors: [{ code: 'E_REVIEW_MISSING', file: findingsPath, message: error instanceof Error ? error.message : String(error) }], exitCode: 1 };
      }
      if (!Array.isArray(findings.findings)) {
        return { errors: [{ code: 'E_REVIEW_MISSING', file: findingsPath, message: 'Review findings must be an array' }], exitCode: 1 };
      }
      const valid = await evaluateBuiltIn(root, path, data, { id: 'findings-json-valid' });
      if (!valid.met) return { errors: [{ code: 'E_REVIEW_MISSING', file: findingsPath, message: valid.evidence }], exitCode: 1 };
      data.review.blocking_findings = findings.findings.filter((/** @type {{severity:string,disposition:string}} */ item) =>
        ['P0', 'P1'].includes(item.severity) && item.disposition === 'open').length;
      const previousBase = lastDecision(data, 'diff-base')?.['x-base-commit'];
      addDecision(data, {
        decision: 'Record reviewed code tree',
        rationale: 'Land must use the exact code inspected by review', tag: 'reviewed-tree',
        'x-tree-sha256': await reviewedTree(root, previousBase), ...(previousBase ? { 'x-base-commit': previousBase } : {}),
        by: 'baton',
      });
    }
    const next = options.phase === 'review' && data.review.blocking_findings > 0
      ? data.lane === 'quick' ? 'work' : 'implement'
      : typeof options.next === 'string' ? options.next : phaseForLane(contract, data.lane).next[0];
    if (!phaseForLane(contract, data.lane).next.includes(next)) throw new BatonError('E_TRANSITION', `Cannot transition ${options.phase} to ${next}`, 1);
    if (options.phase === 'specify' && next === 'plan' && /\[NEEDS CLARIFICATION/i.test(await readFile(withinRoot(root, `${dirname(path)}/spec.md`), 'utf8'))) {
      throw new BatonError('E_TRANSITION', 'Clarification markers require the clarify phase', 1);
    }
    data.phase_completed = options.phase;
    data.next_phase = next;
    data.next_owner = next === 'done' ? 'none' : phases.phases[next].owner;
    data.model_role = next === 'done' ? contract.model_role : phases.phases[next].model_role;
    data.gate = { required: contract.human_gate || (options.phase === 'specify' && next === 'plan'), approved_by: null, approved_at: null };
    data.status = next === 'done' ? 'done' : /** @type {Array<{blocking:boolean}>} */ (data.open_questions ?? []).some((item) => item.blocking) ? 'needs-human' : 'ready';
    if (options.phase === 'analyze' && next === 'implement' || options.phase === 'review') {
      await recordDiffBase(root, data, 'Record reviewed implementation base',
        options.phase === 'analyze' ? 'Implementation starts at this commit' : 'Review completed at this commit');
    }
    await updateMetadata(root, data, contract.owner, next, path);
    const policy = modelPolicyIssue(await loadModelSettings(root), data.suggested_model, path);
    if (policy?.code === 'E_MODEL_NOT_ALLOWED') return { errors: [policy], exitCode: 1 };
    const exitChecks = phaseForLane(contract, data.lane).exit.filter((check) =>
      options.phase !== 'review' || next === 'land' ||
      !['findings-fixed-or-dismissed', 'findings-mapped-to-tasks-or-dismissed'].includes(check.id));
    const results = await evaluateChecks(exitChecks, (check) => evaluateBuiltIn(root, path, data, check));
    data.exit_criteria = results;
    const actor = typeof options.by === 'string' ? options.by : 'baton';
    if (!actorRole(actor, await gateVocabulary(root)) || actor.startsWith('human:')) {
      throw new BatonError('E_ACTOR_FORMAT', 'Write actor must be an agent identifier, not a human role', 2);
    }
    if (['implement', 'work'].includes(options.phase)) {
      data['x-implementation-writer'] = writer;
      if (worktree) data['x-implementation-worktree'] = worktree;
      data['x-implementation-cycle'] = hashBytes(`${writer}:${worktree}:${new Date().toISOString()}:${data.history?.length ?? 0}`);
    }
    await record(data, actor, options.phase);
    const unmet = results.filter((item) => !item.met).map((item) => ({ code: item.id === 'quick-scope-held' ? 'E_LANE_ESCALATE' : 'E_EXIT_UNMET', file: path,
      message: `${item.id}: ${item.evidence}${item.members ? ` (${item.members.map((member) => `${member.id}=${member.met}`).join(', ')})` : ''}` }));
    if (unmet.length) return { errors: unmet, data: { path, next_phase: next, exit_criteria: results } };
    const validation = await validateHandoff(root, path, serializeFrontmatter(data, body));
    if (validation.length) return { errors: validation, data: { path, next_phase: next, exit_criteria: results } };
    if (sourceQuick) {
      const closed = structuredClone(sourceQuick.data);
      closed.status = 'done';
      closed.next_phase = 'done';
      closed.next_owner = 'none';
      closed.decisions.push({
        id: nextId(closed.decisions, 'D'), decision: `Escalated into ${featureDir}`,
        rationale: 'The first feature handoff recorded the quick-lane evidence',
        tag: 'escalated', by: 'baton',
      });
      closed.updated_at = new Date().toISOString();
      closed.updated_by = 'baton';
      let saved = false;
      try {
        await writeHandoff(root, sourceQuick.source, closed, sourceQuick.body);
        for (const item of [...data.read_first, ...data.artifacts]) {
          if (item.path === sourceQuick.source && item.sha256) item.sha256 = await hashFile(withinRoot(root, sourceQuick.source));
        }
        const closedValidation = await validateHandoff(root, sourceQuick.source);
        const featureValidation = await validateHandoff(root, path, serializeFrontmatter(data, body));
        if (closedValidation.length || featureValidation.length) {
          return { errors: [...closedValidation, ...featureValidation], data: { path, next_phase: next } };
        }
        await writeHandoff(root, path, data, body);
        saved = true;
      } finally {
        if (!saved) await writeFile(withinRoot(root, sourceQuick.source), sourceQuick.original);
      }
      return { errors: [], data: { path, next_phase: next, exit_criteria: results } };
    }
    await writeHandoff(root, path, data, body);
    return { errors: unmet, warnings: policy ? [policy] : [], data: { path, next_phase: next, exit_criteria: results } };
  }
  if (action === 'approve') {
    if (typeof options.by !== 'string') throw usage('approve requires --by <role>');
    const vocabulary = await gateVocabulary(root);
    const approvedBy = `${options.by}${options.via ? ` via ${options.via}` : ''}`;
    if (!approvedRole(approvedBy, vocabulary)) throw new BatonError('E_APPROVER_FORMAT', 'Choose a configured role and channel, never a personal handle', 2);
    const date = typeof options.at === 'string' ? options.at : new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
      throw usage('--at must be a valid YYYY-MM-DD date');
    }
    const { data, body } = await readHandoff(root, path);
    if (!data.gate?.required) throw new BatonError('E_GATE_PENDING', 'This transition does not require approval');
    if (data.gate.approved_by) throw new BatonError('E_GATE_PENDING', 'This gate has already been approved');
    const initialAttachment = data.phase_completed === 'none' && attachment(data);
    if (initialAttachment) {
      const errors = await validateHandoff(root, path);
      if (errors.length) return { errors, exitCode: 1 };
      await verifyAttachment(root, data);
    }
    data.gate.approved_by = approvedBy;
    data.gate.approved_at = date;
    data.updated_at = new Date().toISOString();
    data.updated_by = humanActor;
    if (initialAttachment) {
      addDecision(data, {
        tag: 'attach-approved', decision: 'Approve source snapshot',
        rationale: 'Fresh implement gate', by: data.updated_by,
        'x-sources': attachmentSources(data),
        'x-imported-head': initialAttachment['x-imported-head'],
      });
      const errors = await validateHandoff(root, path, serializeFrontmatter(data, body));
      if (errors.length) throw new BatonError('E_TRANSITION', 'Invalid attachment approval', 1);
    }
    await record(data, data.updated_by, data.phase_completed, 'approve');
    await writeHandoff(root, path, data, body);
    return { data: { gate: data.gate } };
  }
  if (action === 'refresh') {
    if (typeof options.reason !== 'string') throw usage('refresh requires --reason');
    const { data, body } = await readHandoff(root, path);
    let sourceChanged = false;
    for (const item of [...(data.read_first ?? []), ...(data.artifacts ?? [])]) {
      if (item.path === path) {
        delete item.sha256;
        continue;
      }
      const current = await hashFile(withinRoot(root, item.path));
      if (!item.sha256 || item.sha256 !== current) sourceChanged = true;
      item.sha256 = current;
    }
    const initialAttachment = data.phase_completed === 'none' && attachment(data);
    if ((sourceChanged || initialAttachment) && data.gate?.required) {
      data.gate.approved_by = null;
      data.gate.approved_at = null;
      if (initialAttachment) data.decisions = data.decisions.filter((/** @type {{tag?:string}} */ d) => d.tag !== 'attach-approved');
    }
    const id = addDecision(data, { decision: 'Artifact hashes refreshed after intentional edit', rationale: options.reason, by: 'implementation-session' });
    data.updated_at = new Date().toISOString();
    data.updated_by = 'implementation-session';
    await record(data, 'implementation-session', data.phase_completed, 'refresh');
    await writeHandoff(root, path, data, body);
    return { data: { decision: id } };
  }
  if (action === 'show' || action === 'next') {
    const { data } = await readHandoff(root, path);
    if (action === 'show') return { data };
    const routing = resolveModel(await loadModelSettings(root), data.next_phase, data.model_role);
    const command = `/${data.next_owner}`;
    const questions = /** @type {Array<{id:string,blocking:boolean}>} */ (data.open_questions ?? [])
      .filter((question) => question.blocking).map((question) => question.id);
    const gatePending = data.gate?.required && !data.gate.approved_by;
    const blocked = Boolean(gatePending || questions.length || data.status === 'needs-human');
    return { data: { command, role: routing.role, model: routing.model,
      status: data.status, gate: { required: data.gate?.required ?? false, approved_by: data.gate?.approved_by ?? null },
      blocking_questions: questions, blocked,
      instruction: questions.length ? `Show baton handoff answer ${questions[0]} <choice> --by <role> to an authorized human and wait before ${command}`
        : gatePending ? `Show baton handoff approve --by <role> to an authorized human and wait before ${command}`
          : data.next_phase === 'review' ? 'End this session; start a fresh review session in a separate checkout, then run /baton-review'
          : routing.model ? `Switch model to ${routing.model}, then run ${command}` : `Run ${command} (inherit current model)` } };
  }
  if (action === 'scope') {
    const { data } = await readHandoff(root, path);
    if (attachment(data)) {
      const errors = await validateHandoff(root, path);
      if (errors.length) return { errors, exitCode: 1 };
      await verifyAttachment(root, data);
    }
    const recorded = lastDecision(data, 'diff-base')?.['x-base-commit'];
    const { base } = await reviewBase(root, data);
    if (!recorded || base !== recorded) throw new BatonError('E_CHECK_FAILED', 'Review requires a reachable recorded diff base', 1);
    const files = await changedFiles(root, { base, subject: true });
    if (!files) throw new BatonError('E_CHECK_FAILED', 'Cannot enumerate review scope', 1);
    return { data: { base, files: files.filter((file) => !(data.lane === 'feature' && file.startsWith(`${featureDir}/`))).sort() } };
  }
  throw usage(`Unsupported handoff action: ${action}`);
}
