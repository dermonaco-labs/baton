import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, stat, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import YAML from 'yaml';
import { tempRepo, runCli, sourceRoot } from '../helpers/index.mjs';
import { digest } from '../../src/lib/overlay.mjs';

const changed = '.github/agents/correctness-reviewer.agent.md';
const unchanged = '.github/agents/testing-reviewer.agent.md';
const instructions = '.github/copilot-instructions.md';
const section = /<!-- BATON:START -->\r?\n([\s\S]*?)<!-- BATON:END -->/;

async function fixture() {
  const repo = await tempRepo('prev-release');
  const old = await Promise.all([changed, unchanged].map(async path => ({
    path, sha256: digest(await readFile(join(repo.root, path))), pack: 'core', owner: 'atv', managed: true
  })));
  const content = await readFile(join(repo.root, instructions), 'utf8');
  const manifest = {
    schema: 1, baton_version: '0.0.9', installed_at: '2026-01-01T00:00:00Z',
    source: 'init', upstreams: { speckit: '1.0.10@old', atv: 'main@old' },
    packs: ['core'], files: old,
    marker_sections: [{ path: instructions, marker: 'BATON', sha256: digest(section.exec(content)[1]) }]
  };
  await mkdir(join(repo.root, '.baton'), { recursive: true });
  await writeFile(join(repo.root, '.baton/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(join(repo.root, changed), 'local custom reviewer\n');
  return repo;
}

async function exists(root, path) {
  try { await stat(join(root, path)); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function put(root, path, content) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), content);
}

async function installedRepo(args = []) {
  const repo = await tempRepo('repos/empty');
  const result = await runCli(repo.root, ['init', ...args]);
  if (result.code !== 0) {
    await repo.cleanup();
    assert.fail(result.stdout + result.stderr);
  }
  return repo;
}

test('update preserves adopter Spec Kit extensions from a merged install', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  const extensionPath = '.specify/extensions.yml';
  try {
    await put(root, extensionPath, 'installed:\n- custom\nhooks:\n  before_specify:\n  - extension: custom\n    command: custom.before\n    optional: true\n');
    const installed = await runCli(root, ['init']);
    assert.equal(installed.code, 0, installed.stdout + installed.stderr);
    const beforeExtensions = YAML.parse(await readFile(join(root, extensionPath), 'utf8'));
    assert.ok(beforeExtensions.hooks.before_specify.some(entry => entry.command === 'speckit.baton.receive'));
    const beforeManifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.equal(beforeManifest.files.find(file => file.path === extensionPath)?.sha256,
      digest(await readFile(join(root, extensionPath))), 'extension must be a pristine managed merge');

    const result = await runCli(root, ['update', '--json']);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    const extensions = YAML.parse(await readFile(join(root, extensionPath), 'utf8'));
    assert.ok(extensions.installed.includes('custom'));
    assert.ok(extensions.hooks.before_specify.some(entry => entry.command === 'custom.before' && entry.optional === true));
    assert.ok(extensions.hooks.before_specify.some(entry => entry.command === 'speckit.baton.receive' && entry.optional === false));
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.equal(manifest.files.find(file => file.path === extensionPath)?.sha256,
      digest(await readFile(join(root, extensionPath))), 'manifest must track merged extensions');
    assert.equal(await exists(root, `.baton/conflicts/${extensionPath}.new`), false);
  } finally { await cleanup(); }
});

test('update preserves adopter Copilot hooks from a merged learning-pack install', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  const path = '.github/hooks/copilot-hooks.json';
  try {
    const customHook = { type: 'command', bash: 'echo adopter', timeoutSec: 7 };
    await put(root, path, JSON.stringify({ version: 1, hooks: { sessionStart: [customHook] } }, null, 2) + '\n');
    const installed = await runCli(root, ['init', '--packs', 'core,learning']);
    assert.equal(installed.code, 0, installed.stdout + installed.stderr);
    const before = JSON.parse(await readFile(join(root, path), 'utf8'));
    assert.ok(before.hooks.sessionStart.length > 1);
    const previous = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.equal(previous.files.find(file => file.path === path)?.sha256,
      digest(await readFile(join(root, path))), 'hook must be a pristine managed merge');

    const result = await runCli(root, ['update', '--json']);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    const hooks = JSON.parse(await readFile(join(root, path), 'utf8'));
    assert.ok(hooks.hooks.sessionStart.some(entry => entry.bash === customHook.bash && entry.timeoutSec === 7));
    assert.ok(hooks.hooks.sessionStart.some(entry => entry.bash?.includes('observe.js')));
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.equal(manifest.files.find(file => file.path === path)?.sha256,
      digest(await readFile(join(root, path))), 'manifest must track merged hooks');
    assert.equal(await exists(root, `.baton/conflicts/${path}.new`), false);
  } finally { await cleanup(); }
});

