import { readFile } from 'node:fs/promises';
import YAML from 'yaml';
import { withinRoot } from './manifest.mjs';

/** @typedef {{roles: Record<string,{model?:string,reasoning?:string}>,phase_roles:Record<string,string>,allowed:string[],enforce:'off'|'warn'|'error',apply_to_agents:boolean}} ModelSettings */

/** @param {string} root */
export async function loadModelSettings(root) {
  try {
    const config = YAML.parse(await readFile(withinRoot(root, '.baton/config.yml'), 'utf8'), { uniqueKeys: true });
    return /** @type {ModelSettings | null} */ (config?.models ?? null);
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return null;
    throw error;
  }
}

/** @param {ModelSettings | null} settings @param {string} phase @param {string} defaultRole */
export function resolveModel(settings, phase, defaultRole) {
  const role = settings?.phase_roles?.[phase] ?? defaultRole;
  return { role, model: settings?.roles?.[role]?.model ?? null, reasoning: settings?.roles?.[role]?.reasoning };
}

/** @param {ModelSettings | null} settings @param {unknown} model @param {string} path
 * @returns {{code:string,file:string,message:string}|null} */
export function modelPolicyIssue(settings, model, path) {
  if (!settings || settings.enforce === 'off' || !settings.allowed?.length) return null;
  if (typeof model !== 'string' || !model || settings.allowed.includes(model)) return null;
  return {
    code: settings.enforce === 'error' ? 'E_MODEL_NOT_ALLOWED' : 'W_MODEL_NOT_ALLOWED',
    file: path, message: `Model ${model} is not in models.allowed`,
  };
}

/** @param {ModelSettings | null} settings @param {string} path */
export function configuredModelIssues(settings, path = '.baton/config.yml') {
  return Object.entries(settings?.roles ?? {}).flatMap(([role, entry]) => {
    const issue = modelPolicyIssue(settings, entry.model, path);
    return issue ? [{ ...issue, message: `Role ${role}: ${issue.message}` }] : [];
  });
}

/** @param {string} path @param {string} [pack] */
export function agentModelRole(path, pack) {
  if (pack === 'research' || path.endsWith('/repo-research-analyst.agent.md')) return 'planning';
  if (pack === 'design') return 'implementation';
  return 'review';
}
