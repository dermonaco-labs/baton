import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { OPTIONAL_PIN_FIELDS, OPTIONAL_SOURCES, sha256, UpstreamError } from '../lib/upstream.mjs';

/** @param {{cwd?:string}} [options] */
export function verifyLock({ cwd = process.cwd() } = {}) {
  const root = resolve(cwd);
  const file = join(root, 'baton.lock.json');
  if (!existsSync(file)) throw new UpstreamError('E_LOCK_MISMATCH', 'baton.lock.json is missing');
  let lock;
  try {
    lock = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new UpstreamError('E_LOCK_MISMATCH', `baton.lock.json is not valid JSON: ${error.message}`);
    throw error;
  }
  /** @type {string[]} */
  const mismatch = [];
  if (!lock || lock.schema !== 1 || !Array.isArray(lock.files)) {
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
  const upstreams = lock.upstreams && typeof lock.upstreams === 'object' ? lock.upstreams : {};
  for (const id of Object.keys(upstreams)) {
    if (!['speckit', 'atv'].includes(id) && !id.startsWith('x-') && !Object.hasOwn(OPTIONAL_SOURCES, id)) {
      mismatch.push(`unknown upstream ${id}`);
    }
  }
  for (const [id, pin] of Object.entries(OPTIONAL_SOURCES)) {
    const locked = upstreams[id];
    if (!locked) continue;
    for (const field of OPTIONAL_PIN_FIELDS) {
      if (locked[field] !== pin[field]) mismatch.push(`upstream ${id} ${field} differs from the vetted ${pin.repo} ${pin.tag} pin`);
    }
  }
  for (const entry of lock.files) {
    if (!entry || typeof entry !== 'object') {
      mismatch.push('invalid lock entry');
      continue;
    }
    if (unique.has(entry.stored_at)) mismatch.push(`duplicate ${entry.stored_at}`);
    unique.add(entry.stored_at);
    check(entry.stored_at, entry.sha256);
    if (Object.hasOwn(OPTIONAL_SOURCES, entry.upstream)) {
      const id = entry.upstream;
      /** @param {string} field @param {string} [expected] */
      const invalid = (field, expected) =>
        mismatch.push(`${id} row ${entry.stored_at} has invalid ${field}${expected ? ` (expected ${expected})` : ''}`);
      // Optional sources are vendored raw: no repair, MIT, owned only by their pack, under its vendor directory.
      if (!upstreams[id]) mismatch.push(`upstream ${id} pin is missing for ${entry.stored_at}`);
      if (typeof entry.upstream_path !== 'string' ||
          entry.upstream_path.split('/').some((/** @type {string} */ part) => !part || part === '.' || part === '..')) {
        invalid('upstream_path');
      } else {
        const path = `.baton/vendor/${id}/${entry.upstream_path}`;
        if (entry.path !== path) invalid('path', path);
        if (entry.stored_at !== `packs/${id}/files/${path}`) invalid('stored_at', `packs/${id}/files/${path}`);
      }
      if (entry.sha256 !== entry.sha256_upstream) invalid('sha256_upstream');
      if (entry.repair !== null) invalid('repair');
      if (entry.license !== 'MIT') invalid('license');
      if (!Array.isArray(entry.packs) || entry.packs.length !== 1 || entry.packs[0] !== id) invalid('packs');
    }
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
