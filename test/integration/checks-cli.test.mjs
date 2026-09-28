import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import YAML from 'yaml';
import { sourceRoot } from '../helpers/index.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';

// These tests drive the source CLI entry point (src/cli.mjs), the same command
// the Spec Kit hooks run, so they exercise argument parsing, handoff commands
// and the built-in checks together without rebuilding the bundle.
const feature = '001-sample';
const handoff = `specs/${feature}/handoff.md`;
const tasksPath = `specs/${feature}/tasks.md`;
const fixtures = join(sourceRoot, 'test/fixtures/handoffs');
const execGit = promisify(execFile);

/** @param {string} root @param {string[]} args */
function baton(root, args) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [join(sourceRoot, 'src/cli.mjs'), '--cwd', root, '--json', ...args],
      { cwd: root, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolveResult({ code, output: stdout + stderr }));
  });
}

/** @param {string} root @param {...string} args */
async function git(root, ...args) {
  return (await execGit('git', args, { cwd: root, windowsHide: true })).stdout.trim();
}

/** @param {string} root @param {string} message */
async function commit(root, message) {
  await git(root, 'add', '-A');
  await git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', message);
  return git(root, 'rev-parse', 'HEAD');
}

/** @param {string} root @param {(data: Record<string, any>) => void} mutate */
async function editBaton(root, mutate) {
  const location = join(root, handoff);
  const { data, body } = parseFrontmatter(await readFile(location, 'utf8'));
  mutate(data);
  await writeFile(location, serializeFrontmatter(data, body));
}

async function readBaton(root) {
  return parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data;
}

