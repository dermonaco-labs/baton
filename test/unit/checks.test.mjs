import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBuiltIn } from '../../src/lib/checks.mjs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

async function fixtureRoot(prefix) {
  return mkdtemp(join(tmpdir(), `baton-checks-${prefix}`));
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
    const data = { acceptance_checks: [{ id: 'AC-US1-1', story: 'US1', check: 'walkthrough', kind: 'manual', expect_initial: 'n/a' }] };
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

async function diffRepo(prefix) {
  const root = await fixtureRoot(prefix);
  git(root, 'init', '-q', '-b', 'main');
  await mkdir(join(root, 'src'));
  await mkdir(join(root, 'specs/001-example'), { recursive: true });
  await writeFile(join(root, 'src/app.mjs'), 'export const value = 1;\n');
  await writeFile(join(root, 'specs/001-example/tasks.md'), '- [ ] T001 Change value\n');
  await writeFile(join(root, 'specs/001-example/analysis.md'), '# Analysis\n');
  git(root, 'add', '.');
  git(root, '-c', 'user.name=Test', '-c', 'user.email=test@invalid.example', 'commit', '-q', '-m', 'base');
  git(root, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/heads/main');
  return { root, base: git(root, 'rev-parse', 'HEAD') };
}

function commitAll(root, message) {
  git(root, 'add', '-A');
  git(root, '-c', 'user.name=Test', '-c', 'user.email=test@invalid.example', 'commit', '-q', '-m', message);
  return git(root, 'rev-parse', 'HEAD');
}

const diffBase = (id, sha) => ({ id, decision: 'Record diff base', rationale: 'Implementation base', tag: 'diff-base', by: 'baton', 'x-base-commit': sha });
const diffNonempty = (root, data) => evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'diff-nonempty' });

