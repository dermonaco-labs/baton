---
baton: 1
lane: feature
feature: 004-speckit-1-3-0-migration
phase_completed: analyze
next_phase: implement
next_owner: speckit-implement
status: ready
model_role: implementation
suggested_model: gpt-6-sol
summary: "Analyze complete: 0 CRITICAL, 0 HIGH, 3 MEDIUM (C1 wrapper-vs-principle-VI rationale, I1 SC-006 reading of D12 narrowing-only trust, A1 T021 reference wording), 3 LOW (G1 FR-004 already met without task, U1 AC-US1-4 evidence form, E1 local mirror). Coverage 21/22. Ready for the human pre-code gate."
read_first:
  - path: specs/004-speckit-1-3-0-migration/tasks.md
    why: T001-T031 in dependency order with the Acceptance Registry
    sha256: 3bb996d06287633357ee443bc96dc557e7c6d981d153908217fb24e2d057bc3c
  - path: specs/004-speckit-1-3-0-migration/spec.md
    why: "Approved scope: FR-001..FR-015, SC-001..SC-007"
    sha256: b21abe7d51d9e2d68fede7bf6c1e5a140fd8d1c7264953bd3fcb8b4bceee0063
  - path: specs/004-speckit-1-3-0-migration/plan.md
    why: Design summary, project structure, risks and complexity notes
    sha256: 00ce00a456a9be36d8fdec1beb3e4b13a0e953402ae5c30c68884aafa4866419
  - path: specs/004-speckit-1-3-0-migration/research.md
    why: Decisions R1-R12 with evidence (1.3.0 delta, extension tree, trust narrowing, flavours, mirror)
    sha256: 8d4d2f7283032ba4caf804e383d6becd3a46705aa68b3c82e02b681040e6be02
  - path: specs/004-speckit-1-3-0-migration/data-model.md
    why: Pack entry, lock row, wrapper and trusted-path rules
    sha256: 38be196dbb6c61e37a466c196c686f078e9c74bd3849754e88c7d61b60c5b0de
  - path: specs/004-speckit-1-3-0-migration/contracts/issues-pack.md
    why: Install surface, wrapper behaviour, closure and update contract
    sha256: 892c096f2958feb0790e9e1d1cb0f404cdc233360f77886859a58ce736945286
  - path: specs/004-speckit-1-3-0-migration/contracts/sync-github-extension.md
    why: Extension-tree generation and validation contract
    sha256: aa5866e5883280e4d03cf393c0581b3fb0662f49c38327c4b343af5f211e3fe0
  - path: specs/004-speckit-1-3-0-migration/quickstart.md
    why: Bump, reproducibility and acceptance procedure
    sha256: 25babcb745a8696818e702db90a334766f4ec014005a5640491aed6e52fec4d1
  - path: .specify/memory/constitution.md
    why: Principles I, II, VI and VIII constrain the bump, wrapper and checks
    sha256: 2483435fa0d2f24999d9c4351b6c1b286a41bfce344c1eef5b84f269a7299391
artifacts:
  - path: specs/004-speckit-1-3-0-migration/spec.md
    role: source-of-truth
    sha256: b21abe7d51d9e2d68fede7bf6c1e5a140fd8d1c7264953bd3fcb8b4bceee0063
  - path: specs/004-speckit-1-3-0-migration/plan.md
    role: derived
    sha256: 00ce00a456a9be36d8fdec1beb3e4b13a0e953402ae5c30c68884aafa4866419
  - path: specs/004-speckit-1-3-0-migration/research.md
    role: derived
    sha256: 8d4d2f7283032ba4caf804e383d6becd3a46705aa68b3c82e02b681040e6be02
  - path: specs/004-speckit-1-3-0-migration/data-model.md
    role: derived
    sha256: 38be196dbb6c61e37a466c196c686f078e9c74bd3849754e88c7d61b60c5b0de
  - path: specs/004-speckit-1-3-0-migration/contracts/issues-pack.md
    role: derived
    sha256: 892c096f2958feb0790e9e1d1cb0f404cdc233360f77886859a58ce736945286
  - path: specs/004-speckit-1-3-0-migration/contracts/sync-github-extension.md
    role: derived
    sha256: aa5866e5883280e4d03cf393c0581b3fb0662f49c38327c4b343af5f211e3fe0
  - path: specs/004-speckit-1-3-0-migration/quickstart.md
    role: derived
    sha256: 25babcb745a8696818e702db90a334766f4ec014005a5640491aed6e52fec4d1
  - path: specs/004-speckit-1-3-0-migration/tasks.md
    role: derived
    sha256: 3bb996d06287633357ee443bc96dc557e7c6d981d153908217fb24e2d057bc3c
