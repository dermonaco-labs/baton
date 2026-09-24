import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runCli, sourceRoot } from '../helpers/index.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';
import { run as runHandoff } from '../../src/commands/handoff.mjs';
import { changedFiles, evaluateBuiltIn } from '../../src/lib/checks.mjs';
import { validateHandoff } from '../../src/lib/handoff.mjs';
import { run as runValidate } from '../../src/commands/validate.mjs';

const feature = '001-sample';
const handoff = `specs/${feature}/handoff.md`;
const fixtures = join(sourceRoot, 'test/fixtures/handoffs');
const git = promisify(execFile);

async function repo() {
  const root = await mkdtemp(join(fixtures, '.relay-'));
  await mkdir(join(root, 'specs'), { recursive: true });
  await mkdir(join(root, '.baton'), { recursive: true });
  await cp(join(sourceRoot, 'test/fixtures/features/sample'), join(root, 'specs', feature), { recursive: true });
  await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
  await cp(join(sourceRoot, 'baton/templates/config.yml'), join(root, '.baton/config.yml'));
  const location = join(root, handoff);
  await cp(join(fixtures, 'valid/feature/analyze.md'), location);
  const { data, body } = parseFrontmatter(await readFile(location, 'utf8'));
  data.open_questions = [];
  data.status = 'ready';
  data.gate.approved_by = 'maintainer';
  data.gate.approved_at = '2026-09-24';
  await writeFile(location, serializeFrontmatter(data, body));
  return { root, cleanup: () => rm(root, { force: true, recursive: true }) };
}

async function editBaton(root, mutate) {
  const location = join(root, handoff);
  const { data, body } = parseFrontmatter(await readFile(location, 'utf8'));
  mutate(data);
  await writeFile(location, serializeFrontmatter(data, body));
}

async function quickRepo() {
  const sample = await repo();
  const configPath = join(sample.root, '.baton/config.yml');
  const config = YAML.parse(await readFile(configPath, 'utf8'));
  config.checks = [{ name: 'offline', run: 'node -e "process.exit(0)"' }];
  await writeFile(configPath, YAML.stringify(config));
  const runGit = (...args) => git('git', args, { cwd: sample.root, windowsHide: true });
  await runGit('init', '-q');
  await runGit('add', '-A');
  await runGit('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture baseline');
  await runGit('update-ref', 'refs/remotes/origin/main', 'HEAD');
  await runGit('symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main');
  await mkdir(join(sample.root, 'docs'), { recursive: true });
  await writeFile(join(sample.root, 'docs/label.md'), 'Corrected a typo.\n');
  return sample;
}

async function writeInput(root, data) {
  await writeFile(join(root, 'handoff-input.json'), JSON.stringify(data));
  return 'handoff-input.json';
}

test('specify accepts brainstorm evidence when it creates the first feature baton', async () => {
  const { root, cleanup } = await repo();
  try {
    await rm(join(root, handoff));
    await mkdir(join(root, 'docs/brainstorms'), { recursive: true });
    await writeFile(join(root, 'docs/brainstorms/label.md'), '# Small label change\n');
    await writeInput(root, { summary: 'A single bounded story', read_first: [{ path: `specs/${feature}/spec.md`, why: 'Scope' }] });
    const result = await runHandoff(root, [
      'write', '--phase', 'specify', '--feature', feature, '--next', 'plan',
      '--from-brainstorm', 'docs/brainstorms/label.md', '--from-json', 'handoff-input.json',
    ]);
    assert.deepEqual(result.errors ?? [], []);
    const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    assert.equal(data.phase_completed, 'specify');
    assert.equal(data.next_phase, 'plan');
    assert.equal(data.gate.required, true);
    assert.ok(data.artifacts.some((item) => item.path === 'docs/brainstorms/label.md' && item.role === 'evidence'));
    assert.ok(data.history.some((item) => item.phase === 'brainstorm'));
  } finally {
    await cleanup();
  }
});

