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
summary: Owner-authorized POSIX fixture cleanup correction preserves both ESRCH assertions and bounded real survival/error/streams checks. Native Linux and Windows focused6/6 pass; controlled delayed-reaping proof retained. Prior configured attempt failed E_BUDGET before tests; only new prose compacted to actual150-line unchanged budget, standard validation passes. This is the one fresh changed attempt authorized by owner; independent review pending, land paused.
read_first:
  - path: test/unit/local-checks.test.mjs
    why: POSIX-only fixture child-first cleanup; all existing meaningful assertions retained
  - path: .baton/quick/release-gate-repairs.md
    why: D20 recovery, owner authorizations, native runtime/controlled proof and historical failed gate
  - path: .baton/quick/release-gate-repairs.review.json
    why: Historical genuine reviewer disposition/provenance unchanged, not independently reaccepted
  - path: .context/compound-engineering/ce-review/release-gate-repairs-r1-20261003/report.json
    why: Original Windows-limited independent evidence retains its tested SHA
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
      ytes for nested gitignore files (21.8119ms)
      ✔ built-in phase defaults deeply match the shipped phase template (21.1454ms)
      ✔ every feature phase has entry and exit checks (1.1362ms)
      ✔ removing a built-in exit criterion warns (0.5298ms)
      ✔ check groups evaluate every member and preserve evidence (1.3475ms)
      ✔ check validation rejects unknown checks, malformed groups and duplicate keys (0.2594ms)
      ✔ weakened contract detects moving mandatory exit into a disjunction (0.2309ms)
      ✔ weakened contracts report removed entry checks, including quick-lane entry overrides (0.868ms)
      ✔ weakened contracts report disabled human gates without flagging unchanged defaults (0.2669ms)
      ✔ shipped phase template is valid and never weakens its built-in contracts (19.3145ms)
      ✔ tracked Baton documentation contains no private feed hostnames (88.4504ms)
      ✔ shipped troubleshooting names no concrete registry host beyond public or placeholder hosts (0.7521ms)
      ✔ adopter command table remains contiguous (0.6177ms)
      ✔ review instructions explain the normalized handoff payload (baton/skills/baton-review/SKILL.md) (0.6704ms)
      ✔ review instructions explain the normalized handoff payload (.github/skills/baton-review/SKILL.md) (0.5004ms)
      ✔ every Baton-authored skill a pack installs is byte-identical to its baton/skills source (31.8402ms)
      ✔ maintainer workflow list matches template-cleanup keep_dormant and every workflow is classified (2.0086ms)
      ✔ compiles all draft 2020-12 schemas once (133.9838ms)
      ✔ findings fixture validates and invalid fixture reports a JSON pointer (3.1979ms)
      ✔ pack schema requires a classified reason for every optional reference (0.816ms)
      ✔ sync bump explains pin and file changes for a PR body (1.5986ms)
      ✔ sync rejects unpinned bump values and check/bump combination (28.5648ms)
      ✔ pinned generator can refresh Baton-authored handoff outputs without blessing upstream drift (142.6748ms)
      ✔ generated registry preserves verified bytes when only installation time changes (6.8823ms)
      ✔ generated Spec Kit manifest preserves locked bytes when file keys are reordered (5.0071ms)
      ✔ F52 every in-tree mkdtemp root used by tests is gitignored (976.1298ms)
      ✔ every feature phase and quick lane phase has a valid independent fixture (256.7448ms)
      ▶ each invalid baton fixture reports its named stable error, without unrelated errors
        ✔ E_ACTOR_FORMAT (94.3206ms)
        ✔ E_ANALYSIS_CRITICAL (4.1391ms)
        ✔ E_ANALYSIS_MISSING (3.326ms)
        ✔ E_APPROVER_FORMAT (2.9855ms)
        ✔ E_BLOCKING_OPEN (3.8252ms)
        ✔ E_BODY_SECTIONS (3.6784ms)
        ✔ E_BUDGET (6.5487ms)
        ✔ E_DENYLIST (3.3996ms)
        ✔ E_EXIT_UNMET (4.6727ms)
        ✔ E_GATE_PENDING (98.3097ms)
        ✔ E_LANE_ESCALATE (3492.6784ms)
        ✔ E_LANE_MISMATCH (3.8765ms)
        ✔ E_MISSING_ARTIFACT (4.4169ms)
        ✔ E_MODEL_NOT_ALLOWED (7.2848ms)
        ✔ E_MULTIPLE_BATONS (7.1842ms)
        ✔ E_NO_PREREG (5.8616ms)
        ✔ E_OWNER (4.8333ms)
        ✔ E_PR_MISSING (13.2185ms)
        ✔ E_REVIEW_BLOCKING (231.6913ms)
        ✔ E_REVIEW_MISSING (5.8735ms)
        ✔ E_SCHEMA (5.4006ms)
        ✔ E_STALE_ARTIFACT (5.8297ms)
        ✔ E_TRANSITION (4.298ms)
      ✔ each invalid baton fixture reports its named stable error, without unrelated errors (4056.4892ms)
      ✔ quick phase checks require a reasoned decision, resolved findings and explicit scope evidence (125.4086ms)
      ✔ feature phase checks reject missing story evidence, clarification and critical analysis (40.5614ms)
      ▶ model allowlist warns in warn mode and errors in error mode
        ✔ warn mode emits W_MODEL_NOT_ALLOWED without an error (83.3847ms)
        ✔ error mode emits E_MODEL_NOT_ALLOWED (9.1616ms)
      ✔ model allowlist warns in warn mode and errors in error mode (124.754ms)
      ✔ sample handoff satisfies its schema, phase contract, hashes and gate (122.6836ms)
      ✔ sample evidence uses LF bytes so checked-in fixture hashes stay portable (2.8374ms)
      ✔ malformed frontmatter is reported as E_FRONTMATTER_MALFORMED (32.4087ms)
      ✔ ready with a blocking question is rejected (110.4048ms)
      ✔ role-only A5 examples reject malformed approvers and actors with their stable codes (150.2687ms)
      ℹ tests 316
      ℹ suites 0
      ℹ pass 316
      ℹ fail 0
      ℹ cancelled 0
      ℹ skipped 0
      ℹ todo 0
      ℹ duration_ms 221994.4975
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
  - id: D14
    decision: Authorize the focused regression fix
    rationale: Authorize a bounded regression for R1 that forces foreground process-tree cleanup failure and verifies prompt E_CHECK_FAILED rejection with captured diagnostics?
    by: human:repository-owner
  - id: D15
    decision: Implement only Q3's bounded cleanup-rejection regression
    rationale: Owner selected Approve Q3 regression and one required work-gate attempt (Recommended) through control-plane delegation. Configured Q3/D14 answer records the role-only authorization. R1 is a coverage gap, not an observed production defect. Force OS cleanup failure while a real foreground process runs; assert prompt E_CHECK_FAILED preserving timeout, cleanup cause and captured stdout/stderr, then independently terminate only the fixture PID tree/group. No production behavior or existing assertion changes. Focused runner 6/6 and coupled 10/10 pass. One changed full configured work-gate attempt is authorized; failure stops without retries.
    by: ce-work
  - id: D16
    decision: Preserve historical review evidence without claiming independent R1 resolution
    rationale: Original technical evidence applies to 23a0c969; evidence-only head is 58bb274. Leave the genuine report/findings, original identity and historical D6 untouched. This test candidate needs separately authorized independent verification; no reviewer impersonation, formal review rerun, remote approval, land, merge, dispatch, pin/workflow change or publication.
    by: ce-work
  - id: D17
    decision: Independently verify and resolve the R1 coverage gap
    tag: quick-scope-held
    rationale: Owner-authorized test-only delta over 58bb274 adds one bounded cleanup-rejection regression and the work baton, with production unchanged. One real installed testing-reviewer verification and one independently passing Windows test at 550f1f2 support R1 fixed. Canonical scope retains base23a0c969 and includes the unchanged carried original report. Earlier full scope authorization is D10; no new contract, runtime defect claim, merge/release authority or whole-review rerun.
    by: baton-review
  - id: D18
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: f4b7d29f8fcfabeb395ad86caec28db2a06f221b77fbe825b23009375dbe8b2f
    x-base-commit: 23a0c9690f99651ee5861942436541714df365c7
    by: baton
  - id: D19
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: 550f1f2ef8a1c4b2916fa0b4d10ab5e5b13ea350
    by: baton
  - id: D20
    decision: Authorize an audited metadata-only return to pending work
    rationale: Owner selected Approve the audited metadata-only return to work (Recommended) through control-plane delegation on 2026-10-04. At source 430491c4c09aacc66ab84eef92423f26aaf53332, Ubuntu CI 37120945370 failed the fixture foreground-PID ESRCH assertion at test/unit/local-checks.test.mjs:198 (315/316 passed). Required review receive failed E_TRANSITION Expected land, received review; no new persona run or canonical review write occurred. This one-off owner recovery outside unsupported review re-entry preserves phase_completed review, all genuine history, normalized findings, report blobs, review IDs, exit evidence and tested SHAs while changing only the pending route to work. Historical Windows-backed R1 fixed evidence remains platform-limited; prior land-readiness is superseded, with fixture repair and fresh independent acceptance pending. No production defect or historical live/zombie cause is inferred, and no gate approval, waiver, future-fix acceptance or merge/release authority is granted.
    by: human:repository-owner
  - id: D21
    decision: Apply only the owner-authorized POSIX fixture parent-reaps-child correction
    rationale: Owner authorized bounded POSIX fixture investigation/repair, session-isolated official native Node20 and audited metadata-only recovery through control-plane delegation. Genuine D20 recovery at5ce92d6 and actual work receipt precede edits. Matching patch20.20.2/localLinuxarm64 differs from hostedx64. Controlled delayed subreaping observed Z children230-440ms after group-kill/shellclose; hosted actualPID state unknown. Fixture child-first termination lets shell reap before Node reaps shell, retaining both ESRCH, survival, original error/tails, rejection<5000ms/timeout2000ms/close<3000ms. Complete focused Linux/Windows each6/6 zero skips; controlled repaired fixture1selected/5selector skips and child-first probes8/8 pass. Production/reports/assertions unchanged; no independently accepted R1 disposition.
    by: ce-work
  - id: D22
    decision: Record failed E_BUDGET attempt and fresh owner-authorized changed work attempt
    rationale: Previous configured write failed E_EXIT_UNMET/E_BUDGET at validate before npm test and persisted no success. Owner selected Approve prose compaction and one changed work attempt (Recommended). Compact only added prose; actual body150 lines/unchanged budget and standard baton validate now pass (advisory warnings), no focused reruns merely for docs. One changed configured600000ms work gate authorized; further failure stops. Preserve D6,23a original evidence,550f Windows/316,430 Ubuntu failure,5ce recovery distinctly. No validator/protocol/config/workflow/pin/production changes or new formal review/land (0/3 paused), dispatch/rerun, PR readiness/approval, merge/publication/adopter authority.
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
  - phase: review
    at: 2026-10-03T11:14:24.972Z
    by: baton-review
    writer: 0257db31ca4f3b101504b9a3ed3c06498cd3677bc8c57a95afae526ab91f496f
    x-worktree: 200e302ac3614ab4bd231313dd1301575b602b15591149776e3737a5e461fd89
    commit: 23a0c96
    x-action: write
  - phase: review
    at: 2026-10-03T11:36:10.456Z
    by: human:repository-owner
    writer: 335d071e9e92da4bf86b82c418267e2e45f6ca069cc113cf7d929bf71dd2d868
    x-worktree: 777ace4f832b301758a339fa3b1561dd95dfb2e20882b3956e77753e00cbcd5a
    commit: 58bb274
    x-action: answer
  - phase: work
    at: 2026-10-03T11:42:26.101Z
    by: baton
    writer: 335d071e9e92da4bf86b82c418267e2e45f6ca069cc113cf7d929bf71dd2d868
    x-worktree: 777ace4f832b301758a339fa3b1561dd95dfb2e20882b3956e77753e00cbcd5a
    commit: 58bb274
    x-action: write
  - phase: review
    at: 2026-10-03T11:48:39.182Z
    by: baton-review
    writer: 0257db31ca4f3b101504b9a3ed3c06498cd3677bc8c57a95afae526ab91f496f
    x-worktree: 200e302ac3614ab4bd231313dd1301575b602b15591149776e3737a5e461fd89
    commit: 550f1f2
    x-action: write
  - phase: work
    at: 2026-10-04T10:12:35.955Z
    by: baton
    writer: 335d071e9e92da4bf86b82c418267e2e45f6ca069cc113cf7d929bf71dd2d868
    x-worktree: 777ace4f832b301758a339fa3b1561dd95dfb2e20882b3956e77753e00cbcd5a
    commit: 5ce92d6
    x-action: write
