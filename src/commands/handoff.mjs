import { readFile, readdir, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import YAML from 'yaml';
import { BatonError } from '../lib/report.mjs';
import { readHandoff, writeHandoff, validateHandoff, gateVocabulary, approvedRole } from '../lib/handoff.mjs';
import { withinRoot } from '../lib/manifest.mjs';
import { hashFile } from '../lib/hash.mjs';
import { loadPhases, phaseForLane, evaluateChecks } from '../lib/phases.mjs';
import { evaluateBuiltIn } from '../lib/checks.mjs';
import { serializeFrontmatter } from '../lib/frontmatter.mjs';

const execFileAsync = promisify(execFile);
/** @param {string} next */
const headingBody = (next) => `## Goal\nKeep the work in scope.\n\n## What changed\nPending phase work.\n\n## Next steps\n1. \`/${next}\`\n\n## Watch out for\n- Escalate decisions that change behaviour or public contracts.\n`;
/** @param {string} root */
async function commitId(root) {
  try {
    return (await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, windowsHide: true })).stdout.trim();
  } catch (error) {
    if ([128, 'ENOENT'].includes(/** @type {{code?:number|string}} */ (error).code ?? '')) return null;
    throw error;
  }
}
/** @param {string} root @param {string} role */
async function suggestedModel(root, role) {
  try {
    const config = YAML.parse(await readFile(withinRoot(root, '.baton/config.yml'), 'utf8'));
    return config.models?.roles?.[role]?.model ?? null;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return null;
    throw error;
  }
}
/** @param {string} root @param {Record<string,any>} data @param {string} actor */
async function updateMetadata(root, data, actor) {
  data.updated_at = new Date().toISOString();
  data.updated_by = actor;
  data.suggested_model = await suggestedModel(root, data.model_role);
  for (const item of [...(data.read_first ?? []), ...(data.artifacts ?? [])]) {
    if (item.sha256) item.sha256 = await hashFile(withinRoot(root, item.path));
  }
}
/** @param {Array<{id:string}>} entries @param {string} prefix */
function nextId(entries, prefix) {
  return `${prefix}${Math.max(0, ...entries.map((item) => Number(new RegExp(`^${prefix}(\\d+)$`).exec(item.id)?.[1] ?? 0))) + 1}`;
}

/** @param {string[]} args */
function parseOptions(args) {
  /** @type {Record<string,string|boolean>} */
  const options = {};
  const values = new Set(['--feature', '--quick', '--phase', '--mode', '--by', '--via', '--at', '--reason', '--note', '--from-json', '--next', '--analysis-from', '--from-brainstorm', '--from-quick']);
  const switches = new Set(['--infer', '--dry-run']);
  for (let i = 0; i < args.length; i++) {
    if (values.has(args[i])) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new BatonError('E_USAGE', `${args[i]} needs a value`, 2);
      options[args[i].slice(2)] = args[++i];
    } else if (switches.has(args[i])) options[args[i].slice(2)] = true;
    else throw new BatonError('E_USAGE', `Unknown handoff flag: ${args[i]}`, 2);
  }
  return options;
}

