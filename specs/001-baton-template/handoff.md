---
baton: 1
lane: feature
feature: 001-baton-template
phase_completed: analyze
next_phase: implement
next_owner: speckit-implement
status: ready
model_role: implementation
suggested_model: gpt-6-sol
summary: >-
  Analyze found 1 CRITICAL, 7 HIGH, 6 MEDIUM and 10 LOW findings; all are fixed in the planning docs (analysis.md).
  Key fixes: hash-locked Spec Kit install plus a verified ATV git fetch, cleanup that never touches workflows plus an
  adopter baton.yml, a template disposition table, persisted analysis.md, checkbox-insensitive tasks.md hashing, and
  headless ce-review normalized to review.json. Now 99 tasks (T095-T099 added), 26 acceptance checks, constitution
  1.0.1. The pre-code gate awaits approval.
read_first:
  - { path: specs/001-baton-template/tasks.md, why: "the unit of work, in order, and the Acceptance Registry", sha256: a675a9ae3a57d5606eb797a749e634bbc1e1b88764d90afa14936116ae0e9193 }
  - { path: specs/001-baton-template/plan.md, why: "structure, template disposition, key decisions, constitution check", sha256: 95830548f6b64ae98f68bafc603f33a7565afb1ed36bb980a50fcc496f0cf7c6 }
  - { path: specs/001-baton-template/analysis.md, why: "what the analyze pass changed and the FR/SC to task map", sha256: 61c3e7971d24e2a75b62b11b2587fe4104f25e0402cb3aa53e4ddce809bc44fd }
  - { path: specs/001-baton-template/data-model.md, why: "baton, phase, config, pack, lock, manifest and findings shapes", sha256: 4208c1243306daefc059f1400f123b3333297ff4bb5633ff8fcfa8e65d38af10 }
  - { path: specs/001-baton-template/contracts/handoff-contract.md, why: "validator rules and stable error codes", sha256: e3ef672b7d367cf2895906c9c681d21b0e22b505041974dd8b559051a00ea26d }
  - { path: specs/001-baton-template/contracts/phase-contracts.md, why: "phase table, check ids, transition rules", sha256: c82914b3ef40d442bc37673eed6ef2425c2a96f6706c7f7e5fe4064aeba159d4 }
  - { path: specs/001-baton-template/contracts/cli.md, why: "commands, flags and exit codes (normative)", sha256: 83c28799d83bbc48258b090692f0ce4273ff3b04a6feffe883a3a64641a165b5 }
  - { path: specs/001-baton-template/contracts/packs.md, why: "core file list, pack storage, closure rules", sha256: 0f9cd30ff67be03c43a8d974e4b87fc61302ebc8e786f6bafc192bce393ff2f6 }
  - { path: specs/001-baton-template/contracts/conflict-rules.md, why: "Spec Kit vs ATV rules C1-C13 (T045)", sha256: 2468e82ca33bd1a19530cc9b177bbc23f64dfec3a1b2b094a7aeecb3f0cafd4a }
  - { path: specs/001-baton-template/contracts/ci.md, why: "workflows, smoke steps, budgets, release", sha256: af7ae56e257b3370985701b612500c8a704f771fdb293bd373249eb216c55c14 }
  - { path: specs/001-baton-template/quickstart.md, why: "the executable acceptance scenarios S1-S7", sha256: c0243ef0f42200c32285afc106c044609a49a9a31a15518a3497c093a87ed1f1 }
  - { path: .specify/memory/constitution.md, why: "principles I-VIII (v1.0.1); stop, don't choose", sha256: 2483435fa0d2f24999d9c4351b6c1b286a41bfce344c1eef5b84f269a7299391 }
do_not_read:
  - { path: specs/001-baton-template/research.md, why: "folded into plan.md; open it only to verify a pin, SHA or upstream fact" }
  - { path: specs/001-baton-template/spec.md, why: "prose beyond FR/SC is not needed; analysis.md maps every FR/SC to tasks; open it to check wording" }
