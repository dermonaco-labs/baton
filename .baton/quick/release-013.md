---
baton: 1
lane: quick
feature: release-013
phase_completed: work
next_phase: review
next_owner: baton-review
status: ready
model_role: review
suggested_model: claude-opus-5.5
summary: "Resolve independent v0.1.3 review findings R013-1 and R013-2: replace adopter-specific feed addresses with approved-feed placeholders and refresh current-state narrative. Attempt 4 persisted a successful 420/420 work receipt in candidate 7e5eb2c; preserve all earlier failure records and the independent review findings unchanged. No product behavior, contracts, component versions or upstream bytes change. Fresh independent review of the corrected candidate is required; no PR, merge, tag or dispatch is performed."
read_first:
  - path: .baton/quick/release-013.md
    why: Release-preparation intent, pinned diff base and relay state
  - path: .baton/quick/release-013.work.json
    why: Bookkeeping-only scope, validation evidence and publication boundary
  - path: CHANGELOG.md
    why: Dated v0.1.3 release notes and unchanged upstream pins
artifacts: []
entry_checked: []
exit_criteria:
  - id: diff-nonempty
    met: true
    evidence: 2 changed files
  - id: local-checks-pass
    met: true
    evidence: |-
      baton: 0
      stdout (tail):
      pped phase template (15.7697ms)
      ✔ every feature phase has entry and exit checks (1.2233ms)
      ✔ removing a built-in exit criterion warns (0.4676ms)
      ✔ check groups evaluate every member and preserve evidence (1.1071ms)
      ✔ check validation rejects unknown checks, malformed groups and duplicate keys (0.7423ms)
      ✔ weakened contract detects moving mandatory exit into a disjunction (0.2225ms)
      ✔ weakened contracts report removed entry checks, including quick-lane entry overrides (0.2234ms)
      ✔ weakened contracts report disabled human gates without flagging unchanged defaults (0.2106ms)
      ✔ shipped phase template is valid and never weakens its built-in contracts (15.9703ms)
      ✔ tracked Baton documentation contains no private feed hostnames (86.9987ms)
      ✔ shipped troubleshooting names no concrete registry host beyond public or placeholder hosts (0.5836ms)
      ✔ adopter command table remains contiguous (0.4684ms)
      ✔ review instructions explain the normalized handoff payload (baton/skills/baton-review/SKILL.md) (0.4647ms)
      ✔ review instructions explain the normalized handoff payload (.github/skills/baton-review/SKILL.md) (1.4072ms)
      ✔ every Baton-authored skill a pack installs is byte-identical to its baton/skills source (23.6798ms)
      ✔ maintainer workflow list matches template-cleanup keep_dormant and every workflow is classified (2.1605ms)
      ✔ compiles all draft 2020-12 schemas once (102.3282ms)
      ✔ findings fixture validates and invalid fixture reports a JSON pointer (2.9393ms)
      ✔ pack schema requires a classified reason for every optional reference (0.6886ms)
      ✔ sync bump explains pin and file changes for a PR body (1.0805ms)
      ✔ sync rejects unpinned bump values and check/bump combination (22.954ms)
      ✔ pinned generator can refresh Baton-authored handoff outputs without blessing upstream drift (139.8102ms)
      ✔ generated registry preserves verified bytes when only installation time changes (7.4497ms)
      ✔ generated Spec Kit manifest preserves locked bytes when file keys are reordered (5.0957ms)
      ✔ F52 every in-tree mkdtemp root used by tests is gitignored (519.5887ms)
      ✔ every feature phase and quick lane phase has a valid independent fixture (191.1166ms)
      ✔ pre-existing feature baton without specify history or attachment still validates (90.5869ms)
      ▶ each invalid baton fixture reports its named stable error, without unrelated errors
        ✔ E_ACTOR_FORMAT (60.0087ms)
        ✔ E_ANALYSIS_CRITICAL (3.2851ms)
        ✔ E_ANALYSIS_MISSING (3.1525ms)
        ✔ E_APPROVER_FORMAT (3.5298ms)
        ✔ E_BLOCKING_OPEN (4.6124ms)
        ✔ E_BODY_SECTIONS (2.6719ms)
        ✔ E_BUDGET (5.4605ms)
        ✔ E_DENYLIST (2.6342ms)
        ✔ E_EXIT_UNMET (2.5056ms)
        ✔ E_GATE_PENDING (69.1432ms)
        ✔ E_LANE_ESCALATE (755.7507ms)
        ✔ E_LANE_MISMATCH (2.1675ms)
        ✔ E_MISSING_ARTIFACT (4.4708ms)
        ✔ E_MODEL_NOT_ALLOWED (5.1125ms)
        ✔ E_MULTIPLE_BATONS (4.4552ms)
        ✔ E_NO_PREREG (3.4971ms)
        ✔ E_OWNER (2.5367ms)
        ✔ E_PR_MISSING (2.8722ms)
        ✔ E_REVIEW_BLOCKING (167.798ms)
        ✔ E_REVIEW_MISSING (4.8405ms)
        ✔ E_SCHEMA (3.3608ms)
        ✔ E_STALE_ARTIFACT (3.8171ms)
        ✔ E_TRANSITION (3.0995ms)
      ✔ each invalid baton fixture reports its named stable error, without unrelated errors (1146.704ms)
      ✔ quick phase checks require a reasoned decision, resolved findings and explicit scope evidence (80.7246ms)
      ✔ feature phase checks reject missing story evidence, clarification and critical analysis (23.9009ms)
      ▶ model allowlist warns in warn mode and errors in error mode
        ✔ warn mode emits W_MODEL_NOT_ALLOWED without an error (61.6567ms)
        ✔ error mode emits E_MODEL_NOT_ALLOWED (9.5482ms)
      ✔ model allowlist warns in warn mode and errors in error mode (95.4993ms)
      ✔ sample handoff satisfies its schema, phase contract, hashes and gate (84.3681ms)
      ✔ sample evidence uses LF bytes so checked-in fixture hashes stay portable (1.3625ms)
      ✔ malformed frontmatter is reported as E_FRONTMATTER_MALFORMED (17.2859ms)
      ✔ ready with a blocking question is rejected (70.2484ms)
      ✔ role-only A5 examples reject malformed approvers and actors with their stable codes (93.7534ms)
      ℹ tests 420
      ℹ suites 0
      ℹ pass 420
      ℹ fail 0
      ℹ cancelled 0
      ℹ skipped 0
      ℹ todo 0
      ℹ duration_ms 200797.1169
