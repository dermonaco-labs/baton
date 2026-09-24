import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, readdir, stat, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { sourceRoot } from '../helpers/index.mjs';

async function runSource(root, args, environment = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(sourceRoot, 'src/cli.mjs'), '--cwd', root, ...args], {
      cwd: root, env: { ...process.env, ...environment }, windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

/** @param {(root:string) => void} [onCreated] */
async function derivedCopy(onCreated = () => {}) {
  const root = await mkdtemp(join(sourceRoot, '.baton-adopt-test-'));
  try {
    onCreated(root);
    for (const name of ['.baton', '.specify', '.github', 'baton', 'packs', 'src', 'specs', 'docs']) {
      await cp(join(sourceRoot, name), join(root, name), { recursive: true });
    }
    await mkdir(join(root, 'test'), { recursive: true });
    await writeFile(join(root, 'test/developer-only.txt'), 'removed by adopt\n');
    for (const name of ['README.md', 'package.json', 'package-lock.json', 'baton.lock.json', 'LICENSE', '.gitignore']) {
      await cp(join(sourceRoot, name), join(root, name));
    }
    await mkdir(join(root, 'docs/brainstorms'), { recursive: true });
    await mkdir(join(root, 'docs/solutions'), { recursive: true });
    for (const name of ['ci', 'smoke', 'upstream-watch', 'release', 'copilot-setup-steps']) {
      const path = join(root, `.github/workflows/${name}.yml`);
      try { await stat(path); } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await writeFile(path, `name: ${name}\n`);
      }
    }
    return { root, cleanup: () => rm(root, { force: true, recursive: true }) };
  } catch (error) {
    await rm(root, { force: true, recursive: true });
    throw error;
  }
}

test('fixture setup removes its working directory when setup fails', async () => {
  let created;
  await assert.rejects(derivedCopy((root) => {
    created = root;
    throw new Error('setup interrupted');
  }), /setup interrupted/);
  assert.ok(created);
  await assert.rejects(stat(created), { code: 'ENOENT' });
});

test('adopt replaces the constitution, README and manifest without touching workflows', async () => {
  const { root, cleanup } = await derivedCopy();
  try {
    const workflows = join(root, '.github/workflows');
    const before = Object.fromEntries(await Promise.all((await readdir(workflows)).map(async (name) =>
      [name, await readFile(join(workflows, name), 'utf8')])));
    const result = await runSource(root, ['adopt', '--no-workflows'], { BATON_FORCE_CLEANUP: '1' });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    for (const name of ['src', 'test', 'packs', 'baton', 'package.json']) {
      await assert.rejects(stat(join(root, name)), { code: 'ENOENT' });
    }
    assert.equal((await readFile(join(root, '.baton/manifest.json'), 'utf8')).includes('"source": "template"'), true);
    const config = await readFile(join(root, '.baton/config.yml'), 'utf8');
    assert.match(config, /run: node \.baton\/bin\/baton\.mjs validate/);
    assert.doesNotMatch(config, /npm run check/);
    const diagnosed = await runSource(root, ['doctor', '--strict', '--json']);
    assert.equal(diagnosed.code, 0, diagnosed.stdout || diagnosed.stderr);
    const validated = await runSource(root, ['validate', '--json']);
    assert.equal(validated.code, 0, validated.stdout || validated.stderr);
    assert.equal((await readFile(join(root, '.specify/memory/constitution.md'), 'utf8')).includes('# Baton Constitution'), false);
    assert.ok((await readFile(join(root, 'README.md'), 'utf8')).startsWith('#'));
    assert.match(await readFile(join(root, 'docs/baton/README.md'), 'utf8'), /^# Baton guide/);
    assert.ok((await readFile(join(root, '.github/workflows/baton.yml'), 'utf8')).length > 0);
    const after = Object.fromEntries(await Promise.all((await readdir(workflows)).map(async (name) =>
      [name, await readFile(join(workflows, name), 'utf8')])));
    assert.deepEqual(after, before);
  } finally {
    await cleanup();
  }
});

test('adopt refuses to clean the source repository', async () => {
  const { root, cleanup } = await derivedCopy();
  try {
    const result = await runSource(root, ['adopt'], { GITHUB_REPOSITORY: 'dermonaco-labs/baton' });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr + result.stdout, /BATON_FORCE_CLEANUP|source repo/i);
    assert.equal((await readFile(join(root, 'package.json'), 'utf8')).includes('"name": "baton"'), true);
  } finally {
    await cleanup();
  }
});