artifacts:
  - { path: .specify/memory/constitution.md, role: source-of-truth, sha256: 2483435fa0d2f24999d9c4351b6c1b286a41bfce344c1eef5b84f269a7299391 }
  - { path: specs/001-baton-template/spec.md, role: source-of-truth, sha256: fd5eaac786f81e54e60b136225eb56962b54f7486c65ba6673cc020ffafbca68 }
  - { path: specs/001-baton-template/research.md, role: evidence, sha256: edc20bbae358ab515baed4cdff5328565abbff768a33602f3c912a6d161229c5 }
  - { path: specs/001-baton-template/plan.md, role: source-of-truth, sha256: 95830548f6b64ae98f68bafc603f33a7565afb1ed36bb980a50fcc496f0cf7c6 }
  - { path: specs/001-baton-template/data-model.md, role: source-of-truth, sha256: 4208c1243306daefc059f1400f123b3333297ff4bb5633ff8fcfa8e65d38af10 }
  - { path: specs/001-baton-template/contracts/handoff-contract.md, role: source-of-truth, sha256: e3ef672b7d367cf2895906c9c681d21b0e22b505041974dd8b559051a00ea26d }
  - { path: specs/001-baton-template/contracts/phase-contracts.md, role: source-of-truth, sha256: c82914b3ef40d442bc37673eed6ef2425c2a96f6706c7f7e5fe4064aeba159d4 }
  - { path: specs/001-baton-template/contracts/conflict-rules.md, role: source-of-truth, sha256: 2468e82ca33bd1a19530cc9b177bbc23f64dfec3a1b2b094a7aeecb3f0cafd4a }
  - { path: specs/001-baton-template/contracts/packs.md, role: source-of-truth, sha256: 0f9cd30ff67be03c43a8d974e4b87fc61302ebc8e786f6bafc192bce393ff2f6 }
  - { path: specs/001-baton-template/contracts/cli.md, role: source-of-truth, sha256: 83c28799d83bbc48258b090692f0ce4273ff3b04a6feffe883a3a64641a165b5 }
  - { path: specs/001-baton-template/contracts/ci.md, role: source-of-truth, sha256: af7ae56e257b3370985701b612500c8a704f771fdb293bd373249eb216c55c14 }
  - { path: specs/001-baton-template/quickstart.md, role: derived, sha256: c0243ef0f42200c32285afc106c044609a49a9a31a15518a3497c093a87ed1f1 }
  - { path: specs/001-baton-template/tasks.md, role: derived, sha256: a675a9ae3a57d5606eb797a749e634bbc1e1b88764d90afa14936116ae0e9193 }
  - { path: specs/001-baton-template/analysis.md, role: evidence, sha256: 61c3e7971d24e2a75b62b11b2587fe4104f25e0402cb3aa53e4ddce809bc44fd }
  - { path: specs/001-baton-template/checklists/requirements.md, role: evidence, sha256: 893d152f9bb358301756d5485d7b34cc767e4466a933f9417eaced35c3eea017 }
entry_checked:
  - { id: tasks-exists, ok: true }
  - { id: "fresh:spec,plan,tasks", ok: true, evidence: "analyzed at 23b1a1d; the artifacts were then amended by this pass and re-hashed here" }
exit_criteria:
  - { id: analysis-recorded, met: true, evidence: "specs/001-baton-template/analysis.md" }
  - { id: no-critical-findings, met: true, evidence: "CRITICAL 0 and HIGH 0 remaining (C1 and H1-H7 fixed; see analysis.md Findings)" }
