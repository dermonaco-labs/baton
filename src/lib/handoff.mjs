import { readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter.mjs';
import { loadSchemas, validateSchema } from './schema.mjs';
import { withinRoot } from './manifest.mjs';
import { hashFile } from './hash.mjs';
import { loadPhases, phaseForLane, checkKey } from './phases.mjs';
import { scanPersonalData, denylistTerms } from './denylist.mjs';
import { loadModelSettings, modelPolicyIssue } from './models.mjs';

const headings = ['## Goal', '## What changed', '## Next steps', '## Watch out for'];
const defaultRoles = ['repository owner', 'maintainer', 'reviewer', 'release manager', 'security lead'];
const defaultChannels = ['direct approval', 'control-plane delegation', 'pull request review'];
const word = '[a-z]+(?:-[a-z]+)*';
const approverPattern = new RegExp(`^${word}(?: ${word}){0,3}(?: via ${word}(?: ${word}){0,3})?$`);
const actorPattern = /^(?:human:[a-z]+(?:-[a-z]+)*|[a-z][a-z0-9-]{1,63})$/;

/** @param {string} root @param {string} path */
export async function readHandoff(root, path) {
  return parseFrontmatter(await readFile(withinRoot(root, path), 'utf8'));
}

/** @param {string} root @param {string} path @param {Record<string, unknown>} data @param {string} body */
export async function writeHandoff(root, path, data, body) {
  await writeFile(withinRoot(root, path), serializeFrontmatter(data, body));
}

/** @param {string} root */
export async function gateVocabulary(root) {
  try {
    const { default: YAML } = await import('yaml');
    const config = YAML.parse(await readFile(withinRoot(root, '.baton/config.yml'), 'utf8'));
    return {
      roles: config.gates?.approver_roles ?? defaultRoles,
      channels: config.gates?.approval_channels ?? defaultChannels,
    };
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    return { roles: defaultRoles, channels: defaultChannels };
  }
}

/** @param {string} value @param {{roles:string[],channels:string[]}} vocabulary */
export function approvedRole(value, vocabulary) {
  if (!approverPattern.test(value)) return false;
  const [role, channel] = value.split(' via ');
  return vocabulary.roles.includes(role) && (!channel || vocabulary.channels.includes(channel));
}

/** @param {string} value @param {{roles:string[]}} vocabulary */
export function actorRole(value, vocabulary) {
  if (!actorPattern.test(value)) return false;
  return !value.startsWith('human:') || vocabulary.roles.some((role) => `human:${role.replaceAll(' ', '-')}` === value);
}

/** @param {Record<string,any>} data */
export function attachmentSources(data) {
  return (data.artifacts ?? []).filter((/** @type {{role:string}} */ item) => item.role === 'source-of-truth')
    .map((/** @type {{path:string,sha256?:string}} */ item) => ({ path: item.path, sha256: item.sha256 }));
}

/** @param {string} root @param {string} path @param {string} [source] */
export async function validateHandoff(root, path, source) {
  /** @type {Array<{code:string,file:string,message:string,pointer?:string,fix?:string}>} */
  const errors = [];
  /** @param {string} code @param {string} message @param {string} [file] */
  const issue = (code, message, file = path) => errors.push({ code, file, message });
  let parsed;
  try {
    parsed = parseFrontmatter(source ?? await readFile(withinRoot(root, path), 'utf8'));
  } catch (error) {
    return [{
      code: error instanceof Error && error.message.startsWith('E_FRONTMATTER_MALFORMED') ? 'E_FRONTMATTER_MALFORMED' : 'E_MISSING_ARTIFACT',
      file: path,
      message: error instanceof Error ? error.message : String(error),
    }];
  }
  const { data, body } = parsed;
  const schemas = await loadSchemas(root);
  const { config: phases, errors: phaseErrors } = await loadPhases(root);
  errors.push(...phaseErrors);
  const terms = await denylistTerms(root);
  const vocabulary = await gateVocabulary(root);
  const approver = data.gate?.approved_by;
  if (approver !== null && approver !== undefined && (typeof approver !== 'string' || !approvedRole(approver, vocabulary))) {
    issue('E_APPROVER_FORMAT', 'Approval must use a configured role and channel');
  }
  if ((approver == null) !== (data.gate?.approved_at == null)) {
    issue('E_APPROVER_FORMAT', 'Approval role and date must be set together');
  }
  const actors = [data.updated_by, .../** @type {Array<{by:string}>} */ (data.decisions ?? []).map((entry) => entry.by), .../** @type {Array<{by:string}>} */ (data.history ?? []).map((entry) => entry.by)];
  if (actors.some((actor) => typeof actor !== 'string' || !actorRole(actor, vocabulary))) {
    issue('E_ACTOR_FORMAT', 'An actor is not a configured role or agent identifier');
  }
  errors.push(...validateSchema(schemas, 'handoff', data)
    .filter((entry) => !(
      ((entry.pointer.startsWith('/gate/approved_by') || entry.pointer.startsWith('/gate/approved_at')) &&
        errors.some((issue) => issue.code === 'E_APPROVER_FORMAT')) ||
      ((entry.pointer === '/updated_by' || /^\/(?:decisions|history)\/\d+\/by$/.test(entry.pointer)) &&
        errors.some((issue) => issue.code === 'E_ACTOR_FORMAT'))
    ))
    .map((entry) => ({ ...entry, file: path })));
  const normalizedSource = source?.replace(/\r\n/g, '\n');
  const frontmatter = normalizedSource ? normalizedSource.slice(0, normalizedSource.indexOf('\n---', 4)) : serializeFrontmatter(data, '');
  errors.push(...scanPersonalData(frontmatter, { frontmatter: true, terms }).map((entry) => ({ ...entry, file: path })));
  errors.push(...scanPersonalData(body, { terms }).map((entry) => ({ ...entry, file: path })));

  const positions = headings.map((heading) => body.indexOf(heading));
  if (positions.some((index) => index < 0) || positions.some((index, position) => position && index <= positions[position - 1])) {
    issue('E_BODY_SECTIONS', 'Body headings must appear in the required order');
  }
  if ((data.read_first?.length ?? 0) > phases.budgets.read_first_max || body.split(/\r?\n/).length > phases.budgets.body_max_lines) {
    issue('E_BUDGET', 'Handoff exceeds the context budget');
  }
  if (data.status === 'ready' && /** @type {Array<{blocking:boolean}>} */ (data.open_questions ?? []).some((question) => question.blocking)) {
    issue('E_BLOCKING_OPEN', 'Blocking questions require needs-human status');
  }
  if (data.status === 'ready' && /** @type {Array<{met:boolean}>} */ (data.exit_criteria ?? []).some((check) => !check.met)) {
    issue('E_EXIT_UNMET', 'Ready handoff has unmet exit criteria');
  }
  if (data.history?.length && data.history.at(-1).phase !== data.phase_completed) {
    issue('E_TRANSITION', 'Latest history phase does not match the completed phase');
  }
  const attached = /** @type {Array<Record<string,any>>} */ (data.decisions ?? []).filter((decision) => decision.tag === 'attached');
  const provenance = attached[0];
  const approvals = /** @type {Array<Record<string,any>>} */ (data.decisions ?? []).filter((d) => d.tag === 'attach-approved');
  const initialAttachment = data.lane === 'feature' && data.phase_completed === 'none';
  const bases = /** @type {Array<Record<string,any>>} */ (data.decisions ?? []).filter((decision) => decision.tag === 'diff-base');
  if ((initialAttachment || attached.length > 0 || approvals.length > 0) &&
      (attached.length !== 1 || data.lane !== 'feature' || provenance.by !== 'baton' ||
        provenance['x-attached-phase'] !== 'implement' ||
        !['x-imported-head', 'x-delivery-base'].every((key) =>
          typeof provenance[key] === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(provenance[key])) ||
        !Number.isInteger(provenance['x-checked-tasks']) || provenance['x-checked-tasks'] < 0 ||
        (provenance['x-attached-at'] !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(provenance['x-attached-at'])) ||
        bases.length === 0 || !bases.every((decision) =>
          decision.by === 'baton' && decision['x-base-commit'] === provenance['x-delivery-base']) ||
        (initialAttachment && (data.next_phase !== 'implement' ||
          !Array.isArray(data.history) || data.history.length !== 0 || data.gate?.required !== true)))) {
    issue('E_TRANSITION', 'Invalid Baton implement attachment provenance or initial gate/history');
  }
  if (initialAttachment && approver != null) {
    const approval = approvals[0];
    const actor = `human:${String(approver).split(' via ')[0].replaceAll(' ', '-')}`;
    const sources = attachmentSources(data);
    if (!provenance || data.updated_by !== actor || approvals.length !== 1 ||
        approval.by !== actor || approval['x-imported-head'] !== provenance['x-imported-head'] ||
        !isDeepStrictEqual(approval['x-sources'], sources) ||
        sources.length !== 3 || sources.some((/** @type {{sha256?:string}} */ item) => !/^[a-f0-9]{64}$/i.test(item.sha256 ?? '')) ||
        (provenance['x-attached-at'] && data.gate.approved_at < provenance['x-attached-at'])) {
      issue('E_TRANSITION', 'Invalid or stale attachment approval evidence');
    }
  }
  const modelIssue = modelPolicyIssue(await loadModelSettings(root), data.suggested_model, path);
  if (modelIssue?.code === 'E_MODEL_NOT_ALLOWED') errors.push(modelIssue);
  const completed = phases.phases[data.phase_completed];
  const target = phases.phases[data.next_phase];
  if (completed && !phaseForLane(completed, data.lane).next.includes(data.next_phase) &&
    !(data.lane === 'quick' && data.status === 'done' && data.next_phase === 'done' &&
      ['work', 'review'].includes(data.phase_completed) && decisionsHaveTag(data.decisions, 'escalated'))) {
    issue('E_TRANSITION', 'Next phase is not an allowed transition');
  }
  if (target && !target.lane.includes(data.lane) && !(data.lane === 'quick' && data.next_phase === 'specify' &&
    decisionsHaveTag(data.decisions, 'quick-eligible'))) {
    issue('E_LANE_MISMATCH', `${data.next_phase} does not accept the ${data.lane} lane`);
  }
  if (data.next_phase !== 'done' && target?.owner !== data.next_owner) {
    issue('E_OWNER', 'Next owner does not match the phase contract');
  }
  if (completed && data.status === 'ready') {
    const criteria = phaseForLane(completed, data.lane).exit.filter((check) =>
      data.phase_completed !== 'review' || data.next_phase === 'land' ||
      !['findings-fixed-or-dismissed', 'findings-mapped-to-tasks-or-dismissed'].includes(check.id));
    for (const check of criteria) {
      if (!/** @type {Array<{id:string,met:boolean}>} */ (data.exit_criteria ?? []).some((item) => item.id === checkKey(check) && item.met)) {
        issue('E_EXIT_UNMET', `${checkKey(check)} lacks successful exit evidence`);
      }
    }
  }
  if (data.lane === 'feature') {
    const directory = dirname(withinRoot(root, path));
    const batons = (await readdir(directory)).filter((name) => /^handoff(?:[.-][^/]+)?\.md$/.test(name));
    if (batons.length > 1) issue('E_MULTIPLE_BATONS', `Found ${batons.length} feature handoffs`);
  }
  const refs = [...(data.read_first ?? []), ...(data.artifacts ?? [])];
  for (const ref of refs) {
    try {
      const digest = await hashFile(withinRoot(root, ref.path));
      if (ref.sha256 && ref.sha256 !== digest) {
        issue('E_STALE_ARTIFACT', 'Artifact checksum differs from the recorded hash', ref.path);
      }
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') issue('E_MISSING_ARTIFACT', 'Required handoff artifact is absent', ref.path);
      else throw error;
    }
  }
  if (data.phase_completed === 'analyze') {
    if (!data.analysis?.report_path || !await artifactExists(root, data.analysis.report_path)) issue('E_ANALYSIS_MISSING', 'Analysis report is required');
    if (data.analysis?.critical > 0) issue('E_ANALYSIS_CRITICAL', 'Analysis has critical findings');
  }
  if (data.phase_completed === 'review') {
    if (!data.review?.findings_path || !await artifactExists(root, data.review.findings_path)) {
      issue('E_REVIEW_MISSING', 'Review findings file is required');
    } else {
      try {
        const findings = JSON.parse(await readFile(withinRoot(root, data.review.findings_path), 'utf8'));
        if (validateSchema(schemas, 'findings', findings).length) issue('E_REVIEW_MISSING', 'Review findings are invalid', data.review.findings_path);
      } catch (error) {
        if (error instanceof SyntaxError) issue('E_REVIEW_MISSING', error.message, data.review.findings_path);
        else throw error;
      }
    }
  }
  if (data.phase_completed === 'land' && !data.pr?.url) {
    issue('E_PR_MISSING', 'Landing must record a PR URL');
  }
  if (data.next_phase === 'implement') {
    const stories = new Set(/** @type {Array<{story:string}|null>} */ (Array.isArray(data.acceptance_checks) ? data.acceptance_checks : []).map((check) => check?.story));
    const tasksPath = withinRoot(root, `${dirname(path)}/tasks.md`);
    try {
      const tasks = await readFile(tasksPath, 'utf8');
      for (const story of new Set([...tasks.matchAll(/\[US(\d+)\]/g)].map((match) => `US${match[1]}`))) {
        if (!stories.has(story)) issue('E_NO_PREREG', `${story} lacks pre-registered acceptance checks`);
      }
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
      issue('E_MISSING_ARTIFACT', 'Tasks are required for implement', tasksPath);
    }
  }
  const covered = [
    ['E_BLOCKING_OPEN', new Set(['/open_questions', '/status'])],
    ['E_EXIT_UNMET', new Set(['/exit_criteria'])],
    ['E_PR_MISSING', new Set(['/pr'])],
  ];
  return errors.filter((entry) => entry.code !== 'E_SCHEMA' || !covered.some(([code, pointers]) =>
    errors.some((issue) => issue.code === code) &&
    (/** @type {Set<string>} */ (pointers).has(entry.pointer ?? '') ||
      (entry.pointer === '/' && entry.message.includes('must match "then" schema')))));
}

/** @param {Array<{tag?:string}> | undefined} decisions @param {string} tag */
function decisionsHaveTag(decisions, tag) {
  return decisions?.some((decision) => decision.tag === tag) ?? false;
}

/** @param {string} root @param {string} path */
async function artifactExists(root, path) {
  try {
    await readFile(withinRoot(root, path));
    return true;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;
    throw error;
  }
}
