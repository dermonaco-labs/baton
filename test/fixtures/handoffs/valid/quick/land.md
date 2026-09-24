---
baton: 1
lane: quick
feature: sample-fix
phase_completed: land
next_phase: compound
next_owner: ce-compound
status: ready
model_role: planning
suggested_model: null
summary: Completed land in the quick lane.
read_first:
  - path: .baton/quick/sample-fix.md
    why: Quick scope and decision
artifacts: []
entry_checked: []
exit_criteria:
  - id: pr-opened
    met: true
open_questions: []
decisions:
  - id: D1
    decision: Keep the fix in the quick lane
    rationale: Correct a typo only
    tag: quick-eligible
    by: baton
gate:
  required: true
  approved_by: null
  approved_at: null
history:
  - phase: land
    at: 2026-09-24T10:00:00Z
    by: baton-land
    commit: null
updated_at: 2026-09-24T10:00:00Z
updated_by: baton-land
pr:
  url: https://github.com/example/baton/pull/1
  number: 1
---
## Goal
Correct a label without changing behaviour.

## What changed
The scoped phase completed.

## Next steps
1. `/ce-compound`

## Watch out for
- Stop if scope expands.