open_questions: []
decisions:
  - id: D1
    decision: Start a quick lane
    tag: quick-eligible
    rationale: "v0.1.3 release preparation for merged PR #50 (pre-Baton partial-feature attachment fix)"
    by: baton
  - id: D2
    decision: Record quick-lane review base
    rationale: Work starts at this commit
    tag: diff-base
    x-base-commit: bf0fc4b4ff6bd4fca068e116e5f4a03014a76146
    by: baton
  - id: D3
    decision: Record the relayed release-preparation authorization without approving the final PR
    rationale: "At 2026-10-12T08:16:10+02:00 the repository owner authorized via coordinator relay, verbatim: authorized Baton release preparation and publication. This task prepares the v0.1.3 PR only. No PR-review approval, merge approval, tag creation or release workflow dispatch is inferred. The quick baton required no initial scope gate."
    by: release-013-work
  - id: D4
    decision: Keep this mechanical patch bump in the supported quick lane
    rationale: "The same version bump locations as v0.1.2 are updated to 0.1.3, including the pinned install hint and integration expectation. Extension/preset versions remain 0.1.0; existing Fixed entries are preserved verbatim. The quick lane has no spec/plan/tasks artifacts, so speckit-analyze was loaded but is not executable: its mandatory prerequisite is a complete feature tasks.md. The existing quick receive verified quick-eligible and no-feature-tasks; no feature phase or human approval is fabricated. The configured ten-file advisory maximum is exceeded only by mechanical version and generated bookkeeping files, not new behavior or contracts."
    by: release-013-work
  - id: D5
    decision: Use supported generators and verify release guards locally
    rationale: "Initial npm run build failed because esbuild was missing. npm ci --ignore-scripts --no-audit --no-fund --registry <approved internal npm feed> then passed (92 packages), without changing committed registry configuration. npm run build passed at 409433 bytes; node .baton\\bin\\baton.mjs sync and npm run manifest passed, with process-scoped UV_INDEX_URL/PIP_INDEX_URL using the approved PyPI proxy. Generator diffs are limited to the bundle/hash, baton_version and generated_by. git diff --check passed. npx --no-install markdownlint-cli2 CHANGELOG.md passed, one file, zero errors: the empty Unreleased heading requires no placeholder. A local node --input-type=module assertion reproduced release.yml tag/package equality and exact changelog-section/Upstream checks and verified lock pins: specify-cli 1.0.11 at 8147943512404afb9d99c6252cb9bf84369fd0b0, ATV main at ad996736b879be87c7755df5c5017d5336203bbc. git grep -lF 0.1.2 found only CHANGELOG history/comparison links, historical quick/review records and mdurl==0.1.2 in pinned requirements. The first formal work write ran npm run check: lint/typecheck/build-check/sync-check/lock/validate completed, but tests passed 419/420 with zero skips. Only test\\integration\\init.test.mjs:285 failed: its escaped v0\\.1\\.2 regex was not found by literal version grep. Updated that version-bound expectation to v0\\.1\\.3, an additional bookkeeping file also changed in v0.1.2. The failed write persisted no work receipt. A second formal work write is necessary to satisfy the mandatory local-check gate on the corrected complete candidate; no later bookkeeping-only broad check rerun is intended."
    by: release-013-work
  - id: D7
    decision: Verify the corrected install-hint expectation before retrying the required gate
    rationale: node --test --test-name-pattern "derived install explains" test\integration\init.test.mjs passed 1/1, zero skips. git diff --check passed; git grep -nF '0\.1\.2' -- src test found no remaining escaped old-version expectations. The initial 419/420 full result remains disclosed in D5; it is not represented as a successful candidate check.
    by: release-013-work
  - id: D6
    decision: "Reuse merged PR #50 product evidence as historical context only"
    rationale: "Product code from PR #50 is unchanged. Coordinator-provided evidence: independently reviewed product head 333694292462a9f7513907c14a410f4cba35af87, clean final review, npm run check 420/420, focused attachment tests 38/38; accepted head 56f193a automatic checks green (Baton run 38173469009, CI 38173469143, Windows smoke 38173469055). This does not attest that the v0.1.3 candidate has been reviewed or owner-approved. Fresh release-bookkeeping review and automatic PR checks remain required."
    by: release-013-work
  - id: D8
    decision: Record the completed candidate check and the rejected receipt honestly
    rationale: "Attempt 2: the corrected-candidate work write executed npm run check successfully: 420 tests, 420 passed, zero failures/skips/cancellations; duration_ms 206252.2998. After that successful check, the CLI rejected the receipt with E_ACTOR_FORMAT because the supplied decision by fields used a MemPalace identity, which is not a Baton agent identifier. All decision by fields are now release-013-work, matching Baton's agent-identifier syntax. No work receipt was persisted by attempt 1 (419/420, corrected escaped install-hint expectation) or attempt 2. Attempt 2 is historical check evidence, not a persisted phase receipt. Attempt 3 is the final supported work write authorized in D9; only a successful write and its CLI-generated evidence attest that persisted run. No check is skipped, forged or configured away."
    by: release-013-work
  - id: D9
    decision: Run the mandatory configured check once more to persist the final supported work receipt
    rationale: "The coordinator relayed the repository owner's already-authorized release scope and approved, verbatim: Proceed with one final supported work-write and its mandatory configured npm run check. This is approval of necessary execution within the already-authorized release scope, not a new owner decision. Preserve the failed 419/420 and E_ACTOR_FORMAT history accurately; do not label the earlier green run as a persisted receipt. The proportional-validation instruction prohibits discretionary duplicate suites, not repository-required receipt validation. No check-config bypass. Attempt 3 will use the unchanged configured npm run check through handoff write exactly once; failure means stop, not bypass or retry. No independent review, PR creation, merge, tag or workflow dispatch is authorized by this execution instruction."
    by: release-013-work
  - id: D10
    decision: Disclose attempt 3's environmental failure and use the authorized internal feed for attempt 4
    rationale: "Attempt 3 failed E_EXIT_UNMET: the unchanged mandatory configured check could not resolve yamllint 1.37.1 through uvx --from yamllint==1.37.1 because fetching from files.pythonhosted.org failed with TLS HandshakeFailure. Tests were not reached and no work receipt was persisted. D8 and D9 describe the intent before that attempt, not its outcome. The coordinator verified UV_DEFAULT_INDEX=<approved internal PyPI feed> resolves yamllint 1.37.1, now cached, under the repository owner's instruction to use the laptop's internal feeds if packages are missing. Attempt 4 runs the supported handoff work write exactly once with that process environment variable set in the same PowerShell process. This changes package resolution only; .baton/config.yml, package.json scripts, .npmrc and all committed check/registry configuration remain unchanged. Failure means stop and report, not bypass or retry. Only a successful CLI-generated receipt attests the persisted check run."
    by: release-013-work
  - id: D11
    decision: Confirm the bounded release diff stays in the quick lane
    tag: quick-scope-held
    rationale: Exact pinned review covers all 17 files and includes all 12 CLI subjects. Source/tests change version identifiers only; the generated bundle equals base bytes with 0.1.2 replaced by 0.1.3. Manifest/lock metadata, changelog dating and process receipts change without adding user-facing behavior, public contracts, upstream bytes or component versions. The advisory file-count excess is mechanical bookkeeping, not expanded product scope.
    by: release-013-review
  - id: D12
    decision: Preserve open P2/P3 findings and request supported return to work
    rationale: The caller forbids applying fixes. Internal-feed addresses violate the constitution, and stale handoff prose conflicts with the successful persisted work receipt. Neither finding is fixed or dismissed. Use supported review --next work rather than land, since automatic blocking_findings counts only open P0/P1. Do not inflate severity, fabricate a disposition, bypass findings-fixed-or-dismissed or imply owner approval. The author must resolve both records and obtain review of the corrected candidate.
    by: release-013-review
  - id: D13
    decision: Reuse unchanged product evidence without redundant broad checks
    rationale: "The candidate frontmatter honestly records a successful persisted npm run check 420/420. PR #50 evidence supplied by the coordinator remains historical product evidence only: independent reviewed head 333694292462a9f7513907c14a410f4cba35af87, clean review, 420/420 checks, 38/38 attachment tests and accepted 56f193a green runs. This review performs bounded metadata/bundle/guard inspections and offline validation, not a new broad suite, final PR approval, tag or workflow dispatch."
    by: release-013-review
  - id: D14
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: 444fd48c8b1eede9f3bc9388d7c774172da7ec14b2039c5956a691c5ffe16d92
    x-base-commit: bf0fc4b4ff6bd4fca068e116e5f4a03014a76146
    by: baton
  - id: D15
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: 7e5eb2c35664b086fa7d4795546a706ef06c8141
    by: baton
  - id: D16
    decision: Record R013-1 as fixed with bounded evidence
    rationale: "R013-1 disposition: fixed. Replace concrete internal npm/PyPI addresses in release-013.md and release-013.work.json with approved-feed placeholders. Historical commands, counts and outcomes remain unchanged; package resolution uses process environment only. Verification: git grep for the prohibited feed hostnames over tracked files changed since bf0fc4b must return no matches before commit. The independent review.json and CE artifacts remain unchanged; re-review must verify this disposition."
    by: release-013-work
  - id: D17
    decision: Record R013-2 as fixed while preserving historical failures
    rationale: "R013-2 disposition: fixed. Current-state body now records attempt 4's persisted successful 420/420 work receipt in candidate 7e5eb2c, the independent review's R013-1/R013-2 return to work, and this cycle's resolutions with independent re-review next. Attempts 1 (419/420), 2 (420/420 followed by E_ACTOR_FORMAT), and 3 (yamllint TLS failure and E_EXIT_UNMET) remain explicit. D8-D10 preserve their historical pre-attempt intent, not current instructions. Review findings content is unchanged pending independent verification."
    by: release-013-work
  - id: D18
    decision: Run this cycle's mandatory configured work check once
    rationale: The author was instructed to resolve only R013-1/R013-2 and perform one supported handoff write --phase work --quick release-013 --from-json .baton/quick/release-013.work.json with UV_DEFAULT_INDEX supplied in the same PowerShell process. The unchanged mandatory npm run check is required to persist this work cycle, not a discretionary duplicate suite. Failure means stop and report. No PR, merge, tag, workflow dispatch, registry/check configuration change or author-written review receipt is authorized.
    by: release-013-work