test('quick work, review and land retain scope and record the PR without feature tasks', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const quick = join(root, '.baton/quick/label-fix.md');
    const created = await runHandoff(root, ['new', '--quick', 'label-fix', '--reason', 'Correct a docs typo only']);
    assert.deepEqual(created.errors ?? [], []);
    assert.equal((await evaluateBuiltIn(root, '.baton/quick/label-fix.md',
      parseFrontmatter(await readFile(quick, 'utf8')).data, { id: 'no-feature-tasks' })).met, true);
    assert.equal((await runHandoff(root, ['receive', '--phase', 'work', '--quick', 'label-fix'])).errors.length, 0);
    await writeInput(root, { summary: 'Corrected a docs typo.' });
    const work = await runHandoff(root, ['write', '--phase', 'work', '--quick', 'label-fix', '--from-json', 'handoff-input.json']);
    assert.deepEqual(work.errors, []);
    assert.equal(parseFrontmatter(await readFile(quick, 'utf8')).data.next_phase, 'review');
    const findings = JSON.parse(await readFile(join(root, 'specs/001-sample/review.json'), 'utf8'));
    findings.source.run_artifact = '.baton/quick/label-fix.review.json';
    await writeFile(join(root, '.baton/quick/label-fix.review.json'), JSON.stringify(findings));
    const { data } = parseFrontmatter(await readFile(quick, 'utf8'));
    await writeInput(root, {
      summary: 'Review found no new behaviour.',
      review: { findings_path: '.baton/quick/label-fix.review.json', blocking_findings: 0 },
      decisions: [...data.decisions, { id: 'D2', decision: 'Quick scope held', rationale: 'No new behaviour or public contract', tag: 'quick-scope-held', by: 'baton-review' }],
    });
    const review = await runHandoff(root, ['write', '--phase', 'review', '--quick', 'label-fix', '--from-json', 'handoff-input.json']);
    assert.deepEqual(review.errors, []);
    assert.equal((await runHandoff(root, ['receive', '--phase', 'land', '--quick', 'label-fix'])).errors.length, 0);
    await writeInput(root, { summary: 'Opened the review PR.', pr: { url: 'https://github.com/example/baton/pull/12', number: 12 } });
    const land = await runHandoff(root, ['write', '--phase', 'land', '--quick', 'label-fix', '--from-json', 'handoff-input.json']);
    assert.deepEqual(land.errors, []);
    const landed = parseFrontmatter(await readFile(quick, 'utf8')).data;
    assert.equal(landed.pr.number, 12);
    assert.equal(landed.gate.required, true);
    const pending = await runHandoff(root, ['receive', '--phase', 'compound', '--quick', 'label-fix']);
    assert.equal(pending.exitCode, 3);
    assert.ok(pending.errors.some((issue) => issue.code === 'E_GATE_PENDING'));
    await runHandoff(root, ['approve', '--quick', 'label-fix', '--by', 'maintainer', '--via', 'direct approval']);
    assert.deepEqual((await runHandoff(root, ['receive', '--phase', 'compound', '--quick', 'label-fix'])).errors, []);
  } finally {
    await cleanup();
  }
});

test('quick slug boundaries reject one and fifty characters and accept two through forty-nine', async () => {
  const { root, cleanup } = await repo();
  try {
    for (const slug of ['ab', 'a'.repeat(49)]) {
      const created = await runHandoff(root, ['new', '--quick', slug, '--reason', 'Correct a local typo']);
      assert.deepEqual(created.errors ?? [], [], `valid slug length: ${slug.length}`);
      const { data } = parseFrontmatter(await readFile(join(root, `.baton/quick/${slug}.md`), 'utf8'));
      assert.equal(data.feature, slug);
    }
    for (const slug of ['a', 'a'.repeat(50)]) {
      await assert.rejects(
        runHandoff(root, ['new', '--quick', slug, '--reason', 'Correct a local typo']),
        (error) => error.code === 'E_USAGE',
        `invalid slug length: ${slug.length}`,
      );
    }
  } finally {
    await cleanup();
  }
});

