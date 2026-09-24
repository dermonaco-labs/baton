import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, readdir, stat, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runCli, sourceRoot } from '../helpers/index.mjs';

async function derivedCopy() {
  const root = await mkdtemp(join(tmpdir(), 'baton-adopt-'));
  for (const name of ['.baton', '.specify', '.github', 'baton', 'packs', 'src', 'test', 'specs']) {
    await cp(join(sourceRoot, name), join(root, name), { recursive: true });
  }
  for (const name of ['README.md', 'package.json', 'package-lock.json', 'LICENSE', '.gitignore']) {
    await cp(join(sourceRoot, name), join(root, name));
  }
  return { root, cleanup: () => rm(root, { force: true, recursive: true }) };
}

test('adopt replaces the constitution, README and manifest without touching workflows', async () => {
  const { root, cleanup } = await derivedCopy();
  try {
    const workflows = join(root, '.github/workflows');
    const before = Object.fromEntries(await Promise.all((await readdir(workflows)).map(async (name) =>
      [name, await readFile(join(workflows, name), 'utf8')])));
    const result = await runCli(root, ['adopt', '--no-workflows'], { BATON_FORCE_CLEANUP: '1' });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    for (const name of ['src', 'test', 'packs', 'baton', 'package.json']) {
      await assert.rejects(stat(join(root, name)), { code: 'ENOENT' });
    }
    assert.equal((await readFile(join(root, '.baton/manifest.json'), 'utf8')).includes('"source": "template"'), true);
    assert.equal((await readFile(join(root, '.specify/memory/constitution.md'), 'utf8')).includes('# Baton Constitution'), false);
    assert.ok((await readFile(join(root, 'README.md'), 'utf8')).startsWith('#'));
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
    const result = await runCli(root, ['adopt'], { GITHUB_REPOSITORY: 'dermonaco-labs/baton' });
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
    const result = await runCli(root, ['adopt', '--no-workflows'], { BATON_FORCE_CLEANUP: '1' });
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
});