test('update does not conflict on a customized constitution', async () => {
  const { root, cleanup } = await installedRepo();
  const path = '.specify/memory/constitution.md';
  try {
    const custom = '# Project constitution\n\nKeep our project rules.\n';
    await writeFile(join(root, path), custom);
    const result = await runCli(root, ['update', '--json']);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.equal(await readFile(join(root, path), 'utf8'), custom);
    assert.equal(await exists(root, `.baton/conflicts/${path}.new`), false);
    assert.equal(await exists(root, '.baton/conflicts/report.json'), false);
  } finally { await cleanup(); }
});

for (const script of ['ps', 'py']) {
  test(`update retains the installed ${script} script flavour`, async () => {
    const { root, cleanup } = await installedRepo();
    try {
      const manifestPath = '.baton/manifest.json';
      const manifest = JSON.parse(await readFile(join(root, manifestPath), 'utf8'));
      const optionsPath = '.specify/init-options.json';
      const integrationPath = '.specify/integration.json';
      const options = JSON.parse(await readFile(join(root, optionsPath), 'utf8'));
      const integration = JSON.parse(await readFile(join(root, integrationPath), 'utf8'));
      options.script = script;
      integration.integration_settings.copilot.script = script;
      for (const [path, content] of [[optionsPath, options], [integrationPath, integration]]) {
        const bytes = JSON.stringify(content, null, 2) + '\n';
        await writeFile(join(root, path), bytes);
        manifest.files.find(file => file.path === path).sha256 = digest(bytes);
      }
      const bash = manifest.files.filter(file => file.path.startsWith('.specify/scripts/bash/'));
      assert.ok(bash.length > 0);
      for (const file of bash) await rm(join(root, file.path));
      manifest.files = manifest.files.filter(file => !bash.includes(file));
      const selected = `.specify/scripts/${script === 'ps' ? 'powershell' : 'python'}/common.${script === 'ps' ? 'ps1' : 'py'}`;
      const contents = `${script} script retained\n`;
      await put(root, selected, contents);
      manifest.files.push({ path: selected, sha256: digest(contents), pack: 'core', owner: 'speckit', managed: true });
      manifest['x-script'] = script;
      await writeFile(join(root, manifestPath), JSON.stringify(manifest, null, 2) + '\n');

      const result = await runCli(root, ['update', '--json']);
      assert.equal(result.code, 0, result.stdout + result.stderr);
      assert.equal(JSON.parse(await readFile(join(root, optionsPath), 'utf8')).script, script);
      assert.equal(JSON.parse(await readFile(join(root, integrationPath), 'utf8')).integration_settings.copilot.script, script);
      assert.ok(await exists(root, selected), `${script} script must remain installed`);
      assert.equal(await exists(root, bash[0].path), false, 'update must not switch back to bash scripts');
      assert.equal(await exists(root, `.baton/conflicts/${selected}.new`), false);
      const updated = JSON.parse(await readFile(join(root, manifestPath), 'utf8'));
      assert.equal(updated['x-script'], script);
      assert.equal(updated.files.find(file => file.path === selected)?.sha256,
        digest(await readFile(join(root, selected))), 'manifest must track the selected script');
    } finally { await cleanup(); }
  });
}

