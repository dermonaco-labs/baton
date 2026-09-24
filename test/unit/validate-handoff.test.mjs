import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { validateHandoff } from '../../src/lib/handoff.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';
import { evaluateBuiltIn } from '../../src/lib/checks.mjs';
import { evaluateChecks, phaseDefaults, phaseForLane } from '../../src/lib/phases.mjs';
import { run as runHandoff } from '../../src/commands/handoff.mjs';
import { run as runValidate } from '../../src/commands/validate.mjs';
import YAML from 'yaml';

const root = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(root, 'test/fixtures/handoffs');
const featurePath = 'specs/001-sample/handoff.md';
const quickPath = '.baton/quick/sample-fix.md';

async function fixtureRepo() {
  const workspace = await mkdtemp(join(fixtureRoot, '.unit-'));
  await mkdir(join(workspace, 'specs/001-sample'), { recursive: true });
  await cp(resolve(root, 'test/fixtures/features/sample'), join(workspace, 'specs/001-sample'), { recursive: true });
  await cp(join(root, 'baton/schemas'), join(workspace, 'baton/schemas'), { recursive: true });
  await mkdir(join(workspace, '.baton/quick'), { recursive: true });
  await cp(join(workspace, 'specs/001-sample/review.json'), join(workspace, '.baton/quick/sample-fix.review.json'));
  await writeFile(join(workspace, featurePath), await readFile(join(fixtureRoot, 'valid/feature/specify.md')));
  await writeFile(join(workspace, quickPath), await readFile(join(fixtureRoot, 'valid/quick/none.md')));
  return { workspace, cleanup: () => rm(workspace, { recursive: true, force: true }) };
}

async function codes(workspace, target, fixture) {
  return (await validateHandoff(workspace, target, await readFile(fixture, 'utf8'))).map((entry) => entry.code);
}

test('every feature phase and quick lane phase has a valid independent fixture', async () => {
  const { workspace, cleanup } = await fixtureRepo();
  try {
    const feature = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'implement', 'review', 'land', 'compound'];
    const quick = ['none', 'work', 'review', 'land', 'compound'];
    for (const [lane, phases, target] of [['feature', feature, featurePath], ['quick', quick, quickPath]]) {
      assert.deepEqual((await readdir(join(fixtureRoot, 'valid', lane))).sort(), phases.map((phase) => `${phase}.md`).sort());
      for (const phase of phases) {
        const fixture = join(fixtureRoot, 'valid', lane, `${phase}.md`);
        assert.deepEqual(await codes(workspace, target, fixture), [], `${lane}/${phase}: ${fixture}`);
      }
    }
  } finally {
    await cleanup();
  }
});

test('each invalid baton fixture reports its named stable error, without unrelated errors', async (context) => {
  const { workspace, cleanup } = await fixtureRepo();
  try {
    const files = (await readdir(join(fixtureRoot, 'invalid'))).filter((name) => name.endsWith('.md'));
    for (const file of files) {
      const code = file.slice(0, -3);
      await context.test(code, async () => {
        const fixture = join(fixtureRoot, 'invalid', file);
        const target = ['E_LANE_ESCALATE', 'E_LANE_MISMATCH'].includes(code) ? quickPath : featurePath;
        if (code === 'E_MULTIPLE_BATONS') {
          await writeFile(join(workspace, 'specs/001-sample/handoff.other.md'), await readFile(fixture));
        }
        try {
          let errors;
          if (code === 'E_MODEL_NOT_ALLOWED') {
            await mkdir(join(workspace, '.baton'), { recursive: true });
            await writeFile(join(workspace, '.baton/config.yml'), 'schema: 1\nmodels:\n  allowed: [approved-model]\n  enforce: error\n');
          }
          if (['E_GATE_PENDING', 'E_REVIEW_BLOCKING'].includes(code)) {
            await writeFile(join(workspace, featurePath), await readFile(fixture));
            const result = await runHandoff(workspace, ['receive', '--feature', '001-sample', '--phase', code === 'E_GATE_PENDING' ? 'plan' : 'land']);
            errors = result.errors.map((item) => item.code);
          } else if (code === 'E_LANE_ESCALATE') {
            await writeFile(join(workspace, quickPath), await readFile(fixture));
            await writeFile(join(workspace, 'review-input.json'), JSON.stringify({
              review: { findings_path: '.baton/quick/sample-fix.review.json', blocking_findings: 0 },
            }));
            const result = await runHandoff(workspace, ['write', '--phase', 'review', '--quick', 'sample-fix', '--from-json', 'review-input.json']);
            errors = result.errors.map((item) => item.code);
          } else errors = await codes(workspace, target, fixture);
          errors = [...new Set(errors)];
          assert.deepEqual(errors, [code], fixture);
        } finally {
          if (code === 'E_MULTIPLE_BATONS') await rm(join(workspace, 'specs/001-sample/handoff.other.md'));
        }
      });
    }
    assert.deepEqual(files.map((name) => name.slice(0, -3)).sort(), [
      'E_SCHEMA', 'E_BODY_SECTIONS', 'E_BUDGET', 'E_TRANSITION', 'E_OWNER', 'E_MISSING_ARTIFACT',
      'E_STALE_ARTIFACT', 'E_BLOCKING_OPEN', 'E_EXIT_UNMET', 'E_GATE_PENDING', 'E_APPROVER_FORMAT',
      'E_ACTOR_FORMAT', 'E_DENYLIST', 'E_NO_PREREG', 'E_ANALYSIS_MISSING', 'E_ANALYSIS_CRITICAL',
      'E_REVIEW_MISSING', 'E_REVIEW_BLOCKING', 'E_PR_MISSING', 'E_LANE_ESCALATE', 'E_LANE_MISMATCH',
      'E_MODEL_NOT_ALLOWED', 'E_MULTIPLE_BATONS',
    ].sort());
  } finally {
    await cleanup();
  }
});

