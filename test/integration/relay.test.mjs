import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm, mkdir, readdir } from 'node:fs/promises';
import { join, relative, isAbsolute } from 'node:path';
import YAML from 'yaml';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runCli, sourceRoot } from '../helpers/index.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';
import { run as runHandoff } from '../../src/commands/handoff.mjs';
import { changedFiles, evaluateBuiltIn } from '../../src/lib/checks.mjs';
import { validateHandoff } from '../../src/lib/handoff.mjs';
import { run as runValidate } from '../../src/commands/validate.mjs';
import { hashFile } from '../../src/lib/hash.mjs';

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

async function editQuickBaton(root, slug, mutate) {
  const location = join(root, '.baton/quick', `${slug}.md`);
  const { data, body } = parseFrontmatter(await readFile(location, 'utf8'));
  mutate(data);
  await writeFile(location, serializeFrontmatter(data, body));
}

async function quickRepo() {
  const sample = await repo();
  await cp(join(sourceRoot, '.gitignore'), join(sample.root, '.gitignore'));
  await cp(join(sourceRoot, '.gitattributes'), join(sample.root, '.gitattributes'));
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

async function prepareReview(root, findings) {
  await editBaton(root, (data) => {
    data.phase_completed = 'implement';
    data.next_phase = 'review';
    data.next_owner = 'baton-review';
    data.model_role = 'review';
    data.gate = { required: false, approved_by: null, approved_at: null };
    data.exit_criteria = [
      { id: 'tasks-all-checked-or-deferred', met: true },
      { id: 'acceptance-evidence', met: true },
      { id: 'local-checks-pass', met: true },
    ];
  });
  const reviewPath = join(root, 'specs', feature, 'review.json');
  const review = JSON.parse(await readFile(reviewPath, 'utf8'));
  review.findings = findings;
  await writeFile(reviewPath, JSON.stringify(review));
  return `specs/${feature}/review.json`;
}

async function prepareCompound(root) {
  await editBaton(root, (data) => {
    data.phase_completed = 'land';
    data.next_phase = 'compound';
    data.next_owner = 'ce-compound';
    data.model_role = 'planning';
    data.gate = { required: false, approved_by: null, approved_at: null };
    data.exit_criteria = [{ id: 'pr-opened', met: true }];
    data.pr = { url: 'https://github.com/example/baton/pull/12', number: 12 };
  });
  await mkdir(join(root, 'docs/solutions'), { recursive: true });
  await writeFile(join(root, 'docs/solutions/label.md'), '# Reusable solution\n');
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
    const override = await runHandoff(root, ['question', '--quick', 'label-fix', '--tag', 'self-review-override', '--reason', 'Exercise same-checkout relay test']);
    assert.deepEqual(override.errors ?? [], []);
    assert.deepEqual((await runHandoff(root, ['answer', override.data.question, 'Allow self-review',
      '--quick', 'label-fix', '--by', 'repository owner'])).errors ?? [], []);
    const findings = JSON.parse(await readFile(join(root, 'specs/001-sample/review.json'), 'utf8'));
    findings.source.run_artifact = '.baton/quick/label-fix.review.json';
    await writeFile(join(root, '.baton/quick/label-fix.review.json'), JSON.stringify(findings));
    const { data } = parseFrontmatter(await readFile(quick, 'utf8'));
    await writeInput(root, {
      summary: 'Review found no new behaviour.',
      review: { findings_path: '.baton/quick/label-fix.review.json', blocking_findings: 0 },
      decisions: [...data.decisions, { id: 'D4', decision: 'Quick scope held', rationale: 'No new behaviour or public contract', tag: 'quick-scope-held', by: 'baton-review' }],
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
    const pending = await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature, '--json']);
    assert.equal(pending.code, 3);
    assert.ok(JSON.parse(pending.stdout).errors.some((issue) => issue.code === 'E_GATE_PENDING'));
    assert.equal((await runCli(root, ['handoff', 'approve', '--feature', feature, '--by', 'maintainer'])).code, 0);
    const tasks = join(root, 'specs', feature, 'tasks.md');
    await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('- [ ] T001', '- [x] T001'));
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature, '--mode', 'converge'])).code, 0);
    await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('Correct the visible label', 'Remove the visible label'));
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature])).code, 1);
  } finally {
    await cleanup();
  }
});

test('F86 CRLF checkout receives, writes, validates and refreshes with LF artifact hashes', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const featureBaton = join(root, handoff);
    const paths = [featureBaton, ...['spec.md', 'plan.md', 'tasks.md', 'review.json']
      .map((name) => join(root, 'specs', feature, name))];
    for (const path of paths) {
      await writeFile(path, (await readFile(path, 'utf8')).replace(/\r?\n/g, '\r\n'));
    }
    const received = await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature, '--json']);
    assert.equal(received.code, 0, received.stdout || received.stderr);
    assert.equal((await runCli(root, ['handoff', 'new', '--quick', 'crlf-fix', '--reason', 'Correct docs typo'])).code, 0);
    const quick = join(root, '.baton/quick/crlf-fix.md');
    await writeFile(quick, (await readFile(quick, 'utf8')).replace(/\n/g, '\r\n'));
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'work', '--quick', 'crlf-fix'])).code, 0);
    await writeInput(root, { summary: 'Corrected docs typo.' });
    const written = await runCli(root, ['handoff', 'write', '--phase', 'work', '--quick', 'crlf-fix', '--from-json', 'handoff-input.json']);
    assert.equal(written.code, 0, written.stdout || written.stderr);
    const validated = await runCli(root, ['validate', '--path', handoff, '--json']);
    assert.equal(validated.code, 0, validated.stdout || validated.stderr);
    const refreshed = await runCli(root, ['handoff', 'refresh', '--feature', feature, '--reason', 'Confirm checkout normalization']);
    assert.equal(refreshed.code, 0, refreshed.stdout || refreshed.stderr);
    assert.equal((await runCli(root, ['validate', '--path', handoff])).code, 0);
  } finally {
    await cleanup();
  }
});

test('F87 rotating checkout token cannot bypass the worktree self-review guard', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    assert.equal((await runCli(root, ['handoff', 'new', '--quick', 'token-rotation', '--reason', 'Correct docs typo'])).code, 0);
    await writeInput(root, { summary: 'Corrected docs typo.' });
    assert.equal((await runCli(root, ['handoff', 'write', '--phase', 'work', '--quick', 'token-rotation', '--from-json', 'handoff-input.json'])).code, 0);
    const path = join(root, '.baton/.local/session.json');
    await rm(path);
    for (const phase of ['review']) {
      const result = await runCli(root, ['handoff', 'receive', '--phase', phase, '--quick', 'token-rotation', '--json']);
      assert.equal(result.code, 3, result.stdout || result.stderr);
      assert.ok(JSON.parse(result.stdout).errors.some((issue) => issue.code === 'E_SELF_REVIEW'));
    }
    const denied = await runCli(root, ['handoff', 'write', '--phase', 'review', '--quick', 'token-rotation',
      '--from-json', 'handoff-input.json', '--json']);
    assert.equal(denied.code, 3, denied.stdout || denied.stderr);
  } finally {
    await cleanup();
  }
});

