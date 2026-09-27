import { readFile, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import YAML from 'yaml';
import { BatonError } from '../lib/report.mjs';
import { resolvePayload, payloadBytes } from '../lib/payload.mjs';
import { optionalBytes, putBytes, safePath, matches, digest, parsedObject } from '../lib/overlay.mjs';
import { readManifest, writeManifest } from '../lib/manifest.mjs';
import { loadPacks, resolvePacks, recommendedPacks } from '../lib/packs.mjs';
import { mergeMarker } from '../lib/markers.mjs';
import { repairAtv } from '../lib/repairs.mjs';
import { prepareSpeckit, UpstreamError } from '../lib/upstream.mjs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const protectedPath = /^(?:specs\/|docs\/(?:brainstorms|solutions)\/|\.specify\/(?:feature\.json$|memory\/constitution\.md$))/;
const instructions = '.github/copilot-instructions.md';
const hooks = '.github/hooks/copilot-hooks.json';
const extensions = '.specify/extensions.yml';
const marker = /<!-- BATON:START -->\r?\n([\s\S]*?)<!-- BATON:END -->/;

/** @param {string[]} args */
function options(args) {
  const result = { packs: /** @type {string[]} */ ([]), keep: /** @type {string[]} */ ([]),
    adopt: /** @type {string[]} */ ([]), repair: false, dryRun: false,
    archive: /** @type {string|undefined} */ (undefined), script: /** @type {string|undefined} */ (undefined) };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--repair') result.repair = true;
    else if (flag === '--dry-run') result.dryRun = true;
    else if (['--packs', '--keep', '--adopt-upstream', '--from', '--script'].includes(flag)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new BatonError('E_USAGE', `${flag} needs a value`, 2);
      if (flag === '--packs') result.packs.push(...value.split(','));
      else if (flag === '--keep') result.keep.push(value.replaceAll('\\', '/'));
      else if (flag === '--adopt-upstream') result.adopt.push(value.replaceAll('\\', '/'));
      else if (flag === '--from') result.archive = resolve(value);
      else result.script = value;
    } else throw new BatonError('E_USAGE', `Unknown init option: ${flag}`, 2);
  }
  if (result.script && !['sh', 'ps', 'py'].includes(result.script)) {
    throw new BatonError('E_USAGE', `Invalid --script ${result.script}; expected sh, ps or py`, 2);
  }
  if (result.packs.some(id => !/^[a-z0-9][a-z0-9-]*$/.test(id))) {
    throw new BatonError('E_USAGE', '--packs needs comma-separated pack identifiers', 2);
  }
  return result;
}

/** @param {Buffer} existing @param {Buffer} incoming */
function mergeHooks(existing, incoming) {
  let current;
  try { current = JSON.parse(existing.toString()); }
  catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new BatonError('E_CONFLICT', `Invalid ${hooks}: ${error.message}`);
  }
  const source = JSON.parse(incoming.toString());
  if (!parsedObject(current) || !parsedObject(current.hooks) || !parsedObject(source.hooks) ||
      current.version !== source.version) throw new BatonError('E_CONFLICT', `Incompatible ${hooks}`);
  let changed = false;
  for (const [event, entries] of Object.entries(source.hooks)) {
    if (!Array.isArray(entries)) throw new BatonError('E_CONFLICT', `Invalid ${hooks} event ${event}`);
    const previous = current.hooks[event] ?? [];
    if (!Array.isArray(previous)) throw new BatonError('E_CONFLICT', `Invalid ${hooks} event ${event}`);
    for (const entry of entries) {
      if (!parsedObject(entry)) throw new BatonError('E_CONFLICT', `Invalid ${hooks} command`);
      const commands = [entry.bash, entry.powershell, entry.command].filter(value => typeof value === 'string');
      if (!previous.some(item => parsedObject(item) &&
          [item.bash, item.powershell, item.command].some(value => commands.includes(value)))) {
        previous.push(entry);
        changed = true;
      }
    }
    current.hooks[event] = previous;
  }
  return changed ? Buffer.from(JSON.stringify(current, null, 2) + '\n') : existing;
}

