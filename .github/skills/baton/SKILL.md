---
name: baton
description: Check the relay status, route a feature or start a gated quick-lane change.
---

# Baton

Run `node .baton/bin/baton.mjs status` and
`node .baton/bin/baton.mjs handoff next`. Show the current baton, its
status, entry conditions, pending questions and next command/model role.
Feature batons live in `specs/<feature>/handoff.md`; quick batons live in
`.baton/quick/<slug>.md`. Do not substitute chat context for a missing or
stale baton: use `handoff init --infer` or `handoff refresh --reason`
with evidence.

For a new user-facing behavior or public contract, start the feature lane
at `/speckit-specify` (optionally `/ce-brainstorm` first). For a small
change without new behavior or contract, run
`handoff new --quick <slug> --reason "<why>"`; this records a tagged
`quick-eligible` decision. Run
`handoff receive --phase work --quick <slug>` and refuse `/ce-work`
unless `decision:quick-eligible` and `no-feature-tasks` pass. After
`/ce-work`, run `handoff write --phase work --quick <slug>` with
judgement fields and local-check evidence. **Never invoke `/ce-work`
for a feature with `specs/<feature>/tasks.md`.** Use
`/speckit-implement` and `/speckit-converge` there. Quick review
and landing use `/baton-review` and `/baton-land`, each with
`--quick <slug>`; after a human approves the PR-review gate, the
compound step receives/writes with `--phase compound --quick <slug>`.

If the next phase reports exit 3, stop for human approval or an answer.
Show `handoff approve --by "<role>" [--via "<channel>"]` for a gate or
`handoff answer <id> "<choice>" --by "<role>"` for a blocking
question. Use only the role/channel vocabulary in `.baton/config.yml`;
never record a name, handle or email in the baton.
Do not approve on the user's behalf. For uncertainty affecting scope,
behavior, security, data or public contracts, record a blocking question,
write `status: needs-human`, and stop. If a quick change grows new
behavior or a contract, use
`handoff escalate --quick <slug> --reason "<reason>"`, then pass that
quick baton to `/speckit-specify`; the feature handoff uses
`--from-quick .baton/quick/<slug>.md`. Never make feature dirs yourself.
