---
baton: 1
lane: quick
feature: release-gate-repairs
phase_completed: work
next_phase: review
next_owner: baton-review
status: ready
model_role: review
suggested_model: claude-opus-5.5
summary: Restore exact owned-derived provenance and pinned sync verification, all-OS F39 prerequisites and normal integrity checks. Preserve legacy numeric failure diagnostics while adding a finite source-only check budget and foreground tree cleanup. Actual configured check exit evidence is required; next step is independent fresh-checkout review, not merge or release.
read_first:
  - path: .baton/quick/release-gate-repairs.md
    why: Owner decisions, scope, historical failed gates and local evidence
  - path: src/commands/sync.mjs
    why: Exact source/output boundary and fail-closed snapshot verification
  - path: src/lib/local-checks.mjs
    why: Finite budgets, compatible failures and owned tree cleanup
  - path: test/unit/sync.test.mjs
    why: Observed stale hashes, both outputs and genuine upstream negatives
  - path: test/unit/local-checks.test.mjs
    why: Real success, numeric failure, spawn error, timeout and cleanup evidence
  - path: test/unit/maintainer-workflows.test.mjs
    why: Unconditional F39/normal checks and pinned uv wiring
  - path: test/unit/manifest-command.test.mjs
    why: Canonical manifest freshness
artifacts: []
entry_checked: []
exit_criteria:
  - id: diff-nonempty
    met: true
    evidence: 22 changed files
  - id: local-checks-pass
    met: true
    evidence: |-
      baton: 0
      stdout (tail):
       for nested gitignore files (21.579ms)
      ✔ built-in phase defaults deeply match the shipped phase template (29.1404ms)
      ✔ every feature phase has entry and exit checks (1.6535ms)
      ✔ removing a built-in exit criterion warns (0.7383ms)
      ✔ check groups evaluate every member and preserve evidence (1.9051ms)
      ✔ check validation rejects unknown checks, malformed groups and duplicate keys (0.3412ms)
      ✔ weakened contract detects moving mandatory exit into a disjunction (1.2935ms)
      ✔ weakened contracts report removed entry checks, including quick-lane entry overrides (0.4857ms)
      ✔ weakened contracts report disabled human gates without flagging unchanged defaults (0.6025ms)
      ✔ shipped phase template is valid and never weakens its built-in contracts (30.1041ms)
      ✔ tracked Baton documentation contains no private feed hostnames (115.9711ms)
      ✔ shipped troubleshooting names no concrete registry host beyond public or placeholder hosts (1.135ms)
      ✔ adopter command table remains contiguous (0.9836ms)
      ✔ review instructions explain the normalized handoff payload (baton/skills/baton-review/SKILL.md) (1.1368ms)
      ✔ review instructions explain the normalized handoff payload (.github/skills/baton-review/SKILL.md) (0.833ms)
      ✔ every Baton-authored skill a pack installs is byte-identical to its baton/skills source (47.9304ms)
      ✔ maintainer workflow list matches template-cleanup keep_dormant and every workflow is classified (3.3797ms)
      ✔ compiles all draft 2020-12 schemas once (197.9209ms)
      ✔ findings fixture validates and invalid fixture reports a JSON pointer (4.2856ms)
      ✔ pack schema requires a classified reason for every optional reference (1.1839ms)
      ✔ sync bump explains pin and file changes for a PR body (1.9485ms)
      ✔ sync rejects unpinned bump values and check/bump combination (40.2801ms)
      ✔ pinned generator can refresh Baton-authored handoff outputs without blessing upstream drift (239.0597ms)
      ✔ generated registry preserves verified bytes when only installation time changes (9.335ms)
      ✔ generated Spec Kit manifest preserves locked bytes when file keys are reordered (7.1322ms)
      ✔ F52 every in-tree mkdtemp root used by tests is gitignored (1498.685ms)
      ✔ every feature phase and quick lane phase has a valid independent fixture (416.3504ms)
      ▶ each invalid baton fixture reports its named stable error, without unrelated errors
        ✔ E_ACTOR_FORMAT (160.2632ms)
        ✔ E_ANALYSIS_CRITICAL (8.9197ms)
        ✔ E_ANALYSIS_MISSING (9.1616ms)
        ✔ E_APPROVER_FORMAT (6.5152ms)
        ✔ E_BLOCKING_OPEN (9.2045ms)
        ✔ E_BODY_SECTIONS (5.3261ms)
        ✔ E_BUDGET (11.265ms)
        ✔ E_DENYLIST (5.14ms)
        ✔ E_EXIT_UNMET (5.7875ms)
        ✔ E_GATE_PENDING (145.0045ms)
        ✔ E_LANE_ESCALATE (2776.5404ms)
        ✔ E_LANE_MISMATCH (5.3977ms)
        ✔ E_MISSING_ARTIFACT (9.2862ms)
        ✔ E_MODEL_NOT_ALLOWED (10.0006ms)
        ✔ E_MULTIPLE_BATONS (10.0306ms)
        ✔ E_NO_PREREG (6.9037ms)
        ✔ E_OWNER (7.1102ms)
        ✔ E_PR_MISSING (6.4563ms)
        ✔ E_REVIEW_BLOCKING (355.8617ms)
        ✔ E_REVIEW_MISSING (9.9988ms)
        ✔ E_SCHEMA (12.5298ms)
        ✔ E_STALE_ARTIFACT (11.1259ms)
        ✔ E_TRANSITION (6.9883ms)
      ✔ each invalid baton fixture reports its named stable error, without unrelated errors (3657.729ms)
      ✔ quick phase checks require a reasoned decision, resolved findings and explicit scope evidence (194.008ms)
      ✔ feature phase checks reject missing story evidence, clarification and critical analysis (65.623ms)
      ▶ model allowlist warns in warn mode and errors in error mode
        ✔ warn mode emits W_MODEL_NOT_ALLOWED without an error (145.8847ms)
        ✔ error mode emits E_MODEL_NOT_ALLOWED (17.9908ms)
      ✔ model allowlist warns in warn mode and errors in error mode (217.0671ms)
      ✔ sample handoff satisfies its schema, phase contract, hashes and gate (175.0731ms)
      ✔ sample evidence uses LF bytes so checked-in fixture hashes stay portable (2.9378ms)
      ✔ malformed frontmatter is reported as E_FRONTMATTER_MALFORMED (50.8966ms)
      ✔ ready with a blocking question is rejected (162.5427ms)
      ✔ role-only A5 examples reject malformed approvers and actors with their stable codes (239.2832ms)
      ℹ tests 315
      ℹ suites 0
      ℹ pass 315
      ℹ fail 0
      ℹ cancelled 0
      ℹ skipped 0
      ℹ todo 0
      ℹ duration_ms 288061.1018
