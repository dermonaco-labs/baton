import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, parse, resolve, sep } from 'node:path';

export const ATV_REPO = 'https://github.com/All-The-Vibes/ATV-StarterKit';
export const SPECKIT_REPO = 'https://github.com/github/spec-kit';
/** Root-relative, forward-slash paths of the hash-locked specify-cli requirements. */
export const SPECKIT_REQUIREMENTS = Object.freeze({
  input: 'baton/upstream/specify-cli.requirements.in',
  output: 'baton/upstream/specify-cli.requirements.txt',
});

/** `owner/name` of a GitHub repository URL. @param {string} url */
export const repoSlug = url => new URL(url).pathname.slice(1);
/** A stable semver release version without prefix or suffix. @param {unknown} value @returns {value is string} */
export const isVersion = value => typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);
/** A full lowercase 40-hex commit or tree SHA. @param {unknown} value @returns {value is string} */
export const isSha = value => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);

export class UpstreamError extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(`${code} ${message}`);
    this.name = 'UpstreamError';
    this.code = code;
  }
}

/** @param {import('node:crypto').BinaryLike} bytes */
export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** @param {string} command @param {string[]} args @param {{cwd?:string,env?:NodeJS.ProcessEnv}} [options] */
export function run(command, args, { cwd, env } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true
  });
  if (result.error && 'code' in result.error && result.error.code === 'ENOENT') {
    throw new UpstreamError('E_PREREQUISITE', `${command} is required for baton sync`);
  }
  if (result.error || result.status !== 0) {
    const details = (result.stderr || result.stdout || result.error?.message || '').trim();
    throw new UpstreamError('E_UPSTREAM_VERIFY', `${command} ${args.join(' ')} failed: ${details}`);
  }
  return result.stdout.trim();
}

/** @param {string} root */
export function workspace(root) {
  const base = join(root, 'baton', 'upstream');
  mkdirSync(base, { recursive: true });
  const path = mkdtempSync(join(base, '.sync-work-'));
  return { path, cleanup: () => rmSync(path, { recursive: true, force: true, maxRetries: 5 }) };
}

/** @param {{root:string,work:string,script?:string,version:string}} options */
export function prepareSpeckit({ root, work, script = 'sh', version }) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new UpstreamError('E_UPSTREAM_VERIFY', `Invalid specify-cli version: ${version}`);
  if (!['sh', 'ps', 'py'].includes(script)) throw new UpstreamError('E_USAGE', `Unsupported script: ${script}`);
  const requirements = join(root, ...SPECKIT_REQUIREMENTS.output.split('/'));
  if (!existsSync(requirements)) throw new UpstreamError('E_PREREQUISITE', `Missing ${requirements}`);
  const venv = join(work, 'venv');
  const project = join(work, 'project');
  mkdirSync(project, { recursive: true });
  run('uv', ['venv', '--python', '3.11', venv], { cwd: root });
  const python = join(venv, process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
  const specify = join(venv, process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'specify.exe' : 'specify');
  run('uv', ['pip', 'install', '--require-hashes', '--python', python, '-r', requirements], { cwd: root });
  const licensePath = join(venv, process.platform === 'win32' ? 'Lib' : 'lib',
    process.platform === 'win32' ? 'site-packages' : 'python3.11/site-packages',
    `specify_cli-${version}.dist-info`, 'licenses', 'LICENSE');
  if (!existsSync(licensePath) ||
      !/^MIT License\s*\r?\n/.test(readFileSync(licensePath, 'utf8')) ||
      !readFileSync(licensePath, 'utf8').includes('Copyright GitHub, Inc.')) {
    throw new UpstreamError('E_LICENSE', `specify-cli ${version} lacks its expected MIT license in the installed wheel`);
  }
  const installed = run(specify, ['--version'], { cwd: project });
  if (!installed.includes(version)) throw new UpstreamError('E_UPSTREAM_VERIFY', `Expected specify-cli ${version}, got ${installed}`);
  run(specify, ['init', '--here', '--integration', 'copilot', '--script', script, '--force', '--ignore-agent-tools'], { cwd: project });
  const extension = resolve(root, 'baton', 'speckit-extension');
  const preset = resolve(root, 'baton', 'speckit-preset');
  for (const source of [extension, preset]) {
    if (!existsSync(source)) throw new UpstreamError('E_PREREQUISITE', `Missing ${source}`);
  }
  run(specify, ['extension', 'add', '--dev', extension], { cwd: project });
  run(specify, ['preset', 'add', '--dev', preset], { cwd: project });
  return project;
}

