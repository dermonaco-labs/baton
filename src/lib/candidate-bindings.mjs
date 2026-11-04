// Cross-file bindings a candidate must keep with trusted base bytes. Node built-ins only: the token-holding
// publish job runs this without installing dependencies and never executes candidate content.
import { createHash } from 'node:crypto';
import { diffDocument, formatBumpSummary } from './lock-report.mjs';

export const LOCK_PATH = 'baton.lock.json';
export const DIFF_PATH = 'docs/reference/upstream-diff.md';
export const REQUIREMENTS_IN = 'baton/upstream/specify-cli.requirements.in';
export const REQUIREMENTS_TXT = 'baton/upstream/specify-cli.requirements.txt';
const HOOKS_PATH = '.specify/extensions.yml';
const EXTENSION_REGISTRY = '.specify/extensions/.registry';
const PRESET_REGISTRY = '.specify/presets/.registry';
const EXTENSION_MANIFEST = 'baton/speckit-extension/extension.yml';
const PRESET_ROOT = '.specify/presets/baton-templates/';
const PRESET_SOURCE = 'baton/speckit-preset/';
/** Every written path under these roots needs a binding below; they hold only Baton-installed content. */
const BOUND_ROOTS = ['.specify/extensions/', '.specify/presets/'];

/** @param {Buffer|string} bytes */
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** @param {unknown} a @param {unknown} b @returns {boolean} */
function same(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  const left = /** @type {Record<string,unknown>} */ (a);
  const right = /** @type {Record<string,unknown>} */ (b);
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && same(left[key], right[key]));
}

class YamlSubsetError extends Error {}

const YAML_KEY = /^([A-Za-z_][A-Za-z0-9_.-]*):(?: (.*))?$/;

