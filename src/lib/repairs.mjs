import { sha256, UpstreamError } from './upstream.mjs';
import YAML from 'yaml';

/** @typedef {{id:string,match:string,applies_to:string,reason:string,upstream_issue:string}} RepairRule */

/** @param {Buffer} bytes @param {string} path */
export function assertFrontmatter(bytes, path) {
  const text = bytes.toString('utf8');
  const strict = path.endsWith('.agent.md');
  if (!(strict ? text.startsWith('---\n') && text.includes('\n---\n') :
    /^---\r?\n/.test(text) && /\r?\n---\r?\n/.test(text))) {
    throw new UpstreamError('E_FRONTMATTER_MALFORMED', `${path} lacks complete YAML frontmatter`);
  }
  const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1] || '';
  let parsed;
  try {
    parsed = YAML.parse(header, { uniqueKeys: true });
  } catch {
    throw new UpstreamError('E_FRONTMATTER_MALFORMED', `${path} has invalid YAML frontmatter`);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new UpstreamError('E_FRONTMATTER_MALFORMED', `${path} has invalid YAML frontmatter`);
  }
  if (path.endsWith('/SKILL.md') && (typeof parsed.name !== 'string' || !parsed.name.trim())) {
    throw new UpstreamError('E_FRONTMATTER_MALFORMED', `${path} lacks a skill name`);
  }
  if (typeof parsed.description !== 'string' || !parsed.description.trim()) {
    throw new UpstreamError('E_FRONTMATTER_MALFORMED', `${path} lacks a description`);
  }
  return true;
}

/**
 * @param {Buffer} bytes
 * @param {string} path
 * @param {RepairRule[]} [rules]
 * @param {Buffer|string|null} [knownGood]
 * @param {string} [sourceVersion]
 */
export function repairAtv(bytes, path, rules = [], knownGood = null, sourceVersion = 'main') {
  if (!/\/agents\/[^/]+\.agent\.md$/.test(path)) return { bytes, repair: null };
  try {
    assertFrontmatter(bytes, path);
    return { bytes, repair: null };
  } catch (error) {
    if (!(error instanceof UpstreamError) || error.code !== 'E_FRONTMATTER_MALFORMED') throw error;
  }

  const rule = rules.find(({ id, match, applies_to }) =>
    id === 'atv-263-agent-frontmatter-newlines' &&
    match === 'pkg/scaffold/templates/agents/*.agent.md' &&
    applies_to === 'atv:v2.6.3' && applies_to === sourceVersion);
  if (!rule || !knownGood || sourceVersion !== 'atv:v2.6.3') {
    throw new UpstreamError('E_FRONTMATTER_MALFORMED', `${path}: no declared, independently verified repair source`);
  }
  const good = Buffer.isBuffer(knownGood) ? knownGood : Buffer.from(knownGood);
  assertFrontmatter(good, path);
  const collapsed = Buffer.from(good.toString('utf8').replace(/\r?\n/g, ''));
  if (sha256(bytes) !== sha256(collapsed)) {
    throw new UpstreamError('E_UPSTREAM_VERIFY', `${path}: corrupted bytes do not match the known newline-loss signature`);
  }
  return {
    bytes: good,
    repair: { id: rule.id, reason: rule.reason, upstream_issue: rule.upstream_issue }
  };
}
