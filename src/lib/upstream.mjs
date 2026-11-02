import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const SPECKIT_VERSION = '1.0.11';
export const SPECKIT_COMMIT = '8147943512404afb9d99c6252cb9bf84369fd0b0';
export const ATV_COMMIT = 'ad996736b879be87c7755df5c5017d5336203bbc';
export const ATV_TREE = '777a37ef9cf15f3a6fd6a3355cc3c945e8bb1c47';
export const ATV_REPO = 'https://github.com/All-The-Vibes/ATV-StarterKit';

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

/** @param {{root:string,work:string,script?:string,version?:string}} options */
export function prepareSpeckit({ root, work, script = 'sh', version = SPECKIT_VERSION }) {
  if (!['sh', 'ps', 'py'].includes(script)) throw new UpstreamError('E_USAGE', `Unsupported script: ${script}`);
  const requirements = join(root, 'baton', 'upstream', 'specify-cli.requirements.txt');
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

/** @param {{work:string,commit?:string,tree?:string}} options */
export function fetchAtv({ work, commit = ATV_COMMIT, tree = ATV_TREE }) {
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
  if (!/^MIT License\s*\r?\n/.test(license) || !license.includes('Copyright (c) 2026 All The Vibes')) {
    throw new UpstreamError('E_LICENSE', 'Pinned ATV LICENSE is not the expected MIT license');
  }
  return repo;
}

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

/** @param {string} root @param {string} [version] */
export function regenerateRequirements(root, version = SPECKIT_VERSION) {
  const input = join(root, 'baton', 'upstream', 'specify-cli.requirements.in');
  const output = join(root, 'baton', 'upstream', 'specify-cli.requirements.txt');
  if (!existsSync(input)) throw new UpstreamError('E_PREREQUISITE', `Missing ${input}`);
  const previousInput = readFileSync(input);
  const previousOutput = existsSync(output) ? readFileSync(output) : null;
  try {
    writeFileSync(input, `specify-cli==${version}\n`);
    run('uv', ['pip', 'compile', '--generate-hashes', '--python-version', '3.11', input, '-o', output], { cwd: root });
    const compiled = readFileSync(output, 'utf8');
    if (!compiled.includes(`specify-cli==${version} \\`) || !compiled.includes('--hash=sha256:')) {
      throw new UpstreamError('E_UPSTREAM_VERIFY', 'uv did not produce a hash-locked specify-cli requirements file');
    }
    return sha256(Buffer.from(compiled));
  } catch (error) {
    writeFileSync(input, previousInput);
    if (previousOutput) writeFileSync(output, previousOutput);
    throw error;
  }
}
