import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile, readdir, link, symlink, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tempRepo, runCli, sourceRoot } from '../helpers/index.mjs';
import { hashBytes, hashArtifact } from '../../src/lib/hash.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';
import { loadSchemas, validateSchema } from '../../src/lib/schema.mjs';

const feature = '002-draft';
const target = `specs/${feature}/spec.md`;
const original = '# Draft\r\n\r\n## Requirements\r\nKeep this requirement.\r\n';
const candidate = '# Draft\nKeep this requirement.\n';
const digest = hashBytes(original);

async function fixture(t, packs = ['token-budget', 'optimize']) {
  const repo = await tempRepo();
  t.after(repo.cleanup);
  await cp(join(sourceRoot, 'baton/schemas'), join(repo.root, '.baton/schemas'), { recursive: true });
  await mkdir(join(repo.root, `specs/${feature}`), { recursive: true });
  await writeFile(join(repo.root, target), original);
  await writeFile(join(repo.root, `specs/${feature}/research.md`), '# Draft research\n');
  await writeFile(join(repo.root, 'candidate.md'), candidate);
  await writeFile(join(repo.root, '.baton/manifest.json'), JSON.stringify({
    schema: 1, baton_version: '0.1.3', installed_at: '2026-11-02T00:00:00Z',
    source: 'init', upstreams: { speckit: '1.0.11', atv: 'pinned' },
    packs: ['core', ...packs], files: [], marker_sections: [],
  }));
  await mkdir(join(repo.root, '.specify/memory'), { recursive: true });
  for (const path of ['AGENTS.md', 'CLAUDE.md', '.specify/memory/constitution.md']) {
    await writeFile(join(repo.root, path), '# Mandatory gates\nNever weaken approval.\n');
  }
  return repo;
}

async function invoke(root, args) {
  const result = await runCli(root, ['--json', 'context', ...args]);
  const output = JSON.parse((result.stdout || result.stderr).trim());
  return { ...result, output };
}

