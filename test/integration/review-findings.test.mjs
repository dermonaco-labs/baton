import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { sourceRoot, tempRepo } from '../helpers/index.mjs';
import { evaluateBuiltIn } from '../../src/lib/checks.mjs';

/** @param {string} root @param {string[]} args */
function cli(root, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(sourceRoot, 'src/cli.mjs'), '--cwd', root, ...args, '--json'],
      { cwd: root, windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

const finding = { id: 'F1', severity: 'P2', title: 'Typo', file: 'docs/label.md', line: 1,
  persona: 'correctness-reviewer', confidence: 0.9, disposition: 'fixed', reason: null };
const findings = (items) => ({
  schema: 1, source: { engine: 'ce-review', mode: 'headless', run_artifact: '.context/ce-review/run/' },
  base: 'abcdef1', head: 'abcdef2', personas: ['correctness-reviewer'], findings: items,
});

async function repo(review) {
  const sample = await tempRepo();
  await cp(join(sourceRoot, 'baton/schemas'), join(sample.root, 'baton/schemas'), { recursive: true });
  await mkdir(join(sample.root, '.baton/quick'), { recursive: true });
  await cp(join(sourceRoot, 'test/fixtures/handoffs/valid/quick/review.md'), join(sample.root, '.baton/quick/sample-fix.md'));
  await writeFile(join(sample.root, '.baton/quick/sample-fix.review.json'), JSON.stringify(review, null, 2) + '\n');
  return sample;
}

test('F38 quick-lane review with a fixed finding and no task passes baton validate', async () => {
  const { root, cleanup } = await repo(findings([finding]));
  try {
    const result = await cli(root, ['validate', '--path', '.baton/quick/sample-fix.md']);
    const report = JSON.parse(result.stdout || result.stderr);
    assert.deepEqual((report.errors ?? []).filter(error => error.code === 'E_REVIEW_MISSING'), [], result.stdout);
    assert.equal(result.code, 0, result.stdout + result.stderr);
  } finally { await cleanup(); }
});

test('F38 findings schema accepts task-less findings while the feature-lane check still requires a task', async () => {
  const { root, cleanup } = await repo(findings([{ ...finding, disposition: 'open' }]));
  try {
    const data = { review: { findings_path: '.baton/quick/sample-fix.review.json' }, decisions: [] };
    const path = 'specs/001-sample/handoff.md';
    assert.equal((await evaluateBuiltIn(root, path, data, { id: 'findings-json-valid' })).met, true);
    assert.equal((await evaluateBuiltIn(root, path, data, { id: 'findings-mapped-to-tasks-or-dismissed' })).met, false);
    await writeFile(join(root, '.baton/quick/sample-fix.review.json'),
      JSON.stringify(findings([{ ...finding, disposition: 'open', task: 'T001' }])) + '\n');
    assert.equal((await evaluateBuiltIn(root, path, data, { id: 'findings-mapped-to-tasks-or-dismissed' })).met, true);
  } finally { await cleanup(); }
});