test('update replaces only unmodified managed files and reports changed files with .new copies', async () => {
  const { root, cleanup } = await fixture();
  try {
    const previous = await readFile(join(root, unchanged));
    const result = await runCli(root, ['update', '--json']);
    assert.equal(result.code, 4, result.stdout + result.stderr);
    assert.equal(await readFile(join(root, changed), 'utf8'), 'local custom reviewer\n');
    assert.notDeepEqual(await readFile(join(root, unchanged)), previous);
    assert.deepEqual(await readFile(join(root, unchanged)), await readFile(join(sourceRoot, unchanged)));
    assert.deepEqual(await readFile(join(root, `.baton/conflicts/${changed}.new`)),
      await readFile(join(sourceRoot, changed)));
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.equal(manifest.baton_version, '0.1.0');
    assert.equal(manifest.source, 'init');
    assert.equal(manifest.installed_at, '2026-01-01T00:00:00Z');
    assert.equal(manifest.files.find(file => file.path === changed).sha256,
      digest(await readFile(join(sourceRoot, 'test/fixtures/prev-release', changed))));
    assert.equal(manifest.files.find(file => file.path === unchanged).sha256,
      digest(await readFile(join(sourceRoot, unchanged))));
    assert.match(result.stdout, /user-modified|conflict/i);
  } finally { await cleanup(); }
});

test('update preserves unrelated instruction bytes and only replaces a pristine BATON section', async () => {
  const { root, cleanup } = await fixture();
  try {
    const result = await runCli(root, ['update']);
    assert.equal(result.code, 4, result.stdout + result.stderr);
    const text = await readFile(join(root, instructions), 'utf8');
    assert.match(text, /^Project preface\.\r?\n/);
    assert.match(text, /Project suffix\.\r?\n$/);
    assert.doesNotMatch(text, /Old Baton instructions/);
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.equal(manifest.marker_sections[0].sha256, digest(section.exec(text)[1]));
  } finally { await cleanup(); }
});

test('update preserves edited BATON section and unmanaged destination files', async () => {
  const { root, cleanup } = await fixture();
  try {
    const original = (await readFile(join(root, instructions), 'utf8')).replace('Old Baton instructions.', 'My custom instructions.');
    await writeFile(join(root, instructions), original);
    const unmanaged = '.github/agents/maintainability-reviewer.agent.md';
    await mkdir(dirname(join(root, unmanaged)), { recursive: true });
    await writeFile(join(root, unmanaged), 'My unmanaged agent.\n');
    const result = await runCli(root, ['update', '--json']);
    assert.equal(result.code, 4, result.stdout + result.stderr);
    assert.equal(await readFile(join(root, instructions), 'utf8'), original);
    assert.equal(await readFile(join(root, unmanaged), 'utf8'), 'My unmanaged agent.\n');
    assert.ok(await exists(root, `.baton/conflicts/${instructions}.new`));
    assert.ok(await exists(root, `.baton/conflicts/${unmanaged}.new`));
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    const originalFixture = await readFile(join(sourceRoot, 'test/fixtures/prev-release', instructions), 'utf8');
    assert.equal(manifest.marker_sections[0].sha256, digest(section.exec(originalFixture)[1]));
  } finally { await cleanup(); }
});

test('update --dry-run changes no bytes, including manifest and conflict report', async () => {
  const { root, cleanup } = await fixture();
  try {
    const before = await Promise.all([changed, unchanged, instructions, '.baton/manifest.json']
      .map(async path => readFile(join(root, path))));
    const result = await runCli(root, ['update', '--dry-run']);
    assert.equal(result.code, 4, result.stdout + result.stderr);
    const after = await Promise.all([changed, unchanged, instructions, '.baton/manifest.json']
      .map(async path => readFile(join(root, path))));
    assert.deepEqual(after, before);
    assert.equal(await exists(root, '.baton/conflicts/report.json'), false);
  } finally { await cleanup(); }
});

test('update needs an existing manifest and rejects unknown flags', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    const missing = await runCli(root, ['update', '--json']);
    assert.equal(missing.code, 5, missing.stdout + missing.stderr);
    assert.match(missing.stdout + missing.stderr, /manifest/i);
    const unknown = await runCli(root, ['update', '--bogus']);
    assert.equal(unknown.code, 2);
    const moving = await runCli(root, ['update', '--to', 'latest']);
    assert.equal(moving.code, 2);
  } finally { await cleanup(); }
});