analysis: { report_path: specs/001-baton-template/analysis.md, critical: 0, high: 0 }
acceptance_checks:
  - { id: AC-US1-1, story: US1, check: "node --test test/integration/adopt.test.mjs", kind: test-id, expect_initial: fail }
  - { id: AC-US1-2, story: US1, check: "quickstart S1 script exits 0", kind: command, expect_initial: fail }
  - { id: AC-US1-3, story: US1, check: "adopt.test 'cannot push -> run baton adopt'", kind: test-id, expect_initial: fail }
  - { id: AC-US1-4, story: US1, check: "timed newcomer walkthrough <= 10 min (SC-001)", kind: manual, expect_initial: n/a }
  - { id: AC-US1-5, story: US1, check: "adopt.test 'baton.yml installed, workflows untouched, constitution replaced'", kind: test-id, expect_initial: fail }
  - { id: AC-US2-1, story: US2, check: "node --test test/integration/init.test.mjs", kind: test-id, expect_initial: fail }
  - { id: AC-US2-2, story: US2, check: "init.test 'idempotent rerun'", kind: test-id, expect_initial: fail }
  - { id: AC-US2-3, story: US2, check: "init.test '--packs core,learning'", kind: test-id, expect_initial: fail }
  - { id: AC-US3-1, story: US3, check: "node --test test/unit/validate-handoff.test.mjs", kind: test-id, expect_initial: fail }
  - { id: AC-US3-2, story: US3, check: "relay.test 'gate pending exits 3'", kind: test-id, expect_initial: fail }
  - { id: AC-US3-3, story: US3, check: "relay.test 'stale artifact then refresh'", kind: test-id, expect_initial: fail }
  - { id: AC-US3-4, story: US3, check: "relay.test 'E_NO_PREREG before implement'", kind: test-id, expect_initial: fail }
  - { id: AC-US3-5, story: US3, check: "relay.test 'land requires pr.url and checks'", kind: test-id, expect_initial: fail }
  - { id: AC-US3-6, story: US3, check: "node .baton/bin/baton.mjs validate --path specs/001-baton-template/handoff.md", kind: command, expect_initial: fail }
  - { id: AC-US3-7, story: US3, check: "relay.test 'checked task stays fresh, reworded task is stale'", kind: test-id, expect_initial: fail }
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
  - { id: D1, decision: "Vendoring = hybrid D: lock + materialized snapshot + baton sync (specify-cli 1.0.11 from hash-locked requirements; ATV templates from a git fetch at the pinned commit with commit and tree ids verified, never executed)", rationale: "reproducible, offline for adopters, updatable, CI-verifiable with sync --check, and every download verified (research R4, analyze C1)", by: planning-session }
  - { id: D2, decision: "Pin ATV to main@ad996736b879be87c7755df5c5017d5336203bbc instead of npm 2.6.3", rationale: "49/51 agent templates in 2.6.3 have no newlines (broken frontmatter); fixed in f0a86ef but unreleased (research R3)", by: planning-session }
  - { id: D3, decision: "Integrate through a Spec Kit extension with mandatory before_/after_ hooks, 3 wrapper skills and an append-only preset; never patch upstream files", rationale: "Principle I; upstream updates stay mechanical (research R5)", by: planning-session }
  - { id: D4, decision: "speckit-plan is the only planner; ce-plan, deepen-plan, docs/plans, lfg, slfg and ralph-loop are excluded; the quick lane is ce-work -> baton-review -> baton-land", rationale: "removes the duplicate and conflicting workflows (conflict-rules C1-C6)", by: planning-session }
  - { id: D5, decision: "Model routing by role in .baton/config.yml (planning/review claude-opus-5.5, implementation gpt-6-sol, fast claude-haiku-4.5), enforce defaults to warn, writing agent frontmatter is opt-in", rationale: "Principle VII; the defaults are dated suggestions", by: planning-session }
  - { id: D6, decision: "No GitHub Pages site and no npm publish in v0.1; distribute via the template, npx github:...#tag and release assets with SHA256SUMS and provenance", rationale: "cheap and verifiable (research R9, R11)", by: planning-session }
  - { id: D7, decision: "Scope gate (specify; clarify skipped because there are 0 NEEDS CLARIFICATION markers): the owner approved the planning outline in plan mode before the artifacts were written", rationale: "recorded honestly; the owner re-confirms scope at the analyze gate", by: "human:owner" }
  - { id: D8, decision: "Template cleanup never touches .github/workflows/ (adopt --no-workflows); maintainer workflows are dormant behind a repository guard; every install ships an adopter baton.yml", rationale: "GITHUB_TOKEN cannot push workflow changes, and RK1 needs a server-side backstop (research R12, analyze H1-H3)", by: review-session }
  - { id: D9, decision: "Persist the read-only analyze report to analysis.md from the Baton hook, and hash tasks.md checkbox-insensitively", rationale: "the implement gate needs a file, and implement progress must not make the baton stale (research R13, analyze H5-H6)", by: review-session }
  - { id: D10, decision: "baton-review always runs ce-review mode:headless and normalizes the findings into a Baton-owned review.json (findings.schema.json)", rationale: "no load-bearing upstream-internal files or interactive todo-create side effects (research R13, analyze H7)", by: review-session }
  - { id: D11, decision: "Optional pack payloads live in packs/<id>/files/; derived repos add packs via the pinned npx command", rationale: "init --packs needs a payload, and derived repos drop packs/ (FR-053, analyze H4)", by: review-session }