test('F88 owner override expires after one work to review cycle', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const slug = 'single-cycle';
    assert.equal((await runCli(root, ['handoff', 'new', '--quick', slug, '--reason', 'Correct docs typo'])).code, 0);
    await writeInput(root, { summary: 'Corrected docs typo.' });
    assert.equal((await runCli(root, ['handoff', 'write', '--phase', 'work', '--quick', slug, '--from-json', 'handoff-input.json'])).code, 0);
    const question = await runCli(root, ['handoff', 'question', '--quick', slug, '--tag', 'self-review-override',
      '--reason', 'Exercise one cycle', '--json']);
    assert.equal(question.code, 0, question.stdout);
    assert.equal((await runCli(root, ['handoff', 'answer', JSON.parse(question.stdout).data.question,
      'Allow self-review', '--quick', slug, '--by', 'repository owner'])).code, 0);
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'review', '--quick', slug])).code, 0);
    const findings = JSON.parse(await readFile(join(root, 'specs', feature, 'review.json'), 'utf8'));
    findings.source.run_artifact = `.baton/quick/${slug}.review.json`;
    findings.findings = [{ id: 'F1', severity: 'P1', title: 'Open blocker', file: 'docs/label.md', line: 1,
      persona: 'correctness-reviewer', confidence: 0.9, task: 'T001', disposition: 'open', reason: 'Pending' }];
    await writeFile(join(root, `.baton/quick/${slug}.review.json`), JSON.stringify(findings));
    const current = parseFrontmatter(await readFile(join(root, `.baton/quick/${slug}.md`), 'utf8')).data;
    await writeInput(root, { summary: 'Blocking review finding.', review: {
      findings_path: `.baton/quick/${slug}.review.json`, blocking_findings: 1 },
    decisions: [...current.decisions, { id: 'D5', decision: 'Quick scope held',
      rationale: 'No public contract change', tag: 'quick-scope-held', by: 'baton-review' }] });
    const review = await runCli(root, ['handoff', 'write', '--phase', 'review', '--quick', slug, '--from-json', 'handoff-input.json']);
    assert.equal(review.code, 0, review.stdout || review.stderr);
    await writeInput(root, { summary: 'Addressed blocking finding.' });
    const nextWork = await runCli(root, ['handoff', 'write', '--phase', 'work', '--quick', slug, '--from-json', 'handoff-input.json']);
    assert.equal(nextWork.code, 0, nextWork.stdout || nextWork.stderr);
    const denied = await runCli(root, ['handoff', 'receive', '--phase', 'review', '--quick', slug, '--json']);
    assert.equal(denied.code, 3, denied.stdout || denied.stderr);
    assert.ok(JSON.parse(denied.stdout).errors.some((issue) => issue.code === 'E_SELF_REVIEW'));
  } finally {
    await cleanup();
  }
});

test('F89 initial quick metadata actions retain phase none until work write', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    assert.equal((await runCli(root, ['handoff', 'new', '--quick', 'fresh-quick', '--reason', 'Correct docs typo'])).code, 0);
    assert.equal((await runCli(root, ['handoff', 'refresh', '--quick', 'fresh-quick', '--reason', 'Confirm hashes'])).code, 0);
    assert.equal((await runCli(root, ['validate', '--path', '.baton/quick/fresh-quick.md'])).code, 0);
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'work', '--quick', 'fresh-quick'])).code, 0);
  } finally {
    await cleanup();
  }
});

test('F96 invalid writer token and missing quick baton return actionable errors', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const missing = await runCli(root, ['handoff', 'receive', '--phase', 'work', '--quick', 'missing-baton', '--json']);
    assert.equal(missing.code, 2, missing.stdout || missing.stderr);
    assert.match(missing.stdout + missing.stderr, /E_USAGE/);
    await mkdir(join(root, '.baton/.local'), { recursive: true });
    await writeFile(join(root, '.baton/.local/session.json'), '{}');
    const invalid = await runCli(root, ['handoff', 'next', '--quick', 'missing-baton', '--json']);
    assert.equal(invalid.code, 2, invalid.stdout || invalid.stderr);
    assert.match(invalid.stdout + invalid.stderr, /E_CHECKOUT_TOKEN/);
    assert.match(invalid.stdout + invalid.stderr, /remove that file/);
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

test('F64 quick creation pins a review diff base before work begins', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const result = await runCli(root, ['handoff', 'new', '--quick', 'review-base', '--reason', 'Correct a typo']);
    assert.equal(result.code, 0, result.stderr);
    const { data } = parseFrontmatter(await readFile(join(root, '.baton/quick/review-base.md'), 'utf8'));
    const base = data.decisions.find((item) => item.tag === 'diff-base');
    assert.equal(base?.['x-base-commit'], (await git('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim());
  } finally {
    await cleanup();
  }
});

test('F62 implementation writer cannot self-review or self-land without an answered owner override', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const quick = join(root, '.baton/quick/owner-test.md');
    assert.equal((await runCli(root, ['handoff', 'new', '--quick', 'owner-test', '--reason', 'Correct a typo'])).code, 0);
    await writeInput(root, { summary: 'Corrected typo.' });
    const work = await runCli(root, ['handoff', 'write', '--phase', 'work', '--quick', 'owner-test', '--from-json', 'handoff-input.json']);
    assert.equal(work.code, 0, work.stdout);
    const { data } = parseFrontmatter(await readFile(quick, 'utf8'));
    const writer = data.history.at(-1).writer;
    assert.match(writer, /^[a-f0-9]{64}$/);
    assert.notEqual(data.history.at(-1).by, 'ce-work');
    assert.match((await readFile(join(root, '.baton/.local/session.json'), 'utf8')), /"token"/);
    assert.match((await runCli(root, ['handoff', 'next', '--quick', 'owner-test'])).stdout, /end this session; start a fresh review session/i);
    const denied = await runCli(root, ['handoff', 'receive', '--phase', 'review', '--quick', 'owner-test', '--json']);
    assert.equal(denied.code, 3, denied.stdout);
    assert.ok(JSON.parse(denied.stdout).errors.some((issue) => issue.code === 'E_SELF_REVIEW'));
    await git('git', ['add', '-A'], { cwd: root });
    await git('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'work result'], { cwd: root });
    const second = join(root, 'independent-review');
    await git('git', ['worktree', 'add', '--detach', second, 'HEAD'], { cwd: root });
    try {
      assert.match(await readFile(join(second, '.baton/quick/owner-test.md'), 'utf8'), /^---/);
      const separate = await runCli(second, ['handoff', 'receive', '--phase', 'review', '--quick', 'owner-test', '--json']);
      assert.equal(separate.code, 0, `${separate.stdout}\n${separate.stderr}`);
      const separateToken = JSON.parse(await readFile(join(second, '.baton/.local/session.json'), 'utf8')).token;
      const originalToken = JSON.parse(await readFile(join(root, '.baton/.local/session.json'), 'utf8')).token;
      assert.notEqual(separateToken, originalToken);
    } finally {
      await git('git', ['worktree', 'remove', '--force', second], { cwd: root });
    }
    await editQuickBaton(root, 'owner-test', (current) => {
      current.phase_completed = 'review';
      current.next_phase = 'land';
      current.next_owner = 'baton-land';
      current.review = { findings_path: '.baton/quick/owner-test.review.json', blocking_findings: 0 };
      current.exit_criteria = [{ id: 'findings-json-valid', met: true }];
    });

    const land = await runCli(root, ['handoff', 'write', '--phase', 'land', '--quick', 'owner-test',
      '--from-json', 'handoff-input.json', '--json']);
    assert.equal(land.code, 3, land.stdout);
    assert.ok(JSON.parse(land.stdout).errors.some((issue) => issue.code === 'E_SELF_REVIEW'));
    await editQuickBaton(root, 'owner-test', (current) => {
      current.phase_completed = 'work';
      current.next_phase = 'review';
      current.next_owner = 'baton-review';
      delete current.review;
      current.exit_criteria = [{ id: 'diff-nonempty', met: true }, { id: 'local-checks-pass', met: true }];
    });
    const question = await runCli(root, ['handoff', 'question', '--quick', 'owner-test', '--tag', 'self-review-override',
      '--reason', 'Independent checkout is unavailable', '--json']);
    assert.equal(question.code, 0, question.stdout);
    const id = JSON.parse(question.stdout).data.question;
    assert.equal((await runCli(root, ['handoff', 'answer', id, 'Allow self-review', '--quick', 'owner-test', '--by', 'repository owner'])).code, 0);
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'review', '--quick', 'owner-test'])).code, 0);
  } finally {
    await cleanup();
  }
});

