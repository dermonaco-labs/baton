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
    /\b([a-z][a-z0-9-]+-(?:reviewer|analyst|sentinel))\b/g,
    /\b(?:use|run|invoke|dispatch|delegate to|call|spawn)\s+(?:the\s+)?([a-z][a-z0-9-]+-agent)\b/gi,
    /(?<![\w.])@([a-z][a-z0-9-]+)(?![\w.(])/g,
    /\bcompound-engineering:[a-z0-9-]+:([a-z][a-z0-9-]+)/g,
    /\bspeckit\.([a-z][a-z0-9-.]+)/g,
  ];
  for (const [index, regex] of patterns.entries()) {
    for (const match of text.matchAll(regex)) {
      if (index === 2 && !/^[a-z][a-z0-9-]+$/.test(match[1])) continue;
      if (index === 3 && match[1] === 'cross-reviewer') continue;
      const name = index === 7 ? `speckit-${match[1].replaceAll('.', '-')}` : match[1];
      found.add(name);
    }
  }
  return found;
}

/**
 * @param {Map<string,{id:string,requires:string[],conflicts:string[],files:Array<{path:string}>,optional_refs?:Array<{ref:string,note:string}>}>} definitions
 * @param {string} id
 * @param {Map<string,string>} contents
 */
export function validatePackClosure(definitions, id, contents) {
  const closure = resolvePacks(definitions, [id]);
  const installed = new Set(closure.flatMap((pack) => definitions.get(pack)?.files.map((file) => installedName(file.path)).filter(Boolean) ?? []));
  const optional = new Set(closure.flatMap((pack) => definitions.get(pack)?.optional_refs?.filter((ref) => ref.note)?.map((ref) => ref.ref) ?? []));
  const errors = [];
  for (const pack of closure) {
    for (const file of definitions.get(pack)?.files ?? []) {
      const content = contents.get(file.path);
      if (content === undefined) {
        errors.push({ code: 'E_DANGLING_REF', file: file.path, message: 'Pack payload missing for closure check' });
        continue;
      }
      for (const reference of referencedNames(content)) {
        if (installed.has(reference) || optional.has(reference)) continue;
        errors.push({ code: 'E_DANGLING_REF', file: file.path, message: `Reference ${reference} is not in ${id} + requires closure` });
      }
    }
  }
  return errors;
}
