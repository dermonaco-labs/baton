import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { hashBytes } from './hash.mjs';
import { withinRoot } from './manifest.mjs';
import { BatonError } from './report.mjs';

const execFileAsync = promisify(execFile);

/** @param {string} root */
export async function checkoutHash(root) {
  let gitPath;
  try {
    gitPath = (await execFileAsync('git', ['rev-parse', '--git-path', 'baton/checkout-id'],
      { cwd: root, windowsHide: true })).stdout.trim();
  } catch (error) {
    if ([128, 'ENOENT'].includes(/** @type {{code?:number|string}} */ (error).code ?? '')) return null;
    throw error;
  }
  const path = resolve(root, gitPath);
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(path, randomBytes(32).toString('hex') + '\n', { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'EEXIST') throw error;
  }
  const identity = (await readFile(path, 'utf8')).trim();
  if (!/^[a-f0-9]{64}$/.test(identity)) {
    throw new BatonError('E_CHECKOUT_TOKEN', 'Invalid git checkout identity; remove git-path baton/checkout-id to regenerate it', 2);
  }
  return hashBytes(identity);
}

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
  if (!parsed || typeof parsed !== 'object' || typeof parsed.token !== 'string' || !/^[a-f0-9]{64}$/.test(parsed.token)) {
    throw new BatonError('E_CHECKOUT_TOKEN', 'Invalid .baton/.local/session.json; remove that file to regenerate the checkout token', 2);
  }
  return hashBytes(parsed.token);
}
