import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import YAML from 'yaml';

/** @param {string} path */
export function isLicenseNotice(path) {
  const normalized = path.replaceAll('\\', '/');
  return normalized === 'THIRD_PARTY_NOTICES.md' ||
    /^(?:\.specify\/|\.github\/|packs\/[^/]+\/files\/).*(?:^|\/)(?:LICENSE|NOTICE|COPYING)(?:\.[^/]*)?$/i.test(normalized);
}

/** @param {string} root */
export async function denylistTerms(root) {
  let config;
  try {
    config = YAML.parse(await readFile(resolve(root, '.baton/config.yml'), 'utf8'));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
  }
  const name = process.env.BATON_DENYLIST_FILE ?? config?.denylist?.terms_file;
  if (!name) return [];
  const path = isAbsolute(name) ? name : resolve(root, name);
  return (await readFile(path, 'utf8')).split(/\r?\n/).map((term) => term.trim()).filter(Boolean);
}

/** @param {string} text @param {{frontmatter?:boolean,terms?:string[],path?:string}} [options] */
export function scanPersonalData(text, options = {}) {
  const terms = options.terms ?? [];
  const markdownSubject = options.frontmatter ? text : text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
  const subject = /\.(?:mjs|js|ts|tsx)$/.test(options.path ?? '') ?
    markdownSubject.replace(/@(?=param\b|returns?\b|typedef\b|type\b|property\b|template\b|deprecated\b|throws\b)/g, '') :
    markdownSubject;
  const patterns = [
    { label: 'email address', regex: /[\w.+-]+@[\w-]+\.[\w.-]+/i },
    { label: 'account mention', regex: /(^|[\s(])@[A-Za-z0-9-]{1,39}\b/m },
    { label: 'user-home path', regex: /(?:[A-Za-z]:\\Users\\|\/home\/[^/\s]+\/|\/Users\/[^/\s]+\/)/i },
  ];
  const errors = [];
  const licensedEmail = isLicenseNotice(options.path ?? '');
  for (const { label, regex } of patterns) {
    if (label === 'email address' && licensedEmail) continue;
    if (regex.test(subject)) errors.push({ code: 'E_DENYLIST', message: `Personal ${label} is not allowed in public Baton content` });
  }
  for (const term of terms) {
    if (term.trim() && text.toLocaleLowerCase('en').includes(term.trim().toLocaleLowerCase('en'))) {
      errors.push({ code: 'E_DENYLIST', message: 'A configured private term is present in public Baton content' });
    }
  }
  return errors;
}
