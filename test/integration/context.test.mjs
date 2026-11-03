import { test } from 'node:test';
import assert from 'node:assert/strict';
import filesystem, { cp, mkdir, readFile, writeFile, readdir, realpath, lstat, link, symlink, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { syncBuiltinESMExports } from 'node:module';
import { tempRepo, runCli, sourceRoot } from '../helpers/index.mjs';
import { hashBytes, hashArtifact } from '../../src/lib/hash.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';
import { loadSchemas, validateSchema } from '../../src/lib/schema.mjs';
import { contextProtection } from '../../src/lib/context-guards.mjs';

const feature = '002-draft';
const target = `specs/${feature}/spec.md`;
const original = '# Draft\r\n\r\n## Requirements\r\nKeep this requirement.\r\n';
const candidate = '# Draft\nKeep this requirement.\n';
const digest = hashBytes(original);
const execute = promisify(execFile);

async function shortAlias(t, root, path) {
  await lstat(join(root, path));
  if (process.platform !== 'win32') {
    t.skip('Real Windows 8.3 aliases require Windows');
    return null;
  }
  assert.match(basename(path), /^[a-z0-9._~-]+$/i);
  const { stdout } = await execute(process.env.ComSpec ?? 'cmd.exe',
    ['/d', '/c', `for %I in (${basename(path)}) do @echo %~snxI`],
    { cwd: join(root, dirname(path)), windowsHide: true });
  const name = stdout.trim();
  assert.ok(name && !/[\\/\r\n]/.test(name), `Invalid short-name result: ${stdout}`);
  if (name.toLowerCase() === basename(path).toLowerCase()) {
    t.skip('The temporary filesystem does not generate an alternate 8.3 name');
    return null;
  }
  const alias = `${path.slice(0, path.lastIndexOf('/') + 1)}${name}`;
  assert.equal((await lstat(join(root, alias))).isSymbolicLink(), false);
  assert.equal(await realpath(join(root, alias)), await realpath(join(root, path)));
  return alias;
}

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

test('context protection canonicalizes schema-valid metadata aliases before any read or mutation', async (t) => {
  const spellings = [
    { name: 'leading-dot', path: (path) => `./${path}` },
    { name: 'internal-dot', path: (path) => path.replace('/', '/./') },
    { name: 'duplicate-separator', path: (path) => path.replace('/', '//') },
    { name: 'trailing-dot', path: (path) => `${path}.`, unsafe: true },
    { name: 'trailing-space', path: (path) => `${path} `, unsafe: true },
    { name: 'short-name', path: async (path, root, t) => {
      const base = path.startsWith('specs/') ? `specs/${feature}` : path;
      const alias = await shortAlias(t, root, base);
      return alias === null ? null : `${alias}${path.slice(base.length)}`;
    }, unsafe: true },
  ];
  const excluded = 'Target is excluded from context';
  const bound = 'Target is read_first, source/hash-bound or managed';
  const backup = `specs/${feature}/spec.full.md`;
  const proposed = 'drafts/candidate.md';
  const directory = `specs/${feature}/contracts/long-name`;
  const manifestSource = '.baton/manifest.json';
  const kinds = [
    { name: 'target', field: 'do_not_read', path: target, message: excluded, previewError: true },
    { name: 'backup', field: 'do_not_read', path: backup, action: 'restore',
      message: `Backup is protected, bound, managed or excluded: ${backup}` },
    { name: 'candidate', field: 'do_not_read', path: proposed, message: 'Candidate is excluded from context' },
    { name: 'read_first', field: 'read_first', path: target, exclude: true, message: excluded, previewError: true },
    { name: 'artifact', field: 'artifacts', path: target, exclude: true, message: excluded, previewError: true,
      ref: { role: 'source-of-truth', sha256: hashArtifact(target, original) } },
    { name: 'managed', source: manifestSource, field: 'files', path: target, message: bound,
      ref: { sha256: digest, pack: 'core', owner: 'baton', managed: true } },
    { name: 'marker', source: manifestSource, field: 'marker_sections', path: target, message: bound,
      ref: { marker: 'BATON', sha256: digest } },
    { name: 'lock', source: 'baton.lock.json', field: 'files', path: target, message: bound },
    { name: 'quick', source: '.baton/quick/other.md', field: 'do_not_read', path: target,
      message: excluded, previewError: true },
    { name: 'directory', field: 'do_not_read', path: directory, target: `${directory}/api.md`,
      message: excluded, previewError: true },
  ];
  for (const spelling of spellings) {
    for (const kind of kinds) {
      await t.test(`${spelling.name}/${kind.name}`, async (t) => {
        const { root } = await fixture(t);
        await mkdir(join(root, 'drafts'));
        await writeFile(join(root, proposed), kind.name === 'candidate' ? Buffer.from([0xff]) : candidate);
        if (kind.name === 'backup') await writeFile(join(root, backup), Buffer.from([0xff]));
        const selectedTarget = kind.target ?? target;
        if (kind.target) {
          await mkdir(join(root, directory), { recursive: true });
          await writeFile(join(root, kind.target), original);
        }
        await baton(root, 'draft');
        const source = kind.source ?? 'specs/003-other/handoff.md';
        const protectedPath = await spelling.path(kind.path, root, t);
        if (protectedPath === null) return;
        const ref = { path: protectedPath, ...(kind.ref ?? { why: 'Protected source alias' }) };
        if (source.endsWith('.json')) {
          const schema = source === manifestSource ? 'manifest' : 'lock';
          const data = JSON.parse(await readFile(join(schema === 'lock' ? sourceRoot : root, source), 'utf8'));
          data[kind.field] = schema === 'lock' ? [{ ...data.files[0], path: protectedPath }] : [ref];
          assert.deepEqual(validateSchema(await loadSchemas(root), schema, data), []);
          await writeFile(join(root, source), JSON.stringify(data));
        } else {
          const quick = kind.name === 'quick';
          const { data, body } = parseFrontmatter(await readFile(quick
            ? join(sourceRoot, 'test/fixtures/handoffs/valid/quick/none.md')
            : join(root, `specs/${feature}/handoff.md`), 'utf8'));
          data.feature = quick ? 'other' : '003-other';
          data.read_first = [{ path: `specs/${feature}/research.md`, why: 'Draft context' }];
          data[kind.field] = [ref];
          if (kind.exclude) data.do_not_read = [{ path: target, why: 'Exclude required source before reading' }];
          await mkdir(dirname(join(root, source)), { recursive: true });
          assert.deepEqual(validateSchema(await loadSchemas(root), 'handoff', data), []);
          await writeFile(join(root, source), serializeFrontmatter(data, body));
        }
        const args = [kind.action ?? 'compact', '--feature', feature, '--target', selectedTarget,
          ...(kind.action === 'restore' ? [] : ['--candidate', proposed])];
        const message = spelling.unsafe
          ? `Unsafe context metadata path "${protectedPath}" declared by ${source}` : kind.message;
        const errorFile = spelling.unsafe ? source : selectedTarget;
        const before = await snapshot(root);
        const preview = await invoke(root, args);
        if (spelling.unsafe || kind.previewError) {
          assert.equal(preview.code, 1, JSON.stringify(preview.output));
          assert.equal(preview.output.errors[0].code, 'E_CONTEXT_PROTECTED');
          assert.equal(preview.output.errors[0].message, message);
          assert.equal(preview.output.errors[0].file, errorFile);
        } else {
          assert.equal(preview.code, 0, JSON.stringify(preview.output));
          assert.equal(preview.output.data.allowed, false);
          assert.deepEqual(preview.output.data.reasons, [message]);
        }
        assert.deepEqual(await snapshot(root), before);
        const result = await invoke(root, [...args, '--expect', digest, '--apply']);
        assert.equal(result.code, 1, JSON.stringify(result.output));
        assert.equal(result.output.errors[0].code, 'E_CONTEXT_PROTECTED');
        assert.equal(result.output.errors[0].message, message);
        assert.equal(result.output.errors[0].file, errorFile);
        if (spelling.unsafe && kind.name === 'directory') {
          const usage = await invoke(root, ['usage', '--feature', feature]);
          assert.equal(usage.code, 1, JSON.stringify(usage.output));
          assert.equal(usage.output.errors[0].message, message);
          assert.equal(usage.output.errors[0].file, source);
        }
        assert.deepEqual(await snapshot(root), before);
      });
    }
  }
});

test('context protection refuses real short-name aliases containing an earlier tilde', async (t) => {
  const { root } = await fixture(t);
  const path = `specs/${feature}/a~b-long-name.md`;
  await writeFile(join(root, path), '# Excluded candidate\nDo not use these bytes.\n');
  const alias = await shortAlias(t, root, path);
  if (alias === null) return;
  assert.match(basename(alias), /~.*~\d/i, `The generated alias must retain the original tilde: ${alias}`);
  await baton(root, 'draft');
  const source = `specs/${feature}/handoff.md`;
  const { data, body } = parseFrontmatter(await readFile(join(root, source), 'utf8'));
  data.do_not_read = [{ path: alias, why: 'Exclude the real Windows alias' }];
  assert.deepEqual(validateSchema(await loadSchemas(root), 'handoff', data), []);
  await writeFile(join(root, source), serializeFrontmatter(data, body));
  const before = await snapshot(root);
  const args = ['compact', '--feature', feature, '--target', target, '--candidate', path];
  for (const command of [args, [...args, '--expect', digest, '--apply'],
    ['scope', '--feature', feature], ['usage', '--feature', feature]]) {
    const result = await invoke(root, command);
    assert.equal(result.code, 1, JSON.stringify(result.output));
    assert.equal(result.output.errors[0].code, 'E_CONTEXT_PROTECTED');
    assert.equal(result.output.errors[0].message,
      `Unsafe context metadata path "${alias}" declared by ${source}`);
    assert.equal(result.output.errors[0].file, source);
    assert.equal(result.output.data, null);
    assert.deepEqual(await snapshot(root), before);
  }
});

test('context protection labels non-ENOENT metadata failures without exposing absolute paths', async (t) => {
  for (const code of ['EACCES', 'EPERM', 'ENAMETOOLONG']) {
    await t.test(code, async (t) => {
      const { root } = await fixture(t);
      await baton(root, 'draft');
      const path = 'vendor-real';
      const blocked = join(root, path);
      await mkdir(blocked);
      const source = `specs/${feature}/handoff.md`;
      const { data, body } = parseFrontmatter(await readFile(join(root, source), 'utf8'));
      data.do_not_read = [{ path, why: 'Unreadable excluded metadata' }];
      await writeFile(join(root, source), serializeFrontmatter(data, body));
      const before = await snapshot(root);
      const originalStat = filesystem.lstat;
      const mocked = t.mock.method(filesystem, 'lstat', (path) => path === blocked
        ? Promise.reject(Object.assign(new Error(`${code}: cannot stat ${blocked}`), { code }))
        : originalStat(path));
      syncBuiltinESMExports();
      try {
        await assert.rejects(contextProtection(root, 'token-budget'), (error) => {
          assert.equal(error.code, 'E_CONTEXT_PROTECTED');
          assert.equal(error.exitCode, 1);
          assert.equal(error.file, source);
          assert.equal(error.message, `Cannot verify context metadata path "${path}" declared by ${source}: ${code}`);
          assert.ok(!error.message.includes(root));
          return true;
        });
      } finally {
        mocked.mock.restore();
        syncBuiltinESMExports();
      }
      assert.deepEqual(await snapshot(root), before);
    });
  }
});

test('context protection rejects plain-named linked metadata before candidate use', async (t) => {
  for (const sourceKind of ['handoff', 'manifest']) {
    for (const kind of ['junction', 'hardlink', 'file-symlink']) {
      await t.test(`${sourceKind}/${kind}`, async (t) => {
        const { root } = await fixture(t);
        const candidate = 'vendor-real/x.md';
        const alias = kind === 'junction' ? 'vendor-alias' : 'vendor-alias.md';
        await mkdir(join(root, 'vendor-real'));
        await writeFile(join(root, candidate), '# Excluded through a plain alias\n');
        if (kind === 'junction') {
          await symlink(join(root, 'vendor-real'), join(root, alias),
            process.platform === 'win32' ? 'junction' : 'dir');
        } else if (kind === 'hardlink') {
          await link(join(root, candidate), join(root, alias));
        } else {
          try {
            await symlink(join(root, candidate), join(root, alias), 'file');
          } catch (error) {
            if (process.platform !== 'win32' || error.code !== 'EPERM') throw error;
            t.skip('Windows file symlink creation requires unavailable permission');
            return;
          }
        }
        await baton(root, 'draft');
        const source = sourceKind === 'handoff' ? `specs/${feature}/handoff.md` : '.baton/manifest.json';
        const declared = sourceKind === 'manifest' && kind === 'junction' ? `${alias}/x.md` : alias;
        if (sourceKind === 'handoff') {
          const { data, body } = parseFrontmatter(await readFile(join(root, source), 'utf8'));
          data.do_not_read = [{ path: declared, why: 'Excluded linked source' }];
          await writeFile(join(root, source), serializeFrontmatter(data, body));
        } else {
          const data = JSON.parse(await readFile(join(root, source), 'utf8'));
          data.files = [{ path: declared, sha256: digest, pack: 'core', owner: 'baton', managed: true }];
          assert.deepEqual(validateSchema(await loadSchemas(root), 'manifest', data), []);
          await writeFile(join(root, source), JSON.stringify(data));
        }
        const before = await snapshot(root);
        const args = ['compact', '--feature', feature, '--target', target, '--candidate', candidate];
        for (const command of [args, [...args, '--expect', digest, '--apply'],
          ['scope', '--feature', feature], ['usage', '--feature', feature]]) {
          const result = await invoke(root, command);
          assert.equal(result.code, 1, JSON.stringify(result.output));
          assert.equal(result.output.errors[0].code, 'E_CONTEXT_PROTECTED');
          assert.equal(result.output.errors[0].message,
            `Unsafe context metadata path "${declared}" declared by ${source}`);
          assert.equal(result.output.errors[0].file, source);
          assert.equal(result.output.data, null);
          assert.deepEqual(await snapshot(root), before);
        }
      });
    }
  }
});

test('context protection short-name helper validates its base before any platform skip', async (t) => {
  const { root } = await fixture(t);
  const noSkip = { skip: (message) => assert.fail(`Skipped before checking fixture existence: ${message}`) };
  await assert.rejects(shortAlias(noSkip, root, 'missing-file.md'), { code: 'ENOENT' });
});

test('context advisory accepts absent and existing literal short-shaped exclusions without reads', async (t) => {
  const { root } = await fixture(t);
  const absent = `specs/${feature}/ABSENT~1.MD`;
  const literal = `specs/${feature}/LITERA~1.MD`;
  await assert.rejects(readFile(join(root, absent)), { code: 'ENOENT' });
  await writeFile(join(root, literal), Buffer.from([0xff]));
  await baton(root, 'draft');
  const source = join(root, `specs/${feature}/handoff.md`);
  const { data, body } = parseFrontmatter(await readFile(source, 'utf8'));
  data.do_not_read = [absent, literal].map((path) => ({ path, why: 'Excluded, not an alias' }));
  assert.deepEqual(validateSchema(await loadSchemas(root), 'handoff', data), []);
  await writeFile(source, serializeFrontmatter(data, body));
  const before = await snapshot(root);
  for (const action of ['scope', 'usage']) {
    const result = await invoke(root, [action, '--feature', feature]);
    assert.equal(result.code, 0, JSON.stringify(result.output));
    assert.equal(result.output.data.report_only, true);
    assert.deepEqual(result.output.data.do_not_read, data.do_not_read);
    assert.ok(result.output.data.files.some((file) => file.path === target));
    assert.ok(result.output.data.files.every((file) => ![absent, literal].includes(file.path)));
  }
  const concise = await invoke(root, ['concise', 'on']);
  assert.equal(concise.code, 0, JSON.stringify(concise.output));
  assert.equal(concise.output.data.session_only, true);
  for (const action of ['run', 'tokens', 'learn']) {
    const result = await invoke(root, ['optimize', action]);
    assert.equal(result.code, 0, JSON.stringify(result.output));
    assert.equal(result.output.data.report_only, true);
  }
  const preview = await invoke(root, ['compact', '--feature', feature, '--target', target,
    '--candidate', 'candidate.md']);
  assert.equal(preview.code, 0, JSON.stringify(preview.output));
  assert.equal(preview.output.data.allowed, true);
  const excludedArgs = ['compact', '--feature', feature, '--target', target, '--candidate', literal];
  const excluded = await invoke(root, excludedArgs);
  assert.equal(excluded.code, 0, JSON.stringify(excluded.output));
  assert.equal(excluded.output.data.allowed, false);
  assert.deepEqual(excluded.output.data.reasons, ['Candidate is excluded from context']);
  const apply = await invoke(root, [...excludedArgs, '--expect', digest, '--apply']);
  assert.equal(apply.code, 1, JSON.stringify(apply.output));
  assert.equal(apply.output.errors[0].code, 'E_CONTEXT_PROTECTED');
  assert.equal(apply.output.errors[0].message, 'Candidate is excluded from context');
  assert.equal(apply.output.errors[0].file, target);
  assert.deepEqual(await snapshot(root), before);
});

test('context protection fails closed on metadata aliases of the repository root', async (t) => {
  for (const path of ['.', './', '././']) {
    await t.test(path, async (t) => {
      const { root } = await fixture(t);
      await baton(root, 'draft');
      const handoff = join(root, `specs/${feature}/handoff.md`);
      const { data, body } = parseFrontmatter(await readFile(handoff, 'utf8'));
      data.do_not_read = [{ path, why: 'Entire repository is excluded' }];
      assert.deepEqual(validateSchema(await loadSchemas(root), 'handoff', data), []);
      await writeFile(handoff, serializeFrontmatter(data, body));
      const before = await snapshot(root);
      const args = ['compact', '--feature', feature, '--target', target, '--candidate', 'candidate.md'];
      for (const flags of [[], ['--expect', digest, '--apply']]) {
        const result = await invoke(root, [...args, ...flags]);
        assert.equal(result.code, 1, JSON.stringify(result.output));
        assert.equal(result.output.errors[0].code, 'E_CONTEXT_PROTECTED');
        assert.equal(result.output.errors[0].message,
          `Unsafe context metadata path "${path}" declared by specs/${feature}/handoff.md`);
        assert.equal(result.output.errors[0].file, `specs/${feature}/handoff.md`);
      }
      assert.deepEqual(await snapshot(root), before);
    });
  }
});

test('context protection keeps unexcluded case-alias read_first and artifact targets bound', async (t) => {
  for (const path of [target.toUpperCase(), target.replace('/spec.md', '/Spec.md')]) {
    for (const field of ['read_first', 'artifacts']) {
      await t.test(`${field}/${path}`, async (t) => {
        const { root } = await fixture(t);
        await mkdir(dirname(join(root, path)), { recursive: true });
        await writeFile(join(root, path), original);
        await baton(root, 'draft');
        const handoff = join(root, `specs/${feature}/handoff.md`);
        const { data, body } = parseFrontmatter(await readFile(handoff, 'utf8'));
        data[field] = field === 'read_first' ? [{ path, why: 'Required unexcluded case alias' }]
          : [{ path, role: 'source-of-truth', sha256: hashArtifact(target, original) }];
        data.do_not_read = [];
        assert.deepEqual(validateSchema(await loadSchemas(root), 'handoff', data), []);
        await writeFile(handoff, serializeFrontmatter(data, body));
        const before = await snapshot(root);
        const args = ['compact', '--feature', feature, '--target', target, '--candidate', 'candidate.md'];
        const preview = await invoke(root, args);
        const message = 'Target is read_first, source/hash-bound or managed';
        assert.equal(preview.code, 0, JSON.stringify(preview.output));
        assert.equal(preview.output.data.allowed, false);
        assert.deepEqual(preview.output.data.reasons, [message]);
        assert.deepEqual(await snapshot(root), before);
        const apply = await invoke(root, [...args, '--expect', digest, '--apply']);
        assert.equal(apply.code, 1, JSON.stringify(apply.output));
        assert.equal(apply.output.errors[0].code, 'E_CONTEXT_PROTECTED');
        assert.equal(apply.output.errors[0].message, message);
        assert.equal(apply.output.errors[0].file, target);
        assert.deepEqual(await snapshot(root), before);
      });
    }
  }
});

test('context advisory preserves canonical tilde-number names in files directories and metadata', async (t) => {
  const { root } = await fixture(t);
  const research = `specs/${feature}/research~2.md`;
  const contract = `specs/${feature}/contracts/draft~1/api.md`;
  const longName = 'docs/v~2-notes.md';
  const shortName = 'docs/SPEC~1.MD';
  for (const path of [research, contract, longName, shortName]) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), '# Canonical filename, not an alias\n');
  }
  await baton(root, 'draft');
  const handoff = join(root, `specs/${feature}/handoff.md`);
  const { data, body } = parseFrontmatter(await readFile(handoff, 'utf8'));
  data.read_first = [longName, shortName].map((path) => ({ path, why: 'Canonical required source' }));
  data.do_not_read = [{ path: 'docs/v~3-absent.md', why: 'Excluded absent long name' }];
  assert.deepEqual(validateSchema(await loadSchemas(root), 'handoff', data), []);
  await writeFile(handoff, serializeFrontmatter(data, body));
  const quickPath = '.baton/quick/fix~1.md';
  const quick = parseFrontmatter(await readFile(join(sourceRoot, 'test/fixtures/handoffs/valid/quick/none.md'), 'utf8'));
  quick.data.read_first = [{ path: quickPath, why: 'Canonical quick source' }];
  await mkdir(join(root, '.baton/quick'), { recursive: true });
  assert.deepEqual(validateSchema(await loadSchemas(root), 'handoff', quick.data), []);
  await writeFile(join(root, quickPath), serializeFrontmatter(quick.data, quick.body));
  const manifestPath = join(root, '.baton/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.files.push({ path: shortName, sha256: digest, pack: 'core', owner: 'baton', managed: true });
  await writeFile(manifestPath, JSON.stringify(manifest));
  const lock = JSON.parse(await readFile(join(sourceRoot, 'baton.lock.json'), 'utf8'));
  lock.files = [{ ...lock.files[0], path: shortName }];
  assert.deepEqual(validateSchema(await loadSchemas(root), 'lock', lock), []);
  await writeFile(join(root, 'baton.lock.json'), JSON.stringify(lock));
  const before = await snapshot(root);
  for (const action of ['scope', 'usage']) {
    const result = await invoke(root, [action, '--feature', feature]);
    assert.equal(result.code, 0, JSON.stringify(result.output));
    assert.deepEqual(result.output.data.read_first, data.read_first);
    for (const path of [research, contract]) assert.ok(result.output.data.files.some((file) => file.path === path));
  }
  assert.equal((await invoke(root, ['concise', 'on'])).code, 0);
  const preview = await invoke(root, ['compact', '--feature', feature, '--target', target]);
  assert.equal(preview.code, 0, JSON.stringify(preview.output));
  assert.equal(preview.output.data.allowed, true);
  assert.deepEqual(await snapshot(root), before);
});

