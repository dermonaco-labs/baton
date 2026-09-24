import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import YAML from 'yaml';
import { validatePackClosure } from '../lib/packs.mjs';
import { assertFrontmatter, repairAtv } from '../lib/repairs.mjs';
import {
  ATV_COMMIT, ATV_TREE, SPECKIT_COMMIT, SPECKIT_VERSION, UpstreamError,
  fetchAtv, prepareSpeckit, regenerateRequirements, run as runTool, sha256, workspace
} from '../lib/upstream.mjs';

const lockedRequirements = 'baton/upstream/specify-cli.requirements.txt';
const forbidden = /(?:^|\/)(?:karpathy-guidelines|\.env(?:\..*)?|\.context|node_modules|\.git)(?:\/|$)/i;
/** @typedef {{from:string,path:string,upstream_path?:string}} PackFile */
/** @typedef {{id:string,requires:string[],conflicts:string[],files:PackFile[],optional_refs?:Array<{ref:string,reason:string,note:string}>}} PackDefinition */
/** @typedef {{id:string,match:string,applies_to:string,reason:string,upstream_issue:string}} RepairRule */
/** @typedef {{path:string,upstream:'speckit'|'atv',upstream_path:string,stored_at:string,sha256_upstream:string,sha256:string,license:string,repair:{id:string,reason:string,upstream_issue:string}|null,packs:string[],bytes:Buffer}} VendoredEntry */
/** @typedef {{path:string,stored_at:string,packs:string[],bytes:Buffer}} AuthoredEntry */

/** @param {string} path */
const clean = path => path.split(sep).join('/');
/** @param {string} path */
const safePath = path => {
  if (typeof path !== 'string' || !path || path.startsWith('/') || /^[a-z]:/i.test(path) ||
      path.split(/[\\/]/).some(part => part === '..' || part === '.')) {
    throw new UpstreamError('E_UPSTREAM_VERIFY', `Unsafe vendored path: ${path}`);
  }
  const value = path.replaceAll('\\', '/');
  if (forbidden.test(value)) throw new UpstreamError('E_LICENSE', `Forbidden upstream content: ${value}`);
  return value;
};

/** @param {string} dir @returns {string[]} */
function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.name === '.git') return [];
    return entry.isDirectory() ? filesUnder(path) : entry.isFile() ? [path] : [];
  });
}

/** @param {string} path */
function parseYaml(path) {
  return YAML.parse(readFileSync(path, 'utf8'), { uniqueKeys: true });
}

/** @param {string} root @returns {{packs:PackDefinition[],repairs:RepairRule[]}} */
function definitions(root) {
  const dir = join(root, 'packs');
  if (!existsSync(dir)) throw new UpstreamError('E_PREREQUISITE', 'Pack definitions have not been written');
  const packs = readdirSync(dir).filter(name => name.endsWith('.yml') && name !== 'repairs.yml')
    .map(name => parseYaml(join(dir, name)));
  if (packs.length !== 11 || packs.some(pack => !pack.id || !Array.isArray(pack.files))) {
    throw new UpstreamError('E_PREREQUISITE', 'Wait for all 11 completed pack definitions');
  }
  const repairs = parseYaml(join(dir, 'repairs.yml'));
  return { packs, repairs: repairs?.repairs || [] };
}

/** @param {PackFile} entry @param {string} generated @param {string} atv */
function sourceFor(entry, generated, atv) {
  const path = safePath(entry.path);
  const upstreamPath = safePath(entry.upstream_path || path);
  if (entry.from === 'atv') return { path, upstreamPath, source: join(atv, ...upstreamPath.split('/')) };
  if (entry.from === 'speckit' || entry.from === 'baton') {
    return { path, upstreamPath, source: join(generated, ...path.split('/')) };
  }
  throw new UpstreamError('E_UPSTREAM_VERIFY', `Unknown pack source ${entry.from}`);
}

