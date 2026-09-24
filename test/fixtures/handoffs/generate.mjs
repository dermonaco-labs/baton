import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashArtifact } from '../../../src/lib/hash.mjs';
import { phaseDefaults, checkKey, phaseForLane } from '../../../src/lib/phases.mjs';
import { serializeFrontmatter } from '../../../src/lib/frontmatter.mjs';

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const sampleDir = resolve(fixtureDir, '../features/sample');
const sample = 'specs/001-sample';
const quick = '.baton/quick/sample-fix';
const date = '2026-09-24T10:00:00Z';
const paths = ['spec.md', 'plan.md', 'research.md', 'tasks.md', 'analysis.md', 'review.json'];
const digest = Object.fromEntries(await Promise.all(paths.map(async (name) => [
  name, hashArtifact(`${sample}/${name}`, await readFile(resolve(sampleDir, name))),
])));
const read = (name) => ({ path: `${sample}/${name}`, why: `Read ${name} for the next phase`, sha256: digest[name] });
const artifact = (name, role = 'source-of-truth') => ({ path: `${sample}/${name}`, role, sha256: digest[name] });
const body = (next) => `## Goal
Correct a label without changing behaviour.

## What changed
The scoped phase completed.

## Next steps
1. \`/${next}\`

## Watch out for
- Stop if scope expands.
`;
const featurePhases = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'implement', 'review', 'land', 'compound'];
const quickPhases = ['none', 'work', 'review', 'land', 'compound'];

function baton(lane, phase) {
  const completed = phaseDefaults.phases[phase];
  const next = phase === 'none' ? 'work' : phaseForLane(completed, lane).next[0];
  const target = phaseDefaults.phases[next];
  const owner = next === 'done' ? 'none' : target.owner;
  const feature = lane === 'feature';
  const initial = phase === 'none';
  const data = {
    baton: 1, lane, feature: feature ? '001-sample' : 'sample-fix',
    phase_completed: phase, next_phase: next, next_owner: owner,
    status: next === 'done' ? 'done' : 'ready',
    model_role: target?.model_role ?? completed.model_role,
    suggested_model: null, summary: `Completed ${phase} in the ${lane} lane.`,
    read_first: feature ? [read('spec.md')] : [{ path: `${quick}.md`, why: 'Quick scope and decision' }],
    artifacts: feature ? [artifact('spec.md'), artifact('plan.md'), artifact('tasks.md', 'derived')] : [],
    entry_checked: [], exit_criteria: initial ? [] : phaseForLane(completed, lane).exit.map((item) => ({
      id: checkKey(item), met: true, ...(item.id === 'quick-scope-held' ? { evidence: 'Reviewer verified no behaviour or contract change' } : {}),
      ...(item.any_of ? { members: item.any_of.map((member, index) => ({
        id: checkKey(member), met: index === 0,
      })) } : {}),
    })),
    open_questions: [], decisions: feature ? [] : [
      { id: 'D1', decision: 'Keep the fix in the quick lane', rationale: 'Correct a typo only', tag: 'quick-eligible', by: 'baton' },
      ...(phase === 'review' ? [{ id: 'D2', decision: 'Quick scope held', rationale: 'No new behaviour or public contract', tag: 'quick-scope-held', by: 'baton-review' }] : []),
    ],
    gate: { required: ['clarify', 'analyze', 'land'].includes(phase), approved_by: null, approved_at: null },
    history: initial ? [] : [{ phase, at: date, by: completed.owner, commit: null }],
    updated_at: date, updated_by: initial ? 'baton' : completed.owner,
  };
  if (feature && next === 'implement') {
    data.analysis = { report_path: `${sample}/analysis.md`, critical: 0, high: 0 };
    data.acceptance_checks = [{ id: 'AC-US1-1', story: 'US1', check: 'check label', kind: 'test-id', expect_initial: 'fail' }];
  }
  if (phase === 'review') data.review = { findings_path: feature ? `${sample}/review.json` : '.baton/quick/sample-fix.review.json', blocking_findings: 0 };
  if (phase === 'land') data.pr = { url: 'https://github.com/example/baton/pull/1', number: 1 };
  if (phase === 'compound') data.pr = { url: 'https://github.com/example/baton/pull/1', number: 1 };
  return data;
}

