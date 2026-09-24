---
baton: 1
lane: quick
feature: sample-fix
phase_completed: work
next_phase: specify
next_owner: speckit-specify
status: ready
model_role: planning
suggested_model: null
summary: Completed work in the quick lane.
read_first:
  - path: .baton/quick/sample-fix.md
    why: Quick scope and decision
artifacts: []
entry_checked: []
exit_criteria:
  - id: diff-nonempty
    met: true
  - id: local-checks-pass
    met: true
open_questions: []
decisions: []
gate:
  required: false
  approved_by: null
  approved_at: null
history:
  - phase: work
    at: 2026-09-24T10:00:00Z
    by: ce-work
    commit: null
updated_at: 2026-09-24T10:00:00Z
updated_by: ce-work
---
## Goal
Correct a label without changing behaviour.

## What changed
The scoped phase completed.

## Next steps
1. `/speckit-specify`

## Watch out for
- Stop if scope expands.
