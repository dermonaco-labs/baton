---
name: baton-review
description: Review feature or quick-lane changes through headless ce-review and write validated Baton findings.
---

# Baton review

Run `node .baton/bin/baton.mjs handoff receive --phase review` first
(add `--quick <slug>` for a quick baton);
stop on any failure, especially pending gates, staleness or a missing
diff. `E_SELF_REVIEW` (exit 3) means the implement/work checkout is still
in use: end this session and start an independent review checkout, or
wait for an owner-answered `self-review-override` question. Quick batons
pin their diff base at `handoff new --quick`. Review intent is the feature's `spec.md` FR/SC, `plan.md`
structure/contracts and `tasks.md` (for a quick baton, its recorded
intent), not the PR description alone. Load only `read_first`, honor
`do_not_read`, and inspect the changed files.

Run `node .baton/bin/baton.mjs handoff scope --json` (add `--quick <slug>`
for a quick baton). It reports the reachable recorded `diff-base` and the
CLI subject set, not CE's full review set: the CLI excludes `.baton/`,
canonical feature handoffs and, in the feature lane, the current feature
directory. Unstaged untracked root/scratch/tmp files are also excluded.
Compute the pinned tracked diff set with `git diff --name-only <sha>`.
The CLI subject set must be a subset of that set; if an untracked subject
is missing, stage it deliberately and restart scope enumeration before
review. Do not silently drop a subject file.

Pass the CLI base as `base:<sha>` to `/ce-review mode:headless` and explicitly
require that exact base, without recomputing a merge-base. Its reported base
must equal the CLI base and its reviewed file set must equal the pinned
tracked diff set. This includes changed feature artifacts and bookkeeping;
do not require equality with the smaller CLI subject set. Preserve the
base, both file sets and the coverage comparison in the run evidence.
Re-enumerate after any headless auto-fix; if the base or either file set
changes, restart review rather than claiming coverage of the old scope.
Stop if the CLI cannot resolve the base or CE cannot prove this coverage;
never silently review against `origin/HEAD` or an unrelated merge-base.

Enumerate installed `.github/agents/*.agent.md` persona files; pass
**only that installed list** to `/ce-review mode:headless`, with an
explicit instruction that its Stage 3 selection and Stage 4 dispatch
must be restricted to the supplied installed list. Verify the selected
and dispatched persona names against that list; if ce-review cannot
honor this restriction, stop rather than invoking an absent persona
or fabricating its review. Never use interactive or autofix modes:
those may prompt or invoke `todo-create`. Collect the structured
findings and record a stable Baton-owned file, not an
upstream-internal format:

- Feature: `specs/<feature>/review.json`.
- Quick: `.baton/quick/<slug>.review.json`.

Normalize to `schema: 1`, source `{engine: ce-review, mode: headless,
run_artifact}`, merge-base `base`, `head`, installed `personas` and
`findings` (`id`, `severity` P0–P3, `title`, `file`, `line`,
`persona`, `confidence`, `task`, `disposition`, `reason`).
Preserve finding evidence in the review narrative, and do not fabricate
a result if the headless output is unavailable. Validate the JSON with
`node .baton/bin/baton.mjs validate --path <review.json>`.

In the feature lane, map each nondismissed finding to a task; dismiss
only with a written reason. In the quick lane there are no tasks, so
`task` is optional: every finding must be `fixed` or `dismissed` with
a reason before landing. Record a decision tagged `quick-scope-held`
with a reason only after checking the diff adds no user-facing
behavior or public contract; otherwise escalate. P0/P1 `open` findings
block landing. Pass a `--from-json` payload with
`review: { findings_path: "<review.json path>" }` to
`handoff write --phase review` (add `--quick <slug>` for the quick lane).
The CLI derives `blocking_findings` from that file and automatically routes
to feature `implement` or quick `work` while blockers remain; never
silently drop them.
If quick-lane review reveals new user-facing behavior or a new public
contract, report `E_LANE_ESCALATE`, call
`handoff escalate --quick <slug> --reason "<reason>"` and hand off
to `/speckit-specify` (Spec Kit owns feature numbering).
