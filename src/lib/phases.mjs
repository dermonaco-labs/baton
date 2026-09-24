import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { loadSchemas, validateSchema } from './schema.mjs';

/** @typedef {{id:string,path?:string,names?:string[],phases?:string[],tag?:string,all_of?:Check[],any_of?:Check[]}} Check */
/** @typedef {{lane:string[],owner:string,model_role:string,human_gate:boolean,entry:Check[],exit:Check[],next:string[],by_lane?:Record<string,Partial<Phase>>}} Phase */

/** @param {string} id @param {Partial<Check>} [params] */
const check = (id, params = {}) => ({ id, ...params });
const compound = [check('compound-recorded', { any_of: [
  check('artifact-exists', { path: 'docs/solutions/*.md' }),
  check('decision', { tag: 'skip-compound' }),
] })];

/** @type {{schema:number,budgets:{read_first_max:number,body_max_lines:number},phases:Record<string,Phase>}} */
export const phaseDefaults = {
  schema: 1,
  budgets: { read_first_max: 12, body_max_lines: 150 },
  phases: {
    brainstorm: { lane: ['feature'], owner: 'ce-brainstorm', model_role: 'planning', human_gate: false, entry: [], exit: [check('artifact-exists', { path: 'docs/brainstorms/*' })], next: ['specify'] },
    specify: { lane: ['feature'], owner: 'speckit-specify', model_role: 'planning', human_gate: false, entry: [check('from-phase', { phases: ['none', 'brainstorm', 'work', 'review'] })], exit: [check('artifact-exists', { path: 'spec.md' }), check('spec-has-stories'), check('spec-has-success-criteria'), check('markers-bounded')], next: ['clarify', 'plan'] },
    clarify: { lane: ['feature'], owner: 'speckit-clarify', model_role: 'planning', human_gate: true, entry: [check('spec-exists')], exit: [check('no-needs-clarification', { path: 'spec.md' }), check('clarifications-recorded')], next: ['plan'] },
    plan: { lane: ['feature'], owner: 'speckit-plan', model_role: 'planning', human_gate: false, entry: [check('spec-exists'), check('from-phase', { phases: ['specify', 'clarify'] }), check('gate-approved'), check('no-blocking-questions')], exit: [check('artifact-exists', { path: 'plan.md' }), check('artifact-exists', { path: 'research.md' }), check('no-needs-clarification', { path: 'plan.md' }), check('constitution-check-present')], next: ['tasks'] },
    tasks: { lane: ['feature'], owner: 'speckit-tasks', model_role: 'planning', human_gate: false, entry: [check('plan-exists'), check('no-blocking-questions')], exit: [check('artifact-exists', { path: 'tasks.md' }), check('tasks-reference-stories'), check('acceptance-registered')], next: ['analyze'] },
    analyze: { lane: ['feature'], owner: 'speckit-analyze', model_role: 'review', human_gate: true, entry: [check('tasks-exists'), check('fresh', { names: ['spec', 'plan', 'tasks'] })], exit: [check('analysis-recorded'), check('no-critical-findings')], next: ['implement', 'specify', 'plan', 'tasks'] },
    implement: { lane: ['feature'], owner: 'speckit-implement', model_role: 'implementation', human_gate: false, entry: [check('gate-approved'), check('acceptance-registered'), check('fresh', { names: ['spec', 'plan', 'tasks'] })], exit: [check('tasks-all-checked-or-deferred'), check('acceptance-evidence'), check('local-checks-pass')], next: ['review'] },
    review: { lane: ['feature', 'quick'], owner: 'baton-review', model_role: 'review', human_gate: false, entry: [check('diff-nonempty'), check('fresh', { names: ['tasks'] })], exit: [check('findings-json-valid'), check('findings-mapped-to-tasks-or-dismissed')], next: ['land', 'implement'],
      by_lane: { quick: { entry: [check('diff-nonempty')], exit: [check('findings-json-valid'), check('findings-fixed-or-dismissed'), check('quick-scope-held')], next: ['land', 'work', 'specify'] } } },
    land: { lane: ['feature', 'quick'], owner: 'baton-land', model_role: 'implementation', human_gate: true, entry: [check('no-blocking-findings'), check('local-checks-pass')], exit: [check('pr-opened')], next: ['compound', 'done'],
      by_lane: { quick: { entry: [check('no-blocking-findings'), check('local-checks-pass')], exit: [check('pr-opened')], next: ['compound', 'done'] } } },
    compound: { lane: ['feature', 'quick'], owner: 'ce-compound', model_role: 'planning', human_gate: false, entry: [check('pr-opened')], exit: compound, next: ['done'],
      by_lane: { quick: { entry: [check('pr-opened')], exit: compound, next: ['done'] } } },
    work: { lane: ['quick'], owner: 'ce-work', model_role: 'implementation', human_gate: false, entry: [check('from-phase', { phases: ['none', 'review'] }), check('decision', { tag: 'quick-eligible' }), check('no-blocking-questions'), check('no-feature-tasks')], exit: [check('diff-nonempty'), check('local-checks-pass')], next: ['review', 'specify'] },
  },
};