test('F62 writer provenance survives bounded history after later bookkeeping', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    await runCli(root, ['handoff', 'new', '--quick', 'history-test', '--reason', 'Correct a typo']);
    await writeInput(root, { summary: 'Corrected typo.' });
    assert.equal((await runCli(root, ['handoff', 'write', '--phase', 'work', '--quick', 'history-test',
      '--from-json', 'handoff-input.json'])).code, 0);
    await editQuickBaton(root, 'history-test', (data) => {
      data.history = Array.from({ length: 20 }, (_, index) => ({
        phase: 'work', at: new Date().toISOString(), by: 'baton', commit: null,
        writer: 'b'.repeat(64), 'x-action': 'refresh', 'x-sequence': index,
      }));
    });
    const result = await runCli(root, ['handoff', 'receive', '--phase', 'review', '--quick', 'history-test', '--json']);
    assert.equal(result.code, 3, result.stdout);
    assert.ok(JSON.parse(result.stdout).errors.some((item) => item.code === 'E_SELF_REVIEW'));
  } finally { await cleanup(); }
});

test('F66 a partial acceptance result gets a hash-bound waiver through question and answer CLI', async () => {
  const { root, cleanup } = await repo();
  try {
    const tasks = join(root, 'specs', feature, 'tasks.md');
    await writeFile(tasks, (await readFile(tasks, 'utf8')) + '\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | partial — base has no CLI yet; audited test exists |\n');
    await writeInput(root, { summary: 'Implementation complete.' });
    const before = await runCli(root, ['handoff', 'write', '--phase', 'implement', '--feature', feature,
      '--from-json', 'handoff-input.json', '--json']);
    assert.equal(before.code, 1);
    assert.ok(JSON.parse(before.stdout).errors.some((issue) => /acceptance-evidence/.test(issue.message)));
    const asked = await runCli(root, ['handoff', 'question', '--feature', feature, '--check', 'AC-US1-1',
      '--reason', 'Audited missing red evidence', '--json']);
    assert.equal(asked.code, 0, asked.stdout);
    const id = JSON.parse(asked.stdout).data.question;
    const answer = await runCli(root, ['handoff', 'answer', id, 'Waive AC-US1-1', '--feature', feature, '--by', 'repository owner']);
    assert.equal(answer.code, 0, answer.stdout);
    const data = parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data;
    const waiver = data.decisions.at(-1);
    assert.equal(waiver.tag, 'acceptance-waiver');
    assert.equal(waiver['x-check'], 'AC-US1-1');
    assert.equal(waiver['x-evidence-sha256'], await hashFile(tasks));
    assert.equal((await evaluateBuiltIn(root, handoff, data, { id: 'acceptance-evidence' })).met, true);
  } finally {
    await cleanup();
  }
});

test('F63 invalid historic waiver hashes can be revoked through CLI without dropping other decisions', async () => {
  const { root, cleanup } = await repo();
  try {
    await editBaton(root, (data) => {
      data.decisions.push({ id: 'D900', decision: 'Keep scope', rationale: 'No new behavior', by: 'baton' });
      data.decisions.push({
        id: 'D901', decision: 'Waive AC-US1-1', rationale: 'Audited missing original red',
        by: 'human:repository-owner', tag: 'acceptance-waiver',
        'x-check': 'AC-US1-1', 'x-evidence-sha256': 'a'.repeat(64),
      });
    });
    const revoked = await runCli(root, ['handoff', 'revoke-waivers', '--feature', feature,
      '--reason', 'Audit identified invalid raw hashes', '--json']);
    assert.equal(revoked.code, 0, revoked.stdout);
    const data = parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data;
    assert.ok(!data.decisions.some((item) => item.tag === 'acceptance-waiver' && item['x-evidence-sha256'] === 'a'.repeat(64)));
    assert.ok(data.decisions.some((item) => item.id === 'D900'));
    assert.ok(data.decisions.some((item) => item.decision === 'Invalid acceptance waivers revoked'));
  } finally {
    await cleanup();
  }
});

test('F44 handoff body redaction uses CLI and preserves governed fields', async () => {
  const { root, cleanup } = await repo();
  try {
    const before = parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data;
    const redacted = await runCli(root, ['handoff', 'redact', '--feature', feature,
      '--find', 'Correct a label without changing behaviour.', '--replace', 'Correct a label in the scoped work.',
      '--reason', 'Remove private host from narrative', '--json']);
    assert.equal(redacted.code, 0, redacted.stdout);
    const { data, body } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    assert.equal(data.phase_completed, before.phase_completed);
    assert.match(body, /Correct a label in the scoped work/);
    assert.ok(data.decisions.some((item) => item.decision === 'Handoff body redacted'));
  } finally {
    await cleanup();
  }
});

test('F65 answer cannot silently rehash an edited spec past the approved pre-code gate', async () => {
  const { root, cleanup } = await repo();
  try {
    const input = join(root, 'specs', feature, 'spec.md');
    await writeFile(input, (await readFile(input, 'utf8')) + '\nAltered after approval.\n');
    const asked = await runCli(root, ['handoff', 'question', '--feature', feature, '--check', 'AC-US1-1',
      '--reason', 'Audit the partial check', '--json']);
    assert.equal(asked.code, 0, asked.stdout);
    const before = await readFile(join(root, handoff), 'utf8');
    const result = await runCli(root, ['handoff', 'answer', JSON.parse(asked.stdout).data.question,
      'Keep requirement', '--feature', feature, '--by', 'repository owner', '--json']);
    assert.equal(result.code, 1, result.stdout);
    assert.ok(JSON.parse(result.stderr).errors.some((item) => item.code === 'E_STALE_ARTIFACT'));
    assert.equal(await readFile(join(root, handoff), 'utf8'), before);
  } finally { await cleanup(); }
});

test('F67 validation rejects a hand-rewound phase even with plausible exit evidence', async () => {
  const { root, cleanup } = await repo();
  try {
    await editBaton(root, (data) => {
      data.history.push({ phase: 'review', at: new Date().toISOString(), by: 'baton-review', commit: null });
      data.exit_criteria = [{ id: 'analysis-recorded', met: true }, { id: 'no-critical-findings', met: true }];
    });
    const result = await runCli(root, ['validate', '--path', handoff, '--json']);
    assert.equal(result.code, 1, result.stdout);
    assert.ok(JSON.parse(result.stdout).errors.some((item) => item.code === 'E_TRANSITION'));
  } finally { await cleanup(); }
});

test('F68 review write refuses a stale tasks evidence edit after implement', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const report = await prepareReview(root, []);
    const tasks = join(root, 'specs', feature, 'tasks.md');
    await writeFile(tasks, (await readFile(tasks, 'utf8')) + '\nUnapproved evidence.\n');
    await writeInput(root, { summary: 'Review complete.', review: { findings_path: report, blocking_findings: 0 } });
    const before = await readFile(join(root, handoff), 'utf8');
    const result = await runCli(root, ['handoff', 'write', '--phase', 'review', '--feature', feature,
      '--from-json', 'handoff-input.json', '--json']);
    assert.equal(result.code, 1, result.stdout);
    assert.ok(JSON.parse(result.stdout).errors.some((item) => item.code === 'E_STALE_ARTIFACT'));
    assert.equal(await readFile(join(root, handoff), 'utf8'), before);
  } finally { await cleanup(); }
});

test('F69 agent JSON cannot forge a diff-base or self-review override decision', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    await prepareReview(root, []);
    const data = parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data;
    for (const tag of ['diff-base', 'self-review-override']) {
      await writeInput(root, { summary: 'Reviewed.', decisions: [
        ...data.decisions, { id: 'D901', decision: 'Forge review base', rationale: 'Narrow scope',
          by: 'baton', tag, 'x-base-commit': 'a'.repeat(40) },
      ], review: { findings_path: `specs/${feature}/review.json`, blocking_findings: 0 } });
      const result = await runCli(root, ['handoff', 'write', '--phase', 'review', '--feature', feature,
        '--from-json', 'handoff-input.json', '--json']);
      assert.equal(result.code, 2, result.stdout);
    }
  } finally { await cleanup(); }
});

