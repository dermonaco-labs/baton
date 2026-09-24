---
baton: 1
lane: feature
feature: 001-baton-template
phase_completed: analyze
next_phase: implement
next_owner: speckit-implement
status: needs-human
model_role: implementation
suggested_model: gpt-6-sol
summary: "Analyze fixed 1 CRITICAL, 7 HIGH, 6 MEDIUM and 10 LOW findings (analysis.md). Post-analyze amendments A1-A6 closed the gaps raised by implement: role-only approvals with a denylist scan (T100), any_of/all_of exit groups (T101), the quick lane (T102), per-pack closure incl. dispatched agents (A4), hyphenated approver words (A5) and reasoned optional_refs for names absent upstream or provided by packs (A6, T026). Now 102 tasks, 31 acceptance checks, constitution 1.0.1. The pre-code gate was approved by the repository owner via control-plane delegation."
read_first:
  - path: specs/001-baton-template/tasks.md
    why: the unit of work, in order, and the Acceptance Registry
    sha256: ec9ace17949ca01d9f9d0b93fec0ddea7c9e4c2b2f8aa0f34e1b5c84da1f7814
  - path: specs/001-baton-template/plan.md
    why: structure, template disposition, key decisions, constitution check
    sha256: 53338c389d7a2452bdd4cebbb98c3b0c79628b541ad3c9368058e309e4c31f86
  - path: specs/001-baton-template/analysis.md
    why: what the analyze pass changed and the FR/SC to task map
    sha256: d3394921d7f5b9898695d0c9a18f9c308f34d56872c5c64d0509320a63e99e1d
  - path: specs/001-baton-template/data-model.md
    why: baton, phase, config, pack, lock, manifest and findings shapes
    sha256: 533817b9fa44a312103a924eff7b26f1bc750335080db8c825fcec8f4bbb2a7b
  - path: specs/001-baton-template/contracts/handoff-contract.md
    why: validator rules and stable error codes
    sha256: 3b4b30985a64f882ab3ea02876a6a4442ebab50005be3f4575d5542e1955f9cc
  - path: specs/001-baton-template/contracts/phase-contracts.md
    why: phase table, check ids, transition rules
    sha256: 933326d0abfd56976c4f1c0b5dd426145bac651342bcb9d92f007e3fe54647be
  - path: specs/001-baton-template/contracts/cli.md
    why: commands, flags and exit codes (normative)
    sha256: 8041ef1180598b58f6c0ed0a3a3fd6482949d2fa02c1a7f45dac2dfefa82dff1
  - path: specs/001-baton-template/contracts/packs.md
    why: core file list, pack storage, closure rules
    sha256: cf5146b39aa667c530eca45e900f197b20c9074cdfc92d982fbba63e12440c20
  - path: specs/001-baton-template/contracts/conflict-rules.md
    why: Spec Kit vs ATV rules C1-C13 (T045)
    sha256: 2468e82ca33bd1a19530cc9b177bbc23f64dfec3a1b2b094a7aeecb3f0cafd4a
  - path: specs/001-baton-template/contracts/ci.md
    why: workflows, smoke steps, budgets, release
    sha256: af7ae56e257b3370985701b612500c8a704f771fdb293bd373249eb216c55c14
  - path: specs/001-baton-template/quickstart.md
    why: the executable acceptance scenarios S1-S7
    sha256: 1ce6f86f51c89e87f3b5645da5778c9faf07eda7b735e07be652323b3ca32926
  - path: .specify/memory/constitution.md
    why: principles I-VIII (v1.0.1); stop, don't choose
    sha256: 2483435fa0d2f24999d9c4351b6c1b286a41bfce344c1eef5b84f269a7299391
do_not_read:
  - path: specs/001-baton-template/research.md
    why: folded into plan.md; open it only to verify a pin, SHA or upstream fact
  - path: specs/001-baton-template/spec.md
    why: prose beyond FR/SC is not needed; analysis.md maps every FR/SC to tasks; open it to check wording
