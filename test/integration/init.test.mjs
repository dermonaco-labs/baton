import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import YAML from 'yaml';
import { sourceRoot, tempRepo } from '../helpers/index.mjs';
import { makeBroken } from '../fixtures/make-broken.mjs';
import { removeMarker } from '../../src/lib/markers.mjs';
import { callsBashScripts, flavouredBytes } from '../../src/commands/init.mjs';

/** @param {string} root @param {string[]} args @param {Record<string,string>} [env] */
async function cli(root, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(sourceRoot, 'src/cli.mjs'), '--cwd', root, ...args, '--json'], {
      cwd: root, env: { ...process.env, ...env }, windowsHide: true,
    });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr, result: JSON.parse(stdout || stderr) }));
  });
}

/** @param {string} root @param {string} path */
async function exists(root, path) {
  try { await stat(join(root, path)); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

/** @param {string} root @param {string} path @param {string} text */
async function put(root, path, text) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), text);
}

/** @param {string} root */
async function files(root) {
  const output = [];
  /** @param {string} relative */
  async function visit(relative) {
    for (const item of await readdir(join(root, relative), { withFileTypes: true })) {
      const path = [relative, item.name].filter(Boolean).join('/');
      if (item.isDirectory()) await visit(path);
      else output.push(path);
    }
  }
  await visit('');
  return output;
}

test('init installs the locked core file set and is byte-for-byte idempotent', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    const preview = await cli(root, ['init', '--dry-run']);
    assert.equal(preview.code, 0, preview.stderr);
    assert.deepEqual(await files(root), ['.gitkeep']);
    const first = await cli(root, ['init']);
    assert.equal(first.code, 0, first.stderr);
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    const attributes = await readFile(join(root, '.gitattributes'), 'utf8');
    assert.match(attributes, /# BATON:START\n\.baton\/\*\* text eol=lf/);
    assert.match(attributes, /specs\/\*\*\/handoff\.md text eol=lf/);
    assert.equal(manifest.source, 'init');
    assert.deepEqual(manifest.packs, ['core']);
    const lock = JSON.parse(await readFile(join(sourceRoot, 'baton.lock.json'), 'utf8'));
    for (const entry of lock.files.filter(entry => entry.packs.includes('core'))) {
      assert.equal(await readFile(join(root, entry.path), 'utf8'),
        await readFile(join(sourceRoot, entry.stored_at), 'utf8'), entry.path);
      assert.ok(manifest.files.some(file => file.path === entry.path), entry.path);
    }
    for (const path of (await readFile(join(sourceRoot, 'test/fixtures/expected/empty.txt'), 'utf8')).trim().split(/\r?\n/)) {
      assert.ok(await exists(root, path), path);
    }
    const before = await Promise.all((await files(root)).map(async path => [path, await readFile(join(root, path))]));
    const again = await cli(root, ['init']);
    assert.equal(again.code, 0, again.stderr);
    const after = await Promise.all((await files(root)).map(async path => [path, await readFile(join(root, path))]));
    assert.deepEqual(after, before, 'second init must not change any bytes or timestamps stored in files');
  } finally { await cleanup(); }
});

test('init marker-merges LF attributes without replacing adopter rules', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    await writeFile(join(root, '.gitattributes'), '*.custom binary\r\n');
    const first = await cli(root, ['init']);
    assert.equal(first.code, 0, first.stdout);
    const attributes = await readFile(join(root, '.gitattributes'), 'utf8');
    assert.match(attributes, /^\*\.custom binary\r\n/);
    assert.match(attributes, /# BATON:START[\s\S]*# BATON:END/);
    assert.equal((await cli(root, ['init'])).code, 0);
    assert.equal(await readFile(join(root, '.gitattributes'), 'utf8'), attributes);
  } finally { await cleanup(); }
});

