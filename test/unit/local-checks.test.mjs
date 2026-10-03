import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  checkTimeout, runLocalCheck, DEFAULT_CHECK_TIMEOUT_MS, MAX_CHECK_TIMEOUT_MS,
} from '../../src/lib/local-checks.mjs';
import { loadSchemas, validateSchema } from '../../src/lib/schema.mjs';
import { sourceRoot } from '../helpers/index.mjs';

test('deadline defaults and finite bounds agree with config schema', async () => {
  const check = { name: 'fixture', run: 'node check.mjs' };
  assert.equal(checkTimeout(check), 300000);
  assert.equal(DEFAULT_CHECK_TIMEOUT_MS, 300000);
  for (const timeout_ms of [1, 600000, MAX_CHECK_TIMEOUT_MS]) {
    assert.equal(checkTimeout({ ...check, timeout_ms }), timeout_ms);
  }
  for (const timeout_ms of [undefined, null, 0, -1, 0.5, '1000', Infinity, NaN, MAX_CHECK_TIMEOUT_MS + 1]) {
    assert.throws(() => checkTimeout({ ...check, timeout_ms }), { code: 'E_CONFIG' });
  }
  const schema = JSON.parse(await readFile(join(sourceRoot, 'baton/schemas/config.schema.json'), 'utf8'));
  assert.deepEqual(schema.properties.checks.items.properties.timeout_ms,
    { type: 'integer', minimum: 1, maximum: MAX_CHECK_TIMEOUT_MS });
  const config = JSON.parse(JSON.stringify({
    schema: 1, packs: ['core'], lanes: { quick: { max_files_changed: 10 } },
    gates: { approver_roles: ['maintainer'], approval_channels: ['direct approval'] },
    denylist: { terms_file: null },
    models: { roles: Object.fromEntries(['planning', 'implementation', 'review', 'fast']
      .map(role => [role, { model: 'example' }])), phase_roles: {}, allowed: [], enforce: 'off', apply_to_agents: false },
    checks: [check], budgets: { read_first_max: 12, body_max_lines: 150 },
  }));
  const schemas = await loadSchemas(sourceRoot);
  assert.deepEqual(validateSchema(schemas, 'config', config), []);
  for (const timeout_ms of [0, -1, 0.5, '1000', null, MAX_CHECK_TIMEOUT_MS + 1]) {
    config.checks[0].timeout_ms = timeout_ms;
    assert.ok(validateSchema(schemas, 'config', config).some(issue => issue.pointer.includes('timeout_ms')));
  }
});

test('foreground checks preserve success and distinguish failed stdout/stderr', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-local-result-'));
  try {
    await writeFile(join(root, 'check.mjs'), "console.log('success evidence');\n");
    const check = { name: 'fixture', run: `"${process.execPath}" check.mjs`, timeout_ms: 5000 };
    const success = await runLocalCheck(root, check);
    assert.equal(success.met, true);
    assert.equal(success.evidence, 'fixture: 0');
    assert.match(success.stdout, /success evidence/);
    assert.equal(success.stderr, '');
    await writeFile(join(root, 'check.mjs'),
      "console.log('stdout evidence'); console.error('stderr evidence'); process.exitCode = 7;\n");
    const failure = await runLocalCheck(root, check);
    assert.equal(failure.met, false);
    assert.match(failure.evidence, /^fixture: 7\n/);
    assert.match(failure.evidence, /stdout:\nstdout evidence/);
    assert.match(failure.evidence, /stderr:\nstderr evidence/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('spawn errors and POSIX signals stay distinct from numeric exits and timeouts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-local-errors-'));
  try {
    await assert.rejects(runLocalCheck(join(root, 'missing-directory'),
      { name: 'missing', run: `"${process.execPath}" -e "process.exit(0)"`, timeout_ms: 5000 }),
    error => error.code === 'E_CHECK_FAILED' &&
      /missing: cannot start check:.*ENOENT/.test(error.message));
    if (process.platform !== 'win32') {
      const result = await runLocalCheck(root,
        { name: 'signal', run: 'kill -TERM $$', timeout_ms: 5000 });
      assert.equal(result.met, false);
      assert.equal(result.evidence, 'signal: signal SIGTERM');
      assert.doesNotMatch(result.evidence, /timeout|cannot start/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('timeout terminates the owned foreground shell, child and grandchild before returning', { timeout: 15000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-local-tree-'));
  try {
    await writeFile(join(root, 'grandchild.mjs'),
      "import { writeFileSync } from 'node:fs'; writeFileSync('grandchild.pid', String(process.pid)); setInterval(() => {}, 1000);\n");
    await writeFile(join(root, 'parent.mjs'),
      "import { writeFileSync } from 'node:fs'; import { spawn } from 'node:child_process'; writeFileSync('parent.pid', String(process.pid)); spawn(process.execPath, ['grandchild.mjs'], { stdio: 'inherit' }); setInterval(() => {}, 1000);\n");
    const result = await runLocalCheck(root,
      { name: 'tree', run: `"${process.execPath}" parent.mjs`, timeout_ms: 1500 });
    assert.equal(result.met, false);
    assert.match(result.evidence, /tree: timeout after 1500ms/);
    for (const path of ['parent.pid', 'grandchild.pid']) {
      const pid = Number(await readFile(join(root, path), 'utf8'));
      assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' }, `${path} must not remain alive`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('excess output fails boundedly and cleans up the foreground command', { timeout: 15000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-local-output-'));
  try {
    await writeFile(join(root, 'check.mjs'),
      "import { writeFileSync } from 'node:fs'; writeFileSync('check.pid', String(process.pid)); console.log('x'.repeat(1024 * 1024 + 1)); setInterval(() => {}, 1000);\n");
    const result = await runLocalCheck(root,
      { name: 'noisy', run: `"${process.execPath}" check.mjs`, timeout_ms: 5000 });
    assert.equal(result.met, false);
    assert.match(result.evidence, /noisy: output exceeds 1048576 bytes/);
    assert.ok(result.stdout.length <= 1024 * 1024);
    const pid = Number(await readFile(join(root, 'check.pid'), 'utf8'));
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
