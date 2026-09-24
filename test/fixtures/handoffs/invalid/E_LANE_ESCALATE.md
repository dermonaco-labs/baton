---
baton: 1
lane: quick
feature: sample-fix
phase_completed: work
next_phase: review
next_owner: baton-review
status: blocked
model_role: review
suggested_model: null
summary: Completed work in the quick lane.
read_first:
  - path: .baton/quick/sample-fix.md
    why: Quick scope and decision
artifacts: []
entry_checked: []
exit_criteria:
  - id: quick-scope-held
    met: false
open_questions: []
decisions:
  - id: D1
    decision: Keep the fix in the quick lane
    rationale: Correct a typo only
    tag: quick-eligible
    by: baton
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
1. `/baton-review`

## Watch out for
- Stop if scope expands.
