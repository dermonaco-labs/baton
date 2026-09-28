import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { BatonError } from '../lib/report.mjs';
import { readManifest, writeManifest, installedScript } from '../lib/manifest.mjs';
import { optionalBytes, putBytes, safePath, digest } from '../lib/overlay.mjs';
import { mergeMarker } from '../lib/markers.mjs';
import { resolvePayload } from '../lib/payload.mjs';
import { UpstreamError } from '../lib/upstream.mjs';
import { run as init, mergeHooks, mergeExtensions, protectedPath } from './init.mjs';

const instructions = '.github/copilot-instructions.md';
const batonSection = /<!-- BATON:START -->\r?\n([\s\S]*?)<!-- BATON:END -->/;
/** @typedef {{path:string,sha256:string,pack:string,owner:string,managed:boolean}} ManagedFile */
/** @typedef {{path:string,marker:string,sha256:string}} MarkerSection */
/** @typedef {{schema:number,baton_version:string,installed_at:string,source:string,upstreams:object,packs:string[],files:ManagedFile[],marker_sections:MarkerSection[],recommended_packs?:object[],script?:string,'x-script'?:string}} Manifest */

/** @param {string[]} args */
function options(args) {
  const opts = { dryRun: false, archive: /** @type {string|undefined} */ (undefined),
    to: /** @type {string|undefined} */ (undefined) };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') opts.dryRun = true;
    else if (args[i] === '--from' || args[i] === '--to') {
      const flag = args[i];
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new BatonError('E_USAGE', `${flag} needs a value`, 2);
      if (flag === '--from') opts.archive = resolve(args[++i]);
      else opts.to = args[++i];
    } else throw new BatonError('E_USAGE', `Unknown update option: ${args[i]}`, 2);
  }
  if (opts.to && !/^v\d+\.\d+\.\d+$/.test(opts.to)) {
    throw new BatonError('E_USAGE', '--to needs a pinned vX.Y.Z release', 2);
  }
  if (opts.to && opts.archive) throw new BatonError('E_USAGE', '--to and --from cannot be combined', 2);
  return opts;
}

