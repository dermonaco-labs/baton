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

test('artifact hashes normalize CRLF without changing existing LF digests', () => {
  for (const path of ['specs/001/handoff.md', 'specs/001/spec.md', 'specs/001/review.json', 'specs/001/tasks.md']) {
    const lf = '- [ ] T001 build\nmore text\n';
    assert.equal(hashArtifact(path, Buffer.from(lf.replace(/\n/g, '\r\n'))), hashArtifact(path, lf));
    if (!path.endsWith('tasks.md')) assert.equal(hashArtifact(path, lf), hashBytes(lf));
  }
  assert.equal(hashArtifact('image.bin', Buffer.from([0, 13, 10, 255])),
    hashBytes(Buffer.from([0, 13, 10, 255])));
});