test('init preserves project instructions, Spec Kit data, and reports unmanaged conflicts', async () => {
  const { root, cleanup } = await tempRepo('repos/has-instructions');
  try {
    const original = await readFile(join(root, '.github/copilot-instructions.md'));
    const constitution = await readFile(join(root, '.specify/memory/constitution.md'));
    const feature = await readFile(join(root, '.specify/feature.json'));
    const spec = await readFile(join(root, 'specs/002-project/spec.md'));
    await put(root, '.github/skills/speckit-plan/SKILL.md', 'project version\n');
    const result = await cli(root, ['init']);
    assert.equal(result.code, 4, result.stdout);
    assert.equal(await readFile(join(root, '.github/skills/speckit-plan/SKILL.md'), 'utf8'), 'project version\n');
    assert.ok(await exists(root, '.baton/conflicts/.github/skills/speckit-plan/SKILL.md.new'));
    assert.ok(JSON.parse(await readFile(join(root, '.baton/conflicts/report.json'), 'utf8')).conflicts.length);
    const instructions = await readFile(join(root, '.github/copilot-instructions.md'), 'utf8');
    assert.equal(removeMarker(instructions, 'BATON'), original.toString());
    assert.match(instructions, /<!-- BATON:START -->/);
    assert.match(instructions, /Project-owned suffix\./);
    assert.deepEqual(await readFile(join(root, '.specify/memory/constitution.md')), constitution);
    assert.deepEqual(await readFile(join(root, '.specify/feature.json')), feature);
    assert.deepEqual(await readFile(join(root, 'specs/002-project/spec.md')), spec);
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.ok(!manifest.files.some(file => file.path === '.github/skills/speckit-plan/SKILL.md'));
    for (const path of (await readFile(join(sourceRoot, 'test/fixtures/expected/has-instructions.txt'), 'utf8')).trim().split(/\r?\n/)) {
      assert.ok(await exists(root, path), path);
    }
    const kept = await cli(root, ['init', '--keep', '.github/skills/speckit-plan/*']);
    assert.equal(kept.code, 0, kept.stdout);
    assert.equal(await readFile(join(root, '.github/skills/speckit-plan/SKILL.md'), 'utf8'), 'project version\n');
    assert.ok(!await exists(root, '.baton/conflicts/.github/skills/speckit-plan/SKILL.md.new'));
    const adopted = await cli(root, ['init', '--adopt-upstream', '.github/skills/speckit-plan/*']);
    assert.equal(adopted.code, 0, adopted.stdout);
    assert.notEqual(await readFile(join(root, '.github/skills/speckit-plan/SKILL.md'), 'utf8'), 'project version\n');
  } finally { await cleanup(); }
});

test('init --repair only replaces the exact known newline-loss agents', async () => {
  const { root, cleanup } = await tempRepo('repos/atv-263-broken');
  try {
    await makeBroken(root);
    const result = await cli(root, ['init']);
    assert.equal(result.code, 4, result.stdout);
    assert.match(JSON.stringify(result.result), /repairable/);
    for (const path of (await readFile(join(sourceRoot, 'test/fixtures/expected/atv-263-broken.txt'), 'utf8')).trim().split(/\r?\n/)) {
      assert.ok(await exists(root, path), path);
    }
    const fixed = await cli(root, ['init', '--repair']);
    assert.equal(fixed.code, 0, fixed.stdout);
    assert.match(await readFile(join(root, '.github/agents/correctness-reviewer.agent.md'), 'utf8'), /^---\n/);
    await put(root, '.github/agents/testing-reviewer.agent.md', 'arbitrary user text\n');
    const refused = await cli(root, ['init', '--repair']);
    assert.equal(refused.code, 4);
    assert.equal(await readFile(join(root, '.github/agents/testing-reviewer.agent.md'), 'utf8'), 'arbitrary user text\n');
  } finally { await cleanup(); }
});

