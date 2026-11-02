import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashArtifact, hashBytes } from '../../src/lib/hash.mjs';
import { contextTarget } from '../../src/lib/context-guards.mjs';

test('context guards restrict writable artifact paths instead of relying on prompt instructions', () => {
  for (const name of ['spec.md', 'plan.md', 'tasks.md', 'research.md', 'data-model.md', 'quickstart.md', 'contracts/api.md']) {
    assert.equal(contextTarget('002-draft', `specs/002-draft/${name}`), `specs/002-draft/${name}`);
  }
  for (const path of ['AGENTS.md', '.specify/memory/constitution.md', 'specs/002-draft/handoff.md',
    'specs/002-draft/spec.full.md', 'specs/002-draft/contracts/constitution.md',
    'specs/002-draft/../002-draft/spec.md', 'specs/003-other/spec.md']) {
    assert.throws(() => contextTarget('002-draft', path), /draft|target|path|protected/i);
  }
});

test('context guards retain existing artifact normalization and strict raw integrity semantics', () => {
  assert.equal(hashArtifact('tasks.md', '- [ ] T001 work\n'), hashArtifact('tasks.md', '- [x] T001 work\r\n'));
  assert.notEqual(hashBytes('a\r\n'), hashBytes('a\n'));
});
