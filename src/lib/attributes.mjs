import { BatonError } from './report.mjs';

const block = /^# BATON:START\r?\n[\s\S]*?^# BATON:END(?:\r?\n|$)/m;

/** @param {string} current @param {string} template */
export function mergeAttributes(current, template) {
  if (!block.test(template)) throw new BatonError('E_MISSING_ARTIFACT', 'Baton attributes template is missing its marker');
  if ((current.includes('# BATON:START') || current.includes('# BATON:END')) && !block.test(current)) {
    throw new BatonError('E_CONFLICT', 'Unbalanced BATON marker in .gitattributes', 4);
  }
  const incoming = /** @type {RegExpMatchArray} */ (template.match(block))[0].replace(/\r\n/g, '\n').trimEnd();
  const eol = current.includes('\r\n') ? '\r\n' : '\n';
  if (block.test(current)) {
    return current.replace(block, incoming.replace(/\n/g, eol) + eol);
  }
  return current + (current && !/\r?\n$/.test(current) ? eol : '') + incoming.replace(/\n/g, eol) + eol;
}