open_questions: []
decisions:
  - id: D1
    decision: Start a quick lane
    tag: quick-eligible
    rationale: Owner-authorized repair of generated Baton extension integrity drift and missing macOS/Windows uv prerequisite; restore FR-011/FR-012 and F39 without changing pins, public contracts or historical batons
    by: baton
  - id: D2
    decision: Record quick-lane review base
    rationale: Work starts at this commit
    tag: diff-base
    x-base-commit: 7abec5a1d771408f4712173eed3dbad1d881b76e
    by: baton
  - id: D3
    decision: Keep the authorized quick-lane restoration scope
    rationale: No new command, flag, schema contract, upstream pin or adopter behavior. Generated metadata, bundle, fixtures and required cleanup records account for the advisory file-budget warning. Feature-only speckit-analyze hooks do not apply to the quick contract under Constitution and C3; historical DONE batons remain unchanged.
    by: ce-work
  - id: D4
    decision: Authorize narrowly coupled timeout repair
    rationale: Windows npm run check passes, but its test stage takes 412.6 seconds and the existing phase gate allows only 300 seconds. Authorize a narrowly coupled timeout repair, or open an explicitly blocked draft PR and defer that repair?
    by: human:repository-owner
  - id: D5
    decision: Implement the separately owner-authorized bounded check configuration
    rationale: Q1/D4 and the delegated owner selection authorize optional timeout_ms with bounds 1..3600000 and the unchanged 300000ms default. Only the source suite uses 600000ms; adoption removes that override. This narrow addition supersedes D3's earlier no-schema-change scope statement.
    by: ce-work
  - id: D6
    decision: Stop after the single authorized changed formal gate failed
    rationale: The full check completed without timing out (314 tests, 313 pass, 1 fail, 0 skips; 326595.243ms). Existing F18 requires failing colon 7, but the runner now emits failing colon exit 7. E_CHECK_FAILED and the real nonzero exit are preserved; diagnostic compatibility is not. No full retry or successful phase write is authorized or claimed.
    by: ce-work
  - id: D7
    decision: Authorize the diagnostic compatibility repair and one changed formal gate
    rationale: Authorize restoring the legacy numeric failure-evidence prefix and one changed formal work-gate run after focused F18 validation?
    by: human:repository-owner
  - id: D8
    decision: Restore the normal numeric failure prefix under Q2/D7
    rationale: Owner selected Approve the compatibility fix and one formal run (Recommended) through control-plane delegation after the 313/314 failure was disclosed. Preserve the existing F18 assertion, exit 7 and E_CHECK_FAILED; keep explicit timeout/signal/spawn-error and output-limit failures. Nine focused real-process/CLI cases pass after the surgical correction. The final formal check is a newly authorized changed run, not an unchanged rerun.
    by: ce-work
  - id: D9
    decision: Stop at a reviewable PR with independent review pending
    rationale: The owner explicitly authorizes one coherent repair commit/push/PR. Leave next_phase at review for a fresh checkout, do not fabricate findings or approve a gate. New-PR owner merge approval and any new-RC three-OS smoke/release dry run remain separate. No dispatch, merge, settings, pins, tag/publication or adopter-budget change.
    by: ce-work