test('init installs core plus learning and merges existing Copilot hooks by command', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    const hooks = { version: 1, hooks: { sessionStart: [
      { type: 'command', bash: 'echo local' },
      { type: 'command', bash: 'node .github/hooks/scripts/observe.js sessionStart 2>/dev/null || true', powershell: 'existing', timeoutSec: 5 },
    ] } };
    await put(root, '.github/hooks/copilot-hooks.json', JSON.stringify(hooks, null, 2) + '\n');
    const result = await cli(root, ['init', '--packs', 'core,learning']);
    assert.equal(result.code, 0, result.stdout);
    const merged = JSON.parse(await readFile(join(root, '.github/hooks/copilot-hooks.json'), 'utf8'));
    assert.deepEqual(merged.hooks.sessionStart, hooks.hooks.sessionStart);
    assert.equal(merged.hooks.sessionEnd.length, 1);
    assert.ok(await exists(root, '.github/skills/observe/SKILL.md'));
    assert.deepEqual(JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8')).packs, ['core', 'learning']);
    const again = await cli(root, ['init', '--packs', 'learning']);
    assert.equal(again.code, 0, again.stdout);
    assert.deepEqual(JSON.parse(await readFile(join(root, '.github/hooks/copilot-hooks.json'), 'utf8')), merged);
  } finally { await cleanup(); }
});

test('uninstall removes only unchanged managed files and BATON marker; preserves project data', async () => {
  const { root, cleanup } = await tempRepo('repos/has-instructions');
  try {
    assert.equal((await cli(root, ['init'])).code, 0);
    const altered = '.github/agents/testing-reviewer.agent.md';
    await put(root, altered, 'project override\n');
    const dry = await cli(root, ['uninstall', '--dry-run']);
    assert.equal(dry.code, 0, dry.stdout);
    assert.ok(await exists(root, '.baton/bin/baton.mjs'));
    const removed = await cli(root, ['uninstall']);
    assert.equal(removed.code, 0, removed.stdout);
    assert.ok(!await exists(root, '.baton/bin/baton.mjs'));
    assert.equal(await readFile(join(root, altered), 'utf8'), 'project override\n');
    assert.equal((await readFile(join(root, '.specify/memory/constitution.md'), 'utf8')).includes('Project constitution'), true);
    assert.ok(await exists(root, 'specs/002-project/spec.md'));
    assert.doesNotMatch(await readFile(join(root, '.github/copilot-instructions.md'), 'utf8'), /BATON:START/);
    assert.match(await readFile(join(root, '.github/copilot-instructions.md'), 'utf8'), /Project-owned preface/);
    assert.equal((await cli(root, ['uninstall'])).code, 0);
  } finally { await cleanup(); }
});

test('standalone payload without --from and missing uv for --script ps fail with prerequisite guidance', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    const noPayload = await cli(root, ['init', '--from', join(root, 'absent.tar.gz')]);
    assert.equal(noPayload.code, 5, noPayload.stdout);
    assert.match(noPayload.stdout + noPayload.stderr, /archive|payload/i);
    const badScript = await cli(root, ['init', '--script', 'invalid']);
    assert.equal(badScript.code, 2, badScript.stdout);
    const noUv = await cli(root, ['init', '--script', 'ps'], { PATH: '', Path: '' });
    assert.equal(noUv.code, 5, noUv.stdout + noUv.stderr);
    assert.match(noUv.stdout + noUv.stderr, /uv/);
    assert.ok(!await exists(root, '.baton/manifest.json'));
  } finally { await cleanup(); }
});

test('init merges Spec Kit extension hooks without changing pre-existing hook entries', async () => {
  const { root, cleanup } = await tempRepo('repos/has-instructions');
  try {
    const custom = 'installed:\n- custom\nhooks:\n  before_specify:\n  - extension: custom\n    command: custom.before\n    optional: true\n';
    await put(root, '.specify/extensions.yml', custom);
    const result = await cli(root, ['init']);
    assert.equal(result.code, 0, result.stdout);
    const merged = await readFile(join(root, '.specify/extensions.yml'), 'utf8');
    assert.match(merged, /command: custom\.before/);
    assert.match(merged, /command: speckit\.baton\.receive/);
    const again = await cli(root, ['init']);
    assert.equal(again.code, 0, again.stdout);
    assert.equal(await readFile(join(root, '.specify/extensions.yml'), 'utf8'), merged);
  } finally { await cleanup(); }
});

