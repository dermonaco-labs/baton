---
baton: 1
lane: quick
feature: pretag-fixes-001
phase_completed: work
next_phase: review
next_owner: baton-review
status: ready
model_role: review
suggested_model: claude-opus-5.5
summary: "Pre-tag fix pass 5 for 001: F98/F102/F107 use a random per-worktree git identity; F99 uses one CRLF-tolerant installed-file hash; F100 preserves CRLF agent files; F96 and F101 are fixed."
read_first:
  - path: .baton/quick/pretag-fixes-001.md
    why: Scope, deferred P3 decisions and diff base
  - path: specs/001-baton-template/review.json
    why: Original F98-F105 findings and evidence
  - path: src/lib/writer.mjs
    why: Per-worktree checkout identity
  - path: src/commands/handoff.mjs
    why: Self-review comparison
  - path: src/lib/hash.mjs
    why: Managed-file ownership hash
  - path: src/commands/update.mjs
    why: CRLF update and one-time attributes merge
  - path: src/commands/models.mjs
    why: CRLF-preserving agent model rewrite
  - path: test/integration/relay.test.mjs
    why: Same-path clone, alias, clean and override regressions
  - path: test/integration/update.test.mjs
    why: Actual autocrlf clone and lifecycle regressions
  - path: test/unit/models.test.mjs
    why: CRLF agent rewrite regression
artifacts: []
entry_checked: []
exit_criteria:
  - id: diff-nonempty
    met: true
    evidence: 18 changed files
  - id: local-checks-pass
    met: true
    evidence: "baton: 0"
open_questions: []
decisions:
  - id: D1
    decision: Start a quick lane
    tag: quick-eligible
    rationale: Post-review pre-tag regressions F98-F100 and narrowly coupled P3 fixes for feature 001-baton-template; restore existing clone identity and CRLF ownership behavior without new public contract
    by: baton
  - id: D2
    decision: Record quick-lane review base
    rationale: Work starts at this commit
    tag: diff-base
    x-base-commit: c85bf3f00c04ca192675281af623311ac5a98d64
    by: baton
  - id: D3
    decision: Defer nontrivial or lane-incompatible P3s
    rationale: F90 would modify the already reviewed feature 001 baton and violate the quick lane's no-feature-tasks check. F104 needs transactional preflight for marker conflicts; F105 needs a tracked attributes-block ownership and uninstall lifecycle. Neither is a trivial pre-tag change. F96 and F101 are fixed in this pass.
    by: ce-work
  - id: D4
    decision: Handoff body redacted
    rationale: Refresh quick handoff body after implementation
    by: baton
  - id: D5
    decision: Handoff body redacted
    rationale: Point review handoff at its actual next phase
    by: baton
gate:
  required: false
  approved_by: null
  approved_at: null
history:
  - phase: work
    at: 2026-09-29T03:08:01.903Z
    by: baton
    writer: 8a44b7aec2b3281d1dce7877b097b21442fccfae8def9cf5a0c742317096e70f
    x-worktree: 460f84d3c666afcfb0299243e8426c4b553802b48ca5b0172feede66b32bda0d
    commit: c85bf3f
    x-action: write
  - phase: work
    at: 2026-09-29T03:08:16.512Z
    by: baton
    writer: 8a44b7aec2b3281d1dce7877b097b21442fccfae8def9cf5a0c742317096e70f
    x-worktree: 460f84d3c666afcfb0299243e8426c4b553802b48ca5b0172feede66b32bda0d
    commit: c85bf3f
    x-action: redact
  - phase: work
    at: 2026-09-29T03:08:16.927Z
    by: baton
    writer: 8a44b7aec2b3281d1dce7877b097b21442fccfae8def9cf5a0c742317096e70f
    x-worktree: 460f84d3c666afcfb0299243e8426c4b553802b48ca5b0172feede66b32bda0d
    commit: c85bf3f
    x-action: redact
updated_at: 2026-09-29T03:08:16.926Z
updated_by: baton
x-implementation-writer: 8a44b7aec2b3281d1dce7877b097b21442fccfae8def9cf5a0c742317096e70f
x-implementation-worktree: 460f84d3c666afcfb0299243e8426c4b553802b48ca5b0172feede66b32bda0d
x-implementation-cycle: c48cd513991861411cb20c33a0f97f2206d4b42874da007a3fef96acf746d52f
---
## Goal
Keep the work in scope.

## What changed
Fixed F98/F99/F100 and P3 F96/F101; F90/F104/F105 are deferred as recorded in D3.

## Next steps
1. `/baton-review` in a fresh checkout

## Watch out for
- Escalate decisions that change behaviour or public contracts.