/** Spec Kit extensions bundled in the pinned wheel that a Baton pack may ship. */
export const SPECKIT_EXTENSIONS = Object.freeze(['github']);

/**
 * Sorted, distinct Spec Kit extension ids that the given pack definitions route files through.
 * @param {Iterable<{files?:Array<{extension?:string}>}|undefined>} definitions
 * @returns {string[]}
 */
export function packExtensionIds(definitions) {
  const ids = new Set();
  for (const definition of definitions) {
    for (const file of definition?.files ?? []) if (file.extension !== undefined) ids.add(file.extension);
  }
  return [...ids].sort();
}

/**
 * Derive the extension tree: a copy of the generated core project with one bundled Spec Kit extension added by the
 * verified `specify` from `work/venv`. The core project is left untouched; on failure nothing remains.
 * @param {{work:string,project:string,extension:string}} options
 */
export function prepareSpeckitExtension({ work, project, extension }) {
  if (!SPECKIT_EXTENSIONS.includes(extension)) throw new UpstreamError('E_USAGE', `Unsupported Spec Kit extension: ${extension}`);
  const bin = process.platform === 'win32' ? 'Scripts' : 'bin';
  const specify = join(work, 'venv', bin, process.platform === 'win32' ? 'specify.exe' : 'specify');
  if (!existsSync(specify) || !existsSync(project)) {
    throw new UpstreamError('E_UPSTREAM_VERIFY', `Spec Kit extension ${extension} needs the verified core project first`);
  }
  const tree = join(work, `project-${extension}`);
  rmSync(tree, { recursive: true, force: true });
  try {
    cpSync(project, tree, { recursive: true, verbatimSymlinks: true });
    run(specify, ['extension', 'add', extension], { cwd: tree });
    if (!existsSync(join(tree, '.specify', 'extensions', extension, 'extension.yml'))) {
      throw new UpstreamError('E_UPSTREAM_VERIFY', `Spec Kit extension ${extension} did not install its manifest`);
    }
  } catch (error) {
    rmSync(tree, { recursive: true, force: true });
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError('E_UPSTREAM_VERIFY', `Spec Kit extension ${extension} failed: ${error}`);
  }
  return tree;
}

/**
 * Resolve a fetched git ref to its verified immutable commit and tree.
 * @param {{work:string,name:string,repo:string,ref:string,commit?:string}} options
 * @returns {{commit:string,tree:string}}
 */
function resolveRef({ work, name, repo, ref, commit }) {
  const probe = mkdtempSync(join(work, `${name}-pin-`));
  run('git', ['init', '-q', probe]);
  run('git', ['-C', probe, 'fetch', '--depth', '1', repo, ref]);
  const actualCommit = run('git', ['-C', probe, 'rev-parse', 'FETCH_HEAD^{commit}']);
  const tree = run('git', ['-C', probe, 'rev-parse', 'FETCH_HEAD^{tree}']);
  if (!/^[a-f0-9]{40}$/.test(actualCommit) || !/^[a-f0-9]{40}$/.test(tree) || (commit && actualCommit !== commit)) {
    throw new UpstreamError('E_UPSTREAM_VERIFY', `${name} ${ref} did not resolve to an immutable commit`);
  }
  return { commit: actualCommit, tree };
}

/**
 * Resolve a release tag (`v<x.y.z>`) of a pinned upstream repository.
 * @param {{work:string,name:string,repo:string,tag:string}} options
 */
