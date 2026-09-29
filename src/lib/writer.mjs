import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { hashBytes } from './hash.mjs';
import { withinRoot } from './manifest.mjs';
import { BatonError } from './report.mjs';

/** @param {string} root */
export async function writerHash(root) {
  const path = withinRoot(root, '.baton/.local/session.json');
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(path, JSON.stringify({ token: randomBytes(32).toString('hex') }) + '\n', { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'EEXIST') throw error;
  }
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new BatonError('E_CHECKOUT_TOKEN', 'Invalid .baton/.local/session.json; remove that file to regenerate the checkout token', 2);
  }
  if (typeof parsed.token !== 'string' || !/^[a-f0-9]{64}$/.test(parsed.token)) {
    throw new BatonError('E_CHECKOUT_TOKEN', 'Invalid .baton/.local/session.json; remove that file to regenerate the checkout token', 2);
  }
  return hashBytes(parsed.token);
}
