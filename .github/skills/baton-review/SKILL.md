---
name: baton-review
description: Review feature or quick-lane changes through headless ce-review and write validated Baton findings.
---

# Baton review

Run `node .baton/bin/baton.mjs handoff receive --phase review` first
(add `--quick <slug>` for a quick baton);
stop on any failure, especially pending gates, staleness or a missing
diff. Review intent is the feature's `spec.md` FR/SC, `plan.md`
structure/contracts and `tasks.md` (for a quick baton, its recorded
intent), not the PR description alone. Load only `read_first`, honor
`do_not_read`, and inspect the changed files.

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
only with a written reason. In the quick lane there are no tasks:
every finding must be `fixed` or `dismissed` with a reason before
landing. Record a decision tagged `quick-scope-held` with a reason
only after checking the diff adds no user-facing behavior or public
contract; otherwise escalate. P0/P1 `open` findings block landing. Record the JSON path and
exact blocking count in the outgoing review baton through
`handoff write --phase review --from-json <file>` (add
`--quick <slug>` for the quick lane). Return to feature `implement`
or quick `work` while blockers remain; never silently drop them.
If quick-lane review reveals new user-facing behavior or a new public
contract, report `E_LANE_ESCALATE`, call
`handoff escalate --quick <slug> --reason "<reason>"` and hand off
to `/speckit-specify` (Spec Kit owns feature numbering).
