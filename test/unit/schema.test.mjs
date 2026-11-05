import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import YAML from 'yaml';
import { loadSchemas, validateSchema } from '../../src/lib/schema.mjs';
import { SPECKIT_EXTENSIONS } from '../../src/lib/upstream.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('compiles all draft 2020-12 schemas once', async () => {
  const registry = await loadSchemas(root);
  assert.equal(registry.size, 9);
  assert.equal(await loadSchemas(root), registry);
});

test('findings fixture validates and invalid fixture reports a JSON pointer', async () => {
  const registry = await loadSchemas(root);
  const valid = JSON.parse(await readFile(resolve(root, 'test/fixtures/findings/valid.json'), 'utf8'));
  const invalid = JSON.parse(await readFile(resolve(root, 'test/fixtures/findings/invalid.json'), 'utf8'));
  assert.deepEqual(validateSchema(registry, 'findings', valid), []);
  const errors = validateSchema(registry, 'findings', invalid);
  assert.ok(errors.length > 0);
  assert.ok(errors.every((error) => error.code === 'E_SCHEMA' && error.pointer.startsWith('/')));
});

test('pack schema requires a classified reason for every optional reference', async () => {
  const registry = await loadSchemas(root);
  const pack = {
    schema: 1, id: 'core', description: 'Minimal relay', requires: [], conflicts: [],
    files: [{ from: 'baton', path: '.github/skills/baton/SKILL.md' }],
    optional_refs: [{ ref: 'missing-agent', note: 'not at pin' }],
  };
  assert.ok(validateSchema(registry, 'pack', pack).length);
  pack.optional_refs[0].reason = 'upstream-absent';
  assert.deepEqual(validateSchema(registry, 'pack', pack), []);
  pack.optional_refs[0].reason = 'arbitrary';
  assert.ok(validateSchema(registry, 'pack', pack).length);
});

test('pack schema routes Spec Kit bundled-extension files only through extension github', async () => {
  const registry = await loadSchemas(root);
  const pack = (/** @type {object} */ file) => ({ schema: 1, id: 'issues', description: 'Opt-in issues', requires: ['core'],
    conflicts: [], files: [file] });
  const path = '.specify/extensions/github/extension.yml';
  assert.deepEqual(validateSchema(registry, 'pack', pack({ from: 'speckit', extension: 'github', path })), []);
  for (const file of [
    { from: 'speckit', extension: 'gitlab', path },
    { from: 'baton', extension: 'github', path },
    { from: 'atv', extension: 'github', upstream_path: path, path },
  ]) assert.ok(validateSchema(registry, 'pack', pack(file)).length, JSON.stringify(file));
  for (const name of (await readdir(resolve(root, 'packs'))).filter(file => file.endsWith('.yml') && file !== 'repairs.yml')) {
    const shipped = YAML.parse(await readFile(resolve(root, 'packs', name), 'utf8'));
    assert.deepEqual(validateSchema(registry, 'pack', shipped), [], name);
  }
  const schema = JSON.parse(await readFile(resolve(root, 'baton/schemas/pack.schema.json'), 'utf8'));
  assert.deepEqual(schema.$defs.file.properties.extension.enum, [...SPECKIT_EXTENSIONS],
    'pack schema extension ids must match the bundled Spec Kit extensions sync can prepare');
});