/** @param {string} root @param {Record<string, string|boolean>} options */
async function locate(root, options) {
  if (options.quick && options.feature) throw new BatonError('E_USAGE', 'Use --quick or --feature, not both', 2);
  if (typeof options.quick === 'string') {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(options.quick)) throw new BatonError('E_USAGE', 'Quick slug must be kebab-case', 2);
    return `.baton/quick/${options.quick}.md`;
  }
  if (typeof options.feature === 'string') {
    if (!/^\d{3}-[a-z0-9-]+$/.test(options.feature)) throw new BatonError('E_USAGE', 'Feature name must be NNN-slug', 2);
    return `specs/${options.feature}/handoff.md`;
  }
  const entries = (await readdir(withinRoot(root, 'specs'), { withFileTypes: true })).filter((entry) => /^\d{3}-/.test(entry.name));
  if (entries.length !== 1) throw new BatonError('E_USAGE', 'Specify --feature NNN-slug when zero or multiple features exist', 2);
  return `specs/${entries[0].name}/handoff.md`;
}

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  const [action, ...raw] = args;
  if (!action) throw new BatonError('E_USAGE', 'handoff requires an action', 2);
  let rest = raw;
  let answer;
  if (action === 'answer') {
    if (raw.length < 2 || raw[0].startsWith('--') || raw[1].startsWith('--')) throw new BatonError('E_USAGE', 'answer needs a question ID and choice', 2);
    answer = { id: raw[0], choice: raw[1] };
    rest = raw.slice(2);
  }
  const options = parseOptions(rest);
  const path = await locate(root, options);
  if (action === 'new') {
    if (typeof options.quick !== 'string' || typeof options.reason !== 'string' || options.feature) throw new BatonError('E_USAGE', 'new requires --quick <slug> --reason <why>', 2);
    try {
      await readFile(withinRoot(root, path));
      throw new BatonError('E_CONFLICT', 'Quick baton already exists', 4);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    }
    const contract = (await loadPhases(root)).config.phases.work;
    const data = {
      baton: 1, lane: 'quick', feature: options.quick, phase_completed: 'none',
      next_phase: 'work', next_owner: contract.owner, status: 'ready',
      model_role: contract.model_role, suggested_model: await suggestedModel(root, contract.model_role),
      summary: `Quick-lane change: ${options.reason}`, read_first: [{ path, why: 'Quick-lane scope and reason' }],
      artifacts: [], entry_checked: [], exit_criteria: [], open_questions: [],
      decisions: [{ id: 'D1', decision: 'Start a quick lane', tag: 'quick-eligible', rationale: options.reason, by: 'baton' }],
      gate: { required: false, approved_by: null, approved_at: null }, history: [],
      updated_at: new Date().toISOString(), updated_by: 'baton',
    };
    await mkdir(dirname(withinRoot(root, path)), { recursive: true });
    await writeHandoff(root, path, data, headingBody('ce-work'));
    return { data: { path, next_phase: 'work' } };
  }
  if (action === 'receive') {
    if (typeof options.phase !== 'string') throw new BatonError('E_USAGE', 'receive requires --phase', 2);
    const { data } = await readHandoff(root, path);
    const errors = await validateHandoff(root, path);
    const { config: phases } = await loadPhases(root);
    const contract = phases.phases[options.phase];
    if (!contract) throw new BatonError('E_USAGE', `Unknown phase ${options.phase}`, 2);
    if (!contract.lane.includes(data.lane)) errors.push({ code: 'E_LANE_MISMATCH', file: path, message: `${options.phase} does not accept ${data.lane} batons` });
    if (data.next_phase !== options.phase && !(options.phase === 'implement' && options.mode === 'converge' && data.phase_completed === 'implement')) {
      errors.push({ code: 'E_TRANSITION', file: path, message: `Expected ${data.next_phase}, received ${options.phase}` });
    }
    if (data.gate?.required && !data.gate.approved_by) errors.push({ code: 'E_GATE_PENDING', file: path, message: 'Human approval is required before receiving this phase' });
    if (data.status === 'needs-human') errors.push({ code: 'E_BLOCKING_OPEN', file: path, message: 'A human decision is required' });
    if (!errors.length) {
      const checks = await evaluateChecks(phaseForLane(contract, data.lane).entry,
        (check) => evaluateBuiltIn(root, path, data, check));
      for (const check of checks.filter((item) => !item.met)) {
        const code = check.id === 'gate-approved' ? 'E_GATE_PENDING'
          : check.id.startsWith('fresh:') ? 'E_STALE_ARTIFACT'
          : check.id === 'acceptance-registered' ? 'E_NO_PREREG'
          : check.id === 'from-phase' || check.id === 'no-feature-tasks' ? 'E_TRANSITION'
          : check.id === 'no-blocking-questions' ? 'E_BLOCKING_OPEN' : 'E_MISSING_ARTIFACT';
        errors.push({ code, file: path, message: `${check.id} unmet: ${check.evidence}${check.members ? ` (${check.members.map((item) => `${item.id}: ${item.met}`).join(', ')})` : ''}` });
      }
    }
    return {
      errors,
      data: errors.length ? null : { read_first: data.read_first, do_not_read: data.do_not_read ?? [] },
      exitCode: errors.some((issue) => ['E_GATE_PENDING', 'E_BLOCKING_OPEN', 'E_ANALYSIS_CRITICAL'].includes(issue.code)) ? 3 : errors.length ? 1 : 0,
    };
  }
  if (action === 'escalate') {
    if (typeof options.quick !== 'string' || typeof options.reason !== 'string') throw new BatonError('E_USAGE', 'escalate requires --quick <slug> --reason', 2);
    const { data, body } = await readHandoff(root, path);
    if (data.lane !== 'quick' || !['work', 'review'].includes(data.phase_completed)) throw new BatonError('E_TRANSITION', 'Only a quick work or review can escalate', 1);
    data.next_phase = 'specify';
    data.next_owner = 'speckit-specify';
    data.model_role = 'planning';
    data.status = 'ready';
    data.decisions ??= [];
    data.decisions.push({ id: nextId(data.decisions, 'D'), decision: 'Escalate to feature lane', rationale: options.reason, tag: 'escalated', by: 'baton' });
    await updateMetadata(root, data, 'baton');
    await writeHandoff(root, path, data, body);
    return { data: { command: '/speckit-specify', from_quick: path } };
  }
  if (action === 'answer') {
    if (typeof options.by !== 'string' || !answer) throw new BatonError('E_USAGE', 'answer requires --by <role>', 2);
    const vocabulary = await gateVocabulary(root);
    if (!vocabulary.roles.includes(options.by)) throw new BatonError('E_APPROVER_FORMAT', 'Choose a configured role, not a personal identity', 2);
    const { data, body } = await readHandoff(root, path);
    const index = /** @type {Array<{id:string,question:string,blocking:boolean,options?:string[]}>} */ (data.open_questions ?? []).findIndex((item) => item.id === answer.id);
    if (index < 0) throw new BatonError('E_USAGE', `Unknown question ${answer.id}`, 2);
    const question = data.open_questions[index];
    if (question.options?.length && !question.options.includes(answer.choice)) throw new BatonError('E_USAGE', 'Choice must be one of the recorded options', 2);
    data.open_questions.splice(index, 1);
    data.decisions ??= [];
    data.decisions.push({ id: nextId(data.decisions, 'D'), decision: answer.choice, rationale: question.question, by: `human:${options.by.replaceAll(' ', '-')}` });
    data.status = /** @type {Array<{blocking:boolean}>} */ (data.open_questions).some((item) => item.blocking) ? 'needs-human' : 'ready';
    await updateMetadata(root, data, `human:${options.by.replaceAll(' ', '-')}`);
    await writeHandoff(root, path, data, body);
    return { data: { question: answer.id, status: data.status } };
  }
  if (action === 'write') {
    if (typeof options.phase !== 'string' || typeof options['from-json'] !== 'string') throw new BatonError('E_USAGE', 'write requires --phase and --from-json', 2);
    if (options['from-brainstorm'] || options['from-quick']) throw new BatonError('E_USAGE', 'Cross-source handoff evidence is not yet supported; no baton was changed', 2);
    const { data, body } = await readHandoff(root, path);
    const { config: phases, errors } = await loadPhases(root);
    if (errors.length) return { errors, exitCode: 1 };
    const contract = phases.phases[options.phase];
    if (!contract || !contract.lane.includes(data.lane)) throw new BatonError('E_LANE_MISMATCH', `Phase ${options.phase} does not accept ${data.lane}`, 1);
    if (data.next_phase !== options.phase) throw new BatonError('E_TRANSITION', `Expected ${data.next_phase}, not ${options.phase}`, 1);
    const supplied = JSON.parse(await readFile(withinRoot(root, options['from-json']), 'utf8'));
    const allowed = new Set(['summary', 'read_first', 'do_not_read', 'artifacts', 'decisions', 'open_questions', 'assumptions', 'risks', 'acceptance_checks', 'review', 'analysis', 'pr']);
    if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied) || Object.keys(supplied).some((key) => !allowed.has(key))) throw new BatonError('E_USAGE', 'Agent data contains unexpected or deterministic fields', 2);
    Object.assign(data, supplied);
    if (typeof options['analysis-from'] === 'string') {
      if (options.phase !== 'analyze' || data.lane !== 'feature') throw new BatonError('E_USAGE', '--analysis-from requires feature analyze', 2);
      if (!data.analysis || !Number.isInteger(data.analysis.critical) || !Number.isInteger(data.analysis.high)) {
        throw new BatonError('E_USAGE', 'Agent data must provide explicit analysis critical/high counts', 2);
      }
      const destination = `${dirname(path).replaceAll('\\', '/')}/analysis.md`;
      await copyFile(withinRoot(root, options['analysis-from']), withinRoot(root, destination));
      data.analysis.report_path = destination;
    }
    const next = typeof options.next === 'string' ? options.next : phaseForLane(contract, data.lane).next[0];
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
    await updateMetadata(root, data, contract.owner);
    const results = await evaluateChecks(phaseForLane(contract, data.lane).exit, (check) => evaluateBuiltIn(root, path, data, check));
    data.exit_criteria = results;
    data.history = [...(data.history ?? []), { phase: options.phase, at: data.updated_at, by: contract.owner, commit: await commitId(root) }].slice(-20);
    const unmet = results.filter((item) => !item.met).map((item) => ({ code: item.id === 'quick-scope-held' ? 'E_LANE_ESCALATE' : 'E_EXIT_UNMET', file: path,
      message: `${item.id}: ${item.evidence}${item.members ? ` (${item.members.map((member) => `${member.id}=${member.met}`).join(', ')})` : ''}` }));
    if (unmet.length) return { errors: unmet, data: { path, next_phase: next, exit_criteria: results } };
    const validation = await validateHandoff(root, path, serializeFrontmatter(data, body));
    if (validation.length) return { errors: validation, data: { path, next_phase: next, exit_criteria: results } };
    await writeHandoff(root, path, data, body);
    return { errors: unmet, data: { path, next_phase: next, exit_criteria: results } };
  }
  if (action === 'approve') {
    if (typeof options.by !== 'string') throw new BatonError('E_USAGE', 'approve requires --by <role>', 2);
    const vocabulary = await gateVocabulary(root);
    const approvedBy = `${options.by}${options.via ? ` via ${options.via}` : ''}`;
    if (!approvedRole(approvedBy, vocabulary)) throw new BatonError('E_APPROVER_FORMAT', 'Choose a configured role and channel, never a personal handle', 2);
    const date = typeof options.at === 'string' ? options.at : new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
      throw new BatonError('E_USAGE', '--at must be a valid YYYY-MM-DD date', 2);
    }
    const { data, body } = await readHandoff(root, path);
    if (!data.gate?.required) throw new BatonError('E_GATE_PENDING', 'This transition does not require approval');
    if (data.gate.approved_by) throw new BatonError('E_GATE_PENDING', 'This gate has already been approved');
    data.gate.approved_by = approvedBy;
    data.gate.approved_at = date;
    data.updated_at = new Date().toISOString();
    data.updated_by = `human:${options.by.replaceAll(' ', '-')}`;
    await writeHandoff(root, path, data, body);
    return { data: { gate: data.gate } };
  }
  if (action === 'refresh') {
    if (typeof options.reason !== 'string') throw new BatonError('E_USAGE', 'refresh requires --reason', 2);
    const { data, body } = await readHandoff(root, path);
    for (const item of [...data.read_first, ...data.artifacts]) {
      item.sha256 = await hashFile(withinRoot(root, item.path));
    }
    const id = `D${Math.max(0, .../** @type {Array<{id:string}>} */ (data.decisions).map((decision) => Number(/^D(\d+)$/.exec(decision.id)?.[1] ?? 0))) + 1}`;
    data.decisions.push({ id, decision: 'Artifact hashes refreshed after intentional edit', rationale: options.reason, by: 'implementation-session' });
    data.updated_at = new Date().toISOString();
    data.updated_by = 'implementation-session';
    await writeHandoff(root, path, data, body);
    return { data: { decision: id } };
  }
  if (action === 'show' || action === 'next') {
    const { data } = await readHandoff(root, path);
    return { data: action === 'show' ? data : { command: `/${data.next_owner}`, role: data.model_role, model: data.suggested_model } };
  }
  throw new BatonError('E_USAGE', `Unsupported handoff action: ${action}`, 2);
}
