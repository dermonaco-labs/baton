import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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

/** @param {string} pack */
async function installedLockPaths(pack) {
  const lock = JSON.parse(await readFile(join(sourceRoot, 'baton.lock.json'), 'utf8'));
  return lock.files.filter(entry => entry.packs.includes(pack)).map(entry => entry.path);
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

test('update from a 1.0.11 issues install replaces the taskstoissues skill in place or reports a conflict', async (t) => {
  const wrapper = '.github/skills/speckit-taskstoissues/SKILL.md';
  const fixture = await readFile(join(sourceRoot, 'test/fixtures/speckit-1.0.11/speckit-taskstoissues/SKILL.md'));
  const extensionPaths = (await installedLockPaths('issues')).filter(path => path !== wrapper);
  assert.equal(extensionPaths.length, 7);
  for (const edited of [false, true]) {
    await t.test(edited ? 'locally edited copy conflicts' : 'unmodified copy is replaced', async () => {
      const { root, cleanup } = await installedRepo(['--packs', 'issues']);
      try {
        const manifestPath = join(root, '.baton/manifest.json');
        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        await writeFile(join(root, wrapper), fixture);
        Object.assign(manifest.files.find(file => file.path === wrapper), { owner: 'speckit', sha256: digest(fixture) });
        for (const path of extensionPaths) await rm(join(root, path));
        manifest.files = manifest.files.filter(file => !extensionPaths.includes(file.path));
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
        const local = Buffer.concat([fixture, Buffer.from('\nLocal adopter note.\n')]);
        if (edited) await writeFile(join(root, wrapper), local);

        const result = await runCli(root, ['update', '--json']);
        const output = JSON.parse(result.stdout || result.stderr);
        assert.ok(!output.warnings.some(({ code, file }) => code === 'W_REMOVED_UPSTREAM' && file === wrapper), result.stdout);
        const after = JSON.parse(await readFile(manifestPath, 'utf8'));
        for (const path of extensionPaths) {
          assert.ok(await exists(root, path), path);
          assert.equal(after.files.find(file => file.path === path)?.owner, 'speckit', path);
        }
        const issuesRows = after.files.filter(file => file.pack === 'issues').map(file => file.path).sort();
        assert.deepEqual(issuesRows, [...await installedLockPaths('issues'), wrapper].sort(), 'no orphan or missing issues rows');
        assert.equal(new Set(after.files.map(file => file.path)).size, after.files.length, 'no duplicate rows');
        const source = await readFile(join(sourceRoot, 'baton/skills/speckit-taskstoissues/SKILL.md'));
        if (edited) {
          assert.equal(result.code, 4, result.stdout || result.stderr);
          assert.deepEqual(output.data.conflicts.map(({ path }) => path), [wrapper]);
          assert.deepEqual(await readFile(join(root, wrapper)), local);
          assert.deepEqual(await readFile(join(root, `.baton/conflicts/${wrapper}.new`)), source);
        } else {
          assert.equal(result.code, 0, result.stdout || result.stderr);
          assert.deepEqual(output.data.conflicts, []);
          assert.deepEqual(await readFile(join(root, wrapper)), source);
          const row = after.files.find(file => file.path === wrapper);
          assert.equal(row.owner, 'baton');
          assert.equal(row.sha256, digest(source));
        }
      } finally { await cleanup(); }
    });
  }
});

test('F99 core.autocrlf checkout keeps CRLF issues files owned through doctor, update and uninstall', async () => {
  const installed = await installedRepo(['--packs', 'issues']);
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
    // `.github/skills/** text eol=lf` keeps both skills LF; the unpinned extension files check out as CRLF.
    const skills = ['.github/skills/speckit-taskstoissues/SKILL.md', '.github/skills/speckit-github-taskstoissues/SKILL.md'];
    const crlf = ['.specify/extensions/github/extension.yml', '.specify/extensions/github/commands/speckit.github.taskstoissues.md'];
    const paths = [...skills, ...crlf];
    for (const path of skills) {
      assert.doesNotMatch(await readFile(join(root, path), 'utf8'), /\r\n/, `${path} must stay LF`);
    }
    for (const path of crlf) {
      assert.match(await readFile(join(root, path), 'utf8'), /\r\n/, `${path} must check out as CRLF`);
    }
    const doctor = await runCli(root, ['doctor', '--json']);
    assert.equal(doctor.code, 0, doctor.stdout || doctor.stderr);
    assert.ok(!JSON.parse(doctor.stdout).warnings.some(({ code, file }) =>
      ['W_MANIFEST_INTEGRITY', 'W_AGENT_CORRUPTED'].includes(code) && paths.includes(file)), doctor.stdout);
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
    const { root, cleanup } = await installedRepo(['--packs', 'issues']);
    const issuesSkill = '.github/skills/speckit-github-taskstoissues/SKILL.md';
    const issuesScript = `.specify/extensions/github/scripts/${script === 'ps' ?
      'powershell/resolve-tasks.ps1' : 'python/resolve_tasks.py'}`;
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
          (_, name) => `.specify/scripts/${directory}/${name}.${extension}`)
          .replaceAll('.specify/extensions/github/scripts/bash/resolve-tasks.sh', issuesScript);
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
      const flavouredSkill = await readFile(join(root, issuesSkill), 'utf8');
      assert.ok(flavouredSkill.includes(issuesScript), 'update must flavour the issues-pack skill');
      assert.ok(!flavouredSkill.includes('.specify/extensions/github/scripts/bash/'));
      assert.ok(await exists(root, issuesScript));

      const fallback = await runCli(root, ['update', '--json'], { UV_OFFLINE: '1', UV_NO_CACHE: '1' });
      assert.equal(fallback.code, 0, fallback.stdout + fallback.stderr);
      assert.match(fallback.stdout, /W_SCRIPT_UNREFRESHED/, 'unavailable upstream must preserve the installed flavour');
      const preserved = JSON.parse(await readFile(join(root, manifestPath), 'utf8'));
      assert.equal(preserved.script, script);
      await assertScriptReferencesExist(root, preserved);
      assert.equal(await readFile(join(root, issuesSkill), 'utf8'), flavouredSkill,
        'fallback must not replace the flavoured issues-pack skill with bash bytes');
      assert.equal(preserved.files.find(file => file.path === issuesSkill)?.sha256,
        digest(flavouredSkill), 'manifest must keep tracking the preserved issues-pack skill');
    } finally { await cleanup(); }
  });
}

