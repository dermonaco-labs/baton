import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { sourceRoot, tempRepo, runCli } from '../helpers/index.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';

const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const lines = (text) => text.split(/\r?\n/).filter(Boolean).sort();
const skill = (name) => process.env.BATON_WRAPPER_BASELINE
  ? git(sourceRoot, 'show', `${process.env.BATON_WRAPPER_BASELINE}:baton/skills/${name}/SKILL.md`)
  : readFile(join(sourceRoot, 'baton', 'skills', name, 'SKILL.md'), 'utf8');

async function initialize(root) {
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'user.name', 'Fixture');
  git(root, 'config', 'core.autocrlf', 'false');
  await writeFile(join(root, 'README.md'), 'Baseline\n');
  git(root, 'add', 'README.md');
  git(root, 'commit', '-qm', 'Baseline');
  await cp(join(sourceRoot, 'baton', 'schemas'), join(root, 'baton', 'schemas'), { recursive: true });
}

for (const lane of ['feature', 'quick']) {
  test(`review wrapper covers the real pinned ${lane} CLI subject and CE diff scopes`, async () => {
    const { root, cleanup } = await tempRepo();
    try {
      await initialize(root);
      const base = git(root, 'rev-parse', 'HEAD');
      const target = lane === 'feature' ? ['--feature', '001-sample'] : ['--quick', 'sample-fix'];
      if (lane === 'feature') {
        await mkdir(join(root, 'specs', '001-sample'), { recursive: true });
        await cp(join(sourceRoot, 'test', 'fixtures', 'features', 'sample', 'spec.md'),
          join(root, 'specs', '001-sample', 'spec.md'));
      }
      const created = await runCli(root, ['handoff', 'new', ...target, '--reason', 'Fixture correction']);
      assert.equal(created.code, 0, created.stdout + created.stderr);
      if (lane === 'feature') {
        // Seed a recorded review base in this pre-review feature fixture.
        const path = join(root, 'specs', '001-sample', 'handoff.md');
        const { data, body } = parseFrontmatter(await readFile(path, 'utf8'));
        data.decisions.push({ id: 'D1', decision: 'Pin fixture review base', tag: 'diff-base',
          rationale: 'Feature review fixture', 'x-base-commit': base, by: 'baton' });
        await writeFile(path, serializeFrontmatter(data, body));
      }
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'src', 'feature.mjs'), 'export const fixed = true;\n');
      await mkdir(join(root, '.baton', 'tmp'), { recursive: true });
      await writeFile(join(root, '.baton', 'tmp', 'receipt.json'), '{}\n');
      git(root, 'add', 'src', '.baton', 'baton');
      if (lane === 'feature') git(root, 'add', 'specs');
      const result = await runCli(root, ['handoff', 'scope', ...target, '--json']);
      assert.equal(result.code, 0, result.stdout + result.stderr);
      const scope = JSON.parse(result.stdout).data;
      const ceFiles = lines(git(root, 'diff', '--name-only', scope.base));
      assert.equal(scope.base, base);
      assert.ok(scope.files.includes('src/feature.mjs'));
      assert.ok(ceFiles.includes(lane === 'feature' ? 'specs/001-sample/handoff.md' : '.baton/quick/sample-fix.md'));
      assert.ok(!scope.files.includes('.baton/tmp/receipt.json'));
      if (lane === 'feature') assert.ok(!scope.files.includes('specs/001-sample/spec.md'));
      assert.notDeepEqual(ceFiles, scope.files, 'Reproduces v0.1.1 equality failure');
      assert.ok(scope.files.every(file => ceFiles.includes(file)));
      const wrapper = await skill('baton-review');
      assert.match(wrapper, /CLI subject set must be a subset/);
      assert.match(wrapper, /reviewed file set must equal the pinned\s+tracked diff set/);
      assert.match(wrapper, /untracked subject.*stage.*restart/is);
      assert.match(wrapper, /reported base\s+must equal.*CLI base/is);
      await writeFile(join(root, 'src', 'untracked.mjs'), 'export const pending = true;\n');
      const untracked = JSON.parse((await runCli(root, ['handoff', 'scope', ...target, '--json'])).stdout).data;
      const beforeStaging = lines(git(root, 'diff', '--name-only', untracked.base));
      assert.ok(untracked.files.includes('src/untracked.mjs'));
      assert.ok(!beforeStaging.includes('src/untracked.mjs'), 'Fresh CE tracked diff cannot prove untracked subject coverage');
      assert.ok(!untracked.files.every(file => beforeStaging.includes(file)));
      git(root, 'add', 'src/untracked.mjs');
      const stagedResult = await runCli(root, ['handoff', 'scope', ...target, '--json']);
      assert.equal(stagedResult.code, 0, stagedResult.stdout + stagedResult.stderr);
      const staged = JSON.parse(stagedResult.stdout).data;
      const afterStaging = lines(git(root, 'diff', '--name-only', staged.base));
      assert.equal(staged.base, base);
      assert.ok(staged.files.includes('src/untracked.mjs'));
      assert.ok(afterStaging.includes('src/untracked.mjs'));
      assert.ok(staged.files.every(file => afterStaging.includes(file)), 'Explicit staging restores complete subject coverage');
    } finally { await cleanup(); }
  });
}