async function snapshot(root) {
  const entries = {};
  async function visit(path = '') {
    for (const entry of await readdir(join(root, path), { withFileTypes: true })) {
      const name = path ? `${path}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(name);
      else if (entry.isFile()) entries[name] = hashBytes(await readFile(join(root, name)));
    }
  }
  await visit();
  return entries;
}

async function baton(root, mode) {
  const { data, body } = parseFrontmatter(await readFile(
    join(sourceRoot, 'test/fixtures/handoffs/valid/feature/specify.md'), 'utf8'));
  data.feature = feature;
  data.read_first = [{ path: `specs/${feature}/research.md`, why: 'Draft context' }];
  data.artifacts = [];
  data.gate = { required: false, approved_by: null, approved_at: null };
  if (mode === 'read_first') data.read_first = [{ path: target, why: 'Required context without checksum' }];
  if (mode === 'hash') data.artifacts = [{ path: target, role: 'source-of-truth', sha256: hashArtifact(target, original) }];
  if (mode === 'approved') data.gate = {
    required: true, approved_by: 'repository owner via direct approval', approved_at: '2026-11-02',
  };
  if (mode === 'history') data.history.push({
    phase: 'specify', at: '2026-11-02T00:00:00Z', by: 'human:repository-owner',
    commit: null, 'x-action': 'approve',
  });
  if (mode === 'phase') data.phase_completed = 'plan';
  if (mode === 'status') data.status = 'blocked';
  if (mode === 'attach-approved') data.decisions = [{
    id: 'D1', by: 'human:repository-owner', tag: 'attach-approved',
    decision: 'Owner approved attachment', rationale: 'Explicit owner approval',
  }];
  if (mode === 'no-decisions') delete data.decisions;
  assert.deepEqual(validateSchema(await loadSchemas(root), 'handoff', data), [], `Invalid ${mode} fixture`);
  const path = `specs/${feature}/handoff.md`;
  await writeFile(join(root, path), serializeFrontmatter(data, body));
}

test('context draft previews write nothing and explicit compact/restore preserves original CRLF bytes', async (t) => {
  const { root } = await fixture(t);
  const before = await snapshot(root);
  const preview = await invoke(root, ['compact', '--feature', feature, '--target', target]);
  assert.equal(preview.code, 0, preview.stderr);
  assert.equal(preview.output.data.allowed, true);
  assert.deepEqual(await snapshot(root), before);
  const compact = await invoke(root, ['compact', '--feature', feature, '--target', target,
    '--candidate', 'candidate.md', '--expect', digest, '--apply']);
  assert.equal(compact.code, 0, compact.stderr);
  assert.equal(await readFile(join(root, target), 'utf8'), candidate.replace(/\n/g, '\r\n'));
  assert.equal(await readFile(join(root, `specs/${feature}/spec.full.md`), 'utf8'), original);
  const current = hashBytes(await readFile(join(root, target)));
  const restore = await invoke(root, ['restore', '--feature', feature, '--target', target, '--expect', current, '--apply']);
  assert.equal(restore.code, 0, restore.stderr);
  assert.equal(await readFile(join(root, target), 'utf8'), original);
});

test('context protection refuses bound approved historical and malformed targets with no side effects', async (t) => {
  for (const mode of ['read_first', 'hash', 'approved', 'history', 'phase', 'status', 'attach-approved',
    'malformed', 'managed', 'stale', 'invalid-handoff', 'malformed-manifest', 'malformed-lock']) {
    await t.test(mode, async (t) => {
      const { root } = await fixture(t);
      if (mode === 'malformed') await writeFile(join(root, `specs/${feature}/handoff.md`), '---\nbaton: [broken\n---\n');
      else if (mode === 'invalid-handoff') await writeFile(join(root, `specs/${feature}/handoff.md`), '---\nschema: 1\n---\n');
      else if (mode === 'malformed-manifest') await writeFile(join(root, '.baton/manifest.json'), '{');
      else if (mode === 'malformed-lock') await writeFile(join(root, 'baton.lock.json'), '{');
      else if (mode === 'managed') {
        const path = join(root, '.baton/manifest.json');
        const manifest = JSON.parse(await readFile(path, 'utf8'));
        manifest.files.push({ path: target, sha256: digest, pack: 'core', owner: 'baton', managed: true });
        await writeFile(path, JSON.stringify(manifest));
      } else if (mode !== 'stale') await baton(root, mode);
      const before = await snapshot(root);
      const result = await invoke(root, ['compact', '--feature', feature, '--target', target,
        '--candidate', 'candidate.md', '--expect', mode === 'stale' ? '0'.repeat(64) : digest, '--apply']);
      assert.notEqual(result.code, 0, mode);
      assert.equal(result.output.ok, false, mode);
      assert.equal(result.output.errors[0].code, mode === 'stale' ? 'E_CONFLICT' : 'E_CONTEXT_PROTECTED',
        JSON.stringify(result.output));
      assert.deepEqual(await snapshot(root), before, mode);
      await writeFile(join(root, `specs/${feature}/spec.full.md`), original);
      const restoreBefore = await snapshot(root);
      if (mode !== 'stale') {
        const restore = await invoke(root, ['restore', '--feature', feature, '--target', target, '--expect', digest, '--apply']);
        assert.notEqual(restore.code, 0, mode);
        assert.equal(restore.output.errors[0].code, 'E_CONTEXT_PROTECTED', JSON.stringify(restore.output));
        assert.deepEqual(await snapshot(root), restoreBefore, mode);
      }
    });
  }
});

test('context protection refuses traversal instruction targets hardlinks and junctions', async (t) => {
  const { root } = await fixture(t);
  await link(join(root, target), join(root, `specs/${feature}/plan.md`));
  await mkdir(join(root, 'outside'));
  await writeFile(join(root, 'outside/data.md'), original);
  await symlink(join(root, 'outside'), join(root, `specs/${feature}/contracts`), 'junction');
  for (const path of ['AGENTS.md', 'CLAUDE.md', '.specify/memory/constitution.md',
    `specs/${feature}/../${feature}/spec.md`, `specs/${feature}/plan.md`,
    `specs/${feature}/contracts/data.md`]) {
    const before = await snapshot(root);
    const result = await invoke(root, ['compact', '--feature', feature, '--target', path,
      '--candidate', 'candidate.md', '--expect', digest, '--apply']);
    assert.notEqual(result.code, 0, path);
    assert.ok(result.output.errors.some((error) => error.code === 'E_CONTEXT_PROTECTED'), JSON.stringify(result.output));
    assert.deepEqual(await snapshot(root), before, path);
  }
});

test('context protection refuses restore after a draft becomes bound', async (t) => {
  const { root } = await fixture(t);
  await writeFile(join(root, `specs/${feature}/spec.full.md`), '# Original backup\n');
  await baton(root, 'hash');
  const before = await snapshot(root);
  const result = await invoke(root, ['restore', '--feature', feature, '--target', target, '--expect', digest, '--apply']);
  assert.notEqual(result.code, 0);
  assert.ok(result.output.errors.some((error) => error.code === 'E_CONTEXT_PROTECTED'));
  assert.deepEqual(await snapshot(root), before);
});

test('context optimize reports run tokens learn never edit governance or memory', async (t) => {
  const { root } = await fixture(t);
  await cp(join(sourceRoot, 'baton/templates/phases.yml'), join(root, '.baton/phases.yml'));
  await cp(join(sourceRoot, '.baton/config.yml'), join(root, '.baton/config.yml'));
  await baton(root, 'history');
  await writeFile(join(root, 'MEMORY.md'), '# Keep existing memory\n');
  const before = await snapshot(root);
  for (const action of ['run', 'tokens', 'learn']) {
    const result = await invoke(root, ['optimize', action]);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.output.data.report_only, true);
    assert.match(result.output.data.instruction, /Mandatory gates, scanner rules and approval semantics are not removable/);
    assert.equal(result.output.data.files.find((file) => file.path === '.baton/phases.yml').protected, true);
    assert.equal(result.output.data.estimated_tokens,
      result.output.data.files.reduce((total, file) => total + file.estimated_tokens, 0));
    assert.ok(result.output.data.files.every((file) => file.protected === true && file.estimated_tokens > 0));
    assert.deepEqual(await snapshot(root), before);
  }
});

test('context optimize apply and missing-pack requests fail without weakening protected rules', async (t) => {
  const { root } = await fixture(t);
  assert.equal((await invoke(root, ['optimize', 'run'])).code, 0);
  for (const action of ['run', 'tokens', 'learn', 'check']) {
    const before = await snapshot(root);
    const result = await invoke(root, ['optimize', action, '--apply']);
    assert.notEqual(result.code, 0);
    assert.equal(result.output.errors[0].code, 'E_USAGE');
    assert.deepEqual(await snapshot(root), before);
  }
  for (const flag of ['--remove-rules', '--persist', '--auto-execute']) {
    const before = await snapshot(root);
    const result = await invoke(root, ['optimize', 'learn', flag]);
    assert.equal(result.output.errors[0].code, 'E_USAGE');
    assert.deepEqual(await snapshot(root), before);
  }
  const absent = await fixture(t, []);
  const result = await invoke(absent.root, ['optimize', 'run']);
  assert.notEqual(result.code, 0);
  assert.equal(result.output.errors[0].code, 'E_CONTEXT_PROTECTED');
  assert.match(result.output.errors[0].message, /optimize pack is not installed/);
});

test('context protection honors cross-feature quick references and refuses backup conflicts', async (t) => {
  for (const location of ['specs/003-other/handoff.md', '.baton/quick/other.md']) {
    await t.test(location, async (t) => {
      const { root } = await fixture(t);
      await baton(root, 'read_first');
      const source = await readFile(join(root, `specs/${feature}/handoff.md`), 'utf8');
      await mkdir(join(root, location.slice(0, location.lastIndexOf('/'))), { recursive: true });
      await writeFile(join(root, location), source);
      await rm(join(root, `specs/${feature}/handoff.md`));
      const before = await snapshot(root);
      const result = await invoke(root, ['compact', '--feature', feature, '--target', target,
        '--candidate', 'candidate.md', '--expect', digest, '--apply']);
      assert.equal(result.output.errors[0].code, 'E_CONTEXT_PROTECTED');
      assert.deepEqual(await snapshot(root), before);
    });
  }
  const { root } = await fixture(t);
  await writeFile(join(root, `specs/${feature}/spec.full.md`), '# Existing backup\n');
  const before = await snapshot(root);
  const result = await invoke(root, ['compact', '--feature', feature, '--target', target,
    '--candidate', 'candidate.md', '--expect', digest, '--apply']);
  assert.equal(result.output.errors[0].code, 'E_CONFLICT');
  assert.deepEqual(await snapshot(root), before);
});

test('context advisory preserves ordered read_first exclusions and session-only concise', async (t) => {
  const { root } = await fixture(t);
  await baton(root, 'read_first');
  const path = join(root, `specs/${feature}/handoff.md`);
  const { data, body } = parseFrontmatter(await readFile(path, 'utf8'));
  data.read_first.push({ path: `specs/${feature}/research.md`, why: 'Read second' });
  data.do_not_read = [{ path: `specs/${feature}/spec.full.md`, why: 'Excluded backup' }];
  await writeFile(path, serializeFrontmatter(data, body));
  const before = await snapshot(root);
  const scope = await invoke(root, ['scope', '--feature', feature]);
  assert.equal(scope.code, 0, scope.stderr);
  assert.deepEqual(scope.output.data.read_first, data.read_first);
  assert.deepEqual(scope.output.data.do_not_read, data.do_not_read);
  for (const state of ['on', 'off']) {
    const result = await invoke(root, ['concise', state]);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.output.data.session_only, true);
  }
  assert.equal((await invoke(root, ['usage', '--feature', feature])).code, 0);
  assert.deepEqual(await snapshot(root), before);
});

test('context output preserves errors failure status readable reports and inactive helpers', async (t) => {
  const { root } = await fixture(t);
  const bad = await runCli(root, ['context', 'compact', '--feature', feature, '--target', 'AGENTS.md',
    '--candidate', 'candidate.md', '--expect', digest, '--apply']);
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /E_CONTEXT_PROTECTED/);
  assert.doesNotMatch(bad.stderr, /E_USAGE|E_INTERNAL/);
  const report = await runCli(root, ['context', 'usage', '--feature', feature]);
  assert.equal(report.code, 0, report.stderr);
  assert.match(report.stdout, /estimated|tokens/i);
  const before = await snapshot(root);
  const duplicate = await invoke(root, ['usage', '--feature', feature, '--feature', feature]);
  assert.notEqual(duplicate.code, 0);
  assert.equal(duplicate.output.errors[0].code, 'E_USAGE');
  assert.deepEqual(await snapshot(root), before);
});

test('context protection covers cross-baton bound managed excluded and case-aliased backups', async (t) => {
  for (const mode of ['read_first', 'hash', 'excluded', 'excluded-absent', 'managed', 'case-alias']) {
    await t.test(mode, async (t) => {
      const { root } = await fixture(t);
      const backup = `specs/${feature}/spec.full.md`;
      if (mode !== 'excluded-absent') {
        await writeFile(join(root, backup), mode === 'excluded' ? Buffer.from([0xff]) : original);
      }
      if (mode === 'managed') {
        const path = join(root, '.baton/manifest.json');
        const manifest = JSON.parse(await readFile(path, 'utf8'));
        manifest.files.push({ path: backup, sha256: digest, pack: 'core', owner: 'baton', managed: true });
        await writeFile(path, JSON.stringify(manifest));
      } else {
        await baton(root, 'draft');
        const own = join(root, `specs/${feature}/handoff.md`);
        const { data, body } = parseFrontmatter(await readFile(own, 'utf8'));
        const path = mode === 'case-alias' ? backup.toUpperCase() : backup;
        if (mode.startsWith('excluded') || mode === 'case-alias') data.do_not_read = [{ path, why: 'Excluded backup' }];
        else if (mode === 'hash') data.artifacts = [{ path, role: 'source-of-truth', sha256: hashArtifact(backup, original) }];
        else data.read_first.push({ path, why: 'Required backup' });
        await mkdir(join(root, 'specs/003-other'));
        await writeFile(join(root, 'specs/003-other/handoff.md'), serializeFrontmatter(data, body));
        await rm(own);
      }
      const before = await snapshot(root);
      for (const action of ['compact', 'restore']) {
        const args = [action, '--feature', feature, '--target', target,
          ...(action === 'compact' ? ['--candidate', 'candidate.md'] : [])];
        const preview = await invoke(root, args);
        assert.equal(preview.code, 0, JSON.stringify(preview.output));
        assert.equal(preview.output.data.allowed, false);
        assert.match(preview.output.data.reasons.join('; '), /backup.*(?:protected|bound|excluded|managed)/i);
        const result = await invoke(root, [...args, '--expect', digest, '--apply']);
        assert.equal(result.output.errors[0].code, 'E_CONTEXT_PROTECTED', JSON.stringify(result.output));
        assert.deepEqual(await snapshot(root), before);
      }
    });
  }
});

test('context draft metadata allows omitted decisions but refuses ambiguous handoffs', async (t) => {
  const { root } = await fixture(t);
  await baton(root, 'no-decisions');
  const preview = await invoke(root, ['compact', '--feature', feature, '--target', target]);
  assert.equal(preview.code, 0, JSON.stringify(preview.output));
  assert.equal(preview.output.data.allowed, true);
  await cp(join(root, `specs/${feature}/handoff.md`), join(root, `specs/${feature}/handoff.extra.md`));
  const before = await snapshot(root);
  const ambiguous = await invoke(root, ['compact', '--feature', feature, '--target', target,
    '--candidate', 'candidate.md', '--expect', digest, '--apply']);
  assert.equal(ambiguous.output.errors[0].code, 'E_CONTEXT_PROTECTED', JSON.stringify(ambiguous.output));
  assert.match(ambiguous.output.errors[0].message, /ambiguous/i);
  assert.deepEqual(await snapshot(root), before);
});

test('context protection reports missing restore backup and existing compact backup accurately', async (t) => {
  const { root } = await fixture(t);
  const args = ['--feature', feature, '--target', target];
  const before = await snapshot(root);
  const preview = await invoke(root, ['restore', ...args]);
  assert.equal(preview.code, 0, JSON.stringify(preview.output));
  assert.equal(preview.output.data.allowed, false);
  assert.match(preview.output.data.reasons.join('; '), /backup.*missing/i);
  const result = await invoke(root, ['restore', ...args, '--expect', digest, '--apply']);
  assert.equal(result.output.errors[0].code, 'E_CONTEXT_PROTECTED');
  assert.match(result.output.errors[0].message, /backup.*missing/i);
  assert.match(result.output.errors[0].message, new RegExp(`specs/${feature}/spec\\.full\\.md`));
  assert.deepEqual(await snapshot(root), before);
  await writeFile(join(root, `specs/${feature}/spec.full.md`), original);
  const conflict = await invoke(root, ['compact', ...args, '--candidate', 'candidate.md']);
  assert.equal(conflict.output.data.allowed, false);
  assert.match(conflict.output.data.reasons.join('; '), /backup.*(?:exists|overwrit)/i);
});

test('context draft restore preview exposes backup digest and overwrite semantics without writing provenance', async (t) => {
  const { root } = await fixture(t);
  const backup = `specs/${feature}/spec.full.md`;
  await writeFile(join(root, backup), original);
  const before = await snapshot(root);
  const result = await invoke(root, ['restore', '--feature', feature, '--target', target]);
  assert.equal(result.code, 0, JSON.stringify(result.output));
  assert.equal(result.output.data.backup_sha256, digest);
  assert.match(result.output.data.warning, /replaces.*current.*provenance/i);
  assert.deepEqual(await snapshot(root), before);
});

test('context protection refusal contracts preserve exact diagnostics and every file', async (t) => {
  for (const mode of ['expect', 'candidate', 'target-alias', 'backslash-alias', 'backup-alias', 'whitespace',
    'duplicate-target', 'absent-pack', 'excluded-candidate']) {
    await t.test(mode, async (t) => {
      const { root } = await fixture(t, mode === 'absent-pack' ? [] : ['token-budget']);
      if (mode === 'whitespace') await writeFile(join(root, 'candidate.md'), ' \r\n\t');
      if (mode === 'backup-alias') await writeFile(join(root, `specs/${feature}/spec.full.md`), original);
      if (mode === 'excluded-candidate') {
        await baton(root, 'draft');
        const path = join(root, `specs/${feature}/handoff.md`);
        const { data, body } = parseFrontmatter(await readFile(path, 'utf8'));
        data.do_not_read = [{ path: 'candidate.md', why: 'Never load this candidate' }];
        await writeFile(path, serializeFrontmatter(data, body));
        await writeFile(join(root, 'candidate.md'), Buffer.from([0xff]));
      }
      const proposed = mode === 'target-alias' ? target : mode === 'backslash-alias' ? target.replaceAll('/', '\\') :
        mode === 'backup-alias' ? `specs/${feature}/spec.full.md` : 'candidate.md';
      const args = ['compact', '--feature', feature, '--target', target,
        ...(mode === 'duplicate-target' ? ['--target', target] : []),
        ...(mode === 'candidate' ? [] : ['--candidate', proposed]),
        ...(mode === 'expect' ? [] : ['--expect', digest]), '--apply'];
      const before = await snapshot(root);
      if (['target-alias', 'backslash-alias', 'backup-alias', 'whitespace', 'excluded-candidate'].includes(mode)) {
        const preview = await invoke(root, args.slice(0, -1));
        assert.equal(preview.code, 0, JSON.stringify(preview.output));
        assert.equal(preview.output.data.allowed, false);
      }
      const result = await invoke(root, args);
      assert.equal(result.code, ['expect', 'candidate', 'duplicate-target'].includes(mode) ? 2 : 1,
        JSON.stringify(result.output));
      assert.equal(result.output.errors[0].code,
        ['expect', 'candidate', 'duplicate-target'].includes(mode) ? 'E_USAGE' : 'E_CONTEXT_PROTECTED');
      if (mode === 'absent-pack') assert.match(result.output.errors[0].message, /token-budget pack is not installed/);
      if (mode === 'excluded-candidate') assert.match(result.output.errors[0].message, /Candidate is excluded/);
      assert.deepEqual(await snapshot(root), before);
    });
  }
});

test('context advisory includes nested contract Markdown but skips excluded or linked trees', async (t) => {
  const { root } = await fixture(t);
  const contract = `specs/${feature}/contracts/nested/api.md`;
  const excluded = `specs/${feature}/contracts/nested/private.md`;
  await mkdir(join(root, `specs/${feature}/contracts/nested`), { recursive: true });
  await writeFile(join(root, contract), '# API\nDescribe this contract.\n');
  await writeFile(join(root, excluded), 'Must not be counted.\n');
  await mkdir(join(root, `specs/${feature}/contracts/private`));
  await writeFile(join(root, `specs/${feature}/contracts/private/secret.md`), Buffer.from([0xff]));
  await mkdir(join(root, 'outside'));
  await writeFile(join(root, 'outside/hidden.md'), 'Must not follow links.\n');
  await symlink(join(root, 'outside'), join(root, `specs/${feature}/contracts/link`), 'junction');
  await baton(root, 'draft');
  const path = join(root, `specs/${feature}/handoff.md`);
  const { data, body } = parseFrontmatter(await readFile(path, 'utf8'));
  data.do_not_read = [
    { path: excluded.toUpperCase(), why: 'Private contract' },
    { path: `specs/${feature}/contracts/private/`, why: 'Excluded contract tree' },
  ];
  await writeFile(path, serializeFrontmatter(data, body));
  const before = await snapshot(root);
  for (const action of ['scope', 'usage']) {
    const result = await invoke(root, [action, '--feature', feature]);
    assert.equal(result.code, 0, JSON.stringify(result.output));
    const entry = result.output.data.files.find((item) => item.path === contract);
    assert.deepEqual(entry, { path: contract, estimated_tokens: Math.ceil('# API\nDescribe this contract.\n'.length / 4) });
    assert.ok(!result.output.data.files.some((item) =>
      item.path === excluded || item.path.includes('/link/') || item.path.includes('/private/')));
    assert.equal(result.output.data.estimated_tokens,
      result.output.data.files.reduce((sum, item) => sum + item.estimated_tokens, 0));
    assert.deepEqual(await snapshot(root), before);
  }
});

test('context protection refuses excluded drafts markers malformed locks and invalid candidates', async (t) => {
  for (const mode of ['excluded', 'markers', 'lock', 'candidate', 'backup', 'missing', 'digest']) {
    await t.test(mode, async (t) => {
      const { root } = await fixture(t);
      if (mode === 'excluded') {
        await baton(root, 'draft');
        const path = join(root, `specs/${feature}/handoff.md`);
        const { data, body } = parseFrontmatter(await readFile(path, 'utf8'));
        data.do_not_read = [{ path: target, why: 'Never load this draft' }];
        await writeFile(path, serializeFrontmatter(data, body));
      }
      if (mode === 'markers') {
        const path = join(root, '.baton/manifest.json');
        const manifest = JSON.parse(await readFile(path, 'utf8'));
        manifest.marker_sections.push({ path: target, marker: 'BATON', sha256: digest });
        await writeFile(path, JSON.stringify(manifest));
      }
      if (mode === 'lock') await writeFile(join(root, 'baton.lock.json'), '{"files":[]}');
      if (mode === 'candidate') await writeFile(join(root, 'candidate.md'), '<!-- BATON:START -->\nGate rules\n');
      if (mode === 'backup') await writeFile(join(root, `specs/${feature}/spec.full.md`), '<!-- SPECKIT:START -->\n');
      if (mode === 'missing') await rm(join(root, target));
      const before = await snapshot(root);
      const result = await invoke(root, [mode === 'backup' ? 'restore' : 'compact',
        '--feature', feature, '--target', target,
        ...(mode === 'backup' ? [] : ['--candidate', 'candidate.md']),
        '--expect', mode === 'digest' ? 'invalid' : digest, '--apply']);
      assert.equal(result.output.ok, false, JSON.stringify(result.output));
      assert.equal(result.output.errors[0].code, mode === 'digest' ? 'E_USAGE' : 'E_CONTEXT_PROTECTED');
      assert.deepEqual(await snapshot(root), before);
    });
  }
});

test('context protection keeps hash-bound tasks protected across normalized checkbox and newline changes', async (t) => {
  const { root } = await fixture(t);
  const path = `specs/${feature}/tasks.md`;
  const initial = '# Tasks\n\n- [ ] T001 Preserve this gate.\n';
  await writeFile(join(root, path), initial);
  await baton(root, 'draft');
  const handoff = join(root, `specs/${feature}/handoff.md`);
  const { data, body } = parseFrontmatter(await readFile(handoff, 'utf8'));
  data.artifacts = [{ path, role: 'source-of-truth', sha256: hashArtifact(path, initial) }];
  await writeFile(handoff, serializeFrontmatter(data, body));
  const checked = initial.replace('[ ]', '[x]').replace(/\n/g, '\r\n');
  await writeFile(join(root, path), checked);
  const before = await snapshot(root);
  const result = await invoke(root, ['compact', '--feature', feature, '--target', path,
    '--candidate', 'candidate.md', '--expect', hashBytes(checked), '--apply']);
  assert.equal(result.output.errors[0].code, 'E_CONTEXT_PROTECTED');
  assert.deepEqual(await snapshot(root), before);
});

test('context packs install only selected sources and survive re-init update and uninstall with local edits', async (t) => {
  for (const packs of [[], ['token-budget'], ['optimize'], ['token-budget', 'optimize']]) {
    await t.test(packs.join('+') || 'core only', async (t) => {
      const repo = await tempRepo('repos/empty');
      t.after(repo.cleanup);
      const { root } = repo;
      const args = ['init', ...(packs.length ? ['--packs', packs.join(',')] : []), '--json'];
      const clean = await tempRepo('repos/empty');
      t.after(clean.cleanup);
      const originalFixture = await snapshot(clean.root);
      const cleanInstall = await runCli(clean.root, args);
      assert.equal(cleanInstall.code, 0, cleanInstall.stdout + cleanInstall.stderr);
      const cleanManifest = JSON.parse(await readFile(join(clean.root, '.baton/manifest.json'), 'utf8'));
      const cleanUninstall = await runCli(clean.root, ['uninstall', '--json']);
      assert.equal(cleanUninstall.code, 0, cleanUninstall.stdout + cleanUninstall.stderr);
      const cleanResult = await snapshot(clean.root);
      for (const [path, bytes] of Object.entries(originalFixture)) assert.equal(cleanResult[path], bytes, path);
      for (const file of cleanManifest.files.filter((file) => packs.includes(file.pack))) {
        assert.ok(!Object.hasOwn(cleanResult, file.path), `${file.path} remains after clean uninstall`);
      }
      const initialized = await runCli(root, args);
      assert.equal(initialized.code, 0, initialized.stdout + initialized.stderr);
      const manifestPath = join(root, '.baton/manifest.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      assert.deepEqual(manifest.packs, ['core', ...packs]);
      const installed = await snapshot(root);
      for (const pack of ['token-budget', 'optimize']) {
        assert.equal(Object.keys(installed).some((path) => path.startsWith(`.baton/vendor/${pack}/`)), packs.includes(pack));
        assert.equal(Object.hasOwn(manifest.upstreams, pack), packs.includes(pack));
        assert.equal(Object.keys(installed).some((path) => path.startsWith(`.specify/extensions/${pack}/`)), false);
      }
      const hooks = await readFile(join(root, '.specify/extensions.yml'), 'utf8');
      assert.doesNotMatch(hooks, /token-budget|optimize/);
      assert.equal((await runCli(root, args)).code, 0);
      const updated = await runCli(root, ['update', '--json']);
      assert.equal(updated.code, 0, updated.stdout + updated.stderr);
      assert.deepEqual(JSON.parse(await readFile(manifestPath, 'utf8')).packs, manifest.packs);
      const editable = manifest.files.find((file) => file.pack === (packs[0] ?? 'core') &&
        file.path.endsWith('/SKILL.md') && file.owner === 'baton');
      assert.ok(editable, 'An installed wrapper must participate in normal managed-file ownership');
      const edited = `${await readFile(join(root, editable.path), 'utf8')}\nLocal customization retained.\n`;
      await writeFile(join(root, editable.path), edited);
      await writeFile(join(root, 'USER-NOTES.md'), '# Adopter-owned notes\n');
      const conflict = await runCli(root, ['update', '--json']);
      assert.equal(conflict.code, 4, conflict.stdout + conflict.stderr);
      assert.equal(await readFile(join(root, editable.path), 'utf8'), edited);
      const before = await snapshot(root);
      assert.equal((await runCli(root, ['uninstall', '--dry-run', '--json'])).code, 0);
      assert.deepEqual(await snapshot(root), before);
      const removed = await runCli(root, ['uninstall', '--json']);
      assert.equal(removed.code, 0, removed.stdout + removed.stderr);
      assert.equal(await readFile(join(root, editable.path), 'utf8'), edited);
      assert.equal(await readFile(join(root, 'USER-NOTES.md'), 'utf8'), '# Adopter-owned notes\n');
      assert.ok(!Object.keys(await snapshot(root)).some((path) => path.startsWith('.baton/vendor/')));
    });
  }
});

test('context provenance verifies exact source pins raw checksums and rejects pin or payload tampering', async (t) => {
  const repo = await tempRepo();
  t.after(repo.cleanup);
  const { root } = repo;
  const lock = JSON.parse(await readFile(join(sourceRoot, 'baton.lock.json'), 'utf8'));
  const expected = {
    'token-budget': ['1.1.0', '11c5589f347ddb3789b51b09927ef825c88e3f19', '0188d6c187e1f1ddc03293660cc8e4d129ea0fa5'],
    optimize: ['1.0.0', 'd6dba6ae93bf60322deee3bdc4ffcf127e42b2b9', 'c5bb7b7a37912ef26bc369397980c26c3d70cf7b'],
  };
  await cp(join(sourceRoot, 'baton/upstream'), join(root, 'baton/upstream'), { recursive: true });
  for (const [source, [version, commit, tree]] of Object.entries(expected)) {
    assert.ok(lock.upstreams[source], `Missing pinned source ${source}`);
    assert.deepEqual([lock.upstreams[source].version, lock.upstreams[source].commit, lock.upstreams[source].tree],
      [version, commit, tree]);
    const files = lock.files.filter((file) => file.upstream === source);
    assert.ok(files.length > 0);
    for (const file of files) {
      assert.equal(file.sha256, file.sha256_upstream);
      assert.equal(file.repair, null);
      assert.equal(file.path, `.baton/vendor/${source}/${file.upstream_path}`);
      assert.deepEqual(file.packs, [source]);
    }
  }
  for (const file of lock.files) {
    const destination = join(root, file.stored_at);
    await mkdir(dirname(destination), { recursive: true });
    await cp(join(sourceRoot, file.stored_at), destination);
  }
  const lockPath = join(root, 'baton.lock.json');
  await writeFile(lockPath, JSON.stringify(lock));
  assert.equal((await runCli(root, ['lock', 'verify', '--json'])).code, 0);
  for (const field of ['commit', 'tree']) {
    const tampered = structuredClone(lock);
    tampered.upstreams['token-budget'][field] = '0'.repeat(40);
    await writeFile(lockPath, JSON.stringify(tampered));
    const result = await runCli(root, ['lock', 'verify', '--json']);
    assert.equal(result.code, 1, `${field}: ${result.stdout}`);
    assert.equal(JSON.parse(result.stdout).errors[0].code, 'E_LOCK_MISMATCH');
  }
  await writeFile(lockPath, JSON.stringify(lock));
  const vendor = lock.files.find((file) => file.upstream === 'optimize');
  const destination = join(root, vendor.stored_at);
  const bytes = await readFile(destination);
  await writeFile(destination, Buffer.concat([bytes, Buffer.from('\nmodified\n')]));
  const result = await runCli(root, ['lock', 'verify', '--json']);
  assert.equal(result.code, 1, result.stdout);
  assert.equal(JSON.parse(result.stdout).errors[0].code, 'E_LOCK_MISMATCH');
});
