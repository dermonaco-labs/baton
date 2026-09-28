import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBuiltIn } from '../../src/lib/checks.mjs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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