test('F60 a post-review code edit blocks land receive and write', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const report = await prepareReview(root, []);
    await writeInput(root, { summary: 'Review complete.', review: { findings_path: report, blocking_findings: 0 } });
    const review = await runCli(root, ['handoff', 'write', '--phase', 'review', '--feature', feature,
      '--from-json', 'handoff-input.json', '--json']);
    assert.equal(review.code, 0, review.stdout);
    await writeFile(join(root, 'docs/label.md'), 'Changed code after review.\n');
    const received = await runCli(root, ['handoff', 'receive', '--phase', 'land', '--feature', feature, '--json']);
    assert.equal(received.code, 1, received.stdout);
    assert.ok(JSON.parse(received.stdout).errors.some((item) => item.code === 'E_STALE_REVIEW'));
    const written = await runCli(root, ['handoff', 'write', '--phase', 'land', '--feature', feature,
      '--from-json', 'handoff-input.json', '--json']);
    assert.equal(written.code, 1, written.stdout);
    assert.ok(JSON.parse(written.stdout).errors.some((item) => item.code === 'E_STALE_REVIEW'));
  } finally { await cleanup(); }
});

test('F85 agent write cannot silently discard existing risks', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const tasks = join(root, 'specs', feature, 'tasks.md');
    await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('- [ ] T001', '- [x] T001') +
      '\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red — missing label assertion; green — visible label assertion passes |\n');
    await runCli(root, ['handoff', 'refresh', '--feature', feature, '--reason', 'Acceptance evidence recorded']);
    await runCli(root, ['handoff', 'approve', '--feature', feature, '--by', 'maintainer']);
    await editBaton(root, (data) => { data.risks = [{ id: 'R1', text: 'Owner review pending', severity: 'high' }]; });
    await writeInput(root, { summary: 'Implementation complete.', risks: [] });
    const result = await runCli(root, ['handoff', 'write', '--phase', 'implement', '--feature', feature,
      '--from-json', 'handoff-input.json', '--json']);
    assert.equal(result.code, 0, result.stdout || result.stderr);
    const data = parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data;
    assert.ok(data.risks.some((item) => item.id === 'R1'));
  } finally { await cleanup(); }
});

test('F84 write dry-run is rejected without mutating the baton', async () => {
  const { root, cleanup } = await repo();
  try {
    await writeInput(root, { summary: 'Dry run must not persist.' });
    const before = await readFile(join(root, handoff), 'utf8');
    const result = await runCli(root, ['handoff', 'write', '--phase', 'implement', '--feature', feature,
      '--from-json', 'handoff-input.json', '--dry-run', '--json']);
    assert.equal(result.code, 2, result.stdout || result.stderr);
    assert.match(result.stdout + result.stderr, /E_USAGE/);
    assert.equal(await readFile(join(root, handoff), 'utf8'), before);
  } finally { await cleanup(); }
});

test('F75 review scope CLI exposes the pinned base and exact non-bookkeeping changed files', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    assert.equal((await runCli(root, ['handoff', 'new', '--quick', 'scope-test', '--reason', 'Correct a typo'])).code, 0);
    const result = await runCli(root, ['handoff', 'scope', '--quick', 'scope-test', '--json']);
    assert.equal(result.code, 0, result.stdout || result.stderr);
    const scope = JSON.parse(result.stdout).data;
    assert.equal(scope.base, (await git('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim());
    assert.deepEqual(scope.files, ['docs/label.md']);
  } finally { await cleanup(); }
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

test('F01/F20 write cannot skip a pending human gate or erase its approval requirement', async () => {
  const { root, cleanup } = await repo();
  try {
    await editBaton(root, (data) => {
      data.gate.approved_by = null;
      data.gate.approved_at = null;
    });
    await writeInput(root, { summary: 'Implementation complete.' });
    const before = await readFile(join(root, handoff), 'utf8');
    const result = await runHandoff(root, ['write', '--phase', 'implement', '--feature', feature, '--from-json', 'handoff-input.json']);
    assert.equal(result.exitCode, 3);
    assert.ok(result.errors.some((issue) => issue.code === 'E_GATE_PENDING'), JSON.stringify(result.errors));
    assert.equal(await readFile(join(root, handoff), 'utf8'), before);
  } finally {
    await cleanup();
  }
});

test('F01 write rejects needs-human and unmet entry checks before phase closure', async () => {
  const { root, cleanup } = await repo();
  try {
    await writeInput(root, { summary: 'Implementation complete.' });
    await editBaton(root, (data) => { data.status = 'needs-human'; });
    const blocked = await runHandoff(root, ['write', '--phase', 'implement', '--feature', feature, '--from-json', 'handoff-input.json']);
    assert.equal(blocked.exitCode, 3);
    assert.ok(blocked.errors.some((issue) => issue.code === 'E_BLOCKING_OPEN'), JSON.stringify(blocked.errors));
    await editBaton(root, (data) => {
      data.status = 'ready';
      data.acceptance_checks = [];
    });
    const missing = await runHandoff(root, ['write', '--phase', 'implement', '--feature', feature, '--from-json', 'handoff-input.json']);
    assert.ok(missing.errors.some((issue) => issue.code === 'E_NO_PREREG'), JSON.stringify(missing.errors));
    assert.equal(parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data.phase_completed, 'analyze');
  } finally {
    await cleanup();
  }
});

test('F02 review derives the open P1 count and routes feature review back to implement', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const reviewPath = await prepareReview(root, [{
      id: 'F01', severity: 'P1', title: 'A blocking finding', file: 'src/commands/handoff.mjs',
      line: 1, persona: 'correctness-reviewer', confidence: 0.95, task: 'T001',
      disposition: 'open', reason: null,
    }]);
    await writeInput(root, { summary: 'Review identified a blocking issue.', review: { findings_path: reviewPath, blocking_findings: 0 } });
    const result = await runHandoff(root, ['write', '--phase', 'review', '--feature', feature, '--from-json', 'handoff-input.json']);
    assert.deepEqual(result.errors, []);
    const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    assert.equal(data.review.blocking_findings, 1);
    assert.equal(data.next_phase, 'implement');
    const land = await runHandoff(root, ['receive', '--phase', 'land', '--feature', feature]);
    assert.notEqual(land.exitCode, 0);
    assert.ok(land.errors.some((issue) => ['E_REVIEW_BLOCKING', 'E_TRANSITION'].includes(issue.code)));
  } finally {
    await cleanup();
  }
});

test('F02 land entry recomputes blocking findings instead of trusting a saved zero count', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const reviewPath = await prepareReview(root, [{
      id: 'F01', severity: 'P1', title: 'Blocking issue', file: 'src/commands/handoff.mjs',
      line: 1, persona: 'correctness-reviewer', confidence: 0.95, task: 'T001',
      disposition: 'open', reason: null,
    }]);
    await editBaton(root, (data) => {
      data.phase_completed = 'review';
      data.next_phase = 'land';
      data.next_owner = 'baton-land';
      data.model_role = 'implementation';
      data.review = { findings_path: reviewPath, blocking_findings: 0 };
      data.exit_criteria = [{ id: 'findings-json-valid', met: true }, { id: 'findings-mapped-to-tasks-or-dismissed', met: true }];
      data.history.push({ phase: 'review', at: new Date().toISOString(), by: 'baton-review', commit: null });
    });
    const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    const check = await evaluateBuiltIn(root, handoff, data, { id: 'no-blocking-findings' });
    assert.equal(check.met, false);
    const receive = await runHandoff(root, ['receive', '--phase', 'land', '--feature', feature]);
    assert.ok(receive.errors.some((issue) => issue.code === 'E_REVIEW_BLOCKING'), JSON.stringify(receive.errors));
  } finally {
    await cleanup();
  }
});