artifacts:
  - path: .specify/memory/constitution.md
    role: source-of-truth
    sha256: 2483435fa0d2f24999d9c4351b6c1b286a41bfce344c1eef5b84f269a7299391
  - path: specs/001-baton-template/spec.md
    role: source-of-truth
    sha256: c0f625c9d166b70568cc08594694e0f011105a4285edc1d5729538857a31fb6f
  - path: specs/001-baton-template/research.md
    role: evidence
    sha256: 89b0626c94f94dc1f9b7276f0bea4c719888436b5585d3c30af570a6c7f1dde4
  - path: specs/001-baton-template/plan.md
    role: source-of-truth
    sha256: 53338c389d7a2452bdd4cebbb98c3b0c79628b541ad3c9368058e309e4c31f86
  - path: specs/001-baton-template/data-model.md
    role: source-of-truth
    sha256: 533817b9fa44a312103a924eff7b26f1bc750335080db8c825fcec8f4bbb2a7b
  - path: specs/001-baton-template/contracts/handoff-contract.md
    role: source-of-truth
    sha256: 3b4b30985a64f882ab3ea02876a6a4442ebab50005be3f4575d5542e1955f9cc
  - path: specs/001-baton-template/contracts/phase-contracts.md
    role: source-of-truth
    sha256: 933326d0abfd56976c4f1c0b5dd426145bac651342bcb9d92f007e3fe54647be
  - path: specs/001-baton-template/contracts/conflict-rules.md
    role: source-of-truth
    sha256: 2468e82ca33bd1a19530cc9b177bbc23f64dfec3a1b2b094a7aeecb3f0cafd4a
  - path: specs/001-baton-template/contracts/packs.md
    role: source-of-truth
    sha256: cf5146b39aa667c530eca45e900f197b20c9074cdfc92d982fbba63e12440c20
  - path: specs/001-baton-template/contracts/cli.md
    role: source-of-truth
    sha256: 8041ef1180598b58f6c0ed0a3a3fd6482949d2fa02c1a7f45dac2dfefa82dff1
  - path: specs/001-baton-template/contracts/ci.md
    role: source-of-truth
    sha256: af7ae56e257b3370985701b612500c8a704f771fdb293bd373249eb216c55c14
  - path: specs/001-baton-template/quickstart.md
    role: derived
    sha256: 1ce6f86f51c89e87f3b5645da5778c9faf07eda7b735e07be652323b3ca32926
  - path: specs/001-baton-template/tasks.md
    role: derived
    sha256: ec9ace17949ca01d9f9d0b93fec0ddea7c9e4c2b2f8aa0f34e1b5c84da1f7814
  - path: specs/001-baton-template/analysis.md
    role: evidence
    sha256: d3394921d7f5b9898695d0c9a18f9c308f34d56872c5c64d0509320a63e99e1d
  - path: specs/001-baton-template/checklists/requirements.md
    role: evidence
    sha256: 893d152f9bb358301756d5485d7b34cc767e4466a933f9417eaced35c3eea017
entry_checked:
  - id: tasks-exists
    ok: true
  - id: fresh:spec,plan,tasks
    ok: true
    evidence: analyzed at 23b1a1d; the artifacts were then amended by the analyze fixes and amendments A1-A6 and re-hashed here
exit_criteria:
  - id: analysis-recorded
    met: true
    evidence: specs/001-baton-template/analysis.md
  - id: no-critical-findings
    met: true
    evidence: CRITICAL 0 and HIGH 0 remaining (C1 and H1-H7 fixed; see analysis.md Findings)
analysis:
  report_path: specs/001-baton-template/analysis.md
  critical: 0
  high: 0
