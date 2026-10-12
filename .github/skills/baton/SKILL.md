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
For a pre-Baton feature already at implement, explicitly use
`handoff init --feature F --infer --phase implement --reason R --from-json file`
with registered acceptance checks, then obtain fresh role approval before
receive. Review covers the full main → feature delivery using the merge-base
with `origin/HEAD` (missing base fails closed). `x-imported-head` marks the
imported baseline for context only, not prior review approval. Imported work
is not a completed Baton phase; never relabel or re-receipt settled history.
See the handoff recovery guide.
Receive and scope verify the full imported commit is an ancestor of HEAD and
recompute its merge-base with `origin/HEAD`; unverifiable Git state fails
`E_CHECK_FAILED`. Offline validation rejects any attached diff-base shadowing.
Initial approval requires `approve`-recorded `attach-approved` evidence bound
to source hashes/imported HEAD and a matching human actor/date; refresh clears
it for reapproval. Never hand-set gate fields or invent phase-`none` receipts.
These plaintext, declarative guards are not cryptographic attestations;
authenticity relies on git history and PR review.

For a new user-facing behavior or public contract, start the feature lane
at `/speckit-specify` (optionally `/ce-brainstorm` first). For a small
change without new behavior or contract, run
`handoff new --quick <slug> --reason "<why>"`; this records a tagged
`quick-eligible` decision and pins the review diff base. Each checkout keeps its
random writer token under gitignored `.baton/.local/`; never copy it to
another checkout. Run `handoff receive --phase work --quick <slug>` and refuse `/ce-work`
unless `decision:quick-eligible` and `no-feature-tasks` pass. After
`/ce-work`, run `handoff write --phase work --quick <slug>` with
judgement fields and local-check evidence. **Never invoke `/ce-work`
for a feature with `specs/<feature>/tasks.md`.** Use
`/speckit-implement` and `/speckit-converge` there. Quick review
and landing use `/baton-review` and `/baton-land`, each with
`--quick <slug>`; after a human approves the PR-review gate, the
compound step receives/writes with `--phase compound --quick <slug>`.
After implement/work write, end this session and start a fresh review
session in another checkout. A same-checkout review/land returns
`E_SELF_REVIEW` (exit 3); only an owner answer to a blocking question
requested with `handoff question --tag self-review-override --reason R`
can override it.

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
