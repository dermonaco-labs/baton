import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import YAML from 'yaml';
import { validatePackClosure } from '../lib/packs.mjs';
import { assertFrontmatter, repairAtv } from '../lib/repairs.mjs';
import {
  ATV_REPO, OPTIONAL_PIN_FIELDS, OPTIONAL_SOURCES, SPECKIT_REPO, UpstreamError, fetchAtv, fetchSource, isSha, isVersion,
  prepareSpeckit, regenerateRequirements, repoSlug, resolveCommit, resolveTag, sha256, workspace
} from '../lib/upstream.mjs';

const lockedRequirements = 'baton/upstream/specify-cli.requirements.txt';
const forbidden = /(?:^|\/)(?:karpathy-guidelines|\.env(?:\..*)?|\.context|node_modules|\.git)(?:\/|$)/i;
/** @typedef {{from:string,path:string,upstream_path?:string}} PackFile */
/** @typedef {{id:string,requires:string[],conflicts:string[],files:PackFile[],optional_refs?:Array<{ref:string,reason:string,note:string}>}} PackDefinition */
/** @typedef {{id:string,match:string,applies_to:string,reason:string,upstream_issue:string}} RepairRule */
/** @typedef {{path:string,upstream:string,upstream_path:string,stored_at:string,sha256_upstream:string,sha256:string,license:string,repair:{id:string,reason:string,upstream_issue:string}|null,packs:string[],bytes:Buffer,'x-baton-source'?:string,'x-baton-source-sha256'?:string}} VendoredEntry */
/** @typedef {{path:string,stored_at:string,packs:string[],bytes:Buffer}} AuthoredEntry */

const extensionSources = new Map([
  ['.specify/extensions/baton/README.md', 'baton/speckit-extension/README.md'],
  ['.specify/extensions/baton/extension.yml', 'baton/speckit-extension/extension.yml'],
  ['.specify/extensions/baton/commands/receive.md', 'baton/speckit-extension/commands/receive.md'],
  ['.specify/extensions/baton/commands/handoff.md', 'baton/speckit-extension/commands/handoff.md'],
  ['.specify/extensions/baton/.specify-dev/extension-skills/speckit-baton-receive/SKILL.md',
    'baton/speckit-extension/commands/receive.md'],
  ['.specify/extensions/baton/.specify-dev/extension-skills/speckit-baton-handoff/SKILL.md',
    'baton/speckit-extension/commands/handoff.md'],
  ['.github/skills/speckit-baton-receive/SKILL.md', 'baton/speckit-extension/commands/receive.md'],
  ['.github/skills/speckit-baton-handoff/SKILL.md', 'baton/speckit-extension/commands/handoff.md'],
]);
const generatedText = new Set([
  '.specify/extensions.yml',
  ...[...extensionSources.keys()].filter(path => path.endsWith('/SKILL.md')),
]);

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

const requiredPacks = ['core', 'design', 'docs-review', 'issues', 'learning', 'research', 'review-plus',
  'security', 'stack-python', 'stack-rails', 'stack-typescript'];