/** @param {Buffer} bytes @param {string} path @param {string} root */
export function generatedStable(bytes, path, root) {
  const target = join(root, ...path.split('/'));
  if (!existsSync(target) || !/\.json$|\.registry$/.test(path)) return bytes;
  try {
    const current = JSON.parse(readFileSync(target, 'utf8'));
    const proposed = JSON.parse(bytes.toString('utf8'));
    // Installation timestamps are local events, not upstream payload changes.
    /** @param {unknown} oldValue @param {unknown} newValue */
    const keepDates = (oldValue, newValue) => {
      if (!oldValue || !newValue || typeof oldValue !== 'object' || typeof newValue !== 'object') return;
      const prior = /** @type {Record<string,unknown>} */ (oldValue);
      const next = /** @type {Record<string,unknown>} */ (newValue);
      for (const field of ['installed_at', 'updated_at']) {
        if (typeof prior[field] === 'string' && typeof next[field] === 'string') next[field] = prior[field];
      }
      for (const key of Object.keys(next)) keepDates(prior[key], next[key]);
    };
    keepDates(current, proposed);
    if (JSON.stringify(current) === JSON.stringify(proposed)) return readFileSync(target);
    return Buffer.from(`${JSON.stringify(proposed, null, 2)}\n`);
  } catch {
    return bytes;
  }
}

/** @param {string} path */
const resourceName = path => path.match(/\/skills\/([^/]+)\/SKILL\.md$/)?.[1] ||
  path.match(/\/agents\/([^/]+)\.agent\.md$/)?.[1] || null;