test('quick lane warns when changed files exceed its configured size hint', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const configPath = join(root, '.baton/config.yml');
    const config = YAML.parse(await readFile(configPath, 'utf8'));
    config.lanes.quick.max_files_changed = 1;
    await writeFile(configPath, YAML.stringify(config));
    await runHandoff(root, ['new', '--quick', 'size-hint', '--reason', 'Correct a docs typo only']);
    assert.ok((await changedFiles(root)).length > 1);
    const result = await runValidate(root, ['--path', '.baton/quick/size-hint.md']);
    assert.deepEqual(result.errors, []);
    assert.ok(result.warnings.some((item) => item.code === 'W_QUICK_LARGE'),
      JSON.stringify(result.warnings));
  } finally {
    await cleanup();
  }
});

test('scope growth escalates a quick baton and the first feature baton retains its evidence', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    await runHandoff(root, ['new', '--quick', 'label-fix', '--reason', 'Correct a docs typo only']);
    await writeInput(root, { summary: 'A local edit.' });
    assert.deepEqual((await runHandoff(root, ['write', '--phase', 'work', '--quick', 'label-fix', '--from-json', 'handoff-input.json'])).errors, []);
    const quick = join(root, '.baton/quick/label-fix.md');
    const countBefore = (await readdir(join(root, 'specs'))).length;
    const escalated = await runHandoff(root, ['escalate', '--quick', 'label-fix', '--reason', 'A new public contract is needed']);
    assert.deepEqual(escalated.errors ?? [], []);
    assert.equal((await readdir(join(root, 'specs'))).length, countBefore);
    assert.equal(parseFrontmatter(await readFile(quick, 'utf8')).data.next_phase, 'specify');
    await rm(join(root, handoff));
    await writeInput(root, { summary: 'Specify the expanded feature.', read_first: [{ path: `specs/${feature}/spec.md`, why: 'Scope' }] });
    const specified = await runHandoff(root, [
      'write', '--phase', 'specify', '--feature', feature, '--from-quick', '.baton/quick/label-fix.md',
      '--from-json', 'handoff-input.json',
    ]);
    assert.deepEqual(specified.errors ?? [], []);
    const featureBaton = parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data;
    assert.ok(featureBaton.artifacts.some((item) => item.path === '.baton/quick/label-fix.md' && item.role === 'evidence'));
    assert.ok(featureBaton.history.some((item) => item.phase === 'work'));
    assert.equal(parseFrontmatter(await readFile(quick, 'utf8')).data.status, 'done');
    assert.deepEqual(await validateHandoff(root, '.baton/quick/label-fix.md'), []);
  } finally {
    await cleanup();
  }
});

test('phase entry refuses feature-to-quick and requires successful phase-specific evidence', async () => {
  const { root, cleanup } = await repo();
  try {
    const mismatch = await runHandoff(root, ['receive', '--phase', 'work', '--feature', feature]);
    assert.ok(mismatch.errors.some((issue) => issue.code === 'E_LANE_MISMATCH'));
    await editBaton(root, (data) => { data.analysis.critical = 1; });
    const critical = await runHandoff(root, ['receive', '--phase', 'implement', '--feature', feature]);
    assert.equal(critical.exitCode, 3);
    assert.ok(critical.errors.some((issue) => issue.code === 'E_ANALYSIS_CRITICAL'));
  } finally {
    await cleanup();
  }
});

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
    await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('Correct the visible label', 'Remove the visible label'));
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
    assert.match(status.stdout, /001-sample\s+feature\s+analyze\s+implement\s+speckit-implement\s+ready/);
  } finally {
    await cleanup();
  }
});
