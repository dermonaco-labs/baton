---
baton: 1
lane: quick
feature: pretag-fixes-001
phase_completed: review
next_phase: work
next_owner: ce-work
status: ready
model_role: implementation
suggested_model: gpt-6-sol
summary: "Independent review of pre-tag fix pass 5 (c85bf3f..a755ff8, PR 30): F96, F98, F99, F100, F101, F102 (forward) and F107 are verified with the real CLI. Open: P2 F110 (adopt deletes adopter .baton/quick/ batons), P2 F111 (feature 001 stranded by E_STALE_REVIEW; owner decision) and P3 F114 (update attributes conflict after writes). Route to work."
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
  - id: findings-json-valid
    met: true
    evidence: .baton/quick/pretag-fixes-001.review.json
  - id: quick-scope-held
    met: true
    evidence: "The diff restores intended behavior without new commands, flags, error codes or handoff fields: the self-review guard still means 'same checkout', ownership hashes still mean 'user-unmodified', and E_CHECKOUT_TOKEN only gains a documented trigger. The stale absolute-path wording in specs/ contracts (F113) is documentation drift for a feature-lane amendment, not a contract change. The remaining quick-lane fixes (F110 cleanup list, F114 merge ordering) are small and stay in scope. F111 is an owner decision about feature 001, not quick-lane work."
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
  - id: D6
    decision: Quick scope held for fix pass 5
    rationale: "The diff restores intended behavior without new commands, flags, error codes or handoff fields: the self-review guard still means 'same checkout', ownership hashes still mean 'user-unmodified', and E_CHECKOUT_TOKEN only gains a documented trigger. The stale absolute-path wording in specs/ contracts (F113) is documentation drift for a feature-lane amendment, not a contract change. The remaining quick-lane fixes (F110 cleanup list, F114 merge ordering) are small and stay in scope. F111 is an owner decision about feature 001, not quick-lane work."
    tag: quick-scope-held
    by: baton-review
  - id: D7
    decision: Route review to work for F110 and F114
    rationale: F110 (P2) fails the requirement that adopt removes only the template's own source-only quick files, and it has a small config fix. F114 is a P3 regression from the F101 reordering with a small fix. F111 needs an owner decision before feature 001 can land. Other new P3 findings are dismissed with reasons in the review JSON.
    by: baton-review
  - id: D8
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: b9539a2a5238ab08268a42ac8b5ba131f6becbe4a011840ab2422785493fd63e
    x-base-commit: c85bf3f00c04ca192675281af623311ac5a98d64
    by: baton
  - id: D9
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: a755ff838970f22707d32208ff88130e45d6dc8f
    by: baton
  - id: D10
    decision: Handoff body redacted
    rationale: Point the handoff at the review outcome and next work
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
  - phase: review
    at: 2026-09-29T03:52:59.917Z
    by: baton-review
    writer: ecb01d3baef0c1ea60b4aac41a9bca9af1d8e47b2ec3a39e7bcffc70a9f9ef29
    x-worktree: 44021efbcb1fff1d7f1e6203f63085c561c88e445424157a99a501a72531f564
    commit: a755ff8
    x-action: write
  - phase: review
    at: 2026-09-29T03:53:09.334Z
    by: baton
    writer: ecb01d3baef0c1ea60b4aac41a9bca9af1d8e47b2ec3a39e7bcffc70a9f9ef29
    x-worktree: 44021efbcb1fff1d7f1e6203f63085c561c88e445424157a99a501a72531f564
    commit: a755ff8
    x-action: redact
updated_at: 2026-09-29T03:53:09.333Z
updated_by: baton
x-implementation-writer: 8a44b7aec2b3281d1dce7877b097b21442fccfae8def9cf5a0c742317096e70f
x-implementation-worktree: 460f84d3c666afcfb0299243e8426c4b553802b48ca5b0172feede66b32bda0d
x-implementation-cycle: c48cd513991861411cb20c33a0f97f2206d4b42874da007a3fef96acf746d52f
risks:
  - id: R1
    text: "F111: the feature 001 baton (review → land) cannot land at main: receive land gives E_STALE_REVIEW and no command returns it to review. Landing from the reviewed tree c85bf3f is verified (receive land exits 0); the owner must choose that route or a CLI fix."
    severity: high
  - id: R2
    text: The self-review guard falls back to the token alone when git fails with exit 128, and for batons written before this pass (F115, F117). It is a process guard, not a security boundary.
    severity: low
review:
  findings_path: .baton/quick/pretag-fixes-001.review.json
  blocking_findings: 0
---
## Goal
Keep the work in scope.

## What changed
Fixed F98/F99/F100 and P3 F96/F101; F90/F104/F105 are deferred as recorded in D3. Follow-up commit 825da35 added .baton/quick/ to template-cleanup.yml. Independent review verified the fixes; see pretag-fixes-001.review.json.

## Next steps
1. `/ce-work`: fix F110 (list only the template's own quick files in template-cleanup.yml and pin with an adopter-baton fixture) and F114 (merge .gitattributes before managed writes).
2. The owner decides F111 (feature 001 land route); record it before the next review.
3. `/baton-review` in a fresh checkout, then `/baton-land`.

## Watch out for
- Escalate decisions that change behaviour or public contracts.
