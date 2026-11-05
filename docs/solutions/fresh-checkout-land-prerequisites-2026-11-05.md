---
title: Prepare a fresh checkout before an independent land
date: 2026-11-05
category: workflow-issues
module: baton relay (land, quick lane)
problem_type: workflow_issue
component: development_workflow
severity: medium
applies_when:
  - Landing a reviewed baton from a fresh, separate checkout or worktree
  - The checkout was created as a shallow clone
  - A run has a budget on how many full local checks it may run
  - Publishing a quick-lane land receipt
root_cause: incomplete_setup
resolution_type: workflow_improvement
tags: [land, shallow-clone, merge-base, local-checks, validate, land-receipt, check-budget]
---

## Context

Release `release-015` (v0.1.5) was landed from a fresh worktree, as required to avoid
`E_SELF_REVIEW`. The checkout had several gaps that only showed up mid-land:

- The worktree was a depth-1 shallow clone. `handoff receive --phase land` passed, but
  `git diff origin/main...HEAD` failed with `fatal: ... no merge base` while the PR body
  was being prepared. The review candidate `843884e` was not available locally.
- `node_modules` was absent, so `npm run check` could not run until dependencies were
  installed.
- The run had a budget of one full check. Both `handoff receive --phase land` and
  `handoff write --phase land` evaluate the `local-checks-pass` entry check, which runs
  the configured `npm run check` each time.
- `baton validate --quick <slug>` and `baton validate <path>` both fail with
  `E_USAGE` (exit 2).

## Guidance

Before receiving land in a fresh checkout:

```bash
git rev-parse --is-shallow-repository   # true => unshallow first
git fetch --unshallow origin            # local only; gives a real merge base with main
npm ci --ignore-scripts --no-audit --no-fund
```

`npm run lint:yaml` uses `uvx`. With no uv index configuration it resolves from public
PyPI. To pin that explicitly, set `UV_INDEX_URL` / `UV_DEFAULT_INDEX` in the process
environment only. Never commit feed URLs or machine paths.

Account for nested checks when budgeting: one land performs **two** full `npm run check`
runs, from receive and from write. Do not add a standalone run on top. Record both
results as the full-check evidence.

Scope validation with the supported flags only:

```bash
node .baton/bin/baton.mjs validate                       # global
node .baton/bin/baton.mjs validate --path .baton/quick/<slug>.md
node .baton/bin/baton.mjs validate --changed
```

Publish the land receipt as bookkeeping only. Keep the `--from-json` payload under
gitignored `.context/` and copy it to `.baton/quick/<slug>.land.json`, which
`.baton/template-cleanup.yml` already lists. Stage only that file and the baton, then
commit and push to the PR branch.

Run any linters before `git commit` as a separate step. If a lint step is chained with
`;` before the commit, its failure does not stop the commit. Also, `.baton/quick/*.md`
is outside `lint:md` scope, and the default quick-baton body trips MD022/MD032 when
linted directly. That is expected and does not mean the check failed.

## Why This Matters

A shallow clone can hide the merge base until after receive has passed. The PR diff
summary then fails, and the push may fail too if the remote lacks parents. Missing
dependencies make the mandatory nested check fail for setup reasons, not because the
code is wrong. Miscounting the nested checks either breaks the requester's budget or
tempts the agent to skip the CLI's mandatory `handoff write` check, which it cannot do.

## When to Apply

- Any `/baton-land` run in a newly created worktree or remote session
- Release-preparation lands whose requester limits how many full checks may run
- Writing PR bodies that need `git diff origin/<default>...HEAD`

## Examples

For release-015, the land went in this order:

1. `node .baton/bin/baton.mjs handoff receive --quick release-015 --phase land` → `handoff: OK`
   (nested `npm run check` exit 0)
2. `node .baton/bin/baton.mjs validate` → exit 0, advisory warnings only
3. `git fetch --unshallow origin`, then push and open PR #59
4. `node .baton/bin/baton.mjs handoff write --quick release-015 --phase land --from-json .context/release-015-land.json`
   → `handoff: OK` (second nested `npm run check` exit 0)
5. `validate --path .baton/quick/release-015.md` → exit 0. Commit and push the baton
   and `release-015.land.json`. The local head, tracking ref and `git ls-remote` head
   were all equal.

## Related

- `docs/solutions/quick-lane-scope-and-stranded-land-2026-09-29.md`: land from reviewed
  trees and quick-scope evidence
- `docs/solutions/per-checkout-identity-self-review-2026-09-29.md`: why land uses a
  separate checkout