test('quick phase checks require a reasoned decision, resolved findings and explicit scope evidence', async () => {
  const { workspace, cleanup } = await fixtureRepo();
  try {
    const start = parseFrontmatter(await readFile(join(fixtureRoot, 'valid/quick/none.md'), 'utf8')).data;
    const work = phaseForLane(phaseDefaults.phases.work, 'quick');
    const entry = await evaluateChecks(work.entry.filter((item) => item.id !== 'no-feature-tasks'),
      (check) => evaluateBuiltIn(workspace, quickPath, start, check));
    assert.ok(entry.every((item) => item.met), JSON.stringify(entry));
    start.decisions = [];
    const rejected = await evaluateBuiltIn(workspace, quickPath, start, { id: 'decision', tag: 'quick-eligible' });
    assert.equal(rejected.met, false);
    const review = parseFrontmatter(await readFile(join(fixtureRoot, 'valid/quick/review.md'), 'utf8')).data;
    assert.equal((await evaluateBuiltIn(workspace, quickPath, review, { id: 'findings-fixed-or-dismissed' })).met, true);
    assert.equal((await evaluateBuiltIn(workspace, quickPath, review, { id: 'quick-scope-held' })).met, true);
    review.decisions = review.decisions.filter((item) => item.tag !== 'quick-scope-held');
    assert.equal((await evaluateBuiltIn(workspace, quickPath, review, { id: 'quick-scope-held' })).met, false);
  } finally {
    await cleanup();
  }
});

test('feature phase checks reject missing story evidence, clarification and critical analysis', async () => {
  const { workspace, cleanup } = await fixtureRepo();
  try {
    const data = parseFrontmatter(await readFile(join(fixtureRoot, 'valid/feature/analyze.md'), 'utf8')).data;
    const check = (id, extras = {}) => evaluateBuiltIn(workspace, featurePath, data, { id, ...extras });
    for (const id of ['spec-exists', 'spec-has-stories', 'spec-has-success-criteria', 'markers-bounded',
      'plan-exists', 'constitution-check-present', 'tasks-exists', 'tasks-reference-stories',
      'acceptance-registered', 'analysis-recorded', 'no-critical-findings']) {
      assert.equal((await check(id)).met, true, id);
    }
    const spec = join(workspace, 'specs/001-sample/spec.md');
    await writeFile(spec, '# Feature\n[NEEDS CLARIFICATION: change scope]\n');
    assert.equal((await check('spec-has-stories')).met, false);
    assert.equal((await check('no-needs-clarification', { path: 'spec.md' })).met, false);
    data.analysis.critical = 1;
    assert.equal((await check('no-critical-findings')).met, false);
  } finally {
    await cleanup();
  }
});

