import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { sourceRoot } from '../helpers/index.mjs';

test('the draft PR runs a pinned Windows template-instantiation smoke without writes', async () => {
  const workflow = YAML.parse(await readFile(join(sourceRoot, '.github/workflows/mvp-windows-smoke.yml'), 'utf8'));
  assert.deepEqual(Object.keys(workflow.on), ['pull_request']);
  assert.deepEqual(workflow.permissions, {});
  const job = workflow.jobs.smoke;
  assert.equal(job['runs-on'], 'windows-latest');
  assert.equal(job.permissions.contents, 'read');
  assert.match(job.if, /github\.repository == 'dermonaco-labs\/baton'/);
  assert.ok(job.steps.every((step) => !step.uses || /@[a-f0-9]{40}$/.test(step.uses)));
  const commands = job.steps.map((step) => step.run ?? '').join('\n');
  for (const required of ['npm ci', 'npm run check', 'adopt --no-workflows',
    'doctor --strict', 'baton.mjs validate', 'git status --porcelain -- .github/workflows']) {
    assert.ok(commands.includes(required), `missing ${required}`);
  }
});

test('npm test selects only intended suites without a shell-dependent glob', async () => {
  const pkg = JSON.parse(await readFile(join(sourceRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.test, 'node test/run.mjs');
});