acceptance_checks:
  - id: AC-US1-1
    story: US1
    check: node --test test/integration/adopt.test.mjs
    kind: test-id
    expect_initial: fail
  - id: AC-US1-2
    story: US1
    check: quickstart S1 script exits 0
    kind: command
    expect_initial: fail
  - id: AC-US1-3
    story: US1
    check: adopt.test 'cannot push -> run baton adopt'
    kind: test-id
    expect_initial: fail
  - id: AC-US1-4
    story: US1
    check: timed newcomer walkthrough <= 10 min (SC-001)
    kind: manual
    expect_initial: n/a
  - id: AC-US1-5
    story: US1
    check: adopt.test 'baton.yml installed, workflows untouched, constitution replaced'
    kind: test-id
    expect_initial: fail
  - id: AC-US2-1
    story: US2
    check: node --test test/integration/init.test.mjs
    kind: test-id
    expect_initial: fail
  - id: AC-US2-2
    story: US2
    check: init.test 'idempotent rerun'
    kind: test-id
    expect_initial: fail
  - id: AC-US2-3
    story: US2
    check: init.test '--packs core,learning'
    kind: test-id
    expect_initial: fail
  - id: AC-US2-4
    story: US2
    check: packs.test 'per-pack closure; docs-review without adversarial-document-reviewer -> E_DANGLING_REF'
    kind: test-id
    expect_initial: fail
  - id: AC-US2-5
    story: US2
    check: packs.test 'core closes with reasoned optional_refs; reason-less, unknown-pack or stale upstream-absent entry -> E_DANGLING_REF; @ in code is not a ref'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-1
    story: US3
    check: node --test test/unit/validate-handoff.test.mjs
    kind: test-id
    expect_initial: fail
  - id: AC-US3-2
    story: US3
    check: relay.test 'gate pending exits 3'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-3
    story: US3
    check: relay.test 'stale artifact then refresh'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-4
    story: US3
    check: relay.test 'E_NO_PREREG before implement'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-5
    story: US3
    check: relay.test 'land requires pr.url and checks'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-6
    story: US3
    check: node .baton/bin/baton.mjs validate --path specs/001-baton-template/handoff.md
    kind: command
    expect_initial: fail
  - id: AC-US3-7
    story: US3
    check: relay.test 'checked task stays fresh, reworded task is stale'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-8
    story: US3
    check: validate-handoff.test + relay.test 'role-only approver incl. control-plane delegation; handle/email/name, bad hyphens and upper case rejected; denylist'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-9
    story: US3
    check: "phases.test + relay.test 'any_of compound: solution or skip-compound; group errors'"
    kind: test-id
    expect_initial: fail
  - id: AC-US3-10
    story: US3
    check: relay.test 'quick relay new->work->review->land, escalate, feature->quick rejected'
    kind: test-id
    expect_initial: fail
  - id: AC-US4-1
    story: US4
    check: models.test 'role resolution + overrides'
    kind: test-id
    expect_initial: fail
  - id: AC-US4-2
    story: US4
    check: models.test 'enforce error -> E_MODEL_NOT_ALLOWED'
    kind: test-id
    expect_initial: fail
  - id: AC-US4-3
    story: US4
    check: models.test 'apply idempotent, managed only'
    kind: test-id
    expect_initial: fail
  - id: AC-US5-1
    story: US5
    check: node .baton/bin/baton.mjs sync --check
    kind: command
    expect_initial: fail
  - id: AC-US5-2
    story: US5
    check: node --test test/integration/update.test.mjs
    kind: test-id
    expect_initial: fail
  - id: AC-US5-3
    story: US5
    check: upstream-watch workflow_dispatch updates one issue, no push
    kind: manual
    expect_initial: n/a
  - id: AC-US6-1
    story: US6
    check: validate.test 'missing reference -> E_UNDOCUMENTED'
    kind: test-id
    expect_initial: fail
  - id: AC-US6-2
    story: US6
    check: README renders hero, both quick starts, diagram, credits
    kind: manual
    expect_initial: n/a
  - id: AC-US7-1
    story: US7
    check: PR checks green within SC-007 budget
    kind: manual
    expect_initial: n/a
  - id: AC-US7-2
    story: US7
    check: broken-frontmatter commit yields E_FRONTMATTER_MALFORMED annotation
    kind: manual
    expect_initial: n/a
  - id: AC-US7-3
    story: US7
    check: release dry_run produces assets + SHA256SUMS
    kind: manual
    expect_initial: n/a
