import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { runCli, sourceRoot } from '../helpers/index.mjs';

test('validate --path scans personal data in selected files and fixtures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-validate-'));
  try {
    await mkdir(join(root, 'baton'), { recursive: true });
    await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
    await writeFile(join(root, 'README.md'), '# Contact\n\nperson@private.example\n');
    await mkdir(join(root, 'test/fixtures'), { recursive: true });
    await writeFile(join(root, 'test/fixtures/personal.md'), '# Contact\n\n@private-handle\n');
    for (const path of ['README.md', 'test/fixtures/personal.md']) {
      const result = await runCli(root, ['validate', '--path', path, '--json']);
      assert.equal(result.code, 1, path);
      assert.ok(JSON.parse(result.stdout).errors.some((error) => error.code === 'E_DENYLIST' && error.file === path), path);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('default validation checks owner terms in vendored license notices', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-licenses-'));
  try {
    await mkdir(join(root, 'baton'), { recursive: true });
    await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
    const licenses = [
      '.github/skills/speckit-example/LICENSE',
      'packs/docs-review/files/.github/agents/LICENSE',
    ];
    for (const path of licenses) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), 'Copyright Author <author@license.example>\nprivate-owner-term\n');
    }
    const termsFile = join(root, 'private-terms.txt');
    await writeFile(termsFile, 'private-owner-term\n');
    const result = await runCli(root, ['validate', '--json'], { BATON_DENYLIST_FILE: termsFile });
    const found = JSON.parse(result.stdout).errors.filter((error) => error.code === 'E_DENYLIST');
    assert.equal(result.code, 1);
    assert.deepEqual(found.map((error) => error.file).sort(), licenses.sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validate --changed retains the license-notice denylist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-changed-license-'));
  try {
    await mkdir(join(root, 'baton'), { recursive: true });
    await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@invalid.example',
      'commit', '-q', '--allow-empty', '-m', 'base'], { cwd: root });
    execFileSync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/heads/main'], { cwd: root });
    const path = 'packs/docs-review/files/.github/agents/LICENSE';
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), 'Copyright Author <author@license.example>\nprivate-owner-term\n');
    const termsFile = join(root, 'private-terms.txt');
    await writeFile(termsFile, 'private-owner-term\n');
    const result = await runCli(root, ['validate', '--changed', '--json'], { BATON_DENYLIST_FILE: termsFile });
    assert.equal(result.code, 1);
    assert.ok(JSON.parse(result.stdout).errors.some((error) => error.code === 'E_DENYLIST' && error.file === path));
    execFileSync('git', ['add', path], { cwd: root });
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@invalid.example',
      'commit', '-q', '-m', 'tracked license'], { cwd: root });
    await writeFile(join(root, 'README.md'), '# Clean change\n');
    const unchanged = await runCli(root, ['validate', '--changed', '--json'], { BATON_DENYLIST_FILE: termsFile });
    assert.ok(!JSON.parse(unchanged.stdout).errors.some((error) => error.code === 'E_DENYLIST'), unchanged.stdout);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
