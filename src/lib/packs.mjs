import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';

/** @param {Map<string, {id:string,requires:string[],conflicts:string[]}>} definitions @param {string[]} requested */
export function resolvePacks(definitions, requested) {
  /** @type {string[]} */
  const output = [];
  const visiting = new Set();
  /** @param {string} id */
  function visit(id) {
    if (output.includes(id)) return;
    if (visiting.has(id)) throw new Error(`Pack dependency cycle: ${id}`);
    const pack = definitions.get(id);
    if (!pack) throw new Error(`Unknown pack: ${id}`);
    visiting.add(id);
    for (const dependency of pack.requires ?? []) visit(dependency);
    visiting.delete(id);
    output.push(id);
  }
  visit('core');
  for (const id of requested) visit(id);
  for (const id of output) {
    for (const conflict of definitions.get(id)?.conflicts ?? []) {
      if (output.includes(conflict)) throw new Error(`Pack conflict: ${id} and ${conflict}`);
    }
  }
  return output;
}

/** @param {string} root */
export async function loadPacks(root) {
  const dir = join(root, 'packs');
  const files = (await readdir(dir)).filter((file) => file.endsWith('.yml') && file !== 'repairs.yml');
  const packs = await Promise.all(files.map(async (file) => YAML.parse(await readFile(join(dir, file), 'utf8'))));
  return new Map(packs.map((pack) => [pack.id, pack]));
}

/** @param {string} path */
function installedName(path) {
  const skill = /^\.github\/skills\/([^/]+)\/SKILL\.md$/.exec(path);
  if (skill) return skill[1];
  const agent = /^\.github\/agents\/([^/]+)\.agent\.md$/.exec(path);
  return agent?.[1] ?? null;
}

/** @param {string} text */
function referencedNames(text) {
  const found = new Set();
  const patterns = [
    /(?:^|[\s(`])\/([a-z][a-z0-9-]+)(?=[\s)`]|$)/gm,
    /`([a-z][a-z0-9-]+)`\s+skill\b/g,
    /\b(?:agent|subagent_type|persona|reviewer)\s*:\s*[`"']?([a-z][a-z0-9-]+)(?![\w-])/gi,
    /(?:`|\*\*)([a-z][a-z0-9-]+-(?:reviewer|analyst|sentinel|oracle|guardian|specialist|researcher|editor|agent))(?:`|\*\*)/g,
    /\b(?:use|run|invoke|dispatch|delegate to|call|spawn)\s+(?:the\s+)?([a-z][a-z0-9-]+-agent)\b/gi,
    /(?<![\w.@])@([a-z][a-z0-9-]+)(?![\w(@-])/g,
    /\bcompound-engineering:[a-z0-9-]+:([a-z][a-z0-9-]+)/g,
    /\bspeckit\.([a-z][a-z0-9-.]+)/g,
  ];
  const outsideCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  for (const [index, regex] of patterns.entries()) {
    for (const match of (index === 5 ? outsideCode : text).matchAll(regex)) {
      if (index === 2 && !/^[a-z][a-z0-9-]+$/.test(match[1])) continue;
      if (index === 3 && match[1] === 'cross-reviewer') continue;
      if (index === 5 && /^e\d+$/.test(match[1])) continue;
      const name = index === 7 ? `speckit-${match[1].replaceAll('.', '-')}` : match[1];
      found.add(name);
    }
  }
  return found;
}

/**
 * @param {Map<string,{id:string,requires:string[],conflicts:string[],files:Array<{path:string}>,optional_refs?:Array<{ref:string,reason?:string,note:string}>}>} definitions
 * @param {string} id
 * @param {Map<string,string>} contents
 * @param {{upstreamNames?:Set<string>,exclusions?:Map<string,string|string[]>}} [options]
 */
export function validatePackClosure(definitions, id, contents, { upstreamNames, exclusions } = {}) {
  const closure = resolvePacks(definitions, [id]);
  const installed = new Set(closure.flatMap((pack) => definitions.get(pack)?.files.map((file) => installedName(file.path)).filter(Boolean) ?? []));
  const optional = new Set();
  const errors = [];
  for (const name of closure) {
    for (const item of definitions.get(name)?.optional_refs ?? []) {
      const provider = item.reason?.startsWith('pack-provided:') ? item.reason.slice('pack-provided:'.length) : '';
      const valid = Boolean(item.ref && item.note && (
        item.reason === 'upstream-absent' ? upstreamNames !== undefined && !upstreamNames.has(item.ref) :
        provider ? definitions.get(provider)?.files.some((file) => installedName(file.path) === item.ref) :
        item.reason?.startsWith('excluded:') ? (exclusions?.get(item.ref) ?? []).includes(item.reason.slice('excluded:'.length)) &&
          ![...definitions.values()].some((pack) => pack.files.some((file) => installedName(file.path) === item.ref)) : false
      ));
      if (valid) optional.add(item.ref);
      else errors.push({ code: 'E_DANGLING_REF', file: `packs/${name}.yml`, message: `Optional reference ${item.ref} has an invalid or unverifiable reason` });
    }
  }
  for (const pack of closure) {
    for (const file of definitions.get(pack)?.files ?? []) {
      const content = contents.get(file.path);
      if (content === undefined) {
        errors.push({ code: 'E_DANGLING_REF', file: file.path, message: 'Pack payload missing for closure check' });
        continue;
      }
      for (const reference of referencedNames(content)) {
        if (installed.has(reference) || installed.has(`${reference}-reviewer`) ||
            optional.has(reference) || optional.has(`${reference}-reviewer`)) continue;
        errors.push({ code: 'E_DANGLING_REF', file: file.path, message: `Reference ${reference} is not in ${id} + requires closure` });
      }
    }
  }
  return errors;
}

/**
 * @param {Map<string,{id:string,requires:string[],conflicts:string[],files:Array<{path:string}>,optional_refs?:Array<{ref:string,reason?:string,note:string}>}>} definitions
 * @param {string[]} installed
 */
export function recommendedPacks(definitions, installed) {
  /** @type {Map<string,Set<string>>} */
  const recommended = new Map();
  for (const id of installed) {
    for (const item of definitions.get(id)?.optional_refs ?? []) {
      if (!item.reason?.startsWith('pack-provided:')) continue;
      const provider = item.reason.slice('pack-provided:'.length);
      if (installed.includes(provider)) continue;
      if (!recommended.has(provider)) recommended.set(provider, new Set());
      recommended.get(provider)?.add(item.ref);
    }
  }
  return [...recommended].sort(([a], [b]) => a.localeCompare(b))
    .map(([pack, refs]) => ({ pack, refs: [...refs].sort() }));
}

/** @param {string} root @param {{packs?:string[],recommended_packs?:Array<{pack:string,refs:string[]}>}|undefined} manifest */
export async function missingRecommendations(root, manifest) {
  try {
    return recommendedPacks(await loadPacks(root), manifest?.packs ?? ['core']);
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    return (manifest?.recommended_packs ?? []).filter(({ pack }) => !manifest?.packs?.includes(pack));
  }
}

/** @param {Array<{pack:string,refs:string[]}>} recommendations */
export function recommendationWarnings(recommendations) {
  return recommendations.map(({ pack, refs }) => ({
    code: 'W_PACK_RECOMMENDED', file: '.baton/manifest.json',
    message: `Recommended pack ${pack} is not installed: ${refs.join(', ')}`,
  }));
}
