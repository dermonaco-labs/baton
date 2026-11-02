import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sha256 } from '../../src/lib/upstream.mjs';
import { run as lock } from '../../src/commands/lock.mjs';
import { sourceRoot } from '../helpers/index.mjs';

test('lock verify accepts matching files and reports tampering as E_LOCK_MISMATCH', async () => {
  const root = await mkdtemp(join(sourceRoot, 'test/fixtures/lock-check-'));
  try {
    await mkdir(join(root, 'baton/upstream'), { recursive: true });
    await mkdir(join(root, 'packs'), { recursive: true });
    const requirement = 'specify-cli==1.0.11\n';
    const asset = 'pack contents\n';
    await writeFile(join(root, 'baton/upstream/specify-cli.requirements.in'), requirement);
    await writeFile(join(root, 'baton/upstream/specify-cli.requirements.txt'), 'pinned dependencies\n');
    await writeFile(join(root, 'packs/core.yml'), asset);
    await writeFile(join(root, 'baton.lock.json'), JSON.stringify({
      schema: 1,
      upstreams: { speckit: {
        version: '1.0.11',
        requirements: 'baton/upstream/specify-cli.requirements.txt',
        requirements_sha256: sha256('pinned dependencies\n'),
      } },
      files: [{ stored_at: 'packs/core.yml', sha256: sha256(asset) }],
    }));
    assert.deepEqual(lock(root, ['verify']), { data: { ok: true, files: 1 }, errors: [] });

    await writeFile(join(root, 'packs/core.yml'), 'tampered pack\n');
    const tampered = lock(root, ['verify']);
    assert.equal(tampered.exitCode, 1);
    assert.ok(tampered.errors.some(({ code, message }) => code === 'E_LOCK_MISMATCH' && message.includes('packs/core.yml')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('lock verify reports malformed JSON as E_LOCK_MISMATCH instead of throwing', async () => {
  const root = await mkdtemp(join(sourceRoot, 'test/fixtures/lock-malformed-'));
  try {
    await writeFile(join(root, 'baton.lock.json'), '{ invalid json');
    const result = lock(root, ['verify']);
    assert.equal(result.exitCode, 1);
    assert.ok(result.errors.some(({ code }) => code === 'E_LOCK_MISMATCH'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('lock verify checks optional source pins and vendored row provenance offline', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-lock-optional-'));
  try {
    await mkdir(join(root, 'baton/upstream'), { recursive: true });
    await writeFile(join(root, 'baton/upstream/specify-cli.requirements.in'), 'specify-cli==1.0.11\n');
    await writeFile(join(root, 'baton/upstream/specify-cli.requirements.txt'), 'pinned dependencies\n');
    const path = '.baton/vendor/optimize/commands/speckit.optimize.run.md';
    const stored = `packs/optimize/files/${path}`;
    const bytes = '# Optimize\r\nraw upstream bytes\n';
    await mkdir(join(root, stored, '..'), { recursive: true });
    await writeFile(join(root, stored), bytes);
    const pin = { version: '1.0.0', repo: 'sakitA/spec-kit-optimize', tag: 'v1.0.0',
      commit: 'd6dba6ae93bf60322deee3bdc4ffcf127e42b2b9', tree: 'c5bb7b7a37912ef26bc369397980c26c3d70cf7b', license: 'MIT' };
    const row = { path, upstream: 'optimize', upstream_path: 'commands/speckit.optimize.run.md', stored_at: stored,
      sha256_upstream: sha256(bytes), sha256: sha256(bytes), license: 'MIT', repair: null, packs: ['optimize'] };
    const speckit = { version: '1.0.11', requirements: 'baton/upstream/specify-cli.requirements.txt',
      requirements_sha256: sha256('pinned dependencies\n') };
    /** @param {(lock:any)=>void} [mutate] */
    const verify = async (mutate = () => {}) => {
      const document = { schema: 1, upstreams: { speckit, optimize: { ...pin } }, files: [{ ...row, packs: [...row.packs] }] };
      mutate(document);
      await writeFile(join(root, 'baton.lock.json'), JSON.stringify(document));
      return lock(root, ['verify']);
    };
    assert.deepEqual(await verify(), { data: { ok: true, files: 1 }, errors: [] });
    const vetted = 'differs from the vetted sakitA/spec-kit-optimize v1.0.0 pin';
    const learn = '.baton/vendor/optimize/commands/speckit.optimize.learn.md';
    /** @type {Record<string, [(lock:any)=>void, string[]]>} */
    const tampering = {
      commit: [l => { l.upstreams.optimize.commit = '0'.repeat(40); }, [`upstream optimize commit ${vetted}`]],
      tree: [l => { l.upstreams.optimize.tree = '1'.repeat(40); }, [`upstream optimize tree ${vetted}`]],
      tag: [l => { l.upstreams.optimize.tag = 'v9.9.9'; }, [`upstream optimize tag ${vetted}`]],
      repo: [l => { l.upstreams.optimize.repo = 'fork/spec-kit-optimize'; }, [`upstream optimize repo ${vetted}`]],
      version: [l => { l.upstreams.optimize.version = '9.9.9'; }, [`upstream optimize version ${vetted}`]],
      license: [l => { l.upstreams.optimize.license = 'Apache-2.0'; }, [`upstream optimize license ${vetted}`]],
      'missing pin': [l => { delete l.upstreams.optimize; }, [`upstream optimize pin is missing for ${stored}`]],
      'upstream hash': [l => { l.files[0].sha256_upstream = '2'.repeat(64); },
        [`optimize row ${stored} has invalid sha256_upstream`]],
      repair: [l => { l.files[0].repair = { id: 'x', reason: 'y', upstream_issue: 'pending' }; },
        [`optimize row ${stored} has invalid repair`]],
      'row license': [l => { l.files[0].license = 'Apache-2.0'; }, [`optimize row ${stored} has invalid license`]],
      'owning pack': [l => { l.files[0].packs = ['core']; }, [`optimize row ${stored} has invalid packs`]],
      'shared pack': [l => { l.files[0].packs = ['optimize', 'core']; }, [`optimize row ${stored} has invalid packs`]],
      'vendor path': [l => { l.files[0].path = '.github/skills/speckit-optimize-run/SKILL.md'; },
        [`optimize row ${stored} has invalid path (expected ${path})`]],
      'upstream path': [l => { l.files[0].upstream_path = 'commands/speckit.optimize.learn.md'; },
        [`optimize row ${stored} has invalid path (expected ${learn})`,
          `optimize row ${stored} has invalid stored_at (expected packs/optimize/files/${learn})`]],
      'escaping path': [l => { l.files[0].upstream_path = '../commands/speckit.optimize.run.md'; },
        [`optimize row ${stored} has invalid upstream_path`]],
      'stored at': [l => { l.files[0].stored_at = path; },
        [path, `optimize row ${path} has invalid stored_at (expected ${stored})`]],
      'unknown source': [l => { l.upstreams.extra = { ...pin }; }, ['unknown upstream extra']],
    };
    for (const [name, [mutate, expected]] of Object.entries(tampering)) {
      const result = await verify(mutate);
      assert.equal(result.exitCode, 1, name);
      assert.deepEqual(result.errors.map(({ code, message }) => [code, message.split('\n')]),
        [['E_LOCK_MISMATCH', expected]], name);
    }
    await writeFile(join(root, stored), bytes.replace('\r\n', '\n'));
    const normalized = await verify();
    assert.equal(normalized.exitCode, 1, 'normalized vendored bytes');
    assert.deepEqual(normalized.errors.map(({ code, message }) => [code, message]), [['E_LOCK_MISMATCH', stored]]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});