export const builtInChecks = new Set([
  'artifact-exists', 'spec-exists', 'plan-exists', 'tasks-exists', 'spec-has-stories',
  'spec-has-success-criteria', 'markers-bounded', 'no-needs-clarification', 'clarifications-recorded',
  'constitution-check-present', 'tasks-reference-stories', 'acceptance-registered', 'analysis-recorded',
  'no-critical-findings', 'tasks-all-checked-or-deferred', 'acceptance-evidence', 'local-checks-pass',
  'diff-nonempty', 'findings-json-valid', 'findings-mapped-to-tasks-or-dismissed',
  'findings-fixed-or-dismissed', 'quick-scope-held', 'no-blocking-findings', 'pr-opened',
  'fresh', 'from-phase', 'decision', 'no-blocking-questions', 'gate-approved', 'no-feature-tasks',
]);
const parameters = /** @type {Record<string,string>} */ ({ 'artifact-exists': 'path', 'no-needs-clarification': 'path', fresh: 'names', 'from-phase': 'phases', decision: 'tag' });
/** @param {Check} expression */
export function checkKey(expression) {
  const parameter = parameters[expression.id];
  const value = parameter && expression[/** @type {keyof Check} */ (parameter)];
  return value === undefined ? expression.id : `${expression.id}:${Array.isArray(value) ? value.join(',') :
    parameter === 'path' ? String(value).replace(/^\{(?:feature|quick)_dir\}\//, '') : value}`;
}

/** @param {Check[]} expressions */
export function validateCheckList(expressions) {
  /** @type {Array<{code:string,message:string}>} */
  const issues = [];
  const keys = new Set();
  /** @param {Check} expression @param {number} depth @param {Set<string>} siblings */
  function visit(expression, depth, siblings) {
    const key = checkKey(expression);
    if (siblings.has(key)) issues.push({ code: 'E_CHECK_KEY_DUP', message: `Duplicate check key ${key}` });
    siblings.add(key);
    const hasAll = Object.hasOwn(expression, 'all_of');
    const hasAny = Object.hasOwn(expression, 'any_of');
    if (hasAll || hasAny) {
      const children = hasAll ? expression.all_of : expression.any_of;
      if (hasAll === hasAny || depth >= 2 || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(expression.id) ||
          builtInChecks.has(expression.id) || !Array.isArray(children) || children.length < 2 || children.length > 8 ||
          Object.keys(expression).some((key) => !['id', 'all_of', 'any_of'].includes(key))) {
        issues.push({ code: 'E_CHECK_GROUP', message: `Invalid check group ${expression.id}` });
      }
      if (Array.isArray(children)) {
        const members = new Set();
        for (const child of children) visit(child, depth + 1, members);
      }
    } else if (!builtInChecks.has(expression.id)) {
      issues.push({ code: 'E_CHECK_UNKNOWN', message: `Unknown check ${expression.id}` });
    } else if (parameters[expression.id] && expression[/** @type {keyof Check} */ (parameters[expression.id])] === undefined) {
      issues.push({ code: 'E_CHECK_GROUP', message: `Missing parameter on ${expression.id}` });
    }
  }
  for (const expression of expressions) visit(expression, 0, keys);
  return issues;
}

