<!-- BATON:START -->
# Baton relay

Precedence: `.specify/memory/constitution.md` > current baton > feature
artifacts (`spec.md` > `plan.md` > `tasks.md`) > this section > upstream
skills. Record any override as a baton decision. Read the baton at
`specs/<feature>/handoff.md` or `.baton/quick/<slug>.md`; run
`node .baton/bin/baton.mjs status` and `handoff next` to find the next step.
Stop for an unmet human gate. When scope, behavior, security, data or
public contracts are ambiguous, record a blocking question, set
`needs-human`, and stop rather than choosing.

- C1: Feature files go only in `specs/NNN-slug/`; brainstorms in
  `docs/brainstorms/`, solutions in `docs/solutions/`, quick batons in
  `.baton/quick/`. Never create `docs/plans/`.
- C2: Use `/speckit-plan` exclusively for planning. During Phase 0
  consult `repo-research-analyst` and `learnings-researcher`.
- C3: Features with `tasks.md` use `/speckit-implement` and
  `/speckit-converge`; `/ce-work` is quick-lane `work` only. Use
  `handoff new --quick <slug> --reason "<why>"` and receive/write `work`
  around it; escalate if behavior or a public contract changes.
- C4: Before coding use `/speckit-analyze`; for code review use
  `/baton-review` → `/ce-review mode:headless`, grounded in spec/plan/tasks.
  `/speckit-checklist` checks requirements; `document-review` is advisory.
- C5: `/baton-land` delegates to `/land`. Never use the Spec Kit `git`
  extension or merge a PR automatically.
- C6: Do not bypass the scope, pre-code or PR-review human gates;
  `lfg`, `slfg` and `ralph-loop` are excluded.
- C7: Baton owns only the BATON marker section; Spec Kit owns the
  SPECKIT marker section; all other instructions belong to the adopter.
- C8: Spec Kit hooks belong in `.specify/extensions.yml` and remain
  mandatory; Copilot lifecycle hooks come only from declared packs.
- C9: Setup steps belong only in
  `.github/workflows/copilot-setup-steps.yml`.
- C10: `/ce-compound` writes `docs/solutions/`; `learnings-researcher`
  reads it. Opt-in learned skills need human review before commit.
- C11: Invoke skills as `/speckit-<cmd>`, extension hooks as
  `/speckit-baton-receive` and `/speckit-baton-handoff`, and wrappers
  as `/baton`, `/baton-review` and `/baton-land`.
- C12: Model names in upstream prompts are advisory; route using
  `.baton/config.yml` roles and `handoff next`.
- C13: Do not install excluded upstream content (unlicensed
  `karpathy-guidelines`, gstack, agent-browser, duplicate planner or
  autonomy skills, ATV setup/update/doctor, takeoff or unrelated media
  tools). `brainstorming` joins core only if closure requires it.

Run the local checks in `.baton/config.yml` and `baton validate` before
shipping. Record human actions by configured role only:
`approve --by "<role>" [--via "<channel>"]`; do not persist names,
handles or emails. Never put feature-specific context into this section.
<!-- BATON:END -->
