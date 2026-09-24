import { readFile, writeFile, mkdir, readdir, rename, rm, stat, cp } from 'node:fs/promises';
import { dirname, posix } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import YAML from 'yaml';
import { BatonError } from '../lib/report.mjs';
import { withinRoot } from '../lib/manifest.mjs';
import { hashFile } from '../lib/hash.mjs';
import { loadPacks, recommendedPacks } from '../lib/packs.mjs';

const execFileAsync = promisify(execFile);
const maintainerWorkflows = ['ci.yml', 'smoke.yml', 'upstream-watch.yml', 'release.yml'];
const preservedDocs = new Set(['brainstorms', 'solutions']);

/** @param {string} path */
function movedDocument(path) {
  if (!path.startsWith('docs/') || path.startsWith('docs/baton/')) return path;
  if (preservedDocs.has(path.split('/')[1])) return path;
  return `docs/baton/${path.slice('docs/'.length)}`;
}

/** @param {string} source @param {string} destination @param {string} text */
function rewriteLinks(source, destination, text) {
  /** @param {string} url */
  const rewrite = (url) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return url;
    const match = /^([^?#]*)(.*)$/.exec(url);
    if (!match || !match[1]) return url;
    const decoded = match[1].replace(/%20/g, ' ');
    if (decoded.startsWith('/')) {
      const target = posix.normalize(decoded.slice(1));
      const relocated = movedDocument(target);
      return `/${relocated.replace(/ /g, '%20')}${match[2]}`;
    }
    const target = posix.normalize(posix.join(posix.dirname(source), decoded));
    const relocated = movedDocument(target);
    const relative = posix.relative(posix.dirname(destination), relocated);
    return `${(decoded.startsWith('./') && !relative.startsWith('.') ? './' : '')}${relative.replace(/ /g, '%20')}${match[2]}`;
  };
  return text
    .replace(/(\]\(\s*<?)([^)\s>]+)(>?[^)]*\))/g, (_, before, url, after) => `${before}${rewrite(url)}${after}`)
    .replace(/^(\s*\[[^\]]+\]:\s*<?)([^\s>]+)(>?[^\n]*)$/gm, (_, before, url, after) => `${before}${rewrite(url)}${after}`)
    .replace(/(\b(?:href|src)=["'])([^"']+)(["'])/g, (_, before, url, after) => `${before}${rewrite(url)}${after}`);
}

/** @param {string} root @param {string} path */
async function present(root, path) {
  try {
    await stat(withinRoot(root, path));
    return true;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;
    throw error;
  }
}

/** @param {string} root */
async function sourceRepository(root) {
  if (process.env.GITHUB_REPOSITORY?.toLowerCase() === 'dermonaco-labs/baton') return true;
  try {
    const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: root });
    return /(?:^|[:/])dermonaco-labs\/baton(?:\.git)?\s*$/i.test(stdout.trim());
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT' || /** @type {any} */ (error).code === 2) return false;
    if (error instanceof Error && /not a git repository|No such remote/i.test(error.message)) return false;
    throw error;
  }
}

/** @param {string} root @param {string} source @param {string} destination */
async function copyTemplate(root, source, destination) {
  const target = withinRoot(root, destination);
  await mkdir(dirname(target), { recursive: true });
  await cp(withinRoot(root, source), target, { force: true });
}