test('init refuses a changed BATON marker and uninstall keeps it', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    assert.equal((await cli(root, ['init'])).code, 0);
    const path = '.github/copilot-instructions.md';
    const modified = (await readFile(join(root, path), 'utf8')).replace('# Baton relay', '# Locally edited relay');
    await put(root, path, modified);
    const result = await cli(root, ['init']);
    assert.equal(result.code, 4, result.stdout);
    assert.equal(await readFile(join(root, path), 'utf8'), modified);
    assert.ok(await exists(root, `.baton/conflicts/${path}.new`));
    const removed = await cli(root, ['uninstall']);
    assert.equal(removed.code, 0, removed.stdout);
    assert.equal(await readFile(join(root, path), 'utf8'), modified);
  } finally { await cleanup(); }
});

test('update resolves the adjacent payload or explains a missing standalone archive', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    const missing = await cli(root, ['update', '--from', join(root, 'missing.tar.gz')]);
    assert.equal(missing.code, 5, missing.stdout + missing.stderr);
    assert.match(missing.stdout + missing.stderr, /archive|payload/i);
    const available = await cli(root, ['update']);
    assert.equal(available.code, 5);
    assert.match(available.stdout + available.stderr, /manifest/);
  } finally { await cleanup(); }
});

test('init adds ignore rules without replacing existing project rules', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    await put(root, '.gitignore', 'project-secret/\r\n# project rule\r\n');
    const first = await cli(root, ['init', '--packs', 'learning']);
    assert.equal(first.code, 0, first.stdout);
    const ignore = await readFile(join(root, '.gitignore'), 'utf8');
    assert.ok(ignore.startsWith('project-secret/\r\n# project rule\r\n'));
    assert.match(ignore, /\.baton\/conflicts\//);
    assert.match(ignore, /\.context\//);
    assert.ok(await exists(root, '.atv/.gitignore'));
    assert.equal((await cli(root, ['init', '--packs', 'learning'])).code, 0);
    assert.equal(await readFile(join(root, '.gitignore'), 'utf8'), ignore);
  } finally { await cleanup(); }
});

test('derived install explains how to fetch optional packs with pinned npx', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    await put(root, '.baton/bin/baton.mjs', await readFile(join(sourceRoot, '.baton/bin/baton.mjs')));
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [join(root, '.baton/bin/baton.mjs'), 'init', '--packs', 'learning', '--json'], {
        cwd: root, windowsHide: true,
      });
      let text = '';
      child.stderr.on('data', data => { text += data; });
      child.stdout.on('data', data => { text += data; });
      child.on('error', reject);
      child.on('close', code => resolve({ code, text }));
    });
    assert.equal(result.code, 5, result.text);
    assert.match(result.text, /npx --yes github:dermonaco-labs\/baton#v0\.1\.4 init --packs learning/);
  } finally { await cleanup(); }
});

test('invalid pack and malformed existing hooks give actionable errors without changing user bytes', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    const invalid = await cli(root, ['init', '--packs', 'missing-pack']);
    assert.equal(invalid.code, 1);
    assert.match(invalid.stdout + invalid.stderr, /E_PACK.*missing-pack/);
    await put(root, '.github/hooks/copilot-hooks.json', '{invalid-json');
    const conflict = await cli(root, ['init', '--packs', 'learning']);
    assert.equal(conflict.code, 4, conflict.stdout);
    assert.equal(await readFile(join(root, '.github/hooks/copilot-hooks.json'), 'utf8'), '{invalid-json');
    assert.ok(await exists(root, '.baton/conflicts/.github/hooks/copilot-hooks.json.new'));
    assert.ok(JSON.parse(await readFile(join(root, '.baton/conflicts/report.json'), 'utf8')).conflicts
      .some(item => item.path === '.github/hooks/copilot-hooks.json'));
    const adopted = await cli(root, ['init', '--packs', 'learning', '--adopt-upstream', '.github/hooks/copilot-hooks.json']);
    assert.equal(adopted.code, 0, adopted.stdout);
    assert.equal(JSON.parse(await readFile(join(root, '.github/hooks/copilot-hooks.json'), 'utf8')).version, 1);
  } finally { await cleanup(); }
});