/** @param {Buffer} existing @param {Buffer} incoming */
function mergeExtensions(existing, incoming) {
  let current;
  try { current = YAML.parse(existing.toString(), { uniqueKeys: true }); }
  catch (error) {
    if (!(error instanceof YAML.YAMLParseError)) throw error;
    throw new BatonError('E_CONFLICT', `Invalid ${extensions}: ${error.message}`);
  }
  const source = YAML.parse(incoming.toString(), { uniqueKeys: true });
  if (!parsedObject(current) || !parsedObject(source) || !parsedObject(source.hooks) ||
      (current.hooks !== undefined && !parsedObject(current.hooks))) {
    throw new BatonError('E_CONFLICT', `Invalid ${extensions}`);
  }
  let changed = !(current.installed ?? []).includes('baton');
  current.installed = [...new Set([...(current.installed ?? []), 'baton'])];
  current.hooks ??= {};
  for (const [event, entries] of Object.entries(source.hooks)) {
    const previous = current.hooks[event] ?? [];
    if (!Array.isArray(entries) || !Array.isArray(previous)) throw new BatonError('E_CONFLICT', `Invalid ${extensions} event ${event}`);
    for (const item of entries) {
      const matched = previous.find(existing => existing.extension === item.extension && existing.command === item.command);
      if (matched && (matched.enabled === false || matched.optional !== false || matched.condition)) {
        throw new BatonError('E_CONFLICT', `Baton hook ${item.command} in ${extensions} is disabled or not mandatory`);
      }
      if (!matched) {
        previous.push(item);
        changed = true;
      }
    }
    current.hooks[event] = previous;
  }
  return changed ? Buffer.from(YAML.stringify(current)) : existing;
}

