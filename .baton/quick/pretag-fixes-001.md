---
baton: 1
lane: quick
feature: pretag-fixes-001
phase_completed: land
next_phase: compound
next_owner: ce-compound
status: ready
model_role: planning
suggested_model: claude-opus-5.5
summary: Opened the independent quick-lane land PR for owner review; no implementation files changed or merged in this land checkout.
read_first:
  - path: .baton/quick/pretag-fixes-001.md
    why: Quick scope, decisions D14-D15, land route and tag precondition
  - path: .baton/quick/pretag-fixes-001.review.json
    why: All findings fixed or dismissed with reasons; x-review2-summary
  - path: .baton/template-cleanup.yml
    why: "F110 fix and F122 tag precondition: source quick files must be listed in remove"
  - path: src/commands/update.mjs
    why: F114 attributes preflight before managed writes
  - path: test/integration/adopt.test.mjs
    why: F110 adopter quick-baton survival tests
  - path: test/integration/update.test.mjs
    why: F114 no-partial-write regression
  - path: test/integration/relay.test.mjs
    why: F118 alias test after token removal
artifacts: []
entry_checked: []
exit_criteria:
  - id: pr-opened
    met: true
    evidence: https://github.com/dermonaco-labs/baton/pull/35
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
  - id: D14
    decision: Quick scope held for the review 2 work cycle
    rationale: "Independently re-checked a755ff8..c142fb7: F110 narrows the template-cleanup remove list, F114 reorders an existing merge before writes, and F118 changes only a test. No new command, flag, error code, handoff field or public contract; behavior moves back to what the contract already promised (adopt removes only template-owned files; a failed update writes nothing)."
    tag: quick-scope-held
    by: baton-review
  - id: D15
    decision: "F111 resolved by owner route (a): feature 001 lands at its reviewed tree c85bf3f via PR #32, and this quick lane covers c85bf3f..main"
    rationale: "Owner decision received through Copilot and recorded in the feature 001 land handoff (PR #32, specs/001-baton-template/handoff.md). Option (b), a CLI route from a stale land back to review, is backlogged for v0.2 there. No specs/ edit in this lane."
    by: baton-review
  - id: D16
    decision: Route review to land
    rationale: No P0/P1 and no open findings. F122 (P2, hand-kept template quick list) is dismissed for v0.1 with a tag precondition; F124, F126 and F127 are dismissed with v0.2 follow-ups; F123 and F125 are fixed by this handoff.
    by: baton-review
  - id: D17
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: 1d6890ec857b9419b65c693e4746e3688acecd6326fa19209c2ec7cdf89b0cbe
    x-base-commit: a755ff838970f22707d32208ff88130e45d6dc8f
    by: baton
  - id: D18
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: c142fb7c2665b14addef7525b9d8804caee884a6
    by: baton
  - id: D19
    decision: Handoff body redacted
    rationale: Refresh next steps after review 2
    by: baton
  - id: D20
    decision: Handoff body redacted
    rationale: Refresh next steps after review 2
    by: baton
  - id: D21
    decision: Handoff body redacted
    rationale: Refresh next steps after review 2
    by: baton
  - id: D22
    decision: Handoff body redacted
    rationale: Mark review 2 outcome
    by: baton
  - id: D23
    decision: Handoff body redacted
    rationale: "Correct pre-land merge-order guidance after verifying the subject filter and PR #32 files"
    by: baton
  - id: D24
    decision: Handoff body redacted
    rationale: "Refresh land next steps now that PR #35 exists and the human review gate is pending"
    by: baton