/**
 * An issues install switched to `script` without generating its payload; `UV_OFFLINE` then forces the sh fallback.
 * @param {string} script
 */
async function fallbackRepo(script) {
  const repo = await installedRepo(['--packs', 'issues']);
  const manifestPath = join(repo.root, '.baton/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (const [path, edit] of [
    ['.specify/init-options.json', content => { content.script = script; }],
    ['.specify/integration.json', content => { content.integration_settings.copilot.script = script; }],
  ]) {
    const content = JSON.parse(await readFile(join(repo.root, path), 'utf8'));
    edit(content);
    const bytes = JSON.stringify(content, null, 2) + '\n';
    await writeFile(join(repo.root, path), bytes);
    manifest.files.find(file => file.path === path).sha256 = digest(bytes);
  }
  manifest.script = script;
  return { ...repo, manifest, manifestPath };
}

const offline = { UV_OFFLINE: '1', UV_NO_CACHE: '1' };

for (const script of ['ps', 'py']) {
  test(`F11 ${script} fallback keeps a 1.0.11 taskstoissues skill whose delegate cannot be generated`, async () => {
    const wrapper = '.github/skills/speckit-taskstoissues/SKILL.md';
    const delegate = '.github/skills/speckit-github-taskstoissues/SKILL.md';
    const legacy = (await readFile(join(sourceRoot, 'test/fixtures/speckit-1.0.11/speckit-taskstoissues/SKILL.md'), 'utf8'))
      .replace(/\.specify\/scripts\/bash\/([\w.-]+)\.sh\b/g, (_, name) =>
        script === 'ps' ? `.specify/scripts/powershell/${name}.ps1` : `.specify/scripts/python/${name}.py`);
    const extensionPaths = (await installedLockPaths('issues')).filter(path => path !== wrapper);
    const { root, cleanup, manifest, manifestPath } = await fallbackRepo(script);
    try {
      await writeFile(join(root, wrapper), legacy);
      const legacyRow = Object.assign(manifest.files.find(file => file.path === wrapper),
        { owner: 'speckit', sha256: digest(legacy) });
      for (const path of extensionPaths) await rm(join(root, path));
      manifest.files = manifest.files.filter(file => !extensionPaths.includes(file.path));
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

      const result = await runCli(root, ['update', '--json'], offline);
      assert.equal(result.code, 0, result.stdout + result.stderr);
      const output = JSON.parse(result.stdout);
      assert.ok(output.warnings.some(({ code, file, message }) => code === 'W_SCRIPT_UNREFRESHED' &&
        file === wrapper && message.includes(delegate)), result.stdout);
      assert.equal(await readFile(join(root, wrapper), 'utf8'), legacy, 'the working legacy skill must be preserved');
      assert.equal(await exists(root, delegate), false);
      assert.equal(await exists(root, `.baton/conflicts/${wrapper}.new`), false);
      const after = JSON.parse(await readFile(manifestPath, 'utf8'));
      assert.deepEqual(after.files.find(file => file.path === wrapper), legacyRow,
        'the legacy row stays so the next online update replaces the skill');
      assert.equal(after.files.some(file => file.path === delegate), false);
    } finally { await cleanup(); }
  });

  test(`${script} fallback refreshes the Baton CLI with its hash and Spec Kit script payload files`, async () => {
    const cli = '.baton/bin/baton.mjs';
    const extensionScript = '.specify/extensions/github/scripts/bash/resolve-tasks.sh';
    const { root, cleanup, manifest, manifestPath } = await fallbackRepo(script);
    try {
      const source = {
        cli: await readFile(join(sourceRoot, cli)),
        extensionScript: await readFile(join(root, extensionScript)),
      };
      assert.match(source.cli.toString('utf8'), /\.specify\/scripts\/bash\//, 'the bundle must contain a bash script path');
      assert.match(source.extensionScript.toString('utf8'), /\.specify\/extensions\/github\/scripts\/bash\//,
        'the extension script must reference its own bash directory');
      for (const [path, bytes] of [[cli, '// older Baton CLI\n'], [extensionScript, '#!/usr/bin/env bash\n# older\n']]) {
        await writeFile(join(root, path), bytes);
        manifest.files.find(file => file.path === path).sha256 = digest(bytes);
      }
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

      const result = await runCli(root, ['update', '--json'], offline);
      assert.equal(result.code, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /W_SCRIPT_UNREFRESHED/);
      const after = JSON.parse(await readFile(manifestPath, 'utf8'));
      const installedCli = await readFile(join(root, cli));
      assert.deepEqual(installedCli, source.cli, 'the Baton CLI is Baton-owned and must be refreshed');
      const recorded = (await readFile(join(root, `${cli}.sha256`), 'utf8')).trim().split(/\s+/)[0];
      assert.equal(recorded, createHash('sha256').update(installedCli).digest('hex'), 'CLI and its hash file must agree');
      assert.equal(after.files.find(file => file.path === cli)?.sha256, digest(installedCli));
      assert.deepEqual(await readFile(join(root, extensionScript)), source.extensionScript,
        'script payload files are refreshed even though they name bash script paths');
      assert.equal(after.files.find(file => file.path === extensionScript)?.sha256, digest(source.extensionScript));
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
    assert.equal(manifest.baton_version, '0.1.4');
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
