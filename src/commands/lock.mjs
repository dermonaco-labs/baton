import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { sha256, UpstreamError } from '../lib/upstream.mjs';

/** @param {{cwd?:string}} [options] */
export function verifyLock({ cwd = process.cwd() } = {}) {
  const root = resolve(cwd);
  const file = join(root, 'baton.lock.json');
  if (!existsSync(file)) throw new UpstreamError('E_LOCK_MISMATCH', 'baton.lock.json is missing');
  const lock = JSON.parse(readFileSync(file, 'utf8'));
  /** @type {string[]} */
  const mismatch = [];
  if (lock.schema !== 1 || !Array.isArray(lock.files)) {
    throw new UpstreamError('E_LOCK_MISMATCH', 'Unsupported or malformed lock format');
  }
  /** @param {string|undefined} path @param {string|undefined} hash */
  const check = (path, hash) => {
    if (typeof path !== 'string' || !/^[a-f0-9]{64}$/.test(hash || '') ||
        path.startsWith('/') || /^[a-z]:/i.test(path) ||
        path.split(/[\\/]/).some(part => part === '.' || part === '..')) {
      mismatch.push(`invalid lock entry ${path}`);
      return;
    }
    const target = join(root, ...path.split('/'));
    if (!existsSync(target) || lstatSync(target).isSymbolicLink() ||
        relative(root, realpathSync(target)).startsWith('..') ||
        sha256(readFileSync(target)) !== hash) {
      mismatch.push(path);
    }
  };
  check(lock.upstreams?.speckit?.requirements, lock.upstreams?.speckit?.requirements_sha256);
  const input = join(root, 'baton', 'upstream', 'specify-cli.requirements.in');
  if (!existsSync(input) || readFileSync(input, 'utf8').trim() !==
      `specify-cli==${lock.upstreams?.speckit?.version}`) {
    mismatch.push('baton/upstream/specify-cli.requirements.in');
  }
  /** @type {Set<string>} */
  const unique = new Set();
  for (const entry of lock.files) {
    if (unique.has(entry.stored_at)) mismatch.push(`duplicate ${entry.stored_at}`);
    unique.add(entry.stored_at);
    check(entry.stored_at, entry.sha256);
  }
  if (mismatch.length) throw new UpstreamError('E_LOCK_MISMATCH', mismatch.join('\n'));
  return { ok: true, files: lock.files.length };
}

/** @param {string} cwd @param {string[]} [argv] */
export function run(cwd, argv = []) {
  if (argv.length !== 1 || argv[0] !== 'verify') {
    return { errors: [{ code: 'E_USAGE', message: 'Expected: lock verify' }], exitCode: 2 };
  }
  try {
    return { data: verifyLock({ cwd }), errors: [] };
  } catch (error) {
    if (!(error instanceof UpstreamError)) throw error;
    return { errors: [{ code: error.code, message: error.message.replace(`${error.code} `, '') }], exitCode: 1 };
  }
}

export default verifyLock;
