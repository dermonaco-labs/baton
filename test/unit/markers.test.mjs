import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeMarker, removeMarker } from '../../src/lib/markers.mjs';

test('inserts and replaces a managed section without changing user bytes', () => {
  const original = 'user\r\ntext\r\n';
  const installed = mergeMarker(original, 'BATON', 'managed\n');
  assert.ok(installed.startsWith(original));
  assert.equal(mergeMarker(installed, 'BATON', 'new\n'), `${original}<!-- BATON:START -->\nnew\n<!-- BATON:END -->\n`);
  assert.equal(removeMarker(installed, 'BATON'), original);
});

test('unbalanced marker fails rather than duplicating content', () => {
  assert.throws(() => mergeMarker('<!-- BATON:START -->\n', 'BATON', 'text'), /marker/i);
});