test('landing captures outside the repo and verifies again after the land receipt is published', async () => {
  const { root, cleanup } = await tempRepo();
  const remote = await tempRepo();
  const notes = await tempRepo();
  try {
    await initialize(root);
    git(remote.root, 'init', '--bare', '-q');
    git(root, 'remote', 'add', 'origin', remote.root);
    const branch = git(root, 'branch', '--show-current');
    git(root, 'push', '-qu', 'origin', branch);
    assert.equal(git(root, 'status', '--porcelain'), '?? baton/');
    git(root, 'add', 'baton');
    git(root, 'commit', '-qm', 'Fixture schemas');
    git(root, 'push', '-q', 'origin', branch);
    assert.equal(git(root, 'status', '--porcelain'), '');
    const upstream = await readFile(join(sourceRoot, '.github', 'skills', 'land', 'SKILL.md'), 'utf8');
    assert.ok(upstream.indexOf('### Step 8: Verify') < upstream.indexOf('### Step 9: Capture session state'));
    await mkdir(join(root, 'docs', 'handoffs'), { recursive: true });
    await writeFile(join(root, 'docs', 'handoffs', 'fixture.md'), 'Late upstream note\n');
    assert.notEqual(git(root, 'status', '--porcelain'), '', 'Reproduces upstream late repo note');
    git(root, 'add', 'docs');
    git(root, 'commit', '-qm', 'Pre-existing note');
    git(root, 'push', '-q', 'origin', branch);
    const wrapper = await skill('baton-land');
    assert.match(wrapper, /Step 9.*outside the repository/is);
    assert.match(wrapper, /not.*docs\/sessions\/.*docs\/handoffs\//is);
    await writeFile(join(notes.root, 'handoff.md'), 'External Step 9 capture\n');
    assert.equal(git(root, 'status', '--porcelain'), '', 'External capture leaves published tree clean');
    await mkdir(join(root, '.baton', 'quick'), { recursive: true });
    await writeFile(join(root, '.baton', 'quick', 'fixture.md'), 'CLI land receipt fixture\n');
    git(root, 'add', '.baton/quick/fixture.md');
    git(root, 'commit', '-qm', 'Land receipt');
    assert.notEqual(git(root, 'rev-parse', 'HEAD'), git(root, 'rev-parse', `origin/${branch}`));
    git(root, 'push', '-q', 'origin', branch);
    assert.equal(git(root, 'status', '--porcelain'), '');
    assert.equal(git(root, 'rev-parse', 'HEAD'), git(root, 'rev-parse', `origin/${branch}`));
    const localHead = git(root, 'rev-parse', 'HEAD');
    const remoteRef = `refs/heads/${branch}`;
    assert.equal(git(root, 'ls-remote', '--heads', 'origin', remoteRef).split(/\s+/)[0], localHead);
    const remoteAdvance = git(root, 'commit-tree', 'HEAD^{tree}', '-p', localHead, '-m', 'Remote-only advance');
    git(root, 'push', '-q', remote.root, `${remoteAdvance}:${remoteRef}`);
    assert.equal(git(root, 'status', '--porcelain'), '');
    assert.equal(git(root, 'rev-parse', `origin/${branch}`), localHead, 'URL push leaves local tracking stale');
    assert.notEqual(git(root, 'ls-remote', '--heads', 'origin', remoteRef).split(/\s+/)[0], localHead,
      'Clean status and local/tracking equality do not prove actual remote publication');
    git(root, 'fetch', '-q', 'origin', branch);
    git(root, 'merge', '--ff-only', '-q', `origin/${branch}`);
    assert.equal(git(root, 'status', '--porcelain'), '');
    assert.equal(git(root, 'rev-parse', 'HEAD'), git(root, 'rev-parse', `origin/${branch}`));
    assert.equal(git(root, 'ls-remote', '--heads', 'origin', remoteRef).split(/\s+/)[0], git(root, 'rev-parse', 'HEAD'));
    const write = wrapper.indexOf('handoff write --phase land');
    const publish = wrapper.indexOf('Publish the land receipt');
    const verify = wrapper.indexOf('Final verification');
    assert.ok(write >= 0 && publish > write && verify > publish);
    assert.match(wrapper.slice(verify), /git status --porcelain/);
    assert.match(wrapper.slice(verify), /unpushed/);
    assert.match(wrapper.slice(verify), /actual remote\s+branch head/);
    assert.match(wrapper.slice(verify), /Do not.*completion.*fail/is);
  } finally {
    await cleanup();
    await remote.cleanup();
    await notes.cleanup();
  }
});
