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
summary: "Prepare v0.1.3 bookkeeping for merged PR #50: bump CLI/package/source manifest and generated lock metadata, regenerate the bundle, and date the unchanged Fixed entries with an Upstream subsection. No product behavior, governance, component versions or upstream bytes changed. Publication and approval/merge of the exact final PR candidate remain separate owner actions."
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
    evidence: 12 changed files
  - id: local-checks-pass
    met: true
    evidence: |-
      baton: 0
      stdout (tail):
      ed phase template (18.9024ms)
      ✔ every feature phase has entry and exit checks (1.047ms)
      ✔ removing a built-in exit criterion warns (0.4618ms)
      ✔ check groups evaluate every member and preserve evidence (1.1292ms)
      ✔ check validation rejects unknown checks, malformed groups and duplicate keys (0.1883ms)
      ✔ weakened contract detects moving mandatory exit into a disjunction (0.7144ms)
      ✔ weakened contracts report removed entry checks, including quick-lane entry overrides (0.2425ms)
      ✔ weakened contracts report disabled human gates without flagging unchanged defaults (0.2276ms)
      ✔ shipped phase template is valid and never weakens its built-in contracts (17.4947ms)
      ✔ tracked Baton documentation contains no private feed hostnames (67.6561ms)
      ✔ shipped troubleshooting names no concrete registry host beyond public or placeholder hosts (0.7896ms)
      ✔ adopter command table remains contiguous (0.6243ms)
      ✔ review instructions explain the normalized handoff payload (baton/skills/baton-review/SKILL.md) (0.5772ms)
      ✔ review instructions explain the normalized handoff payload (.github/skills/baton-review/SKILL.md) (0.3543ms)
      ✔ every Baton-authored skill a pack installs is byte-identical to its baton/skills source (28.6203ms)
      ✔ maintainer workflow list matches template-cleanup keep_dormant and every workflow is classified (2.1395ms)
      ✔ compiles all draft 2020-12 schemas once (123.031ms)
      ✔ findings fixture validates and invalid fixture reports a JSON pointer (3.2122ms)
      ✔ pack schema requires a classified reason for every optional reference (0.8516ms)
      ✔ sync bump explains pin and file changes for a PR body (1.1969ms)
      ✔ sync rejects unpinned bump values and check/bump combination (27.4142ms)
      ✔ pinned generator can refresh Baton-authored handoff outputs without blessing upstream drift (155.3631ms)
      ✔ generated registry preserves verified bytes when only installation time changes (7.7853ms)
      ✔ generated Spec Kit manifest preserves locked bytes when file keys are reordered (4.804ms)
      ✔ F52 every in-tree mkdtemp root used by tests is gitignored (537.3991ms)
      ✔ every feature phase and quick lane phase has a valid independent fixture (217.3875ms)
      ✔ pre-existing feature baton without specify history or attachment still validates (102.0899ms)
      ▶ each invalid baton fixture reports its named stable error, without unrelated errors
        ✔ E_ACTOR_FORMAT (67.9151ms)
        ✔ E_ANALYSIS_CRITICAL (4.3759ms)
        ✔ E_ANALYSIS_MISSING (3.3406ms)
        ✔ E_APPROVER_FORMAT (2.9598ms)
        ✔ E_BLOCKING_OPEN (4.6806ms)
        ✔ E_BODY_SECTIONS (2.7134ms)
        ✔ E_BUDGET (5.9742ms)
        ✔ E_DENYLIST (2.8441ms)
        ✔ E_EXIT_UNMET (3.3973ms)
        ✔ E_GATE_PENDING (104.6953ms)
        ✔ E_LANE_ESCALATE (933.0376ms)
        ✔ E_LANE_MISMATCH (2.8194ms)
        ✔ E_MISSING_ARTIFACT (4.6522ms)
        ✔ E_MODEL_NOT_ALLOWED (5.3706ms)
        ✔ E_MULTIPLE_BATONS (4.0812ms)
        ✔ E_NO_PREREG (3.8346ms)
        ✔ E_OWNER (2.836ms)
        ✔ E_PR_MISSING (2.8981ms)
        ✔ E_REVIEW_BLOCKING (182.5702ms)
        ✔ E_REVIEW_MISSING (6.1989ms)
        ✔ E_SCHEMA (4.485ms)
        ✔ E_STALE_ARTIFACT (6.0008ms)
        ✔ E_TRANSITION (4.3472ms)
      ✔ each invalid baton fixture reports its named stable error, without unrelated errors (1399.9921ms)
      ✔ quick phase checks require a reasoned decision, resolved findings and explicit scope evidence (87.1651ms)
      ✔ feature phase checks reject missing story evidence, clarification and critical analysis (28.4686ms)
      ▶ model allowlist warns in warn mode and errors in error mode
        ✔ warn mode emits W_MODEL_NOT_ALLOWED without an error (80.9396ms)
        ✔ error mode emits E_MODEL_NOT_ALLOWED (9.3536ms)
      ✔ model allowlist warns in warn mode and errors in error mode (111.9887ms)
      ✔ sample handoff satisfies its schema, phase contract, hashes and gate (82.5966ms)
      ✔ sample evidence uses LF bytes so checked-in fixture hashes stay portable (2.5803ms)
      ✔ malformed frontmatter is reported as E_FRONTMATTER_MALFORMED (20.8052ms)
      ✔ ready with a blocking question is rejected (79.4823ms)
      ✔ role-only A5 examples reject malformed approvers and actors with their stable codes (110.8762ms)
      ℹ tests 420
      ℹ suites 0
      ℹ pass 420
      ℹ fail 0
      ℹ cancelled 0
      ℹ skipped 0
      ℹ todo 0
      ℹ duration_ms 218761.7382
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
    rationale: "Initial npm run build failed because esbuild was missing. npm ci --ignore-scripts --no-audit --no-fund --registry https://packagefeedproxy.microsoft.io/npm/ then passed (92 packages), without changing committed registry configuration. npm run build passed at 409433 bytes; node .baton\\bin\\baton.mjs sync and npm run manifest passed, with process-scoped UV_INDEX_URL/PIP_INDEX_URL using the approved PyPI proxy. Generator diffs are limited to the bundle/hash, baton_version and generated_by. git diff --check passed. npx --no-install markdownlint-cli2 CHANGELOG.md passed, one file, zero errors: the empty Unreleased heading requires no placeholder. A local node --input-type=module assertion reproduced release.yml tag/package equality and exact changelog-section/Upstream checks and verified lock pins: specify-cli 1.0.11 at 8147943512404afb9d99c6252cb9bf84369fd0b0, ATV main at ad996736b879be87c7755df5c5017d5336203bbc. git grep -lF 0.1.2 found only CHANGELOG history/comparison links, historical quick/review records and mdurl==0.1.2 in pinned requirements. The first formal work write ran npm run check: lint/typecheck/build-check/sync-check/lock/validate completed, but tests passed 419/420 with zero skips. Only test\\integration\\init.test.mjs:285 failed: its escaped v0\\.1\\.2 regex was not found by literal version grep. Updated that version-bound expectation to v0\\.1\\.3, an additional bookkeeping file also changed in v0.1.2. The failed write persisted no work receipt. A second formal work write is necessary to satisfy the mandatory local-check gate on the corrected complete candidate; no later bookkeeping-only broad check rerun is intended."
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
    rationale: "Attempt 3 failed E_EXIT_UNMET: the unchanged mandatory configured check could not resolve yamllint 1.37.1 through uvx --from yamllint==1.37.1 because fetching from files.pythonhosted.org failed with TLS HandshakeFailure. Tests were not reached and no work receipt was persisted. D8 and D9 describe the intent before that attempt, not its outcome. The coordinator verified UV_DEFAULT_INDEX=https://packagefeedproxy.microsoft.io/pypi/simple/ resolves yamllint 1.37.1, now cached, under the repository owner's instruction to use the laptop's internal feeds if packages are missing. Attempt 4 runs the supported handoff work write exactly once with that process environment variable set in the same PowerShell process. This changes package resolution only; .baton/config.yml, package.json scripts, .npmrc and all committed check/registry configuration remain unchanged. Failure means stop and report, not bypass or retry. Only a successful CLI-generated receipt attests the persisted check run."
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
updated_at: 2026-10-12T06:36:01.551Z
updated_by: ce-work
risks:
  - id: R1
    text: Owner approval/merge must bind the exact final candidate. Only after merge may publication proceed through dry_run and an annotated v0.1.3 tag; neither action is performed by this release-preparation task.
    severity: low
x-implementation-writer: 988aa794721f8b77458b1181afcc0937d13735294aa75536a64ebb09185f7704
x-implementation-worktree: 46b36b9f6e50ee03c442854234a616df7dcb9421de0a7bc290d33bebe1d45a1d
x-implementation-cycle: 485537b87c7f9021083de0ee801a0bb88e143954d9427613efcb8a041695cee5
---
## Goal
Keep the work in scope.

## What changed
Prepared the v0.1.3 release bookkeeping candidate; phase work is not yet persisted.

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
- Attempt 4: the supported work write uses the internal PyPI feed through the
  process environment variable
  `UV_DEFAULT_INDEX=https://packagefeedproxy.microsoft.io/pypi/simple/`.
  The coordinator verified yamllint 1.37.1 resolves through that feed and is cached.
  No committed check or registry configuration is changed. Only a successful
  CLI-generated receipt records this persisted run.
- The coordinator authorized this necessary execution within the repository owner's
  existing release scope; the verbatim approval is recorded in payload decision D9.
  No check-config bypass or discretionary duplicate suite is permitted.

## Next steps
1. `/ce-work`

## Watch out for
- Escalate decisions that change behaviour or public contracts.
