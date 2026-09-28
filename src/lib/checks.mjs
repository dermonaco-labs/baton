import { readFile, readdir, stat } from 'node:fs/promises';
import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import YAML from 'yaml';
import { withinRoot } from './manifest.mjs';
import { hashFile } from './hash.mjs';
import { loadSchemas, validateSchema } from './schema.mjs';
import { actorRole, gateVocabulary } from './handoff.mjs';

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

/** @param {string} file */
const bookkeeping = (file) => file.startsWith('.baton/') || /^specs\/[^/]+\/handoff\.md$/.test(file);
/** @param {string} file */
const scratch = (file) => !file.includes('/') || /(?:^|\/)(?:scratch|tmp|temp)(?:[./-]|$)/i.test(file);

/**
 * Lists files changed since `base` (default: the merge-base with origin/HEAD), or null without a usable base.
 * `subject` drops Baton bookkeeping, and untracked root-level or scratch/tmp files that are not staged.
 * @param {string} root
 * @param {{base?: string|null, untracked?: boolean, subject?: boolean}} [options]
 */
export async function changedFiles(root, { base: baseCommit = null, untracked = true, subject = false } = {}) {
  try {
    const base = baseCommit || (await execFileAsync('git', ['merge-base', 'HEAD', 'origin/HEAD'], { cwd: root, windowsHide: true })).stdout.trim();
    const { stdout: tracked } = await execFileAsync('git', ['diff', '--name-only', base], { cwd: root, windowsHide: true });
    const { stdout: others } = untracked
      ? await execFileAsync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, windowsHide: true })
      : { stdout: '' };
    const newFiles = others.split(/\r?\n/).filter(Boolean).filter((file) => !subject || !scratch(file));
    return [...new Set([...tracked.split(/\r?\n/).filter(Boolean), ...newFiles])]
      .filter((file) => !subject || !bookkeeping(file));
  } catch (error) {
    if ([1, 128, 'ENOENT'].includes(/** @type {{code?:string|number}} */ (error).code ?? '')) return null;
    throw error;
  }
}

/** @param {string} root @param {string} sha */
async function commitExists(root, sha) {
  try {
    await execFileAsync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, windowsHide: true });
    return true;
  } catch (error) {
    if ([1, 128, 'ENOENT'].includes(/** @type {{code?:string|number}} */ (error).code ?? '')) return false;
    throw error;
  }
}

/**
 * Resolves the diff base: the last `diff-base` decision, then the recorded review's head, then its base.
 * Unreachable candidates are reported and skipped, so the merge-base remains the final fallback.
 * @param {string} root @param {Record<string,any>} data
 * @returns {Promise<{base: string|null, notes: string[], invalid?: boolean}>}
 */