open_questions: []
assumptions:
  - { id: AS1, text: "The spec assumptions A1-A9 hold (re-checked at analyze, unchanged)", revisit_at: review }
  - { id: AS2, text: "The model ids in D5 are available to adopters as of 2026-09; they are config, not code", revisit_at: implement }
  - { id: AS3, text: "ATV main@ad99673 stays reachable by SHA; sync and upstream-watch (sync --check) fail loudly if it doesn't", revisit_at: implement }
  - { id: AS4, text: "Custom-agent `model:` frontmatter is supported where it matters (verified by T064, stop-and-ask otherwise)", revisit_at: implement }
risks:
  - { id: RK1, text: "Spec Kit extension hooks are prompt-driven (the agent must obey EXECUTE_COMMAND); an agent can skip them. Mitigation: the adopter baton.yml workflow validates every PR, and baton-land's pre-push check catches missing or stale batons", severity: high }
  - { id: RK2, text: "ATV is pinned to an unreleased commit. Mitigation: provenance in the lock, upstream-watch, T074 drafts an upstream release request for the owner", severity: medium }
  - { id: RK3, text: "Spec Kit release churn (5 releases in 10 days). Mitigation: sync --check plus the weekly watch; bump deliberately", severity: medium }
  - { id: RK4, text: "Windows adopters without bash cannot run the sh scripts. Mitigation: init --script ps|py (requires uv) and a doctor warning", severity: low }
gate: { required: true, approved_by: "repository owner via control-plane delegation", approved_at: 2026-09-24T07:57:21Z }
history:
  - { phase: specify, at: 2026-09-24T07:39:15Z, by: planning-session, commit: 8aeed8a }
  - { phase: plan, at: 2026-09-24T07:39:15Z, by: planning-session, commit: 8aeed8a }
  - { phase: tasks, at: 2026-09-24T07:39:15Z, by: planning-session, commit: 8aeed8a }
  - { phase: analyze, at: 2026-09-24T07:53:35Z, by: review-session, commit: 23b1a1d }
updated_at: 2026-09-24T07:53:35Z
updated_by: review-session
---
## Goal

Build Baton v0.1.0, a public GitHub template and overlay that combines Spec Kit 1.0.11 and ATV (pinned) with
validated, file-based handoffs between phases, configurable model routing, a curated core of 28 skills and agents,
optional packs, cheap CI and a public manual.

## What changed

`/speckit-analyze` ran in the review role against commit `23b1a1d`. It found 1 CRITICAL, 7 HIGH, 6 MEDIUM and 10 LOW
findings. All of them are fixed in the planning docs, and the persisted report is `analysis.md`. The constitution is
now 1.0.1 (PATCH: gate wording and download verification). New requirements are FR-033 (adopter `baton.yml`) and
FR-053 (optional pack storage). New tasks T095–T099 sit in the phases where they belong; T001–T094 keep their IDs.
No implementation code exists yet.

## Next steps

1. The owner or orchestrator reviews `analysis.md` and approves the pre-code gate. Until T047 exists, record it in this
   baton by hand (`gate.approved_by`, `gate.approved_at`); afterwards use `baton handoff approve --by <handle>`.
2. `/speckit-implement` in a new session (model role: implementation → gpt-6-sol, reasoning high). Start at T001.
   The MVP is Setup + Foundational + US3 + US1: T001–T054 plus T095–T098 (T096 and T097 are Foundational, T098 is
   US3, T095 is US1).
3. After each checkpoint: `npm run check`, commit with the owner's trailer, and update this baton.

## Watch out for

- Never hand-edit upstream files. They come only from `baton sync` (T025/T028). Repairs are declared in `packs/repairs.yml`.
- `sync` must not use bare `uvx` or codeload tarballs: hash-locked requirements (T096) and a verified git fetch (T023).
- Template cleanup must never modify `.github/workflows/` (`GITHUB_TOKEN` can't push those changes).
- Use `registry.npmjs.org` only. A developer machine may have a private npm registry configured, and it must never
  leak into `package-lock.json` or `.npmrc`.
- ATV is pinned to main, not npm 2.6.3. Don't "downgrade" to the published package.
- `ce-review` persona degradation, its headless output shape and the `extensions.yml` format are re-checked at the
  pins by T029. Stop and ask if they fail.
- Opening the ATV upstream issue (T074) is an owner action. Agents only draft it.
- Nothing from any private reference project may enter this repo. Only the generalized lessons in research R8.
- Until T047, this baton is not machine-validated. If you edit any listed artifact, update its sha256 here.
