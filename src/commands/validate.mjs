import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import YAML from 'yaml';
import { BatonError } from '../lib/report.mjs';
import { loadSchemas, validateSchema } from '../lib/schema.mjs';
import { validateHandoff } from '../lib/handoff.mjs';
import { loadModelSettings, modelPolicyIssue, configuredModelIssues } from '../lib/models.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../lib/frontmatter.mjs';
import { withinRoot } from '../lib/manifest.mjs';
import { scanPersonalData, denylistTerms, isLicenseNotice } from '../lib/denylist.mjs';
import { loadPhases } from '../lib/phases.mjs';
import { changedFiles } from '../lib/checks.mjs';
import { missingRecommendations, recommendationWarnings } from '../lib/packs.mjs';
import { maintainerWorkflowIssues, maintainerWorkflows } from '../lib/maintainer-workflows.mjs';

/** @param {string} directory @returns {AsyncGenerator<string>} */
async function* walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

/** @param {string} root @param {string} path */
async function exists(root, path) {
  try {
    await readFile(withinRoot(root, path));
    return true;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;
    throw error;
  }
}

/** @param {string} root @param {string} path */
async function directoryExists(root, path) {
  try {
    return (await stat(withinRoot(root, path))).isDirectory();
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;
    throw error;
  }
}

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  let selected;
  let changed = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path') {
      if (!args[i + 1]) throw new BatonError('E_USAGE', '--path needs a file or directory', 2);
      selected = args[++i];
    } else if (args[i] === '--changed') changed = true;
    else throw new BatonError('E_USAGE', `Unknown validate flag: ${args[i]}`, 2);
  }
  if (changed && selected) throw new BatonError('E_USAGE', 'Use --changed or --path, not both', 2);

  const schemas = await loadSchemas(root);
  const terms = await denylistTerms(root);
  /** @type {Array<{code:string,file?:string,message:string,pointer?:string,fix?:string}>} */
  const errors = [];
  /** @type {Array<{code:string,file?:string,message:string,pointer?:string,fix?:string}>} */
  const warnings = [];
  const models = await loadModelSettings(root);
  if (!selected || selected === '.baton/config.yml') {
    for (const issue of configuredModelIssues(models)) {
      (issue.code === 'E_MODEL_NOT_ALLOWED' ? errors : warnings).push(issue);
    }
  }
  let manifest;
  try {
    manifest = JSON.parse(await readFile(withinRoot(root, '.baton/manifest.json'), 'utf8'));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') {
      errors.push({ code: 'E_MANIFEST', file: '.baton/manifest.json', message: error instanceof Error ? error.message : String(error) });
    }
  }
  warnings.push(...recommendationWarnings(await missingRecommendations(root, manifest)));
  const changedPaths = changed ? await changedFiles(root) : null;
  if (changed && changedPaths === null) throw new BatonError('E_PREREQUISITE', '--changed requires a reachable origin/HEAD merge-base', 5);
  const locations = selected ? [withinRoot(root, selected)] : changedPaths !== null ? changedPaths.map((path) => withinRoot(root, path)) : [
    join(root, 'specs'), join(root, '.baton/quick'), join(root, '.github/skills'),
    join(root, '.github/agents'), join(root, 'packs'),
  ];
  const files = [];
  for (const location of locations) {
    try {
      const info = await stat(location);
      if (info.isDirectory()) for await (const path of walk(location)) files.push(path);
      else files.push(location);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') {
        if (selected) errors.push({ code: 'E_MISSING_ARTIFACT', file: selected, message: 'Selected path does not exist' });
      } else throw error;
    }
    if (!changed && (!selected || selected === '.baton/phases.yml')) {
      const phaseResult = await loadPhases(root);
      errors.push(...phaseResult.errors);
      warnings.push(...phaseResult.warnings);
    }
  }
  const jsonFiles = new Map([
    ['.baton/manifest.json', 'manifest'],
    ['baton.lock.json', 'lock'],
  ]);
  const yamlFiles = new Map([
    ['.baton/config.yml', 'config'],
    ['.baton/phases.yml', 'phases'],
  ]);
  if (!selected && !changed) {
    for (const path of [...jsonFiles.keys(), ...yamlFiles.keys()]) {
      if (await exists(root, path)) files.push(withinRoot(root, path));
    }
  }
  for (const absolute of new Set(files)) {
    const path = relative(root, absolute).replaceAll('\\', '/');
    if (/^specs\/[^/]+\/spec\.md$/.test(path) &&
        !await exists(root, `${path.slice(0, -'spec.md'.length)}handoff.md`)) {
      warnings.push({ code: 'W_NO_BATON', file: path,
        message: 'Feature spec has no baton; run baton handoff init --infer' });
    }
    const name = jsonFiles.get(path) ?? yamlFiles.get(path) ??
      (/(?:^|\/)(?:review|[^/]+\.review)\.json$/.test(path) ? 'findings' : null) ??
      (path.startsWith('packs/') && path.endsWith('.yml') && path !== 'packs/repairs.yml' ? 'pack' : null);
    if (name) {
      try {
        const source = await readFile(absolute, 'utf8');
        const data = extname(path) === '.json' ? JSON.parse(source) : YAML.parse(source, { uniqueKeys: true });
        if (name !== 'phases') errors.push(...validateSchema(schemas, name, data).map((issue) => ({ ...issue, file: path, code: `E_${name.toUpperCase()}` })));
      } catch (error) {
        errors.push({ code: `E_${name.toUpperCase()}`, file: path, message: error instanceof Error ? error.message : String(error) });
      }
      continue;
    }
    if (/^specs\/[^/]+\/handoff\.md$/.test(path) || /^\.baton\/quick\/[^/]+\.md$/.test(path)) {
      const issues = await validateHandoff(root, path);
      errors.push(...issues);
      if (!issues.some((issue) => issue.code === 'E_FRONTMATTER_MALFORMED')) {
        const { data } = parseFrontmatter(await readFile(absolute, 'utf8'));
        const modelIssue = modelPolicyIssue(models, data.suggested_model, path);
        if (modelIssue?.code === 'W_MODEL_NOT_ALLOWED') warnings.push(modelIssue);
        for (const assumption of Array.isArray(data.assumptions) ? data.assumptions : []) {
          if (assumption?.revisit_at === data.next_phase) {
            warnings.push({ code: 'W_ASSUMPTION_DUE', file: path,
              message: `Assumption ${assumption.id} is due for review in ${data.next_phase}` });
          }
        }
        if (data.lane === 'quick') {
          let config;
          try {
            config = YAML.parse(await readFile(withinRoot(root, '.baton/config.yml'), 'utf8'));
          } catch (error) {
            if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
          }
          const limit = config?.lanes?.quick?.max_files_changed;
          if (Number.isInteger(limit)) {
            const files = changedPaths ?? await changedFiles(root);
            if (files && files.length > limit) {
              warnings.push({ code: 'W_QUICK_LARGE', file: path,
                message: `Quick-lane diff has ${files.length} files; configured maximum is ${limit}` });
            }
          }
        }
      }
    } else if (/(?:^|\/)handoff\.md$/.test(path)) {
      const source = await readFile(absolute, 'utf8');
      let frontmatter = '';
      let body = source;
      if (/^---\r?\n/.test(source)) {
        try {
          const parsed = parseFrontmatter(source);
          frontmatter = serializeFrontmatter(parsed.data, '');
          body = parsed.body;
        } catch (error) {
          errors.push({ code: 'E_FRONTMATTER_MALFORMED', file: path,
            message: error instanceof Error ? error.message : String(error) });
          continue;
        }
      }
      errors.push(...[
        ...scanPersonalData(frontmatter, { frontmatter: true, terms }),
        ...scanPersonalData(body, { terms }),
      ].map((issue) => ({ ...issue, file: path })));
    } else if (/^\.github\/skills\/[^/]+\/SKILL\.md$/.test(path) || /^\.github\/agents\/[^/]+\.agent\.md$/.test(path)) {
      const type = path.endsWith('/SKILL.md') ? 'skill-frontmatter' : 'agent-frontmatter';
      try {
        const { data } = parseFrontmatter(await readFile(absolute, 'utf8'));
        errors.push(...validateSchema(schemas, type, data).map((issue) => ({ ...issue, code: 'E_FRONTMATTER_MALFORMED', file: path })));
        if (type === 'agent-frontmatter') {
          for (const value of Array.isArray(data.model) ? data.model : [data.model]) {
            const issue = modelPolicyIssue(models, value, path);
            if (!issue) continue;
            (issue.code === 'E_MODEL_NOT_ALLOWED' ? errors : warnings).push(issue);
          }
        }
        if (type === 'skill-frontmatter' && data.name !== path.split('/')[2]) errors.push({ code: 'E_FRONTMATTER_MALFORMED', file: path, message: 'Skill name differs from directory' });
      } catch (error) {
        errors.push({ code: 'E_FRONTMATTER_MALFORMED', file: path, message: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  if (!selected && !changed) {
    if ((!process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY === 'dermonaco-labs/baton') &&
        await exists(root, 'baton.lock.json') && await exists(root, 'packs/core.yml')) {
      for (const file of maintainerWorkflows) {
        const path = `.github/workflows/${file}`;
        if (!await exists(root, path)) continue;
        try {
          errors.push(...maintainerWorkflowIssues(file, await readFile(withinRoot(root, path), 'utf8')));
        } catch (error) {
          errors.push({ code: 'E_WORKFLOW_GUARD', file: path,
            message: error instanceof Error ? error.message : String(error) });
        }
      }
    }
    const reference = await directoryExists(root, 'docs/reference')
      ? 'docs/reference' : await directoryExists(root, 'docs/baton/reference')
        ? 'docs/baton/reference' : null;
    if (reference) {
      const commandNames = ['build', 'manifest', 'lock', 'sync', 'validate', 'handoff',
        'status', 'adopt', 'doctor', 'init', 'update', 'models', 'uninstall'];
      /** @type {Array<[string,string[]]>} */
      const catalogues = [
        ['commands.md', commandNames],
        ['skills.md', []],
        ['agents.md', []],
      ];
      /** @type {string[]} */
      const managed = [];
      if (Array.isArray(manifest?.files)) {
        managed.push(...manifest.files.filter((/** @type {{pack?:unknown,path?:unknown}} */ file) =>
          file?.pack === 'core' && typeof file.path === 'string')
          .map((/** @type {{path:string}} */ file) => file.path));
      } else {
        for (const directory of ['.github/skills', '.github/agents']) {
          for await (const file of walk(join(root, directory))) {
            managed.push(relative(root, file).replaceAll('\\', '/'));
          }
        }
      }
      for (const path of managed) {
        const skill = /^\.github\/skills\/([^/]+)\/SKILL\.md$/.exec(path);
        const agent = /^\.github\/agents\/([^/]+)\.agent\.md$/.exec(path);
        if (skill) catalogues[1][1].push(skill[1]);
        if (agent) catalogues[2][1].push(agent[1]);
      }
      for (const [file, names] of catalogues) {
        const docPath = `${reference}/${file}`;
        let source = '';
        try {
          source = await readFile(withinRoot(root, docPath), 'utf8');
        } catch (error) {
          if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
        }
        for (const name of names) {
          const section = source.split(/^### `([^`]+)`[^\n]*$/m);
          const index = section.findIndex((value, i) => i % 2 === 1 && value === name);
          if (index >= 0 && /when\s+to\s+use/i.test(section[index + 1]) &&
              /hands\s+off\s+to/i.test(section[index + 1])) continue;
          errors.push({ code: 'E_UNDOCUMENTED', file: docPath,
            message: `${name} needs a reference entry with "When to use" and "Hands off to"` });
        }
      }
    }
  }

  if (selected) {
    for (const absolute of new Set(files)) {
      const path = relative(root, absolute).replaceAll('\\', '/');
      if (!/\.(?:md|mjs|js|ts|tsx|yml|yaml|json)$/.test(path) ||
          /(?:^|\/)handoff\.md$/.test(path) || /^\.baton\/quick\/[^/]+\.md$/.test(path) ||
          path === '.github/dependabot.yml' || path === '.github/CODEOWNERS') continue;
      errors.push(...scanPersonalData(await readFile(absolute, 'utf8'), {
        path, terms, frontmatter: !path.endsWith('.md')
      }).map((issue) => ({ ...issue, file: path })));
    }
  }
  if (!selected && !changed) {
    if (!await exists(root, '.github/workflows/baton.yml')) warnings.push({ code: 'W_NO_ADOPTER_CI', file: '.github/workflows/baton.yml', message: 'Adopter validation workflow is absent' });
    if (await exists(root, '.github/copilot-setup-steps.yml')) warnings.push({ code: 'W_SETUP_STEPS_MISPLACED', file: '.github/copilot-setup-steps.yml', message: 'Move setup steps into .github/workflows/' });
    for (const top of ['docs', 'specs', 'baton', 'src', '.github']) {
      for await (const path of walk(join(root, top))) {
        const repoPath = relative(root, path).replaceAll('\\', '/');
        if (!/\.(?:md|mjs|yml|yaml|json)$/.test(repoPath) || /^\.github\/(?:skills|agents)\//.test(repoPath) ||
            repoPath === '.github/dependabot.yml' || /^test\/fixtures\//.test(repoPath)) continue;
        const content = await readFile(path, 'utf8');
        errors.push(...scanPersonalData(content, { path: repoPath, terms }).map((issue) => ({ ...issue, file: repoPath })));
      }
    }
    for (const path of ['README.md', 'THIRD_PARTY_NOTICES.md']) {
      if (await exists(root, path)) errors.push(...scanPersonalData(await readFile(join(root, path), 'utf8'), { path, terms }).map((issue) => ({ ...issue, file: path })));
    }
    for (const top of ['.specify', '.github', 'packs']) {
      for await (const absolute of walk(join(root, top))) {
        const path = relative(root, absolute).replaceAll('\\', '/');
        if (!isLicenseNotice(path)) continue;
        errors.push(...scanPersonalData(await readFile(absolute, 'utf8'), { path, terms }).map((issue) => ({ ...issue, file: path })));
      }
    }
  }
  if (changed) {
    for (const absolute of files) {
      const path = relative(root, absolute).replaceAll('\\', '/');
      const notice = isLicenseNotice(path);
      if (!notice && !/^(?:docs\/|specs\/|baton\/|src\/|\.github\/)/.test(path) &&
          !['README.md', 'THIRD_PARTY_NOTICES.md'].includes(path)) continue;
      if (!notice && (/^\.github\/(?:skills|agents)\//.test(path) ||
          path === '.github/dependabot.yml' || /^test\/fixtures\//.test(path))) continue;
      if (!notice && !/\.(?:md|mjs|yml|yaml|json)$/.test(path)) continue;
      errors.push(...scanPersonalData(await readFile(absolute, 'utf8'), { path, terms }).map((issue) => ({ ...issue, file: path })));
    }
  }
  return { errors, warnings, data: { files: files.length } };
}