/** @param {string} root */
async function writeAdopterManifest(root) {
  let lock;
  try {
    lock = JSON.parse(await readFile(withinRoot(root, 'baton.lock.json'), 'utf8'));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
  }
  const files = [];
  for (const entry of lock?.files ?? []) {
    if (entry.packs?.includes('core') && await present(root, entry.path)) {
      files.push({
        path: entry.path,
        sha256: await hashFile(withinRoot(root, entry.path)),
        pack: 'core',
        owner: entry.upstream === 'atv' ? 'atv' : entry.upstream === 'speckit' ? 'speckit' : 'baton',
        managed: true,
      });
    }
  }
  for (const name of await readdir(withinRoot(root, '.baton/schemas'))) {
    if (!name.endsWith('.schema.json')) continue;
    const path = `.baton/schemas/${name}`;
    files.push({ path, sha256: await hashFile(withinRoot(root, path)), pack: 'core', owner: 'baton', managed: true });
  }
  const manifest = {
    schema: 1, baton_version: '0.1.0', installed_at: new Date().toISOString(), source: 'template',
    upstreams: { speckit: '1.0.11@8147943', atv: 'main@ad99673' },
    packs: ['core'], recommended_packs: recommendedPacks(await loadPacks(root), ['core']),
    files, marker_sections: [],
  };
  await writeFile(withinRoot(root, '.baton/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  const allowed = new Set(['--dry-run', '--no-workflows', '--prune-workflows']);
  if (args.some((arg) => !allowed.has(arg)) || (args.includes('--no-workflows') && args.includes('--prune-workflows'))) {
    throw new BatonError('E_USAGE', 'adopt accepts --dry-run, --no-workflows or --prune-workflows', 2);
  }
  if (process.env.BATON_FORCE_CLEANUP !== '1' && await sourceRepository(root)) {
    throw new BatonError('E_SOURCE_REPOSITORY', 'Refusing to clean the Baton source repo; use BATON_FORCE_CLEANUP=1 only on a disposable copy');
  }
  const dryRun = args.includes('--dry-run');
  const noWorkflows = args.includes('--no-workflows');
  const pruneWorkflows = args.includes('--prune-workflows');
  const config = YAML.parse(await readFile(withinRoot(root, '.baton/template-cleanup.yml'), 'utf8'));
  if (config.schema !== 1 || !Array.isArray(config.remove) ||
      config.remove.some((/** @type {unknown} */ path) => typeof path !== 'string' || path.startsWith('.github/workflows/'))) {
    throw new BatonError('E_CONFIG', 'Invalid template-cleanup.yml: workflows cannot be in remove');
  }
  if (noWorkflows && !await present(root, '.github/workflows/baton.yml')) {
    throw new BatonError('E_MISSING_ARTIFACT', 'The adopter baton.yml must already exist when --no-workflows is used');
  }
  /** @type {string[]} */
  const actions = [];
  /** @param {string} message */
  const record = (message) => { actions.push(message); };
  /** @param {boolean} dryRun */
  const removeDormantWorkflows = async (dryRun) => {
    for (const name of maintainerWorkflows) {
      const path = `.github/workflows/${name}`;
      if (await present(root, path)) {
        record(`remove ${path}`);
        if (!dryRun) await rm(withinRoot(root, path));
      }
    }
  };
  if (!await present(root, '.baton/template-cleanup-pending') &&
      !await present(root, 'baton.lock.json')) {
    if (pruneWorkflows) await removeDormantWorkflows(dryRun);
    return { data: { actions, dry_run: dryRun } };
  }
  const replacements = [
    ['README.md', 'baton/templates/README.adopter.md'],
    ['.specify/memory/constitution.md', '.specify/templates/constitution-template.md'],
  ];
  for (const [, source] of replacements) {
    if (!await present(root, source)) throw new BatonError('E_MISSING_ARTIFACT', `${source} is required for adopt`);
  }
  if (!await present(root, 'baton/schemas/handoff.schema.json')) {
    throw new BatonError('E_MISSING_ARTIFACT', 'Baton runtime schemas are required for adopt');
  }
  if (!noWorkflows && !await present(root, '.github/workflows/baton.yml') &&
      !await present(root, 'baton/templates/workflows/baton.yml')) {
    throw new BatonError('E_MISSING_ARTIFACT', 'Adopter validation workflow template is required for adopt');
  }
  if (!await present(root, 'baton.lock.json')) {
    throw new BatonError('E_MISSING_ARTIFACT', 'baton.lock.json is required for adopt');
  }
  const entries = await present(root, 'docs') ?
    await readdir(withinRoot(root, 'docs'), { withFileTypes: true }) : [];
  if (entries.length) {
    for (const entry of entries) {
      if (preservedDocs.has(entry.name) || entry.name === 'baton') continue;
      const source = `docs/${entry.name}`;
      const dest = `docs/baton/${entry.name}`;
      record(`move ${source} -> ${dest}`);
      if (dryRun) continue;
      await mkdir(dirname(withinRoot(root, dest)), { recursive: true });
      await rename(withinRoot(root, source), withinRoot(root, dest));
    }
  }
  record('rewrite relative docs links');
  if (!dryRun) {
    await mkdir(withinRoot(root, 'docs/baton'), { recursive: true });
    /** @param {string} original @param {string} current */
    const rewriteTree = async (original, current) => {
      for (const entry of await readdir(withinRoot(root, current), { withFileTypes: true })) {
        const oldPath = `${original}/${entry.name}`;
        const newPath = `${current}/${entry.name}`;
        if (entry.isDirectory()) await rewriteTree(oldPath, newPath);
        else if (entry.isFile() && entry.name.endsWith('.md')) {
          const path = withinRoot(root, newPath);
          const text = await readFile(path, 'utf8');
          const rewritten = rewriteLinks(oldPath, newPath, text);
          if (rewritten !== text) await writeFile(path, rewritten);
        }
      }
    };
    for (const entry of await readdir(withinRoot(root, 'docs'), { withFileTypes: true })) {
      if (preservedDocs.has(entry.name) && entry.isDirectory()) {
        await rewriteTree(`docs/${entry.name}`, `docs/${entry.name}`);
      } else if (entry.name === 'baton' && entry.isDirectory()) {
        for (const moved of entries) {
          if (preservedDocs.has(moved.name) || moved.name === 'baton') continue;
          const original = `docs/${moved.name}`;
          const destination = `docs/baton/${moved.name}`;
          if (moved.isDirectory()) await rewriteTree(original, destination);
          else if (moved.isFile() && moved.name.endsWith('.md')) {
            const path = withinRoot(root, destination);
            const text = await readFile(path, 'utf8');
            const rewritten = rewriteLinks(original, destination, text);
            if (rewritten !== text) await writeFile(path, rewritten);
          }
        }
      }
    }
  }

  for (const [target, source] of replacements) {
    record(`replace ${target}`);
    if (!dryRun) await copyTemplate(root, source, target);
  }
  record('install .baton/schemas from authored runtime schemas');
  if (!dryRun) {
    await cp(withinRoot(root, 'baton/schemas'), withinRoot(root, '.baton/schemas'), { recursive: true, force: true });
  }
  const configPath = withinRoot(root, '.baton/config.yml');
  const adopterConfig = YAML.parse(await readFile(withinRoot(root, 'baton/templates/config.yml'), 'utf8'));
  let localConfig;
  let configMissing = false;
  try {
    localConfig = YAML.parse(await readFile(configPath, 'utf8'));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    configMissing = true;
    localConfig = adopterConfig;
  }
  const sourceCheck = localConfig.checks?.find((/** @type {{name:string,run:string}} */ item) =>
    item.name === 'baton' && item.run === 'npm run check');
  if (sourceCheck) {
    record('replace source-only npm check with adopter validation');
    sourceCheck.run = adopterConfig.checks[0].run;
  }
  if (!dryRun) {
    if (sourceCheck || configMissing) await writeFile(configPath, YAML.stringify(localConfig));
    await writeFile(withinRoot(root, 'CHANGELOG.md'), '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).\n\n## [Unreleased]\n\n### Added\n\n- Project initialized from the Baton template.\n');
    await mkdir(withinRoot(root, '.github'), { recursive: true });
    await writeFile(withinRoot(root, '.github/dependabot.yml'), 'version: 2\nupdates:\n  - package-ecosystem: github-actions\n    directory: /\n    schedule:\n      interval: weekly\n');
    const ignore = withinRoot(root, '.gitignore');
    const current = await readFile(ignore, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return '';
      throw error;
    });
    const additions = await readFile(withinRoot(root, 'baton/templates/gitignore.adopter'), 'utf8');
    const lines = new Set(current.split(/\r?\n/));
    const extra = additions.split(/\r?\n/).filter((line) => line && !lines.has(line)).map((line) => `${line}\n`).join('');
    await writeFile(ignore, current + (current && !current.endsWith('\n') && extra ? '\n' : '') + extra);
    if (!noWorkflows && !await present(root, '.github/workflows/baton.yml')) {
      await copyTemplate(root, 'baton/templates/workflows/baton.yml', '.github/workflows/baton.yml');
    }
    await writeAdopterManifest(root);
  }
  for (const path of config.remove) {
    if (path.startsWith('.github/workflows/') && noWorkflows) continue;
    if (!await present(root, path)) continue;
    record(`remove ${path}`);
    if (!dryRun) await rm(withinRoot(root, path), { recursive: true, force: true });
  }
  if (pruneWorkflows) await removeDormantWorkflows(dryRun);
  return { data: { actions, dry_run: dryRun } };
}
