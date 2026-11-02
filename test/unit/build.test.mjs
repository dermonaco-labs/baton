import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { BUNDLE_LIMIT_BYTES, buildBundle, checkBundleSize } from '../../src/commands/build.mjs';

test('bundle size diagnostic reports the enforced strict limit', () => {
  assert.equal(BUNDLE_LIMIT_BYTES, 460800);
  assert.doesNotThrow(() => checkBundleSize(460799));
  assert.throws(() => checkBundleSize(460800),
    { code: 'E_BUNDLE_SIZE', message: 'Bundle is 460800 bytes (limit: 460800)' });
});

test('bundle inventory includes bundled runtime dependencies and stays within budget', async () => {
  const root = resolve(import.meta.dirname, '../..');
  const { bytes, packages } = await buildBundle(root, true);
  assert.ok(bytes < 450 * 1024);
  for (const name of ['ajv', 'ajv-formats', 'yaml', 'fast-uri', 'fast-deep-equal', 'json-schema-traverse']) {
    assert.ok(packages.includes(name), `missing bundled package ${name}`);
  }
});
