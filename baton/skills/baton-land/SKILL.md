---
name: baton-land
description: Validate the baton and local checks, then let land open a PR without merging it.
---

# Baton land

Run `node .baton/bin/baton.mjs handoff receive --phase land`
(add `--quick <slug>` for a quick baton);
stop on a blocking finding, stale baton, unmet gate or other error.
`E_SELF_REVIEW` (exit 3) means the implement/work writer is attempting
to land from that checkout; use a separate checkout or an owner-answered
`self-review-override` question.
Run every `.baton/config.yml` `checks[*].run` **and**
`node .baton/bin/baton.mjs validate` locally before any push. Record
command and exit-code evidence. Never push on a failed check.

Before invoking `/land`, choose an explicit session-artifact path outside
the repository and pass it with the received context. Override its
**Step 9: Capture session state** destination: write the mandatory note
outside the repository, not in `docs/sessions/`, `.sessions/`,
`docs/handoffs/` or other repo working notes. This Baton-owned instruction
takes precedence over the upstream destination; do not edit vendored ATV.
If the external destination cannot be written, stop instead of falling back
to a repo note. A requested tracked note must be completed before review,
commit and push; adding or changing subject files after review requires
returning to review, not bypassing `E_STALE_REVIEW`.

With a clean result, invoke `/land` with that destination and context and
open a PR. Do not install or invoke Spec Kit's `git` extension, and
**never merge**: PR review is a human gate. Record `pr.url` and `pr.number`
in the land baton with `handoff write --phase land --from-json <file>`
(add `--quick <slug>` for a quick baton).

Publish the land receipt: explicitly stage only its Baton bookkeeping
changes, commit and push them to the same PR branch. Do not add subject
changes or force-stage ignored review reports after the review proof is
written. Do not treat `/land`'s earlier clean check as the final check.
Final verification, after session capture and receipt publication:
`git status --porcelain` must be empty (including untracked files),
the branch must have a reachable remote tracking ref, and its local HEAD
must equal that ref with no unpushed commits. Verify the actual remote
branch head too; a stale tracking ref is not publication evidence.
If any check fails, repair only bookkeeping/publication or return to
review for changed subjects. Do not announce completion or emit a
successful landing banner while these checks fail.

Run `handoff next`, show the
PR review gate and suggest `/ce-compound` to capture lessons in
`docs/solutions/` after a human approves by role and optional channel
(`handoff approve --by "<role>" [--via "<channel>"]`). A skip must
be a decision tagged `skip-compound` with a non-empty rationale.
Never write a personal name, handle or email as an approver or actor.
