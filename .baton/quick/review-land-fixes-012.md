---
baton: 1
lane: quick
feature: review-land-fixes-012
phase_completed: work
next_phase: review
next_owner: baton-review
status: ready
model_role: review
suggested_model: claude-opus-5.5
summary: Restore pinned headless review coverage and clean published landing using Baton-owned wrappers only. Real Git/CLI RED and GREEN preserved. Full npm run check passes 381/381 with zero skips; explicit validate passes. Stop after a checked DRAFT patch PR at the unapproved owner gate; no merge, release, tag or compound authority.
read_first:
  - path: .baton/quick/review-land-fixes-012.md
    why: Authorized quick intent, exact base and relay identity
  - path: .baton/quick/review-land-fixes-012.work.json
    why: Test-first acceptance, evidence and owner decisions
  - path: baton/skills/baton-review/SKILL.md
    why: Pinned tracked diff equality and subject subset coverage
  - path: baton/skills/baton-land/SKILL.md
    why: External session capture and post-receipt publication check
  - path: test/integration/review-land-wrappers.test.mjs
    why: Actual CLI feature/quick scopes and real Git publication regressions
  - path: docs/03-workflow.md
    why: Related workflow contract explanation
  - path: .baton/template-cleanup.yml
    why: Frozen source-only cleanup coverage; do not edit
  - path: .baton/quick/release-records-docs-a7.md
    why: Exactly once authorized checksum refresh and fresh approval
  - path: CHANGELOG.md
    why: Patch metadata and unchanged upstream pins/components
