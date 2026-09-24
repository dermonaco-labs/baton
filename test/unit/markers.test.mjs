import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeMarker, removeMarker } from '../../src/lib/markers.mjs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

test('shipped instructions contain the authored BATON section without altering other sections', async () => {
  const root = resolve(import.meta.dirname, '../..');
  const authored = await readFile(resolve(root, 'baton/instructions/copilot-instructions.baton.md'), 'utf8');
  const installed = await readFile(resolve(root, '.github/copilot-instructions.md'), 'utf8');
  assert.ok(installed.includes(authored));
  assert.equal((installed.match(/<!-- BATON:START -->/g) ?? []).length, 1);
});
