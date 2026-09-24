import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { loadSchemas, validateSchema } from '../../src/lib/schema.mjs';

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