test('disabled Baton hooks in an existing Spec Kit install are conflicts, not silent success', async () => {
  const { root, cleanup } = await tempRepo('repos/has-instructions');
  try {
    const existing = 'installed:\n- baton\nhooks:\n  before_specify:\n  - extension: baton\n    command: speckit.baton.receive\n    enabled: false\n    optional: true\n';
    await put(root, '.specify/extensions.yml', existing);
    const result = await cli(root, ['init']);
    assert.equal(result.code, 4, result.stdout);
    assert.equal(await readFile(join(root, '.specify/extensions.yml'), 'utf8'), existing);
    assert.ok(await exists(root, '.baton/conflicts/.specify/extensions.yml.new'));
    const adopted = await cli(root, ['init', '--adopt-upstream', '.specify/extensions.yml']);
    assert.equal(adopted.code, 0, adopted.stdout);
    assert.match(await readFile(join(root, '.specify/extensions.yml'), 'utf8'), /optional: false/);
  } finally { await cleanup(); }
});

const scriptReference = /\.specify\/(?:extensions\/[\w-]+\/)?scripts\/[\w-]+\/[\w.-]+\.(?:sh|ps1|py)\b/g;

test('F39 flavour-dependent Spec Kit payload comes from the generated project', async () => {
  const { root: project, cleanup } = await tempRepo();
  try {
    const path = '.github/skills/speckit-plan/SKILL.md';
    const locked = Buffer.from('Run `.specify/scripts/bash/setup-plan.sh --json`.\n');
    const generated = 'Run `.specify/scripts/powershell/setup-plan.ps1 -Json`.\n';
    await put(project, path, generated);
    assert.equal((await flavouredBytes(project, path, locked)).toString(), generated);
    const neutral = Buffer.from('No script reference.\n');
    assert.equal(await flavouredBytes(project, path, neutral), neutral);
    assert.equal(await flavouredBytes(project, '.github/skills/absent/SKILL.md', locked), locked);
    const extensionPath = '.github/skills/speckit-github-taskstoissues/SKILL.md';
    const extensionLocked = Buffer.from('Run `.specify/extensions/github/scripts/bash/resolve-tasks.sh`.\n');
    const extensionGenerated = 'Run `.specify/extensions/github/scripts/powershell/resolve-tasks.ps1`.\n';
    await put(project, extensionPath, extensionGenerated);
    assert.equal((await flavouredBytes(project, extensionPath, extensionLocked)).toString(), extensionGenerated);
    assert.equal(callsBashScripts(extensionLocked), true);
    assert.equal(callsBashScripts(Buffer.from(extensionGenerated)), false);
    assert.equal(callsBashScripts(Buffer.from('See `.specify/extensions/github/README.md`.\n')), false);
  } finally { await cleanup(); }
});

/** @param {string} root */
async function missingScriptReferences(root) {
  const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
  const missing = [];
  for (const { path } of manifest.files) {
    for (const [reference] of (await readFile(join(root, path), 'utf8')).matchAll(scriptReference)) {
      if (!await exists(root, reference)) missing.push(`${path} -> ${reference}`);
    }
  }
  return { manifest, missing };
}

test('F39 live init --script ps installs every script its Spec Kit skills reference', async (t) => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    const result = await cli(root, ['init', '--script', 'ps']);
    const unavailableOnMirror = result.result.errors?.some(({ code, message }) =>
      code === 'E_PREREQUISITE' && /no version of specify-cli==1\.3\.0\b/i.test(message));
    if (result.code !== 0 && unavailableOnMirror && process.env.GITHUB_ACTIONS !== 'true') {
      t.skip('approved local registry lacks the pinned specify-cli==1.3.0 wheel');
      return;
    }
    assert.equal(result.code, 0, result.stdout + result.stderr);
    const { manifest, missing } = await missingScriptReferences(root);
    assert.equal(manifest.script, 'ps');
    assert.deepEqual(missing, []);
  } finally { await cleanup(); }
});

