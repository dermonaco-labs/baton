import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { run as handoff } from '../../src/commands/handoff.mjs';
import { parseFrontmatter } from '../../src/lib/frontmatter.mjs';
import { sourceRoot } from '../helpers/index.mjs';

const feature = '001-sample';
const path = `specs/${feature}/handoff.md`;

async function workspace() {
  const root = await mkdtemp(join(tmpdir(), 'baton-handoff-'));
  await mkdir(join(root, 'specs'), { recursive: true });
  await cp(join(sourceRoot, 'test/fixtures/features/sample'), join(root, 'specs', feature), { recursive: true });
  await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
  await rm(join(root, path), { force: true });
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test('new creates a feature baton after specify without losing the spec evidence', async () => {
  const { root, cleanup } = await workspace();
  try {
    const result = await handoff(root, ['new', '--feature', feature]);
    assert.deepEqual(result.errors ?? [], []);
    const { data } = parseFrontmatter(await readFile(join(root, path), 'utf8'));
    assert.equal(data.phase_completed, 'specify');
    assert.equal(data.next_phase, 'clarify');
    assert.ok(data.artifacts.some((entry) => entry.path === `specs/${feature}/spec.md` && entry.sha256));
    assert.deepEqual((await handoff(root, ['receive', '--phase', 'clarify', '--feature', feature])).errors, []);
  } finally {
    await cleanup();
  }
});

test('init --infer requires a human to confirm the inferred feature phase', async () => {
  const { root, cleanup } = await workspace();
  try {
    const result = await handoff(root, ['init', '--infer', '--feature', feature]);
    assert.deepEqual(result.errors ?? [], []);
    const { data } = parseFrontmatter(await readFile(join(root, path), 'utf8'));
    assert.equal(data.status, 'needs-human');
    assert.ok(data.open_questions.some((question) => question.blocking));
    assert.equal((await handoff(root, ['receive', '--phase', 'clarify', '--feature', feature])).exitCode, 3);
  } finally {
    await cleanup();
  }
});

test('migrate reports schema one as current without changing its bytes', async () => {
  const { root, cleanup } = await workspace();
  try {
    await handoff(root, ['new', '--feature', feature]);
    const before = await readFile(join(root, path), 'utf8');
    assert.equal((await handoff(root, ['migrate', '--feature', feature, '--dry-run'])).data.migrated, false);
    assert.equal((await handoff(root, ['migrate', '--feature', feature])).data.migrated, false);
    assert.equal(await readFile(join(root, path), 'utf8'), before);
  } finally {
    await cleanup();
  }
});