async function reviewBase(root, data) {
  /** @type {Array<{label:string,sha:unknown}>} */
  const candidates = [];
  const recorded = /** @type {Array<{tag?:string,'x-base-commit'?:string}>} */ (data.decisions ?? [])
    .filter((item) => item.tag === 'diff-base').at(-1)?.['x-base-commit'];
  if (recorded) candidates.push({ label: 'Recorded diff base', sha: recorded });
  const report = data.review?.findings_path && await optionalText(root, data.review.findings_path);
  if (report) {
    try {
      const parsed = JSON.parse(report);
      for (const field of ['head', 'base']) {
        if (typeof parsed?.[field] === 'string') candidates.push({ label: `Review ${field}`, sha: parsed[field] });
      }
    } catch {
      // An unreadable findings file is reported by the findings checks.
    }
  }
  const notes = [];
  for (const { label, sha } of candidates) {
    if (typeof sha !== 'string' || !/^[a-f0-9]{7,64}$/i.test(sha)) {
      if (label === 'Recorded diff base') return { base: null, notes, invalid: true };
      continue;
    }
    if (await commitExists(root, sha)) return { base: sha, notes };
    notes.push(`${label} ${sha} is not in this clone`);
  }
  return { base: null, notes };
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
      const outstanding = (await text('tasks.md') ?? '').split('\n').filter((line) =>
        /^\s*-\s+\[ \]\s+T\d{3}/.test(line) &&
        !/\bDEFERRED\b/.test(line) &&
        !(line.includes('<!-- baton:handoff-write:implement -->') &&
          /\bbaton\s+handoff\s+write\s+--phase\s+implement\b/.test(line)));
      return answer(outstanding.length === 0, `${outstanding.length} outstanding tasks`);
    }
    case 'acceptance-evidence': {
      const tasks = await text('tasks.md') ?? '';
      const evidenceHash = await hashFile(withinRoot(root, `${dir}/tasks.md`));
      const lines = tasks.split(/\r?\n/);
      /** @param {string} line */
      const isRow = (line) => line.trim() !== '' && /(?<!\\)\|/.test(line);
      /** @param {string} line */
      const isDelimiter = (line) => line.includes('|') && /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/.test(line);
      /** @param {string} line */
      const cells = (line) => {
        let row = line.trim();
        if (row.startsWith('|')) row = row.slice(1);
        if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
        return row.split(/(?<!\\)\|/).map((cell) => cell.replaceAll('\\|', '|').trim());
      };
      /** @param {(values:string[])=>boolean} isHeader */
      const table = (isHeader) => {
        const start = lines.findIndex((line, index) => isRow(line) && isHeader(cells(line)) && isDelimiter(lines[index + 1] ?? ''));
        if (start < 0) return { header: /** @type {string[]} */ ([]), rows: /** @type {string[][]} */ ([]) };
        const rows = [];
        for (let i = start + 2; i < lines.length && isRow(lines[i]); i++) rows.push(cells(lines[i]));
        return { header: cells(lines[start]), rows };
      };
      const registry = table((values) => /^ID$/i.test(values[0]) && /^Story$/i.test(values[1]));
      const evidence = table((values) => /^Check$/i.test(values[0]) && /^Result and evidence$/i.test(values[1])).rows;
      const expectColumn = registry.header.findIndex((value) => /^Expect initial\b/i.test(value));
      /** @param {string|undefined} value */
      const expectation = (value) => /^`?(fail|n\/a)`?$/i.exec(value?.trim() ?? '')?.[1].toLowerCase();
      /** @param {string} value */
      const substantive = (value) => value.length >= 8 &&
        !/\b(?:TBD|TODO|placeholder|add proof)\b/i.test(value) &&
        !/^\s*(?:owner\s+)?pending[.!]?\s*$/i.test(value);
      const separator = '[\\s—–:→⇒⟶>-]+';
      const redGreenPattern = new RegExp(`^red\\b${separator}(.+?)\\s*(?:[;,.]|→|⇒|⟶|->|\\s[—–-])\\s*green\\b${separator}(.+)$`, 'i');
      const notApplicablePattern = new RegExp(`^n\\/a\\b${separator}(.+)$`, 'i');
      const partialPattern = new RegExp(`^partial\\b${separator}(.+)$`, 'i');
      const vocabulary = await gateVocabulary(root);
      const humanDecisions =       /** @type {Array<{decision?:string,rationale?:string,by?:string,tag?:string,'x-check'?:string,'x-evidence-sha256'?:string}>} */ (data.decisions ?? [])
        .filter((item) => typeof item.by === 'string' && item.by.startsWith('human:') && actorRole(item.by, vocabulary));
      /** @param {string} id */
      const waived = (id) => humanDecisions.some((item) => item.tag === 'acceptance-waiver' &&
        item['x-check'] === id && item['x-evidence-sha256'] === evidenceHash);
      /** @type {string[]} */
      const missing = [];
      for (const item of /** @type {Array<{story:string,id:string,expect_initial?:string}>} */ (accepted)) {
        const row = registry.rows.find((values) => values[0] === item.id);
        if (!row) {
          missing.push(`${item.id} (missing from the tasks.md registry)`);
          continue;
        }
        if (row[1] !== item.story) {
          missing.push(`${item.id} (story ${item.story} in the baton, ${row[1]} in tasks.md)`);
          continue;
        }
        const expected = [expectation(item.expect_initial), expectation(expectColumn >= 0 ? row[expectColumn] : undefined)];
        const result = evidence.find((values) => values[0] === item.id)?.[1] ?? '';
        const redGreen = redGreenPattern.exec(result);
        const notApplicable = notApplicablePattern.exec(result);
        const partial = partialPattern.exec(result);
        if (redGreen && substantive(redGreen[1]) && substantive(redGreen[2])) continue;
        if (notApplicable && substantive(notApplicable[1])) {
          if (expected[0] === 'n/a' && expected[1] !== 'fail') continue;
          missing.push(`${item.id} (n/a but expect_initial is ${expected.find((value) => value !== 'n/a') ?? 'unset'})`);
        } else if (partial && substantive(partial[1])) {
          if (!waived(item.id)) missing.push(`${item.id} (partial; needs a tagged human waiver)`);
        } else missing.push(item.id);
      }
      for (const values of registry.rows) {
        if (values[0] && !accepted.some((item) => item.id === values[0])) {
          missing.push(`${values[0]} (registered in tasks.md but missing from the baton)`);
        }
      }
      return answer(!missing.length && accepted.length > 0,
        `${missing.length} checks lack evidence${missing.length ? `: ${missing.join(', ')}` : ''}`);
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
      const { base, notes, invalid } = await reviewBase(root, data);
      if (invalid) return answer(false, 'Invalid recorded review base');
      const files = await changedFiles(root, { base, subject: true });
      const relevant = files?.filter((file) => !(dir.startsWith('specs/') && file.startsWith(`${dir}/`)));
      return answer(relevant?.length, [...notes, relevant ? `${relevant.length} changed files` : 'No merge-base available'].join('; '));
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
      let findings;
      try {
        findings = JSON.parse(findingsText);
      } catch (error) {
        return answer(false, `Review findings are not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
      const issues = validateSchema(await loadSchemas(root), 'findings', findings);
      if (issues.length) return answer(false, issues.map((issue) => `${issue.pointer}: ${issue.message}`).join('; '));
      if (check.id === 'findings-json-valid') return answer(true, data.review.findings_path);
      const unresolved = findings.findings.filter((/** @type {{disposition:string,reason?:string,task?:string}} */ item) => check.id === 'findings-fixed-or-dismissed'
        ? item.disposition !== 'fixed' && !(item.disposition === 'dismissed' && item.reason)
        : item.disposition !== 'dismissed' && !item.task);
      return answer(!unresolved.length, `${unresolved.length} findings unresolved`);
    }
    case 'no-blocking-findings': {
      const findingsText = data.review?.findings_path && await optionalText(root, data.review.findings_path);
      if (!findingsText) return answer(false, 'Review findings file absent');
      let findings;
      try {
        findings = JSON.parse(findingsText);
      } catch {
        return answer(false, 'Review findings are not valid JSON');
      }
      const issues = validateSchema(await loadSchemas(root), 'findings', findings);
      if (issues.length) return answer(false, `Review findings invalid: ${issues.map((issue) => issue.message).join('; ')}`);
      const blocking = findings.findings.filter((/** @type {{severity:string,disposition:string}} */ item) =>
        ['P0', 'P1'].includes(item.severity) && item.disposition === 'open').length;
      return answer(blocking === 0, `blocking: ${blocking}`);
    }
    case 'pr-opened': return answer(Boolean(data.pr?.url), data.pr?.url ?? 'PR URL missing');
    case 'quick-scope-held': {
      const verified = decisions.find((item) => item.tag === 'quick-scope-held' && item.rationale?.trim());
      return answer(verified, verified?.rationale ?? 'Explicit reviewer scope decision required');
    }
    default: throw new Error(`E_CHECK_UNKNOWN: ${check.id}`);
  }
}
