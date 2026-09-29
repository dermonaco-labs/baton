import { rm } from 'node:fs/promises';
import { BatonError } from '../lib/report.mjs';
import { readManifest, writeManifest } from '../lib/manifest.mjs';
import { optionalBytes, safePath, putBytes } from '../lib/overlay.mjs';
import { removeMarker } from '../lib/markers.mjs';
import { hashManaged } from '../lib/hash.mjs';

const preserved = /^(?:specs\/|docs\/(?:brainstorms|solutions)\/|\.specify\/(?:feature\.json$|memory\/constitution\.md$))/;

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  if (args.some(arg => arg !== '--dry-run')) throw new BatonError('E_USAGE', 'uninstall accepts only --dry-run', 2);
  const dryRun = args.includes('--dry-run');
  let manifest;
  try { manifest = await readManifest(root); }
  catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') {
      return { data: { actions: [], dry_run: dryRun } };
    }
    throw error;
  }
  if (manifest.schema !== 1 || !Array.isArray(manifest.files) || !Array.isArray(manifest.marker_sections)) {
    throw new BatonError('E_MANIFEST', 'Invalid Baton manifest; refusing to remove files');
  }
  /** @type {string[]} */
  const actions = [];
  /** @type {Array<{code:string,file:string,message:string}>} */
  const warnings = [];
  const retained = [];
  for (const entry of manifest.files) {
    if (!entry.managed || preserved.test(entry.path)) {
      retained.push(entry);
      continue;
    }
    const bytes = await optionalBytes(root, entry.path);
    if (!bytes) continue;
    if (hashManaged(bytes) !== entry.sha256) {
      warnings.push({ code: 'W_USER_MODIFIED', file: entry.path, message: 'Kept user-modified file' });
      retained.push(entry);
      continue;
    }
    actions.push(`remove ${entry.path}`);
    if (!dryRun) await rm(await safePath(root, entry.path));
  }
  const markers = [];
  for (const section of manifest.marker_sections) {
    const bytes = await optionalBytes(root, section.path);
    if (!bytes) continue;
    const text = bytes.toString('utf8');
    const match = new RegExp(`<!-- ${section.marker}:START -->\\r?\\n([\\s\\S]*?)<!-- ${section.marker}:END -->`).exec(text);
    if (!match || hashManaged(match[1]) !== section.sha256) {
      warnings.push({ code: 'W_USER_MODIFIED', file: section.path, message: 'Kept user-modified marker section' });
      markers.push(section);
      continue;
    }
    actions.push(`remove ${section.marker} marker from ${section.path}`);
    if (!dryRun) await putBytes(root, section.path, removeMarker(text, section.marker));
  }
  if (!dryRun) {
    if (retained.length || markers.length) {
      await writeManifest(root, { ...manifest, files: retained, marker_sections: markers });
    } else {
      await rm(await safePath(root, '.baton/manifest.json'));
    }
  }
  return { warnings, data: { actions, dry_run: dryRun } };
}