test('model allowlist warns in warn mode and errors in error mode', async (context) => {
  const { workspace, cleanup } = await fixtureRepo();
  try {
    await writeFile(join(workspace, featurePath),
      await readFile(join(fixtureRoot, 'invalid/E_MODEL_NOT_ALLOWED.md')));
    const config = YAML.parse(await readFile(join(root, 'baton/templates/config.yml'), 'utf8'));
    config.models.allowed = ['approved-model'];
    config.models.enforce = 'warn';
    const configPath = join(workspace, '.baton/config.yml');
    await mkdir(join(workspace, '.baton'), { recursive: true });
    await writeFile(configPath, YAML.stringify(config));
    await context.test('warn mode emits W_MODEL_NOT_ALLOWED without an error', async () => {
      const warned = await runValidate(workspace, ['--path', featurePath]);
      assert.deepEqual(warned.errors, []);
      assert.ok(warned.warnings.some((item) => item.code === 'W_MODEL_NOT_ALLOWED'),
        JSON.stringify(warned.warnings));
    });
    config.models.enforce = 'error';
    await writeFile(configPath, YAML.stringify(config));
    await context.test('error mode emits E_MODEL_NOT_ALLOWED', async () => {
      const rejected = await runValidate(workspace, ['--path', featurePath]);
      assert.ok(rejected.errors.some((item) => item.code === 'E_MODEL_NOT_ALLOWED'),
        JSON.stringify(rejected.errors));
    });
  } finally {
    await cleanup();
  }
});

test('sample handoff satisfies its schema, phase contract, hashes and gate', async () => {
  const { workspace, cleanup } = await fixtureRepo();
  try {
    await writeFile(join(workspace, featurePath), await readFile(join(fixtureRoot, 'valid/feature/analyze.md')));
    assert.deepEqual(await validateHandoff(workspace, featurePath), []);
  } finally {
    await cleanup();
  }
});

test('sample evidence uses LF bytes so checked-in fixture hashes stay portable', async () => {
  for (const name of ['spec.md', 'plan.md', 'research.md', 'tasks.md', 'analysis.md', 'review.json']) {
    const bytes = await readFile(resolve(root, 'test/fixtures/features/sample', name));
    assert.equal(bytes.includes(13), false, `${name} contains CRLF bytes`);
  }
});

test('malformed frontmatter is reported as E_FRONTMATTER_MALFORMED', async () => {
  const { workspace, cleanup } = await fixtureRepo();
  try {
    const source = await readFile(join(workspace, featurePath), 'utf8');
    const errors = await validateHandoff(workspace, featurePath, `broken\n${source}`);
    assert.equal(errors[0]?.code, 'E_FRONTMATTER_MALFORMED');
  } finally {
    await cleanup();
  }
});

test('ready with a blocking question is rejected', async () => {
  const { workspace, cleanup } = await fixtureRepo();
  try {
    const { data, body } = parseFrontmatter(await readFile(join(workspace, featurePath), 'utf8'));
    data.status = 'ready';
    data.open_questions = [{ id: 'Q1', question: 'Who decides?', blocking: true, options: ['repository owner'] }];
    assert.ok((await validateHandoff(workspace, featurePath, serializeFrontmatter(data, body))).some((error) => error.code === 'E_BLOCKING_OPEN'));
  } finally {
    await cleanup();
  }
});

test('role-only A5 examples reject malformed approvers and actors with their stable codes', async () => {
  const { workspace, cleanup } = await fixtureRepo();
  try {
    const samples = JSON.parse(await readFile(resolve(root, 'test/fixtures/handoffs/role-formats.json'), 'utf8'));
    const { data, body } = parseFrontmatter(await readFile(join(workspace, featurePath), 'utf8'));
    for (const sample of samples.valid) {
      const variant = structuredClone(data);
      variant.gate.approved_by = sample.approved_by;
      variant.gate.approved_at = '2026-09-24';
      variant.updated_by = sample.actor;
      assert.deepEqual(await validateHandoff(workspace, featurePath, serializeFrontmatter(variant, body)), [], JSON.stringify(sample));
    }
    for (const sample of samples.invalid_approvers) {
      const variant = structuredClone(data);
      variant.gate.approved_by = sample.approved_by;
      variant.gate.approved_at = '2026-09-24';
      const errors = await validateHandoff(workspace, featurePath, serializeFrontmatter(variant, body));
      assert.ok(errors.some((entry) => entry.code === 'E_APPROVER_FORMAT'), JSON.stringify(sample));
      assert.ok(!errors.some((entry) => entry.code === 'E_SCHEMA'), JSON.stringify(sample));
    }
    for (const sample of samples.invalid_actors) {
      const variant = structuredClone(data);
      variant.updated_by = sample.actor;
      const errors = await validateHandoff(workspace, featurePath, serializeFrontmatter(variant, body));
      assert.ok(errors.some((entry) => entry.code === 'E_ACTOR_FORMAT'), JSON.stringify(sample));
      assert.ok(!errors.some((entry) => entry.code === 'E_SCHEMA'), JSON.stringify(sample));
    }
  } finally {
    await cleanup();
  }
});