/** @param {Check[]} expressions @param {(check:Check,key:string)=>Promise<{met:boolean,evidence?:string}>} evaluate */
export async function evaluateChecks(expressions, evaluate) {
  /** @param {Check} expression @returns {Promise<{id:string,met:boolean,evidence?:string,members?:Array<{id:string,met:boolean,evidence?:string}>}>} */
  async function visit(expression) {
    if (expression.all_of || expression.any_of) {
      const members = await Promise.all((expression.all_of ?? expression.any_of ?? []).map(visit));
      const met = expression.all_of ? members.every((member) => member.met) : members.some((member) => member.met);
      return { id: expression.id, met, evidence: `${expression.all_of ? 'all_of' : 'any_of'}: ${members.filter((member) => member.met).length}/${members.length} met`, members };
    }
    return { id: checkKey(expression), ...await evaluate(expression, checkKey(expression)) };
  }
  return Promise.all(expressions.map(visit));
}

/** @param {Phase} phase @param {string} lane */
export function phaseForLane(phase, lane) {
  return { ...phase, ...(phase.by_lane?.[lane] ?? {}) };
}

/** @param {typeof phaseDefaults} config */
export function checkWeakenedContracts(config) {
  /** @param {Check} baseline @param {Check} candidate @returns {boolean} */
  function equivalent(baseline, candidate) {
    if (checkKey(baseline) !== checkKey(candidate)) return false;
    const members = baseline.all_of ?? baseline.any_of;
    const other = baseline.all_of ? candidate.all_of : candidate.any_of;
    if (!members) return !candidate.all_of && !candidate.any_of;
    return Array.isArray(other) && members.length === other.length &&
      members.every((item, index) => equivalent(item, other[index]));
  }
  const warnings = [];
  for (const [phase, defaults] of Object.entries(phaseDefaults.phases)) {
    for (const lane of defaults.lane) {
      const baseline = phaseForLane(defaults, lane).exit;
      const configured = config.phases[phase] ? phaseForLane(config.phases[phase], lane).exit : [];
      for (const required of baseline) {
        const matching = configured.find((item) => checkKey(item) === checkKey(required));
        if (!matching || !equivalent(required, matching)) warnings.push({ code: 'W_WEAKENED_CONTRACT', message: `${phase}/${lane} removed or weakened ${checkKey(required)}` });
      }
    }
  }
  return warnings;
}

/** @param {string} root */
export async function loadPhases(root) {
  let parsed;
  try {
    parsed = YAML.parse(await readFile(join(root, '.baton/phases.yml'), 'utf8'));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    parsed = phaseDefaults;
  }
  const schemas = await loadSchemas(root);
  const schemaIssues = validateSchema(schemas, 'phases', parsed).map((issue) => ({ ...issue, code: 'E_PHASES', file: '.baton/phases.yml' }));
  const phases = { ...phaseDefaults.phases };
  for (const [id, override] of Object.entries(parsed.phases ?? {})) {
    phases[id] = { ...phases[id], ...override };
  }
  const config = { ...phaseDefaults, ...parsed, phases };
  const checkIssues = Object.entries(phases).flatMap(([id, phase]) => [
    ...validateCheckList(phase.entry).map((issue) => ({ ...issue, file: `.baton/phases.yml:${id}.entry` })),
    ...validateCheckList(phase.exit).map((issue) => ({ ...issue, file: `.baton/phases.yml:${id}.exit` })),
    ...Object.entries(phase.by_lane ?? {}).flatMap(([lane, override]) => [
      ...validateCheckList(override.entry ?? []).map((issue) => ({ ...issue, file: `.baton/phases.yml:${id}.by_lane.${lane}.entry` })),
      ...validateCheckList(override.exit ?? []).map((issue) => ({ ...issue, file: `.baton/phases.yml:${id}.by_lane.${lane}.exit` })),
    ]),
  ]);
  return { config, errors: [...schemaIssues, ...checkIssues], warnings: checkWeakenedContracts(config) };
}