artifacts: []
entry_checked: []
exit_criteria:
  - id: diff-nonempty
    met: true
    evidence: 18 changed files
  - id: local-checks-pass
    met: true
    evidence: |-
      baton: 0
      stdout (tail):
      t bytes for nested gitignore files (16.2873ms)
      ✔ built-in phase defaults deeply match the shipped phase template (17.7641ms)
      ✔ every feature phase has entry and exit checks (0.9923ms)
      ✔ removing a built-in exit criterion warns (0.4618ms)
      ✔ check groups evaluate every member and preserve evidence (1.2045ms)
      ✔ check validation rejects unknown checks, malformed groups and duplicate keys (0.2295ms)
      ✔ weakened contract detects moving mandatory exit into a disjunction (0.2093ms)
      ✔ weakened contracts report removed entry checks, including quick-lane entry overrides (1.1307ms)
      ✔ weakened contracts report disabled human gates without flagging unchanged defaults (0.286ms)
      ✔ shipped phase template is valid and never weakens its built-in contracts (18.8418ms)
      ✔ tracked Baton documentation contains no private feed hostnames (74.3139ms)
      ✔ shipped troubleshooting names no concrete registry host beyond public or placeholder hosts (0.9343ms)
      ✔ adopter command table remains contiguous (0.6798ms)
      ✔ review instructions explain the normalized handoff payload (baton/skills/baton-review/SKILL.md) (0.6967ms)
      ✔ review instructions explain the normalized handoff payload (.github/skills/baton-review/SKILL.md) (0.517ms)
      ✔ every Baton-authored skill a pack installs is byte-identical to its baton/skills source (30.8352ms)
      ✔ maintainer workflow list matches template-cleanup keep_dormant and every workflow is classified (2.7314ms)
      ✔ compiles all draft 2020-12 schemas once (133.7671ms)
      ✔ findings fixture validates and invalid fixture reports a JSON pointer (3.3698ms)
      ✔ pack schema requires a classified reason for every optional reference (1.1128ms)
      ✔ sync bump explains pin and file changes for a PR body (1.1284ms)
      ✔ sync rejects unpinned bump values and check/bump combination (25.9865ms)
      ✔ pinned generator can refresh Baton-authored handoff outputs without blessing upstream drift (153.0224ms)
      ✔ generated registry preserves verified bytes when only installation time changes (8.1197ms)
      ✔ generated Spec Kit manifest preserves locked bytes when file keys are reordered (4.9061ms)
      ✔ F52 every in-tree mkdtemp root used by tests is gitignored (473.073ms)
      ✔ every feature phase and quick lane phase has a valid independent fixture (236.5498ms)
      ▶ each invalid baton fixture reports its named stable error, without unrelated errors
        ✔ E_ACTOR_FORMAT (93.8929ms)
        ✔ E_ANALYSIS_CRITICAL (4.2658ms)
        ✔ E_ANALYSIS_MISSING (3.4505ms)
        ✔ E_APPROVER_FORMAT (3.6644ms)
        ✔ E_BLOCKING_OPEN (4.469ms)
        ✔ E_BODY_SECTIONS (4.2864ms)
        ✔ E_BUDGET (6.2415ms)
        ✔ E_DENYLIST (3.0881ms)
        ✔ E_EXIT_UNMET (4.0079ms)
        ✔ E_GATE_PENDING (82.9342ms)
        ✔ E_LANE_ESCALATE (932.1636ms)
        ✔ E_LANE_MISMATCH (3.0509ms)
        ✔ E_MISSING_ARTIFACT (3.6643ms)
        ✔ E_MODEL_NOT_ALLOWED (6.4124ms)
        ✔ E_MULTIPLE_BATONS (5.2466ms)
        ✔ E_NO_PREREG (5.0531ms)
        ✔ E_OWNER (5.0014ms)
        ✔ E_PR_MISSING (5.3801ms)
        ✔ E_REVIEW_BLOCKING (184.1521ms)
        ✔ E_REVIEW_MISSING (6.2255ms)
        ✔ E_SCHEMA (4.488ms)
        ✔ E_STALE_ARTIFACT (4.7158ms)
        ✔ E_TRANSITION (3.518ms)
      ✔ each invalid baton fixture reports its named stable error, without unrelated errors (1417.3775ms)
      ✔ quick phase checks require a reasoned decision, resolved findings and explicit scope evidence (100.2354ms)
      ✔ feature phase checks reject missing story evidence, clarification and critical analysis (35.2178ms)
      ▶ model allowlist warns in warn mode and errors in error mode
        ✔ warn mode emits W_MODEL_NOT_ALLOWED without an error (102.1627ms)
        ✔ error mode emits E_MODEL_NOT_ALLOWED (10.9879ms)
      ✔ model allowlist warns in warn mode and errors in error mode (152.8173ms)
      ✔ sample handoff satisfies its schema, phase contract, hashes and gate (99.1892ms)
      ✔ sample evidence uses LF bytes so checked-in fixture hashes stay portable (1.9332ms)
      ✔ malformed frontmatter is reported as E_FRONTMATTER_MALFORMED (21.5552ms)
      ✔ ready with a blocking question is rejected (90.1971ms)
      ✔ role-only A5 examples reject malformed approvers and actors with their stable codes (141.2765ms)
      ℹ tests 381
      ℹ suites 0
      ℹ pass 381
      ℹ fail 0
      ℹ cancelled 0
      ℹ skipped 0
      ℹ todo 0
      ℹ duration_ms 206704.1409
