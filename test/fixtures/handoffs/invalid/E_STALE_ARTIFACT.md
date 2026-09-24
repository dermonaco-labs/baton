---
baton: 1
lane: feature
feature: 001-sample
phase_completed: specify
next_phase: clarify
next_owner: speckit-clarify
status: ready
model_role: planning
suggested_model: null
summary: Completed specify in the feature lane.
read_first:
  - path: specs/001-sample/spec.md
    why: Read spec.md for the next phase
    sha256: 124669f953379ed6225b0dfc63cd8fb197c150044a2bdd34d26200cd01daaf7d
artifacts:
  - path: specs/001-sample/spec.md
    role: source-of-truth
    sha256: "0000000000000000000000000000000000000000000000000000000000000000"
  - path: specs/001-sample/plan.md
    role: source-of-truth
    sha256: 08695b810babe214a73859af2fe2a0237df01625d08bc60475c6d94165cf7248
  - path: specs/001-sample/tasks.md
    role: derived
    sha256: f2b6898d2e0b06fa68ef1646bab34045c34c555d7d0bff2235b5e7c362303ad8
entry_checked: []
exit_criteria:
  - id: artifact-exists:spec.md
    met: true
  - id: spec-has-stories
    met: true
  - id: spec-has-success-criteria
    met: true
  - id: markers-bounded
    met: true
open_questions: []
decisions: []
gate:
  required: false
  approved_by: null
  approved_at: null
history:
  - phase: specify
    at: 2026-09-24T10:00:00Z
    by: speckit-specify
    commit: null
updated_at: 2026-09-24T10:00:00Z
updated_by: speckit-specify
---
## Goal
Correct a label without changing behaviour.

## What changed
The scoped phase completed.

## Next steps
1. `/speckit-clarify`

## Watch out for
- Stop if scope expands.