test('context protection labels unsafe CLI candidate paths without misidentifying metadata', async (t) => {
  for (const path of ['/tmp/candidate.md', 'C:\\temp\\candidate.md', 'drafts/candidate.md.',
    'drafts/candidate.md ', 'drafts/CANDID~1.MD']) {
    await t.test(path, async (t) => {
      const { root } = await fixture(t);
      const before = await snapshot(root);
      for (const flags of [[], ['--expect', digest, '--apply']]) {
        const result = await invoke(root, ['compact', '--feature', feature, '--target', target,
          '--candidate', path, ...flags]);
        assert.equal(result.code, 1, JSON.stringify(result.output));
        assert.equal(result.output.errors[0].code, 'E_CONTEXT_PROTECTED');
        assert.equal(result.output.errors[0].message, 'Unsafe context path');
        assert.equal(result.output.errors[0].file, path);
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
  assert.equal(preview.output.data.applied, false);
  assert.equal(preview.output.data.backup_path, `specs/${feature}/spec.full.md`);
  assert.equal(preview.output.data.backup_sha256, null);
  assert.match(preview.output.data.reasons.join('; '), /backup.*missing/i);
  assert.deepEqual(await snapshot(root), before);
  const result = await invoke(root, ['restore', ...args, '--expect', digest, '--apply']);
  assert.equal(result.code, 1);
  assert.equal(result.output.errors[0].code, 'E_CONTEXT_PROTECTED');
  assert.match(result.output.errors[0].message, /backup.*missing/i);
  assert.match(result.output.errors[0].message, new RegExp(`specs/${feature}/spec\\.full\\.md`));
  assert.deepEqual(await snapshot(root), before);
  await writeFile(join(root, `specs/${feature}/spec.full.md`), original);
  const conflictBefore = await snapshot(root);
  const conflict = await invoke(root, ['compact', ...args, '--candidate', 'candidate.md']);
  assert.equal(conflict.code, 0, JSON.stringify(conflict.output));
  assert.equal(conflict.output.data.allowed, false);
  assert.equal(conflict.output.data.applied, false);
  assert.equal(conflict.output.data.backup_path, `specs/${feature}/spec.full.md`);
  assert.equal(conflict.output.data.backup_sha256, digest);
  assert.match(conflict.output.data.reasons.join('; '), /backup.*(?:exists|overwrit)/i);
  assert.deepEqual(await snapshot(root), conflictBefore);
  const apply = await invoke(root, ['compact', ...args, '--candidate', 'candidate.md', '--expect', digest, '--apply']);
  assert.equal(apply.code, 4);
  assert.equal(apply.output.errors[0].code, 'E_CONFLICT');
  assert.deepEqual(await snapshot(root), conflictBefore);
});

test('context output wrappers expose preview limits and exact refusal causes', async () => {
  for (const action of ['compact', 'restore']) {
    const skill = `speckit-token-budget-${action}/SKILL.md`;
    const source = await readFile(join(sourceRoot, 'baton/skills', skill), 'utf8');
    assert.equal(await readFile(join(sourceRoot, 'packs/token-budget/files/.github/skills', skill), 'utf8'), source);
    assert.match(source, /E_CONFLICT/);
    assert.match(source, /stale.*digest|digest.*stale/);
    if (action === 'restore') {
      assert.match(source, /backup_sha256/);
      assert.match(source, /warning/);
      assert.match(source, /informational/);
    } else {
      assert.match(source, /eligibility/);
      assert.match(source, /repository-relative/);
    }
  }
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
