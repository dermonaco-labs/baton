import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
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
