import YAML from 'yaml';

export const maintainerWorkflows = ['ci.yml', 'smoke.yml', 'mvp-windows-smoke.yml', 'upstream-watch.yml', 'release.yml'];

/** @param {string} file @param {string} text */
export function maintainerWorkflowIssues(file, text) {
  const workflow = /** @type {{jobs?: Record<string, {if?: unknown}>}} */ (
    YAML.parse(text, { uniqueKeys: true }));
  /** @type {Array<{code:string,file:string,message:string,fix:string}>} */
  const issues = [];
  for (const [name, job] of Object.entries(workflow?.jobs ?? {})) {
    if (job?.if !== "github.repository == 'dermonaco-labs/baton'") {
      issues.push({
        code: 'E_WORKFLOW_GUARD',
        file: `.github/workflows/${file}`,
        message: `Maintainer job ${name} must be guarded to the Baton source repository`,
        fix: "Set if: github.repository == 'dermonaco-labs/baton' on the job",
      });
    }
  }
  return issues;
}
