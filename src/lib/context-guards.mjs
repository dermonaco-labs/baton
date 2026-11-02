import { lstat, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hashArtifact, hashBytes } from './hash.mjs';
import { parseFrontmatter } from './frontmatter.mjs';
import { loadSchemas, validateSchema } from './schema.mjs';
import { BatonError } from './report.mjs';

/** @typedef {{path:string,why?:string,sha256?:string}} Reference */
/** @typedef {{feature:string,lane:string,phase_completed:string,status:string,read_first:Reference[],do_not_read?:Reference[],artifacts:Reference[],gate:{approved_by:string|null},history:Array<{by:string,'x-action'?:string}>,decisions:Array<{by:string,tag?:string}>}} ContextBaton */
/** @typedef {{packs:string[],files:Array<{path:string,sha256:string}>,marker_sections:Array<{path:string}>}} ContextManifest */
/** @typedef {{path:string,bytes:Buffer}} SnapshotFile */

/** @param {string} message @param {string} [path] */
function protectedError(message, path = '') {
  return new BatonError('E_CONTEXT_PROTECTED', message, 1, path);
}

/** @param {unknown} error */
function missing(error) {
  return /** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT';
}

/** @param {string} path */
function key(path) {
  return path.replaceAll('\\', '/').toLowerCase();
}

/** @param {string} feature @param {string} path */
export function contextTarget(feature, path) {
  if (!/^\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(feature)) {
    throw protectedError('An explicit numbered draft feature is required', feature);
  }
  const normalized = path.replaceAll('\\', '/');
  const prefix = `specs/${feature}/`;
  const suffix = normalized.startsWith(prefix) ? normalized.slice(prefix.length) : '';
  if (!suffix || normalized.split('/').some((part) => part === '..' || part === '.') ||
      !/^(?:(?:spec|plan|tasks|research|data-model|quickstart)\.md|contracts\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.md)$/.test(suffix) ||
      /(?:^|\/)(?:constitution|agents|claude|handoff|copilot-instructions)\.md$/i.test(suffix)) {
    throw protectedError('Target must be an unbound draft SDD artifact, not protected instructions or handoffs', path);
  }
  return normalized;
}

/** Reject links and aliases at every path component, including hard-linked files.
 * @param {string} root @param {string} path @param {boolean} [allowMissingLeaf] */
async function safePath(root, path, allowMissingLeaf = false) {
  const base = await realpath(root);
  const normalized = path.replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || normalized.includes(':') ||
      normalized.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw protectedError('Unsafe context path', path);
  }
  const target = resolve(base, ...normalized.split('/'));
  if (!target.startsWith(base + sep)) throw protectedError('Context path escapes repository', path);
  const parts = normalized.split('/');
  let current = base;
  for (let index = 0; index < parts.length; index++) {
    current = join(current, parts[index]);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      if (allowMissingLeaf && index === parts.length - 1 && missing(error)) return target;
      throw error;
    }
    if (stat.isSymbolicLink() || stat.isFile() && stat.nlink !== 1) {
      throw protectedError('Linked or aliased context paths are not writable or trusted metadata', path);
    }
    if (index < parts.length - 1 && !stat.isDirectory()) throw protectedError('Invalid context path component', path);
    if (index === parts.length - 1 && !stat.isDirectory() && !stat.isFile()) {
      throw protectedError('Context path is not a regular file or directory', path);
    }
  }
  const canonical = await realpath(target);
  if (key(relative(base, canonical)) !== key(normalized)) throw protectedError('Context path resolves to an alias', path);
  return target;
}

