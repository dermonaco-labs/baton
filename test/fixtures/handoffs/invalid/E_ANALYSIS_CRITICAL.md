---
baton: 1
lane: feature
feature: 001-sample
phase_completed: analyze
next_phase: implement
next_owner: speckit-implement
status: ready
model_role: implementation
suggested_model: null
summary: Completed analyze in the feature lane.
read_first:
  - path: specs/001-sample/spec.md
    why: Read spec.md for the next phase
    sha256: 124669f953379ed6225b0dfc63cd8fb197c150044a2bdd34d26200cd01daaf7d
artifacts:
  - path: specs/001-sample/spec.md
    role: source-of-truth
    sha256: 124669f953379ed6225b0dfc63cd8fb197c150044a2bdd34d26200cd01daaf7d
  - path: specs/001-sample/plan.md
    role: source-of-truth
    sha256: 08695b810babe214a73859af2fe2a0237df01625d08bc60475c6d94165cf7248
  - path: specs/001-sample/tasks.md
    role: derived
    sha256: f2b6898d2e0b06fa68ef1646bab34045c34c555d7d0bff2235b5e7c362303ad8
entry_checked: []
exit_criteria:
  - id: analysis-recorded
    met: true
  - id: no-critical-findings
    met: true
open_questions: []
decisions: []
gate:
  required: true
  approved_by: null
  approved_at: null
history:
  - phase: analyze
    at: 2026-09-24T10:00:00Z
    by: speckit-analyze
    commit: null
updated_at: 2026-09-24T10:00:00Z
updated_by: speckit-analyze
analysis:
  report_path: specs/001-sample/analysis.md
  critical: 1
  high: 0
acceptance_checks:
  - id: AC-US1-1
    story: US1
    check: check label
    kind: test-id
    expect_initial: fail
---
## Goal
Correct a label without changing behaviour.

## What changed
The scoped phase completed.

## Next steps
1. `/speckit-implement`

## Watch out for
- Stop if scope expands.