async function save(relative, data, content = body(data.next_owner)) {
  const path = resolve(fixtureDir, relative);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, serializeFrontmatter(data, content));
}

for (const phase of featurePhases) await save(`valid/feature/${phase}.md`, baton('feature', phase));
for (const phase of quickPhases) await save(`valid/quick/${phase}.md`, baton('quick', phase));

const invalid = {
  E_SCHEMA: (d) => { d.baton = 2; },
  E_BODY_SECTIONS: () => {},
  E_BUDGET: (d) => { d.read_first = Array.from({ length: 13 }, () => read('spec.md')); },
  E_TRANSITION: (d) => { d.next_phase = 'land'; d.next_owner = 'baton-land'; d.model_role = 'implementation'; },
  E_OWNER: (d) => { d.next_owner = 'speckit-plan'; },
  E_MISSING_ARTIFACT: (d) => { d.read_first.push({ path: `${sample}/absent.md`, why: 'Required evidence' }); },
  E_STALE_ARTIFACT: (d) => { d.artifacts[0].sha256 = '0'.repeat(64); },
  E_BLOCKING_OPEN: (d) => {
    d.open_questions = [{ id: 'Q1', question: 'Which label?', blocking: true, options: ['Short label', 'Long label'] }];
  },
  E_EXIT_UNMET: (d) => { d.exit_criteria[0].met = false; },
  E_GATE_PENDING: (d) => { Object.assign(d, baton('feature', 'clarify')); },
  E_APPROVER_FORMAT: (d) => { d.gate.approved_by = 'Unknown person'; d.gate.approved_at = '2026-09-24'; },
  E_ACTOR_FORMAT: (d) => { d.updated_by = 'human:unknown-role'; },
  E_DENYLIST: (d) => { d.summary = 'Do not record @someone in handoffs'; },
  E_NO_PREREG: (d) => { Object.assign(d, baton('feature', 'analyze')); d.acceptance_checks = [{ id: 'AC-US2-1', story: 'US2', check: 'unrelated', kind: 'manual', expect_initial: 'fail' }]; },
  E_ANALYSIS_MISSING: (d) => { Object.assign(d, baton('feature', 'analyze')); d.analysis.report_path = `${sample}/absent.md`; },
  E_ANALYSIS_CRITICAL: (d) => { Object.assign(d, baton('feature', 'analyze')); d.analysis.critical = 1; },
  E_REVIEW_MISSING: (d) => { d.phase_completed = 'review'; d.next_phase = 'land'; d.next_owner = 'baton-land'; d.model_role = 'implementation'; d.review = { findings_path: `${sample}/absent.json`, blocking_findings: 0 }; d.exit_criteria = phaseDefaults.phases.review.exit.map((item) => ({ id: checkKey(item), met: true })); },
  E_REVIEW_BLOCKING: (d) => { Object.assign(d, baton('feature', 'review')); d.review.blocking_findings = 1; },
  E_PR_MISSING: (d) => { Object.assign(d, baton('feature', 'land')); delete d.pr; },
  E_LANE_ESCALATE: (d) => { Object.assign(d, baton('quick', 'work')); d.exit_criteria = [{ id: 'quick-scope-held', met: false }]; d.status = 'blocked'; },
  E_LANE_MISMATCH: (d) => { Object.assign(d, baton('quick', 'work')); d.next_phase = 'specify'; d.next_owner = 'speckit-specify'; d.model_role = 'planning'; d.decisions = []; },
  E_MODEL_NOT_ALLOWED: (d) => { d.suggested_model = 'not-allowed-model'; },
  E_MULTIPLE_BATONS: () => {},
};
for (const [code, change] of Object.entries(invalid)) {
  const data = baton('feature', 'specify');
  change(data);
  const content = code === 'E_BODY_SECTIONS' ? body(data.next_owner).replace('## What changed', '## Changes') : body(data.next_owner);
  await save(`invalid/${code}.md`, data, content);
}