/** @param {string} root @param {string} path @param {Buffer} bytes @param {boolean} dryRun */
async function writeIfChanged(root, path, bytes, dryRun) {
  const existing = await optionalBytes(root, path);
  if (existing?.equals(bytes)) return false;
  if (!dryRun) await putBytes(root, path, bytes);
  return true;
}

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  const opts = options(args);
  let payload;
  try { payload = await resolvePayload(opts.archive); }
  catch (error) {
    if (error instanceof BatonError && error.code === 'E_PREREQUISITE' && !opts.archive &&
        opts.packs.some(pack => pack !== 'core')) {
      throw new BatonError('E_PREREQUISITE',
        `This install has no optional-pack payload. Run npx --yes github:dermonaco-labs/baton#v0.1.0 init --packs ${opts.packs.join(',')}`, 5);
    }
    throw error;
  }
  /** @type {{cleanup:() => Promise<void>,root:string}|null} */
  let generated = null;
  try {
    const lock = JSON.parse(await readFile(join(payload.root, 'baton.lock.json'), 'utf8'));
    const definitions = await loadPacks(payload.root);
    let previous;
    try { previous = await readManifest(root); }
    catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    }
    if (previous && (previous.schema !== 1 || !Array.isArray(previous.files) || !Array.isArray(previous.marker_sections))) {
      throw new BatonError('E_MANIFEST', 'Existing Baton manifest is invalid; refusing to overwrite it');
    }
    let packs;
    try { packs = resolvePacks(definitions, [...(previous?.packs ?? []), ...opts.packs]); }
    catch (error) {
      if (!(error instanceof Error) || !/^(?:Unknown pack|Pack dependency cycle|Pack conflict):?/.test(error.message)) throw error;
      throw new BatonError('E_PACK', error.message);
    }
    if (opts.script && opts.script !== 'sh') {
      const directory = await mkdtemp(join(tmpdir(), 'baton-speckit-'));
      generated = { root: directory, cleanup: () => rm(directory, { recursive: true, force: true }) };
      try {
        prepareSpeckit({ root: payload.root, work: directory, script: opts.script });
      } catch (error) {
        if (error instanceof UpstreamError &&
            (error.code === 'E_PREREQUISITE' || /no version of specify-cli==/i.test(error.message))) {
          throw new BatonError('E_PREREQUISITE', `${error.message}; uv and the pinned specify-cli wheel are required for --script ${opts.script}`, 5);
        }
        throw error;
      }
    }
    /** @type {Map<string,{bytes:Buffer,pack:string,owner:'baton'|'speckit'|'atv'}>} */
    const planned = new Map();
    for (const entry of lock.files) {
      const pack = packs.find(id => entry.packs.includes(id));
      if (!pack || protectedPath.test(entry.path)) continue;
      const bytes = await payloadBytes(payload.root, entry.stored_at);
      if (digest(bytes) !== entry.sha256) throw new BatonError('E_LOCK_MISMATCH', `Payload changed: ${entry.stored_at}`);
      planned.set(entry.path, { bytes, pack, owner: entry.upstream === 'atv' ? 'atv' : entry.upstream === 'speckit' ? 'speckit' : 'baton' });
    }
    for (const pack of packs) {
      for (const entry of definitions.get(pack)?.files ?? []) {
        if (planned.has(entry.path) || protectedPath.test(entry.path)) continue;
        const path = pack === 'core' ? entry.path : `packs/${pack}/files/${entry.path}`;
        const bytes = await payloadBytes(payload.root, path);
        if (!bytes) throw new BatonError('E_PREREQUISITE', `Missing pack payload: ${path}`, 5);
        planned.set(entry.path, { bytes, pack, owner: entry.from === 'atv' ? 'atv' : entry.from === 'speckit' ? 'speckit' : 'baton' });
      }
    }
    const support = [
      ['.baton/bin/baton.mjs', '.baton/bin/baton.mjs'],
      ['.baton/bin/baton.mjs.sha256', '.baton/bin/baton.mjs.sha256'],
      ['.baton/phases.yml', 'baton/templates/phases.yml'],
      ['.baton/config.yml', 'baton/templates/config.yml'],
      ['.github/workflows/baton.yml', 'baton/templates/workflows/baton.yml'],
    ];
    for (const [path, source] of support) {
      planned.set(path, { bytes: await readFile(await safePath(payload.root, source)), pack: 'core', owner: 'baton' });
    }
    for (const name of await readdir(join(payload.root, 'baton/schemas'))) {
      if (!name.endsWith('.schema.json')) continue;
      const path = `.baton/schemas/${name}`;
      planned.set(path, { bytes: await readFile(join(payload.root, 'baton/schemas', name)), pack: 'core', owner: 'baton' });
    }
    if (generated) {
      const project = join(generated.root, 'project');
      /** @param {string} folder */
      const addScripts = async (folder) => {
        for (const item of await readdir(join(project, folder), { withFileTypes: true })) {
          const path = `${folder}/${item.name}`;
          if (item.isDirectory()) await addScripts(path);
          else if (item.isFile()) {
            planned.set(path, { bytes: await readFile(join(project, path)), pack: 'core', owner: 'speckit' });
          }
        }
      };
      await addScripts('.specify/scripts');
      for (const name of ['integration.json', 'init-options.json']) {
        const path = `.specify/${name}`;
        planned.set(path, { bytes: await readFile(join(project, path)), pack: 'core', owner: 'speckit' });
      }
    }
    const pristine = '.specify/memory/constitution.md';
    if (!await optionalBytes(root, pristine)) {
      planned.set(pristine, { bytes: await readFile(join(payload.root, '.specify/templates/constitution-template.md')), pack: 'core', owner: 'speckit' });
    }
    /** @type {Array<{path:string,sha256:string,pack:string,owner:string,managed:boolean}>} */
    const installed = [...(previous?.files ?? [])];
    /** @type {Array<{path:string,reason:string,repairable?:boolean}>} */
    const conflicts = [];
    /** @type {string[]} */
    const actions = [];
    const rules = YAML.parse(await readFile(join(payload.root, 'packs/repairs.yml'), 'utf8')).repairs;
    for (const [path, entry] of planned) {
      if (matches(opts.keep, path)) {
        const pending = `.baton/conflicts/${path}.new`;
        if (!opts.dryRun && await optionalBytes(root, pending)) await rm(await safePath(root, pending));
        continue;
      }
      const current = await optionalBytes(root, path);
      const old = installed.find(item => item.path === path);
      let desired = entry.bytes;
      let repairable = false;
      if (current && path === hooks && !matches(opts.adopt, path)) {
        try { desired = mergeHooks(current, desired); }
        catch (error) {
          if (!(error instanceof BatonError)) throw error;
          conflicts.push({ path, reason: error.message });
          if (!opts.dryRun) await putBytes(root, `.baton/conflicts/${path}.new`, entry.bytes);
          continue;
        }
      } else if (current && path === extensions && !matches(opts.adopt, path)) {
        try { desired = mergeExtensions(current, desired); }
        catch (error) {
          if (!(error instanceof BatonError)) throw error;
          conflicts.push({ path, reason: error.message });
          if (!opts.dryRun) await putBytes(root, `.baton/conflicts/${path}.new`, entry.bytes);
          continue;
        }
      }
      if (current && current.equals(desired)) {
        if (!old) installed.push({ path, sha256: digest(current), pack: entry.pack, owner: entry.owner, managed: true });
        continue;
      }
      if (current && entry.owner === 'atv' && path.endsWith('.agent.md')) {
        try {
          const fixed = repairAtv(current, path, rules, entry.bytes, 'atv:v2.6.3');
          repairable = Boolean(fixed.repair);
        } catch (error) {
          if (!(error instanceof UpstreamError) || !['E_FRONTMATTER_MALFORMED', 'E_UPSTREAM_VERIFY'].includes(error.code)) throw error;
        }
      }
      const owned = old && digest(current ?? '') === old.sha256;
      const mergeable = (path === hooks || path === extensions) && current && desired !== entry.bytes;
      if (current && !owned && !mergeable && !matches(opts.adopt, path) && !(repairable && opts.repair)) {
        conflicts.push({ path, reason: old ? 'user-modified file' : 'unmanaged file', ...(repairable ? { repairable: true } : {}) });
        if (!opts.dryRun) await putBytes(root, `.baton/conflicts/${path}.new`, desired);
        continue;
      }
      actions.push(`${current ? 'update' : 'install'} ${path}`);
      if (!opts.dryRun) await writeIfChanged(root, path, desired, false);
      const record = { path, sha256: digest(desired), pack: entry.pack, owner: entry.owner, managed: true };
      if (old) Object.assign(old, record);
      else installed.push(record);
      if (!opts.dryRun && await optionalBytes(root, `.baton/conflicts/${path}.new`)) {
        await rm(await safePath(root, `.baton/conflicts/${path}.new`));
      }
    }
    const raw = await readFile(join(payload.root, 'baton/instructions/copilot-instructions.baton.md'), 'utf8');
    const content = marker.exec(raw)?.[1];
    if (content === undefined) throw new BatonError('E_MISSING_ARTIFACT', 'Baton instructions marker is missing');
    const original = await optionalBytes(root, instructions);
    const oldMarker = previous?.marker_sections.find((/** @type {{path:string,marker:string}} */ item) => item.path === instructions && item.marker === 'BATON');
    const oldContent = original ? marker.exec(original.toString())?.[1] : undefined;
    if (original && oldContent !== undefined && (!oldMarker || digest(oldContent) !== oldMarker.sha256) &&
        !matches(opts.adopt, instructions) && !matches(opts.keep, instructions)) {
      conflicts.push({ path: instructions, reason: 'unmanaged or user-modified BATON marker' });
      if (!opts.dryRun) await putBytes(root, `.baton/conflicts/${instructions}.new`, mergeMarker(original.toString(), 'BATON', content));
    } else if (!matches(opts.keep, instructions)) {
      try {
        const merged = mergeMarker(original?.toString() ?? '', 'BATON', content);
        if (!opts.dryRun) await writeIfChanged(root, instructions, Buffer.from(merged), false);
        if (!original || original.toString() !== merged) actions.push(`merge ${instructions}`);
      } catch (error) {
        if (!(error instanceof Error) || !/Unbalanced BATON marker/.test(error.message)) throw error;
        conflicts.push({ path: instructions, reason: error.message });
        if (!opts.dryRun) await putBytes(root, `.baton/conflicts/${instructions}.new`, Buffer.from(raw));
      }
    }
    const sections = matches(opts.keep, instructions) ? previous?.marker_sections ?? [] :
      conflicts.some(item => item.path === instructions) ? previous?.marker_sections ?? [] :
        [{ path: instructions, marker: 'BATON', sha256: digest(content) }];
    const ignore = '.gitignore';
    const ignoreCurrent = (await optionalBytes(root, ignore))?.toString() ?? '';
    const additions = (await readFile(join(payload.root, 'baton/templates/gitignore.adopter'), 'utf8'))
      .split(/\r?\n/).filter(Boolean);
    const existingLines = new Set(ignoreCurrent.split(/\r?\n/));
    const missing = additions.filter(line => !existingLines.has(line));
    if (missing.length) {
      actions.push(`merge ${ignore}`);
      const next = ignoreCurrent + (ignoreCurrent && !/\r?\n$/.test(ignoreCurrent) ? '\n' : '') +
        missing.map(line => `${line}\n`).join('');
      if (!opts.dryRun) await putBytes(root, ignore, next);
    }
    const manifest = {
      schema: 1, baton_version: '0.1.0', installed_at: previous?.installed_at ?? new Date().toISOString(),
      source: previous?.source ?? 'init',
      upstreams: { speckit: `${lock.upstreams.speckit.version}@${lock.upstreams.speckit.commit.slice(0, 7)}`,
        atv: `${lock.upstreams.atv.ref}@${lock.upstreams.atv.commit.slice(0, 7)}` },
      packs, recommended_packs: recommendedPacks(definitions, packs),
      files: installed, marker_sections: sections,
    };
    if (!opts.dryRun) {
      if (!previous || JSON.stringify(previous) !== JSON.stringify(manifest)) await writeManifest(root, manifest);
      const report = '.baton/conflicts/report.json';
      if (conflicts.length) await putBytes(root, report, JSON.stringify({ conflicts }, null, 2) + '\n');
      else if (await optionalBytes(root, report)) await rm(await safePath(root, report));
    }
    return {
      exitCode: conflicts.length ? 4 : 0,
      ...(conflicts.length ? { errors: conflicts.map(item => ({
        code: 'E_CONFLICT', file: item.path, message: `${item.reason}${item.repairable ? ' (repairable with --repair)' : ''}`,
        fix: `See .baton/conflicts/${item.path}.new; use --keep or --adopt-upstream to resolve`,
      })) } : {}),
      data: { packs, actions, conflicts, dry_run: opts.dryRun },
    };
  } finally {
    if (generated) await generated.cleanup();
    await payload.cleanup();
  }
}