/** @param {string} root @param {string} path */
async function optionalBytes(root, path) {
  try {
    return await readFile(await safePath(root, path));
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}

/** @param {string} root @param {string} path */
async function requiredPath(root, path) {
  try {
    return await safePath(root, path);
  } catch (error) {
    if (missing(error)) throw protectedError('Required context source is missing', path);
    throw error;
  }
}

/** @param {string} root @param {string} path */
async function entries(root, path) {
  try {
    return await readdir(await safePath(root, path), { withFileTypes: true });
  } catch (error) {
    if (missing(error)) return [];
    throw error;
  }
}

/** @param {string} root */
async function handoffPaths(root) {
  const paths = [];
  for (const entry of await entries(root, 'specs')) {
    if (entry.isSymbolicLink()) throw protectedError('Linked feature directory prevents safe protection discovery', entry.name);
    if (!entry.isDirectory()) continue;
    const directory = `specs/${entry.name}`;
    for (const file of await entries(root, directory)) {
      if (/^handoff(?:[.-].*)?\.md$/i.test(file.name)) paths.push(`${directory}/${file.name}`);
    }
  }
  for (const file of await entries(root, '.baton/quick')) {
    if (file.name.endsWith('.md')) paths.push(`.baton/quick/${file.name}`);
  }
  return paths.sort();
}

/** @param {Buffer} bytes @param {string} path */
function textBytes(bytes, path) {
  const text = bytes.toString('utf8');
  if (text.includes('\0') || !Buffer.from(text).equals(bytes)) throw protectedError('Context artifacts must be UTF-8 text', path);
  return text;
}

/** @param {string} root @param {string} pack */
export async function contextProtection(root, pack) {
  const schemas = await loadSchemas(root);
  /** @type {SnapshotFile[]} */
  const files = [];
  /** @param {string} path @param {Buffer} bytes */
  const remember = (path, bytes) => { files.push({ path, bytes }); };
  const manifestBytes = await optionalBytes(root, '.baton/manifest.json');
  if (!manifestBytes) throw protectedError('Context commands require an installed opt-in pack');
  let parsedManifest;
  try {
    parsedManifest = JSON.parse(textBytes(manifestBytes, '.baton/manifest.json'));
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw protectedError('Malformed installation manifest');
  }
  if (validateSchema(schemas, 'manifest', parsedManifest).length) throw protectedError('Invalid installation manifest');
  const manifest = /** @type {ContextManifest} */ (parsedManifest);
  if (!manifest.packs.includes(pack)) throw protectedError(`The ${pack} pack is not installed`);
  remember('.baton/manifest.json', manifestBytes);
  const protectedPaths = new Set([...manifest.files, ...manifest.marker_sections].map((item) => key(item.path)));
  const excludedPaths = new Set();
  /** @type {string[]} */
  const absent = [];
  /** @type {Array<{path:string,data:ContextBaton}>} */
  const batons = [];
  const paths = await handoffPaths(root);
  for (const path of paths) {
    const bytes = await readFile(await safePath(root, path));
    let parsed;
    try {
      parsed = parseFrontmatter(textBytes(bytes, path));
    } catch (error) {
      throw protectedError(`Malformed handoff prevents protection discovery: ${error instanceof Error ? error.message : String(error)}`, path);
    }
    if (validateSchema(schemas, 'handoff', parsed.data).length) throw protectedError('Invalid handoff protection metadata', path);
    const data = /** @type {ContextBaton} */ (parsed.data);
    remember(path, bytes);
    batons.push({ path, data });
    for (const ref of data.do_not_read ?? []) {
      excludedPaths.add(key(ref.path));
      protectedPaths.add(key(ref.path));
    }
  }
  for (const { data } of batons) {
    for (const ref of [...data.read_first, ...data.artifacts]) {
      protectedPaths.add(key(ref.path));
      if (excludedPaths.has(key(ref.path))) continue;
      const source = await readFile(await requiredPath(root, ref.path));
      if (ref.sha256 && hashArtifact(ref.path, source) !== ref.sha256) {
        throw protectedError('Stale handoff source prevents safe mutation', ref.path);
      }
      remember(ref.path, source);
    }
  }
  for (const path of ['baton.lock.json', '.baton/lock.json']) {
    const bytes = await optionalBytes(root, path);
    if (!bytes) {
      absent.push(path);
      continue;
    }
    let lock;
    try {
      lock = JSON.parse(textBytes(bytes, path));
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      throw protectedError('Malformed source lock prevents protection discovery', path);
    }
    if (validateSchema(schemas, 'lock', lock).length) throw protectedError('Invalid source lock', path);
    for (const file of /** @type {Array<{path:string}>} */ (lock.files)) protectedPaths.add(key(file.path));
    remember(path, bytes);
  }
  return { manifest, files, batons, paths, protectedPaths, excludedPaths, absent };
}

/** @param {string} root @param {Awaited<ReturnType<typeof contextProtection>>} protection */
async function assertSnapshot(root, protection) {
  if (JSON.stringify(await handoffPaths(root)) !== JSON.stringify(protection.paths)) {
    throw new BatonError('E_CONFLICT', 'Handoff protection changed during context operation', 4);
  }
  for (const path of protection.absent) {
    if (await optionalBytes(root, path)) throw new BatonError('E_CONFLICT', 'New protection metadata appeared during context operation', 4, path);
  }
  for (const file of protection.files) {
    if (!(await readFile(await safePath(root, file.path))).equals(file.bytes)) {
      throw new BatonError('E_CONFLICT', 'Protection source changed during context operation', 4, file.path);
    }
  }
}

/** @param {string} root @param {'compact'|'restore'} action
 * @param {{feature:string,target:string,candidate?:string,expect?:string,apply?:boolean}} options */
export async function mutateContext(root, action, options) {
  const path = contextTarget(options.feature, options.target);
  const protection = await contextProtection(root, 'token-budget');
  const absolute = await requiredPath(root, path);
  const bytes = await readFile(absolute);
  const text = textBytes(bytes, path);
  const reasons = [];
  if (protection.protectedPaths.has(key(path))) reasons.push('Target is read_first, source/hash-bound or managed');
  if (/<!--\s*(?:BATON|SPECKIT):(?:START|END)/i.test(text)) reasons.push('Target contains protected instruction markers');
  for (const baton of protection.batons) {
    if (key(dirname(baton.path)) !== key(`specs/${options.feature}`)) continue;
    const data = baton.data;
    if (data.gate.approved_by || data.history.some((item) => item['x-action'] === 'approve' || item.by.startsWith('human:')) ||
        data.decisions.some((item) => item.tag === 'attach-approved') ||
        !['none', 'specify', 'brainstorm'].includes(data.phase_completed) || data.status !== 'ready') {
      reasons.push('Feature has approval history or cannot establish pre-approval draft state');
    }
  }
  const report = { action, target: path, allowed: reasons.length === 0, reasons,
    applied: false, sha256: hashBytes(bytes), estimated_tokens: Math.ceil(text.length / 4) };
  if (!options.apply) return report;
  if (reasons.length) throw protectedError(reasons.join('; '), path);
  if (!options.expect || !/^[a-f0-9]{64}$/.test(options.expect)) {
    throw new BatonError('E_USAGE', 'Apply requires --expect with the original raw SHA-256', 2);
  }
  if (options.expect !== report.sha256) throw new BatonError('E_CONFLICT', 'Candidate target digest is stale', 4, path);
  const backupPath = path.replace(/\.md$/, '.full.md');
  const backup = await safePath(root, backupPath, true);
  let replacement;
  if (action === 'compact') {
    if (!options.candidate) throw new BatonError('E_USAGE', 'Compaction apply requires --candidate', 2);
    const candidatePath = await requiredPath(root, options.candidate);
    if (key(candidatePath) === key(absolute) || key(candidatePath) === key(backup)) throw protectedError('Candidate aliases target or backup');
    if (await optionalBytes(root, backupPath)) throw new BatonError('E_CONFLICT', 'Existing compaction backup will not be overwritten', 4, backupPath);
    const proposed = textBytes(await readFile(candidatePath), options.candidate);
    if (!proposed.trim() || /<!--\s*(?:BATON|SPECKIT):(?:START|END)/i.test(proposed)) throw protectedError('Invalid or protected compaction candidate');
    replacement = Buffer.from(proposed.replace(/\r\n/g, '\n').replace(/\n/g, text.includes('\r\n') ? '\r\n' : '\n'));
  } else {
    replacement = await readFile(backup);
    if (/<!--\s*(?:BATON|SPECKIT):(?:START|END)/i.test(textBytes(replacement, backupPath))) {
      throw protectedError('Backup contains protected instructions', backupPath);
    }
    protection.files.push({ path: backupPath, bytes: replacement });
  }
  const temporary = `${absolute}.context-${randomUUID()}.tmp`;
  let createdBackup = false;
  let committed = false;
  try {
    await assertSnapshot(root, protection);
    if (!(await readFile(await safePath(root, path))).equals(bytes)) throw new BatonError('E_CONFLICT', 'Context target changed', 4, path);
    await writeFile(temporary, replacement, { flag: 'wx', mode: (await lstat(absolute)).mode });
    if (action === 'compact') {
      await writeFile(backup, bytes, { flag: 'wx' });
      createdBackup = true;
      protection.files.push({ path: backupPath, bytes });
    }
    await assertSnapshot(root, protection);
    if (!(await readFile(await safePath(root, path))).equals(bytes)) throw new BatonError('E_CONFLICT', 'Context target changed', 4, path);
    await rename(temporary, absolute);
    committed = true;
    if (action === 'restore') {
      if (!(await readFile(await requiredPath(root, backupPath))).equals(replacement)) {
        throw new BatonError('E_CONFLICT', 'Restored target; backup changed and was preserved', 4, backupPath);
      }
      await rm(backup);
    }
    return { ...report, applied: true, sha256: hashBytes(replacement), estimated_tokens: Math.ceil(replacement.toString('utf8').length / 4) };
  } finally {
    await rm(temporary, { force: true });
    if (createdBackup && !committed && (await optionalBytes(root, backupPath))?.equals(bytes)) await rm(backup);
  }
}

/** @param {string} root @param {string} feature */
export async function featureContext(root, feature) {
  contextTarget(feature, `specs/${feature}/spec.md`);
  const protection = await contextProtection(root, 'token-budget');
  const selected = protection.batons.filter((baton) => key(dirname(baton.path)) === key(`specs/${feature}`));
  if (selected.length > 1) throw protectedError('Multiple handoffs make feature context ambiguous');
  return { protection, directory: await safePath(root, `specs/${feature}`), baton: selected[0]?.data };
}

/** @param {string} root @param {string} path */
export async function contextText(root, path) {
  const bytes = await optionalBytes(root, path);
  return bytes ? textBytes(bytes, path) : null;
}
