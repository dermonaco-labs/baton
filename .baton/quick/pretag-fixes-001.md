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
summary: F110 preserves adopter quick batons during local and workflow-path adopt; F114 preflights .gitattributes marker conflicts before managed writes; F118 tests alias rejection after token removal. The real bundled CLI regressions and 303 tests pass.
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
    evidence: 4 changed files
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
  - id: D11
    decision: Complete scoped pre-tag follow-up in the quick lane
    rationale: F110 removes only two named source quick files; F114 changes validation order without altering the update contract; F118 is test-only. Feature 001 files remain untouched; F111 remains an owner decision in the review evidence.
    tag: quick-scope-held
    by: ce-work
  - id: D12
    decision: Handoff body redacted
    rationale: Refresh work result for independent review
    by: baton
  - id: D13
    decision: Handoff body redacted
    rationale: Route completed work to independent review
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
  - phase: work
    at: 2026-09-29T04:19:36.955Z
    by: baton
    writer: 8a44b7aec2b3281d1dce7877b097b21442fccfae8def9cf5a0c742317096e70f
    x-worktree: 460f84d3c666afcfb0299243e8426c4b553802b48ca5b0172feede66b32bda0d
    commit: bb19665
    x-action: write
  - phase: work
    at: 2026-09-29T04:19:53.290Z
    by: baton
    writer: 8a44b7aec2b3281d1dce7877b097b21442fccfae8def9cf5a0c742317096e70f
    x-worktree: 460f84d3c666afcfb0299243e8426c4b553802b48ca5b0172feede66b32bda0d
    commit: bb19665
    x-action: redact
  - phase: work
    at: 2026-09-29T04:19:53.959Z
    by: baton
    writer: 8a44b7aec2b3281d1dce7877b097b21442fccfae8def9cf5a0c742317096e70f
    x-worktree: 460f84d3c666afcfb0299243e8426c4b553802b48ca5b0172feede66b32bda0d
    commit: bb19665
    x-action: redact
updated_at: 2026-09-29T04:19:53.957Z
updated_by: baton
x-implementation-writer: 8a44b7aec2b3281d1dce7877b097b21442fccfae8def9cf5a0c742317096e70f
x-implementation-worktree: 460f84d3c666afcfb0299243e8426c4b553802b48ca5b0172feede66b32bda0d
x-implementation-cycle: 58927275a1788d7283c5d6f91e1eb9d5e182db0f7d4bc471aea844aba71b2532
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
F110: adopt and its --no-workflows path remove only the two source-owned quick files, preserving adopter batons. F114: update rejects a conflicting .gitattributes marker before writing managed files or the manifest. F118: the alias self-review test removes the token first. Bundled CLI integration tests passed (303 pass, 1 skip), with npm ci, npm run check, baton validate, actionlint and shellcheck.

## Next steps
1. `/baton-review` in an independent checkout to review F110, F114 and F118 before land.
2. The owner decides F111 (feature 001 land route); record it before the next review.
3. `/baton-review` in a fresh checkout, then `/baton-land`.

## Watch out for
- Escalate decisions that change behaviour or public contracts.