gate:
  required: false
  approved_by: null
  approved_at: null
history:
  - phase: work
    at: 2026-10-12T06:39:57.011Z
    by: baton
    writer: 988aa794721f8b77458b1181afcc0937d13735294aa75536a64ebb09185f7704
    x-worktree: 46b36b9f6e50ee03c442854234a616df7dcb9421de0a7bc290d33bebe1d45a1d
    commit: bf0fc4b
    x-action: write
  - phase: review
    at: 2026-10-12T06:47:24.242Z
    by: release-013-review
    writer: 316909f95df3e27f8f953b60106be748c15f98576f2d662a3026c561ef645e27
    x-worktree: 7403127df000ae46745c0d311c3242f2147db9b506965b1aa8bf8224623ede13
    commit: 7e5eb2c
    x-action: write
  - phase: work
    at: 2026-10-12T06:58:09.435Z
    by: baton
    writer: 988aa794721f8b77458b1181afcc0937d13735294aa75536a64ebb09185f7704
    x-worktree: 46b36b9f6e50ee03c442854234a616df7dcb9421de0a7bc290d33bebe1d45a1d
    commit: 264a78b
    x-action: write
updated_at: 2026-10-12T06:54:29.373Z
updated_by: ce-work
risks:
  - id: R1
    text: Owner approval/merge must bind the exact final candidate. Only after merge may publication proceed through dry_run and an annotated v0.1.3 tag; neither action is performed by this release-preparation task.
    severity: low