test('F02 quick review automatically returns to work for open blocking findings', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    await runHandoff(root, ['new', '--quick', 'label-fix', '--reason', 'Correct a docs typo only']);
    const quick = join(root, '.baton/quick/label-fix.md');
    const { data, body } = parseFrontmatter(await readFile(quick, 'utf8'));
    data.phase_completed = 'work';
    data.next_phase = 'review';
    data.next_owner = 'baton-review';
    data.model_role = 'review';
    data.exit_criteria = [{ id: 'diff-nonempty', met: true }, { id: 'local-checks-pass', met: true }];
    await writeFile(quick, serializeFrontmatter(data, body));
    const findings = JSON.parse(await readFile(join(root, 'specs/001-sample/review.json'), 'utf8'));
    findings.source.run_artifact = '.baton/quick/label-fix.review.json';
    findings.findings = [{
      id: 'F01', severity: 'P0', title: 'Blocking quick finding', file: 'docs/label.md',
      line: 1, persona: 'correctness-reviewer', confidence: 0.95,
      disposition: 'open', reason: null,
    }];
    await writeFile(join(root, '.baton/quick/label-fix.review.json'), JSON.stringify(findings));
    await writeInput(root, {
      summary: 'Open blocking issue.', review: { findings_path: '.baton/quick/label-fix.review.json', blocking_findings: 0 },
      decisions: [...data.decisions, { id: 'D3', decision: 'Quick scope held', rationale: 'No new behaviour', tag: 'quick-scope-held', by: 'baton-review' }],
    });
    const result = await runHandoff(root, ['write', '--phase', 'review', '--quick', 'label-fix', '--from-json', 'handoff-input.json']);
    assert.deepEqual(result.errors, []);
    assert.equal(result.data?.next_phase, 'work');
    const { data: updated } = parseFrontmatter(await readFile(quick, 'utf8'));
    assert.equal(updated.review.blocking_findings, 1);
    assert.equal(updated.next_phase, 'work');
    assert.deepEqual((await runHandoff(root, ['receive', '--phase', 'work', '--quick', 'label-fix'])).errors, []);
  } finally {
    await cleanup();
  }
});

test('F03 after_converge hook writes with --mode converge', async () => {
  const hook = await readFile(join(sourceRoot, 'baton/speckit-extension/commands/handoff.md'), 'utf8');
  const installed = await readFile(join(sourceRoot, '.specify/extensions/baton/commands/handoff.md'), 'utf8');
  assert.equal(installed, hook);
  assert.match(hook, /after_converge[\s\S]*?--mode converge/);
  const { root, cleanup } = await quickRepo();
  try {
    await prepareReview(root, []);
    const tasks = join(root, 'specs', feature, 'tasks.md');
    await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('- [ ] T001', '- [x] T001') +
      '\n## Evidence\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red: old assertion failed; green: updated assertion passes |\n');
    await runHandoff(root, ['refresh', '--feature', feature, '--reason', 'Record acceptance evidence']);
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--mode', 'converge', '--feature', feature])).code, 0);
    await writeInput(root, { summary: 'Converged implementation.' });
    assert.equal((await runCli(root, ['handoff', 'write', '--phase', 'implement', '--mode', 'converge',
      '--feature', feature, '--from-json', 'handoff-input.json'])).code, 0);
    assert.equal(parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data.next_phase, 'review');
  } finally {
    await cleanup();
  }
});

test('F04 before_specify works with finished features and ambiguous feature directories', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'specify'])).code, 0);
    await cp(join(root, 'specs', feature), join(root, 'specs/002-other'), { recursive: true });
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'specify'])).code, 0);
  } finally {
    await cleanup();
  }
});

test('F05 after_specify hook writes a new feature inferred from the branch', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    await cp(join(root, 'specs', feature), join(root, 'specs/002-next-thing'), { recursive: true });
    await rm(join(root, 'specs/002-next-thing/handoff.md'));
    await git('git', ['checkout', '-qb', '002-next-thing'], { cwd: root, windowsHide: true });
    await writeInput(root, { summary: 'Specify second feature.' });
    const result = await runCli(root, ['handoff', 'write', '--phase', 'specify', '--next', 'plan',
      '--from-json', 'handoff-input.json', '--json']);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    const written = parseFrontmatter(await readFile(join(root, 'specs/002-next-thing/handoff.md'), 'utf8')).data;
    assert.equal(written.feature, '002-next-thing');
    assert.equal(written.next_phase, 'plan');
  } finally {
    await cleanup();
  }
});

test('F31 review rejects clean decoys and outside-phase findings replacement', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const canonical = await prepareReview(root, [{
      id: 'F01', severity: 'P1', title: 'Blocking issue', file: 'src/commands/handoff.mjs',
      line: 1, persona: 'correctness-reviewer', confidence: 0.95, task: 'T001',
      disposition: 'open', reason: null,
    }]);
    const clean = JSON.parse(await readFile(join(root, canonical), 'utf8'));
    clean.findings = [];
    await writeFile(join(root, 'clean.json'), JSON.stringify(clean));
    await writeInput(root, { summary: 'Try decoy.', review: { findings_path: 'clean.json', blocking_findings: 0 } });
    const result = await runCli(root, ['handoff', 'write', '--phase', 'review', '--feature', feature,
      '--from-json', 'handoff-input.json', '--json']);
    assert.notEqual(result.code, 0);
    assert.equal(parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data.next_phase, 'review');
    await editBaton(root, (data) => {
      data.phase_completed = 'analyze';
      data.next_phase = 'implement';
      data.next_owner = 'speckit-implement';
      data.model_role = 'implementation';
      data.gate = { required: true, approved_by: 'maintainer', approved_at: '2026-09-24' };
    });
    const injection = await runCli(root, ['handoff', 'write', '--phase', 'implement', '--feature', feature,
      '--from-json', 'handoff-input.json', '--json']);
    assert.equal(injection.code, 2, injection.stdout + injection.stderr);
  } finally {
    await cleanup();
  }
});

    test('F09 analyze records a durable implementation diff base', async () => {
      const { root, cleanup } = await quickRepo();
      try {
        const base = (await git('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true })).stdout.trim();
        await editBaton(root, (data) => {
          data.phase_completed = 'tasks';
          data.next_phase = 'analyze';
          data.next_owner = 'speckit-analyze';
          data.model_role = 'review';
          data.gate = { required: false, approved_by: null, approved_at: null };
          data.history.push({ phase: 'tasks', at: new Date().toISOString(), by: 'speckit-tasks', commit: null });
        });

        await writeInput(root, { summary: 'No critical analysis findings.' });
        const result = await runCli(root, ['handoff', 'write', '--phase', 'analyze', '--feature', feature,
          '--from-json', 'handoff-input.json', '--json']);
        assert.equal(result.code, 0, result.stdout + result.stderr);
        const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
        assert.equal(data.decisions.findLast((decision) => decision.tag === 'diff-base')?.['x-base-commit'], base);
      } finally {
        await cleanup();
      }
    });

test('F09 first review still sees implementation after origin advances', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const base = (await git('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true })).stdout.trim();
    await editBaton(root, (data) => {
      data.phase_completed = 'tasks';
      data.next_phase = 'analyze';
      data.next_owner = 'speckit-analyze';
      data.model_role = 'review';
      data.gate = { required: false, approved_by: null, approved_at: null };
    });
    await writeInput(root, { summary: 'Analyze approved.' });
    assert.equal((await runCli(root, ['handoff', 'write', '--phase', 'analyze', '--feature', feature,
      '--from-json', 'handoff-input.json'])).code, 0);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src/feature.mjs'), 'export const feature = true;\n');
    await git('git', ['add', 'src/feature.mjs'], { cwd: root, windowsHide: true });
    await git('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
      'commit', '-qm', 'implement feature'], { cwd: root, windowsHide: true });
    await git('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: root, windowsHide: true });
    await editBaton(root, (data) => {
      data.phase_completed = 'implement';
      data.next_phase = 'review';
      data.next_owner = 'baton-review';
      data.model_role = 'review';
      data.gate = { required: false, approved_by: null, approved_at: null };
      data.exit_criteria = [
        { id: 'tasks-all-checked-or-deferred', met: true },
        { id: 'acceptance-evidence', met: true },
        { id: 'local-checks-pass', met: true },
      ];
      data.history.push({ phase: 'implement', at: new Date().toISOString(), by: 'speckit-implement', commit: null });
    });
    const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    assert.equal(data.decisions.findLast((decision) => decision.tag === 'diff-base')?.['x-base-commit'], base);
    const received = await runCli(root, ['handoff', 'receive', '--phase', 'review', '--feature', feature, '--json']);
    assert.equal(received.code, 0, received.stdout + received.stderr);
  } finally {
    await cleanup();
  }
});

    test('F32 implement write accepts legitimate task progress after receive', async () => {
      const { root, cleanup } = await quickRepo();
      try {
        assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature])).code, 0);
        const tasks = join(root, 'specs', feature, 'tasks.md');
        await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('- [ ] T001', '- [x] T001') +
          '\n## Evidence\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red: original assertion failed; green: corrected assertion passed |\n');
        await writeInput(root, { summary: 'Implementation completed.' });
        const result = await runCli(root, ['handoff', 'write', '--phase', 'implement', '--feature', feature,
          '--from-json', 'handoff-input.json', '--json']);
        assert.equal(result.code, 0, result.stdout + result.stderr);
      } finally {
        await cleanup();
      }
    });

