import { readFile, readdir, stat } from 'node:fs/promises';
import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import YAML from 'yaml';
import { withinRoot } from './manifest.mjs';
import { hashFile } from './hash.mjs';
import { loadSchemas, validateSchema } from './schema.mjs';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

/** @param {string} root @param {string} path */
async function optionalText(root, path) {
  try {
    return await readFile(withinRoot(root, path), 'utf8');
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return null;
    throw error;
  }
}

/** @param {string} root @param {string} path */
async function exists(root, path) {
  try {
    return (await stat(withinRoot(root, path))).isFile();
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;
    throw error;
  }
}

/** @param {string} root @param {string} pattern */
async function matches(root, pattern) {
  const normalized = pattern.replaceAll('\\', '/');
  if (!normalized.includes('*')) return await exists(root, normalized);
  const base = normalized.slice(0, normalized.indexOf('*')).replace(/[^/]*$/, '').replace(/\/$/, '');
  const regex = new RegExp(`^${normalized.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('**', '\u0000').replaceAll('*', '[^/]*').replaceAll('\u0000', '.*')}$`);
  /** @param {string} directory */
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(withinRoot(root, directory), { withFileTypes: true });
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;
      throw error;
    }
    for (const entry of entries) {
      const name = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.isFile() && regex.test(name)) return true;
      if (entry.isDirectory() && await visit(name)) return true;
    }
    return false;
  }
  return visit(base);
}

/** @param {string} root */
export async function changedFiles(root) {
  try {
    const { stdout: base } = await execFileAsync('git', ['merge-base', 'HEAD', 'origin/HEAD'], { cwd: root, windowsHide: true });
    const { stdout: tracked } = await execFileAsync('git', ['diff', '--name-only', base.trim()], { cwd: root, windowsHide: true });
    const { stdout: untracked } = await execFileAsync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, windowsHide: true });
    return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/).filter(Boolean))];
  } catch (error) {
    if ([1, 128, 'ENOENT'].includes(/** @type {{code?:string|number}} */ (error).code ?? '')) return null;
    throw error;
  }
}