/** @param {string} root @returns {{packs:PackDefinition[],repairs:RepairRule[]}} */
export function packDefinitions(root) {
  const dir = join(root, 'packs');
  if (!existsSync(dir)) throw new UpstreamError('E_PREREQUISITE', 'Pack definitions have not been written');
  const names = readdirSync(dir).filter(name => name.endsWith('.yml') && name !== 'repairs.yml').sort();
  const missing = requiredPacks.filter(id => !names.includes(`${id}.yml`));
  if (missing.length) {
    throw new UpstreamError('E_PREREQUISITE', `Wait for all completed pack definitions; missing ${missing.join(', ')}`);
  }
  const packs = names.map(name => {
    const pack = parseYaml(join(dir, name));
    if (!pack?.id || pack.id !== name.slice(0, -'.yml'.length) || !Array.isArray(pack.files)) {
      throw new UpstreamError('E_PREREQUISITE', `Incomplete pack definition ${name}`);
    }
    return pack;
  });
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
    if (isDeepStrictEqual(current, proposed)) return readFileSync(target);
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

/** @param {string} root @param {string} generated @param {string} atv @param {PackDefinition[]} packs @param {RepairRule[]} repairs @param {any} oldLock @param {boolean} bump @param {Record<string,string>} [sources] verified optional source checkouts */
export function prepareEntries(root, generated, atv, packs, repairs, oldLock, bump, sources = {}) {
  /** @type {Map<string,VendoredEntry>} */
  const entries = new Map();
  /** @type {AuthoredEntry[]} */
  const authored = [];
  /** @param {string} path @param {string} source @param {string} upstream @param {string} upstreamPath @param {string} pack @param {{preserve?:boolean}} [options] */
  const add = (path, source, upstream, upstreamPath, pack, { preserve = false } = {}) => {
    path = safePath(path);
    if (!existsSync(source)) throw new UpstreamError('E_UPSTREAM_VERIFY', `Missing upstream file: ${source}`);
    const named = Object.hasOwn(OPTIONAL_SOURCES, upstream);
    const expectedBase = upstream === 'atv' ? atv : named ? sources[upstream] : generated;
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
    // Spec Kit writes these generated texts with host-native newlines; copied upstream bytes are untouched.
    if (upstream === 'speckit' && generatedText.has(path)) {
      bytes = Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'));
    }
    if (preserve) bytes = generatedStable(bytes, path, root);
    const upstreamHash = sha256(bytes);
    const authoredSource = upstream === 'speckit' ? extensionSources.get(path) : undefined;
    let provenance;
    if (authoredSource) {
      const input = join(root, ...authoredSource.split('/'));
      if (!existsSync(input) || !lstatSync(input).isFile() ||
          relative(realpathSync(root), realpathSync(input)).startsWith('..')) {
        throw new UpstreamError('E_UPSTREAM_VERIFY', `Missing regular Baton source: ${authoredSource}`);
      }
      const inputHash = sha256(readFileSync(input));
      if (!path.endsWith('/SKILL.md') && inputHash !== upstreamHash) {
        throw new UpstreamError('E_UPSTREAM_VERIFY', `${path}: generated copy differs from ${authoredSource}`);
      }
      provenance = { 'x-baton-source': authoredSource, 'x-baton-source-sha256': inputHash };
    }
    const previous = (/** @type {Array<{path:string,packs:string[],sha256_upstream:string}>|undefined} */ (oldLock?.files))
      ?.find(row => row.path === path && row.packs.includes(pack));
    // Authored inputs may change without an upstream bump, but --check still compares every fresh output and lock row.
    // Optional source pins have no bump path, so their raw bytes must always match an existing lock row.
    if ((named || !bump) && !authoredSource && previous && previous.sha256_upstream !== upstreamHash) {
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
      packs: [pack], bytes, ...provenance
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
      if (Object.hasOwn(OPTIONAL_SOURCES, item.from)) {
        const prefix = `.baton/vendor/${item.from}/`;
        const upstreamPath = safePath(item.upstream_path ?? '');
        const path = safePath(item.path);
        if (pack.id !== item.from || path !== prefix + upstreamPath) {
          throw new UpstreamError('E_UPSTREAM_VERIFY',
            `Optional source ${item.from} may only be installed by its own pack at ${prefix}<upstream_path>: ${path}`);
        }
        const base = sources[item.from];
        if (!base || !existsSync(base)) {
          throw new UpstreamError('E_UPSTREAM_VERIFY', `Optional source ${item.from} has not been fetched and verified`);
        }
        add(path, join(base, ...upstreamPath.split('/')), item.from, upstreamPath, pack.id);
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

/**
 * @typedef {{version:string,commit:string,requirements_sha256:string}} SpeckitPin
 * @typedef {{version:string|null,commit:string,tree:string}} AtvPin
 */

/**
 * Build the lock from the base lock's maintainer-owned fields and the resolved pins. A
 * non-null ATV version means release tracking (`ref: v<x.y.z>`); null means main tracking.
 * @param {VendoredEntry[]} entries
 * @param {{base:any,speckit:SpeckitPin,atv:AtvPin}} pins
 * @param {Record<string,{version:string,repo:string,tag:string,commit:string,tree:string,license:string}>} [optional]
 */
export function lockFile(entries, { base, speckit, atv }, optional = {}) {
  const named = Object.fromEntries(Object.entries(optional).map(([id, pin]) =>
    [id, Object.fromEntries(OPTIONAL_PIN_FIELDS.map(field => [field, pin[field]]))]));
  const baseSpeckit = base?.upstreams?.speckit ?? {};
  const baseAtv = base?.upstreams?.atv ?? {};
  const release = atv.version ? `v${atv.version}` : null;
  return {
    schema: 1, generated_by: 'baton sync 0.1.4',
    'x-bump-summary': /** @type {string|undefined} */ (undefined),
    upstreams: {
      speckit: {
        package: baseSpeckit.package ?? 'specify-cli', version: speckit.version, repo: repoSlug(SPECKIT_REPO),
        tag: `v${speckit.version}`, commit: speckit.commit, requirements: lockedRequirements,
        requirements_sha256: speckit.requirements_sha256, license: 'MIT',
        init_args: baseSpeckit.init_args ?? ['--integration', 'copilot', '--script', 'sh']
      },
      atv: {
        package: baseAtv.package ?? 'atv-starterkit', version: atv.version, repo: repoSlug(ATV_REPO),
        ...(release ? { tag: release } : {}), ref: release ?? 'main', commit: atv.commit, tree: atv.tree, license: 'MIT',
        ...(baseAtv.note === undefined ? {} : { note: baseAtv.note })
      },
      ...named
    },
    files: entries.map(({ bytes, ...entry }) => entry)
  };
}

/**
 * Parse an immutable bump request; returns null for any other value.
 * @param {string} value
 * @returns {{upstream:'speckit'|'atv',kind:'version'|'commit',value:string}|null}
 */
export function parseBump(value) {
  const match = /^(speckit|atv)=(.+)$/.exec(value);
  const pin = match?.[2];
  if (!match || !(isVersion(pin) || (match[1] === 'atv' && isSha(pin)))) return null;
  return { upstream: /** @type {'speckit'|'atv'} */ (match[1]),
    kind: isSha(pin) ? 'commit' : 'version', value: /** @type {string} */ (pin) };
}

/** @param {any} previous @param {any} next */
export function formatBumpSummary(previous, next) {
  const pinLines = [];
  if (previous.upstreams.speckit.commit !== next.upstreams.speckit.commit) {
    pinLines.push(`- Spec Kit: ${previous.upstreams.speckit.version} (\`${previous.upstreams.speckit.commit}\`) → ${next.upstreams.speckit.version} (\`${next.upstreams.speckit.commit}\`). [Releases](${SPECKIT_REPO}/releases).`);
  }
  if (previous.upstreams.atv.commit !== next.upstreams.atv.commit) {
    const label = (/** @type {{version?:string|null,commit:string}} */ pin) => pin.version ? `${pin.version} (\`${pin.commit}\`)` : `\`${pin.commit}\``;
    pinLines.push(`- ATV: ${label(previous.upstreams.atv)} → ${label(next.upstreams.atv)}. [Compare](${ATV_REPO}/compare/${previous.upstreams.atv.commit}...${next.upstreams.atv.commit}).`);
  }
  const oldFiles = new Map(previous.files.map((/** @type {{stored_at:string,sha256:string}} */ file) => [file.stored_at, file.sha256]));
  const newFiles = new Map(next.files.map((/** @type {{stored_at:string,sha256:string}} */ file) => [file.stored_at, file.sha256]));
  const added = [...newFiles.keys()].filter(path => !oldFiles.has(path)).sort();
  const changed = [...newFiles.keys()].filter(path => oldFiles.has(path) && oldFiles.get(path) !== newFiles.get(path)).sort();
  const removed = [...oldFiles.keys()].filter(path => !newFiles.has(path)).sort();
  const command = previous.upstreams.speckit.commit !== next.upstreams.speckit.commit ?
    `speckit=${next.upstreams.speckit.version}` : `atv=${next.upstreams.atv.version || next.upstreams.atv.commit}`;
  const list = (/** @type {string[]} */ paths) => paths.length ? paths.map(path => `- \`${path}\``).join('\n') : '- None';
  return `### Upstream bump (PR summary)\n\n${pinLines.join('\n') || '- Pins unchanged (re-synced upstream payload).'}\n\n` +
    `**Added (${added.length})**\n${list(added)}\n\n**Changed (${changed.length})**\n${list(changed)}\n\n` +
    `**Removed (${removed.length})**\n${list(removed)}\n\n` +
    `Reproduce: \`baton sync --bump ${command}\`, then \`baton sync --check\`.\n`;
}

/** @param {ReturnType<typeof lockFile>} lock */
export function diffDocument(lock) {
  const upstreamCounts = Object.entries(lock.upstreams).map(([id, pin]) => {
    if (Object.hasOwn(OPTIONAL_SOURCES, id) && 'tag' in pin && 'tree' in pin) {
      return `- ${id}: ${pin.repo} ${pin.tag} at \`${pin.commit}\` (tree \`${pin.tree}\`)`;
    }
    const channel = 'version' in pin && pin.version ? pin.version : 'ref' in pin ? pin.ref : '';
    const tree = 'tree' in pin ? pin.tree : null;
    return `- ${id}: ${channel} at \`${pin.commit}\`${tree ? ` (tree \`${tree}\`)` : ''}`;
  }).join('\n');
  const rows = lock.files.map(entry =>
    `| \`${entry.stored_at}\` | ${entry['x-baton-source'] ? 'Baton via Spec Kit' : entry.upstream} | \`${entry['x-baton-source'] || entry.upstream_path}\` | \`${entry.sha256.slice(0, 12)}\` | ${entry.repair?.id || 'none'} |`).join('\n');
  return `# Upstream snapshot\n\nGenerated by \`baton sync\`. Upstream files are byte-identical to their verified source unless a declared repair is recorded. Baton extension copies and hook skills are produced from the recorded local source by the pinned Spec Kit generator; generated hook text and hooks YAML use LF on every host.\n\n${upstreamCounts}\n\n${lock['x-bump-summary'] ? `${lock['x-bump-summary']}\n` : ''}| Stored at | Source | Upstream path | SHA-256 prefix | Repair |\n|---|---|---|---|---|\n${rows}\n`;
}

/** @param {string} root @param {Array<{path:string,bytes:Buffer}>} expected @param {boolean} check */
export function snapshotDrift(root, expected, check) {
  const drift = expected.filter(({ path, bytes }) =>
    !existsSync(join(root, ...path.split('/'))) ||
    sha256(readFileSync(join(root, ...path.split('/')))) !== sha256(bytes)).map(item => item.path);
  if (check && drift.length) throw new UpstreamError('E_SYNC_DRIFT', drift.join('\n'));
  return drift;
}

/**
 * Injectable upstream operations; tests replace network and tool access.
 * @typedef {{regenerateRequirements:typeof regenerateRequirements,resolveTag:typeof resolveTag,
 *   resolveCommit:typeof resolveCommit,fetchAtv:typeof fetchAtv,fetchSource:typeof fetchSource,
 *   prepareSpeckit:typeof prepareSpeckit}} SyncDeps
 */

/** @param {{cwd?:string,check?:boolean,bump?:string|null,deps?:Partial<SyncDeps>}} [options] */
export function sync({ cwd = process.cwd(), check = false, bump = null, deps = {} } = {}) {
  /** @type {SyncDeps} */
  const use = { regenerateRequirements, resolveTag, resolveCommit, fetchAtv, fetchSource, prepareSpeckit, ...deps };
  const root = resolve(cwd);
  const { packs, repairs } = packDefinitions(root);
  if (check && bump) throw new UpstreamError('E_USAGE', '--check and --bump cannot be combined');
  const request = bump === null ? null : parseBump(bump);
  if (bump !== null && !request) throw new UpstreamError('E_USAGE', `Invalid --bump value: ${bump}`);
  const lockPath = join(root, 'baton.lock.json');
  if (!existsSync(lockPath)) throw new UpstreamError('E_SYNC_DRIFT', 'baton.lock.json is required');
  const oldLock = JSON.parse(readFileSync(lockPath, 'utf8'));
  const bumpSpeckit = request?.upstream === 'speckit';
  const bumpAtv = request?.upstream === 'atv' ? request : null;
  const requirementsPath = join(root, ...lockedRequirements.split('/'));
  const requirementsInput = join(root, 'baton', 'upstream', 'specify-cli.requirements.in');
  const previousRequirements = bumpSpeckit ? readFileSync(requirementsPath) : null;
  const previousInput = bumpSpeckit ? readFileSync(requirementsInput) : null;
  const restore = () => {
    if (previousRequirements && previousInput) {
      writeFileSync(requirementsPath, previousRequirements);
      writeFileSync(requirementsInput, previousInput);
    }
  };
  const version = bumpSpeckit && request ? request.value : oldLock.upstreams?.speckit?.version;
  const optionalIds = Object.keys(OPTIONAL_SOURCES)
    .filter(id => packs.some(pack => pack.files.some(file => file.from === id)));
  for (const id of optionalIds) {
    const pin = OPTIONAL_SOURCES[id];
    const locked = oldLock.upstreams?.[id];
    if (locked && OPTIONAL_PIN_FIELDS.some(field => locked[field] !== pin[field])) {
      throw new UpstreamError('E_UPSTREAM_VERIFY', `Lock pin for ${id} differs from the vetted ${pin.repo} ${pin.tag} ref`);
    }
  }
  const work = workspace(root);
  try {
    const requirementsHash = bumpSpeckit ? use.regenerateRequirements(root, version) : sha256(readFileSync(requirementsPath));
    if (!bumpSpeckit && oldLock.upstreams?.speckit?.requirements_sha256 !== requirementsHash) {
      throw new UpstreamError('E_UPSTREAM_VERIFY', 'Hash-locked requirements differ from baton.lock.json');
    }
    const speckitCommit = bumpSpeckit ?
      use.resolveTag({ work: work.path, name: 'Spec Kit', repo: SPECKIT_REPO, tag: `v${version}` }).commit :
      oldLock.upstreams?.speckit?.commit;
    /** @type {AtvPin} */
    let atvPin = { version: oldLock.upstreams?.atv?.version ?? null,
      commit: oldLock.upstreams?.atv?.commit, tree: oldLock.upstreams?.atv?.tree };
    if (bumpAtv?.kind === 'version') {
      atvPin = { version: bumpAtv.value,
        ...use.resolveTag({ work: work.path, name: 'ATV', repo: ATV_REPO, tag: `v${bumpAtv.value}` }) };
    } else if (bumpAtv) {
      atvPin = { version: null, ...use.resolveCommit({ work: work.path, name: 'ATV', repo: ATV_REPO, commit: bumpAtv.value }) };
    }
    const atv = use.fetchAtv({ work: work.path, commit: atvPin.commit, tree: atvPin.tree });
    /** @type {Record<string,string>} */
    const sources = {};
    for (const id of optionalIds) sources[id] = use.fetchSource({ work: work.path, id });
    const project = use.prepareSpeckit({ root, work: work.path, version });
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
    const { vendored: entries, authored } = prepareEntries(root, project, atv, packs, repairs, oldLock, Boolean(bump), sources);
    const lock = lockFile(entries, {
      base: oldLock, speckit: { version, commit: speckitCommit, requirements_sha256: requirementsHash }, atv: atvPin
    }, Object.fromEntries(optionalIds.map(id => [id, OPTIONAL_SOURCES[id]])));
    if (bump) lock['x-bump-summary'] = formatBumpSummary(oldLock, lock);
    else if (oldLock['x-bump-summary']) lock['x-bump-summary'] = oldLock['x-bump-summary'];
    const expected = [
      ...entries.map(entry => ({ path: entry.stored_at, bytes: entry.bytes })),
      ...authored.map(entry => ({ path: entry.stored_at, bytes: entry.bytes })),
      { path: 'baton.lock.json', bytes: Buffer.from(`${JSON.stringify(lock, null, 2)}\n`) },
      { path: 'docs/reference/upstream-diff.md', bytes: Buffer.from(diffDocument(lock)) }
    ];
    const drift = snapshotDrift(root, expected, check);
    if (!check) for (const { path, bytes } of expected) {
      const target = join(root, ...path.split('/'));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, bytes);
    }
    return { files: entries.length, changed: drift, lock };
  } catch (error) {
    restore();
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
  if (bump !== null && !parseBump(bump)) {
    return { errors: [{ code: 'E_USAGE', message: `Invalid --bump value: ${bump}` }], exitCode: 2 };
  }
  try {
    const result = sync({ cwd, check, bump });
    return { data: { files: result.files, changed: result.changed,
      ...(bump ? { summary: result.lock['x-bump-summary'] } : {}) }, errors: [] };
  } catch (error) {
    if (!(error instanceof UpstreamError)) throw error;
    return {
      errors: [{ code: error.code, message: error.message.replace(`${error.code} `, '') }],
      exitCode: error.code === 'E_PREREQUISITE' ? 5 : error.code === 'E_USAGE' ? 2 : 1
    };
  }
}

export default sync;