test('approved spec and plan changes cannot be rehashed by implement write', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const batonPath = join(root, handoff);
    assert.equal((await runCli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature])).code, 0);
    const original = await readFile(batonPath, 'utf8');
    for (const name of ['spec', 'plan']) {
      const path = join(root, 'specs', feature, `${name}.md`);
      const before = await readFile(path, 'utf8');
      await writeFile(path, `${before}\nNew unapproved ${name} decision.\n`);
      await writeInput(root, { summary: 'Do not erase pre-code approval scope.' });
      const result = await runCli(root, ['handoff', 'write', '--phase', 'implement', '--feature', feature,
        '--from-json', 'handoff-input.json', '--json']);
      assert.equal(result.code, 1, result.stdout + result.stderr);
      assert.ok(JSON.parse(result.stdout).errors.some(({ code }) => code === 'E_STALE_ARTIFACT'), name);
      assert.equal(await readFile(batonPath, 'utf8'), original);
      await writeFile(path, before);
    }
  } finally { await cleanup(); }
});

    test('F35 refresh revokes an approved gate when derived tasks change', async () => {
      const { root, cleanup } = await repo();
      try {
        const tasks = join(root, 'specs', feature, 'tasks.md');
        await writeFile(tasks, (await readFile(tasks, 'utf8')) + '\nAdded acceptance detail.\n');
        await runHandoff(root, ['refresh', '--feature', feature, '--reason', 'Derived task change']);
        const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
        assert.equal(data.gate.approved_by, null);
      } finally {
        await cleanup();
      }
    });

test('F35 an agent cannot relabel an existing source artifact', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    await writeInput(root, {
      summary: 'Change source role.',
      artifacts: data.artifacts.map((item) => item.path.endsWith('/spec.md')
        ? { ...item, role: 'evidence' } : item),
    });
    const result = await runCli(root, ['handoff', 'write', '--phase', 'implement', '--feature', feature,
      '--from-json', 'handoff-input.json', '--json']);
    assert.equal(result.code, 2, result.stdout + result.stderr);
    assert.equal(parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data.artifacts[0].role, 'source-of-truth');
  } finally {
    await cleanup();
  }
});

    test('F36 implement cannot discard a pre-registered acceptance check', async () => {
      const { root, cleanup } = await quickRepo();
      try {
        const tasks = join(root, 'specs', feature, 'tasks.md');
        await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('- [ ] T001', '- [x] T001') +
          '\n## Evidence\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red: original assertion failed; green: corrected assertion passed |\n');
        await writeInput(root, { summary: 'Completed implementation.', acceptance_checks: [] });
        const result = await runCli(root, ['handoff', 'write', '--phase', 'implement', '--feature', feature,
          '--from-json', 'handoff-input.json', '--json']);
        assert.equal(result.code, 0, result.stdout + result.stderr);
        assert.equal(parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data.acceptance_checks.length, 1);
      } finally {
        await cleanup();
      }
    });

    test('F41 next instructs resolving a pending gate rather than proceeding', async () => {
      const { root, cleanup } = await repo();
      try {
        await editBaton(root, (data) => { data.gate.approved_by = null; data.gate.approved_at = null; });
        const result = await runHandoff(root, ['next', '--feature', feature]);
        assert.equal(result.data.blocked, true);
        assert.match(result.data.instruction, /Show baton handoff approve.*to an authorized human and wait/);
        await editBaton(root, (data) => {
          data.status = 'needs-human';
          data.open_questions = [{ id: 'Q1', question: 'Who approves?', blocking: true, options: ['Wait'] }];
        });
        const question = await runHandoff(root, ['next', '--feature', feature]);
        assert.match(question.data.instruction, /Show baton handoff answer Q1.*to an authorized human and wait/);
      } finally {
        await cleanup();
      }
    });

    test('F50 escalation retains needs-human while questions remain open', async () => {
      const { root, cleanup } = await repo();
      try {
        await runHandoff(root, ['new', '--quick', 'scope', '--reason', 'Small edit']);
        const location = join(root, '.baton/quick/scope.md');
        const { data, body } = parseFrontmatter(await readFile(location, 'utf8'));
        data.phase_completed = 'work';
        data.next_phase = 'review';
        data.next_owner = 'baton-review';
        data.status = 'needs-human';
        data.open_questions = [{ id: 'Q1', question: 'What scope?', blocking: true, options: ['Small', 'Large'] }];
        await writeFile(location, serializeFrontmatter(data, body));
        const result = await runHandoff(root, ['escalate', '--quick', 'scope', '--reason', 'Need a feature']);
        assert.equal(result.data.from_quick, '.baton/quick/scope.md');
        assert.equal(parseFrontmatter(await readFile(location, 'utf8')).data.status, 'needs-human');
      } finally {
        await cleanup();
      }
    });

    test('F53 missing or escaping JSON payload reports usage rather than internal error', async () => {
      const { root, cleanup } = await repo();
      try {
        for (const path of ['missing.json', '../outside.json']) {
          const result = await runCli(root, ['handoff', 'write', '--phase', 'implement', '--feature', feature,
            '--from-json', path, '--json']);
          assert.equal(result.code, 2, `${path}: ${result.stdout}${result.stderr}`);
        }
      } finally {
        await cleanup();
      }
    });

    test('F37 a human answer can explicitly waive one partial acceptance check', async () => {
      const { root, cleanup } = await quickRepo();
      try {
        const tasks = join(root, 'specs', feature, 'tasks.md');
        await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('- [ ] T001', '- [x] T001') +
          '\n## Evidence\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | partial — original red result was not retained; current test passes |\n');
        await editBaton(root, (data) => {
          data.status = 'needs-human';
          data.open_questions = [{
            id: 'Q1', blocking: true, question: 'Waive missing red evidence for AC-US1-1?',
            'x-check': 'AC-US1-1', options: ['Waive missing red evidence', 'Keep unmet'],
          }];
        });

        const answered = await runCli(root, ['handoff', 'answer', 'Q1', 'Waive missing red evidence',
          '--feature', feature, '--by', 'maintainer', '--json']);
        assert.equal(answered.code, 0, answered.stdout + answered.stderr);
        const decisions = parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data.decisions;
        assert.ok(decisions.some((item) => item.by === 'human:maintainer' &&
          item.tag === 'acceptance-waiver' && item['x-check'] === 'AC-US1-1'));
        await writeInput(root, { summary: 'Waived red baseline with human approval.' });
        const written = await runCli(root, ['handoff', 'write', '--phase', 'implement', '--feature', feature,
          '--from-json', 'handoff-input.json', '--json']);
        assert.equal(written.code, 0, written.stdout + written.stderr);
      } finally {
        await cleanup();
      }
    });
