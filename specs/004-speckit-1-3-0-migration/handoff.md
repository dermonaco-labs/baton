---
baton: 1
lane: feature
feature: 004-speckit-1-3-0-migration
phase_completed: plan
next_phase: tasks
next_owner: speckit-tasks
status: ready
model_role: planning
suggested_model: claude-opus-5.5
summary: "Planned the Spec Kit 1.0.11 -> 1.3.0 migration under A+/X: bump pin and lock; source the opt-in issues pack (7 github extension 1.0.5 files) from a separate generated extension tree so core never contains them; add a same-path Baton-authored /speckit-taskstoissues wrapper (no stale file); extend pack schema with extension: github and lock rows with x-speckit-extension; narrowing-only isTrusted addition keeps extension rows manual-review; init renders the extension for ps/py flavours; update logic unchanged. No code written."
read_first:
  - path: specs/004-speckit-1-3-0-migration/spec.md
    why: "Approved scope: FR-001..FR-015, SC-001..SC-007"
  - path: specs/004-speckit-1-3-0-migration/plan.md
    why: Design summary, project structure, risks and complexity notes
  - path: specs/004-speckit-1-3-0-migration/research.md
    why: Decisions R1-R12 with evidence (1.3.0 delta, extension tree, trust narrowing, flavours, mirror)
  - path: specs/004-speckit-1-3-0-migration/data-model.md
    why: Pack entry, lock row, wrapper and trusted-path rules
  - path: specs/004-speckit-1-3-0-migration/contracts/issues-pack.md
    why: Install surface, wrapper behaviour, closure and update contract
  - path: specs/004-speckit-1-3-0-migration/contracts/sync-github-extension.md
    why: Extension-tree generation and validation contract
  - path: specs/004-speckit-1-3-0-migration/quickstart.md
    why: Bump, reproducibility and acceptance procedure
  - path: .specify/memory/constitution.md
    why: Principles I, II, VI and VIII constrain the bump, wrapper and checks
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
entry_checked: []
exit_criteria:
  - id: artifact-exists:plan.md
    met: true
    evidence: plan.md
  - id: artifact-exists:research.md
    met: true
    evidence: research.md
  - id: no-needs-clarification:plan.md
    met: true
    evidence: plan.md
  - id: constitution-check-present
    met: true
    evidence: constitution check in plan
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
gate:
  required: false
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
updated_at: 2026-11-05T09:39:07.135Z
updated_by: speckit-plan
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
---

## Goal

Move Baton's vendored Spec Kit from 1.0.11 to 1.3.0 under the owner's A+/X decisions. `core` stays free of issue
creation, relay hooks fire once, and feature 003's trusted-base bindings are unchanged.

## What changed

Planning is complete: `plan.md`, `research.md` (R1-R12), `data-model.md`, two contracts and `quickstart.md`. The
`issues` pack is sourced from a separate generated extension tree and gains a same-path Baton wrapper. A
narrowing-only trust rule keeps extension rows manual-review. No code has been written.

## Next steps

1. `/speckit-tasks`: tests first, covering closure, install surfaces, wrapper, schema, trust narrowing, update owner
   change, CRLF fixture, `ps` flavour and hook count.
2. `/speckit-analyze`, then stop at the human pre-code gate.

## Watch out for

- The internal mirror lacks `specify-cli==1.3.0`; run the bump in a Linux container or hosted CI with public PyPI and
  keep mirror settings env-only.
- Never merge, tag, release, change settings or dispatch workflows.
- Do not widen the automated upgrade path for extension, preset, registry or wrapper files.
