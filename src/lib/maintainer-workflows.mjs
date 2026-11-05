import YAML from 'yaml';

export const maintainerWorkflows = ['ci.yml', 'smoke.yml', 'mvp-windows-smoke.yml', 'upstream-watch.yml', 'release.yml'];

const GUARD = "github.repository == 'dermonaco-labs/baton'";

/**
 * Accept the bare guard, or the guard AND-ed with one balanced parenthesized group, so job
 * conditions such as always() cannot escape the repository check.
 * @param {unknown} condition
 */
function guarded(condition) {
  if (condition === GUARD) return true;
  const prefix = `${GUARD} && (`;
  if (typeof condition !== 'string' || !condition.startsWith(prefix) || !condition.endsWith(')')) return false;
  const inner = condition.slice(prefix.length, -1).replace(/'(?:[^']|'')*'/g, 'S');
  if (!inner.trim() || inner.includes("'")) return false;
  let depth = 0;
  for (const char of inner) {
    if (char === '(') depth++;
    else if (char === ')' && --depth < 0) return false;
  }
  return depth === 0;
}

/** @param {string} file @param {string} text */
export function maintainerWorkflowIssues(file, text) {
  const workflow = /** @type {{jobs?: Record<string, {if?: unknown}>}} */ (
    YAML.parse(text, { uniqueKeys: true }));
  /** @type {Array<{code:string,file:string,message:string,fix:string}>} */
  const issues = [];
  for (const [name, job] of Object.entries(workflow?.jobs ?? {})) {
    if (!guarded(job?.if)) {
      issues.push({
        code: 'E_WORKFLOW_GUARD',
        file: `.github/workflows/${file}`,
        message: `Maintainer job ${name} must be guarded to the Baton source repository`,
        fix: "Set if: github.repository == 'dermonaco-labs/baton' on the job, optionally followed by && (<conditions>)",
      });
    }
  }
  return issues;
}
