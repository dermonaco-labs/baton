import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/** @param {string | Uint8Array} bytes */
export function hashBytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** @param {string} path @param {string | Buffer} bytes */
export function hashArtifact(path, bytes) {
  const text = typeof bytes === 'string' ? bytes : Buffer.from(bytes).toString('utf8');
  if (typeof bytes !== 'string' && (!Buffer.from(text).equals(Buffer.from(bytes)) || text.includes('\0'))) return hashBytes(bytes);
  const normalized = text.replace(/\r\n/g, '\n');
  return hashBytes(/(?:^|[\\/])tasks\.md$/.test(path)
    ? normalized.replace(/^(\s*- )\[[xX]\]/gm, '$1[ ]') : normalized);
}

/** @param {string | Uint8Array} bytes */
export function hashManaged(bytes) {
  const text = typeof bytes === 'string' ? bytes : Buffer.from(bytes).toString('utf8');
  if (typeof bytes !== 'string' && (!Buffer.from(text).equals(Buffer.from(bytes)) || text.includes('\0'))) return hashBytes(bytes);
  return hashBytes(text.replace(/\r\n/g, '\n'));
}

/** @param {string} path */
export async function hashFile(path) {
  return hashArtifact(path, await readFile(path));
}

/** @param {string[]} paths */
export async function hashFiles(paths) {
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [path, await hashFile(path)])));
}