/** A feature repo whose baton is ready for implement, committed and pushed to origin/HEAD. */
async function featureRepo() {
  const root = await mkdtemp(join(fixtures, '.relay-checks-'));
  await mkdir(join(root, '.baton'), { recursive: true });
  await cp(join(sourceRoot, 'test/fixtures/features/sample'), join(root, 'specs', feature), { recursive: true });
  await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
  const config = YAML.parse(await readFile(join(sourceRoot, 'baton/templates/config.yml'), 'utf8'));
  config.checks = [{ name: 'offline', run: 'node -e "process.exit(0)"' }];
  await writeFile(join(root, '.baton/config.yml'), YAML.stringify(config));
  await cp(join(fixtures, 'valid/feature/analyze.md'), join(root, handoff));
  await editBaton(root, (data) => {
    data.open_questions = [];
    data.status = 'ready';
    data.gate.approved_by = 'maintainer';
    data.gate.approved_at = '2026-09-24';
  });
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'src/label.mjs'), "export const label = 'Old';\n");
  await git(root, 'init', '-q');
  const base = await commit(root, 'fixture baseline');
  await git(root, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  await git(root, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main');
  return { root, base, cleanup: () => rm(root, { force: true, recursive: true, maxRetries: 10, retryDelay: 500 }) };
}

/** Check T001, record evidence for AC-US1-1 and re-approve the refreshed tasks. */
async function recordEvidence(root, evidenceTable) {
  const location = join(root, tasksPath);
  const tasks = (await readFile(location, 'utf8')).replace('- [ ] T001', '- [x] T001');
  await writeFile(location, `${tasks}\n## Evidence\n\n${evidenceTable}`);
  assert.equal((await baton(root, ['handoff', 'refresh', '--feature', feature, '--reason', 'Record acceptance evidence'])).code, 0);
  const approved = await baton(root, ['handoff', 'approve', '--feature', feature, '--by', 'maintainer']);
  assert.equal(approved.code, 0, approved.output);
}

const redGreen = '| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red — label test failed before the fix; green — label test passes after the fix |\n';

test('local-checks-pass allows a full check suite longer than two minutes', { timeout: 180000 }, async () => {
  const { root, cleanup } = await featureRepo();
  try {
    await recordEvidence(root, redGreen);
    const configPath = join(root, '.baton/config.yml');
    const config = YAML.parse(await readFile(configPath, 'utf8'));
    config.checks = [{ name: 'full-suite', run: 'node -e "setTimeout(() => process.exit(0), 121000)"' }];
    await writeFile(configPath, YAML.stringify(config));
    const result = await writeImplement(root);
    assert.equal(result.code, 0, result.output);
  } finally {
    await cleanup();
  }
});

/** @param {string} root @param {Record<string, unknown>} [input] */
async function writeImplement(root, input = {}) {
  await writeFile(join(root, 'handoff-input.json'), JSON.stringify({ summary: 'Implementation complete.', ...input }));
  return baton(root, ['handoff', 'write', '--phase', 'implement', '--feature', feature, '--from-json', 'handoff-input.json']);
}

/** @param {string} root */
function receiveReview(root) {
  return baton(root, ['handoff', 'receive', '--phase', 'review', '--feature', feature]);
}

async function authorizeReview(root) {
  const question = await baton(root, ['handoff', 'question', '--feature', feature,
    '--tag', 'self-review-override', '--reason', 'Exercise diff checks in a single scratch checkout']);
  assert.equal(question.code, 0, question.output);
  const id = JSON.parse(question.output).data.question;
  const answer = await baton(root, ['handoff', 'answer', id, 'Allow self-review',
    '--feature', feature, '--by', 'repository owner']);
  assert.equal(answer.code, 0, answer.output);
}

test('F33/F40 review entry ignores feature planning artifacts and counts new adopter files anywhere', async () => {
  const { root, cleanup } = await featureRepo();
  try {
    await recordEvidence(root, redGreen);
    await writeFile(join(root, `specs/${feature}/analysis.md`), '# Analysis\n\n| Findings remaining open | CRITICAL 0, HIGH 0 |\n\nRe-run.\n');
    const written = await writeImplement(root);
    assert.equal(written.code, 0, written.output);
    await authorizeReview(root);

    const bookkeepingOnly = await receiveReview(root);
    assert.equal(bookkeepingOnly.code, 1, bookkeepingOnly.output);
    assert.match(bookkeepingOnly.output, /diff-nonempty unmet: 0 changed files/);

    await mkdir(join(root, 'app'));
    await writeFile(join(root, 'app/x.ts'), 'export const x = 1;\n');
    const withCode = await receiveReview(root);
    assert.equal(withCode.code, 0, withCode.output);
  } finally {
    await cleanup();
  }
});

test('F34 an unreachable recorded diff base falls back to the merge-base instead of failing', async () => {
  const { root, cleanup } = await featureRepo();
  try {
    await recordEvidence(root, redGreen);
    await writeFile(join(root, 'src/label.mjs'), "export const label = 'New';\n");
    await editBaton(root, (data) => {
      data.decisions.push({
        id: 'D10', decision: 'Record implementation diff base', rationale: 'Base copied from another clone',
        tag: 'diff-base', 'x-base-commit': 'deadbeefcafe', by: 'speckit-implement',
      });
    });
    const written = await writeImplement(root);
    assert.equal(written.code, 0, written.output);
    await authorizeReview(root);
    const received = await receiveReview(root);
    assert.equal(received.code, 0, received.output);
  } finally {
    await cleanup();
  }
});

test('F34 a later diff-base decision corrects an earlier wrong base', async () => {
  const { root, base, cleanup } = await featureRepo();
  try {
    await recordEvidence(root, redGreen);
    await writeFile(join(root, 'src/label.mjs'), "export const label = 'New';\n");
    const wrong = await commit(root, 'implementation');
    await editBaton(root, (data) => {
      data.decisions.push(
        { id: 'D10', decision: 'Record implementation diff base', rationale: 'Recorded after implementation by mistake',
          tag: 'diff-base', 'x-base-commit': wrong, by: 'speckit-implement' },
        { id: 'D11', decision: 'Correct implementation diff base', rationale: 'Implementation began at the baseline',
          tag: 'diff-base', 'x-base-commit': base, by: 'speckit-implement' },
      );
    });
    const written = await writeImplement(root);
    assert.equal(written.code, 0, written.output);
    await authorizeReview(root);
    const received = await receiveReview(root);
    assert.equal(received.code, 0, received.output);
  } finally {
    await cleanup();
  }
});

test('F33 a re-review after a fix pass without new code is rejected until code changes', async () => {
  const { root, base, cleanup } = await featureRepo();
  try {
    await recordEvidence(root, redGreen);
    await writeFile(join(root, 'src/label.mjs'), "export const label = 'New';\n");
    assert.equal((await writeImplement(root)).code, 0);
    await authorizeReview(root);
    assert.equal((await receiveReview(root)).code, 0);
    await rm(join(root, 'handoff-input.json'));
    const head = await commit(root, 'implementation');
    const findingsPath = `specs/${feature}/review.json`;
    const findings = JSON.parse(await readFile(join(root, findingsPath), 'utf8'));
    Object.assign(findings, { base, head });
    findings.findings = [{
      id: 'F01', severity: 'P1', title: 'Label casing is wrong', file: 'src/label.mjs', line: 1,
      persona: 'correctness-reviewer', confidence: 0.9, task: 'T001', disposition: 'open', reason: null,
    }];
    await writeFile(join(root, findingsPath), JSON.stringify(findings));
    await writeFile(join(root, 'handoff-input.json'), JSON.stringify({
      summary: 'Review found a blocking issue.', review: { findings_path: findingsPath, blocking_findings: 0 },
    }));
    const reviewed = await baton(root, ['handoff', 'write', '--phase', 'review', '--feature', feature, '--from-json', 'handoff-input.json']);
    assert.equal(reviewed.code, 0, reviewed.output);
    assert.equal((await readBaton(root)).next_phase, 'implement');

    const fixPass = await writeImplement(root, { summary: 'Fix pass recorded without code changes.' });
    assert.equal(fixPass.code, 0, fixPass.output);
    const unchanged = await receiveReview(root);
    assert.equal(unchanged.code, 1, unchanged.output);
    assert.match(unchanged.output, /diff-nonempty unmet: 0 changed files/);

    await writeFile(join(root, 'src/label.mjs'), "export const label = 'NEW';\n");
    const changed = await receiveReview(root);
    assert.equal(changed.code, 0, changed.output);
  } finally {
    await cleanup();
  }
});

test('F37 n/a evidence for a fail-registered check stays unmet, even after a human "Waive" answer', async () => {
  const { root, cleanup } = await featureRepo();
  try {
    await recordEvidence(root, '| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | n/a — original red run was not retained; green — label test passes after the fix |\n');
    await writeFile(join(root, 'src/label.mjs'), "export const label = 'New';\n");
    const unmet = await writeImplement(root);
    assert.equal(unmet.code, 1, unmet.output);
    assert.match(unmet.output, /E_EXIT_UNMET/);
    assert.match(unmet.output, /acceptance-evidence: 1 checks lack evidence: AC-US1-1 \(n\/a but expect_initial is fail\)/);

    const selfWaived = await writeImplement(root, {
      decisions: [{ id: 'D10', decision: 'Waive AC-US1-1 red baseline', rationale: 'Red run was not retained',
        tag: 'acceptance-waiver', 'x-check': 'AC-US1-1', by: 'speckit-implement' }],
    });
    assert.equal(selfWaived.code, 2, selfWaived.output);

    await editBaton(root, (data) => {
      data.status = 'needs-human';
      data.open_questions = [{
        id: 'Q1', blocking: true, question: 'AC-US1-1 has no retained red run. Waive the red baseline?',
        options: ['Waive AC-US1-1 red baseline', 'Report AC-US1-1 unmet'],
      }];
    });
    const answered = await baton(root, ['handoff', 'answer', 'Q1', 'Waive AC-US1-1 red baseline', '--feature', feature, '--by', 'maintainer']);
    assert.equal(answered.code, 0, answered.output);
    const stillUnmet = await writeImplement(root);
    assert.equal(stillUnmet.code, 1, stillUnmet.output);
    assert.match(stillUnmet.output, /acceptance-evidence: 1 checks lack evidence: AC-US1-1 \(n\/a but expect_initial is fail\)/);
  } finally {
    await cleanup();
  }
});

test('F37 partial evidence needs a tagged human acceptance-waiver; an untagged "Waive" answer is not enough', async () => {
  const { root, cleanup } = await featureRepo();
  try {
    await recordEvidence(root, '| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | partial — Linux label test passes; Windows run remains owner pending |\n');
    await writeFile(join(root, 'src/label.mjs'), "export const label = 'New';\n");
    const unmet = await writeImplement(root);
    assert.equal(unmet.code, 1, unmet.output);
    assert.match(unmet.output, /acceptance-evidence: 1 checks lack evidence: AC-US1-1 \(partial; needs a tagged human waiver\)/);

    await editBaton(root, (data) => {
      data.status = 'needs-human';
      data.open_questions = [{
        id: 'Q1', blocking: true, question: 'AC-US1-1 has only partial evidence. Waive it?',
        options: ['Waive', 'Report AC-US1-1 unmet'],
      }];
    });
    const answered = await baton(root, ['handoff', 'answer', 'Q1', 'Waive', '--feature', feature, '--by', 'maintainer']);
    assert.equal(answered.code, 0, answered.output);
    const untagged = await writeImplement(root);
    assert.equal(untagged.code, 1, untagged.output);
    assert.match(untagged.output, /AC-US1-1 \(partial; needs a tagged human waiver\)/);

    await editBaton(root, (data) => {
      data.status = 'needs-human';
      data.open_questions = [{ id: 'Q2', blocking: true, question: 'Waive this specific partial result?',
        'x-check': 'AC-US1-1', options: ['Waive this partial result', 'Keep unmet'] }];
    });
    const tagged = await baton(root, ['handoff', 'answer', 'Q2', 'Waive this partial result',
      '--feature', feature, '--by', 'maintainer']);
    assert.equal(tagged.code, 0, tagged.output);
    const waived = await writeImplement(root);
    assert.equal(waived.code, 0, waived.output);
    assert.equal((await readBaton(root)).next_phase, 'review');
  } finally {
    await cleanup();
  }
});

test('F36 implement exit fails when the baton omits a check registered in tasks.md', async () => {
  const { root, cleanup } = await featureRepo();
  try {
    const location = join(root, tasksPath);
    await writeFile(location, (await readFile(location, 'utf8')).replace(/(\| AC-US1-1 \|[^\n]*\n)/,
      '$1| AC-US1-2 | US1 | Check the label casing | red then green |\n'));
    await recordEvidence(root, `${redGreen}| AC-US1-2 | red — casing test failed before the fix; green — casing test passes after the fix |\n`);
    await writeFile(join(root, 'src/label.mjs'), "export const label = 'New';\n");
    const dropped = await writeImplement(root);
    assert.equal(dropped.code, 1, dropped.output);
    assert.match(dropped.output, /acceptance-evidence: 1 checks lack evidence: AC-US1-2 \(registered in tasks\.md but missing from the baton\)/);

    const registered = await writeImplement(root, {
      acceptance_checks: [{ id: 'AC-US1-2', story: 'US1', check: 'check casing', kind: 'test-id', expect_initial: 'fail' }],
    });
    assert.equal(registered.code, 0, registered.output);
  } finally {
    await cleanup();
  }
});

test('F43 GFM evidence rows without a trailing pipe and with red→green arrows are accepted', async () => {
  const { root, cleanup } = await featureRepo();
  try {
    await recordEvidence(root, 'Check | Result and evidence\n--- | ---\nAC-US1-1 | red: label test failed before the fix → green: label test passes after the fix\n');
    await writeFile(join(root, 'src/label.mjs'), "export const label = 'New';\n");
    const written = await writeImplement(root);
    assert.equal(written.code, 0, written.output);
  } finally {
    await cleanup();
  }
});