/** @typedef {import('./phases.mjs').Check} Check */
/** @param {string} root @param {string} batonPath @param {Record<string,any>} data @param {Check} check */
export async function evaluateBuiltIn(root, batonPath, data, check) {
  const dir = dirname(batonPath).replaceAll('\\', '/');
  /** @param {string} value */
  const path = (value) => value.replaceAll('{feature_dir}', dir).replaceAll('{quick_dir}', '.baton/quick')
    .replace(/^(?!docs\/|\.|specs\/|baton\/)([^/].*)$/, (match) => `${dir}/${match}`);
  /** @param {string} name */
  const text = (name) => optionalText(root, path(name));
  /** @param {unknown} met @param {unknown} evidence */
  const answer = (met, evidence) => ({ met: Boolean(met), evidence: String(evidence ?? (met ? 'verified' : 'not satisfied')) });
  const decisions = /** @type {Array<{id:string,tag?:string,rationale?:string}>} */ (data.decisions ?? []);
  const accepted = /** @type {Array<{story:string,id:string}>} */ (data.acceptance_checks ?? []);
  const artifacts = /** @type {Array<{path:string,sha256:string}>} */ (data.artifacts ?? []);
  switch (check.id) {
    case 'artifact-exists':
      return answer(await matches(root, path(check.path ?? '')), check.path);
    case 'spec-exists':
    case 'plan-exists':
    case 'tasks-exists': {
      const name = check.id.split('-')[0];
      return answer(await exists(root, path(`${name}.md`)), `${name}.md`);
    }
    case 'from-phase':
      return answer(check.phases?.includes(data.phase_completed) ||
        (data.phase_completed === 'none' && check.phases?.includes('none')) ||
        /** @type {Array<{phase:string}>} */ (data.history ?? []).some((item) => check.phases?.includes(item.phase)),
      `previous: ${data.phase_completed}`);
    case 'decision': {
      const found = decisions.find((item) => item.tag === check.tag && item.rationale?.trim());
      return answer(found, found?.id ?? `No reasoned ${check.tag} decision`);
    }
    case 'gate-approved':
      return answer(!data.gate?.required || Boolean(data.gate.approved_by), data.gate?.approved_by ?? 'gate pending');
    case 'no-blocking-questions':
      return answer(!/** @type {Array<{blocking:boolean}>} */ (data.open_questions ?? []).some((item) => item.blocking), 'blocking questions');
    case 'fresh': {
      const stale = [];
      for (const name of check.names ?? []) {
        const item = artifacts.find((artifact) => artifact.path.endsWith(`/${name}.md`));
        if (!item || !await exists(root, item.path) || await hashFile(withinRoot(root, item.path)) !== item.sha256) stale.push(name);
      }
      return answer(!stale.length, stale.length ? `stale: ${stale.join(', ')}` : 'all artifact hashes match');
    }
    case 'spec-has-stories': return answer(/##\s+(?:User Story|US\d+)/i.test(await text('spec.md') ?? ''), 'user stories in spec');
    case 'spec-has-success-criteria': return answer(/##\s+Success Criteria/i.test(await text('spec.md') ?? ''), 'success criteria in spec');
    case 'markers-bounded': return answer(((await text('spec.md') ?? '').match(/\[NEEDS CLARIFICATION/gi) ?? []).length <= 3, 'at most three clarification markers');
    case 'no-needs-clarification': {
      const content = await text(check.path ?? '');
      return answer(content !== null && !/\[NEEDS CLARIFICATION/i.test(content), check.path);
    }
    case 'clarifications-recorded': return answer(/##\s+Clarifications/i.test(await text('spec.md') ?? ''), 'clarifications in spec');
    case 'constitution-check-present': return answer(/constitution check/i.test(await text('plan.md') ?? ''), 'constitution check in plan');
    case 'tasks-reference-stories': {
      const tasks = await text('tasks.md') ?? '';
      const lines = tasks.split('\n').filter((line) => /^\s*-\s+\[[ xX]\]\s+T\d{3}/.test(line) && /\[US\d+\]/.test(line));
      return answer(lines.length > 0 && tasks.includes('## Acceptance Registry'), `${lines.length} story tasks`);
    }
    case 'acceptance-registered': {
      const tasks = await text('tasks.md') ?? '';
      const stories = [...new Set([...tasks.matchAll(/\[US(\d+)\]/g)].map((match) => `US${match[1]}`))];
      return answer(tasks.includes('## Acceptance Registry') && stories.length > 0 &&
        stories.every((story) => accepted.some((item) => item.story === story && tasks.includes(item.id))),
      `registered: ${accepted.length}, stories: ${stories.length}`);
    }
    case 'analysis-recorded': return answer(data.analysis?.report_path && await exists(root, data.analysis.report_path), data.analysis?.report_path);
    case 'no-critical-findings': {
      const report = data.analysis?.report_path && await optionalText(root, data.analysis.report_path);
      if (!report) return answer(false, 'Analysis report is missing');
      const summary = /^\|\s*Findings remaining open\s*\|\s*([^|\n]+)\|/im.exec(report)?.[1];
      const count = summary && /\bCRITICAL\s*:?\s*(\d+)\b/i.exec(summary)?.[1];
      if (typeof count === 'string') {
        return answer(data.analysis.critical === Number(count) && Number(count) === 0,
          `report CRITICAL ${count}; baton CRITICAL ${data.analysis.critical}`);
      }
      return answer(data.analysis.critical === 0 && data.analysis['x-critical-evidence']?.trim(),
        data.analysis['x-critical-evidence'] ?? 'Analysis severity could not be parsed; explicit evidence required');
    }
    case 'tasks-all-checked-or-deferred': {
      const outstanding = (await text('tasks.md') ?? '').split('\n').filter((line) => /^\s*-\s+\[ \]\s+T\d{3}/.test(line) && !/\bDEFERRED\b/.test(line));
      return answer(outstanding.length === 0, `${outstanding.length} outstanding tasks`);
    }
    case 'acceptance-evidence': {
      const tasks = await text('tasks.md') ?? '';
      const missing = accepted.filter((item) => !new RegExp(`${item.id}[^\\n]*\\b(?:red|green|n/a)\\b`, 'i').test(tasks));
      return answer(!missing.length && accepted.length > 0, `${missing.length} checks lack evidence`);
    }
    case 'local-checks-pass': {
      const configText = await optionalText(root, '.baton/config.yml');
      if (!configText) return answer(false, 'Missing .baton/config.yml');
      const config = YAML.parse(configText);
      if (!Array.isArray(config.checks) || !config.checks.length) return answer(false, 'No configured local checks');
      const results = [];
      for (const item of config.checks) {
        try {
          await execAsync(item.run, { cwd: root, timeout: 120000, windowsHide: true });
          results.push(`${item.name}: 0`);
        } catch (error) {
          results.push(`${item.name}: ${/** @type {{code?:number}} */ (error).code ?? 'error'}`);
        }
      }
      return answer(results.every((item) => item.endsWith(': 0')), results.join(', '));
    }
    case 'diff-nonempty': {
      const files = await changedFiles(root);
      return answer(files?.length, files ? `${files.length} changed files` : 'No merge-base available');
    }
    case 'no-feature-tasks': {
      const files = await changedFiles(root);
      const featureDir = join(root, 'specs');
      const claims = await readdir(featureDir, { withFileTypes: true }).catch((error) => {
        if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return [];
        throw error;
      });
      return answer(files && !files.some((file) => file.startsWith('specs/')) &&
        !claims.some((entry) => entry.isDirectory() && entry.name.endsWith(`-${data.feature}`)),
      files ? `${files.filter((file) => file.startsWith('specs/')).length} specs files changed` : 'No merge-base available');
    }
    case 'findings-json-valid':
    case 'findings-mapped-to-tasks-or-dismissed':
    case 'findings-fixed-or-dismissed': {
      const findingsText = data.review?.findings_path && await optionalText(root, data.review.findings_path);
      if (!findingsText) return answer(false, 'Review findings file absent');
      const findings = JSON.parse(findingsText);
      const issues = validateSchema(await loadSchemas(root), 'findings', findings);
      if (issues.length) return answer(false, issues.map((issue) => `${issue.pointer}: ${issue.message}`).join('; '));
      if (check.id === 'findings-json-valid') return answer(true, data.review.findings_path);
      const unresolved = findings.findings.filter((/** @type {{disposition:string,reason?:string,task?:string}} */ item) => check.id === 'findings-fixed-or-dismissed'
        ? item.disposition !== 'fixed' && !(item.disposition === 'dismissed' && item.reason)
        : item.disposition !== 'dismissed' && !item.task);
      return answer(!unresolved.length, `${unresolved.length} findings unresolved`);
    }
    case 'no-blocking-findings': return answer(data.review?.blocking_findings === 0, `blocking: ${data.review?.blocking_findings ?? 'unknown'}`);
    case 'pr-opened': return answer(Boolean(data.pr?.url), data.pr?.url ?? 'PR URL missing');
    case 'quick-scope-held': {
      const verified = decisions.find((item) => item.tag === 'quick-scope-held' && item.rationale?.trim());
      return answer(verified, verified?.rationale ?? 'Explicit reviewer scope decision required');
    }
    default: throw new Error(`E_CHECK_UNKNOWN: ${check.id}`);
  }
}
