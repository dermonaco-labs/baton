---
baton: 1
lane: feature
feature: 004-speckit-1-3-0-migration
phase_completed: specify
next_phase: plan
next_owner: speckit-plan
status: needs-human
model_role: planning
suggested_model: claude-opus-5.5
summary: "Specified the Spec Kit 1.0.11 -> 1.3.0 migration: bump the pin and lock, verify relay hooks fire once, move the opt-in issues pack to the bundled github extension, and record the upgrade. Scope gate pending; Q1/Q2 carry the recommended choices."
read_first:
  - path: specs/004-speckit-1-3-0-migration/spec.md
    why: Requirements FR-001..FR-011 and success criteria for planning
  - path: .specify/memory/constitution.md
    why: Principles I/II (byte-identical pinned upstream) and VI (packs) constrain the bump
  - path: baton.lock.json
    why: Current Spec Kit 1.0.11 pin and the issues-pack file record to replace
  - path: packs/issues.yml
    why: Only pack that references the removed core taskstoissues source
  - path: CONTRIBUTING.md
    why: Supported sync --bump upgrade procedure and required checks
  - path: baton/speckit-extension/extension.yml
    why: Declared Spec Kit version range for Baton hooks
artifacts:
  - path: specs/004-speckit-1-3-0-migration/spec.md
    role: source-of-truth
    sha256: a6d2d251eb1197eca8cf06b800dfcce2619c4710b45d17990ba3c2f6902b138d
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
open_questions:
  - id: Q1
    question: Spec Kit 1.3.0 removes core taskstoissues. How should the opt-in issues pack be handled?
    blocking: true
    options:
      - "A: repoint the pack to the bundled github extension; command becomes /speckit-github-taskstoissues (recommended; spec assumes this)"
      - "B: retire the issues pack"
      - "C: keep the 1.0.11 taskstoissues bytes under a separate pin"
    owner: repository owner
  - id: Q2
    question: baton update does not remove managed files that leave the snapshot, so issues-pack adopters keep a stale speckit-taskstoissues skill. How should this be handled?
    blocking: true
    options:
      - "X: document manual removal in CHANGELOG/README; no update behavior change (recommended; spec assumes this)"
      - "Y: extend update to remove unmodified departed managed files and flag modified ones as conflicts"
    owner: repository owner
decisions:
  - id: D1
    decision: Run the migration in the feature lane
    rationale: "1.3.0 removes core taskstoissues (upstream #5053), changing the public command of the opt-in issues pack; the quick lane forbids public contract changes."
    by: speckit-specify
  - id: D2
    decision: Target exactly Spec Kit 1.3.0
    rationale: Latest stable release (2026-11-03); intermediate 1.0.12-1.2.6 are not pinned separately.
    by: speckit-specify
  - id: D3
    decision: Exclude adoption of the Copilot --no-model-invocation option and the Baton release itself
    rationale: Neither is needed to migrate; both can follow as separate work.
    by: speckit-specify
gate:
  required: true
  approved_by: null
  approved_at: null
history:
  - phase: specify
    at: 2026-11-05T09:08:06.914Z
    by: speckit-specify
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 890bb99
    x-action: write
updated_at: 2026-11-05T09:08:06.906Z
updated_by: speckit-specify
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
assumptions:
  - id: A1
    text: The token-budget and optimize extension packs need only reverification; they declare speckit_version >=0.1.0.
    revisit_at: plan
  - id: A2
    text: "Upstream #5219 (registered command hook invoked once) does not remove or duplicate Baton's mandatory before/after hooks; plan must verify."
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
