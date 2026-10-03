---
baton: 1
lane: quick
feature: release-gate-repairs
phase_completed: review
next_phase: work
next_owner: ce-work
status: needs-human
model_role: implementation
suggested_model: gpt-6-sol
summary: Independent ce-review headless run reviewed code 23a0c969 against 7abec5a with seven real installed personas and all 29 changed files. One open P2 cleanup-failure coverage gap; no observed runtime defect or P0/P1 finding. Return to work awaiting separate owner authorization, not land or merge.
read_first:
  - path: .baton/quick/release-gate-repairs.review.json
    why: Open R1 and actual independent reviewer provenance
  - path: .context/compound-engineering/ce-review/release-gate-repairs-20261003/report.json
    why: Real persona results, exact 29-file scope, earlier evidence boundaries and limitations
  - path: .baton/quick/release-gate-repairs.md
    why: Owner decisions and unchanged historical work evidence
artifacts: []
entry_checked: []
exit_criteria:
  - id: findings-json-valid
    met: true
    evidence: .baton/quick/release-gate-repairs.review.json
  - id: quick-scope-held
    met: true
    evidence: "All 29 paths serve the recorded repair: eight exact owned-derived mappings, regenerated hooks/metadata, pinned uv prerequisites and integrity gates, plus D4/D5's separately owner-authorized bounded timeout schema addition and Q2 numeric diagnostic compatibility. D5 explicitly supersedes D3's no-schema-change statement; this is not a claim that timeout_ms is no contract addition. No change beyond those recorded authorizations, upstream pin, adopter default budget or release authority is introduced. Seven bookkeeping/generated paths supplement the 22 implementation paths."
open_questions:
  - id: Q3
    question: Authorize a bounded regression for R1 that forces foreground process-tree cleanup failure and verifies prompt E_CHECK_FAILED rejection with captured diagnostics?
    blocking: true
    options:
      - Authorize the focused regression fix
      - Keep the finding open and defer the repair
    owner: human:repository-owner
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
  - id: D10
    decision: Hold the expressly authorized repair scope
    tag: quick-scope-held
    rationale: "All 29 paths serve the recorded repair: eight exact owned-derived mappings, regenerated hooks/metadata, pinned uv prerequisites and integrity gates, plus D4/D5's separately owner-authorized bounded timeout schema addition and Q2 numeric diagnostic compatibility. D5 explicitly supersedes D3's no-schema-change statement; this is not a claim that timeout_ms is no contract addition. No change beyond those recorded authorizations, upstream pin, adopter default budget or release authority is introduced. Seven bookkeeping/generated paths supplement the 22 implementation paths."
    by: baton-review
  - id: D11
    decision: Preserve the open testing finding without implementation
    rationale: The genuine formal run returned one P2 gap in cleanup-rejection regression coverage. Preserve R1 as open; route review to work and stop for separate owner authorization. No fake fixed/dismissed disposition, runtime failure reproduction, merge approval or test rerun is claimed.
    by: baton-review
  - id: D12
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: 41e77dc5b0164492ddb43bf3c72e65d824912ee44bc9020264212d8cec65d42d
    x-base-commit: 7abec5a1d771408f4712173eed3dbad1d881b76e
    by: baton
  - id: D13
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: 23a0c9690f99651ee5861942436541714df365c7
    by: baton
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
  - phase: review
    at: 2026-10-03T11:14:24.972Z
    by: baton-review
    writer: 0257db31ca4f3b101504b9a3ed3c06498cd3677bc8c57a95afae526ab91f496f
    x-worktree: 200e302ac3614ab4bd231313dd1301575b602b15591149776e3737a5e461fd89
    commit: 23a0c96
    x-action: write
updated_at: 2026-10-03T11:14:24.966Z
updated_by: baton-review
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
review:
  findings_path: .baton/quick/release-gate-repairs.review.json
  blocking_findings: 0
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

### Work-phase next steps (historical)
1. The Q2-authorized corrected formal work write passed. The actual
   configured `npm run check` completed with 315 tests, 315 pass, zero
   failures or skips; its test stage took 288,061.1018 ms. Successful
   `local-checks-pass` evidence was persisted at code commit `23a0c969`,
   with next phase review. The review transition replaces the active exit
   criteria; the historical result remains in that commit and the run artifact.
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

### Formal independent review

One genuine `ce-review mode:headless` run, `release-gate-repairs-20261003`,
reviewed code `23a0c9690f99651ee5861942436541714df365c7` against
`7abec5a1d771408f4712173eed3dbad1d881b76e`. Seven real installed persona
tasks returned: correctness, testing, maintainability, project standards,
agent native, learnings and adversarial. This is separate from the earlier
single-context report. All 29 changed paths were covered: the 22
implementation paths plus seven generated/bookkeeping paths.

The run artifact is
`.context/compound-engineering/ce-review/release-gate-repairs-20261003/report.json`;
normalized findings are `.baton/quick/release-gate-repairs.review.json`.
Both process paths are explicitly cleanup-removable, not adopter content.
Reviewer app session `34c127ba-26a4-4548-93ce-54bd38e4a704` and CLI
session `121f8696-d464-4e62-8ecc-41672feb8e24` are distinct from implementation.
The CLI recorded its own reviewer writer and checkout identities in history.

R1 is an open P2 testing gap, confidence 0.93:
`src/lib/local-checks.mjs:60` rejects when tree termination fails, but the
committed timeout/output-limit regressions only exercise successful cleanup.
A bounded forced-cleanup-failure regression should verify prompt
`E_CHECK_FAILED` rejection with captured diagnostics and independently
clean its fixture processes. No runtime defect was reproduced, no finding
was fixed or dismissed, and no extra test or full suite was run.

The formal handoff explicitly returns to `work`, with `status: needs-human`
and blocking Q3 for separate fix authorization. Zero P0/P1 findings does
not mean all findings are resolved or that landing is approved.
The earlier independent 74 unit and two integration passes, type checking,
bundle freshness and lock verification apply only to code `23a0c969`.
The writer's 315/315 result and historical D6 failure retain their original
provenance. Green automatic checks observed at `23a0c969` do not establish
checks for the later evidence commit or fresh three-OS release validation.

## Watch out for
- The larger quick diff includes the separately authorized optional bounded
  deadline field as well as generated metadata, tests and procedural docs.
  Default/adopter budgets and historical DONE batons are unchanged.
- Local Windows evidence does not establish hosted macOS/Linux smoke success.
