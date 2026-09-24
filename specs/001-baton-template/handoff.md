---
baton: 1
lane: feature
feature: 001-baton-template
phase_completed: tasks
next_phase: analyze
next_owner: speckit-analyze
status: ready
model_role: review
suggested_model: claude-opus-5.5
summary: >-
  Baton is planned end to end. The documents are the constitution v1.0.0, a spec with 7 stories (P1: template,
  overlay, relay), research R1-R12 (pins, licenses, the ATV 2.6.3 corruption finding, vendoring hybrid D), the plan,
  the data model, 6 contracts, a quickstart, and 94 tasks in 10 phases with 23 pre-registered acceptance checks.
  The validator does not exist yet, so this baton is hand-authored and is checked by T047.
read_first:
  - { path: specs/001-baton-template/tasks.md, why: "the unit of work and the Acceptance Registry", sha256: da596aa3ddf9ebcc7d420a3733abc0b2567b21912757fd4cfd817279ca81568d }
  - { path: specs/001-baton-template/spec.md, why: "FR-001..FR-073 and SC-001..SC-008, which analyze checks coverage against", sha256: 76533db7b558e2dce0c1f4f48a0cc054837be0ba5bad80f2184e21fc2abfccbf }
  - { path: specs/001-baton-template/plan.md, why: "structure, key decisions 1-11, constitution check", sha256: 365c9538c8adf1d6c535c3aaaaca9169cf20de0838dfd6999dc0c2b3ff4942b0 }
  - { path: .specify/memory/constitution.md, why: "principles I-VIII; violations are CRITICAL in analyze", sha256: e719a2a71d93006fbbe3911b3e9eb7616acfccbd47d73c5e0de33724775694f3 }
  - { path: specs/001-baton-template/data-model.md, why: "baton, phase, config, pack, lock and manifest shapes", sha256: 7b6aabd2e0860bed29c4353f27df0c901c8933072147c4b62bb1915948381a81 }
  - { path: specs/001-baton-template/contracts/phase-contracts.md, why: "entry/exit check ids per phase (SC-003)", sha256: 36ee7425bf187e933f46be3c337524707bf03302e461eceadbbb52d9c2d90f2c }
  - { path: specs/001-baton-template/contracts/handoff-contract.md, why: "validator rules and error codes", sha256: 456d83df8d6b895b45cd15c8e2ab8cfd1a49542f56fffba0c776398d6cdbaac6 }
  - { path: specs/001-baton-template/contracts/packs.md, why: "core = 28 files (SC-002), exclusions, closure rules", sha256: 3790f88a639374af710df5989df58527e1ba39185f1fed1f9fcbfc751c800f3a }
  - { path: specs/001-baton-template/contracts/conflict-rules.md, why: "Spec Kit vs ATV rules C1-C13", sha256: e6c03ab3e57c731c68d67e9747499dca7eb5b95333838815978d26391130635f }
do_not_read:
  - { path: specs/001-baton-template/research.md, why: "already folded into plan.md; open it only to verify a pin or SHA" }
artifacts:
  - { path: .specify/memory/constitution.md, role: source-of-truth, sha256: e719a2a71d93006fbbe3911b3e9eb7616acfccbd47d73c5e0de33724775694f3 }
  - { path: specs/001-baton-template/spec.md, role: source-of-truth, sha256: 76533db7b558e2dce0c1f4f48a0cc054837be0ba5bad80f2184e21fc2abfccbf }
  - { path: specs/001-baton-template/research.md, role: evidence, sha256: ce5e0f176bbbe89d8b4272c7e5c323ecc11442b4321c45e5f38f57adaffe7d88 }
  - { path: specs/001-baton-template/plan.md, role: source-of-truth, sha256: 365c9538c8adf1d6c535c3aaaaca9169cf20de0838dfd6999dc0c2b3ff4942b0 }
  - { path: specs/001-baton-template/data-model.md, role: source-of-truth, sha256: 7b6aabd2e0860bed29c4353f27df0c901c8933072147c4b62bb1915948381a81 }
  - { path: specs/001-baton-template/contracts/handoff-contract.md, role: source-of-truth, sha256: 456d83df8d6b895b45cd15c8e2ab8cfd1a49542f56fffba0c776398d6cdbaac6 }
  - { path: specs/001-baton-template/contracts/phase-contracts.md, role: source-of-truth, sha256: 36ee7425bf187e933f46be3c337524707bf03302e461eceadbbb52d9c2d90f2c }
  - { path: specs/001-baton-template/contracts/conflict-rules.md, role: source-of-truth, sha256: e6c03ab3e57c731c68d67e9747499dca7eb5b95333838815978d26391130635f }
  - { path: specs/001-baton-template/contracts/packs.md, role: source-of-truth, sha256: 3790f88a639374af710df5989df58527e1ba39185f1fed1f9fcbfc751c800f3a }
  - { path: specs/001-baton-template/contracts/cli.md, role: source-of-truth, sha256: d46479e367811de2720f5deeba6b6c435de4a443d5a5565d571d1c54b71447f1 }
  - { path: specs/001-baton-template/contracts/ci.md, role: source-of-truth, sha256: 2525f92a59a883fae7d5ac5e67c11dd484e96bdc85bc60fede50acf361c53c6f }
  - { path: specs/001-baton-template/quickstart.md, role: derived, sha256: abab8398617a2fdea26de3fb3be8dfa644ffb167bd4dac7cf8e1658993876e90 }
  - { path: specs/001-baton-template/tasks.md, role: derived, sha256: da596aa3ddf9ebcc7d420a3733abc0b2567b21912757fd4cfd817279ca81568d }
  - { path: specs/001-baton-template/checklists/requirements.md, role: evidence, sha256: e0f5d794b21ba06eb09f2902b5f532a545a246582a44da1f2a10f825d26f0612 }
