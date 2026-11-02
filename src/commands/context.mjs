import { readdir } from 'node:fs/promises';
import { contextProtection, contextText, featureContext, mutateContext } from '../lib/context-guards.mjs';
import { BatonError } from '../lib/report.mjs';

/** @param {string} message */
const usage = (message) => new BatonError('E_USAGE', message, 2);

/** @param {string[]} args @param {string[]} allowed */
function parse(args, allowed) {
  /** @type {Record<string,string|boolean>} */
  const values = {};
  for (let index = 0; index < args.length; index++) {
    const name = args[index];
    if (!allowed.includes(name) || Object.hasOwn(values, name)) throw usage(`Unknown or duplicate context option: ${name}`);
    if (name === '--apply') values[name] = true;
    else {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw usage(`${name} requires a value`);
      values[name] = value;
    }
  }
  return values;
}

/** @param {Record<string,string|boolean>} options @param {string} name */
function required(options, name) {
  if (typeof options[name] !== 'string') throw usage(`${name} is required`);
  return /** @type {string} */ (options[name]);
}

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  const [action, ...rest] = args;
  if (action === 'compact' || action === 'restore') {
    const options = parse(rest, ['--feature', '--target', '--candidate', '--expect', '--apply']);
    if (options['--expect'] !== undefined && !/^[a-f0-9]{64}$/.test(String(options['--expect']))) {
      throw usage('--expect must be a raw SHA-256 digest');
    }
    if (action === 'restore' && options['--candidate']) throw usage('Restore does not accept a candidate');
    return { data: await mutateContext(root, action, {
      feature: required(options, '--feature'), target: required(options, '--target'),
      candidate: typeof options['--candidate'] === 'string' ? options['--candidate'] : undefined,
      expect: typeof options['--expect'] === 'string' ? options['--expect'] : undefined,
      apply: options['--apply'] === true,
    }) };
  }
  if (action === 'concise') {
    if (rest.length > 1 || rest.length && !['on', 'off'].includes(rest[0])) throw usage('Use context concise [on|off]');
    await contextProtection(root, 'token-budget');
    return { data: { action, session_only: true, enabled: rest[0] !== 'off',
      instruction: rest[0] === 'off' ? 'Use normal session response detail.' : 'Use concise responses; preserve all errors, evidence and required context.' } };
  }
  if (action === 'scope' || action === 'usage') {
    const options = parse(rest, ['--feature']);
    const feature = required(options, '--feature');
    const context = await featureContext(root, feature);
    const files = [];
    for (const entry of await readdir(context.directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name.endsWith('.full.md')) continue;
      const path = `specs/${feature}/${entry.name}`;
      if (context.protection.excludedPaths.has(path.toLowerCase())) continue;
      const text = await contextText(root, path);
      if (text !== null) files.push({ path, estimated_tokens: Math.ceil(text.length / 4) });
    }
    return { data: { action, feature, report_only: true, estimate: 'characters / 4; not provider billing',
      read_first: context.baton?.read_first ?? [],
      do_not_read: context.baton?.do_not_read ?? [],
      files, estimated_tokens: files.reduce((total, file) => total + file.estimated_tokens, 0) } };
  }
  if (action === 'optimize') {
    if (rest.length !== 1 || !['run', 'tokens', 'learn'].includes(rest[0])) {
      throw usage('Optimize is report-only: use context optimize run|tokens|learn with no apply options');
    }
    const protection = await contextProtection(root, 'optimize');
    const paths = [...new Set(['.specify/memory/constitution.md', 'AGENTS.md', 'CLAUDE.md',
      '.github/copilot-instructions.md', '.baton/phases.yml', '.specify/extensions.yml',
      ...protection.manifest.marker_sections.map((item) => item.path),
      ...protection.manifest.files.filter((item) =>
        /^(?:\.github\/(?:skills|agents|instructions)\/|\.specify\/(?:extensions|memory)\/)/.test(item.path) &&
        /\.(?:md|ya?ml)$/.test(item.path)).map((item) => item.path)])];
    const files = [];
    for (const path of paths) {
      if (protection.excludedPaths.has(path.toLowerCase())) continue;
      const text = await contextText(root, path);
      if (text !== null) files.push({ path, estimated_tokens: Math.ceil(text.length / 4), protected: true });
    }
    return { data: { action: rest[0], report_only: true, files,
      estimated_tokens: files.reduce((total, file) => total + file.estimated_tokens, 0),
      estimate: 'characters / 4; not provider billing',
      instruction: 'Report proposals only. Mandatory gates, scanner rules and approval semantics are not removable. No governance or memory writes. Route amendments through /speckit-constitution.' } };
  }
  throw usage('Use context compact|restore|scope|concise|usage|optimize');
}