x-implementation-writer: 988aa794721f8b77458b1181afcc0937d13735294aa75536a64ebb09185f7704
x-implementation-worktree: 46b36b9f6e50ee03c442854234a616df7dcb9421de0a7bc290d33bebe1d45a1d
x-implementation-cycle: 79ddc473dcea870fe2e30544ecf815219144eb8b31f6abe01a1eb9e83b39d873
review:
  findings_path: .baton/quick/release-013.review.json
  blocking_findings: 0
---
## Goal
Keep the work in scope.

## What changed
Prepared the v0.1.3 release bookkeeping candidate. Attempt 4 persisted the supported
work receipt with 420/420 tests at candidate 7e5eb2c. Independent review of that
candidate returned R013-1 (internal-feed addresses) and R013-2 (stale current-state
narrative) to work. This work cycle resolves both without changing product behavior,
historical outcomes, or the independent review findings.

## Validation history
- Attempt 1: configured `npm run check` failed, 419/420 tests passed. The escaped
  install-hint expectation in `test/integration/init.test.mjs` still matched v0.1.2;
  it was corrected to v0.1.3. No work receipt was persisted.
- Attempt 2: configured `npm run check` passed, 420/420 tests, but the receipt write
  was rejected with `E_ACTOR_FORMAT`. Actor fields were corrected to a valid agent
  identifier. This green run is historical evidence, not a persisted receipt.
- Attempt 3: the mandatory configured check failed with `E_EXIT_UNMET` because
  `uvx --from yamllint==1.37.1` could not fetch from files.pythonhosted.org
  (`TLS HandshakeFailure`). This was an environmental package-resolution failure;
  tests were not reached and no work receipt was persisted.
- Attempt 4: the supported work write succeeded using the approved internal PyPI feed through the
  process environment variable
  `UV_DEFAULT_INDEX=<approved internal PyPI feed>`.
  The coordinator verified yamllint 1.37.1 resolves through that feed and is cached.
  The CLI persisted the work receipt: configured `npm run check` passed 420/420
  tests, zero failures/skips/cancellations, in candidate 7e5eb2c.
  No committed check or registry configuration was changed.
- The coordinator authorized this necessary execution within the repository owner's
  existing release scope; the verbatim approval is recorded in payload decision D9.
  No check-config bypass or discretionary duplicate suite is permitted.

## Next steps
1. Independent `/baton-review` must inspect the corrected pushed candidate, verify
   R013-1/R013-2 dispositions, and write a fresh review receipt before landing.

## Watch out for
- Escalate decisions that change behaviour or public contracts.
