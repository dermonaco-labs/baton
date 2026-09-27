import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sourceRoot, tempRepo } from '../helpers/index.mjs';
import { payloadBytes } from '../../src/lib/payload.mjs';

test('npm-packed payload retains exact bytes for nested gitignore files', async () => {
  const { root, cleanup } = await tempRepo();
  try {
    for (const [path, mirror] of [
      ['.specify/.gitignore', 'baton/templates/specify.gitignore'],
      ['packs/learning/files/.atv/.gitignore', 'baton/templates/atv.gitignore'],
    ]) {
      const expected = await readFile(join(sourceRoot, path));
      const mirrored = await readFile(join(sourceRoot, mirror));
      assert.deepEqual(mirrored, expected, mirror);
      const destination = join(root, mirror);
      const { mkdir, writeFile } = await import('node:fs/promises');
      const { dirname } = await import('node:path');
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, mirrored);
      assert.deepEqual(await payloadBytes(root, path), expected);
    }
  } finally { await cleanup(); }
});
