---
baton: 1
lane: feature
feature: 004-speckit-1-3-0-migration
phase_completed: specify
next_phase: plan
next_owner: speckit-plan
status: ready
model_role: planning
suggested_model: claude-opus-5.5
summary: "Specified the Spec Kit 1.0.11 -> 1.3.0 migration per owner decisions A+/X: bump pin and lock, resolve the 1.1.3-1.3.0 E_DANGLING_REF closure by moving the opt-in issues pack to the bundled github extension plus a Baton-authored /speckit-taskstoissues compatibility wrapper, keep core and feature 003 trusted-base bindings unchanged, verify relay hooks fire once, add regression tests. Scope gate pending owner answers to Q1/Q2."
read_first:
  - path: specs/004-speckit-1-3-0-migration/spec.md
    why: Requirements FR-001..FR-015 and success criteria SC-001..SC-007 for planning
  - path: .specify/memory/constitution.md
    why: Principles I/II (byte-identical pinned upstream, declared repairs) and VI (opt-in packs) constrain the bump and wrapper
  - path: baton.lock.json
    why: Current Spec Kit 1.0.11 pin and the issues-pack file record to replace
  - path: packs/issues.yml
    why: Only pack referencing the removed core taskstoissues source; gains github extension files and the wrapper
  - path: src/lib/packs.mjs
    why: Pack closure check that raises E_DANGLING_REF
  - path: src/lib/upstream-candidates.mjs
    why: Feature 003 path policy that must not widen to extension/preset/registry/wrapper files
  - path: specs/003-upstream-upgrade-prs/contracts/sync-bump.md
    why: Feature 003 trusted-base byte/mode binding contract that must stay intact
  - path: CONTRIBUTING.md
    why: Supported sync --bump upgrade procedure and required checks
  - path: baton/speckit-extension/extension.yml
    why: Declared Spec Kit version range for Baton hooks
artifacts:
  - path: specs/004-speckit-1-3-0-migration/spec.md
    role: source-of-truth
    sha256: b21abe7d51d9e2d68fede7bf6c1e5a140fd8d1c7264953bd3fcb8b4bceee0063
entry_checked: []
exit_criteria:
  - id: artifact-exists:spec.md
    met: true
    evidence: spec.md
  - id: spec-has-stories
    met: true
    evidence: user stories in spec
  - id: spec-has-success-criteria
    met: true
    evidence: success criteria in spec
  - id: markers-bounded
    met: true
    evidence: at most three clarification markers
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
gate:
  required: true
  approved_by: repository owner via control-plane delegation
  approved_at: 2026-11-05
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
updated_at: 2026-11-05T09:24:50.914Z
updated_by: human:repository-owner
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
assumptions:
  - id: A1
    text: The token-budget and optimize extension packs need only reverification; they declare compatible speckit_version ranges.
    revisit_at: plan
  - id: A2
    text: "Upstream #5219 (registered command hook invoked once) does not remove or duplicate Baton's mandatory before/after hooks; plan must verify."
    revisit_at: plan
  - id: A3
    text: The 1.0.11 issues pack managed only .github/skills/speckit-taskstoissues/SKILL.md; plan must verify against the lock and integration manifests.
    revisit_at: plan
---
## Goal
Keep the work in scope.

## What changed
Pending phase work.

## Next steps
1. `/speckit-specify`

## Watch out for
- Escalate decisions that change behaviour or public contracts.
