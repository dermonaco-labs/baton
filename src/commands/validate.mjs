import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import YAML from 'yaml';
import { BatonError } from '../lib/report.mjs';
import { loadSchemas, validateSchema } from '../lib/schema.mjs';
import { validateHandoff } from '../lib/handoff.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { withinRoot } from '../lib/manifest.mjs';
import { scanPersonalData, denylistTerms, isLicenseNotice } from '../lib/denylist.mjs';
import { loadPhases } from '../lib/phases.mjs';
import { changedFiles } from '../lib/checks.mjs';

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
  const errors = [];
  const warnings = [];
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
    if (/(?:^|\/)handoff\.md$/.test(path) || /^\.baton\/quick\/[^/]+\.md$/.test(path)) {
      errors.push(...await validateHandoff(root, path));
    } else if (/^\.github\/skills\/[^/]+\/SKILL\.md$/.test(path) || /^\.github\/agents\/[^/]+\.agent\.md$/.test(path)) {
      const type = path.endsWith('/SKILL.md') ? 'skill-frontmatter' : 'agent-frontmatter';
      try {
        const { data } = parseFrontmatter(await readFile(absolute, 'utf8'));
        errors.push(...validateSchema(schemas, type, data).map((issue) => ({ ...issue, code: 'E_FRONTMATTER_MALFORMED', file: path })));
        if (type === 'skill-frontmatter' && data.name !== path.split('/')[2]) errors.push({ code: 'E_FRONTMATTER_MALFORMED', file: path, message: 'Skill name differs from directory' });
      } catch (error) {
        errors.push({ code: 'E_FRONTMATTER_MALFORMED', file: path, message: error instanceof Error ? error.message : String(error) });
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
