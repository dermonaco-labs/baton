import { describe, test } from 'node:test';
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

test('every smoke OS installs the same verified uv prerequisite before unconditional F39', async () => {
  const smoke = YAML.parse(await readFile(path('smoke'), 'utf8'));
  const setup = 'astral-sh/setup-uv@557e51de59eb14aaaba2ed9621916900a91d50c6';
  for (const [os, job] of Object.entries(smoke.jobs)) {
    const uv = job.steps.findIndex(step => step.uses === setup);
    const scenarios = job.steps.findIndex(step => step.name === 'Overlay, handoff and update scenarios');
    assert.ok(uv >= 0 && uv < scenarios, `${os}: pinned uv must precede live init`);
    assert.equal(job.steps[uv].if, undefined, `${os}: uv must not be conditional`);
    assert.equal(job.steps[scenarios].if, undefined, `${os}: F39 must not be conditional`);
    assert.equal(job.steps[scenarios]['continue-on-error'], undefined, `${os}: F39 must fail the job`);
    assert.match(job.steps[scenarios].run, /test\/integration\/init\.test\.mjs/);
    assert.doesNotMatch(job.steps[scenarios].run, /test-name-pattern|test-skip-pattern/);
  }
});

test('normal CI and local checks reproduce pinned sync before accepting source integrity', async () => {
  const ci = YAML.parse(await readFile(path('ci'), 'utf8'));
  const sync = ci.jobs.lint.steps.find(step => step.run === 'node .baton/bin/baton.mjs sync --check');
  assert.ok(sync, 'PR CI must reproduce the pinned generator');
  assert.equal(sync.if, undefined, 'source sync is unconditional');
  assert.equal(sync['continue-on-error'], undefined);
  const pkg = JSON.parse(await readFile(join(sourceRoot, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts.check.split(' && ').includes('node .baton/bin/baton.mjs sync --check'),
    'the standard local gate must match CI');
});

test('maintainer workflow guard rejects a missing job guard', async () => {
  const fixture = "on: workflow_dispatch\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps: []\n";
  assert.deepEqual(maintainerWorkflowIssues('ci.yml', fixture).map(issue => issue.code), ['E_WORKFLOW_GUARD']);
  assert.deepEqual(maintainerWorkflowIssues('ci.yml', fixture.replace(
    'runs-on:', "if: github.repository == 'dermonaco-labs/baton'\n    runs-on:")), []);
  assert.deepEqual(maintainerWorkflowIssues('ci.yml', fixture.replace(
    'runs-on:', "if: github.repository != 'dermonaco-labs/baton'\n    runs-on:")).map(issue => issue.code), ['E_WORKFLOW_GUARD']);
  const guard = "github.repository == 'dermonaco-labs/baton'";
  const issues = (/** @type {string} */ condition) => maintainerWorkflowIssues('ci.yml',
    fixture.replace('runs-on:', `if: ${JSON.stringify(condition)}\n    runs-on:`)).map(issue => issue.code);
  assert.deepEqual(issues(`${guard} && (always() && needs.detect.outputs.publish == 'true')`), []);
  for (const bypass of [`${guard} || always()`, `${guard} && (always()) || (true)`, `${guard} && (a)) || ((b)`,
    `${guard} && (needs.x.outputs.y == ')') || (true)`, `${guard} && ()`, `always() && ${guard}`]) {
    assert.deepEqual(issues(bypass), ['E_WORKFLOW_GUARD'], bypass);
  }
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
    if (name === 'ci') assert.ok(workflow.on?.pull_request, 'CI verifies F39 on PR');
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

describe('upstream watch workflow', () => {
  const steps = (/** @type {any} */ job) => /** @type {any[]} */ (job.steps);
  const runs = (/** @type {any} */ job) => steps(job).filter(step => step.run).map(step => step.run).join('\n');

  test('keeps the weekly and manual triggers with a preview input and one constant concurrency group', async () => {
    const watch = YAML.parse(await readFile(path('upstream-watch'), 'utf8'));
    assert.deepEqual(watch.permissions, {});
    assert.deepEqual(watch.on.schedule, [{ cron: '0 6 * * 1' }]);
    assert.deepEqual(watch.on.workflow_dispatch.inputs.preview,
      { description: watch.on.workflow_dispatch.inputs.preview.description, type: 'boolean', default: false });
    assert.match(watch.on.workflow_dispatch.inputs.preview.description, /\S/);
    assert.deepEqual(Object.keys(watch.on).sort(), ['schedule', 'workflow_dispatch']);
    assert.deepEqual(watch.concurrency, { group: 'upstream-watch', 'cancel-in-progress': false });
  });

  test('splits read-only detection and generation from the narrow write jobs', async () => {
    const text = await readFile(path('upstream-watch'), 'utf8');
    const watch = YAML.parse(text);
    assert.deepEqual(maintainerWorkflowIssues('upstream-watch.yml', text), []);
    assert.deepEqual(Object.keys(watch.jobs), ['detect', 'generate', 'publish', 'report']);
    const expected = {
      detect: [10, { contents: 'read', 'pull-requests': 'read' }, undefined],
      generate: [20, { contents: 'read' }, 'detect'],
      publish: [5, { contents: 'write', 'pull-requests': 'write' }, ['detect', 'generate']],
      report: [5, { contents: 'read', issues: 'write' }, ['detect', 'generate', 'publish']]
    };
    for (const [id, [timeout, permissions, needs]] of Object.entries(expected)) {
      const job = watch.jobs[id];
      assert.equal(job['runs-on'], 'ubuntu-latest', `${id}: runner`);
      assert.equal(job['timeout-minutes'], timeout, `${id}: timeout`);
      assert.deepEqual(job.permissions, permissions, `${id}: permissions`);
      assert.deepEqual(job.needs, needs, `${id}: needs`);
    }
    assert.match(watch.jobs.generate.if, /needs\.detect\.outputs\.generate == 'true'/);
    assert.doesNotMatch(watch.jobs.generate.if, /always\(\)/, 'generate must not run after a failed detection');
    assert.equal(watch.jobs.generate.strategy['fail-fast'], false);
    assert.equal(watch.jobs.generate.strategy.matrix, '${{ fromJSON(needs.detect.outputs.matrix) }}');
    assert.match(watch.jobs.publish.if,
      /always\(\) && needs\.detect\.result == 'success' && needs\.detect\.outputs\.publish == 'true'/);
    assert.match(watch.jobs.report.if, /always\(\)/);
    assert.equal(watch.jobs.publish.outputs.results, '${{ steps.publish.outputs.results }}');
  });

  test('checkouts drop credentials and every cache is disabled', async () => {
    const watch = YAML.parse(await readFile(path('upstream-watch'), 'utf8'));
    const release = YAML.parse(await readFile(path('release'), 'utf8'));
    for (const [id, job] of [...Object.entries(watch.jobs), ['release', release.jobs.release]]) {
      for (const step of steps(job)) {
        if (step.uses?.startsWith('actions/checkout@')) assert.equal(step.with?.['persist-credentials'], false, id);
        if (step.uses?.startsWith('astral-sh/setup-uv@')) assert.equal(step.with?.['enable-cache'], false, id);
        if (id !== 'release' && step.uses?.startsWith('actions/setup-node@')) {
          assert.equal(step.with?.cache, undefined, `${id}: setup-node cache`);
        }
        if (id !== 'release') assert.doesNotMatch(step.uses ?? '', /actions\/cache@/, `${id}: cache action`);
      }
    }
    for (const id of ['generate', 'publish', 'report']) {
      const checkout = steps(watch.jobs[id]).find(step => step.uses?.startsWith('actions/checkout@'));
      assert.equal(checkout?.with?.ref, '${{ needs.detect.outputs.base }}', `${id}: must check out the detected base`);
    }
  });

  test('generate validates in full and uploads the regenerated tree with hidden paths', async () => {
    const watch = YAML.parse(await readFile(path('upstream-watch'), 'utf8'));
    const job = watch.jobs.generate;
    const script = runs(job);
    assert.match(script, /npm ci --ignore-scripts --no-audit --no-fund/);
    assert.match(script, /node \.baton\/bin\/baton\.mjs sync --bump "\$BUMP"/);
    assert.match(script, /npm run check/);
    assert.match(script, /node src\/maintainer\/upstream-upgrade\.mjs package/);
    assert.equal(steps(job).find(step => step.id === 'bump')?.env?.BUMP, '${{ matrix.bump }}');
    const upload = steps(job).find(step => step.uses?.startsWith('actions/upload-artifact@'));
    assert.equal(upload.uses, 'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02');
    assert.equal(upload.with['include-hidden-files'], true);
    assert.equal(upload.with.name, 'candidate-${{ matrix.upstream }}');
    assert.match(upload.if, /always\(\)/);
  });

  test('publish and report run only trusted Node code against downloaded artifacts', async () => {
    const watch = YAML.parse(await readFile(path('upstream-watch'), 'utf8'));
    for (const id of ['publish', 'report']) {
      const script = runs(watch.jobs[id]);
      assert.doesNotMatch(script, /\b(npm|npx|uvx?|pip3?|python3?)\b|baton\.mjs|\bsync\b/, `${id}: forbidden tooling`);
      assert.equal(script.trim(), `node src/maintainer/upstream-upgrade.mjs ${id}`, `${id}: only the maintainer script`);
      assert.ok(!steps(watch.jobs[id]).some(step => step.uses?.startsWith('astral-sh/')), `${id}: uv`);
      const download = steps(watch.jobs[id]).find(step => step.uses?.startsWith('actions/download-artifact@'));
      assert.match(download?.uses ?? '', /@[0-9a-f]{40}$/);
      assert.equal(download.with.pattern, 'candidate-*');
    }
    const text = await readFile(path('upstream-watch'), 'utf8');
    assert.doesNotMatch(text, /secrets\.|pull_request_target/);
    for (const job of Object.values(watch.jobs)) {
      for (const step of steps(job)) assert.doesNotMatch(step.run ?? '', /\$\{\{/, 'expressions only through env');
    }
  });

  test('upstream watch verifies the CI-pinned lychee before checking external links', async () => {
    const ci = YAML.parse(await readFile(path('ci'), 'utf8'));
    const watch = YAML.parse(await readFile(path('upstream-watch'), 'utf8'));
    const relative = ci.jobs.lint.steps.find(step => step.name === 'Check relative documentation links')?.run;
    const links = watch.jobs.detect.steps.find(step => step.id === 'links');
    assert.ok(relative && links?.run, 'both workflows run standalone lychee');
    for (const job of Object.values(watch.jobs)) {
      assert.ok(!steps(job).some(step => step.uses?.startsWith('lycheeverse/')),
        'weekly watch cannot use the action blocked by the repository policy');
    }
    const install = relative.split('\n').slice(0, 4).join('\n');
    assert.ok(install.includes('sha256sum -c -'), 'CI must verify the archive');
    assert.ok(links.run.includes(install.trim()), 'watch must use the same pinned download and verification as CI');
    assert.match(links.run, /--include '\^https\?:\/\/'/);
    assert.match(links.run, /--format markdown/);
    assert.match(links.run, /--output "\$RUNNER_TEMP\/lychee\.out\.md"/);
    assert.match(links.run, /exit_code=\$result/);
    const plan = watch.jobs.detect.steps.find(step => step.id === 'plan');
    assert.equal(plan.env.LINKS_RESULT, '${{ steps.links.outputs.exit_code }}');
    assert.equal(plan.env.LINKS_OUTCOME, '${{ steps.links.outcome }}');
    assert.equal(plan.env.SYNC_RESULT, '${{ steps.sync.outputs.result }}');
    assert.match(plan.if, /always\(\) && steps\.checkout\.outcome == 'success'/);
    assert.match(plan.run, /LINKS_REPORT="\$RUNNER_TEMP\/lychee\.out\.md"/);
    assert.match(plan.run, /node src\/maintainer\/upstream-upgrade\.mjs detect/);

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
});

test('pull_request types include ready_for_review', async () => {
  const types = ['opened', 'synchronize', 'reopened', 'ready_for_review'];
  const files = ['.github/workflows/ci.yml', '.github/workflows/baton.yml', 'baton/templates/workflows/baton.yml'];
  for (const file of files) {
    const workflow = YAML.parse(await readFile(join(sourceRoot, file), 'utf8'));
    assert.deepEqual(workflow.on.pull_request, { types }, file);
  }
  assert.ok((await readFile(join(sourceRoot, files[1]))).equals(await readFile(join(sourceRoot, files[2]))),
    'the adopter template must stay byte-identical');
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
