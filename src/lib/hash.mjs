import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/** @param {string | Uint8Array} bytes */
export function hashBytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** @param {string} path @param {string | Buffer} bytes */
export function hashArtifact(path, bytes) {
  if (!/(?:^|[\\/])tasks\.md$/.test(path)) return hashBytes(bytes);
  const text = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : bytes;
  return hashBytes(text.replace(/^(\s*- )\[[xX]\]/gm, '$1[ ]'));
}

/** @param {string} path */
export async function hashFile(path) {
  return hashArtifact(path, await readFile(path));
}

/** @param {string[]} paths */
export async function hashFiles(paths) {
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [path, await hashFile(path)])));
}
