// Cross-file bindings a candidate must keep with trusted base bytes. Node built-ins only: the token-holding
// publish job runs this without installing dependencies and never executes candidate content.
import { createHash } from 'node:crypto';
import { diffDocument, formatBumpSummary } from './lock-report.mjs';

export const LOCK_PATH = 'baton.lock.json';
export const DIFF_PATH = 'docs/reference/upstream-diff.md';
export const REQUIREMENTS_IN = 'baton/upstream/specify-cli.requirements.in';
export const REQUIREMENTS_TXT = 'baton/upstream/specify-cli.requirements.txt';
export const HOOKS_PATH = '.specify/extensions.yml';
/**
 * Trusted roots: Spec Kit's extension and preset installs, their registries and Baton's own extension and preset
 * (FR-031). A candidate may neither change, add nor delete anything here; deterministic install-time metadata is
 * already normalized by sync, which keeps the base `installed_at`/`updated_at`, so legitimate candidates reproduce
 * the base bytes.
 */
export const BOUND_ROOTS = Object.freeze(['.specify/extensions/', '.specify/presets/']);
const MANUAL = 'changes here need a manual reviewed update (FR-031)';

/** @param {Buffer|string} bytes */
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/**
 * A bounded, printable-ASCII rendering of an unexpected error's message for a blocker reason.
 * @param {unknown} error
 */
export function errorCause(error) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const text = message.replace(/[^\x20-\x7e]+/g, ' ').replace(/ +/g, ' ').trim();
  return text.length > 200 ? `${text.slice(0, 197)}...` : text || 'unknown error';
}

/**
 * Why `requirements.txt` is not a hash-locked uv compile of `specify-cli==<version>`, or null. The file must be
 * printable ASCII with `\n` line ends, so every line break pip honours is one this check sees.
 * @param {Buffer} bytes @param {string} version
 */
