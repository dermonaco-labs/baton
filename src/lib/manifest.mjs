import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { hashFile } from './hash.mjs';

/** @param {string} root @param {string} path */
export function withinRoot(root, path) {
  const base = resolve(root);
  const target = resolve(base, path);
  if (target !== base && !target.startsWith(base + sep)) throw new Error(`Path escapes repository: ${path}`);
  return target;
}

/** @param {string} root */
export async function readManifest(root) {
  return JSON.parse(await readFile(withinRoot(root, '.baton/manifest.json'), 'utf8'));
}

/** @param {string} root @param {unknown} manifest */
export async function writeManifest(root, manifest) {
  const target = withinRoot(root, '.baton/manifest.json');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(manifest, null, 2) + '\n');
}

/** @param {string} root @param {{path:string,sha256:string}} entry */
export async function isUserModified(root, entry) {
  try {
    return await hashFile(withinRoot(root, entry.path)) !== entry.sha256;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return true;
    throw error;
  }
}