test('pack, lock and manifest schemas accept named optional sources without relaxing old shapes', async () => {
  const registry = await loadSchemas(root);
  const vendor = { from: 'token-budget', upstream_path: 'commands/compact.md',
    path: '.baton/vendor/token-budget/commands/compact.md' };
  const pack = { schema: 1, id: 'token-budget', description: 'Optional context budget', requires: ['core'],
    conflicts: [], files: [vendor, { from: 'baton', path: '.github/skills/speckit-token-budget-compact/SKILL.md' }] };
  assert.deepEqual(validateSchema(registry, 'pack', pack), []);
  const optimize = { ...pack, id: 'optimize', files: [{ from: 'optimize', upstream_path: 'LICENSE',
    path: '.baton/vendor/optimize/LICENSE' }] };
  assert.deepEqual(validateSchema(registry, 'pack', optimize), []);
  for (const file of [
    { from: 'token-budget', path: '.baton/vendor/token-budget/LICENSE' },
    { from: 'token-budget', upstream_path: 'LICENSE', path: '.github/skills/compact/SKILL.md' },
    { from: 'optimize', upstream_path: 'extension.yml', path: '.specify/extensions/optimize/extension.yml' },
    { from: 'optimize', upstream_path: 'LICENSE', path: '.baton/vendor/token-budget/LICENSE' },
    { from: 'unknown', upstream_path: 'LICENSE', path: '.baton/vendor/unknown/LICENSE' },
  ]) assert.ok(validateSchema(registry, 'pack', { ...pack, files: [file] }).length, JSON.stringify(file));

  const lock = JSON.parse(await readFile(resolve(root, 'baton.lock.json'), 'utf8'));
  const legacy = { ...lock, upstreams: { speckit: lock.upstreams.speckit, atv: lock.upstreams.atv },
    files: lock.files.filter((file) => ['speckit', 'atv'].includes(file.upstream)) };
  assert.deepEqual(validateSchema(registry, 'lock', legacy), []);
  const pin = { version: '1.1.0', repo: 'tinesoft/spec-kit-token-budget', tag: 'v1.1.0',
    commit: '11c5589f347ddb3789b51b09927ef825c88e3f19', tree: '0188d6c187e1f1ddc03293660cc8e4d129ea0fa5', license: 'MIT' };
  const row = { path: '.baton/vendor/token-budget/LICENSE', upstream: 'token-budget', upstream_path: 'LICENSE',
    stored_at: 'packs/token-budget/files/.baton/vendor/token-budget/LICENSE', sha256_upstream: '1'.repeat(64),
    sha256: '1'.repeat(64), license: 'MIT', repair: null, packs: ['token-budget'] };
  const named = { ...legacy, upstreams: { ...legacy.upstreams, 'token-budget': pin }, files: [...legacy.files, row] };
  assert.deepEqual(validateSchema(registry, 'lock', named), []);
  for (const broken of [
    { ...named, upstreams: { 'token-budget': pin } },
    { ...named, upstreams: { ...named.upstreams, 'token-budget': { ...pin, tree: undefined } } },
    { ...named, upstreams: { ...named.upstreams, 'token-budget': { ...pin, commit: 'v1.1.0' } } },
    { ...named, upstreams: { ...named.upstreams, other: pin } },
    { ...named, files: [{ ...row, upstream: 'other' }] },
  ]) assert.ok(validateSchema(registry, 'lock', JSON.parse(JSON.stringify(broken))).length);

  const manifest = { schema: 1, baton_version: '0.1.3', installed_at: '2026-11-02T00:00:00Z', source: 'init',
    upstreams: { speckit: '1.0.11@8147943', atv: 'main@ad99673' }, packs: ['core'], files: [], marker_sections: [] };
  assert.deepEqual(validateSchema(registry, 'manifest', manifest), []);
  const optional = { ...manifest, packs: ['core', 'token-budget', 'optimize'],
    upstreams: { ...manifest.upstreams, 'token-budget': '1.1.0@11c5589', optimize: '1.0.0@d6dba6a' },
    files: [{ path: '.baton/vendor/token-budget/LICENSE', sha256: '1'.repeat(64), pack: 'token-budget', owner: 'token-budget', managed: true },
      { path: '.baton/vendor/optimize/LICENSE', sha256: '2'.repeat(64), pack: 'optimize', owner: 'optimize', managed: true }] };
  assert.deepEqual(validateSchema(registry, 'manifest', optional), []);
  assert.ok(validateSchema(registry, 'manifest', { ...optional, files: [{ ...optional.files[0], owner: 'other' }] }).length);
});
