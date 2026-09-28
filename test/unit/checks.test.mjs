import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBuiltIn } from '../../src/lib/checks.mjs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { sourceRoot } from '../helpers/index.mjs';

async function fixtureRoot(prefix) {
  return mkdtemp(join(sourceRoot, 'test/fixtures', prefix));
}

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

test('quick scope requires an explicit reviewer decision rather than self-asserted exit evidence', async () => {
  const check = { id: 'quick-scope-held' };
  const path = '.baton/quick/fix-typo.md';
  const data = { decisions: [{ id: 'D1', tag: 'quick-eligible', rationale: 'Typo only' }] };
  assert.equal((await evaluateBuiltIn(process.cwd(), path, data, check)).met, false);
  data.decisions.push({
    id: 'D2', tag: 'quick-scope-held',
    rationale: 'Reviewed diff; no new user-facing behavior or public contract',
  });
  assert.equal((await evaluateBuiltIn(process.cwd(), path, data, check)).met, true);
});

test('analyze exit detects open CRITICAL findings in the report even if the baton declares zero', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-analysis-'));
  try {
    const path = 'specs/001-example/analysis.md';
    await mkdir(join(root, 'specs/001-example'), { recursive: true });
    const data = { analysis: { report_path: path, critical: 0, high: 0 } };
    await writeFile(join(root, path), '| Findings remaining open | **CRITICAL 1 · HIGH 0** |\n');
    assert.equal((await evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'no-critical-findings' })).met, false);
    await writeFile(join(root, path), '| Findings remaining open | **CRITICAL 0 · HIGH 0** |\n');
    assert.equal((await evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'no-critical-findings' })).met, true);
    await writeFile(join(root, path), '# Analysis\n\nNo severity summary is available.\n');
    assert.equal((await evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'no-critical-findings' })).met, false);
    data.analysis['x-critical-evidence'] = 'Reviewed full report: no CRITICAL findings remain';
    assert.equal((await evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'no-critical-findings' })).met, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('implement exit excludes only the marked handoff-writing task, not other unchecked tasks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-tasks-'));
  try {
    const path = 'specs/001-example/tasks.md';
    await mkdir(join(root, 'specs/001-example'), { recursive: true });
    const check = { id: 'tasks-all-checked-or-deferred' };
    const evaluate = () => evaluateBuiltIn(root, 'specs/001-example/handoff.md', {}, check);
    const handoff = '- [ ] T007 Write the baton (`baton handoff write --phase implement`). <!-- baton:handoff-write:implement -->\n';
    await writeFile(join(root, path), handoff);
    assert.equal((await evaluate()).met, true);

    await writeFile(join(root, path), `${handoff}- [ ] T008 Finish the real work.\n`);
    assert.deepEqual(await evaluate(), { met: false, evidence: '1 outstanding tasks' });

    await writeFile(join(root, path), '- [ ] T007 Write the baton (`baton handoff write --phase implement`).\n');
    assert.equal((await evaluate()).met, false);

    await writeFile(join(root, path), '- [ ] T008 Finish the real work. <!-- baton:handoff-write:implement -->\n');
    assert.equal((await evaluate()).met, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('review sees implementation committed before origin/HEAD advanced when the baton records its base', async () => {
  const root = await fixtureRoot('diff-merged-');
  try {
    git(root, 'init', '-q', '-b', 'main');
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/app.mjs'), 'export const value = 1;\n');
    git(root, 'add', 'src/app.mjs');
    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@invalid.example', 'commit', '-q', '-m', 'base');
    const base = git(root, 'rev-parse', 'HEAD');
    await writeFile(join(root, 'src/app.mjs'), 'export const value = 2;\n');
    git(root, 'add', 'src/app.mjs');
    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@invalid.example', 'commit', '-q', '-m', 'implementation');
    git(root, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/heads/main');
    const data = { decisions: [{ id: 'D1', tag: 'diff-base', rationale: 'Implementation began here', 'x-base-commit': base }] };
    assert.equal((await evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'diff-nonempty' })).met, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('review can use the persisted findings base after implementation has merged', async () => {
  const root = await fixtureRoot('diff-review-base-');
  try {
    git(root, 'init', '-q', '-b', 'main');
    await mkdir(join(root, 'src'));
    await mkdir(join(root, 'specs/001-example'), { recursive: true });
    await writeFile(join(root, 'src/app.mjs'), 'export const value = 1;\n');
    git(root, 'add', 'src/app.mjs');
    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@invalid.example', 'commit', '-q', '-m', 'base');
    const base = git(root, 'rev-parse', 'HEAD');
    await writeFile(join(root, 'src/app.mjs'), 'export const value = 2;\n');
    git(root, 'add', 'src/app.mjs');
    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@invalid.example', 'commit', '-q', '-m', 'implementation');
    git(root, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/heads/main');
    await writeFile(join(root, 'specs/001-example/review.json'), JSON.stringify({ base }));
    const data = { review: { findings_path: 'specs/001-example/review.json' } };
    assert.equal((await evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'diff-nonempty' })).met, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('diff-nonempty rejects bookkeeping and untracked scratch without implementation', async () => {
  const root = await fixtureRoot('diff-bookkeeping-');
  try {
    git(root, 'init', '-q', '-b', 'main');
    await mkdir(join(root, 'specs/001-example'), { recursive: true });
    await mkdir(join(root, '.baton'), { recursive: true });
    await writeFile(join(root, 'specs/001-example/handoff.md'), 'before\n');
    await writeFile(join(root, '.baton/config.yml'), 'before\n');
    git(root, 'add', '.');
    git(root, '-c', 'user.name=Test', '-c', 'user.email=test@invalid.example', 'commit', '-q', '-m', 'base');
    const base = git(root, 'rev-parse', 'HEAD');
    git(root, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/heads/main');
    await writeFile(join(root, 'specs/001-example/handoff.md'), 'after\n');
    await writeFile(join(root, '.baton/config.yml'), 'after\n');
    await writeFile(join(root, 'scratch.txt'), 'not a change to review\n');
    const data = { decisions: [{ id: 'D1', tag: 'diff-base', rationale: 'Beginning of implementation', 'x-base-commit': base }] };
    assert.equal((await evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'diff-nonempty' })).met, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('acceptance evidence requires a real evidence row, not the registry header or placeholder', async (t) => {
  const root = await fixtureRoot('acceptance-evidence-');
  try {
    await mkdir(join(root, 'specs/001-example'), { recursive: true });
    const tasks = join(root, 'specs/001-example/tasks.md');
    const data = { acceptance_checks: [{ id: 'AC-US1-1', story: 'US1' }] };
    const evaluate = () => evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'acceptance-evidence' });
    await t.test('header echoed as evidence', async () => {
      await writeFile(tasks, '## Acceptance Registry\n| Check | Red / green evidence |\n|---|---|\n| AC-US1-1 | Red / green evidence |\n');
      assert.equal((await evaluate()).met, false);
    });
    await t.test('pending registry row', async () => {
      await writeFile(tasks, '## Acceptance Registry\n| ID | Story | Evidence (red / green) |\n|---|---|---|\n| AC-US1-1 | US1 | red / green — pending |\n');
      assert.equal((await evaluate()).met, false);
    });
    await t.test('placeholder result', async () => {
      await writeFile(tasks, '## Acceptance Registry\n| ID | Story | Evidence |\n|---|---|---|\n| AC-US1-1 | US1 | fail |\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | green — TODO: add proof |\n');
      const result = await evaluate();
      assert.equal(result.met, false);
      assert.match(result.evidence, /AC-US1-1/);
    });
    await t.test('unjustified n/a', async () => {
      await writeFile(tasks, '## Acceptance Registry\n| ID | Story | Expect initial |\n|---|---|---|\n| AC-US1-1 | US1 | n/a |\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | n/a — TBD |\n');
      assert.equal((await evaluate()).met, false);
    });
    await t.test('real red-to-green evidence', async () => {
      await writeFile(tasks, '## Acceptance Registry\n| ID | Story | Evidence |\n|---|---|---|\n| AC-US1-1 | US1 | fail |\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red — test failed before fix; green — test passed after fix |\n');
      assert.equal((await evaluate()).met, true);
    });
    await t.test('justified n/a evidence', async () => {
      await writeFile(tasks, '## Acceptance Registry\n| ID | Story | Expect initial |\n|---|---|---|\n| AC-US1-1 | US1 | n/a |\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | n/a — manual review deferred until owner can access the hosted UI |\n');
      assert.equal((await evaluate()).met, true);
    });
    await t.test('specific pending-gate test outcome is not a placeholder', async () => {
      await writeFile(tasks, '## Acceptance Registry\n| ID | Story | Expect initial |\n|---|---|---|\n| AC-US1-1 | US1 | fail |\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red — pending-gate write test failed; green — relay gate-pending check passed |\n');
      assert.equal((await evaluate()).met, true);
    });
    await t.test('justified owner-pending n/a is evidence without claiming a pass', async () => {
      await writeFile(tasks, '## Acceptance Registry\n| ID | Story | Expect initial |\n|---|---|---|\n| AC-US1-1 | US1 | n/a |\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | n/a — timed owner walkthrough remains owner pending; no pass claimed |\n');
      assert.equal((await evaluate()).met, true);
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('acceptance check identifiers are matched literally, not interpolated as regex', async () => {
  const root = await fixtureRoot('acceptance-id-');
  try {
    await mkdir(join(root, 'specs/001-example'), { recursive: true });
    await writeFile(join(root, 'specs/001-example/tasks.md'),
      '## Acceptance Registry\n| ID | Story | Expect initial |\n|---|---|---|\n| AC-US1-1 | US1 | fail |\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red — test failed; green — passed |\n');
    const data = { acceptance_checks: [{ id: 'AC.US1-1', story: 'US1' }] };
    assert.equal((await evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'acceptance-evidence' })).met, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('acceptance evidence failure names every check missing proof', async () => {
  const root = await fixtureRoot('acceptance-missing-');
  try {
    await mkdir(join(root, 'specs/001-example'), { recursive: true });
    await writeFile(join(root, 'specs/001-example/tasks.md'),
      '## Acceptance Registry\n| ID | Story | Expect initial |\n|---|---|---|\n| AC-US1-1 | US1 | fail |\n| AC-US2-1 | US2 | fail |\n\n| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | green — TODO |\n| AC-US2-1 | red / green pending |\n');
    const data = { acceptance_checks: [{ id: 'AC-US1-1', story: 'US1' }, { id: 'AC-US2-1', story: 'US2' }] };
    const result = await evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'acceptance-evidence' });
    assert.deepEqual(result, { met: false, evidence: '2 checks lack evidence: AC-US1-1, AC-US2-1' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('malformed findings JSON is an unmet check, not an uncaught parse error', async (t) => {
  const root = await fixtureRoot('invalid-findings-');
  try {
    await mkdir(join(root, 'specs/001-example'), { recursive: true });
    await writeFile(join(root, 'specs/001-example/review.json'), '{ invalid json');
    const data = { review: { findings_path: 'specs/001-example/review.json' } };
    for (const id of ['findings-json-valid', 'findings-mapped-to-tasks-or-dismissed', 'findings-fixed-or-dismissed']) {
      await t.test(id, async () => {
        const result = await evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id });
        assert.equal(result.met, false, id);
        assert.match(result.evidence, /(?:invalid|not valid|parse|JSON)/i);
      });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