gate:
  required: false
  approved_by: null
  approved_at: null
history:
  - phase: work
    at: 2026-10-03T10:33:15.212Z
    by: baton
    writer: 335d071e9e92da4bf86b82c418267e2e45f6ca069cc113cf7d929bf71dd2d868
    x-worktree: 777ace4f832b301758a339fa3b1561dd95dfb2e20882b3956e77753e00cbcd5a
    commit: 7abec5a
    x-action: write
updated_at: 2026-10-03T10:28:06.761Z
updated_by: ce-work
risks:
  - id: R1
    text: Local Windows checks and structural-only actionlint do not prove hosted full lint, three-OS smoke or release artifacts. New-RC workflows require separate authorization.
    severity: medium
  - id: R2
    text: Timeout cleanup covers owned foreground process trees/groups, not deliberately daemonized/reparented jobs. Cleanup errors fail explicitly.
    severity: low
  - id: R3
    text: "F122/R5: both repair process paths are source-only cleanup removals; keep review records out of adopter payload."
    severity: medium
x-implementation-writer: 335d071e9e92da4bf86b82c418267e2e45f6ca069cc113cf7d929bf71dd2d868
x-implementation-worktree: 777ace4f832b301758a339fa3b1561dd95dfb2e20882b3956e77753e00cbcd5a
x-implementation-cycle: 590d33f11746e1a4893a55ac9ad67d53cc7a12c2f3281afd9554022a1107e4ba
---
## Goal
Repair the two release blockers at RC `7abec5a` and the separately
owner-authorized bounded local-check timeout. Preserve upstream pins,
default check behavior, historical batons and release permissions.

## What changed
The failing pinned sync was reproduced before changes. Commit `17016a0`
updated the authored handoff command and its copied-command lock row, but
left both generated hook skill copies stale. Sync treated the local
authored inputs as immutable Spec Kit bytes and refused regeneration.

The repair identifies exactly eight local-source extension copies/derived
hook outputs, verifies regular in-repository inputs, and records their
source paths/digests. Copied extension files must equal their authored
source. True Spec Kit/ATV bytes still require the prior pinned digest.
Only generated hook skill text and hooks YAML use canonical LF; upstream
template bytes remain untouched. Root `baton.lock.json` is authoritative.

