---
name: speckit-baton-receive
description: Validate and receive the incoming baton before a Spec Kit phase.
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: baton
  source: extension:baton
---

# Baton Receive Skill

# Receive the baton

This is a mandatory `before_*` hook. Infer the phase only from the invoking
Spec Kit command (`before_converge` maps to `implement --mode converge`).
For a standalone invocation require an explicit `--phase`; never guess from
the working tree. Do not repeat or replace the parent command's instructions.

From the repository root run
`node .baton/bin/baton.mjs handoff receive --phase <phase>` (add
`--mode converge` for converge). For first-time specify, there may be no
feature baton yet; use only the CLI's first-phase result and do not create a
feature directory here. A quick-lane escalation uses its recorded quick
baton as input to specify (`handoff write --phase specify --from-quick
.baton/quick/<slug>.md`); Spec Kit owns feature numbering.

If receive exits **3**, stop the parent phase: show the pending gate or
blocking question and the CLI's approval/answer instruction. For any other
nonzero exit, stop and report the error; do not silently skip the hook.

On success load **exactly** the returned `read_first` paths, in order. Honor
`do_not_read` by not loading those paths. Do not expand the list to entire
directories or reopen excluded prose. Then return control to the parent
command.