/** @param {string} root @param {string} version @param {boolean} dryRun */
function reinvoke(root, version, dryRun) {
  const launcher = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
  if (process.platform === 'win32' && !existsSync(launcher)) {
    throw new BatonError('E_PREREQUISITE', 'Node installation does not include npx-cli.js', 5);
  }
  const command = process.platform === 'win32' ? process.execPath : 'npx';
  const args = [...(process.platform === 'win32' ? [launcher] : []),
    '--yes', `github:dermonaco-labs/baton#${version}`, '--cwd', root, 'update',
    ...(dryRun ? ['--dry-run'] : [])];
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true });
  if (result.error) throw new BatonError('E_PREREQUISITE', `Cannot run pinned npx: ${result.error.message}`, 5);
  if (result.status !== 0) {
    throw new BatonError('E_PREREQUISITE', `Pinned update failed (exit ${result.status}): ${result.stderr || result.stdout}`, result.status === 4 ? 4 : 5);
  }
  return { data: { version, output: result.stdout.trim(), dry_run: dryRun } };
}

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  const opts = options(args);
  if (opts.to) return reinvoke(root, opts.to, opts.dryRun);
  const payload = await resolvePayload(opts.archive);
  /** @type {Manifest} */
  let previous;
  try { previous = /** @type {Manifest} */ (await readManifest(root)); }
  catch (error) {
    await payload.cleanup();
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') {
      throw new BatonError('E_PREREQUISITE',
        'No Baton manifest; run baton init before update (standalone assets also need a --from payload archive)', 5);
    }
    throw error;
  }
  if (previous.schema !== 1 || !Array.isArray(previous.files) || !Array.isArray(previous.marker_sections) ||
      !Array.isArray(previous.packs) || !previous.packs.includes('core') ||
      previous.files.some(file => !file.path || typeof file.sha256 !== 'string')) {
    await payload.cleanup();
    throw new BatonError('E_MANIFEST', 'Invalid Baton manifest; refusing to update');
  }
  const script = await installedScript(root, previous);
  const stage = await mkdtemp(join(tmpdir(), 'baton-update-'));
  try {
    const stageArgs = ['--packs', previous.packs.join(','), ...(opts.archive ? ['--from', opts.archive] : [])];
    let scriptFallback = false;
    let installed;
    try {
      installed = await init(stage, [...stageArgs, '--script', script]);
    } catch (error) {
      if (script === 'sh' || !(error instanceof UpstreamError && /^E_UPSTREAM_VERIFY uv /.test(error.message) ||
          error instanceof BatonError && error.code === 'E_PREREQUISITE' && /uv|wheel/i.test(error.message))) throw error;
      scriptFallback = true;
      installed = await init(stage, [...stageArgs, '--script', 'sh']);
    }
    if (installed.exitCode || installed.errors?.length) {
      throw new BatonError('E_PREREQUISITE', `Cannot stage the new Baton payload: ${JSON.stringify(installed.errors)}`, 5);
    }
    const next = /** @type {Manifest} */ (await readManifest(stage));
    const files = previous.files.map(file => ({ ...file }));
    const sections = previous.marker_sections.map(section => ({ ...section }));
    /** @type {string[]} */
    const actions = [];
    /** @type {Array<{path:string,reason:string}>} */
    const conflicts = [];
    /** @type {Array<{code:string,file:string,message:string}>} */
    const warnings = [];
    if (scriptFallback) warnings.push({ code: 'W_SCRIPT_UNREFRESHED', file: '.specify/scripts',
      message: `${script} script payload could not be generated; existing scripts and flavour metadata were preserved` });
    /** @param {string} path */
    const clearConflict = async path => {
      const pending = `.baton/conflicts/${path}.new`;
      if (!opts.dryRun && await optionalBytes(root, pending)) await rm(await safePath(root, pending));
    };
    /** @param {string} path @param {string} reason @param {Buffer} bytes */
    const conflict = async (path, reason, bytes) => {
      conflicts.push({ path, reason });
      if (!opts.dryRun) await putBytes(root, `.baton/conflicts/${path}.new`, bytes);
    };
    const desiredPaths = new Set(next.files.map(entry => entry.path));
    for (const old of files.filter(file => !desiredPaths.has(file.path) && !protectedPath.test(file.path) &&
        !(scriptFallback && file.path.startsWith('.specify/scripts/')))) {
      warnings.push({ code: 'W_REMOVED_UPSTREAM', file: old.path, message: 'Formerly managed file kept; the new payload does not contain it' });
    }
    for (const entry of next.files) {
      if (protectedPath.test(entry.path)) continue;
      if (scriptFallback && (entry.path.startsWith('.specify/scripts/bash/') ||
          entry.path === '.specify/init-options.json' || entry.path === '.specify/integration.json')) continue;
      const old = files.find(file => file.path === entry.path);
      const current = await optionalBytes(root, entry.path);
      /** @type {Buffer} */
      let desired = await readFile(join(stage, entry.path));
      if (old && (!old.managed || !current || digest(current) !== old.sha256)) {
        await conflict(entry.path, 'user-modified or missing managed file', desired);
        continue;
      }
      if (!old && current) {
        await conflict(entry.path, 'unmanaged file', desired);
        continue;
      }
      if (current && (entry.path === '.specify/extensions.yml' || entry.path === '.github/hooks/copilot-hooks.json')) {
        try {
          desired = entry.path === '.specify/extensions.yml' ?
            mergeExtensions(current, desired) : mergeHooks(current, desired);
        } catch (error) {
          if (!(error instanceof BatonError)) throw error;
          await conflict(entry.path, error.message, desired);
          continue;
        }
      }
      const mergedEntry = { ...entry, sha256: digest(desired) };
      if (current?.equals(desired)) {
        if (old) Object.assign(old, mergedEntry);
        else files.push(mergedEntry);
        await clearConflict(entry.path);
        continue;
      }
      actions.push(`${current ? 'update' : 'install'} ${entry.path}`);
      if (!opts.dryRun) await putBytes(root, entry.path, desired);
      if (old) Object.assign(old, mergedEntry);
      else files.push(mergedEntry);
      await clearConflict(entry.path);
    }
    const incoming = (await readFile(join(stage, instructions), 'utf8')).match(batonSection)?.[1];
    if (incoming === undefined) throw new BatonError('E_MISSING_ARTIFACT', 'Payload BATON marker is missing');
    const current = (await optionalBytes(root, instructions))?.toString('utf8');
    const existing = current?.match(batonSection)?.[1];
    const oldSection = sections.find(section => section.path === instructions && section.marker === 'BATON');
    if (current !== undefined && (!oldSection || existing === undefined || digest(existing) !== oldSection.sha256)) {
      await conflict(instructions, 'user-modified or unmanaged BATON marker',
        Buffer.from(existing === undefined ? await readFile(join(stage, instructions), 'utf8') :
          current.replace(batonSection, `<!-- BATON:START -->\n${incoming}<!-- BATON:END -->`)));
    } else {
      const eol = current?.includes('<!-- BATON:START -->\r\n') ? '\r\n' : '\n';
      const content = incoming.replace(/\r?\n/g, eol);
      const merged = current === undefined ? mergeMarker('', 'BATON', incoming) :
        current.replace(batonSection, `<!-- BATON:START -->${eol}${content}<!-- BATON:END -->`);
      if (current !== merged) {
        actions.push(`merge ${instructions}`);
        if (!opts.dryRun) await putBytes(root, instructions, merged);
      }
      await clearConflict(instructions);
      const hash = digest(/** @type {RegExpMatchArray} */ (merged.match(batonSection))[1]);
      if (oldSection) oldSection.sha256 = hash;
      else sections.push({ path: instructions, marker: 'BATON', sha256: hash });
    }
    if (!opts.dryRun) {
      await writeManifest(root, { ...previous, baton_version: next.baton_version, script,
        upstreams: next.upstreams, packs: next.packs, recommended_packs: next.recommended_packs,
        files, marker_sections: sections });
      if (conflicts.length) {
        await putBytes(root, '.baton/conflicts/report.json', JSON.stringify({ conflicts }, null, 2) + '\n');
      } else {
        const report = '.baton/conflicts/report.json';
        if (await optionalBytes(root, report)) await rm(join(root, report));
      }
    }
    return { exitCode: conflicts.length ? 4 : 0,
      warnings,
      errors: conflicts.map(({ path, reason }) => ({
        code: 'E_CONFLICT', file: path, message: reason,
        fix: `Review .baton/conflicts/${path}.new and resolve the local change`
      })),
      data: { actions, conflicts, dry_run: opts.dryRun, version: next.baton_version } };
  } finally {
    await rm(stage, { recursive: true, force: true });
    await payload.cleanup();
  }
}