entry_checked:
  - { id: plan-exists, ok: true }
  - { id: no-blocking-questions, ok: true }
exit_criteria:
  - { id: "artifact-exists:tasks.md", met: true }
  - { id: tasks-reference-stories, met: true, evidence: "every task in phases 3-9 carries [US1]..[US7]; Setup, Foundational and Polish are unlabelled" }
  - { id: acceptance-registered, met: true, evidence: "tasks.md Acceptance Registry: AC-US1-1..AC-US7-3 (23 rows, every story covered)" }
acceptance_checks:
  - { id: AC-US1-1, story: US1, check: "node --test test/integration/adopt.test.mjs", kind: test-id, expect_initial: fail }
  - { id: AC-US1-2, story: US1, check: "quickstart S1 script exits 0", kind: command, expect_initial: fail }
  - { id: AC-US1-3, story: US1, check: "adopt.test 'cannot push -> run baton adopt'", kind: test-id, expect_initial: fail }
  - { id: AC-US2-1, story: US2, check: "node --test test/integration/init.test.mjs", kind: test-id, expect_initial: fail }
  - { id: AC-US2-2, story: US2, check: "init.test 'idempotent rerun'", kind: test-id, expect_initial: fail }
  - { id: AC-US2-3, story: US2, check: "init.test '--packs core,learning'", kind: test-id, expect_initial: fail }
  - { id: AC-US3-1, story: US3, check: "node --test test/unit/validate-handoff.test.mjs", kind: test-id, expect_initial: fail }
  - { id: AC-US3-2, story: US3, check: "relay.test 'gate pending exits 3'", kind: test-id, expect_initial: fail }
  - { id: AC-US3-3, story: US3, check: "relay.test 'stale artifact then refresh'", kind: test-id, expect_initial: fail }
  - { id: AC-US3-4, story: US3, check: "relay.test 'E_NO_PREREG before implement'", kind: test-id, expect_initial: fail }
  - { id: AC-US3-5, story: US3, check: "relay.test 'land requires pr.url and checks'", kind: test-id, expect_initial: fail }
  - { id: AC-US3-6, story: US3, check: "node .baton/bin/baton.mjs validate --path specs/001-baton-template/handoff.md", kind: command, expect_initial: fail }
  - { id: AC-US4-1, story: US4, check: "models.test 'role resolution + overrides'", kind: test-id, expect_initial: fail }
  - { id: AC-US4-2, story: US4, check: "models.test 'enforce error -> E_MODEL_NOT_ALLOWED'", kind: test-id, expect_initial: fail }
  - { id: AC-US4-3, story: US4, check: "models.test 'apply idempotent, managed only'", kind: test-id, expect_initial: fail }
  - { id: AC-US5-1, story: US5, check: "node .baton/bin/baton.mjs sync --check", kind: command, expect_initial: fail }
  - { id: AC-US5-2, story: US5, check: "node --test test/integration/update.test.mjs", kind: test-id, expect_initial: fail }
  - { id: AC-US5-3, story: US5, check: "upstream-watch workflow_dispatch updates one issue, no push", kind: manual, expect_initial: n/a }
  - { id: AC-US6-1, story: US6, check: "validate.test 'missing reference -> E_UNDOCUMENTED'", kind: test-id, expect_initial: fail }
  - { id: AC-US6-2, story: US6, check: "README renders hero, both quick starts, diagram, credits", kind: manual, expect_initial: n/a }
  - { id: AC-US7-1, story: US7, check: "PR checks green within SC-007 budget", kind: manual, expect_initial: n/a }
  - { id: AC-US7-2, story: US7, check: "broken-frontmatter commit yields E_FRONTMATTER_MALFORMED annotation", kind: manual, expect_initial: n/a }
  - { id: AC-US7-3, story: US7, check: "release dry_run produces assets + SHA256SUMS", kind: manual, expect_initial: n/a }