/** @param {string} raw */
function yamlScalar(raw) {
  const text = raw.trim();
  if (text.startsWith("'")) {
    if (text.length < 2 || !text.endsWith("'") || text.slice(1, -1).replace(/''/g, '').includes("'")) {
      throw new YamlSubsetError(`unsupported single-quoted scalar ${JSON.stringify(text)}`);
    }
    return text.slice(1, -1).replace(/''/g, "'");
  }
  if (text.startsWith('"')) {
    const inner = text.slice(1, -1);
    if (text.length < 2 || !text.endsWith('"') || /["\\]/.test(inner)) {
      throw new YamlSubsetError(`unsupported double-quoted scalar ${JSON.stringify(text)}`);
    }
    return inner;
  }
  if (text === '' || text === 'null' || text === '~') return null;
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^[&*!|>{}[\]%@`#,?:-]/.test(text) || text.includes(': ') || text.includes(' #') || text.endsWith(':') ||
    /^(?:y|n|yes|no|on|off|true|false|null|~)$/i.test(text) || /^[-+]?(?:[\d_]*\.[\d_]*(?:[eE][-+]?\d+)?|\.(?:inf|nan))$/i.test(text) ||
    /^[-+]?\d[\d_]*[eE][-+]?\d+$/.test(text) || /^[-+]?0[box\d_]/i.test(text) || /^[-+]?\d[\d_]*(?::[0-5]?\d)+(?:\.\d*)?$/.test(text) ||
    /^\d{4}-\d\d?-\d\d?(?:$|[Tt ])/.test(text) || /^[-+]?\d[\d_]*_/.test(text)) {
    throw new YamlSubsetError(`unsupported plain scalar ${JSON.stringify(text)}`);
  }
  return /^-?(?:0|[1-9]\d{0,14})$/.test(text) ? Number(text) : text;
}

/**
 * Parse the block-style YAML subset Spec Kit writes (mappings, sequences, plain or simply quoted scalars).
 * Anything that could mean something else to a full YAML parser is rejected rather than interpreted.
 * @param {string} text
 */
export function parseYamlSubset(text) {
  if (/[\r\t]/.test(text)) throw new YamlSubsetError('carriage returns and tabs are not supported');
  /** @type {Array<{indent:number,text:string}>} */
  const lines = [];
  for (const line of text.split('\n')) {
    const body = line.trimStart();
    if (!body || body.startsWith('#')) continue;
    if (line.endsWith(' ')) throw new YamlSubsetError('trailing spaces are not supported');
    if (/^(?:---|\.\.\.|%)/.test(line)) throw new YamlSubsetError('document markers and directives are not supported');
    lines.push({ indent: line.length - body.length, text: body });
  }
  let at = 0;
  /** @param {number} indent @returns {unknown} */
  const block = indent => {
    const line = lines[at];
    if (!line || line.indent !== indent) throw new YamlSubsetError(`unexpected indentation at ${JSON.stringify(line?.text)}`);
    return line.text === '-' || line.text.startsWith('- ') ? sequence(indent) : mapping(indent);
  };
  /** @param {number} indent */
  const sequence = indent => {
    const items = [];
    while (at < lines.length && lines[at].indent === indent && (lines[at].text === '-' || lines[at].text.startsWith('- '))) {
      const rest = lines[at].text.slice(2);
      if (!rest.trim()) {
        at++;
        if (at >= lines.length || lines[at].indent <= indent) throw new YamlSubsetError('empty sequence item');
        items.push(block(lines[at].indent));
      } else if (YAML_KEY.test(rest)) {
        lines[at] = { indent: indent + 2, text: rest };
        items.push(mapping(indent + 2));
      } else {
        items.push(yamlScalar(rest));
        at++;
      }
    }
    return items;
  };
  /** @param {number} indent */
  const mapping = indent => {
    /** @type {Record<string,unknown>} */
    const map = {};
    while (at < lines.length && lines[at].indent === indent && !lines[at].text.startsWith('- ') && lines[at].text !== '-') {
      const match = YAML_KEY.exec(lines[at].text);
      if (!match) throw new YamlSubsetError(`unsupported line ${JSON.stringify(lines[at].text)}`);
      const [, key, value = ''] = match;
      if (Object.hasOwn(map, key)) throw new YamlSubsetError(`duplicate key ${key}`);
      at++;
      if (value.trim()) map[key] = yamlScalar(value);
      else if (at < lines.length && lines[at].indent > indent) map[key] = block(lines[at].indent);
      else if (at < lines.length && lines[at].indent === indent && (lines[at].text === '-' || lines[at].text.startsWith('- '))) {
        map[key] = sequence(indent);
      } else map[key] = null;
    }
    return map;
  };
  if (!lines.length) return null;
  const value = block(lines[0].indent);
  if (lines[0].indent !== 0 || at !== lines.length) throw new YamlSubsetError(`unexpected line ${JSON.stringify(lines[at]?.text)}`);
  return value;
}

/** @param {string} text @returns {{frontmatter:any,body:string}} */
function splitFrontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) throw new YamlSubsetError('missing frontmatter');
  const frontmatter = parseYamlSubset(match[1]);
  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    throw new YamlSubsetError('frontmatter is not a mapping');
  }
  return { frontmatter, body: match[2] };
}

/** @param {Buffer} bytes */
function utf8(bytes) {
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) throw new YamlSubsetError('not valid UTF-8');
  return text;
}

/**
 * Why a generated hook skill wrapper is not the trusted source in the wrapper shape the base wrapper uses, or null:
 * its frontmatter equals the base wrapper's apart from formatting, its name is its directory and its description is
 * the source's; its body is the source body after at most one plain generated heading.
 * @param {string} path @param {Buffer} bytes @param {Buffer} source @param {Buffer} base
 */
function wrapperIssue(path, bytes, source, base) {
  try {
    const wrapper = splitFrontmatter(utf8(bytes));
    const origin = splitFrontmatter(utf8(source).replace(/\r\n/g, '\n'));
    const before = splitFrontmatter(utf8(base));
    const name = path.split('/').at(-2);
    if (wrapper.frontmatter.name !== name) return `${path} names ${JSON.stringify(wrapper.frontmatter.name)}, not ${name}`;
    if (wrapper.frontmatter.description !== origin.frontmatter.description) return `${path} description differs from its Baton source`;
    if (!same(wrapper.frontmatter, before.frontmatter)) return `${path} frontmatter differs from the base wrapper`;
    const expected = origin.body.replace(/^\n+/, '');
    const body = wrapper.body.replace(/^\n+/, '');
    const unheaded = body.replace(/^# [A-Za-z0-9 ._-]{1,80}\n/, '').replace(/^\n+/, '');
    return body === expected || unheaded === expected ? null : `${path} body differs from its Baton source`;
  } catch (error) {
    return `${path} is not a supported wrapper (${error instanceof YamlSubsetError ? error.message : 'unreadable'})`;
  }
}

/**
 * Why a regenerated registry differs from the base registry other than its install time, or why its manifest
 * hash is not that of the trusted Baton manifest, or null.
 * @param {string} path @param {Buffer} bytes @param {Buffer} base @param {'extensions'|'presets'} kind
 * @param {string} id @param {string} manifestHash
 */
function registryIssue(path, bytes, base, kind, id, manifestHash) {
  let next;
  let old;
  try {
    next = JSON.parse(utf8(bytes));
    old = JSON.parse(utf8(base));
  } catch {
    return `${path} is not JSON`;
  }
  const entry = next?.[kind]?.[id];
  if (!entry || typeof entry !== 'object' || typeof entry.installed_at !== 'string' ||
    !/^\d{4}-\d\d-\d\dT[\d:.]+(?:Z|[+-]\d\d:\d\d)$/.test(entry.installed_at)) {
    return `${path} has no valid ${id} entry`;
  }
  const strip = (/** @type {any} */ value) => ({ ...value, [kind]: { ...value?.[kind], [id]: { ...value?.[kind]?.[id], installed_at: null } } });
  if (!same(strip(next), strip(old))) return `${path} differs from the base registry`;
  return entry.manifest_hash === `sha256:${manifestHash}` && entry.enabled === true ? null :
    `${path} does not register the trusted ${id} manifest`;
}

/**
 * Why `requirements.txt` is not a hash-locked uv compile of `specify-cli==<version>`, or null.
 * @param {string} text @param {string} version
 */
function requirementsIssue(text, version) {
  const lines = text.split('\n');
  let requirements = 0;
  let pending = false;
  let continued = false;
  for (const raw of lines) {
    const line = raw.trim();
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
  if (!requirements || !lines.some(line => line.trim() === `specify-cli==${version} \\`)) {
    return `${REQUIREMENTS_TXT} does not pin specify-cli==${version}`;
  }
  return null;
}

/**
 * Bindings between candidate files and trusted base bytes that path and row ownership alone cannot express.
 * Base bytes come only from `baseFile`, which reads the trusted base commit; a missing reader or base file fails.
 * @param {{id:string,manifest:{changed:Array<{path:string}>,deleted:string[]},files:Map<string,{bytes:Buffer}>,
 *   baseLock:any,lock:any,lockBytes:Buffer,version:string|null,baseFile?:(path:string)=>Buffer|null}} input
 * @returns {string[]}
 */
export function bindingIssues({ id, manifest, files, baseLock, lock, lockBytes, version, baseFile }) {
  if (typeof baseFile !== 'function') return ['the trusted base file reader is unavailable'];
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
  const issues = [];
  const written = new Map(manifest.changed.map(item => [item.path, /** @type {Buffer} */ (files.get(item.path)?.bytes)]));
  const deleted = new Set(manifest.deleted);
  for (const path of [LOCK_PATH, DIFF_PATH, REQUIREMENTS_IN, REQUIREMENTS_TXT]) {
    if (deleted.has(path)) issues.push(`${path} may not be deleted`);
  }
  if (!lockBytes.equals(Buffer.from(`${JSON.stringify(lock, null, 2)}\n`))) issues.push(`${LOCK_PATH} is not in canonical form`);
  try {
    if ((lock['x-bump-summary'] ?? '') !== formatBumpSummary(baseLock, lock)) {
      issues.push(`${LOCK_PATH} x-bump-summary is not the summary of the lock change`);
    }
    const diff = written.get(DIFF_PATH);
    if (!diff || !diff.equals(Buffer.from(diffDocument(lock)))) issues.push(`${DIFF_PATH} is not rendered from the candidate lock`);
  } catch {
    issues.push(`${LOCK_PATH} cannot be rendered`);
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
      let text = null;
      try {
        text = utf8(output);
      } catch {
        issues.push(`${REQUIREMENTS_TXT} is not valid UTF-8`);
      }
      const shape = text === null ? null : /\r/.test(text) ? `${REQUIREMENTS_TXT} contains carriage returns` : requirementsIssue(text, String(version));
      if (shape) issues.push(shape);
    }
  }
  const rows = new Map((Array.isArray(lock.files) ? lock.files : []).map((/** @type {any} */ row) => [row?.stored_at, row]));
  const bound = new Set();
  for (const [path, bytes] of written) {
    const row = rows.get(path);
    const source = row?.['x-baton-source'];
    if (typeof source === 'string') {
      bound.add(path);
      const origin = trusted(source);
      if (!origin) issues.push(`${path}: Baton source ${source} is unavailable in the base`);
      else if (sha256(origin) !== row['x-baton-source-sha256']) issues.push(`${path}: x-baton-source-sha256 is not the base ${source}`);
      else if (path.endsWith('/SKILL.md')) {
        const base = trusted(path);
        const issue = base ? wrapperIssue(path, bytes, origin, base) : `${path}: the base wrapper is unavailable`;
        if (issue) issues.push(issue);
      } else if (!bytes.equals(origin)) issues.push(`${path} differs from its Baton source ${source}`);
    } else if (path === EXTENSION_REGISTRY || path === PRESET_REGISTRY) {
      bound.add(path);
      const manifestPath = path === EXTENSION_REGISTRY ? EXTENSION_MANIFEST : `${PRESET_SOURCE}preset.yml`;
      const base = trusted(path);
      const origin = trusted(manifestPath);
      const issue = !base || !origin ? `${path}: the base registry or ${manifestPath} is unavailable` :
        path === EXTENSION_REGISTRY ? registryIssue(path, bytes, base, 'extensions', 'baton', sha256(origin)) :
          registryIssue(path, bytes, base, 'presets', 'baton-templates', sha256(origin));
      if (issue) issues.push(issue);
    } else if (path.startsWith(PRESET_ROOT)) {
      bound.add(path);
      const origin = trusted(`${PRESET_SOURCE}${path.slice(PRESET_ROOT.length)}`);
      if (!origin || !bytes.equals(origin)) issues.push(`${path} differs from its Baton preset source`);
    } else if (path === HOOKS_PATH) {
      const base = trusted(path);
      try {
        if (!base) issues.push(`${path}: the base hooks file is unavailable`);
        else if (!same(parseYamlSubset(utf8(bytes)), parseYamlSubset(utf8(base)))) issues.push(`${path} changes hook registration`);
      } catch (error) {
        issues.push(`${path} is not supported hooks YAML (${error instanceof YamlSubsetError ? error.message : 'unreadable'})`);
      }
    }
    if (!bound.has(path) && BOUND_ROOTS.some(root => path.startsWith(root))) issues.push(`${path} has no trusted Baton binding`);
  }
  return issues;
}