test('adopt preflights required templates before moving adopter files', async () => {
  const { root, cleanup } = await derivedCopy();
  try {
    await mkdir(join(root, 'docs'), { recursive: true });
    await writeFile(join(root, 'docs/project.md'), '# Project\n');
    await rm(join(root, '.specify/templates/constitution-template.md'), { force: true });
    const before = await readFile(join(root, 'README.md'), 'utf8');
    const result = await runSource(root, ['adopt', '--no-workflows'], { BATON_FORCE_CLEANUP: '1' });
    assert.notEqual(result.code, 0);
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), before);
    assert.equal(await readFile(join(root, 'docs/project.md'), 'utf8'), '# Project\n');
    await assert.rejects(stat(join(root, 'docs/baton/project.md')), { code: 'ENOENT' });
  } finally {
    await cleanup();
  }
});

test('cleanup workflow tells the adopter to run baton adopt if push fails', async () => {
  const workflow = await readFile(join(sourceRoot, '.github/workflows/template-cleanup.yml'), 'utf8');
  assert.match(workflow, /baton adopt/);
  assert.match(workflow, /--no-workflows/);
  assert.match(workflow, /github\.repository != 'dermonaco-labs\/baton'/);
  assert.match(workflow, /test -f \.baton\/template-cleanup-pending/);
  assert.match(workflow, /github-actions\[bot\]/);
  assert.match(workflow, /if ! git push; then[\s\S]*?exit 1/);
  assert.match(workflow, /baton adopt --prune-workflows locally/);
});