decisions:
  - { id: D1, decision: "Vendoring = hybrid D: lock + materialized snapshot + baton sync (real specify-cli 1.0.11; ATV templates read from the tarball at the pinned SHA, never executed)", rationale: "reproducible, offline for adopters, updatable, and CI-verifiable with sync --check (research R4)", by: planning-session }
  - { id: D2, decision: "Pin ATV to main@ad996736b879be87c7755df5c5017d5336203bbc instead of npm 2.6.3", rationale: "49/51 agent templates in 2.6.3 have no newlines (broken frontmatter); fixed in f0a86ef but unreleased (research R3)", by: planning-session }
  - { id: D3, decision: "Integrate through a Spec Kit extension with mandatory before_/after_ hooks, 3 wrapper skills and an append-only preset; never patch upstream files", rationale: "Principle I; upstream updates stay mechanical (research R5)", by: planning-session }
  - { id: D4, decision: "speckit-plan is the only planner; ce-plan, deepen-plan, docs/plans, lfg, slfg and ralph-loop are excluded; the quick lane is ce-work -> baton-review -> baton-land", rationale: "removes the duplicate and conflicting workflows (conflict-rules C1-C6)", by: planning-session }
  - { id: D5, decision: "Model routing by role in .baton/config.yml (planning/review claude-opus-5.5, implementation gpt-6-sol, fast claude-haiku-4.5), enforce defaults to warn, writing agent frontmatter is opt-in", rationale: "Principle VII; the defaults are dated suggestions", by: planning-session }
  - { id: D6, decision: "No GitHub Pages site and no npm publish in v0.1; distribute via the template, npx github:...#tag and release assets with SHA256SUMS and provenance", rationale: "cheap and verifiable (research R9, R11)", by: planning-session }
  - { id: D7, decision: "Scope gate (specify; clarify skipped because there are 0 NEEDS CLARIFICATION markers): the owner approved the planning outline in plan mode before the artifacts were written", rationale: "recorded honestly; the owner re-confirms scope at the analyze gate", by: "human:owner" }
open_questions: []
assumptions:
  - { id: AS1, text: "The spec assumptions A1-A9 hold (see spec.md § Assumptions)", revisit_at: analyze }
  - { id: AS2, text: "The model ids in D5 are available to adopters as of 2026-09; they are config, not code", revisit_at: implement }
  - { id: AS3, text: "ATV main@ad99673 stays reachable by SHA; sync fails loudly if it doesn't", revisit_at: implement }
  - { id: AS4, text: "Custom-agent `model:` frontmatter is supported where it matters (verified by T064, stop-and-ask otherwise)", revisit_at: implement }
risks:
  - { id: RK1, text: "Spec Kit extension hooks are prompt-driven (the agent must obey EXECUTE_COMMAND); an agent can skip them. Mitigation: validate in CI plus baton-land's pre-push check catches missing or stale batons", severity: high }
  - { id: RK2, text: "ATV is pinned to an unreleased commit. Mitigation: provenance in the lock, upstream-watch, T074 asks upstream for a release", severity: medium }
  - { id: RK3, text: "Spec Kit release churn (5 releases in 10 days). Mitigation: sync --check plus the weekly watch; bump deliberately", severity: medium }
  - { id: RK4, text: "Windows adopters without bash cannot run the sh scripts. Mitigation: init --script ps|py (requires uv) and a doctor warning", severity: low }
gate: { required: false, approved_by: null, approved_at: null }
history:
  - { phase: specify, at: 2026-09-24T12:00:00Z, by: planning-session, commit: null }
  - { phase: plan, at: 2026-09-24T12:00:00Z, by: planning-session, commit: null }
  - { phase: tasks, at: 2026-09-24T12:00:00Z, by: planning-session, commit: null }
updated_at: 2026-09-24T12:00:00Z
updated_by: planning-session
---
## Goal

Build Baton v0.1.0, a public GitHub template and overlay that combines Spec Kit 1.0.11 and ATV (pinned) with
validated, file-based handoffs between phases, configurable model routing, a curated core of 28 skills and agents,
optional packs, cheap CI and a public manual.

## What changed

The planning set is complete in `specs/001-baton-template/` plus `.specify/memory/constitution.md`. No
implementation code exists yet. `.gitattributes` (LF) was added early so that the sha256 values in this baton are
stable across operating systems.

## Next steps

1. `/speckit-analyze` (model role: review → claude-opus-5.5). Check FR/SC ↔ task coverage, the constitution check,
   and the terminology consistency of the contracts.
2. The owner reviews the analyze report, then approves the pre-code gate (after T047 exists:
   `baton handoff approve --by <handle>`; until then, record the approval in this baton by hand).
3. `/speckit-implement` in a new session (model role: implementation → gpt-6-sol, reasoning high). Start at T001.
   The MVP is phases 1–4 (T001–T054).

## Watch out for

- Never hand-edit upstream files. They come only from `baton sync` (T025/T028). Repairs are declared in `packs/repairs.yml`.
- Use `registry.npmjs.org` only. A developer machine may have a private npm registry configured, and it must never
  leak into `package-lock.json` or `.npmrc`.
- ATV is pinned to main, not npm 2.6.3. Don't "downgrade" to the published package.
- `ce-review` graceful degradation and the `extensions.yml` format are unverified. T029 verifies them, and says to
  stop and ask if they fail.
- Opening the ATV upstream issue (T074) is an owner action. Agents only draft it.
- Nothing from any private reference project may enter this repo. Only the generalized lessons in research R8.
- Until T047, this baton is not machine-validated. If you edit any listed artifact, update its sha256 here.
