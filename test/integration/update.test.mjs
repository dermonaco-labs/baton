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

const scriptReference = /\.specify\/scripts\/[\w-]+\/[\w.-]+\.(?:sh|ps1|py)\b/g;

async function assertScriptReferencesExist(root, manifest) {
  for (const { path } of manifest.files) {
    const content = await readFile(join(root, path), 'utf8');
    for (const [reference] of content.matchAll(scriptReference)) {
      assert.ok(await exists(root, reference), `${path} references missing script ${reference}`);
    }
  }
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

test('update preserves adopter gitattributes lines outside the Baton marker', async () => {
  const { root, cleanup } = await installedRepo();
  try {
    const path = join(root, '.gitattributes');
    await writeFile(path, '*.custom binary\n' + await readFile(path, 'utf8') + '*.local -text\n');
    const result = await runCli(root, ['update', '--json']);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    const attributes = await readFile(path, 'utf8');
    assert.match(attributes, /^\*\.custom binary\n/);
    assert.match(attributes, /\*\.local -text\n$/);
    assert.equal((attributes.match(/# BATON:START/g) ?? []).length, 1);
  } finally { await cleanup(); }
});

test('F101 update merges missing attributes once, including dry-run', async () => {
  const { root, cleanup } = await installedRepo();
  try {
    await writeFile(join(root, '.gitattributes'), '*.custom binary\n');
    const preview = await runCli(root, ['update', '--dry-run', '--json']);
    assert.equal(preview.code, 0, preview.stdout || preview.stderr);
    assert.equal(JSON.parse(preview.stdout).data.actions.filter(action => action === 'merge .gitattributes').length, 1);
    const applied = await runCli(root, ['update', '--json']);
    assert.equal(applied.code, 0, applied.stdout || applied.stderr);
    assert.equal(JSON.parse(applied.stdout).data.actions.filter(action => action === 'merge .gitattributes').length, 1);
  } finally { await cleanup(); }
});

test('F114 update preflights conflicting attributes before writing owned files', async () => {
  const { root, cleanup } = await installedRepo();
  try {
    const path = '.github/agents/correctness-reviewer.agent.md';
    const managed = join(root, path);
    const manifestPath = join(root, '.baton/manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const old = 'previous owned content\n';
    await writeFile(managed, old);
    manifest.files.find(entry => entry.path === path).sha256 = digest(old);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    await writeFile(join(root, '.gitattributes'), '# BATON:START\n');
    const before = await readFile(manifestPath);
    const result = await runCli(root, ['update', '--json']);
    assert.equal(result.code, 4, result.stdout || result.stderr);
    assert.match(result.stdout + result.stderr, /E_CONFLICT.*gitattributes|Unbalanced BATON marker/);
    assert.equal(await readFile(managed, 'utf8'), old);
    assert.deepEqual(await readFile(manifestPath), before);
  } finally { await cleanup(); }
});

test('F99 core.autocrlf checkout keeps CRLF managed files owned through doctor, update and uninstall', async () => {
  const installed = await installedRepo();
  const clone = await tempRepo();
  try {
    const { execFileSync } = await import('node:child_process');
    execFileSync('git', ['init', '-q'], { cwd: installed.root });
    execFileSync('git', ['add', '-A'], { cwd: installed.root });
    execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
      'commit', '-qm', 'installed files'], { cwd: installed.root });
    await rm(clone.root, { recursive: true, force: true });
    execFileSync('git', ['clone', '-q', '-c', 'core.autocrlf=true', installed.root, clone.root], { cwd: installed.root });
    const root = clone.root;
    const paths = ['.github/agents/correctness-reviewer.agent.md', '.specify/extensions.yml'];
    for (const path of paths) {
      assert.match(await readFile(join(root, path), 'utf8'), /\r\n/, `${path} must check out as CRLF`);
    }
    const doctor = await runCli(root, ['doctor', '--json']);
    assert.equal(doctor.code, 0, doctor.stdout || doctor.stderr);
    assert.ok(!JSON.parse(doctor.stdout).warnings.some(({ code, file }) =>
      code === 'W_MANIFEST_INTEGRITY' && paths.includes(file)), doctor.stdout);
    assert.ok(!JSON.parse(doctor.stdout).warnings.some(({ code, file }) =>
      code === 'W_AGENT_CORRUPTED' && paths.includes(file)), doctor.stdout);
    const models = await runCli(root, ['models', 'apply', '--force', '--dry-run', '--json']);
    assert.equal(models.code, 0, models.stdout || models.stderr);
    const update = await runCli(root, ['update', '--dry-run', '--json']);
    assert.equal(update.code, 0, update.stdout || update.stderr);
    assert.ok(!JSON.parse(update.stdout).data.conflicts.some(({ path }) => paths.includes(path)), update.stdout);
    const uninstall = await runCli(root, ['uninstall', '--json']);
    assert.equal(uninstall.code, 0, uninstall.stdout || uninstall.stderr);
    for (const path of paths) assert.equal(await exists(root, path), false, `${path} should be removed`);
  } finally {
    await clone.cleanup();
    await installed.cleanup();
  }
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
      const directory = script === 'ps' ? 'powershell' : 'python';
      const extension = script === 'ps' ? 'ps1' : 'py';
      const selected = `.specify/scripts/${directory}/common.${extension}`;
      const contents = `${script} script retained\n`;
      await put(root, selected, contents);
      manifest.files.push({ path: selected, sha256: digest(contents), pack: 'core', owner: 'speckit', managed: true });
      const references = new Set();
      for (const file of manifest.files) {
        const original = await readFile(join(root, file.path), 'utf8');
        const flavoured = original.replace(/\.specify\/scripts\/bash\/([\w.-]+)\.sh\b/g,
          (_, name) => `.specify/scripts/${directory}/${name}.${extension}`);
        if (flavoured === original) continue;
        await writeFile(join(root, file.path), flavoured);
        file.sha256 = digest(flavoured);
        for (const [reference] of flavoured.matchAll(scriptReference)) references.add(reference);
      }
      assert.ok(references.size > 0, 'fixture must include flavour-specific script calls');
      for (const reference of references) {
        if (reference !== selected) {
          const bytes = `${script} script retained: ${reference}\n`;
          await put(root, reference, bytes);
          manifest.files.push({ path: reference, sha256: digest(bytes), pack: 'core', owner: 'speckit', managed: true });
        }
      }
      manifest.script = script;
      await writeFile(join(root, manifestPath), JSON.stringify(manifest, null, 2) + '\n');
      await assertScriptReferencesExist(root, manifest);

      const result = await runCli(root, ['update', '--json']);
      assert.equal(result.code, 0, result.stdout + result.stderr);
      assert.equal(JSON.parse(await readFile(join(root, optionsPath), 'utf8')).script, script);
      assert.equal(JSON.parse(await readFile(join(root, integrationPath), 'utf8')).integration_settings.copilot.script, script);
      assert.ok(await exists(root, selected), `${script} script must remain installed`);
      assert.equal(await exists(root, `.baton/conflicts/${selected}.new`), false);
      const updated = JSON.parse(await readFile(join(root, manifestPath), 'utf8'));
      assert.equal(updated.script, script);
      assert.equal(updated.files.find(file => file.path === selected)?.sha256,
        digest(await readFile(join(root, selected))), 'manifest must track the selected script');
      await assertScriptReferencesExist(root, updated);
      const skillReferences = [];
      for (const { path } of updated.files.filter(file => file.path.startsWith('.github/skills/speckit-'))) {
        skillReferences.push(...Array.from(
          (await readFile(join(root, path), 'utf8')).matchAll(scriptReference),
          ([reference]) => reference
        ));
      }
      assert.ok(skillReferences.length > 0, 'updated Spec Kit skills must call scripts');
      assert.ok(skillReferences.every(reference => reference.startsWith(`.specify/scripts/${directory}/`)),
        'update must keep every Spec Kit skill on the selected script flavour');

      const fallback = await runCli(root, ['update', '--json'], { UV_OFFLINE: '1', UV_NO_CACHE: '1' });
      assert.equal(fallback.code, 0, fallback.stdout + fallback.stderr);
      assert.match(fallback.stdout, /W_SCRIPT_UNREFRESHED/, 'unavailable upstream must preserve the installed flavour');
      const preserved = JSON.parse(await readFile(join(root, manifestPath), 'utf8'));
      assert.equal(preserved.script, script);
      await assertScriptReferencesExist(root, preserved);
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
    assert.equal(manifest.baton_version, '0.1.2');
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
