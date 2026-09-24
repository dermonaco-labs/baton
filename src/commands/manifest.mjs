import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import YAML from 'yaml';
import { BatonError } from '../lib/report.mjs';
import { withinRoot, writeManifest } from '../lib/manifest.mjs';
import { hashBytes, hashFile } from '../lib/hash.mjs';
import { loadPacks, recommendedPacks } from '../lib/packs.mjs';

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  if (args.length) throw new BatonError('E_USAGE', 'manifest accepts no options', 2);
  const lock = JSON.parse(await readFile(withinRoot(root, 'baton.lock.json'), 'utf8'));
  const pkg = JSON.parse(await readFile(withinRoot(root, 'package.json'), 'utf8'));
  const files = [];
  for (const entry of lock.files) {
    if (!entry.packs.includes('core')) continue;
    const path = entry.stored_at;
    if (path !== entry.path) throw new BatonError('E_LOCK_MISMATCH', `Core file is not installed at ${entry.path}`);
    files.push({
      path, sha256: await hashFile(withinRoot(root, path)),
      pack: 'core', owner: entry.upstream === 'atv' ? 'atv' : entry.upstream === 'speckit' ? 'speckit' : 'baton',
      managed: true,
    });
  }
  const instructions = await readFile(withinRoot(root, '.github/copilot-instructions.md'), 'utf8');
  const marker = /<!-- BATON:START -->\r?\n([\s\S]*?)<!-- BATON:END -->/.exec(instructions);
  if (!marker) throw new BatonError('E_MISSING_ARTIFACT', 'BATON instruction markers are required in the source repository');
  const configPath = withinRoot(root, '.baton/config.yml');
  try {
    await readFile(configPath);
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    const config = YAML.parse(await readFile(withinRoot(root, 'baton/templates/config.yml'), 'utf8'));
    config.checks = [{ name: 'baton', run: 'npm run check' }];
    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(configPath, YAML.stringify(config));
  }
  let existing;
  try {
    existing = JSON.parse(await readFile(withinRoot(root, '.baton/manifest.json'), 'utf8'));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
  }
  const manifest = {
    schema: 1, baton_version: pkg.version, installed_at: existing?.installed_at ?? new Date().toISOString(),
    source: 'template',
    upstreams: { speckit: `${lock.upstreams.speckit.version}@${lock.upstreams.speckit.commit.slice(0, 7)}`,
      atv: `${lock.upstreams.atv.ref}@${lock.upstreams.atv.commit.slice(0, 7)}` },
    packs: ['core'], recommended_packs: recommendedPacks(await loadPacks(root), ['core']),
    files, marker_sections: [{
      path: '.github/copilot-instructions.md', marker: 'BATON', sha256: hashBytes(Buffer.from(marker[1])),
    }],
  };
  await writeManifest(root, manifest);
  return { data: { files: files.length, packs: manifest.packs } };
}