Canonical sync changes only the two handoff-skill output hashes, from
`892e4bcb6225` to `c56e675e5c59`. Eight lock rows gain local provenance.
Canonical manifest refresh corrects those two hashes and the already
changed handoff-command hash; its installation time stays unchanged.
The upstream report and bundled CLI metadata are regenerated.

Normal Linux PR CI and `npm run check` now run unconditional pinned sync.
The manifest regression compares committed state to canonical generation.
macOS and Windows smoke install Ubuntu's exact pinned setup-uv action
before the same unconditional F39 scenarios; F39 assertions/skips are
unchanged. Both repair process paths are source-only cleanup removals.

Pre-registered regression batch: 14 tests, 10 pass / 4 expected failures
before fixes; then 14 pass / 0 fail. Negative coverage includes the exact
historical stale hash, both hook copies, actual pinned scripts, changed
ATV bytes, and a same-prefix non-owned extension path. A separate real-CLI
fixture confirms two byte-identical regenerations and six failing
`sync --check` cases (four tampered files and both historical stale hooks)
without writes. Every genuine upstream row and all pins remain identical.
Before the timeout repair, `npm run check` passed on Windows: 308 tests, zero failures or skips,
including live F39. A process-only PATH negative also reproduces F39's
`E_PREREQUISITE uv is required` when uv is absent. Workflow structural
lint passed with local actionlint 1.7.12 and external linters disabled;
the unbounded default invocation stalled and was stopped. Hosted CI's
pinned actionlint 1.7.7 remains the authoritative full workflow-lint gate.

Q1 was answered by the repository owner through control-plane delegation:
"Authorize narrowly coupled timeout repair." The new optional `timeout_ms`
has integer bounds 1..3,600,000 and retains the 300,000 ms default.
Only this source suite gets 600,000 ms, allowing margin above the measured
412.6-second test stage. Adoption strips that source-only budget while
replacing the source check, preserving the prior adopter default.
Timeout cleanup targets the live shell's PID tree on Windows or its
process group on POSIX. Foreground checks are required; no guarantee is
claimed for deliberately daemonized/reparented jobs. Timeout, cleanup,
output-limit and nonzero-exit failures remain failures with captured output.
Fast real-process regressions cover success, stderr/stdout failures,
deadline bounds, descendant cleanup and output overflow. Timeout and invalid
deadline cases were red before implementation; source budget leakage into
adopter config was also reproduced red before its directly coupled fix.
Q2/D7 records the owner's delegated selection: "Approve the compatibility
fix and one formal run (Recommended)." The normal nonzero-exit diagnostic
now preserves the legacy numeric prefix; timeout, signal and spawn errors
remain distinct. A real exit-7/output regression was red before correction,
then nine focused cases passed, including the unchanged F18 assertion.
The real spawn-error case runs on every OS; POSIX signal delivery is exercised
only on POSIX, where the shell has that signal behavior.

## Next steps
1. The Q2-authorized corrected formal work write passed. The actual
   configured `npm run check` completed with 315 tests, 315 pass, zero
   failures or skips; its test stage took 288,061.1018 ms. Successful
   `local-checks-pass` evidence is persisted above, with next phase review.
   Historical failure remains D6: 313/314 at 326,595.243 ms, F18's
   expected `failing: 7` versus then-emitted `failing: exit 7`,
   `E_EXIT_UNMET`, no successful write. Q2/D7 authorized the correction
   and the single changed run; no unchanged rerun occurred.
2. Independent
   `/baton-review --quick release-gate-repairs` in a fresh
   checkout, grounded in this scope and the registered regression evidence.
3. The owner-authorized repair PR is for independent review, not self-review
   or merge approval. No review findings file is fabricated by implementation.
4. Owner approval for this repair's merge remains separate. Three-OS hosted
   smoke and a fresh release dry run need separate authorization at a new
   merged RC; no dispatch, tag, release, publication or settings change here.

## Watch out for
- The larger quick diff includes the separately authorized optional bounded
  deadline field as well as generated metadata, tests and procedural docs.
  Default/adopter budgets and historical DONE batons are unchanged.
- Local Windows evidence does not establish hosted macOS/Linux smoke success.