updated_at: 2026-10-04T10:08:37.520Z
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
x-implementation-cycle: 7df394fc37b71e044a19595f0699936f57c3100099bab24aa6284f70457dd342
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

### Formal independent review (historical at 58bb274)

Genuine headless run `release-gate-repairs-20261003` reviewed `23a0c969` against `7abec5a`, separately from the earlier single-context report.
Seven real installed personas returned: correctness, testing, maintainability, project standards, agent native, learnings and adversarial.
All 29 paths were covered: 22 implementation plus seven generated/bookkeeping.
The unchanged original artifact is `.context/compound-engineering/ce-review/release-gate-repairs-20261003/report.json`; normalized findings are `.baton/quick/release-gate-repairs.review.json`, both cleanup-removable.
Reviewer app session `34c127ba-26a4-4548-93ce-54bd38e4a704` and CLI session `121f8696-d464-4e62-8ecc-41672feb8e24` are distinct from implementation; CLI history records its own writer/checkout identities.

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

### Bounded independent R1 verification

One genuine installed testing-persona headless run verified `550f1f2` against canonical base `23a0c969`; new delta over `58bb274` is only the test/baton, with the original report carried unchanged.
`node --test --test-name-pattern='cleanup rejection settles promptly' test/unit/local-checks.test.mjs` passed independently on Windows: 1 pass, zero fail/cancel/skip, test 2367.8761 ms, total 2545.5301 ms.
Missing dependencies blocked the first attempt before assertions; frozen restoration enabled that pass. No full suite or generation ran.
Live shell/child survived injected denial; prompt rejection retained timeout/cause/both tails; independent tree cleanup left both PIDs ESRCH. POSIX inspected only; separate 3000 ms taskkill/close bounds are not one total bound.
R1 is fixed; original OPEN evidence and D6 remain historical. Details/provenance are in `.context/compound-engineering/ce-review/release-gate-repairs-r1-20261003/report.json`, with exact cleanup removal.
Canonical review write passed all exits: `review -> land`, ready. No land/merge/release approval or remote approval was performed.
316/316 writer evidence stays at `550f1f2`; prior 315/74+2/type/build/lock stay at `23a0c969`. Four candidate checks were SUCCESS, not evidence-head checks; fresh release validation remains separate.

