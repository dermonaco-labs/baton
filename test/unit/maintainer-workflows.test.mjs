import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
import { sourceRoot, runCli } from '../helpers/index.mjs';
import { maintainerWorkflowIssues } from '../../src/lib/maintainer-workflows.mjs';
import { run as validate } from '../../src/commands/validate.mjs';

const names = ['ci', 'smoke', 'upstream-watch', 'release'];
const path = (name) => join(sourceRoot, `.github/workflows/${name}.yml`);

test('maintainer workflow guard rejects a missing job guard', async () => {
  const fixture = "on: workflow_dispatch\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps: []\n";
  assert.deepEqual(maintainerWorkflowIssues('ci.yml', fixture).map(issue => issue.code), ['E_WORKFLOW_GUARD']);
  assert.deepEqual(maintainerWorkflowIssues('ci.yml', fixture.replace(
    'runs-on:', "if: github.repository == 'dermonaco-labs/baton'\n    runs-on:")), []);
  assert.deepEqual(maintainerWorkflowIssues('ci.yml', fixture.replace(
    'runs-on:', "if: github.repository != 'dermonaco-labs/baton'\n    runs-on:")).map(issue => issue.code), ['E_WORKFLOW_GUARD']);
});

test('source validation checks workflow jobs, but derived repos skip source guards', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-workflow-'));
  try {
    for (const file of ['baton.lock.json', '.baton/config.yml', 'baton/templates/phases.yml', 'packs/core.yml']) {
      await mkdir(join(root, file, '..'), { recursive: true });
      await cp(join(sourceRoot, file), join(root, file));
    }
    await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
    const workflow = join(root, '.github/workflows/ci.yml');
    await mkdir(join(root, '.github/workflows'), { recursive: true });
    await writeFile(workflow, "jobs:\n  lint:\n    runs-on: ubuntu-latest\n    steps: []\n");
    assert.ok((await validate(root, [])).errors.some(issue => issue.code === 'E_WORKFLOW_GUARD'));
    await rm(join(root, 'baton.lock.json'));
    assert.ok(!(await validate(root, [])).errors.some(issue => issue.code === 'E_WORKFLOW_GUARD'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('all maintainer jobs are guarded, bounded and SHA-pinned', async () => {
  for (const name of names) {
    const text = await readFile(path(name), 'utf8');
    const workflow = YAML.parse(text);
    assert.deepEqual(maintainerWorkflowIssues(`${name}.yml`, text), [], name);
    assert.deepEqual(workflow.permissions, {}, name);
    for (const [id, job] of Object.entries(workflow.jobs)) {
      assert.ok(job['timeout-minutes'] > 0, `${name}/${id}: missing timeout`);
      for (const step of job.steps) {
        if (!step.uses) continue;
        assert.match(step.uses, /@[0-9a-f]{40}$/, `${name}/${id}: action is not pinned`);
        assert.match(text, new RegExp(`${step.uses.replaceAll('/', '\\/')} # v\\d`),
          `${name}/${id}: missing version comment`);
      }
    }
  }
});

test('only Linux CI joins PR checks; full smoke remains tag/manual without matrices', async () => {
  for (const name of ['ci', 'smoke', 'release', 'copilot-setup-steps']) {
    const workflow = YAML.parse(await readFile(path(name), 'utf8'));
    assert.ok(workflow.on?.workflow_dispatch || workflow.on?.push?.tags, name);
    if (name === 'ci') assert.equal(workflow.on?.pull_request, null, 'CI verifies F39 on PR');
    else assert.equal(workflow.on?.pull_request, undefined, `${name}: PR trigger`);
    for (const job of Object.values(workflow.jobs)) assert.equal(job.strategy?.matrix, undefined, `${name}: matrix`);
  }
});

test('CI, smoke and release expose the required checks and dry-run boundary', async () => {
  const ci = YAML.parse(await readFile(path('ci'), 'utf8'));
  assert.ok(ci.jobs.lint && ci.jobs.test);
  assert.match(JSON.stringify(ci.jobs.lint), /validate --github/);
  assert.match(JSON.stringify(ci.jobs.test), /npm test/);
  for (const job of [ci.jobs.lint, ci.jobs.test]) {
    assert.match(job.steps.find(step => step.name === 'Install uv')?.run ?? '', /pip" install uv==0\.12\.5/);
    assert.ok(!job.steps.some(step => step.uses?.startsWith('lycheeverse/')), 'disallowed link-check action');
  }
  const links = ci.jobs.lint.steps.find(step => step.name === 'Check relative documentation links')?.run ?? '';
  assert.match(links, /1f4e0ef7f6554a6ed33dd7ac144fb2e1bbed98598e7af973042fc5cd43951c9a/);
  assert.match(links, /sha256sum -c -/);
  assert.match(links, /--offline --no-progress 'docs\/\*\*\/\*\.md'/);
  const smoke = YAML.parse(await readFile(path('smoke'), 'utf8'));
  assert.ok(smoke.jobs.ubuntu && smoke.jobs.macos && smoke.jobs.windows);
  assert.equal(smoke.jobs.macos['runs-on'], 'macos-latest');
  for (const job of [smoke.jobs.ubuntu, smoke.jobs.macos, smoke.jobs.windows]) {
    const steps = JSON.stringify(job.steps);
    for (const check of ['adopt --no-workflows', 'init', 'handoff', 'update']) {
      assert.ok(steps.includes(check), check);
    }
  }
  const release = YAML.parse(await readFile(path('release'), 'utf8'));
  assert.ok(release.on.workflow_dispatch.inputs.dry_run);
  assert.match(JSON.stringify(release.jobs.release), /SHA256SUMS/);
  assert.match(JSON.stringify(release.jobs.release), /attest-build-provenance/);
  assert.match(JSON.stringify(release.jobs.release), /dry_run/);
});

test('upstream watch verifies the CI-pinned lychee before checking external links', async () => {
  const ci = YAML.parse(await readFile(path('ci'), 'utf8'));
  const watch = YAML.parse(await readFile(path('upstream-watch'), 'utf8'));
  const relative = ci.jobs.lint.steps.find(step => step.name === 'Check relative documentation links')?.run;
  const links = watch.jobs.watch.steps.find(step => step.id === 'links');
  assert.ok(relative && links?.run, 'both workflows run standalone lychee');
  assert.ok(!watch.jobs.watch.steps.some(step => step.uses?.startsWith('lycheeverse/')),
    'weekly watch cannot use the action blocked by the repository policy');
  const install = relative.split('\n').slice(0, 4).join('\n');
  assert.ok(install.includes('sha256sum -c -'), 'CI must verify the archive');
  assert.ok(links.run.includes(install.trim()), 'watch must use the same pinned download and verification as CI');
  assert.match(links.run, /--include '\^https\?:\/\/'/);
  assert.match(links.run, /--format markdown/);
  assert.match(links.run, /--output "\$RUNNER_TEMP\/lychee\.out\.md"/);
  assert.match(links.run, /exit_code=\$result/);
  const update = watch.jobs.watch.steps.find(step => step.name === 'Update the single upstream tracking issue');
  assert.equal(update.env.LINKS_RESULT, '${{ steps.links.outputs.exit_code }}');
  assert.match(update.run, /RUNNER_TEMP\}\/lychee\.out\.md/);

  const scratch = await mkdtemp(join(tmpdir(), 'baton-lychee-regression-'));
  try {
    const bashScratch = scratch.replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`).replaceAll('\\', '/');
    const run = spawnSync('bash', ['-e', '-c',
      `curl() { printf 'tampered archive' > "$RUNNER_TEMP/lychee.tar.gz"; }\n${links.run}`],
    { cwd: sourceRoot, encoding: 'utf8',
      env: { ...process.env, RUNNER_TEMP: bashScratch, GITHUB_OUTPUT: `${bashScratch}/outputs` } });
    if (run.error) throw run.error;
    assert.notEqual(run.status, 0, 'tampered download must not reach lychee');
    assert.match(run.stdout + run.stderr, /FAILED|checksum did NOT match/);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('malformed frontmatter emits a GitHub error annotation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-annotation-'));
  try {
    await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
    const file = join(root, '.github/agents/malformed.agent.md');
    await mkdir(join(root, '.github/agents'), { recursive: true });
    await writeFile(file, '---description: broken---# Agent');
    const result = await runCli(root, ['validate', '--github']);
    assert.equal(result.code, 1);
    assert.match(result.stdout, /::error file=\.github\/agents\/malformed\.agent\.md,title=E_FRONTMATTER_MALFORMED::/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
