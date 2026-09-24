import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateHandoff } from '../../src/lib/handoff.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';

const root = resolve(import.meta.dirname, '../..');
const path = 'specs/001-baton-template/handoff.md';

test('dogfood handoff satisfies its schema, phase contract, hashes and gate', async () => {
  assert.deepEqual(await validateHandoff(root, path), []);
});

test('malformed frontmatter is reported as E_FRONTMATTER_MALFORMED', async () => {
  const source = await readFile(resolve(root, path), 'utf8');
  const errors = await validateHandoff(root, path, `broken\n${source}`);
  assert.equal(errors[0]?.code, 'E_FRONTMATTER_MALFORMED');
});

test('ready with a blocking question is rejected', async () => {
  const source = await readFile(resolve(root, path), 'utf8');
  const { data, body } = parseFrontmatter(source);
  data.status = 'ready';
  data.open_questions = [{ id: 'Q1', question: 'Who decides?', blocking: true, options: ['repository owner'] }];
  assert.ok((await validateHandoff(root, path, serializeFrontmatter(data, body))).some((error) => error.code === 'E_BLOCKING_OPEN'));
});

test('role-only A5 examples reject malformed approvers and actors with their stable codes', async () => {
  const samples = JSON.parse(await readFile(resolve(root, 'test/fixtures/handoffs/role-formats.json'), 'utf8'));
  const { data, body } = parseFrontmatter(await readFile(resolve(root, path), 'utf8'));
  for (const sample of samples.valid) {
    const variant = structuredClone(data);
    variant.gate.approved_by = sample.approved_by;
    variant.updated_by = sample.actor;
    assert.deepEqual(await validateHandoff(root, path, serializeFrontmatter(variant, body)), [], JSON.stringify(sample));
  }
  for (const sample of samples.invalid_approvers) {
    const variant = structuredClone(data);
    variant.gate.approved_by = sample.approved_by;
    const errors = await validateHandoff(root, path, serializeFrontmatter(variant, body));
    assert.ok(errors.some((entry) => entry.code === 'E_APPROVER_FORMAT'), JSON.stringify(sample));
    assert.ok(!errors.some((entry) => entry.code === 'E_SCHEMA'), JSON.stringify(sample));
  }
  for (const sample of samples.invalid_actors) {
    const variant = structuredClone(data);
    variant.updated_by = sample.actor;
    const errors = await validateHandoff(root, path, serializeFrontmatter(variant, body));
    assert.ok(errors.some((entry) => entry.code === 'E_ACTOR_FORMAT'), JSON.stringify(sample));
    assert.ok(!errors.some((entry) => entry.code === 'E_SCHEMA'), JSON.stringify(sample));
  }
});
