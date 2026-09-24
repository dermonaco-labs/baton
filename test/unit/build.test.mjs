import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { buildBundle } from '../../src/commands/build.mjs';

test('bundle inventory includes bundled runtime dependencies and stays within budget', async () => {
  const root = resolve(import.meta.dirname, '../..');
  const { bytes, packages } = await buildBundle(root, true);
  assert.ok(bytes < 400 * 1024);
  for (const name of ['ajv', 'ajv-formats', 'yaml', 'fast-uri', 'fast-deep-equal', 'json-schema-traverse']) {
    assert.ok(packages.includes(name), `missing bundled package ${name}`);
  }
});
