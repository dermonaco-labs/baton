import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm, mkdir, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import { runCli, sourceRoot } from '../helpers/index.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';

const feature = '001-baton-template';
const handoff = `specs/${feature}/handoff.md`;

async function repo() {
  const root = await mkdtemp(join(tmpdir(), 'baton-relay-'));
  await mkdir(join(root, 'specs'), { recursive: true });
  await mkdir(join(root, '.baton'), { recursive: true });
  await cp(join(sourceRoot, 'specs', feature), join(root, 'specs', feature), { recursive: true });
  await cp(join(sourceRoot, '.specify'), join(root, '.specify'), { recursive: true });
  await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
  const location = join(root, handoff);
  const { data, body } = parseFrontmatter(await readFile(location, 'utf8'));
  data.open_questions = [];
  data.status = 'ready';
  await writeFile(location, serializeFrontmatter(data, body));
  return { root, cleanup: () => rm(root, { force: true, recursive: true }) };
}

async function editBaton(root, mutate) {
  const location = join(root, handoff);
  const { data, body } = parseFrontmatter(await readFile(location, 'utf8'));
  mutate(data);
  await writeFile(location, serializeFrontmatter(data, body));
}

test('gate pending exits 3 then role-only approval permits receive', async () => {
  const { root, cleanup } = await repo();
  try {
    await editBaton(root, (data) => { data.gate.approved_by = null; data.gate.approved_at = null; });
    const pending = await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature, '--json']);
    assert.equal(pending.code, 3);
    assert.ok(JSON.parse(pending.stdout).errors.some((issue) => issue.code === 'E_GATE_PENDING'));
    const denied = await runCli(root, ['handoff', 'approve', '--feature', feature, '--by', '@x']);
    assert.equal(denied.code, 2);
    const approved = await runCli(root, ['handoff', 'approve', '--feature', feature, '--by', 'repository owner', '--via', 'control-plane delegation']);
    assert.equal(approved.code, 0);
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature])).code, 0);
  } finally {
    await cleanup();
  }
});

test('stale artifact then refresh and checkbox-insensitive progress', async () => {
  const { root, cleanup } = await repo();
  try {
    const spec = join(root, 'specs', feature, 'spec.md');
    await writeFile(spec, (await readFile(spec, 'utf8')) + '\nMore detail.\n');
    const stale = await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature, '--json']);
    assert.equal(stale.code, 1);
    assert.ok(JSON.parse(stale.stdout).errors.some((issue) => issue.code === 'E_STALE_ARTIFACT'));
    assert.equal((await runCli(root, ['handoff', 'refresh', '--feature', feature, '--reason', 'intentional spec edit'])).code, 0);
    const tasks = join(root, 'specs', feature, 'tasks.md');
    await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('- [ ] T001', '- [x] T001'));
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature, '--mode', 'converge'])).code, 0);
    await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('Create `package.json`', 'Delete `package.json`'));
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature])).code, 1);
  } finally {
    await cleanup();
  }
});

test('missing preregistration and landing PR are explicit errors', async () => {
  const { root, cleanup } = await repo();
  try {
    await editBaton(root, (data) => { data.acceptance_checks = data.acceptance_checks.filter((check) => check.story !== 'US1'); });
    assert.ok(JSON.parse((await runCli(root, ['validate', '--path', handoff, '--json'])).stdout).errors.some((issue) => issue.code === 'E_NO_PREREG'));
    await editBaton(root, (data) => {
      data.phase_completed = 'land';
      data.next_phase = 'compound';
      data.next_owner = 'ce-compound';
      data.pr = undefined;
    });
    assert.ok(JSON.parse((await runCli(root, ['validate', '--path', handoff, '--json'])).stdout).errors.some((issue) => issue.code === 'E_PR_MISSING'));
  } finally {
    await cleanup();
  }
});

test('receive enforces lane and check evidence rather than accepting a matching phase alone', async () => {
  const { root, cleanup } = await repo();
  try {
    const wrongLane = await runCli(root, ['handoff', 'receive', '--phase', 'work', '--feature', feature, '--json']);
    assert.ok(JSON.parse(wrongLane.stdout).errors.some((issue) => issue.code === 'E_LANE_MISMATCH'));
    await editBaton(root, (data) => { data.gate.approved_by = null; data.gate.approved_at = null; });
    const stopped = await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature, '--json']);
    assert.equal(stopped.code, 3);
    assert.ok(JSON.parse(stopped.stdout).errors.some((issue) => issue.code === 'E_GATE_PENDING'));
  } finally {
    await cleanup();
  }
});

