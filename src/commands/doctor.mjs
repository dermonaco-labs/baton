import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import YAML from 'yaml';
import { BatonError } from '../lib/report.mjs';
import { hashFile } from '../lib/hash.mjs';
import { withinRoot } from '../lib/manifest.mjs';

const execFileAsync = promisify(execFile);

/** @param {string} command @param {string[]} args */
async function available(command, args = ['--version']) {
  try {
    await execFileAsync(command, args, { timeout: 5000, windowsHide: true });
    return true;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;
    throw error;
  }
}

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  if (args.some((arg) => arg !== '--strict')) throw new BatonError('E_USAGE', 'doctor accepts only --strict', 2);
  /** @type {Array<{code:string,file:string,message:string}>} */
  const warnings = [];
  const errors = [];
  /** @param {string} code @param {string} file @param {string} message */
  const report = (code, file, message) => warnings.push({ code, file, message });
  if (Number(process.versions.node.split('.')[0]) < 20) errors.push({ code: 'E_PREREQUISITE', message: 'Node 20+ is required' });
  if (!await available('git')) report('W_PREREQUISITE', '', 'git is unavailable');
  if (!await available('bash') && !await available('pwsh')) report('W_PREREQUISITE', '', 'Neither bash nor pwsh is available for Spec Kit scripts');

  let manifest;
  try {
    manifest = JSON.parse(await readFile(withinRoot(root, '.baton/manifest.json'), 'utf8'));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') report('W_MANIFEST', '.baton/manifest.json', 'Install manifest is absent');
    else errors.push({ code: 'E_MANIFEST', file: '.baton/manifest.json', message: error instanceof Error ? error.message : String(error) });
  }
  for (const entry of manifest?.files ?? []) {
    try {
      if (await hashFile(withinRoot(root, entry.path)) !== entry.sha256) errors.push({ code: 'E_LOCK_MISMATCH', file: entry.path, message: 'Managed file differs from manifest' });
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') errors.push({ code: 'E_MISSING_ARTIFACT', file: entry.path, message: 'Managed file is missing' });
      else throw error;
    }
  }
  let extension;
  try {
    extension = YAML.parse(await readFile(withinRoot(root, '.specify/extensions.yml'), 'utf8'));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') report('W_HOOKS_MISSING', '.specify/extensions.yml', 'Spec Kit Baton hooks are not registered');
    else errors.push({ code: 'E_CONFIG', file: '.specify/extensions.yml', message: error instanceof Error ? error.message : String(error) });
  }
  if (extension && !JSON.stringify(extension).includes('baton')) report('W_HOOKS_MISSING', '.specify/extensions.yml', 'No Baton extension is registered');
  for (const path of ['.github/copilot-setup-steps.yml', '.github/workflows/baton.yml']) {
    try {
      await readFile(withinRoot(root, path));
      if (path.includes('copilot-setup-steps')) report('W_SETUP_STEPS_MISPLACED', path, 'Setup steps must live under workflows');
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
      if (path.includes('baton.yml')) report('W_NO_ADOPTER_CI', path, 'Adopter validation workflow is missing');
    }
  }
  try {
    await readFile(withinRoot(root, 'baton.lock.json'));
    if (!await available('uv')) report('W_PREREQUISITE', '', 'uv is required for maintainer sync');
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
  }
  return { errors: args.includes('--strict') ? [...errors, ...warnings] : errors, warnings: args.includes('--strict') ? [] : warnings, data: { version: '0.1.0', pins: manifest?.upstreams, packs: manifest?.packs } };
}