entry_checked: []
exit_criteria:
  - id: analysis-recorded
    met: true
    evidence: specs/004-speckit-1-3-0-migration/analysis.md
  - id: no-critical-findings
    met: true
    evidence: report CRITICAL 0; baton CRITICAL 0
open_questions: []
decisions:
  - id: D1
    decision: Run the migration in the feature lane
    rationale: "1.3.0 removes core taskstoissues (upstream #5053) and changes the opt-in issues pack contents; the quick lane forbids public contract changes."
    by: speckit-specify
  - id: D2
    decision: Target exactly Spec Kit 1.3.0
    rationale: Latest stable release; resolving closure for 1.3.0 also covers the 1.1.3-1.2.6 E_DANGLING_REF failure mode.
    by: speckit-specify
  - id: D3
    decision: Exclude the Copilot --no-model-invocation option, the Baton release, merge, tag, settings changes and workflow dispatch
    rationale: None is needed to migrate; release follows the normal process separately.
    by: speckit-specify
  - id: D4
    decision: Regenerated the unapproved specify baton (first written in commit 9e5045e) so Q1/Q2 options state the owner-directed A+ and X choices exactly
    rationale: The coordinator relayed owner choices A+ and X; handoff answer needs an exact recorded option and the earlier options lacked A+. The gate was never approved, so no approval is lost; the formal answers and approval remain with the owner.
    by: speckit-specify
  - id: D5
    decision: No stale skill file remains for issues-pack adopters
    rationale: The compatibility wrapper occupies the same path as the 1.0.11 core taskstoissues skill (.github/skills/speckit-taskstoissues/SKILL.md), so existing update replaces unmodified copies and flags modified ones as conflicts; plan verifies no other residual file.
    by: speckit-specify
  - id: D6
    decision: "A+: repoint the issues pack to the bundled github extension and keep /speckit-taskstoissues as a thin Baton-authored compatibility wrapper backed by the extension command (owner-directed; spec assumes this)"
    rationale: Spec Kit 1.3.0 removes core taskstoissues. How should the opt-in issues pack be handled?
    by: human:repository-owner
  - id: D7
    decision: "X: no update behavior change; document any residual manual removal in CHANGELOG/README (owner-directed; spec assumes this)"
    rationale: How should files that leave the issues pack be handled on baton update?
    by: human:repository-owner
  - id: D8
    decision: Generate the github extension in a separate tree derived from the pinned core project; core generation is unchanged
    rationale: prepareEntries assigns every generated .specify/ file to core, so adding the extension there would violate FR-009 and change trusted registry files (research R3).
    by: speckit-plan
  - id: D9
    decision: Do not register the github extension in adopter .specify/extensions.yml or .registry; document that specify extension list does not show it
    rationale: Registration files are core-owned and feature 003-bound; the extension registers no hooks, and its command skill works unregistered (R3).
    by: speckit-plan
  - id: D10
    decision: Ship all seven extension files including bash, PowerShell and Python resolve scripts; init renders the extension skill for ps/py when issues is selected
    rationale: Keeps flavour parity with core scripts using the existing flavour mechanism; not an update-behaviour change (R6). Flagged for pre-code review.
    by: speckit-plan
  - id: D11
    decision: "Add optional pack-entry field extension (enum github, only with from: speckit) and lock-row key x-speckit-extension: github"
    rationale: Routes sourcing explicitly without a new upstream id, keeping lock upstream enum, pins and diff unchanged (R8).
    by: speckit-plan
  - id: D12
    decision: "Narrowing-only addition to isTrusted: install targets under BOUND_ROOTS and rows with x-speckit-extension are trusted-base bound; FROZEN_FIELDS gains x-speckit-extension"
    rationale: Stored pack paths escape BOUND_ROOTS; without this the automation could regenerate extension files. SC-006 read as existing bindings unchanged and the automated set only shrinks (R7). Flagged for pre-code review.
    by: speckit-plan
  - id: D13
    decision: "Wrapper is a from: baton skill sourced from baton/skills/speckit-taskstoissues/SKILL.md with no lock row; no wrapper-path guard added"
    rationale: Same path as the 1.0.11 skill, so update rewrites unmodified copies (owner speckit -> baton) and conflicts modified ones; newPathIssue already rejects a future upstream file at that path (R5, R7).
    by: speckit-plan
  - id: D14
    decision: Normalize the rendered extension skill to LF via generatedText; raw lock hashes stay integrity hashes
    rationale: The rendered skill is CRLF on Windows; follows docs/solutions/crlf-normalized-ownership-hashing-2026-09-29.md (R3).
    by: speckit-plan
  - id: D15
    decision: Run the bump and sync --check in a Linux container or hosted CI with public PyPI; keep mirror settings env-only
    rationale: The internal mirror lacks specify-cli==1.3.0; follows docs/solutions/restricted-mirror-env-only-2026-09-29.md (R9).
    by: speckit-plan
  - id: D16
    decision: Resolved assumptions A1-A3 during planning
    rationale: "A1: token-budget and optimize vendor inert extensions declaring speckit_version >=0.1.0, unaffected by the bump. A2: 1.3.0 extensions.yml is byte-identical after EOL normalization, so hooks are unchanged; a regression test pins one receive and one handoff per event. A3: baton.lock.json lists only .github/skills/speckit-taskstoissues/SKILL.md for issues."
    by: speckit-plan
  - by: speckit-tasks
    id: D17
    decision: Land the issues pack repoint (T012) and wrapper (T011) in the same change as the 1.3.0 bump (T013)
    rationale: Spec Kit 1.0.11 has no bundled github extension and 1.3.0 no longer generates the old taskstoissues skill, so neither order is reproducible on its own.
  - by: speckit-tasks
    id: D18
    decision: Capture the 1.0.11 issues skill bytes as test/fixtures/speckit-1.0.11/speckit-taskstoissues/SKILL.md before the bump
    rationale: The update owner-change test (T023) needs the old upstream bytes after sync deletes packs/issues/files copies.
  - by: speckit-tasks
    id: D19
    decision: Update baton/templates/specify.gitignore by a dedicated task (T014)
    rationale: payload.mjs requires a byte-identical mirror of .specify/.gitignore and sync does not refresh it.
  - id: D20
    decision: Record reviewed implementation base
    rationale: Implementation starts at this commit
    tag: diff-base
    x-base-commit: dea5807d5a7e343059837ddf67e85d8d3e55f79d
    by: baton
  - id: D21
    decision: Artifact hashes refreshed after intentional edit
    rationale: "speckit-implement marked T002-T031 complete and added implementation and acceptance evidence to tasks.md; spec.md, plan.md, registered acceptance commands and approved scope are unchanged. Clears the pre-code gate; renewed approval is required before the implement handoff (precedent: 002 D8)."
    by: implementation-session