test('F39 live init --script ps --packs issues installs the github extension scripts its skill references', async (t) => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    const result = await cli(root, ['init', '--script', 'ps', '--packs', 'issues']);
    const unavailableOnMirror = result.result.errors?.some(({ code, message }) =>
      code === 'E_PREREQUISITE' && /no version of specify-cli==1\.3\.0\b/i.test(message));
    if (result.code !== 0 && unavailableOnMirror && process.env.GITHUB_ACTIONS !== 'true') {
      t.skip('approved local registry lacks the pinned specify-cli==1.3.0 wheel');
      return;
    }
    assert.equal(result.code, 0, result.stdout + result.stderr);
    const { manifest, missing } = await missingScriptReferences(root);
    assert.equal(manifest.script, 'ps');
    assert.deepEqual(missing, []);
    const skill = await readFile(join(root, '.github/skills/speckit-github-taskstoissues/SKILL.md'), 'utf8');
    assert.match(skill, /\.specify\/extensions\/github\/scripts\/powershell\/resolve-tasks\.ps1/);
    assert.doesNotMatch(skill, /\.specify\/extensions\/github\/scripts\/bash\/resolve-tasks\.sh/);
  } finally { await cleanup(); }
});

const issuesWrapper = '.github/skills/speckit-taskstoissues/SKILL.md';
const issuesExtensionPaths = [
  '.github/skills/speckit-github-taskstoissues/SKILL.md',
  '.specify/extensions/github/extension.yml',
  '.specify/extensions/github/README.md',
  '.specify/extensions/github/commands/speckit.github.taskstoissues.md',
  '.specify/extensions/github/scripts/bash/resolve-tasks.sh',
  '.specify/extensions/github/scripts/powershell/resolve-tasks.ps1',
  '.specify/extensions/github/scripts/python/resolve_tasks.py',
];

/** @param {string} root */
async function hookRegistries(root) {
  const extensions = YAML.parse(await readFile(join(root, '.specify/extensions.yml'), 'utf8'));
  const registry = JSON.parse(await readFile(join(root, '.specify/extensions/.registry'), 'utf8'));
  return { extensions, registry };
}

test('core-only install on Spec Kit 1.3.0 ships no issue-creation files and no github extension', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    const result = await cli(root, ['init']);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    for (const path of ['.github/skills/speckit-taskstoissues', '.github/skills/speckit-github-taskstoissues',
      '.specify/extensions/github']) {
      assert.equal(await exists(root, path), false, path);
    }
    const { extensions, registry } = await hookRegistries(root);
    assert.ok(!(extensions.installed ?? []).includes('github'));
    assert.ok(!Object.values(extensions.hooks ?? {}).flat().some(hook => hook?.extension === 'github'));
    assert.ok(!Object.hasOwn(registry.extensions ?? {}, 'github'));
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.ok(!manifest.files.some(file => file.pack === 'issues'));
    const doctor = await cli(root, ['doctor']);
    assert.equal(doctor.code, 0, doctor.stdout + doctor.stderr);
    assert.deepEqual(doctor.result.errors ?? [], []);
  } finally { await cleanup(); }
});