/** @param {string} root */
export function excludedNames(root) {
  const document = readFileSync(join(root, 'specs', '001-baton-template', 'contracts', 'packs.md'), 'utf8');
  const section = document.split('## Excluded (never installed)\n')[1]?.split('\n## Closure rules')[0];
  if (!section) throw new UpstreamError('E_DANGLING_REF', 'Cannot verify excluded references without the pack contract');
  const names = new Map();
  for (const line of section.split('\n')) {
    const columns = line.split('|');
    if (columns.length < 4) continue;
    const codes = [...columns[2].matchAll(/\bC\d+\b/g)].map(match => match[0]);
    if (!codes.length) continue;
    const tokens = [...columns[1].matchAll(/`([^`]+)`/g)].map(match => match[1]);
    if (tokens.length === 0) tokens.push(...columns[1].split(',').map(token => token.trim()));
    for (const token of tokens) {
      if (/^[a-z][a-z0-9-]+$/.test(token)) names.set(token, codes);
    }
  }
  return names;
}

/** @param {string} generated @param {string} atv */
export function pinnedNames(generated, atv) {
  const paths = [
    ...filesUnder(join(generated, '.github')),
    ...filesUnder(join(atv, 'pkg', 'scaffold', 'templates', 'skills')),
    ...filesUnder(join(atv, 'pkg', 'scaffold', 'templates', 'agents')),
  ];
  return new Set(paths.flatMap(path => {
    const name = resourceName(clean(path));
    return name ? [name] : [];
  }));
}

/** @param {Array<VendoredEntry|AuthoredEntry>} entries @param {PackDefinition[]} packs @param {{upstreamNames?:Set<string>,exclusions?:Map<string,string[]>}} [options] */
export function referenceClosure(entries, packs, options = {}) {
  const declared = new Map(packs.map(pack => [pack.id, pack]));
  const issues = [];
  for (const pack of packs) {
    const contents = new Map(entries.filter(entry => entry.packs.includes(pack.id) ||
      declared.get(pack.id)?.requires.includes(entry.packs[0])).map(entry => [entry.path, entry.bytes.toString('utf8')]));
    for (const issue of validatePackClosure(declared, pack.id, contents, options)) {
      issues.push(`${pack.id}: ${issue.file} ${issue.message}`);
    }
  }
  if (issues.length) throw new UpstreamError('E_DANGLING_REF', [...new Set(issues)].slice(0, 40).join('\n'));
}

/** @param {string} root @param {string} generated @param {string} atv @param {PackDefinition[]} packs @param {RepairRule[]} repairs @param {any} oldLock @param {boolean} bump */
function prepareEntries(root, generated, atv, packs, repairs, oldLock, bump) {
  /** @type {Map<string,VendoredEntry>} */
  const entries = new Map();
  /** @type {AuthoredEntry[]} */
  const authored = [];
  /** @param {string} path @param {string} source @param {'speckit'|'atv'} upstream @param {string} upstreamPath @param {string} pack @param {{preserve?:boolean}} [options] */
  const add = (path, source, upstream, upstreamPath, pack, { preserve = false } = {}) => {
    path = safePath(path);
    if (!existsSync(source)) throw new UpstreamError('E_UPSTREAM_VERIFY', `Missing upstream file: ${source}`);
    const expectedBase = upstream === 'atv' ? atv : generated;
    const symlink = lstatSync(source).isSymbolicLink();
    const linkTarget = realpathSync(source);
    const generatedExtension = upstream === 'speckit' &&
      /^\.github\/skills\/speckit-baton-(?:receive|handoff)\/SKILL\.md$/.test(path) &&
      linkTarget.startsWith(join(realpathSync(generated), '.specify', 'extensions', 'baton', '.specify-dev') + sep);
    if (!statSync(linkTarget).isFile() || relative(realpathSync(expectedBase), linkTarget).startsWith('..') ||
        (symlink && !generatedExtension)) {
      throw new UpstreamError('E_UPSTREAM_VERIFY', `Upstream source is not a regular file inside its verified tree: ${source}`);
    }
    /** @type {Buffer} */
    let bytes = readFileSync(source);
    if (preserve) bytes = generatedStable(bytes, path, root);
    const upstreamHash = sha256(bytes);
    const previous = (/** @type {Array<{path:string,packs:string[],sha256_upstream:string}>|undefined} */ (oldLock?.files))
      ?.find(row => row.path === path && row.packs.includes(pack));
    if (!bump && previous && previous.sha256_upstream !== upstreamHash) {
      throw new UpstreamError('E_UPSTREAM_VERIFY', `${path}: upstream sha256 differs from the lock`);
    }
    let repair = null;
    if (upstream === 'atv') {
      const updated = repairAtv(bytes, upstreamPath, repairs);
      bytes = updated.bytes;
      repair = updated.repair;
    }
    if (/\/(?:SKILL\.md|[^/]+\.agent\.md)$/.test(path)) assertFrontmatter(bytes, path);
    const storedAt = pack === 'core' ? path : `packs/${pack}/files/${path}`;
    const old = entries.get(storedAt);
    if (old) {
      if (old.sha256 !== sha256(bytes)) throw new UpstreamError('E_UPSTREAM_VERIFY', `Conflicting pack file ${storedAt}`);
      old.packs.push(pack);
      return;
    }
    entries.set(storedAt, {
      path, upstream, upstream_path: upstreamPath, stored_at: storedAt,
      sha256_upstream: upstreamHash, sha256: sha256(bytes), license: 'MIT', repair,
      packs: [pack], bytes
    });
  };
  for (const file of filesUnder(join(generated, '.specify'))) {
    const path = clean(relative(generated, file));
    if (path === '.specify/memory/constitution.md') continue;
    add(path, file, 'speckit', path, 'core', { preserve: true });
  }
  for (const pack of packs) {
    for (const item of pack.files) {
      if (item.from === 'baton') {
        const path = safePath(item.path);
        const generatedFile = join(generated, ...path.split('/'));
        if (existsSync(generatedFile)) {
          add(path, generatedFile, 'speckit', path, pack.id);
        } else {
          const name = resourceName(path);
          const source = name ? join(root, 'baton', 'skills', name, 'SKILL.md') :
            join(root, 'packs', pack.id, 'files', ...path.split('/'));
          if (!existsSync(source)) throw new UpstreamError('E_DANGLING_REF', `${pack.id}: missing Baton payload ${source}`);
          const bytes = readFileSync(source);
          if (name) assertFrontmatter(bytes, path);
          authored.push({ path, stored_at: pack.id === 'core' ? path : `packs/${pack.id}/files/${path}`,
            packs: [pack.id], bytes });
        }
        continue;
      }
      if (item.from !== 'atv' && item.from !== 'speckit') {
        throw new UpstreamError('E_UPSTREAM_VERIFY', `Unknown source ${item.from} in ${pack.id}`);
      }
      const { path, source, upstreamPath } = sourceFor(item, generated, atv);
      add(path, source, item.from, upstreamPath, pack.id);
    }
  }
  const values = [...entries.values()].sort((a, b) => a.stored_at.localeCompare(b.stored_at, 'en'));
  referenceClosure([...values, ...authored], packs, {
    upstreamNames: pinnedNames(generated, atv), exclusions: excludedNames(root)
  });
  return { vendored: values, authored };
}

/** @param {VendoredEntry[]} entries @param {string} requirementsHash @param {string} atvCommit @param {string} atvTree @param {string} version @param {string} speckitCommit */
function lockFile(entries, requirementsHash, atvCommit, atvTree, version, speckitCommit) {
  return {
    schema: 1, generated_by: 'baton sync 0.1.0',
    upstreams: {
      speckit: {
        package: 'specify-cli', version, repo: 'github/spec-kit', tag: `v${version}`,
        commit: speckitCommit, requirements: lockedRequirements, requirements_sha256: requirementsHash,
        license: 'MIT', init_args: ['--integration', 'copilot', '--script', 'sh']
      },
      atv: {
        package: 'atv-starterkit', version: null, repo: 'All-The-Vibes/ATV-StarterKit',
        ref: 'main', commit: atvCommit, tree: atvTree, license: 'MIT',
        note: 'pinned to main: v2.6.3 ships corrupted agent templates (fixed in f0a86ef)'
      }
    },
    files: entries.map(({ bytes, ...entry }) => entry)
  };
}

/** @param {ReturnType<typeof lockFile>} lock */
function diffDocument(lock) {
  const upstreamCounts = Object.entries(lock.upstreams).map(([id, pin]) => {
    const channel = 'version' in pin && pin.version ? pin.version : 'ref' in pin ? pin.ref : '';
    const tree = 'tree' in pin ? pin.tree : null;
    return `- ${id}: ${channel} at \`${pin.commit}\`${tree ? ` (tree \`${tree}\`)` : ''}`;
  }).join('\n');
  const rows = lock.files.map(entry =>
    `| \`${entry.stored_at}\` | ${entry.upstream} | \`${entry.upstream_path}\` | \`${entry.sha256.slice(0, 12)}\` | ${entry.repair?.id || 'none'} |`).join('\n');
  return `# Upstream snapshot\n\nGenerated by \`baton sync\`. Files are byte-identical to their verified upstream source unless a declared repair is recorded.\n\n${upstreamCounts}\n\n| Stored at | Source | Upstream path | SHA-256 prefix | Repair |\n|---|---|---|---|---|\n${rows}\n`;
}

