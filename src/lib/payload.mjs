import { readFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BatonError } from './report.mjs';
import { safePath } from './overlay.mjs';

const adjacent = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const mirrors = new Map([
  ['.specify/.gitignore', 'baton/templates/specify.gitignore'],
  ['packs/learning/files/.atv/.gitignore', 'baton/templates/atv.gitignore'],
]);

/** @param {string} root @param {string} path */
export async function payloadBytes(root, path) {
  try { return await readFile(await safePath(root, path)); }
  catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT' || !mirrors.has(path)) throw error;
    return readFile(await safePath(root, /** @type {string} */ (mirrors.get(path))));
  }
}

/** @param {string} root */
async function hasPayload(root) {
  try {
    await Promise.all(['baton.lock.json', 'packs/core.yml', '.baton/bin/baton.mjs'].map(path => stat(join(root, path))));
    return true;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;
    throw error;
  }
}

/** @param {string|undefined} archive */
export async function resolvePayload(archive) {
  if (!archive && await hasPayload(adjacent)) return { root: adjacent, cleanup: async () => {} };
  if (!archive) throw new BatonError('E_PREREQUISITE',
    'The standalone baton.mjs has no adjacent payload; pass --from baton-template-vX.Y.Z.tar.gz', 5);
  try {
    await stat(archive);
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') {
      throw new BatonError('E_PREREQUISITE', `Payload archive not found: ${archive}`, 5);
    }
    throw error;
  }
  const dir = await mkdtemp(join(tmpdir(), 'baton-payload-'));
  try {
    const extracted = spawnSync('tar', ['-xzf', archive, '-C', dir], { encoding: 'utf8', windowsHide: true });
    if (extracted.error || extracted.status !== 0) {
      throw new BatonError('E_PREREQUISITE', `Cannot extract payload archive: ${extracted.stderr || extracted.error?.message}`, 5);
    }
    if (!await hasPayload(dir)) throw new BatonError('E_PREREQUISITE', 'Archive does not contain a Baton payload', 5);
    const lock = JSON.parse(await readFile(join(dir, 'baton.lock.json'), 'utf8'));
    if (lock.schema !== 1) throw new BatonError('E_PREREQUISITE', 'Archive has an unsupported Baton lock', 5);
    return { root: dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
}