test('issues install ships the alias wrapper and the locked github extension files', async () => {
  const core = await tempRepo('repos/empty');
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    const plain = await cli(core.root, ['init']);
    assert.equal(plain.code, 0, plain.stdout + plain.stderr);
    const result = await cli(root, ['init', '--packs', 'issues']);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    const lock = JSON.parse(await readFile(join(sourceRoot, 'baton.lock.json'), 'utf8'));
    const row = (/** @type {string} */ path) => manifest.files.find(file => file.path === path);
    assert.equal(row(issuesWrapper)?.owner, 'baton');
    assert.equal(row(issuesWrapper)?.pack, 'issues');
    assert.equal(await readFile(join(root, issuesWrapper), 'utf8'),
      await readFile(join(sourceRoot, 'baton/skills/speckit-taskstoissues/SKILL.md'), 'utf8'));
    for (const path of issuesExtensionPaths) {
      assert.equal(row(path)?.owner, 'speckit', path);
      assert.equal(row(path)?.pack, 'issues', path);
      const stored = `packs/issues/files/${path}`;
      const bytes = await readFile(join(root, path));
      assert.deepEqual(bytes, await readFile(join(sourceRoot, stored)), path);
      const locked = lock.files.find((/** @type {any} */ entry) => entry.stored_at === stored);
      assert.equal(locked?.['x-speckit-extension'], 'github', path);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), locked.sha256, path);
    }
    for (const path of ['.specify/extensions.yml', '.specify/extensions/.registry']) {
      assert.deepEqual(await readFile(join(root, path)), await readFile(join(core.root, path)), path);
    }
  } finally {
    await cleanup();
    await core.cleanup();
  }
});
test('optional context packs install pinned inert vendor bytes with their own provenance', async () => {
  const { root, cleanup } = await tempRepo('repos/empty');
  try {
    const lock = JSON.parse(await readFile(join(sourceRoot, 'baton.lock.json'), 'utf8'));
    const core = await cli(root, ['init']);
    assert.equal(core.code, 0, core.stderr);
    assert.ok(!await exists(root, '.baton/vendor'));
    let manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.deepEqual(Object.keys(manifest.upstreams).sort(), ['atv', 'speckit']);
    const pins = { 'token-budget': ['1.1.0', '11c5589'], optimize: ['1.0.0', 'd6dba6a'] };
    for (const [index, id] of ['token-budget', 'optimize'].entries()) {
      const result = await cli(root, ['init', '--packs', id]);
      assert.equal(result.code, 0, result.stderr || result.stdout);
      manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
      assert.deepEqual(manifest.packs, ['core', 'token-budget', 'optimize'].slice(0, index + 2));
      assert.equal(manifest.upstreams[id], `${pins[id][0]}@${pins[id][1]}`);
      assert.deepEqual(lock.upstreams[id], { version: pins[id][0], repo: id === 'optimize'
        ? 'sakitA/spec-kit-optimize' : 'tinesoft/spec-kit-token-budget', tag: `v${pins[id][0]}`,
      commit: id === 'optimize' ? 'd6dba6ae93bf60322deee3bdc4ffcf127e42b2b9' : '11c5589f347ddb3789b51b09927ef825c88e3f19',
      tree: id === 'optimize' ? 'c5bb7b7a37912ef26bc369397980c26c3d70cf7b' : '0188d6c187e1f1ddc03293660cc8e4d129ea0fa5',
      license: 'MIT' });
      const vendored = lock.files.filter(entry => entry.upstream === id);
      assert.equal(vendored.length, id === 'optimize' ? 6 : 13);
      for (const entry of vendored) {
        assert.deepEqual(entry.packs, [id]);
        assert.equal(entry.path, `.baton/vendor/${id}/${entry.upstream_path}`);
        assert.equal(entry.sha256, entry.sha256_upstream);
        assert.equal(entry.repair, null);
        assert.deepEqual(await readFile(join(root, entry.path)), await readFile(join(sourceRoot, entry.stored_at)), entry.path);
        const row = manifest.files.find(file => file.path === entry.path);
        assert.equal(row?.owner, id, entry.path);
        assert.equal(row.pack, id);
        assert.equal(row.sha256, entry.sha256);
      }
      for (const entry of lock.files.filter(entry => entry.packs.includes(id) && entry.upstream === 'baton')) {
        assert.ok(entry.path.startsWith('.github/skills/speckit-'), entry.path);
        assert.equal(manifest.files.find(file => file.path === entry.path)?.owner, 'baton', entry.path);
      }
    }
    assert.ok(!await exists(root, '.specify/extensions/token-budget'));
    assert.ok(!await exists(root, '.specify/extensions/optimize'));
    const extensions = await readFile(join(root, '.specify/extensions.yml'), 'utf8').catch(() => '');
    assert.doesNotMatch(extensions, /token-budget|optimize/);
  } finally { await cleanup(); }
});
