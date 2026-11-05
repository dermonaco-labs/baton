import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { packExtensionIds, prepareSpeckitExtension, sha256 } from '../../src/lib/upstream.mjs';

const posix = process.platform !== 'win32';
const specifyPath = (/** @type {string} */ work) =>
  join(work, 'venv', posix ? 'bin' : 'Scripts', posix ? 'specify' : 'specify.exe');

/** @param {string} dir @returns {Promise<Record<string,string>>} */
async function snapshot(dir) {
  /** @type {Record<string,string>} */
  const files = {};
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    files[relative(dir, path)] = sha256(await readFile(path));
  }
  return files;
}

/** @param {string} work */
async function coreProject(work) {
  const project = join(work, 'project');
  await mkdir(join(project, '.specify', 'scripts', 'bash'), { recursive: true });
  await writeFile(join(project, '.specify', 'extensions.yml'), 'installed: []\n');
  await writeFile(join(project, '.specify', 'scripts', 'bash', 'common.sh'), 'echo core\n');
  return project;
}

/** @param {string} work @param {string} body */
async function fakeSpecify(work, body) {
  const path = specifyPath(work);
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `#!/bin/sh\n${body}\n`);
  await chmod(path, 0o755);
}

test('prepareSpeckitExtension rejects unsupported ids and runs only after the verified core project exists', async () => {
  const work = await mkdtemp(join(tmpdir(), 'baton-ext-guard-'));
  try {
    const project = join(work, 'project');
    assert.throws(() => prepareSpeckitExtension({ work, project, extension: 'gitlab' }),
      { code: 'E_USAGE', message: /Unsupported Spec Kit extension: gitlab/ });
    assert.throws(() => prepareSpeckitExtension({ work, project, extension: 'github' }),
      { code: 'E_UPSTREAM_VERIFY', message: /needs the verified core project first/ });
    await mkdir(join(specifyPath(work), '..'), { recursive: true });
    await writeFile(specifyPath(work), '');
    assert.throws(() => prepareSpeckitExtension({ work, project, extension: 'github' }),
      { code: 'E_UPSTREAM_VERIFY', message: /needs the verified core project first/ });
    await rm(specifyPath(work));
    await coreProject(work);
    assert.throws(() => prepareSpeckitExtension({ work, project, extension: 'github' }),
      { code: 'E_UPSTREAM_VERIFY', message: /needs the verified core project first/ });
    assert.equal(existsSync(join(work, 'project-github')), false);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

test('prepareSpeckitExtension adds the extension to a fresh copy and leaves no tree on failure',
  { skip: posix ? false : 'needs an executable fake specify' }, async () => {
    const work = await mkdtemp(join(tmpdir(), 'baton-ext-run-'));
    try {
      const project = await coreProject(work);
      const before = await snapshot(project);
      const tree = join(work, 'project-github');

      await fakeSpecify(work, 'echo "extension refused" >&2\nexit 3');
      assert.throws(() => prepareSpeckitExtension({ work, project, extension: 'github' }),
        { code: 'E_UPSTREAM_VERIFY', message: /extension add github failed: extension refused/ });
      assert.equal(existsSync(tree), false);
      assert.deepEqual(await snapshot(project), before);

      await fakeSpecify(work, 'exit 0');
      assert.throws(() => prepareSpeckitExtension({ work, project, extension: 'github' }),
        { code: 'E_UPSTREAM_VERIFY', message: /did not install its manifest/ });
      assert.equal(existsSync(tree), false);
      assert.deepEqual(await snapshot(project), before);

      await mkdir(tree, { recursive: true });
      await writeFile(join(tree, 'stale.txt'), 'stale\n');
      await fakeSpecify(work, [
        'printf "%s|%s\\n" "$PWD" "$*" > "$PWD/.specify/args.txt"',
        'mkdir -p .specify/extensions/github',
        'echo "id: github" > .specify/extensions/github/extension.yml',
      ].join('\n'));
      assert.equal(prepareSpeckitExtension({ work, project, extension: 'github' }), tree);
      const [cwd, args] = (await readFile(join(tree, '.specify', 'args.txt'), 'utf8')).trim().split('|');
      assert.equal(args, 'extension add github');
      assert.equal(await readFile(join(cwd, '.specify', 'extensions', 'github', 'extension.yml'), 'utf8'), 'id: github\n');
      assert.equal(existsSync(join(tree, 'stale.txt')), false);
      assert.equal(await readFile(join(tree, '.specify', 'scripts', 'bash', 'common.sh'), 'utf8'), 'echo core\n');
      assert.deepEqual(await snapshot(project), before);
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  });

test('pack extension ids are the sorted distinct extensions routed by the given packs', () => {
  assert.deepEqual(packExtensionIds([]), []);
  assert.deepEqual(packExtensionIds([undefined, { files: [{}] }, {}]), []);
  assert.deepEqual(packExtensionIds([
    { files: [{ extension: 'zeta' }, { extension: 'github' }] },
    { files: [{ extension: 'github' }, {}] },
  ]), ['github', 'zeta']);
});