test('changing partial evidence invalidates the earlier human waiver', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const tasks = join(root, 'specs', feature, 'tasks.md');
    const evidence = '\n## Evidence\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | partial — original red result missing; green assertion passes |\n';
    await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('- [ ] T001', '- [x] T001') + evidence);
    await editBaton(root, (data) => {
      data.status = 'needs-human';
      data.open_questions = [{ id: 'Q1', blocking: true, question: 'Waive this recorded result?',
        'x-check': 'AC-US1-1', options: ['Waive missing red evidence', 'Keep unmet'] }];
    });
    assert.equal((await runCli(root, ['handoff', 'answer', 'Q1', 'Waive missing red evidence',
      '--feature', feature, '--by', 'repository owner', '--json'])).code, 0);
    await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('green assertion passes', 'different green assertion passes'));
    await writeInput(root, { summary: 'Changed partial result needs renewed approval.' });
    const result = await runCli(root, ['handoff', 'write', '--phase', 'implement', '--feature', feature,
      '--from-json', 'handoff-input.json', '--json']);
    assert.equal(result.code, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /acceptance-evidence.*partial.*tagged human waiver/s);
  } finally { await cleanup(); }
});
test('F03/F20 converge receive can be followed by a converged implement write', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    await prepareReview(root, []);
    const tasks = join(root, 'specs', feature, 'tasks.md');
    await writeFile(tasks, (await readFile(tasks, 'utf8')).replace('- [ ] T001', '- [x] T001') +
      '\n## Evidence\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red: old label assertion fails; green: updated label assertion passes |\n');
    await runHandoff(root, ['refresh', '--feature', feature, '--reason', 'Acceptance evidence recorded']);
    assert.deepEqual((await runHandoff(root, ['receive', '--phase', 'implement', '--mode', 'converge', '--feature', feature])).errors, []);
    await writeInput(root, { summary: 'Converge finished.' });
    const result = await runHandoff(root, ['write', '--phase', 'implement', '--mode', 'converge', '--feature', feature, '--from-json', 'handoff-input.json']);
    assert.deepEqual(result.errors, []);
    const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    assert.equal(data.next_phase, 'review');
    assert.equal(data.history.at(-1).phase, 'implement');
  } finally {
    await cleanup();
  }
});

test('F04 fresh specify receive returns first-phase context without an existing baton', async () => {
  const { root, cleanup } = await repo();
  try {
    await rm(join(root, handoff));
    const result = await runHandoff(root, ['receive', '--phase', 'specify', '--feature', feature]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.exitCode, 0);
    assert.ok(Array.isArray(result.data.read_first));
  } finally {
    await cleanup();
  }
});

test('F04 fresh specify receive does not crash when specs does not exist yet', async () => {
  const { root, cleanup } = await repo();
  try {
    await rm(join(root, 'specs'), { recursive: true });
    const received = await runHandoff(root, ['receive', '--phase', 'specify']);
    assert.equal(received.exitCode, 0);
    assert.deepEqual(received.errors, []);
  } finally {
    await cleanup();
  }
});

test('F04 escalated quick evidence permits a specify receive before feature baton creation', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    await runHandoff(root, ['new', '--quick', 'label-fix', '--reason', 'Correct a docs typo']);
    await writeInput(root, { summary: 'Corrected the typo.' });
    assert.deepEqual((await runHandoff(root, ['write', '--phase', 'work', '--quick', 'label-fix', '--from-json', 'handoff-input.json'])).errors, []);
    assert.deepEqual((await runHandoff(root, ['escalate', '--quick', 'label-fix', '--reason', 'New behaviour required'])).errors ?? [], []);
    await rm(join(root, handoff));
    const received = await runHandoff(root, ['receive', '--phase', 'specify', '--feature', feature, '--from-quick', '.baton/quick/label-fix.md']);
    assert.deepEqual(received.errors, []);
    assert.ok(received.data.read_first.some((item) => item.path === '.baton/quick/label-fix.md'));
  } finally {
    await cleanup();
  }
});

test('F05 plain first specify write can skip clarification when no baton exists', async () => {
  const { root, cleanup } = await repo();
  try {
    await rm(join(root, handoff));
    await writeInput(root, { summary: 'One bounded story.' });
    const result = await runHandoff(root, ['write', '--phase', 'specify', '--feature', feature, '--next', 'plan', '--from-json', 'handoff-input.json']);
    assert.deepEqual(result.errors, []);
    const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    assert.equal(data.next_phase, 'plan');
    assert.equal(data.gate.required, true);
  } finally {
    await cleanup();
  }
});

test('F06 multiple features resolve the active feature from the git branch', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    await cp(join(root, 'specs', feature), join(root, 'specs/002-other'), { recursive: true });
    const otherHandoff = join(root, 'specs/002-other/handoff.md');
    const { data, body } = parseFrontmatter(await readFile(otherHandoff, 'utf8'));
    data.feature = '002-other';
    data.next_phase = 'review';
    data.next_owner = 'baton-review';
    data.model_role = 'review';
    await writeFile(otherHandoff, serializeFrontmatter(data, body));
    await git('git', ['checkout', '-qb', feature], { cwd: root, windowsHide: true });
    const next = await runHandoff(root, ['next']);
    assert.equal(next.data.command, '/speckit-implement');
    await git('git', ['checkout', '-qb', '002-other'], { cwd: root, windowsHide: true });
    assert.equal((await runHandoff(root, ['next'])).data.command, '/baton-review');
  } finally {
    await cleanup();
  }
});

test('F06 feature metadata selects the active feature when the branch has no feature suffix', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const other = '002-other';
    await cp(join(root, 'specs', feature), join(root, 'specs', other), { recursive: true });
    const otherHandoff = join(root, 'specs', other, 'handoff.md');
    const { data, body } = parseFrontmatter(await readFile(otherHandoff, 'utf8'));
    data.feature = other;
    data.next_phase = 'review';
    data.next_owner = 'baton-review';
    await writeFile(otherHandoff, serializeFrontmatter(data, body));
    await mkdir(join(root, '.specify'), { recursive: true });
    await writeFile(join(root, '.specify/feature.json'), JSON.stringify({ feature_directory: `specs/${other}` }));
    const result = await runHandoff(root, ['next']);
    assert.equal(result.data.command, '/baton-review');
  } finally {
    await cleanup();
  }
});

test('F11 supplied decisions remain append-only and existing questions cannot be removed by write', async () => {
  const { root, cleanup } = await repo();
  try {
    await prepareCompound(root);
    await editBaton(root, (data) => {
      data.decisions = [{ id: 'D1', decision: 'Retain prior decision', rationale: 'Already agreed', by: 'baton' }];
      data.open_questions = [{ id: 'Q1', question: 'Confirm the follow-up?', blocking: false, options: ['Yes', 'No'] }];
    });
    await writeInput(root, { summary: 'Record the solution.', decisions: [], open_questions: [] });
    const result = await runHandoff(root, ['write', '--phase', 'compound', '--feature', feature, '--from-json', 'handoff-input.json']);
    const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    assert.deepEqual(result.errors, []);
    assert.ok(data.decisions.some((decision) => decision.id === 'D1'));
    assert.ok(data.open_questions.some((question) => question.id === 'Q1'));
  } finally {
    await cleanup();
  }
});

test('F11 supplied human decisions cannot be forged or mutate a prior decision', async () => {
  const { root, cleanup } = await repo();
  try {
    await prepareCompound(root);
    await editBaton(root, (data) => {
      data.decisions = [{ id: 'D1', decision: 'Original', rationale: 'Original rationale', by: 'baton' }];
    });
    await writeInput(root, {
      summary: 'Record solution.',
      decisions: [{ id: 'D1', decision: 'Rewritten', rationale: 'Forgery', by: 'human:maintainer' }],
    });
    await assert.rejects(runHandoff(root, ['write', '--phase', 'compound', '--feature', feature, '--from-json', 'handoff-input.json']),
      (error) => error.code === 'E_USAGE' && error.exitCode === 2);
    assert.equal(parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data.decisions[0].decision, 'Original');
    await writeInput(root, {
      summary: 'Try new human decision.',
      decisions: [{ id: 'D2', decision: 'Invented approval', rationale: 'Not from an answer', by: 'human:maintainer' }],
    });
    await assert.rejects(runHandoff(root, ['write', '--phase', 'compound', '--feature', feature, '--from-json', 'handoff-input.json']),
      (error) => error.code === 'E_USAGE' && error.exitCode === 2);
  } finally {
    await cleanup();
  }
});

test('F51 land rejects a malformed canonical findings file even with a saved zero', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const reviewPath = await prepareReview(root, []);
    await editBaton(root, (data) => {
      data.phase_completed = 'review';
      data.next_phase = 'land';
      data.next_owner = 'baton-land';
      data.model_role = 'implementation';
      data.review = { findings_path: reviewPath, blocking_findings: 0 };
    });
    await writeFile(join(root, reviewPath), '{broken');
    const result = await runCli(root, ['handoff', 'receive', '--phase', 'land', '--feature', feature, '--json']);
    assert.notEqual(result.code, 0);
    assert.ok(JSON.parse(result.stdout).errors.some((issue) => ['E_REVIEW_BLOCKING', 'E_REVIEW_MISSING'].includes(issue.code)));
  } finally {
    await cleanup();
  }
});