gate:
  required: true
  approved_by: null
  approved_at: null
history:
  - phase: specify
    at: 2026-11-05T09:15:49.859Z
    by: speckit-specify
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 9e5045e
    x-action: write
  - phase: specify
    at: 2026-11-05T09:24:50.418Z
    by: human:repository-owner
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 799faec
    x-action: answer
  - phase: specify
    at: 2026-11-05T09:24:50.667Z
    by: human:repository-owner
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 799faec
    x-action: answer
  - phase: specify
    at: 2026-11-05T09:24:50.914Z
    by: human:repository-owner
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 799faec
    x-action: approve
  - phase: plan
    at: 2026-11-05T09:39:07.141Z
    by: speckit-plan
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 787d63b
    x-action: write
  - phase: tasks
    at: 2026-11-05T09:43:59.455Z
    by: speckit-tasks
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 0f68b07
    x-action: write
  - phase: analyze
    at: 2026-11-05T09:45:52.461Z
    by: speckit-analyze
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: dea5807
    x-action: write
  - phase: analyze
    at: 2026-11-05T09:46:39.458Z
    by: human:repository-owner
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 17ff3ab
    x-action: approve
  - phase: analyze
    at: 2026-11-05T10:34:15.733Z
    by: implementation-session
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 71ed8a8
    x-action: refresh