open_questions: []
decisions:
  - id: D1
    decision: Start a quick lane
    tag: quick-eligible
    rationale: Owner-authorized restoration of pinned review coverage and clean published landing; no new command or public contract
    by: baton
  - id: D2
    decision: Record quick-lane review base
    rationale: Work starts at this commit
    tag: diff-base
    x-base-commit: bf0753104b2c6c673dddc3e11dc04a567226bfc8
    by: baton
  - id: D3
    decision: Honor exact owner-authorized D1 and D2
    rationale: "User decision verbatim: D1 and D2 approved at 2026-10-10T23:39:24.666+02:00, relayed through the control plane, at HEAD bf0753104b2c6c673dddc3e11dc04a567226bfc8. D1 permits one checksum-only a7 refresh for frozen cleanup 5c7665fb92d76dfa38686f645edc26c30c34743ddb10c891ea9f88d6deeb453e -> eb375087dc59b79749b669cb62bc7b09b5d20f88a664c63601db77ea77402e5b and one fresh repository owner/control-plane delegation approval; both succeeded. D2 accepts the sealed receipt b9325658b90434da48aa6ccc5cd04152e5023709d7548982b1817550b0db5446 original 22-path advisory overage only. No patch acceptance, ready status, merge, release, dry-run, tag, compound or downstream authorization."
    by: baton-012-work
  - id: D4
    decision: Register and preserve actual CLI/Git test-first evidence
    rationale: test/integration/review-land-wrappers.test.mjs verifies actual bundled CLI feature/quick scopes against pinned CE Git commands, feature artifact and bookkeeping exclusions, untracked subject coverage, real bare-remote late-note behavior, external session capture and post-receipt publication ordering. Original RED preceded wrapper edits. Corrected fixture RED replay against pinned bf075310 wrappers fails 3/3, private log SHA256 5aa27d5c1ef5a7de63ff2b2fc4be51a61b0e29c2c23fa016f8e6142d1a6fecf1. Current GREEN passes 3/3 zero skips, private log SHA256 9faeb6e91906abf54fe8194ead548178b647c42e7ef2d3ef2bdfbcf057c16471. Initial feature-fixture and whitespace assertion failures remain immutable private evidence, not suppressed.
    by: baton-012-work
  - id: D5
    decision: Preserve supported ownership and genuine proof
    rationale: No CLI scope/proof/schema changes; E_STALE_REVIEW, E_SELF_REVIEW and exact diff-base requirements remain. Vendored ATV and all pinned upstream bytes remain immutable. Build, sync, manifest and build regenerate managed outputs through supported commands only. Extension/preset remain 0.1.0; CLI/package/generator are 0.1.2. Internal feeds were process-scoped only. Independent review must use gpt-6.1-sol medium in another checkout with its own identity; landing must also use a separate checkout. Freeze and stage reports before writing review proof, using the six frozen cleanup paths and actual timestamps inside lane-identifier directories.
    by: baton-012-work
  - id: D6
    decision: Report directly coupled assertion correction and final inventory
    rationale: "First resumed full gate reached 381 tests with one failure: test/integration/init.test.mjs expected the old v0.1.1 optional-pack command. One assertion changed to exact v0.1.2; coordinator expressly authorized it as path 23 beyond D2, with no substantive behavior increase. Failed full-gate log SHA256 c6edfa35b0f30c21964c2a547dc2233826192ecbefc1f2b965c042737f2490f9. Original 22 paths, path 23, a7 refresh and predictable phase/report receipts must be reported individually; do not disable quick-size validation or expand substantive scope. Second full gate passes 381/381 zero skips, log SHA256 da05b16c02ab029280b739660d3170527ca436b682f380331760d2e864ab0584; explicit validate exits 0, log SHA256 b154fbc7803f13e6e3fc3a288a8ed3d3fdd1b0921474e8cdf19a2967294f479b. No review report is force-staged after proof."
    by: baton-012-work
gate:
  required: false
  approved_by: null
  approved_at: null
history:
  - phase: work
    at: 2026-10-10T21:54:54.876Z
    by: baton-012-work
    writer: b5a82393a0bb580295ad171e52df41be426c99f1ea6588cdb38e1e3f4706c9ec
    x-worktree: ea27aaadedaa3658e0445b1bad9ab10f00b04bbbc54eec622cf8a4598436d1c8
    commit: bf07531
    x-action: write
updated_at: 2026-10-10T21:51:09.988Z
updated_by: ce-work
risks:
  - id: R1
    text: "CE headless is prompt-driven: stop if exact base/file coverage cannot be proved; independent review must inspect both sets."
    severity: medium
  - id: R2
    text: "Post-review report staging invalidates subject proof: use fixed directories and stage/freeze reports before review write; preserve all genuine errors."
    severity: medium
x-implementation-writer: b5a82393a0bb580295ad171e52df41be426c99f1ea6588cdb38e1e3f4706c9ec
x-implementation-worktree: ea27aaadedaa3658e0445b1bad9ab10f00b04bbbc54eec622cf8a4598436d1c8
x-implementation-cycle: 2a1754d27502354bf8ebae149fab7f6419fc2ef214b77a5e576214840f8a126a
---
## Goal
Keep the work in scope.

## What changed
Pending phase work.

## Next steps
1. `/ce-work`

## Watch out for
- Escalate decisions that change behaviour or public contracts.