test('F12 refresh skips the quick baton self-reference instead of making it stale', async () => {
  const { root, cleanup } = await repo();
  try {
    await runHandoff(root, ['new', '--quick', 'self-reference', '--reason', 'Correct a label']);
    const path = '.baton/quick/self-reference.md';
    const location = join(root, path);
    const { data, body } = parseFrontmatter(await readFile(location, 'utf8'));
    data.artifacts.push({ path, role: 'evidence', sha256: await hashFile(location) });
    await writeFile(location, serializeFrontmatter(data, body));
    const result = await runHandoff(root, ['refresh', '--quick', 'self-reference', '--reason', 'Intentional edit']);
    assert.ok(result.data.decision);
    assert.ok(!(await validateHandoff(root, path)).some((issue) => issue.code === 'E_STALE_ARTIFACT'));
  } finally {
    await cleanup();
  }
});

test('F12 refresh revokes prior gate approval after a source-of-truth edit', async () => {
  const { root, cleanup } = await repo();
  try {
    const spec = join(root, 'specs', feature, 'spec.md');
    await writeFile(spec, (await readFile(spec, 'utf8')) + '\nChanged scope.\n');
    await runHandoff(root, ['refresh', '--feature', feature, '--reason', 'Scope changed']);
    const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    assert.equal(data.gate.approved_by, null);
    assert.equal(data.gate.approved_at, null);
  } finally {
    await cleanup();
  }
});

test('F12 refresh initializes a missing decisions array before recording its reason', async () => {
  const { root, cleanup } = await repo();
  try {
    await editBaton(root, (data) => { delete data.decisions; });
    const result = await runHandoff(root, ['refresh', '--feature', feature, '--reason', 'Intentional source edit']);
    assert.equal(result.data.decision, 'D1');
    assert.equal(parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data.decisions[0].rationale, 'Intentional source edit');
  } finally {
    await cleanup();
  }
});

test('F18 local check failures on land receive use check failure, not missing artifact', async () => {
  const { root, cleanup } = await quickRepo();
  try {
    const reviewPath = await prepareReview(root, []);
    await editBaton(root, (data) => {
      data.phase_completed = 'review';
      data.next_phase = 'land';
      data.next_owner = 'baton-land';
      data.model_role = 'implementation';
      data.review = { findings_path: reviewPath, blocking_findings: 0 };
      data.exit_criteria = [{ id: 'findings-json-valid', met: true }, { id: 'findings-mapped-to-tasks-or-dismissed', met: true }];
      data.history.push({ phase: 'review', at: new Date().toISOString(), by: 'baton-review', commit: null });
    });
    const configPath = join(root, '.baton/config.yml');
    const config = YAML.parse(await readFile(configPath, 'utf8'));
    config.checks = [{ name: 'failing', run: 'node -e "process.exit(7)"' }];
    await writeFile(configPath, YAML.stringify(config));
    const result = await runHandoff(root, ['receive', '--phase', 'land', '--feature', feature]);
    assert.ok(result.errors.some((issue) => issue.code === 'E_CHECK_FAILED' && /failing: 7/.test(issue.message)), JSON.stringify(result.errors));
    assert.ok(!result.errors.some((issue) => issue.code === 'E_MISSING_ARTIFACT'));
  } finally {
    await cleanup();
  }
});

test('F20 answer rejects unknown questions and invalid choices without mutating the baton', async () => {
  const { root, cleanup } = await repo();
  try {
    await editBaton(root, (data) => {
      data.status = 'needs-human';
      data.open_questions = [{ id: 'Q1', question: 'Which way?', blocking: true, options: ['Keep', 'Revisit'] }];
    });
    const before = await readFile(join(root, handoff), 'utf8');
    await assert.rejects(runHandoff(root, ['answer', 'Q99', 'Keep', '--feature', feature, '--by', 'maintainer']),
      (error) => error.code === 'E_USAGE' && error.exitCode === 2);
    await assert.rejects(runHandoff(root, ['answer', 'Q1', 'Delete', '--feature', feature, '--by', 'maintainer']),
      (error) => error.code === 'E_USAGE' && error.exitCode === 2);
    assert.equal(await readFile(join(root, handoff), 'utf8'), before);
    const answered = await runHandoff(root, ['answer', 'Q1', 'Keep', '--feature', feature, '--by', 'maintainer']);
    assert.equal(answered.data.question, 'Q1');
    const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    assert.deepEqual(data.open_questions, []);
    assert.equal(data.status, 'ready');
    assert.ok(data.decisions.some((decision) => decision.decision === 'Keep' && decision.by === 'human:maintainer'));
  } finally {
    await cleanup();
  }
});

test('F20 an approved gate cannot be approved twice', async () => {
  const { root, cleanup } = await repo();
  try {
    await editBaton(root, (data) => {
      data.gate.approved_by = null;
      data.gate.approved_at = null;
    });
    const first = await runHandoff(root, ['approve', '--feature', feature, '--by', 'maintainer']);
    assert.equal(first.data.gate.approved_by, 'maintainer');
    const approved = await readFile(join(root, handoff), 'utf8');
    await assert.rejects(runHandoff(root, ['approve', '--feature', feature, '--by', 'maintainer']),
      (error) => error.code === 'E_GATE_PENDING' && error.exitCode === 1);
    assert.equal(await readFile(join(root, handoff), 'utf8'), approved);
    const { data } = parseFrontmatter(await readFile(join(root, handoff), 'utf8'));
    assert.equal(data.gate.approved_by, 'maintainer');
  } finally {
    await cleanup();
  }
});

test('F30 malformed --from-json is a usage error naming the input file', async () => {
  const { root, cleanup } = await repo();
  try {
    await writeFile(join(root, 'handoff-input.json'), '{malformed');
    await assert.rejects(runHandoff(root, ['write', '--phase', 'implement', '--feature', feature, '--from-json', 'handoff-input.json']),
      (error) => error.code === 'E_USAGE' && error.exitCode === 2 && /handoff-input\.json/.test(error.message));
  } finally {
    await cleanup();
  }
});

test('F26 next exposes the pending gate, status and blocking question IDs', async () => {
  const { root, cleanup } = await repo();
  try {
    await editBaton(root, (data) => {
      data.status = 'needs-human';
      data.gate.approved_by = null;
      data.gate.approved_at = null;
      data.open_questions = [
        { id: 'Q1', question: 'Which scope?', blocking: true, options: ['Narrow', 'Broaden'] },
        { id: 'Q2', question: 'Follow-up?', blocking: false, options: ['Now', 'Later'] },
      ];
    });
    const result = await runHandoff(root, ['next', '--feature', feature]);
    assert.equal(result.data.status, 'needs-human');
    assert.equal(result.data.gate.required, true);
    assert.equal(result.data.gate.approved_by, null);
    assert.deepEqual(result.data.blocking_questions, ['Q1']);
  } finally {
    await cleanup();
  }
});

test('F27 review skill documents the findings payload and blocking routes', async () => {
  const skill = await readFile(join(sourceRoot, 'baton/skills/baton-review/SKILL.md'), 'utf8');
  assert.match(skill, /--from-json[\s\S]*?review:\s*\{\s*findings_path:/);
  assert.match(skill, /blocking_findings/);
  assert.match(skill, /feature `implement` or quick `work`/);
});

test('F28 relay fixture repositories are outside the source tree or gitignored', async () => {
  const { root, cleanup } = await repo();
  try {
    const pathFromSource = relative(sourceRoot, root);
    if (!pathFromSource.startsWith('..') && !isAbsolute(pathFromSource)) {
      const ignored = await git('git', ['check-ignore', '-q', '--', pathFromSource.replaceAll('\\', '/')],
        { cwd: sourceRoot, windowsHide: true }).then(() => true, () => false);
      assert.ok(ignored, `Relay fixture must be gitignored: ${pathFromSource}`);
    }
  } finally {
    await cleanup();
  }
});