function requirementsIssue(bytes, version) {
  if (!/^[\x20-\x7e\n]*$/.test(bytes.toString('latin1'))) {
    return `${REQUIREMENTS_TXT} contains characters other than printable ASCII and newlines`;
  }
  const lines = bytes.toString('latin1').split('\n');
  const trim = (/** @type {string} */ line) => line.replace(/^ +| +$/g, '');
  let requirements = 0;
  let pending = false;
  let continued = false;
  for (const raw of lines) {
    const line = trim(raw);
    if (!line || line.startsWith('#')) {
      if (continued) return `${REQUIREMENTS_TXT} continues a requirement into a blank or comment line`;
      continue;
    }
    const hash = /^--hash=sha256:[0-9a-f]{64}( \\)?$/.exec(line);
    if (hash) {
      if (!continued) return `${REQUIREMENTS_TXT} has a hash outside a requirement`;
      pending = false;
      continued = Boolean(hash[1]);
      continue;
    }
    if (continued || pending) return `${REQUIREMENTS_TXT} has a requirement without a hash`;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*==[A-Za-z0-9.+!_-]+(?: ; [A-Za-z0-9_.'" <>=!,()]+)? \\$/.test(line) ||
      line.includes('://') || line.includes(' @ ')) {
      return `${REQUIREMENTS_TXT} has an unsupported line ${JSON.stringify(line.slice(0, 80))}`;
    }
    requirements++;
    pending = true;
    continued = true;
  }
  if (pending || continued) return `${REQUIREMENTS_TXT} ends inside a requirement`;
  if (!requirements || !lines.some(line => trim(line) === `specify-cli==${version} \\`)) {
    return `${REQUIREMENTS_TXT} does not pin specify-cli==${version}`;
  }
  return null;
}

/**
 * Bindings between candidate files and trusted base bytes that path and row ownership alone cannot express.
 * Trusted files (the hook registration, everything under BOUND_ROOTS and every lock row with `x-baton-source`)
 * are compared as raw bytes and git mode with the base commit; nothing in them is interpreted. Base bytes and
 * modes come only from `baseFile` and `baseMode`, which read the trusted base tree; a missing reader or base file
 * fails.
 * @param {{id:string,manifest:{changed:Array<{path:string,mode?:string}>,deleted:string[]},
 *   files:Map<string,{bytes:Buffer}>,baseLock:any,lock:any,lockBytes:Buffer,version:string|null,
 *   baseFile?:(path:string)=>Buffer|null,baseMode?:(path:string)=>string|null}} input
 * @returns {string[]}
 */
export function bindingIssues({ id, manifest, files, baseLock, lock, lockBytes, version, baseFile, baseMode }) {
  if (typeof baseFile !== 'function') return ['the trusted base file reader is unavailable'];
  if (typeof baseMode !== 'function') return ['the trusted base mode reader is unavailable'];
  const modes = new Map(manifest.changed.map(item => [item.path, item.mode]));
  /** @type {Map<string,Buffer|null>} */
  const cache = new Map();
  /** @param {string} path */
  const trusted = path => {
    if (!cache.has(path)) {
      const value = baseFile(path);
      cache.set(path, Buffer.isBuffer(value) ? value : null);
    }
    return cache.get(path) ?? null;
  };
  /** @type {Map<string,any>} */
  const sourced = new Map();
  /** @type {Set<string>} */
  const extensionRows = new Set();
  for (const source of [baseLock, lock]) {
    for (const row of Array.isArray(source?.files) ? source.files : []) {
      if (typeof row?.stored_at === 'string' && row['x-baton-source'] !== undefined) sourced.set(row.stored_at, row);
      if (typeof row?.stored_at === 'string' && row['x-speckit-extension'] !== undefined) extensionRows.add(row.stored_at);
    }
  }
  // Pack-stored copies of extension and preset installs, and Spec Kit extension rows, are trusted like BOUND_ROOTS.
  const installTarget = (/** @type {string} */ path) => /^packs\/[a-z0-9][a-z0-9-]*\/files\/(.+)$/.exec(path)?.[1] ?? path;
  const isTrusted = (/** @type {string} */ path) =>
    path === HOOKS_PATH || BOUND_ROOTS.some(root => path.startsWith(root)) || sourced.has(path) ||
    BOUND_ROOTS.some(root => installTarget(path).startsWith(root)) || extensionRows.has(path);
  const issues = [];
  const written = new Map(manifest.changed.map(item => [item.path, /** @type {Buffer} */ (files.get(item.path)?.bytes)]));
  for (const path of manifest.deleted) {
    if ([LOCK_PATH, DIFF_PATH, REQUIREMENTS_IN, REQUIREMENTS_TXT].includes(path)) issues.push(`${path} may not be deleted`);
    else if (isTrusted(path)) issues.push(`${path} is a trusted path and may not be deleted; ${MANUAL}`);
  }
  if (!lockBytes.equals(Buffer.from(`${JSON.stringify(lock, null, 2)}\n`))) issues.push(`${LOCK_PATH} is not in canonical form`);
  try {
    if ((lock['x-bump-summary'] ?? '') !== formatBumpSummary(baseLock, lock)) {
      issues.push(`${LOCK_PATH} x-bump-summary is not the summary of the lock change`);
    }
    const diff = written.get(DIFF_PATH);
    if (!diff || !diff.equals(Buffer.from(diffDocument(lock)))) issues.push(`${DIFF_PATH} is not rendered from the candidate lock`);
  } catch (error) {
    issues.push(`${LOCK_PATH} cannot be rendered (${errorCause(error)})`);
  }
  if (id === 'speckit') {
    const input = written.get(REQUIREMENTS_IN);
    const output = written.get(REQUIREMENTS_TXT);
    if (!input || !input.equals(Buffer.from(`specify-cli==${version}\n`))) issues.push(`${REQUIREMENTS_IN} does not request specify-cli==${version}`);
    if (!output) issues.push(`${REQUIREMENTS_TXT} is not written`);
    else {
      if (sha256(output) !== lock.upstreams.speckit.requirements_sha256) {
        issues.push(`${REQUIREMENTS_TXT} does not match upstreams.speckit.requirements_sha256`);
      }
      const shape = requirementsIssue(output, String(version));
      if (shape) issues.push(shape);
    }
  }
  for (const [path, bytes] of written) {
    const row = sourced.get(path);
    if (row) {
      const source = row['x-baton-source'];
      const origin = typeof source === 'string' ? trusted(source) : null;
      if (!origin) issues.push(`${path}: Baton source ${JSON.stringify(source)} is unavailable in the base`);
      else if (sha256(origin) !== row['x-baton-source-sha256']) issues.push(`${path}: x-baton-source-sha256 is not the base ${source}`);
    }
    if (!isTrusted(path)) continue;
    const base = trusted(path);
    if (!base) issues.push(`${path} is new under a trusted path; ${MANUAL}`);
    else if (!bytes.equals(base)) issues.push(`${path} differs from its trusted base bytes; ${MANUAL}`);
    else if (modes.get(path) !== baseMode(path)) {
      issues.push(`${path} mode ${modes.get(path)} differs from its trusted base mode ${baseMode(path)}; ${MANUAL}`);
    }
  }
  return issues;
}