test('adopt applies every disposition row, rewrites moved docs links and validates adopter CI', async () => {
  const { root, cleanup } = await derivedCopy();
  try {
    await writeFile(join(root, 'docs/brainstorms/idea.md'), '# Brainstorm\n');
    await writeFile(join(root, 'docs/solutions/fix.md'), '# Solution\n');
    await writeFile(join(root, 'docs/brainstorms/links.md'),
      '[source](../reference/upstream-diff.md) [idea](idea.md)\n');
    await mkdir(join(root, 'docs/reference/nested'), { recursive: true });
    await writeFile(join(root, 'docs/reference/nested/links.md'),
      '[parent](../upstream-diff.md) [constitution](../../../.specify/memory/constitution.md) [root](/README.md)\n');
    await writeFile(join(root, 'docs/README.md'), '[reference](reference/upstream-diff.md) [root](../README.md)\n');
    const result = await runSource(root, ['adopt'], { BATON_FORCE_CLEANUP: '1' });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    for (const path of [
      'src', 'test', 'specs/001-baton-template', 'packs', 'baton', 'baton.lock.json',
      'package.json', 'package-lock.json', '.baton/template-cleanup-pending',
    ]) await assert.rejects(stat(join(root, path)), { code: 'ENOENT' }, path);
    assert.equal((await readFile(join(root, 'docs/baton/reference/nested/links.md'), 'utf8')),
      '[parent](../upstream-diff.md) [constitution](../../../../.specify/memory/constitution.md) [root](/README.md)\n');
    assert.equal((await readFile(join(root, 'docs/baton/README.md'), 'utf8')),
      '[reference](reference/upstream-diff.md) [root](../../README.md)\n');
    assert.equal(await readFile(join(root, 'docs/brainstorms/idea.md'), 'utf8'), '# Brainstorm\n');
    assert.equal(await readFile(join(root, 'docs/brainstorms/links.md'), 'utf8'),
      '[source](../baton/reference/upstream-diff.md) [idea](idea.md)\n');
    assert.equal(await readFile(join(root, 'docs/solutions/fix.md'), 'utf8'), '# Solution\n');
    const readme = await readFile(join(root, 'README.md'), 'utf8');
    assert.equal(readme, await readFile(join(sourceRoot, 'baton/templates/README.adopter.md'), 'utf8'));
    assert.match(readme, /docs\/baton/);
    assert.equal(await readFile(join(root, '.specify/memory/constitution.md'), 'utf8'),
      await readFile(join(root, '.specify/templates/constitution-template.md'), 'utf8'));
    assert.match(await readFile(join(root, 'CHANGELOG.md'), 'utf8'), /Keep a Changelog/);
    assert.match(await readFile(join(root, '.github/dependabot.yml'), 'utf8'), /package-ecosystem: github-actions/);
    assert.doesNotMatch(await readFile(join(root, '.github/dependabot.yml'), 'utf8'), /package-ecosystem: npm/);
    assert.match(await readFile(join(root, '.gitignore'), 'utf8'), /\.baton\/conflicts\//);
    assert.equal((JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'))).source, 'template');
    assert.equal(await readFile(join(root, '.github/workflows/baton.yml'), 'utf8'),
      await readFile(join(sourceRoot, 'baton/templates/workflows/baton.yml'), 'utf8'));
    const ci = await readFile(join(root, '.github/workflows/baton.yml'), 'utf8');
    assert.match(ci, /contents: read/);
    assert.match(ci, /checkout@[0-9a-f]{40}/);
    assert.match(ci, /setup-node@[0-9a-f]{40}/);
    assert.ok(ci.indexOf('validate --github') < ci.indexOf('doctor'));
    const diagnosis = await runSource(root, ['doctor', '--strict', '--json']);
    assert.equal(diagnosis.code, 0, diagnosis.stderr || diagnosis.stdout);
    assert.equal(JSON.parse(diagnosis.stdout).errors.length, 0);
  } finally {
    await cleanup();
  }
});

test('adopt dry-run leaves all files untouched and prune-workflows removes only dormant maintainer jobs', async () => {
  const { root, cleanup } = await derivedCopy();
  try {
    const before = await readFile(join(root, 'README.md'), 'utf8');
    const preview = await runSource(root, ['adopt', '--dry-run', '--prune-workflows'], { BATON_FORCE_CLEANUP: '1' });
    assert.equal(preview.code, 0, preview.stderr || preview.stdout);
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), before);
    assert.ok(await stat(join(root, '.baton/template-cleanup-pending')));
    assert.ok(await stat(join(root, '.github/workflows/ci.yml')));
    const result = await runSource(root, ['adopt', '--prune-workflows'], { BATON_FORCE_CLEANUP: '1' });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    for (const name of ['ci', 'smoke', 'upstream-watch', 'release']) {
      await assert.rejects(stat(join(root, `.github/workflows/${name}.yml`)), { code: 'ENOENT' });
    }
    for (const name of ['baton', 'template-cleanup', 'copilot-setup-steps']) {
      assert.ok(await stat(join(root, `.github/workflows/${name}.yml`)));
    }
  } finally {
    await cleanup();
  }
});

test('adopter can prune dormant workflows locally after automatic cleanup removed the lock', async () => {
  const { root, cleanup } = await derivedCopy();
  try {
    const first = await runSource(root, ['adopt', '--no-workflows'], { BATON_FORCE_CLEANUP: '1' });
    assert.equal(first.code, 0, first.stderr || first.stdout);
    const second = await runSource(root, ['adopt', '--prune-workflows'], { BATON_FORCE_CLEANUP: '1' });
    assert.equal(second.code, 0, second.stderr || second.stdout);
    for (const name of ['ci', 'smoke', 'upstream-watch', 'release']) {
      await assert.rejects(stat(join(root, `.github/workflows/${name}.yml`)), { code: 'ENOENT' });
    }
    assert.ok(await stat(join(root, '.github/workflows/baton.yml')));
  } finally {
    await cleanup();
  }
});

test('adopt installs missing CI, and --no-workflows refuses missing CI without modifying files', async () => {
  const { root, cleanup } = await derivedCopy();
  try {
    await rm(join(root, '.github/workflows/baton.yml'));
    const initialReadme = await readFile(join(root, 'README.md'), 'utf8');
    const refused = await runSource(root, ['adopt', '--no-workflows'], { BATON_FORCE_CLEANUP: '1' });
    assert.equal(refused.code, 1);
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), initialReadme);
    const installed = await runSource(root, ['adopt'], { BATON_FORCE_CLEANUP: '1' });
    assert.equal(installed.code, 0, installed.stderr || installed.stdout);
    assert.equal(await readFile(join(root, '.github/workflows/baton.yml'), 'utf8'),
      await readFile(join(sourceRoot, 'baton/templates/workflows/baton.yml'), 'utf8'));
  } finally {
    await cleanup();
  }
});