gate:
  required: true
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
  - phase: review
    at: 2026-09-29T04:39:47.713Z
    by: baton-review
    writer: ecb01d3baef0c1ea60b4aac41a9bca9af1d8e47b2ec3a39e7bcffc70a9f9ef29
    x-worktree: 44021efbcb1fff1d7f1e6203f63085c561c88e445424157a99a501a72531f564
    commit: c142fb7
    x-action: write
  - phase: review
    at: 2026-09-29T04:40:15.684Z
    by: baton
    writer: ecb01d3baef0c1ea60b4aac41a9bca9af1d8e47b2ec3a39e7bcffc70a9f9ef29
    x-worktree: 44021efbcb1fff1d7f1e6203f63085c561c88e445424157a99a501a72531f564
    commit: c142fb7
    x-action: redact
  - phase: review
    at: 2026-09-29T04:40:16.369Z
    by: baton
    writer: ecb01d3baef0c1ea60b4aac41a9bca9af1d8e47b2ec3a39e7bcffc70a9f9ef29
    x-worktree: 44021efbcb1fff1d7f1e6203f63085c561c88e445424157a99a501a72531f564
    commit: c142fb7
    x-action: redact
  - phase: review
    at: 2026-09-29T04:40:16.781Z
    by: baton
    writer: ecb01d3baef0c1ea60b4aac41a9bca9af1d8e47b2ec3a39e7bcffc70a9f9ef29
    x-worktree: 44021efbcb1fff1d7f1e6203f63085c561c88e445424157a99a501a72531f564
    commit: c142fb7
    x-action: redact
  - phase: review
    at: 2026-09-29T04:40:17.209Z
    by: baton
    writer: ecb01d3baef0c1ea60b4aac41a9bca9af1d8e47b2ec3a39e7bcffc70a9f9ef29
    x-worktree: 44021efbcb1fff1d7f1e6203f63085c561c88e445424157a99a501a72531f564
    commit: c142fb7
    x-action: redact
  - phase: review
    at: 2026-09-29T05:00:56.677Z
    by: baton
    writer: b50e1ce947eab4760f8d54acf9c5a9e44ece4cd7e547eaff4ed251d0d9d892d1
    x-worktree: c8d17e13e9ae0f664b030f7e432f71e7206fec9852219e5af8b9b9f9a0332b48
    commit: 24f661e
    x-action: redact
  - phase: land
    at: 2026-09-29T05:08:18.445Z
    by: baton
    writer: b50e1ce947eab4760f8d54acf9c5a9e44ece4cd7e547eaff4ed251d0d9d892d1
    x-worktree: c8d17e13e9ae0f664b030f7e432f71e7206fec9852219e5af8b9b9f9a0332b48
    commit: 7eab438
    x-action: write
  - phase: land
    at: 2026-09-29T05:08:29.468Z
    by: baton
    writer: b50e1ce947eab4760f8d54acf9c5a9e44ece4cd7e547eaff4ed251d0d9d892d1
    x-worktree: c8d17e13e9ae0f664b030f7e432f71e7206fec9852219e5af8b9b9f9a0332b48
    commit: 7eab438
    x-action: redact
updated_at: 2026-09-29T05:08:29.466Z
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
  - id: R3
    text: "R1 is resolved by D15 (owner route (a), PR #32). Quick land must run before further code lands on main; otherwise land receive fails with E_STALE_REVIEW against this review's reviewed tree."
    severity: medium
  - id: R4
    text: "F122: template-cleanup.yml names source quick batons by hand. Before tagging, git ls-files .baton/quick at the tag commit must be a subset of its remove list, or new maintainer batons ship to adopters and fail their first validate."
    severity: medium
  - id: R5
    text: "F122 pre-tag gate: at the tag commit, git ls-files .baton/quick must remain a subset of .baton/template-cleanup.yml remove. At land, both tracked quick files match its two listed source-owned quick paths; recheck immediately before tagging. No tag or three-OS dispatch in this land."
    severity: medium
review:
  findings_path: .baton/quick/pretag-fixes-001.review.json
  blocking_findings: 0
do_not_read:
  - path: specs/
    why: "Feature 001 lands separately at c85bf3f through PR #32; this quick lane must not edit it"
pr:
  url: https://github.com/dermonaco-labs/baton/pull/35
  number: 35
---
## Goal
Keep the work in scope.

## What changed
Review 2 (a755ff8..c142fb7): F110 fixed, adopt and its --no-workflows path remove only the two source-owned quick files, preserving adopter batons. F114: update rejects a conflicting .gitattributes marker before writing managed files or the manifest. F118: the alias self-review test removes the token first. Bundled CLI integration tests passed (303 pass, 1 skip), with npm ci, npm run check, baton validate, actionlint and shellcheck.

## Next steps
1. Review 2 (baton-review, independent checkout at c142fb7) verified F110, F114 and the F118 alias test; all findings are fixed or dismissed (see review.json x-review2-summary). F111 is resolved by owner route (a) via PR #32 (D15).
2. Land PR #35 is open for repository-owner review. PR #32 changes only a feature handoff and cannot by itself stale either reviewed code tree; either merge order is safe for those two baton-only diffs. New subject-code changes require a fresh receive/review check (R3).
3. Stop at the human gate: the repository owner reviews the land PR and runs `node .baton/bin/baton.mjs handoff approve --quick pretag-fixes-001 --by "repository owner" --via "pull request review"`. Before tagging, confirm `git ls-files .baton/quick` is a subset of the .baton/template-cleanup.yml remove list (R4, F122).

## Watch out for
- Escalate decisions that change behaviour or public contracts.