decisions:
  - id: D1
    decision: "Vendoring = hybrid D: lock + materialized snapshot + baton sync (specify-cli 1.0.11 from hash-locked requirements; ATV templates from a git fetch at the pinned commit with commit and tree ids verified, never executed)"
    rationale: reproducible, offline for adopters, updatable, CI-verifiable with sync --check, and every download verified (research R4, analyze C1)
    by: planning-session
  - id: D2
    decision: Pin ATV to main@ad996736b879be87c7755df5c5017d5336203bbc instead of npm 2.6.3
    rationale: 49/51 agent templates in 2.6.3 have no newlines (broken frontmatter); fixed in f0a86ef but unreleased (research R3)
    by: planning-session
  - id: D3
    decision: Integrate through a Spec Kit extension with mandatory before_/after_ hooks, 3 wrapper skills and an append-only preset; never patch upstream files
    rationale: Principle I; upstream updates stay mechanical (research R5)
    by: planning-session
  - id: D4
    decision: speckit-plan is the only planner; ce-plan, deepen-plan, docs/plans, lfg, slfg and ralph-loop are excluded; the quick lane is ce-work -> baton-review -> baton-land
    rationale: removes the duplicate and conflicting workflows (conflict-rules C1-C6)
    by: planning-session
  - id: D5
    decision: Model routing by role in .baton/config.yml (planning/review claude-opus-5.5, implementation gpt-6-sol, fast claude-haiku-4.5), enforce defaults to warn, writing agent frontmatter is opt-in
    rationale: Principle VII; the defaults are dated suggestions
    by: planning-session
  - id: D6
    decision: No GitHub Pages site and no npm publish in v0.1; distribute via the template, npx github:...#tag and release assets with SHA256SUMS and provenance
    rationale: cheap and verifiable (research R9, R11)
    by: planning-session
  - id: D7
    decision: "Scope gate (specify; clarify skipped because there are 0 NEEDS CLARIFICATION markers): the owner approved the planning outline in plan mode before the artifacts were written"
    rationale: recorded honestly; the owner re-confirms scope at the analyze gate
    by: human:repository-owner
  - id: D8
    decision: Template cleanup never touches .github/workflows/ (adopt --no-workflows); maintainer workflows are dormant behind a repository guard; every install ships an adopter baton.yml
    rationale: GITHUB_TOKEN cannot push workflow changes, and RK1 needs a server-side backstop (research R12, analyze H1-H3)
    by: review-session
  - id: D9
    decision: Persist the read-only analyze report to analysis.md from the Baton hook, and hash tasks.md checkbox-insensitively
    rationale: the implement gate needs a file, and implement progress must not make the baton stale (research R13, analyze H5-H6)
    by: review-session
  - id: D10
    decision: baton-review always runs ce-review mode:headless and normalizes the findings into a Baton-owned review.json (findings.schema.json)
    rationale: no load-bearing upstream-internal files or interactive todo-create side effects (research R13, analyze H7)
    by: review-session
  - id: D11
    decision: Optional pack payloads live in packs/<id>/files/; derived repos add packs via the pinned npx command
    rationale: init --packs needs a payload, and derived repos drop packs/ (FR-053, analyze H4)
    by: review-session
  - id: D12
    tag: amendment-a1
    decision: "gate.approved_by is role-only: '<role>' or '<role> via <channel>' from config.gates, plus approved_at as an ISO date; human actors are 'human:<role-slug>'; E_DENYLIST scans batons for emails, at-mentions, user-home paths and untracked terms"
    rationale: public repo; no personal handles or emails in committed batons (data-model 1.1)
    by: human:repository-owner
  - id: D13
    tag: amendment-a2
    decision: Entry/exit lists accept check groups {id, all_of|any_of}; the top level is an implicit all_of; compound exit is the any_of group compound-recorded
    rationale: OR criteria need an exact, validated syntax (data-model 2.1)
    by: human:repository-owner
  - id: D14
    tag: amendment-a3
    decision: The quick lane is phases work -> review -> land -> compound with by_lane.quick overrides; it starts with handoff new --quick, escalates to specify only from work/review via --from-quick, and feature -> quick is illegal
    rationale: the owner and entry checks of the quick lane must be representable in phases.yml and the baton (phase-contracts Quick lane)
    by: human:repository-owner
  - id: D15
    tag: amendment-a4
    decision: adversarial-document-reviewer ships in the docs-review pack (not core); closure is checked per pack (the pack plus its requires) and covers dispatched agents
    rationale: document-review dispatches that agent; MIT upstream ATV content (packs.md Closure rules)
    by: human:repository-owner
  - id: D16
    tag: amendment-a5
    decision: Approver and actor words are [a-z]+(-[a-z]+)* (internal single hyphens); role and channel are 1-4 words separated by single spaces; human actors are human:[a-z]+(-[a-z]+)*; nothing else changes
    rationale: the A1 pattern rejected the prescribed channel control-plane delegation (data-model 1.1)
    by: human:repository-owner
  - id: D17
    tag: license-notice-exemption
    decision: Verbatim third-party license emails are exempt from email scanning only in THIRD_PARTY_NOTICES.md and vendored license files; all other privacy checks still apply
    rationale: copyright attribution and full license text are mandatory, while repository-owner data remains prohibited
    by: human:repository-owner
  - id: D18
    tag: amendment-a6
    decision: "Resolves implement Q1 (E_DANGLING_REF at the pin): upstream files and the pin stay unchanged and closure stays strict; every optional_refs entry needs reason upstream-absent (checked absent at the pin, listed in the T074 draft), pack-provided:<pack> (recommended pack, W_PACK_RECOMMENDED warning) or excluded:C<n> (settled exclusions); review-plus gains four ce-compound enhancement agents, design gains design-iterator; @ inside code is not a reference; core is unchanged"
    rationale: references must be classified, not silenced (packs.md Reference classification at the pin); D17 is recorded on the implementation branch
    by: human:repository-owner
  - id: D19
    decision: Artifact hashes refreshed after intentional edit
    rationale: Merge approved A6 and reconcile D17-D18 with updated planning artifacts
    by: implementation-session
  - id: D20
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record verified A6 pack closure and derived recommendation metadata
    by: implementation-session
  - id: D21
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record verified A6 upstream resource contradiction without choosing a policy
    by: implementation-session