test('doctor detects missing mandatory hooks, malformed agents and disallowed models', async () => {
  const { root, cleanup } = await derivedCopy();
  try {
    await writeFile(join(root, '.baton/config.yml'), 'models:\n  allowed:\n    - allowed-model\n  enforce: warn\n');
    await writeFile(join(root, '.specify/extensions.yml'), 'installed:\n  - baton\nhooks:\n  before_specify:\n    - extension: baton\n      enabled: false\n      optional: true\n      command: speckit.baton.receive\n');
    await mkdir(join(root, '.github/agents'), { recursive: true });
    await writeFile(join(root, '.github/agents/broken.agent.md'), '---description: gone---\n');
    await writeFile(join(root, '.github/agents/model.agent.md'), '---\ndescription: Agent\nmodel: forbidden-model\n---\nBody\n');
    await writeFile(join(root, '.github/copilot-setup-steps.yml'), 'name: misplaced\n');
    await rm(join(root, '.github/workflows/baton.yml'));
    const result = await runSource(root, ['doctor', '--strict', '--json']);
    const findings = JSON.parse(result.stdout);
    assert.equal(result.code, 1);
    for (const code of ['W_HOOKS_MISSING', 'W_SETUP_STEPS_MISPLACED', 'W_NO_ADOPTER_CI', 'W_AGENT_CORRUPTED', 'W_MODEL_NOT_ALLOWED']) {
      assert.ok(findings.errors.some(issue => issue.code === code), `${code}: ${result.stdout}`);
    }
  } finally {
    await cleanup();
  }
});

test('doctor reports managed file integrity as a warning and --strict escalates it', async () => {
  const { root, cleanup } = await derivedCopy();
  try {
    const adopted = await runSource(root, ['adopt'], { BATON_FORCE_CLEANUP: '1' });
    assert.equal(adopted.code, 0, adopted.stderr || adopted.stdout);
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.ok(manifest.files.length, 'source lock should provide managed core files');
    const entry = manifest.files.find(file => file.path.startsWith('.github/agents/')) ?? manifest.files[0];
    await writeFile(join(root, entry.path), 'tampered\n');
    const normal = await runSource(root, ['doctor', '--json']);
    assert.equal(normal.code, 0, normal.stderr || normal.stdout);
    assert.ok(JSON.parse(normal.stdout).warnings.some(issue =>
      issue.code === 'W_MANIFEST_INTEGRITY' && issue.file === entry.path));
    const strict = await runSource(root, ['doctor', '--strict', '--json']);
    assert.equal(strict.code, 1);
    const findings = JSON.parse(strict.stdout);
    assert.ok(findings.errors.some(issue =>
      issue.code === 'W_MANIFEST_INTEGRITY' && issue.file === entry.path));
    assert.ok(!findings.errors.some(issue => issue.code === 'W_PACK_RECOMMENDED'));
  } finally {
    await cleanup();
  }
});
