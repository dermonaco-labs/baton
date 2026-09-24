import { readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter.mjs';
import { loadSchemas, validateSchema } from './schema.mjs';
import { withinRoot } from './manifest.mjs';
import { hashFile } from './hash.mjs';
import { loadPhases, phaseForLane, checkKey } from './phases.mjs';
import { scanPersonalData, denylistTerms } from './denylist.mjs';

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

/** @param {string} root @param {string} path @param {unknown} model */
export async function modelPolicyIssue(root, path, model) {
  if (typeof model !== 'string' || !model) return null;
  let config;
  try {
    const { default: YAML } = await import('yaml');
    config = YAML.parse(await readFile(withinRoot(root, '.baton/config.yml'), 'utf8'));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return null;
    throw error;
  }
  const { allowed, enforce } = config.models ?? {};
  if (!Array.isArray(allowed) || !allowed.length || enforce === 'off' || allowed.includes(model)) return null;
  return {
    code: enforce === 'error' ? 'E_MODEL_NOT_ALLOWED' : 'W_MODEL_NOT_ALLOWED',
    file: path, message: `Suggested model ${model} is not in models.allowed`,
  };
}

/** @param {string} root @param {string} path @param {string} [source] */
export async function validateHandoff(root, path, source) {
  /** @type {Array<{code:string,file:string,message:string,pointer?:string,fix?:string}>} */
  const errors = [];
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
    errors.push({ code: 'E_APPROVER_FORMAT', file: path, message: 'Approval must use a configured role and channel' });
  }
  if ((approver == null) !== (data.gate?.approved_at == null)) {
    errors.push({ code: 'E_APPROVER_FORMAT', file: path, message: 'Approval role and date must be set together' });
  }
  const actors = [data.updated_by, .../** @type {Array<{by:string}>} */ (data.decisions ?? []).map((entry) => entry.by), .../** @type {Array<{by:string}>} */ (data.history ?? []).map((entry) => entry.by)];
  if (actors.some((actor) => typeof actor !== 'string' || !actorRole(actor, vocabulary))) {
    errors.push({ code: 'E_ACTOR_FORMAT', file: path, message: 'An actor is not a configured role or agent identifier' });
  }
  errors.push(...validateSchema(schemas, 'handoff', data)
    .filter((entry) => !(
      ((entry.pointer.startsWith('/gate/approved_by') || entry.pointer.startsWith('/gate/approved_at')) &&
        errors.some((issue) => issue.code === 'E_APPROVER_FORMAT')) ||
      ((entry.pointer === '/updated_by' || /^\/(?:decisions|history)\/\d+\/by$/.test(entry.pointer)) &&
        errors.some((issue) => issue.code === 'E_ACTOR_FORMAT'))
    ))
    .map((entry) => ({ ...entry, file: path })));
  const frontmatter = source ? source.slice(0, source.indexOf('\n---', 4)) : serializeFrontmatter(data, '');
  errors.push(...scanPersonalData(frontmatter, { frontmatter: true, terms }).map((entry) => ({ ...entry, file: path })));
  errors.push(...scanPersonalData(body, { terms }).map((entry) => ({ ...entry, file: path })));

  const positions = headings.map((heading) => body.indexOf(heading));
  if (positions.some((index) => index < 0) || positions.some((index, position) => position && index <= positions[position - 1])) {
    errors.push({ code: 'E_BODY_SECTIONS', file: path, message: 'Body headings must appear in the required order' });
  }
  if ((data.read_first?.length ?? 0) > phases.budgets.read_first_max || body.split('\n').length > phases.budgets.body_max_lines) {
    errors.push({ code: 'E_BUDGET', file: path, message: 'Handoff exceeds the context budget' });
  }
  if (data.status === 'ready' && /** @type {Array<{blocking:boolean}>} */ (data.open_questions ?? []).some((question) => question.blocking)) {
    errors.push({ code: 'E_BLOCKING_OPEN', file: path, message: 'Blocking questions require needs-human status' });
  }
  if (data.status === 'ready' && /** @type {Array<{met:boolean}>} */ (data.exit_criteria ?? []).some((check) => !check.met)) {
    errors.push({ code: 'E_EXIT_UNMET', file: path, message: 'Ready handoff has unmet exit criteria' });
  }
  const modelIssue = await modelPolicyIssue(root, path, data.suggested_model);
  if (modelIssue?.code === 'E_MODEL_NOT_ALLOWED') errors.push(modelIssue);
  const completed = phases.phases[data.phase_completed];
  const target = phases.phases[data.next_phase];
  if (completed && !phaseForLane(completed, data.lane).next.includes(data.next_phase) &&
    !(data.lane === 'quick' && data.status === 'done' && data.next_phase === 'done' &&
      ['work', 'review'].includes(data.phase_completed) && decisionsHaveTag(data.decisions, 'escalated'))) {
    errors.push({ code: 'E_TRANSITION', file: path, message: 'Next phase is not an allowed transition' });
  }
  if (target && !target.lane.includes(data.lane) && !(data.lane === 'quick' && data.next_phase === 'specify' &&
    decisionsHaveTag(data.decisions, 'quick-eligible'))) {
    errors.push({ code: 'E_LANE_MISMATCH', file: path, message: `${data.next_phase} does not accept the ${data.lane} lane` });
  }
  if (data.next_phase !== 'done' && target?.owner !== data.next_owner) {
    errors.push({ code: 'E_OWNER', file: path, message: 'Next owner does not match the phase contract' });
  }
  if (completed && data.status === 'ready') {
    const criteria = phaseForLane(completed, data.lane).exit;
    for (const check of criteria) {
      if (!/** @type {Array<{id:string,met:boolean}>} */ (data.exit_criteria ?? []).some((item) => item.id === checkKey(check) && item.met)) {
        errors.push({ code: 'E_EXIT_UNMET', file: path, message: `${checkKey(check)} lacks successful exit evidence` });
      }
    }
  }
  if (data.lane === 'feature') {
    const directory = dirname(withinRoot(root, path));
    const batons = (await readdir(directory)).filter((name) => /^handoff(?:[.-][^/]+)?\.md$/.test(name));
    if (batons.length > 1) errors.push({ code: 'E_MULTIPLE_BATONS', file: path, message: `Found ${batons.length} feature handoffs` });
  }
  const refs = [...(data.read_first ?? []), ...(data.artifacts ?? [])];
  for (const ref of refs) {
    try {
      const digest = await hashFile(withinRoot(root, ref.path));
      if (ref.sha256 && ref.sha256 !== digest) {
        errors.push({ code: 'E_STALE_ARTIFACT', file: ref.path, message: 'Artifact checksum differs from the recorded hash' });
      }
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') errors.push({ code: 'E_MISSING_ARTIFACT', file: ref.path, message: 'Required handoff artifact is absent' });
      else throw error;
    }
  }
  if (data.phase_completed === 'analyze') {
    if (!data.analysis?.report_path || !await artifactExists(root, data.analysis.report_path)) errors.push({ code: 'E_ANALYSIS_MISSING', file: path, message: 'Analysis report is required' });
    if (data.analysis?.critical > 0) errors.push({ code: 'E_ANALYSIS_CRITICAL', file: path, message: 'Analysis has critical findings' });
  }
  if (data.phase_completed === 'review') {
    if (!data.review?.findings_path || !await artifactExists(root, data.review.findings_path)) {
      errors.push({ code: 'E_REVIEW_MISSING', file: path, message: 'Review findings file is required' });
    } else {
      try {
        const findings = JSON.parse(await readFile(withinRoot(root, data.review.findings_path), 'utf8'));
        if (validateSchema(schemas, 'findings', findings).length) errors.push({ code: 'E_REVIEW_MISSING', file: data.review.findings_path, message: 'Review findings are invalid' });
      } catch (error) {
        if (error instanceof SyntaxError) errors.push({ code: 'E_REVIEW_MISSING', file: data.review.findings_path, message: error.message });
        else throw error;
      }
    }
  }
  if (data.phase_completed === 'land' && !data.pr?.url) {
    errors.push({ code: 'E_PR_MISSING', file: path, message: 'Landing must record a PR URL' });
  }
  if (data.next_phase === 'implement') {
    const stories = new Set(/** @type {Array<{story:string}>} */ (data.acceptance_checks ?? []).map((check) => check.story));
    const tasksPath = withinRoot(root, `${dirname(path)}/tasks.md`);
    try {
      const tasks = await readFile(tasksPath, 'utf8');
      for (const story of new Set([...tasks.matchAll(/\[US(\d+)\]/g)].map((match) => `US${match[1]}`))) {
        if (!stories.has(story)) errors.push({ code: 'E_NO_PREREG', file: path, message: `${story} lacks pre-registered acceptance checks` });
      }
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
      errors.push({ code: 'E_MISSING_ARTIFACT', file: tasksPath, message: 'Tasks are required for implement' });
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