export function resolveTag({ work, name, repo, tag }) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new UpstreamError('E_USAGE', `${name} release tag must be v<x.y.z>: ${tag}`);
  return resolveRef({ work, name, repo, ref: `refs/tags/${tag}` });
}

/**
 * Resolve and verify a full commit id of a pinned upstream repository.
 * @param {{work:string,name:string,repo:string,commit:string}} options
 */
export function resolveCommit({ work, name, repo, commit }) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new UpstreamError('E_USAGE', `${name} bump requires a full commit SHA`);
  return resolveRef({ work, name, repo, ref: commit, commit });
}

/** @param {{work:string,commit:string,tree:string}} options */
export function fetchAtv({ work, commit, tree }) {
  if (!/^[a-f0-9]{40}$/.test(commit) || !/^[a-f0-9]{40}$/.test(tree)) {
    throw new UpstreamError('E_UPSTREAM_VERIFY', 'ATV pin must specify complete commit and tree ids');
  }
  const repo = join(work, 'atv');
  mkdirSync(repo, { recursive: true });
  run('git', ['init', '-q', repo]);
  run('git', ['-C', repo, 'config', '--local', 'core.autocrlf', 'false']);
  run('git', ['-C', repo, 'fetch', '--depth', '1', ATV_REPO, commit]);
  const actualCommit = run('git', ['-C', repo, 'rev-parse', 'FETCH_HEAD^{commit}']);
  const actualTree = run('git', ['-C', repo, 'rev-parse', 'FETCH_HEAD^{tree}']);
  if (actualCommit !== commit || actualTree !== tree) {
    throw new UpstreamError('E_UPSTREAM_VERIFY', `ATV expected ${commit}/${tree}, fetched ${actualCommit}/${actualTree}`);
  }
  run('git', ['-C', repo, 'checkout', '-q', '--detach', 'FETCH_HEAD']);
  const license = readFileSync(join(repo, 'LICENSE'), 'utf8');
  verifyMitLicense(license, 'Copyright (c) 2026 All The Vibes', 'ATV');
  return repo;
}

/** Locked optional-source pin fields, in lock projection order. */
export const OPTIONAL_PIN_FIELDS = Object.freeze(/** @type {const} */ (['version', 'repo', 'tag', 'commit', 'tree', 'license']));

/**
 * Optional, opt-in sources vendored only as inert pack payload under `.baton/vendor/<id>/`.
 * @type {Readonly<Record<string, Readonly<{version:string,repo:string,tag:string,commit:string,tree:string,license:'MIT',copyright:string}>>>}
 */
export const OPTIONAL_SOURCES = Object.freeze({
  'token-budget': Object.freeze({
    version: '1.1.0', repo: 'tinesoft/spec-kit-token-budget', tag: 'v1.1.0',
    commit: '11c5589f347ddb3789b51b09927ef825c88e3f19', tree: '0188d6c187e1f1ddc03293660cc8e4d129ea0fa5',
    license: 'MIT', copyright: 'Copyright (c) 2026 Tine Kondo',
  }),
  optimize: Object.freeze({
    version: '1.0.0', repo: 'sakitA/spec-kit-optimize', tag: 'v1.0.0',
    commit: 'd6dba6ae93bf60322deee3bdc4ffcf127e42b2b9', tree: 'c5bb7b7a37912ef26bc369397980c26c3d70cf7b',
    license: 'MIT', copyright: 'Copyright (c) 2026 sakitA',
  }),
});

/** @param {string} text @param {string} copyright @param {string} label */
export function verifyMitLicense(text, copyright, label) {
  if (!/^MIT License\s*\r?\n/.test(text) || !text.includes(copyright)) {
    throw new UpstreamError('E_LICENSE', `Pinned ${label} LICENSE is not the expected MIT license`);
  }
}

