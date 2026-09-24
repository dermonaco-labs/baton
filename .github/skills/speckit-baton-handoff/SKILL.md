---
name: speckit-baton-handoff
description: Persist the phase result and validate the outgoing baton.
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: baton
  source: extension:baton
---

# Baton Handoff Skill

# Hand off the baton

This is a mandatory `after_*` hook. Take `<phase>` from the invoking parent
command (`after_converge` maps to `implement`); standalone calls must supply
`--phase`. Do not redo the parent phase.

For `analyze`, first write the **complete, unchanged** read-only
`speckit-analyze` chat report to a local staging file under
`.baton/.tmp/`, then pass `--analysis-from <file>`; the CLI copies it to
`specs/<feature>/analysis.md`. Delete the staging file afterwards.
Never invent an analysis result or omit its critical/high counts. If the
report cannot be supplied, stop.

Supply the CLI's judgement fields as JSON using
`node .baton/bin/baton.mjs handoff write --phase <phase> --from-json <file>`
(and `--analysis-from <file>` for analyze). Include a brief `summary`,
ordered `read_first` paths with reasons for the next phase, any
`do_not_read`, decisions with rationale, assumptions, risks, blocking
questions with options and owners, and evidence for exit checks. The CLI
computes the owner, hashes, model role, times, gate and commit. For
`specify --next plan` require zero clarification markers; for branching
use `--next <phase>` only when justified. For a first specify coming from
brainstorm, supply `--from-brainstorm docs/brainstorms/<file>.md`.
When specifying after a quick-lane escalation, pass
`--from-quick .baton/quick/<slug>.md`. Record an actor only by an agent
id or `human:<role-slug>` and a human approval only as a configured
role and optional channel; never persist names, handles or emails.

Do not choose a scope, behaviour, security, data or public-contract answer
on behalf of a human. Record it as a blocking question, set
`status: needs-human`, write the baton, print the question and stop. If an
exit check fails, preserve the failed evidence and stop rather than
pretending the phase passed. After a successful write, run
`node .baton/bin/baton.mjs handoff next` and print its exact next command
and suggested model. Never bypass a gate or merge a PR.
