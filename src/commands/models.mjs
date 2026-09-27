import { readFile, writeFile } from 'node:fs/promises';
import YAML from 'yaml';
import { BatonError } from '../lib/report.mjs';
import { readManifest, writeManifest, withinRoot, isUserModified } from '../lib/manifest.mjs';
import { hashFile } from '../lib/hash.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { agentModelRole, loadModelSettings, modelPolicyIssue } from '../lib/models.mjs';

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  const [action, ...options] = args;
  if (action !== 'apply' || options.some((option) => !['--dry-run', '--force'].includes(option))) {
    throw new BatonError('E_USAGE', 'Usage: models apply [--dry-run] [--force]', 2);
  }
  const dryRun = options.includes('--dry-run');
  const settings = await loadModelSettings(root);
  if (!settings) throw new BatonError('E_CONFIG', '.baton/config.yml has no models configuration', 1);
  if (!settings.apply_to_agents && !options.includes('--force')) {
    return { data: { changed: [], message: 'Agent model writes are disabled; set apply_to_agents or use --force' } };
  }
  let manifest;
  try {
    manifest = await readManifest(root);
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    throw new BatonError('E_MANIFEST', 'models apply needs .baton/manifest.json to identify managed agents', 1);
  }
  /** @type {Array<{code:string,file:string,message:string}>} */
  const warnings = [];
  /** @type {Array<{code:string,file:string,message:string}>} */
  const errors = [];
  /** @type {Array<{path:string,content:string,entry:{sha256:string}}>} */
  const changes = [];
  for (const entry of manifest.files ?? []) {
    if (!entry.managed || !/^\.github\/agents\/[^/]+\.agent\.md$/.test(entry.path)) continue;
    const path = entry.path;
    if (await isUserModified(root, entry)) {
      warnings.push({ code: 'W_USER_MODIFIED', file: path, message: 'Managed agent differs from the manifest; model not applied' });
      continue;
    }
    const model = settings.roles?.[agentModelRole(path, entry.pack)]?.model;
    if (!model) {
      warnings.push({ code: 'W_MODEL_UNSET', file: path, message: 'The agent role has no configured model' });
      continue;
    }
    const issue = modelPolicyIssue(settings, model, path);
    if (issue) {
      (issue.code === 'E_MODEL_NOT_ALLOWED' ? errors : warnings).push(issue);
      if (issue.code === 'E_MODEL_NOT_ALLOWED') continue;
    }
    const current = await readFile(withinRoot(root, path), 'utf8');
    const { data } = parseFrontmatter(current);
    if (data.model === model) continue;
    const header = /^---\n([\s\S]*?\n)---(\r?\n|$)/.exec(current);
    if (!header) throw new BatonError('E_FRONTMATTER_MALFORMED', `${path} has no valid frontmatter`, 1);
    const document = YAML.parseDocument(header[1], { uniqueKeys: true });
    if (document.errors.length) throw new BatonError('E_FRONTMATTER_MALFORMED', `${path}: ${document.errors[0].message}`, 1);
    document.set('model', model);
    const content = `---\n${document.toString({ lineWidth: 0 })}---${header[2]}${current.slice(header[0].length)}`;
    changes.push({ path, content, entry });
  }
  if (errors.length) return { errors, warnings, data: { changed: [] } };
  if (!dryRun) {
    for (const { path, content, entry } of changes) {
      await writeFile(withinRoot(root, path), content);
      entry.sha256 = await hashFile(withinRoot(root, path));
    }
    if (changes.length) await writeManifest(root, manifest);
  }
  return { warnings, data: { changed: changes.map(({ path }) => path), dry_run: dryRun } };
}