updated_at: 2026-11-05T10:34:15.732Z
updated_by: implementation-session
risks:
  - id: R1
    text: Hook dispatch changes in 1.1-1.3 could silently skip or double Baton receive/handoff hooks.
    severity: high
  - id: R2
    text: Vendored speckit skill text changes may conflict with existing repairs in packs/repairs.yml.
    severity: medium
  - id: R3
    text: New transitive Python dependencies in specify-cli 1.3.0 change the hash-locked requirements and notices.
    severity: low
  - id: R4
    text: Adding github extension or wrapper paths could accidentally widen feature 003's automated upgrade path policy or trusted-base bindings.
    severity: high
  - id: R5
    text: The skills-mode rendering of the github extension command may differ from the core skill layout, affecting where the wrapper and canonical command land.
    severity: medium
  - id: R6
    text: Internal PyPI mirror lacks specify-cli==1.3.0; local bump and live install tests cannot run on this laptop.
    severity: medium
  - id: R7
    text: Adopters who installed or later run specify extension add github themselves will see managed-file conflicts on update.
    severity: low
  - id: R8
    text: The trust-narrowing addition could unintentionally reject a legitimate future automated core row if BOUND_ROOTS matching is wrong.
    severity: medium
assumptions: []
acceptance_checks:
  - id: AC-US1-1
    story: US1
    check: node --test test/unit/packs.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US1-2
    story: US1
    check: node --test test/unit/schema.test.mjs test/unit/sync.test.mjs test/unit/upstream-candidates.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US1-3
    story: US1
    check: "quickstart §1-§2 in the generator environment: sync --bump speckit=1.3.0, then sync --check, lock verify and validate report 0 differences; lock upstreams.speckit is 1.3.0 / v1.3.0 / 91261fdcf1738cb095a31ff5bee145f502e3af91"
    kind: manual
    expect_initial: fail
  - id: AC-US1-4
    story: US1
    check: npm run check (generator environment or hosted CI run of the branch)
    kind: command
    expect_initial: n/a
  - id: AC-US2-1
    story: US2
    check: node --test test/unit/relay-hooks.test.mjs
    kind: command
    expect_initial: n/a
  - id: AC-US2-2
    story: US2
    check: node --test --test-name-pattern="core-only" test/integration/init.test.mjs
    kind: command
    expect_initial: n/a
  - id: AC-US3-1
    story: US3
    check: node --test test/unit/issues-wrapper.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US3-2
    story: US3
    check: node --test --test-name-pattern="issues" test/integration/init.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US3-3
    story: US3
    check: node --test --test-name-pattern="issues" test/integration/update.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US3-4
    story: US3
    check: git diff 0f68b07 -- test/unit/upstream-candidates.test.mjs shows only added lines (SC-006)
    kind: manual
    expect_initial: n/a
analysis:
  critical: 0
  high: 0
  report_path: specs/004-speckit-1-3-0-migration/analysis.md
---

## Goal

Move Baton's vendored Spec Kit from 1.0.11 to 1.3.0 under the owner's A+/X decisions. `core` stays free of issue
creation, relay hooks fire once, and feature 003's trusted-base bindings are unchanged.

## What changed

Spec, plan, 31 tasks and the analysis are complete. `analysis.md` reports CRITICAL 0 and HIGH 0, with three MEDIUM
and three LOW findings. No code has been written.

## Next steps

1. Human pre-code gate: the repository owner approves, and confirms the SC-006 reading of D12 (finding I1).
2. After approval, run `/speckit-implement` in the generator environment for the bump (R6).

## Watch out for

- The internal mirror lacks `specify-cli==1.3.0`; run the bump in a Linux container or hosted CI with public PyPI and
  keep mirror settings env-only.
- Never merge, tag, release, change settings or dispatch workflows.
- Do not widen the automated upgrade path for extension, preset, registry or wrapper files.
