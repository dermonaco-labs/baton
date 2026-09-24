import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { readHandoff, validateHandoff } from '../lib/handoff.mjs';

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  if (args.length) throw new Error(`status takes no arguments: ${args.join(' ')}`);
  const rows = [];
  for (const [directory, kind] of [['specs', 'feature'], ['.baton/quick', 'quick']]) {
    let entries;
    try {
      entries = await readdir(join(root, directory), { withFileTypes: true });
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') continue;
      throw error;
    }
    for (const entry of entries) {
      if (kind === 'feature' && (!entry.isDirectory() || !/^\d{3}-/.test(entry.name))) continue;
      if (kind === 'quick' && (!entry.isFile() || !entry.name.endsWith('.md'))) continue;
      const path = kind === 'feature' ? `${directory}/${entry.name}/handoff.md` : `${directory}/${entry.name}`;
      try {
        const { data } = await readHandoff(root, path);
        const errors = await validateHandoff(root, path);
        rows.push({ feature: data.feature, lane: kind, phase: data.phase_completed, next: data.next_phase, owner: data.next_owner, status: data.status, gate: data.gate.approved_by ?? (data.gate.required ? 'pending' : 'none'), stale: errors.some((error) => error.code === 'E_STALE_ARTIFACT') });
      } catch (error) {
        if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') continue;
        throw error;
      }
    }
  }
  return { data: rows };
}
