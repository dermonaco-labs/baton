import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { hashBytes } from './hash.mjs';
import { withinRoot } from './manifest.mjs';

/** @param {string} root */
export async function writerHash(root) {
  const path = withinRoot(root, '.baton/.local/session.json');
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(path, JSON.stringify({ token: randomBytes(32).toString('hex') }) + '\n', { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'EEXIST') throw error;
  }
  const parsed = JSON.parse(await readFile(path, 'utf8'));
  if (typeof parsed.token !== 'string' || !/^[a-f0-9]{64}$/.test(parsed.token)) {
    throw new Error('Invalid checkout writer token in .baton/.local/session.json');
  }
  return hashBytes(parsed.token);
}
