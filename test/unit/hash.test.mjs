import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { hashBytes, hashArtifact } from '../../src/lib/hash.mjs';

test('hashes raw bytes without changing line endings', () => {
  const input = Buffer.from('a\r\nb\n');
  assert.equal(hashBytes(input), createHash('sha256').update(input).digest('hex'));
  assert.notEqual(hashBytes(input), hashBytes(Buffer.from('a\nb\n')));
});

test('tasks checkbox progress is not a semantic change', () => {
  assert.equal(hashArtifact('specs/001/tasks.md', '- [ ] T001 build\n'),
    hashArtifact('specs/001/tasks.md', '- [x] T001 build\n'));
  assert.notEqual(hashArtifact('specs/001/tasks.md', '- [ ] T001 build\n'),
    hashArtifact('specs/001/tasks.md', '- [x] T001 break\n'));
  assert.notEqual(hashArtifact('specs/001/spec.md', '- [ ] T001 build\n'),
    hashArtifact('specs/001/spec.md', '- [x] T001 build\n'));
});