test('F33 diff-nonempty does not count the feature directory planning and review artifacts', async () => {
  const { root, base } = await diffRepo('diff-feature-artifacts-');
  try {
    await writeFile(join(root, 'specs/001-example/tasks.md'), '- [x] T001 Change value\n');
    await writeFile(join(root, 'specs/001-example/analysis.md'), '# Analysis\n\nRe-run.\n');
    await writeFile(join(root, 'specs/001-example/review.json'), '{}\n');
    const data = { decisions: [diffBase('D1', base)] };
    assert.deepEqual(await diffNonempty(root, data), { met: false, evidence: '0 changed files' });
    await writeFile(join(root, 'specs/002-other.md'), 'Another feature note\n');
    await mkdir(join(root, 'specs/002-other'));
    await writeFile(join(root, 'specs/002-other/spec.md'), '# Other\n');
    assert.equal((await diffNonempty(root, data)).met, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('F33 a recorded review head becomes the next base so an unchanged re-review fails', async () => {
  const { root, base } = await diffRepo('diff-review-head-');
  try {
    await writeFile(join(root, 'src/app.mjs'), 'export const value = 2;\n');
    const head = commitAll(root, 'implementation');
    await writeFile(join(root, 'specs/001-example/review.json'), JSON.stringify({ base, head }));
    const data = { review: { findings_path: 'specs/001-example/review.json' } };
    assert.deepEqual(await diffNonempty(root, data), { met: false, evidence: '0 changed files' });
    await writeFile(join(root, 'src/app.mjs'), 'export const value = 3;\n');
    assert.deepEqual(await diffNonempty(root, data), { met: true, evidence: '1 changed files' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('F34 the last diff-base decision wins so a wrong base can be corrected', async () => {
  const { root, base } = await diffRepo('diff-last-base-');
  try {
    await writeFile(join(root, 'src/app.mjs'), 'export const value = 2;\n');
    const after = commitAll(root, 'implementation');
    assert.equal((await diffNonempty(root, { decisions: [diffBase('D1', after)] })).met, false);
    assert.equal((await diffNonempty(root, { decisions: [diffBase('D1', after), diffBase('D2', base)] })).met, true);
    assert.equal((await diffNonempty(root, { decisions: [diffBase('D1', base), diffBase('D2', after)] })).met, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('F34 an unreachable recorded base is reported and falls back to the merge-base', async () => {
  const { root } = await diffRepo('diff-unreachable-base-');
  try {
    await writeFile(join(root, 'src/app.mjs'), 'export const value = 2;\n');
    const result = await diffNonempty(root, { decisions: [diffBase('D1', 'deadbeefcafe')] });
    assert.equal(result.met, true);
    assert.match(result.evidence, /Recorded diff base deadbeefcafe is not in this clone/);
    assert.match(result.evidence, /1 changed files/);
    const invalid = await diffNonempty(root, { decisions: [diffBase('D1', '--output=x')] });
    assert.equal(invalid.met, false);
    assert.match(invalid.evidence, /Invalid recorded review base/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('F40 diff-nonempty counts new files in any adopter directory but not root inputs or scratch', async () => {
  const { root, base } = await diffRepo('diff-untracked-');
  try {
    const data = { decisions: [diffBase('D1', base)] };
    await writeFile(join(root, 'handoff-input.json'), '{}\n');
    await mkdir(join(root, 'lib/tmp'), { recursive: true });
    await writeFile(join(root, 'lib/tmp/notes.txt'), 'scratch\n');
    await mkdir(join(root, 'scratch'));
    await writeFile(join(root, 'scratch/x.ts'), 'scratch\n');
    assert.deepEqual(await diffNonempty(root, data), { met: false, evidence: '0 changed files' });
    await mkdir(join(root, 'app'));
    await writeFile(join(root, 'app/x.ts'), 'export const x = 1;\n');
    assert.deepEqual(await diffNonempty(root, data), { met: true, evidence: '1 changed files' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('F37 n/a is accepted only for checks registered n/a; partial needs a tagged human waiver', async (t) => {
  const root = await fixtureRoot('acceptance-expect-');
  try {
    await mkdir(join(root, 'specs/001-example'), { recursive: true });
    const tasks = join(root, 'specs/001-example/tasks.md');
    const registry = (expect) => `## Acceptance Registry\n| ID | Story | Expect initial |\n|---|---|---|\n| AC-US1-1 | US1 | ${expect} |\n\n`;
    const evidence = (result) => `| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | ${result} |\n`;
    const evaluate = (data) => evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'acceptance-evidence' });
    const check = (expect) => ({ id: 'AC-US1-1', story: 'US1', check: 'test', kind: 'test-id', expect_initial: expect });
    const notRetained = 'n/a — original red run was not retained; green — label test passes after the fix';
    await t.test('n/a for a check registered fail (baton)', async () => {
      await writeFile(tasks, registry('fail') + evidence(notRetained));
      const result = await evaluate({ acceptance_checks: [check('fail')] });
      assert.equal(result.met, false);
      assert.match(result.evidence, /AC-US1-1/);
    });
    await t.test('n/a for a check registered fail (registry column only)', async () => {
      await writeFile(tasks, registry('fail') + evidence(notRetained));
      assert.equal((await evaluate({ acceptance_checks: [{ id: 'AC-US1-1', story: 'US1' }] })).met, false);
    });
    await t.test('registry cannot relabel a fail check as n/a', async () => {
      await writeFile(tasks, registry('n/a') + evidence(notRetained));
      assert.equal((await evaluate({ acceptance_checks: [check('fail')] })).met, false);
    });
    await t.test('n/a for a check registered n/a', async () => {
      await writeFile(tasks, registry('n/a') + evidence('n/a — manual walkthrough only; owner confirmed the README renders'));
      assert.equal((await evaluate({ acceptance_checks: [check('n/a')] })).met, true);
    });
    const partial = 'partial — Linux and Windows smoke passed; three-OS dispatch remains owner pending';
    await t.test('partial without a waiver', async () => {
      await writeFile(tasks, registry('n/a') + evidence(partial));
      const result = await evaluate({ acceptance_checks: [check('n/a')] });
      assert.equal(result.met, false);
      assert.match(result.evidence, /AC-US1-1/);
    });
    await t.test('agent-recorded waivers do not count', async () => {
      await writeFile(tasks, registry('n/a') + evidence(partial));
      const decisions = [{ id: 'D1', decision: 'Waive AC-US1-1', rationale: 'Owner pending', tag: 'acceptance-waiver', 'x-check': 'AC-US1-1', by: 'implementation-session' }];
      assert.equal((await evaluate({ acceptance_checks: [check('n/a')], decisions })).met, false);
    });
    const tagged = (check, by = 'human:maintainer') => [{ id: 'D1', decision: `Waive ${check} partial result`,
      rationale: 'Three-OS dispatch is tracked separately', tag: 'acceptance-waiver', 'x-check': check, by }];
    await t.test('a tagged human waiver for another check does not count', async () => {
      await writeFile(tasks, registry('n/a') + evidence(partial));
      assert.equal((await evaluate({ acceptance_checks: [check('n/a')], decisions: tagged('AC-US1-2') })).met, false);
    });
    await t.test('an untagged human "Waive" answer does not count', async () => {
      await writeFile(tasks, registry('n/a') + evidence(partial));
      const decisions = [{ id: 'D1', decision: 'Waive', rationale: 'AC-US1-1 has only partial evidence. Waive it?', by: 'human:maintainer' },
        { id: 'D2', decision: 'Waive AC-US1-1 partial result', rationale: 'Owner accepted', by: 'human:maintainer' }];
      const result = await evaluate({ acceptance_checks: [check('n/a')], decisions });
      assert.equal(result.met, false);
      assert.match(result.evidence, /AC-US1-1 \(partial; needs a tagged human waiver\)/);
    });
    await t.test('a tagged human waiver accepts partial evidence', async () => {
      await writeFile(tasks, registry('n/a') + evidence(partial));
      assert.equal((await evaluate({ acceptance_checks: [check('n/a')], decisions: tagged('AC-US1-1') })).met, true);
    });
    await t.test('a tagged waiver from an unconfigured human role does not count', async () => {
      await writeFile(tasks, registry('n/a') + evidence(partial));
      assert.equal((await evaluate({ acceptance_checks: [check('n/a')], decisions: tagged('AC-US1-1', 'human:intern') })).met, false);
    });
    await t.test('no waiver turns n/a into evidence for a check registered fail', async () => {
      await writeFile(tasks, registry('fail') + evidence(notRetained));
      const decisions = [{ id: 'D1', decision: 'Accept missing red run', rationale: 'Original run predates retention', tag: 'acceptance-waiver', 'x-check': 'AC-US1-1', by: 'human:repository-owner' }];
      const result = await evaluate({ acceptance_checks: [check('fail')], decisions });
      assert.equal(result.met, false);
      assert.match(result.evidence, /AC-US1-1 \(n\/a but expect_initial is fail\)/);
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('F43 evidence parser accepts GFM rows without outer pipes, escaped pipes and arrow separators', async (t) => {
  const root = await fixtureRoot('acceptance-gfm-');
  try {
    await mkdir(join(root, 'specs/001-example'), { recursive: true });
    const tasks = join(root, 'specs/001-example/tasks.md');
    const data = { acceptance_checks: [{ id: 'AC-US1-1', story: 'US1', expect_initial: 'fail' }] };
    const evaluate = () => evaluateBuiltIn(root, 'specs/001-example/handoff.md', data, { id: 'acceptance-evidence' });
    const registry = '## Acceptance Registry\n| ID | Story | Expect initial |\n|---|---|---|\n| AC-US1-1 | US1 | fail |\n\n';
    const cases = [
      ['no trailing pipe', '| Check | Result and evidence\n|---|---\n| AC-US1-1 | red — label test failed before fix; green — label test passes after fix\n', true],
      ['no outer pipes', 'Check | Result and evidence\n--- | ---\nAC-US1-1 | red — label test failed before fix; green — label test passes after fix\n', true],
      ['escaped pipe in evidence', '| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red — \`a \\| b\` test failed before fix; green — \`a \\| b\` test passes after fix |\n', true],
      ['unicode arrow', '| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red: label test failed before fix → green: label test passes after fix |\n', true],
      ['arrows without spaces', '| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red→label test failed before fix; green→label test passes after fix |\n', true],
      ['ascii arrow', '| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red -> label test failed before fix -> green -> label test passes after fix |\n', true],
      ['green word inside red evidence', '| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red — the green banner test failed before fix; green — banner test passes after fix |\n', true],
      ['green not after a separator', '| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red — label test failed before the fix green passes |\n', false],
      ['arrow without red evidence', '| Check | Result and evidence |\n|---|---|\n| AC-US1-1 | red → green: label test passes after fix |\n', false],
    ];
    for (const [name, table, met] of cases) {
      await t.test(name, async () => {
        await writeFile(tasks, registry + table);
        assert.equal((await evaluate()).met, met);
      });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('F36 acceptance evidence compares the baton checks with the tasks.md registry in both directions', async (t) => {
  const root = await fixtureRoot('acceptance-registry-');
  try {
    await mkdir(join(root, 'specs/001-example'), { recursive: true });
    const tasks = join(root, 'specs/001-example/tasks.md');
    const evaluate = (checks) => evaluateBuiltIn(root, 'specs/001-example/handoff.md', { acceptance_checks: checks }, { id: 'acceptance-evidence' });
    const check = (id, story) => ({ id, story, check: 'test', kind: 'test-id', expect_initial: 'fail' });
    const proof = (id) => `| ${id} | red — ${id} test failed before fix; green — ${id} test passes after fix |\n`;
    const write = (rows) => writeFile(tasks, `## Acceptance Registry\n| ID | Story | Expect initial |\n|---|---|---|\n${rows.map(([id, story]) => `| ${id} | ${story} | fail |\n`).join('')}\n| Check | Result and evidence |\n|---|---|\n${proof('AC-US1-1')}${proof('AC-US1-2')}`);
    await t.test('registry row dropped from the baton', async () => {
      await write([['AC-US1-1', 'US1'], ['AC-US1-2', 'US1']]);
      const result = await evaluate([check('AC-US1-1', 'US1')]);
      assert.equal(result.met, false);
      assert.match(result.evidence, /AC-US1-2 \(registered in tasks\.md but missing from the baton\)/);
    });
    await t.test('baton check missing from the registry', async () => {
      await write([['AC-US1-1', 'US1']]);
      const result = await evaluate([check('AC-US1-1', 'US1'), check('AC-US1-2', 'US1')]);
      assert.equal(result.met, false);
      assert.match(result.evidence, /AC-US1-2 \(missing from the tasks\.md registry\)/);
    });
    await t.test('story differs between baton and registry', async () => {
      await write([['AC-US1-1', 'US1'], ['AC-US1-2', 'US2']]);
      const result = await evaluate([check('AC-US1-1', 'US1'), check('AC-US1-2', 'US1')]);
      assert.equal(result.met, false);
      assert.match(result.evidence, /AC-US1-2 \(story US1 in the baton, US2 in tasks\.md\)/);
    });
    await t.test('matching sets with evidence', async () => {
      await write([['AC-US1-1', 'US1'], ['AC-US1-2', 'US1']]);
      assert.deepEqual(await evaluate([check('AC-US1-1', 'US1'), check('AC-US1-2', 'US1')]),
        { met: true, evidence: '0 checks lack evidence' });
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
