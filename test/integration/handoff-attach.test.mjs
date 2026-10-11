import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { run as handoff } from '../../src/commands/handoff.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';
import { validateHandoff } from '../../src/lib/handoff.mjs';
import { reviewBase } from '../../src/lib/checks.mjs';
import { sourceRoot } from '../helpers/index.mjs';

const exec = promisify(execFile);
const feature = '011-existing';
const path = `specs/${feature}/handoff.md`;
const checks = [1, 2, 3].map((n) => ({
  id: `AC-US${n}-1`, story: `US${n}`, check: `Verify story ${n}`,
  kind: 'manual', expect_initial: 'fail',
}));
const attach = ['init', '--feature', feature, '--infer', '--phase', 'implement', '--reason', 'Recover existing work', '--from-json', 'attach.json'];

async function cli(root, args) {
  try {
    return { code: 0, ...(await exec(process.execPath, [join(sourceRoot, '.baton', 'bin', 'baton.mjs'), 'handoff', ...args], { cwd: root })) };
  } catch (error) {
    return { code: error.code, stderr: error.stderr, stdout: error.stdout };
  }
}

async function workspace() {
  const root = await mkdtemp(join(sourceRoot, 'test', 'fixtures', 'handoffs', '.unit-'));
  await cp(join(sourceRoot, 'baton', 'schemas'), join(root, 'baton', 'schemas'), { recursive: true });
  await mkdir(join(root, 'specs', feature), { recursive: true });
  await writeFile(join(root, '.gitignore'), '.baton/.local/\n');
  await writeFile(join(root, 'specs', feature, 'spec.md'), '# Existing specification\n');
  await writeFile(join(root, 'specs', feature, 'plan.md'), '# Existing plan\n');
  await writeFile(join(root, 'specs', feature, 'tasks.md'), `# Tasks\n\n- [x] T001 [US1] First\n- [X] T002 [US2] Second\n- [ ] T003 [US3] Third\n\n## Acceptance Registry\n\n| ID | Story | Check | Evidence |\n|---|---|---|---|\n${checks.map((c) => `| ${c.id} | ${c.story} | ${c.check} | red then green |`).join('\n')}\n`);
  await writeFile(join(root, 'attach.json'), JSON.stringify({ acceptance_checks: checks }));
  await exec('git', ['init', '-q', '-b', 'main'], { cwd: root });
  await exec('git', ['add', '.'], { cwd: root });
  await exec('git', ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'base'], { cwd: root });
  const remote = join(root, '.git', 'origin.git');
  await exec('git', ['clone', '--bare', '-q', root, remote], { cwd: root });
  await exec('git', ['remote', 'add', 'origin', remote], { cwd: root });
  await exec('git', ['fetch', '-q', 'origin'], { cwd: root });
  await exec('git', ['remote', 'set-head', 'origin', '--auto'], { cwd: root });
  await mkdir(join(root, 'product'), { recursive: true });
  await writeFile(join(root, 'product', 'imported.mjs'), 'export const imported = true;\n');
  await exec('git', ['add', 'product'], { cwd: root });
  await exec('git', ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'pre-Baton product work'], { cwd: root });
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test('attach preserves imported bytes and requires fresh approval, including the bundled hook CLI', async () => {
  const { root, cleanup } = await workspace();
  try {
    const before = await Promise.all(['spec', 'plan', 'tasks'].map((name) => readFile(join(root, 'specs', feature, `${name}.md`))));
    const cli = async (args) => {
      try {
        return { code: 0, ...(await exec(process.execPath, [join(sourceRoot, '.baton', 'bin', 'baton.mjs'), 'handoff', ...args], { cwd: root })) };
      } catch (error) {
        return { code: error.code, stderr: error.stderr, stdout: error.stdout };
      }
    };
    assert.equal((await cli(attach)).code, 0);
    const { data, body } = parseFrontmatter(await readFile(join(root, path), 'utf8'));
    assert.equal(data.phase_completed, 'none');
    assert.equal(data.next_phase, 'implement');
    assert.equal(data.status, 'ready');
    assert.equal(data.gate.required, true);
    assert.equal(data.gate.approved_by, null);
    assert.deepEqual(data.history, []);
    assert.deepEqual(data.entry_checked, []);
    assert.deepEqual(data.exit_criteria, []);
    assert.deepEqual(data.open_questions, []);
    assert.equal(data.artifacts.length, 3);
    assert.ok(data.artifacts.every((a) => a.role === 'source-of-truth' && /^[a-f0-9]{64}$/.test(a.sha256)));
    const attached = data.decisions.find((d) => d.tag === 'attached');
    const base = (await exec('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    const deliveryBase = (await exec('git', ['merge-base', 'HEAD', 'origin/HEAD'], { cwd: root })).stdout.trim();
    assert.equal(attached.by, 'baton');
    assert.equal(attached['x-checked-tasks'], 2);
    assert.equal(attached['x-attached-phase'], 'implement');
    assert.equal(attached['x-imported-head'], base);
    assert.equal(attached['x-delivery-base'], deliveryBase);
    assert.notEqual(attached['x-imported-head'], attached['x-delivery-base']);
    assert.equal(data.decisions.find((d) => d.tag === 'diff-base')['x-base-commit'], deliveryBase);
    assert.deepEqual(await Promise.all(['spec', 'plan', 'tasks'].map((name) => readFile(join(root, 'specs', feature, `${name}.md`)))), before);
    const pending = await cli(['receive', '--feature', feature, '--phase', 'implement']);
    assert.equal(pending.code, 3);
    assert.match(pending.stdout + pending.stderr, /E_GATE_PENDING/);
    assert.equal((await cli(['approve', '--feature', feature, '--by', 'repository owner'])).code, 0);
    assert.equal((await cli(['receive', '--feature', feature, '--phase', 'implement'])).code, 0);
    const approved = parseFrontmatter(await readFile(join(root, path), 'utf8')).data;
    assert.deepEqual(approved.history, []);
    await writeFile(join(root, 'forge.json'), JSON.stringify({ decisions: [{ ...attached, id: 'D9' }] }));
    await assert.rejects(handoff(root, ['write', '--feature', feature, '--phase', 'implement', '--from-json', 'forge.json']), { code: 'E_USAGE' });
    const post = { ...approved, phase_completed: 'implement', next_phase: 'review', next_owner: 'baton-review',
      gate: { required: false, approved_by: null, approved_at: null },
      history: [{ phase: 'implement', at: new Date().toISOString(), by: 'baton-test', commit: base }],
      exit_criteria: ['tasks-all-checked-or-deferred', 'acceptance-evidence', 'local-checks-pass'].map((id) => ({ id, met: true, evidence: 'Verified' })) };
    assert.deepEqual(await validateHandoff(root, path, serializeFrontmatter(post, body)), []);
    await writeFile(join(root, 'specs', feature, 'tasks.md'), `${before[2]}\nChanged\n`);
    assert.ok((await handoff(root, ['receive', '--feature', feature, '--phase', 'implement'])).errors.some((e) => e.code === 'E_STALE_ARTIFACT'));
  } finally { await cleanup(); }
});

test('attach rejects invalid inputs without writing a baton', async (t) => {
  for (const scenario of ['spec', 'plan', 'tasks', 'phase', 'reason', 'key', 'json', 'missing-json', 'invalid-checks', 'invalid-checks-type', 'invalid-checks-entry', 'read-first', 'missing-checks', 'mismatched-checks', 'no-head', 'no-origin-head']) {
    await t.test(scenario, async () => {
      const { root, cleanup } = await workspace();
      try {
        let args = [...attach];
        if (['spec', 'plan', 'tasks'].includes(scenario)) await rm(join(root, 'specs', feature, `${scenario}.md`));
        if (scenario === 'phase') args[args.indexOf('implement')] = 'review';
        if (scenario === 'reason') args.splice(args.indexOf('--reason'), 2);
        if (scenario === 'key') await writeFile(join(root, 'attach.json'), JSON.stringify({ gate: {} }));
        if (scenario === 'json') await writeFile(join(root, 'attach.json'), '{');
        if (scenario === 'missing-json') await rm(join(root, 'attach.json'));
        if (scenario === 'read-first') await writeFile(join(root, 'attach.json'), JSON.stringify({ read_first: 'invalid' }));
        if (scenario === 'invalid-checks') await writeFile(join(root, 'attach.json'), JSON.stringify({ acceptance_checks: checks.map((c) => ({ ...c, kind: 'invalid' })) }));
        if (scenario === 'invalid-checks-type') await writeFile(join(root, 'attach.json'), JSON.stringify({ acceptance_checks: {} }));
        if (scenario === 'invalid-checks-entry') await writeFile(join(root, 'attach.json'), JSON.stringify({ acceptance_checks: [null] }));
        if (scenario === 'missing-checks') args.splice(args.indexOf('--from-json'), 2);
        if (scenario === 'mismatched-checks') await writeFile(join(root, 'attach.json'), JSON.stringify({ acceptance_checks: checks.slice(0, 2) }));
        if (scenario === 'no-head') {
          await rm(join(root, '.git'), { recursive: true });
          await exec('git', ['init', '-q'], { cwd: root });
        }
        if (scenario === 'no-origin-head') await exec('git', ['symbolic-ref', '--delete', 'refs/remotes/origin/HEAD'], { cwd: root });
        if (['phase', 'reason', 'key', 'json', 'missing-json', 'read-first', 'no-head', 'no-origin-head'].includes(scenario)) {
          await assert.rejects(handoff(root, args), { code: scenario.startsWith('no-') ? 'E_CHECK_FAILED' : 'E_USAGE' });
        } else {
          const result = await handoff(root, args);
          assert.equal(result.exitCode, 1);
          const code = ['spec', 'plan', 'tasks'].includes(scenario) ? 'E_MISSING_ARTIFACT'
            : scenario.startsWith('invalid-checks') ? 'E_SCHEMA' : 'E_NO_PREREG';
          assert.ok(result.errors.some((e) => e.code === code));
        }
        await assert.rejects(readFile(join(root, path)), { code: 'ENOENT' });
      } finally { await cleanup(); }
    });

  }
});

test('attached review scope includes pre-Baton product work and post-attachment changes', async () => {
  const { root, cleanup } = await workspace();
  try {
    assert.deepEqual((await handoff(root, attach)).errors ?? [], []);
    await writeFile(join(root, 'product', 'after-attach.mjs'), 'export const afterAttach = true;\n');
    assert.deepEqual((await handoff(root, ['scope', '--feature', feature])).data.files,
      ['product/after-attach.mjs', 'product/imported.mjs']);
  } finally { await cleanup(); }
});

test('quick initialization retains original review-base decision text', async () => {
  const { root, cleanup } = await workspace();
  try {
    await handoff(root, ['new', '--quick', 'fixture', '--reason', 'Fixture bug fix']);
    const { data } = parseFrontmatter(await readFile(join(root, '.baton', 'quick', 'fixture.md'), 'utf8'));
    const decision = data.decisions.find((d) => d.tag === 'diff-base');
    assert.equal(decision.decision, 'Record quick-lane review base');
    assert.equal(decision.rationale, 'Work starts at this commit');
  } finally { await cleanup(); }
});

test('attached implement write resumes normal relay with one genuine phase receipt and the attach diff base', async () => {
  const { root, cleanup } = await workspace();
  try {
    assert.deepEqual((await handoff(root, attach)).errors ?? [], []);
    await handoff(root, ['approve', '--feature', feature, '--by', 'repository owner']);
    assert.equal((await handoff(root, ['receive', '--feature', feature, '--phase', 'implement'])).exitCode, 0);
    const imported = parseFrontmatter(await readFile(join(root, path), 'utf8')).data;
    await mkdir(join(root, '.baton'), { recursive: true });
    await writeFile(join(root, '.baton', 'config.yml'), 'schema: 1\nchecks:\n  - name: fixture\n    run: node -e "process.exit(0)"\n');
    const tasksPath = join(root, 'specs', feature, 'tasks.md');
    const tasks = await readFile(tasksPath, 'utf8');
    await writeFile(tasksPath, `${tasks.replace('- [ ] T003', '- [x] T003')}\n## Acceptance Evidence\n\n| Check | Result and evidence |\n|---|---|\n${checks.map((c) => `| ${c.id} | red: fixture check failed; green: fixture check passed |`).join('\n')}\n`);
    await writeFile(join(root, '.baton', 'write.json'), JSON.stringify({ summary: 'Fixture implementation completed' }));
    const result = await handoff(root, ['write', '--feature', feature, '--phase', 'implement', '--from-json', '.baton/write.json', '--by', 'baton-test']);
    assert.deepEqual(result.errors, []);
    const { data } = parseFrontmatter(await readFile(join(root, path), 'utf8'));
    assert.equal(data.phase_completed, 'implement');
    assert.equal(data.next_phase, 'review');
    assert.equal(data.history.length, 1);
    assert.equal(data.history[0].phase, 'implement');
    assert.deepEqual(data.decisions, imported.decisions);
    assert.deepEqual(await validateHandoff(root, path), []);
    assert.equal((await reviewBase(root, data)).base, imported.decisions[0]['x-delivery-base']);
    await writeFile(join(root, 'product', 'implemented.mjs'), 'export const implemented = true;\n');
    const scope = (await handoff(root, ['scope', '--feature', feature])).data;
    assert.equal(scope.base, imported.decisions[0]['x-delivery-base']);
    assert.deepEqual(scope.files, ['product/implemented.mjs', 'product/imported.mjs']);
    await exec('git', ['add', '.'], { cwd: root });
    await exec('git', ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Baton implementation'], { cwd: root });
    const reviewer = join(root, '.git', 'reviewer');
    await exec('git', ['clone', '-q', root, reviewer], { cwd: root });
    await exec('git', ['remote', 'set-url', 'origin', join(root, '.git', 'origin.git')], { cwd: reviewer });
    await exec('git', ['fetch', '-q', 'origin'], { cwd: reviewer });
    const findingsPath = `specs/${feature}/review.json`;
    await writeFile(join(reviewer, findingsPath), JSON.stringify({
      schema: 1, source: { engine: 'ce-review', mode: 'headless', run_artifact: findingsPath },
      base: scope.base, head: (await exec('git', ['rev-parse', 'HEAD'], { cwd: reviewer })).stdout.trim(),
      personas: ['correctness'], findings: [],
    }));
    await writeFile(join(reviewer, 'review-input.json'), JSON.stringify({ review: { findings_path: findingsPath, blocking_findings: 0 } }));
    assert.equal((await handoff(reviewer, ['receive', '--feature', feature, '--phase', 'review'])).exitCode, 0);
    assert.deepEqual((await handoff(reviewer, ['write', '--feature', feature, '--phase', 'review', '--from-json', 'review-input.json'])).errors, []);
    const reviewed = parseFrontmatter(await readFile(join(reviewer, path), 'utf8')).data;
    assert.equal(reviewed.decisions.filter((d) => d.tag === 'diff-base').at(-1)['x-base-commit'], scope.base);
    assert.equal(reviewed.decisions.filter((d) => d.tag === 'diff-base').at(-1).decision, 'Record reviewed implementation base');
    assert.equal(reviewed.decisions.filter((d) => d.tag === 'diff-base').at(-1).rationale, 'Review completed at this commit');
    assert.equal(reviewed.decisions.find((d) => d.tag === 'reviewed-tree')['x-base-commit'], scope.base);
    await writeFile(join(reviewer, 'product', 'followup.mjs'), 'export const followup = true;\n');
    assert.deepEqual((await handoff(reviewer, ['scope', '--feature', feature])).data.files,
      ['product/followup.mjs', 'product/implemented.mjs', 'product/imported.mjs']);
  } finally { await cleanup(); }
});

test('receive requires acceptance registry IDs even when attachment story coverage is valid', async () => {
  const { root, cleanup } = await workspace();
  try {
    const tasksPath = join(root, 'specs', feature, 'tasks.md');
    await writeFile(tasksPath, (await readFile(tasksPath, 'utf8')).replace('AC-US3-1', 'AC-US3-9'));
    assert.deepEqual((await handoff(root, attach)).errors ?? [], []);
    await handoff(root, ['approve', '--feature', feature, '--by', 'repository owner']);
    const result = await handoff(root, ['receive', '--feature', feature, '--phase', 'implement']);
    assert.equal(result.exitCode, 1);
    assert.ok(result.errors.some((e) => e.code === 'E_NO_PREREG'));
  } finally { await cleanup(); }
});

test('attachment provenance is fail-closed and remains permanent after implementation', async () => {
  const { root, cleanup } = await workspace();
  try {
    assert.deepEqual((await handoff(root, attach)).errors ?? [], []);
    await assert.rejects(handoff(root, attach), { code: 'E_CONFLICT' });
    const { data, body } = parseFrontmatter(await readFile(join(root, path), 'utf8'));
    for (const mutate of [
      (d) => { d.decisions = d.decisions.filter((v) => v.tag !== 'attached'); },
      (d) => { d.history = [{ phase: 'none', at: new Date().toISOString(), by: 'baton-test', commit: null }]; },
      (d) => { d.decisions.push({ ...d.decisions[0], id: 'D9' }); },
      (d) => { d.decisions[0]['x-attached-phase'] = 'review'; },
      (d) => { d.decisions[0].by = 'forged'; },
      (d) => { d.decisions[0]['x-imported-head'] = '1234567'; },
      (d) => { d.decisions[0]['x-delivery-base'] = 'invalid'; },
      (d) => { d.decisions[1]['x-base-commit'] = d.decisions[0]['x-imported-head']; },
      (d) => { d.decisions = d.decisions.filter((v) => v.tag !== 'diff-base'); },
      (d) => { d.gate.required = false; },
      (d) => { d.next_phase = 'work'; d.next_owner = 'ce-work'; },
      (d) => { d.lane = 'quick'; },
    ]) {
      const edited = structuredClone(data);
      mutate(edited);
      assert.ok((await validateHandoff(root, path, serializeFrontmatter(edited, body))).some((e) => e.code === 'E_TRANSITION'));
      await writeFile(join(root, path), serializeFrontmatter(edited, body));
      assert.ok((await handoff(root, ['receive', '--feature', feature, '--phase', 'implement'])).errors.length > 0);
    }
  } finally { await cleanup(); }
});

for (const scenario of ['paired delivery base', 'nonexistent imported head', 'unrelated imported head', 'missing origin HEAD']) {
  test(`receive rejects ${scenario}`, async () => {
    const { root, cleanup } = await workspace();
    try {
      await handoff(root, attach);
      await handoff(root, ['approve', '--feature', feature, '--by', 'repository owner']);
      const { data, body } = parseFrontmatter(await readFile(join(root, path), 'utf8'));
      const provenance = data.decisions.find((d) => d.tag === 'attached');
      if (scenario === 'paired delivery base') {
        provenance['x-delivery-base'] = provenance['x-imported-head'];
        data.decisions.find((d) => d.tag === 'diff-base')['x-base-commit'] = provenance['x-imported-head'];
      } else if (scenario === 'missing origin HEAD') {
        await exec('git', ['symbolic-ref', '--delete', 'refs/remotes/origin/HEAD'], { cwd: root });
      } else {
        provenance['x-imported-head'] = scenario === 'nonexistent imported head' ? 'a'.repeat(40)
          : (await exec('git', ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid',
            'commit-tree', 'HEAD^{tree}', '-m', 'unrelated root'], { cwd: root })).stdout.trim();
        const approval = data.decisions.find((d) => d.tag === 'attach-approved');
        if (approval) approval['x-imported-head'] = provenance['x-imported-head'];
      }
      await writeFile(join(root, path), serializeFrontmatter(data, body));
      const result = await cli(root, ['receive', '--feature', feature, '--phase', 'implement']);
      assert.notEqual(result.code, 0);
      assert.match(result.stdout + result.stderr, /E_CHECK_FAILED/);
      assert.notEqual((await cli(root, ['scope', '--feature', feature])).code, 0);
    } finally { await cleanup(); }
  });
}

for (const scenario of ['shadowing diff base', 'deleted provenance after implement', 'hand-set approval', 'mismatched approval hashes', 'stale approval hashes', 'mismatched approval actor', 'backdated approval', 'duplicate approval']) {
  test(`validate and receive reject ${scenario}`, async () => {
    const { root, cleanup } = await workspace();
    try {
      await handoff(root, attach);
      if (scenario !== 'hand-set approval') await handoff(root, ['approve', '--feature', feature, '--by', 'repository owner']);
      const { data, body } = parseFrontmatter(await readFile(join(root, path), 'utf8'));
      const provenance = data.decisions.find((d) => d.tag === 'attached');
      const approval = data.decisions.find((d) => d.tag === 'attach-approved');
      if (scenario === 'shadowing diff base') {
        data.decisions.push({ ...data.decisions.find((d) => d.tag === 'diff-base'), id: 'D99', 'x-base-commit': provenance['x-imported-head'] });
      } else if (scenario === 'deleted provenance after implement') {
        data.decisions = data.decisions.filter((d) => d.tag !== 'attached');
        data.phase_completed = 'implement';
        data.next_phase = 'review';
        data.next_owner = 'baton-review';
        data.gate = { required: false, approved_by: null, approved_at: null };
        data.history = [{ phase: 'implement', at: new Date().toISOString(), by: 'baton-test', commit: provenance['x-imported-head'] }];
        data.exit_criteria = ['tasks-all-checked-or-deferred', 'acceptance-evidence', 'local-checks-pass'].map((id) => ({ id, met: true, evidence: 'Fixture' }));
      } else if (scenario === 'hand-set approval') {
        data.gate.approved_by = 'repository owner';
        data.gate.approved_at = '2000-01-01';
      } else if (scenario === 'mismatched approval hashes') {
        if (approval) approval['x-sources'][0].sha256 = 'a'.repeat(64);
      } else if (scenario === 'stale approval hashes') {
        const source = data.artifacts[0];
        await writeFile(join(root, source.path), '# Revised specification\n');
        const { hashFile } = await import('../../src/lib/hash.mjs');
        source.sha256 = await hashFile(join(root, source.path));
        data.read_first.find((r) => r.path === source.path).sha256 = source.sha256;
      } else if (scenario === 'mismatched approval actor') {
        data.updated_by = 'baton';
      } else if (scenario === 'backdated approval') {
        data.gate.approved_at = '2000-01-01';
      } else if (approval) data.decisions.push({ ...approval, id: 'D99' });
      assert.ok((await validateHandoff(root, path, serializeFrontmatter(data, body))).some((e) => e.code === 'E_TRANSITION'));
      await writeFile(join(root, path), serializeFrontmatter(data, body));
      assert.notEqual((await cli(root, ['receive', '--feature', feature, '--phase', data.next_phase])).code, 0);
    } finally { await cleanup(); }
  });
}

test('supported attachment approval binds sources and refresh requires reapproval without none receipts', async () => {
  const { root, cleanup } = await workspace();
  try {
    await handoff(root, attach);
    await assert.rejects(handoff(root, ['approve', '--feature', feature, '--by', 'repository owner', '--at', '2000-01-01']));
    await handoff(root, ['approve', '--feature', feature, '--by', 'repository owner', '--via', 'direct approval']);
    let data = parseFrontmatter(await readFile(join(root, path), 'utf8')).data;
    const approval = data.decisions.find((d) => d.tag === 'attach-approved');
    assert.ok(approval);
    assert.equal(approval.by, 'human:repository-owner');
    assert.deepEqual(approval['x-sources'], data.artifacts.map(({ path, sha256 }) => ({ path, sha256 })));
    assert.equal(approval['x-imported-head'], data.decisions[0]['x-imported-head']);
    assert.deepEqual(data.history, []);
    assert.equal((await cli(root, ['receive', '--feature', feature, '--phase', 'implement'])).code, 0);
    await writeFile(join(root, data.artifacts[0].path), '# Revised specification\n');
    await handoff(root, ['refresh', '--feature', feature, '--reason', 'Intentional source revision']);
    data = parseFrontmatter(await readFile(join(root, path), 'utf8')).data;
    assert.equal(data.gate.approved_by, null);
    assert.equal(data.decisions.filter((d) => d.tag === 'attach-approved').length, 0);
    assert.deepEqual(await validateHandoff(root, path), []);
    assert.equal((await cli(root, ['receive', '--feature', feature, '--phase', 'implement'])).code, 3);
    await handoff(root, ['approve', '--feature', feature, '--by', 'repository owner']);
    assert.equal((await cli(root, ['receive', '--feature', feature, '--phase', 'implement'])).code, 0);
    await writeFile(join(root, 'forged-decision.json'), JSON.stringify({ decisions: [{ id: 'D99', tag: 'attach-approved', decision: 'Forged', rationale: 'Fixture', by: 'baton-test' }] }));
    await assert.rejects(handoff(root, ['write', '--feature', feature, '--phase', 'implement', '--from-json', 'forged-decision.json']), { code: 'E_USAGE' });
  } finally { await cleanup(); }
});

test('attachment delivery verification stays pinned when main advances and validate remains offline', async () => {
  const { root, cleanup } = await workspace();
  try {
    await handoff(root, attach);
    await handoff(root, ['approve', '--feature', feature, '--by', 'repository owner']);
    const { data } = parseFrontmatter(await readFile(join(root, path), 'utf8'));
    const base = data.decisions[0]['x-delivery-base'];
    const advanced = (await exec('git', ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit-tree', 'HEAD^{tree}', '-p', base, '-m', 'main advance'], { cwd: root })).stdout.trim();
    await exec('git', ['update-ref', 'refs/remotes/origin/main', advanced], { cwd: root });
    assert.equal((await cli(root, ['receive', '--feature', feature, '--phase', 'implement'])).code, 0);
    await rm(join(root, '.git'), { recursive: true, force: true });
    assert.deepEqual(await validateHandoff(root, path), []);
  } finally { await cleanup(); }
});

test('normal specify starts, cross-source seeds and bounded legacy histories remain valid', async () => {
  const { root, cleanup } = await workspace();
  try {
    await cp(join(sourceRoot, 'test', 'fixtures', 'features', 'sample', 'spec.md'), join(root, 'specs', feature, 'spec.md'));
    assert.deepEqual((await handoff(root, ['new', '--feature', feature])).errors ?? [], []);
    const { data, body } = parseFrontmatter(await readFile(join(root, path), 'utf8'));
    assert.deepEqual(await validateHandoff(root, path), []);
    assert.equal(data.history[0].phase, 'specify');
    assert.equal(data.decisions.filter((d) => ['attached', 'attach-approved'].includes(d.tag)).length, 0);
    for (const phase of ['brainstorm', 'work', 'review']) {
      const seeded = structuredClone(data);
      seeded.history.unshift({ ...data.history[0], phase });
      assert.deepEqual(await validateHandoff(root, path, serializeFrontmatter(seeded, body)), []);
    }
    const truncated = structuredClone(data);
    truncated.history = Array.from({ length: 19 }, () => ({ ...data.history[0], phase: 'review' }));
    truncated.history.push(data.history[0]);
    assert.deepEqual(await validateHandoff(root, path, serializeFrontmatter(truncated, body)), []);
    truncated.history.shift();
    assert.ok((await validateHandoff(root, path, serializeFrontmatter(truncated, body))).some((e) => e.code === 'E_TRANSITION'));
  } finally { await cleanup(); }
});
