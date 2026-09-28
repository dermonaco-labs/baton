import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import YAML from 'yaml';
import { phaseDefaults } from '../../src/lib/phases.mjs';

test('built-in phase defaults deeply match the shipped phase template', async () => {
  const template = YAML.parse(await readFile(new URL('../../baton/templates/phases.yml', import.meta.url), 'utf8'));
  const normalized = structuredClone(template);
  function normalizeChecks(checks) {
    for (const check of checks) {
      if (check.path?.startsWith('{feature_dir}/')) check.path = check.path.slice('{feature_dir}/'.length);
      if (check.all_of) normalizeChecks(check.all_of);
      if (check.any_of) normalizeChecks(check.any_of);
    }
  }
  for (const phase of Object.values(normalized.phases)) {
    normalizeChecks(phase.entry);
    normalizeChecks(phase.exit);
    for (const override of Object.values(phase.by_lane ?? {})) {
      if (override.entry) normalizeChecks(override.entry);
      if (override.exit) normalizeChecks(override.exit);
    }
  }
  assert.deepEqual(phaseDefaults, normalized);
});
