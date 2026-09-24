import { readFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import YAML from 'yaml';
import { BatonError } from '../lib/report.mjs';
import { hashFile } from '../lib/hash.mjs';
import { withinRoot } from '../lib/manifest.mjs';
import { missingRecommendations, recommendationWarnings } from '../lib/packs.mjs';
import { assertFrontmatter } from '../lib/repairs.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

const execFileAsync = promisify(execFile);
const phases = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'implement', 'converge'];

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
  /** @type {Array<{code:string,file:string,message:string}>} */
  const warnings = [];
  /** @type {Array<{code:string,file?:string,message:string}>} */
  const errors = [];
  /** @param {string} code @param {string} file @param {string} message */
  const report = (code, file, message) => warnings.push({ code, file, message });
  if (Number(process.versions.node.split('.')[0]) < 20) report('W_PREREQUISITE', '', 'Node 20+ is required');
  if (!await available('git')) report('W_PREREQUISITE', '', 'git is unavailable');
  if (!await available('bash') && !await available('pwsh')) report('W_PREREQUISITE', '', 'Neither bash nor pwsh is available for Spec Kit scripts');

  let manifest;
  try {
    manifest = JSON.parse(await readFile(withinRoot(root, '.baton/manifest.json'), 'utf8'));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') report('W_MANIFEST', '.baton/manifest.json', 'Install manifest is absent');
    else report('W_MANIFEST', '.baton/manifest.json', error instanceof Error ? error.message : String(error));
  }
  for (const entry of manifest?.files ?? []) {
    try {
      if (await hashFile(withinRoot(root, entry.path)) !== entry.sha256) report('W_MANIFEST_INTEGRITY', entry.path, 'Managed file differs from manifest');
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') report('W_MANIFEST_INTEGRITY', entry.path, 'Managed file is missing');
      else throw error;
    }
  }
  let extension;
  try {
    extension = YAML.parse(await readFile(withinRoot(root, '.specify/extensions.yml'), 'utf8'));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') report('W_HOOKS_MISSING', '.specify/extensions.yml', 'Spec Kit Baton hooks are not registered');
    else report('W_HOOKS_MISSING', '.specify/extensions.yml', error instanceof Error ? error.message : String(error));
  }
  if (extension) {
    if (!extension.installed?.includes('baton') || extension.settings?.auto_execute_hooks !== true) {
      report('W_HOOKS_MISSING', '.specify/extensions.yml', 'Baton extension and automatic hooks must be enabled');
    }
    for (const phase of phases) {
      for (const [when, command] of [['before', 'speckit.baton.receive'], ['after', 'speckit.baton.handoff']]) {
        const event = `${when}_${phase}`;
        if (!extension.hooks?.[event]?.some((/** @type {{extension:string,command:string,enabled:boolean,optional:boolean,condition?:unknown}} */ hook) => hook.extension === 'baton' &&
            hook.command === command && hook.enabled === true && hook.optional === false &&
            (hook.condition === undefined || hook.condition === null))) {
          report('W_HOOKS_MISSING', '.specify/extensions.yml', `${event} must register the unconditional mandatory ${command} hook`);
        }
      }
    }
  }
  let config;
  try {
    config = YAML.parse(await readFile(withinRoot(root, '.baton/config.yml'), 'utf8'));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') {
      report('W_CONFIG', '.baton/config.yml', error instanceof Error ? error.message : String(error));
    }
  }
  const allowed = config?.models?.allowed;
  if (Array.isArray(allowed) && allowed.length && config?.models?.enforce !== 'off') {
    for (const [name, role] of Object.entries(config.models.roles ?? {})) {
      if (role?.model && !allowed.includes(role.model)) {
        report('W_MODEL_NOT_ALLOWED', '.baton/config.yml', `Role ${name} selects model ${role.model} outside models.allowed`);
      }
    }
  }
  try {
    for (const name of await readdir(withinRoot(root, '.github/agents'))) {
      if (!name.endsWith('.agent.md')) continue;
      const file = `.github/agents/${name}`;
      const bytes = await readFile(withinRoot(root, file));
      try {
        assertFrontmatter(bytes, file);
        const { data } = parseFrontmatter(bytes.toString('utf8'));
        if (Array.isArray(allowed) && allowed.length && config?.models?.enforce !== 'off' &&
            typeof data.model === 'string' && !allowed.includes(data.model)) {
          report('W_MODEL_NOT_ALLOWED', file, `Model ${data.model} is outside models.allowed`);
        }
      } catch (error) {
        report('W_AGENT_CORRUPTED', file, error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
  }
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
  const advisory = recommendationWarnings(await missingRecommendations(root, manifest));
  return { errors: args.includes('--strict') ? [...errors, ...warnings] : errors,
    warnings: args.includes('--strict') ? advisory : [...warnings, ...advisory],
    data: { version: '0.1.0', pins: manifest?.upstreams, packs: manifest?.packs } };
}
