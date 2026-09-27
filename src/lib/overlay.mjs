import { lstat, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { hashBytes } from './hash.mjs';
import { withinRoot } from './manifest.mjs';
import { BatonError } from './report.mjs';

/** @param {string} root @param {string} path */
export async function safePath(root, path) {
  const target = withinRoot(root, path);
  let cursor = resolve(root);
  for (const part of relative(cursor, target).split(sep).filter(Boolean)) {
    cursor = resolve(cursor, part);
    try {
      if ((await lstat(cursor)).isSymbolicLink()) {
        throw new BatonError('E_PATH', `Refusing to follow a symlink: ${path}`);
      }
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    }
  }
  return target;
}

/** @param {string} root @param {string} path */
export async function optionalBytes(root, path) {
  try { return await readFile(await safePath(root, path)); }
  catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return null;
    throw error;
  }
}

/** @param {string} root @param {string} path @param {Buffer|string} bytes */
export async function putBytes(root, path, bytes) {
  const target = await safePath(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

/** @param {string} glob */
function pattern(glob) {
  return new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
}

/** @param {string[]} globs @param {string} path */
export function matches(globs, path) {
  return globs.some(glob => pattern(glob).test(path));
}

/** @param {Buffer|string} value */
export function digest(value) { return hashBytes(value); }

/** @param {unknown} value */
export function parsedObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