## Watch out for

**POSIX follow-up:** Owner approved bounded fixture repair, isolated native Node20 and audited recovery; D20/`5ce92d6` and actual work receive precede edits. Ubuntu CI `37120945370` at `430491c` failed child ESRCH: 315/316, zero cancelled/skipped, 138135.456932ms. Hosted PID state remains unknown; reviewer artifacts/dispositions are unchanged. Official session-only Node20.20.2 matches CI patch (local Linux arm64 versus hosted x64); published archive SHA256 `73093db209e4e9e09dd7d15a47aeaab1b74833830df03efa5f942a1122c5fa71` verified, no global settings/PATH/dependency change. Unchanged WSL selected test passed. Controlled delayed subreaping: 8/8 group kills left state Z after shell close, ESRCH after 230-440ms; child-first probes 8/8 immediate ESRCH. This proves fixture nonportability, not hosted state/production defect. POSIX fixture kills its child first, letting the shell reap it; Windows tree cleanup, both ESRCH assertions, survival/error/tails and <5000ms rejection/2000ms timeout/<3000ms close stay intact. Repaired delayed-reaper test passed 1 selected/5 selector skips; full focused files passed 6/6 zero skips on Linux arm64 Node20.20.2 and Windows Node24.14.0. Typecheck/build freshness/lock passed. Prior changed configured attempt failed E_BUDGET in validate before npm test; no success persisted. Owner selected "Approve prose compaction and one changed work attempt (Recommended)"; only this added prose is compacted, unchanged150-line budget/production/reports. One new changed configured attempt authorized; further failure stops. Independent acceptance pending, land0/3 paused.
- The larger quick diff includes the separately authorized optional bounded
  deadline field as well as generated metadata, tests and procedural docs.
  Default/adopter budgets and historical DONE batons are unchanged.
- Local Windows evidence does not establish hosted macOS/Linux smoke success.

### Q3 implementation follow-up

Owner selected "Approve Q3 regression and one required work-gate attempt
(Recommended)" through control-plane delegation; configured Q3/D14 answer
and work receive passed. Only the test and truthful work bookkeeping change.
The new test injects OS termination denial, not a fake check outcome: a real
shell/foreground child survives while `E_CHECK_FAILED` rejects before 5,000 ms,
preserving the 2,000 ms timeout and both captured streams. Independent
fixture cleanup targets only that shell PID tree/group, waits at most 3,000 ms
for close, and verifies both PIDs return ESRCH. Six runner tests and ten
coupled focused cases pass. Existing tests/assertions and production bytes
are unchanged. R1 remains independently unverified/open in the historical
review artifacts; no review rerun, acceptance or land permission is claimed.
The one Q3-authorized formal work write passed the actual configured check:
316/316 tests, zero failures/cancelled/skipped, test stage 229,216.1985 ms.
Active exit evidence and next phase review are persisted above. This is the
test candidate based on evidence head `58bb274`, not a relabeling of the
original `23a0c969` independent review or its 315-test run.