/** @param {{cwd?:string,check?:boolean,bump?:string|null}} [options] */
export function sync({ cwd = process.cwd(), check = false, bump = null } = {}) {
  const root = resolve(cwd);
  const { packs, repairs } = definitions(root);
  const lockPath = join(root, 'baton.lock.json');
  const oldLock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : null;
  if (check && !oldLock) throw new UpstreamError('E_SYNC_DRIFT', 'Missing baton.lock.json');
  if (check && bump) throw new UpstreamError('E_USAGE', '--check and --bump cannot be combined');
  const requirementsPath = join(root, ...lockedRequirements.split('/'));
  const previousRequirements = bump?.startsWith('speckit=') ? readFileSync(requirementsPath) : null;
  const requirementsInput = join(root, 'baton', 'upstream', 'specify-cli.requirements.in');
  const previousInput = previousRequirements ? readFileSync(requirementsInput) : null;
  const requirementsHash = bump?.startsWith('speckit=') ?
    regenerateRequirements(root, bump.slice('speckit='.length)) :
    sha256(readFileSync(requirementsPath));
  if (!bump && oldLock && oldLock.upstreams.speckit.requirements_sha256 !== requirementsHash) {
    throw new UpstreamError('E_UPSTREAM_VERIFY', 'Hash-locked requirements differ from baton.lock.json');
  }
  const version = bump?.startsWith('speckit=') ? bump.slice('speckit='.length) : oldLock?.upstreams.speckit.version || SPECKIT_VERSION;
  const atvCommit = bump?.startsWith('atv=') ? bump.slice(4) : oldLock?.upstreams.atv.commit || ATV_COMMIT;
  if (!bump && (version !== SPECKIT_VERSION || atvCommit !== ATV_COMMIT ||
      (oldLock?.upstreams.atv.tree && oldLock.upstreams.atv.tree !== ATV_TREE) ||
      (oldLock?.upstreams.speckit.commit && oldLock.upstreams.speckit.commit !== SPECKIT_COMMIT))) {
    throw new UpstreamError('E_UPSTREAM_VERIFY', 'Lock pins differ from the vetted Spec Kit/ATV refs; require an explicit --bump');
  }
  const work = workspace(root);
  try {
    let atvTree = oldLock?.upstreams.atv.tree || ATV_TREE;
    let speckitCommit = oldLock?.upstreams.speckit.commit || SPECKIT_COMMIT;
    if (bump?.startsWith('speckit=')) {
      const probe = join(work.path, 'speckit-pin');
      mkdirSync(probe, { recursive: true });
      runTool('git', ['init', '-q', probe]);
      runTool('git', ['-C', probe, 'fetch', '--depth', '1', 'https://github.com/github/spec-kit',
        `refs/tags/v${version}`]);
      speckitCommit = runTool('git', ['-C', probe, 'rev-parse', 'FETCH_HEAD^{commit}']);
      if (!/^[a-f0-9]{40}$/.test(speckitCommit)) {
        throw new UpstreamError('E_UPSTREAM_VERIFY', `Spec Kit v${version} tag is not an immutable commit`);
      }
    }
    if (bump?.startsWith('atv=')) {
      if (!/^[a-f0-9]{40}$/.test(atvCommit)) throw new UpstreamError('E_USAGE', 'ATV bump requires full commit SHA');
      const probe = join(work.path, 'pin');
      mkdirSync(probe, { recursive: true });
      runTool('git', ['init', '-q', probe]);
      runTool('git', ['-C', probe, 'fetch', '--depth', '1', 'https://github.com/All-The-Vibes/ATV-StarterKit', atvCommit]);
      if (runTool('git', ['-C', probe, 'rev-parse', 'FETCH_HEAD^{commit}']) !== atvCommit) {
        throw new UpstreamError('E_UPSTREAM_VERIFY', 'Requested ATV commit did not resolve');
      }
      atvTree = runTool('git', ['-C', probe, 'rev-parse', 'FETCH_HEAD^{tree}']);
    }
    const atv = fetchAtv({ work: work.path, commit: atvCommit, tree: atvTree });
    const project = prepareSpeckit({ root, work: work.path, version });
    const extensions = readFileSync(join(project, '.specify', 'extensions.yml'), 'utf8');
    const config = /** @type {{hooks?:Record<string,Array<{extension:string,enabled:boolean,optional:boolean,condition?:unknown}>>}} */ (YAML.parse(extensions));
    for (const [event, hooks] of Object.entries(config.hooks || {})) {
      if (event.startsWith('before_') || event.startsWith('after_')) {
        if (!hooks.some(hook => hook.extension === 'baton' && hook.enabled === true &&
          hook.optional === false && hook.condition == null)) {
          throw new UpstreamError('E_UPSTREAM_VERIFY', `Missing mandatory unconditional Baton hook ${event}`);
        }
      }
    }
    const { vendored: entries, authored } = prepareEntries(root, project, atv, packs, repairs, oldLock, Boolean(bump));
    const lock = lockFile(entries, requirementsHash, atvCommit, atvTree, version, speckitCommit);
    const expected = [
      ...entries.map(entry => ({ path: entry.stored_at, bytes: entry.bytes })),
      ...authored.map(entry => ({ path: entry.stored_at, bytes: entry.bytes })),
      { path: 'baton.lock.json', bytes: Buffer.from(`${JSON.stringify(lock, null, 2)}\n`) },
      { path: 'docs/reference/upstream-diff.md', bytes: Buffer.from(diffDocument(lock)) }
    ];
    const drift = expected.filter(({ path, bytes }) =>
      !existsSync(join(root, ...path.split('/'))) ||
      sha256(readFileSync(join(root, ...path.split('/')))) !== sha256(bytes)).map(item => item.path);
    if (check && drift.length) throw new UpstreamError('E_SYNC_DRIFT', drift.join('\n'));
    if (!check) for (const { path, bytes } of expected) {
      const target = join(root, ...path.split('/'));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, bytes);
    }
    return { files: entries.length, changed: drift, lock };
  } catch (error) {
    if (previousRequirements && previousInput) {
      writeFileSync(requirementsPath, previousRequirements);
      writeFileSync(requirementsInput, previousInput);
    }
    throw error;
  } finally {
    work.cleanup();
  }
}

/** @param {string} cwd @param {string[]} [argv] */
export function run(cwd, argv = []) {
  let check = false;
  let bump = null;
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--check') check = true;
    else if (argv[index] === '--bump' && argv[index + 1]) bump = argv[++index];
    else return { errors: [{ code: 'E_USAGE', message: `Unknown sync argument: ${argv[index]}` }], exitCode: 2 };
  }
  if (bump && !/^(?:speckit=\d+\.\d+\.\d+|atv=[a-f0-9]{40})$/.test(bump)) {
    return { errors: [{ code: 'E_USAGE', message: `Invalid --bump value: ${bump}` }], exitCode: 2 };
  }
  try {
    const result = sync({ cwd, check, bump });
    return { data: { files: result.files, changed: result.changed }, errors: [] };
  } catch (error) {
    if (!(error instanceof UpstreamError)) throw error;
    return {
      errors: [{ code: error.code, message: error.message.replace(`${error.code} `, '') }],
      exitCode: error.code === 'E_PREREQUISITE' ? 5 : error.code === 'E_USAGE' ? 2 : 1
    };
  }
}

export default sync;
