---
name: baton-land
description: Validate the baton and local checks, then let land open a PR without merging it.
---

# Baton land

Run `node .baton/bin/baton.mjs handoff receive --phase land`
(add `--quick <slug>` for a quick baton);
stop on a blocking finding, stale baton, unmet gate or other error.
Run every `.baton/config.yml` `checks[*].run` **and**
`node .baton/bin/baton.mjs validate` locally before any push. Record
command and exit-code evidence. Never push on a failed check.

With a clean result, invoke `/land` with the received context and
open a PR. Do not install or invoke Spec Kit's `git` extension, and
**never merge**: PR review is a human gate. Record `pr.url` and `pr.number`
in the land baton with `handoff write --phase land --from-json <file>`
(add `--quick <slug>` for a quick baton). Run `handoff next`, show the
PR review gate and suggest `/ce-compound` to capture lessons in
`docs/solutions/` after a human approves by role and optional channel
(`handoff approve --by "<role>" [--via "<channel>"]`). A skip must
be a decision tagged `skip-compound` with a non-empty rationale.
Never write a personal name, handle or email as an approver or actor.