open_questions:
  - id: Q2
    question: A6 classifies every-style-editor as upstream-absent, but verified ATV ad99673 contains .github/skills/every-style-editor/SKILL.md. Should the classification or definition of upstream-absent change, and how should the core and research references degrade?
    blocking: true
    owner: repository owner
    options:
      - Amend A6 to distinguish the installable scaffold from other files in the pinned tree
      - Assign every-style-editor to a named optional pack and update the reference reasons
      - Exclude every-style-editor with a cited conflict-rule decision
assumptions:
  - id: AS1
    text: The spec assumptions A1-A9 hold (re-checked at analyze, unchanged)
    revisit_at: review
  - id: AS2
    text: The model ids in D5 are available to adopters as of 2026-09; they are config, not code
    revisit_at: implement
  - id: AS3
    text: ATV main@ad99673 stays reachable by SHA; sync and upstream-watch (sync --check) fail loudly if it doesn't
    revisit_at: implement
  - id: AS4
    text: Custom-agent `model:` frontmatter is supported where it matters (verified by T064, stop-and-ask otherwise)
    revisit_at: implement
risks:
  - id: RK1
    text: "Spec Kit extension hooks are prompt-driven (the agent must obey EXECUTE_COMMAND); an agent can skip them. Mitigation: the adopter baton.yml workflow validates every PR, and baton-land's pre-push check catches missing or stale batons"
    severity: high
  - id: RK2
    text: "ATV is pinned to an unreleased commit. Mitigation: provenance in the lock, upstream-watch, T074 drafts an upstream release request for the owner"
    severity: medium
  - id: RK3
    text: "Spec Kit release churn (5 releases in 10 days). Mitigation: sync --check plus the weekly watch; bump deliberately"
    severity: medium
  - id: RK4
    text: "Windows adopters without bash cannot run the sh scripts. Mitigation: init --script ps|py (requires uv) and a doctor warning"
    severity: low
gate:
  required: true
  approved_by: repository owner via control-plane delegation
  approved_at: 2026-09-24T07:57:21Z
history:
  - phase: specify
    at: 2026-09-24T07:39:15Z
    by: planning-session
    commit: 8aeed8a
  - phase: plan
    at: 2026-09-24T07:39:15Z
    by: planning-session
    commit: 8aeed8a
  - phase: tasks
    at: 2026-09-24T07:39:15Z
    by: planning-session
    commit: 8aeed8a
  - phase: analyze
    at: 2026-09-24T07:53:35Z
    by: review-session
    commit: 23b1a1d
updated_at: 2026-09-24T12:02:36.561Z
updated_by: implementation-session
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

Post-analyze amendment A1–A3 (owner decisions D12–D14) closed the three gaps the implement session stopped on:
role-only approvals and the `E_DENYLIST` scan (data-model §1.1, handoff-contract), `all_of`/`any_of` check groups
(data-model §2.1), and the quick lane (data-model §2.2, phase-contracts § Quick lane). New tasks are T100–T102, and
the new acceptance checks are AC-US3-8..10. Amendment A4 (D15) adds `adversarial-document-reviewer` to
the `docs-review` pack and makes the closure check per pack (T026, AC-US2-4). Amendment A5 (D16) allows internal hyphens in approver
words, so `repository owner via control-plane delegation` is valid (data-model §1.1, T100). Amendment A6 (D18,
resolves implement Q1) requires a `reason` on every `optional_refs` entry and classifies each dangling reference at
the pin (packs.md § Reference classification at the pin; T020, T026, T053, T074, AC-US2-5).

## Next steps

1. `/speckit-implement` in a new session (model role: implementation → gpt-6-sol, reasoning high). The pre-code gate
   has already been approved by the repository owner via control-plane delegation.
2. Work in task order from T001.
   The MVP is Setup + Foundational + US3 + US1: T001–T054 plus T095–T098 and T100–T102 (T096 and T097 are
   Foundational, T098 and T100–T102 are US3, T095 is US1).
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
- A workstation that can't reach the npm or PyPI registry over TLS runs registry-dependent validation in an ephemeral
  Linux container, plus hosted CI (quickstart § Local gate). Never disable TLS.
- Until T047, this baton is not machine-validated. If you edit any listed artifact, update its sha256 here.