/** @param {{work:string,id:string,pin?:{repo:string,tag:string,commit:string,tree:string,copyright:string}}} options */
export function fetchSource({ work, id, pin = OPTIONAL_SOURCES[id] }) {
  if (!pin) throw new UpstreamError('E_UPSTREAM_VERIFY', `Unknown optional source ${id}`);
  if (!/^[a-f0-9]{40}$/.test(pin.commit) || !/^[a-f0-9]{40}$/.test(pin.tree) ||
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(pin.repo) || !/^[A-Za-z0-9_.-]+$/.test(pin.tag)) {
    throw new UpstreamError('E_UPSTREAM_VERIFY', `${id} pin must specify repository, tag and complete commit and tree ids`);
  }
  const repo = join(work, `source-${id}`);
  mkdirSync(repo, { recursive: true });
  run('git', ['init', '-q', repo]);
  run('git', ['-C', repo, 'config', '--local', 'core.autocrlf', 'false']);
  run('git', ['-C', repo, 'fetch', '--depth', '1', `https://github.com/${pin.repo}`, `refs/tags/${pin.tag}`]);
  const actualCommit = run('git', ['-C', repo, 'rev-parse', 'FETCH_HEAD^{commit}']);
  const actualTree = run('git', ['-C', repo, 'rev-parse', 'FETCH_HEAD^{tree}']);
  if (actualCommit !== pin.commit || actualTree !== pin.tree) {
    throw new UpstreamError('E_UPSTREAM_VERIFY',
      `${id} ${pin.tag} expected ${pin.commit}/${pin.tree}, fetched ${actualCommit}/${actualTree}`);
  }
  run('git', ['-C', repo, 'checkout', '-q', '--detach', 'FETCH_HEAD']);
  const license = join(repo, 'LICENSE');
  if (!existsSync(license)) throw new UpstreamError('E_LICENSE', `Pinned ${id} has no LICENSE`);
  verifyMitLicense(readFileSync(license, 'utf8'), pin.copyright, id);
  return repo;
}

/**
 * Whether compiled requirements text names a path inside `root`, natively or with forward slashes. A path counts
 * only when the root is followed by a separator, so `/spec` does not match `/specify-cli`. A filesystem root prefixes
 * every absolute path, so there only the rooted requirements files count.
 * @param {string} text @param {string} root
 */
export function recordsMachineLocalPath(text, root) {
  const absolute = resolve(root);
  const needles = absolute === parse(absolute).root
    ? Object.values(SPECKIT_REQUIREMENTS).map(path => join(absolute, ...path.split('/')))
    : [`${absolute}${sep}`];
  return needles.some(needle => text.includes(needle) || text.includes(needle.replaceAll('\\', '/')));
}

/** @param {string} root @param {string} version */
export function regenerateRequirements(root, version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new UpstreamError('E_USAGE', `Invalid specify-cli version: ${version}`);
  const input = join(root, ...SPECKIT_REQUIREMENTS.input.split('/'));
  const output = join(root, ...SPECKIT_REQUIREMENTS.output.split('/'));
  if (!existsSync(input)) throw new UpstreamError('E_PREREQUISITE', `Missing ${input}`);
  const previousInput = readFileSync(input);
  const previousOutput = existsSync(output) ? readFileSync(output) : null;
  try {
    writeFileSync(input, `specify-cli==${version}\n`);
    // Root-relative paths keep uv's generated header free of machine-local paths.
    run('uv', ['pip', 'compile', '--generate-hashes', '--python-version', '3.11',
      SPECKIT_REQUIREMENTS.input, '-o', SPECKIT_REQUIREMENTS.output], { cwd: root });
    const compiled = readFileSync(output, 'utf8');
    if (!compiled.includes(`specify-cli==${version} \\`) || !compiled.includes('--hash=sha256:')) {
      throw new UpstreamError('E_UPSTREAM_VERIFY', 'uv did not produce a hash-locked specify-cli requirements file');
    }
    if (recordsMachineLocalPath(compiled, root)) {
      throw new UpstreamError('E_UPSTREAM_VERIFY', 'uv recorded a machine-local path in the requirements file');
    }
    return sha256(Buffer.from(compiled));
  } catch (error) {
    writeFileSync(input, previousInput);
    if (previousOutput) writeFileSync(output, previousOutput);
    throw error;
  }
}