test('quick baton is created with a role-only reason and escalates without creating a feature', async () => {
  const { root, cleanup } = await repo();
  try {
    const created = await runCli(root, ['handoff', 'new', '--quick', 'docs-fix', '--reason', 'Correct a typo', '--json']);
    assert.equal(created.code, 0);
    const quickPath = join(root, '.baton/quick/docs-fix.md');
    const { data } = parseFrontmatter(await readFile(quickPath, 'utf8'));
    assert.equal(data.lane, 'quick');
    assert.equal(data.phase_completed, 'none');
    assert.equal(data.next_phase, 'work');
    assert.ok(data.decisions.some((decision) => decision.tag === 'quick-eligible'));
    const { body } = parseFrontmatter(await readFile(quickPath, 'utf8'));
    data.phase_completed = 'work';
    data.next_phase = 'review';
    data.next_owner = 'baton-review';
    data.model_role = 'review';
    data.exit_criteria = [{ id: 'diff-nonempty', met: true }, { id: 'local-checks-pass', met: true }];
    await writeFile(quickPath, serializeFrontmatter(data, body));
    const escalated = await runCli(root, ['handoff', 'escalate', '--quick', 'docs-fix', '--reason', 'New user-facing behavior', '--json']);
    assert.equal(escalated.code, 0);
    const updated = parseFrontmatter(await readFile(quickPath, 'utf8')).data;
    assert.equal(updated.next_phase, 'specify');
    assert.equal(updated.next_owner, 'speckit-specify');
    assert.equal((await readdir(join(root, 'specs'))).length, 1);
  } finally {
    await cleanup();
  }
});

test('compound requires solution evidence or a reasoned skip and reports every unmet member', async () => {
  const { root, cleanup } = await repo();
  try {
    await editBaton(root, (data) => {
      data.phase_completed = 'land';
      data.next_phase = 'compound';
      data.next_owner = 'ce-compound';
      data.model_role = 'planning';
      data.pr = { url: 'https://github.com/example/example/pull/1', number: 1 };
      data.exit_criteria = [{ id: 'pr-opened', met: true }];
    });

    const input = join(root, 'handoff-input.json');
    await writeFile(input, JSON.stringify({ summary: 'Compound the completed work.' }));
    const unmet = await runCli(root, ['handoff', 'write', '--phase', 'compound', '--feature', feature, '--from-json', 'handoff-input.json', '--json']);
    assert.equal(unmet.code, 1);
    const issue = JSON.parse(unmet.stdout).errors.find((entry) => entry.code === 'E_EXIT_UNMET');
    assert.match(issue.message, /artifact-exists:docs\/solutions\/\*\.md=false/);
    assert.match(issue.message, /decision:skip-compound=false/);
    assert.equal(parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data.phase_completed, 'land');
    const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    await writeFile(input, JSON.stringify({
      summary: 'Intentionally skip compounding.',
      decisions: [...data.decisions, { id: 'D99', decision: 'Skip compounding', rationale: 'No reusable insight', tag: 'skip-compound', by: 'ce-compound' }],
    }));
    const skipped = await runCli(root, ['handoff', 'write', '--phase', 'compound', '--feature', feature, '--from-json', 'handoff-input.json', '--json']);
    assert.equal(skipped.code, 0);
    assert.equal(JSON.parse(skipped.stdout).data.exit_criteria[0].members[1].met, true);
  } finally {
    await cleanup();
  }
});

test('compound accepts an authored solution document without a skip decision', async () => {
  const { root, cleanup } = await repo();
  try {
    await editBaton(root, (data) => {
      data.phase_completed = 'land';
      data.next_phase = 'compound';
      data.next_owner = 'ce-compound';
      data.model_role = 'planning';
      data.pr = { url: 'https://github.com/example/example/pull/1', number: 1 };
      data.exit_criteria = [{ id: 'pr-opened', met: true }];
    });

    await mkdir(join(root, 'docs/solutions'), { recursive: true });
    await writeFile(join(root, 'docs/solutions/fix.md'), '# Reusable solution\n');
    await writeFile(join(root, 'handoff-input.json'), JSON.stringify({ summary: 'Record reusable solution.' }));
    const result = await runCli(root, ['handoff', 'write', '--phase', 'compound', '--feature', feature, '--from-json', 'handoff-input.json', '--json']);
    assert.equal(result.code, 0);
    assert.equal(JSON.parse(result.stdout).data.exit_criteria[0].members[0].met, true);
  } finally {
    await cleanup();
  }
});

test('status prints a readable table of feature batons', async () => {
  const { root, cleanup } = await repo();
  try {
    const status = await runCli(root, ['status']);
    assert.equal(status.code, 0);
    assert.match(status.stdout, /FEATURE\s+LANE\s+PHASE\s+NEXT\s+OWNER\s+STATUS\s+GATE\s+STALE/);
    assert.match(status.stdout, /001-baton-template\s+feature\s+analyze\s+implement\s+speckit-implement\s+ready/);
  } finally {
    await cleanup();
  }
});
