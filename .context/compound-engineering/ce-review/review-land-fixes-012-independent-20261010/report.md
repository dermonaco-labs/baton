# Independent Baton v0.1.2 review

Code review complete (headless mode).

Scope: exact base `bf0753104b2c6c673dddc3e11dc04a567226bfc8`, candidate
`39f2e3370e2562a734896758355f131fefe1d66c`, tree
`5fc7997658bd15509cac1741446b429788389806`.
Actual report timestamp: `2026-10-10T22:02:46.111Z`.
Mode: headless, read-only code review; owner instruction prohibits automatic fixes.
Reviewers: correctness, testing, maintainability, project-standards,
agent-native, learnings, adversarial. All selected and dispatched names are
installed personas. All dispatched reviewers used `gpt-6.1-sol`, medium reasoning.
Adversarial was selected for more than 50 changed non-test/non-generated/non-lockfile
lines. Uninstalled optional personas were not dispatched.
Verdict: **Not ready**. Two open P2 regression-coverage findings require return to WORK.
Artifact: `.context/compound-engineering/ce-review/review-land-fixes-012-independent-20261010/`.

Intent: Restore Baton-owned review scope comparison and landing publication
sequencing without changing upstream bytes, CLI proof/identity enforcement, public
contracts, or component versions. CE must review the exact pinned full tracked
diff; CLI subjects are a subset. Missing untracked subjects must be deliberately
staged before restarted enumeration. Mandatory ATV Step 9 capture belongs outside
the repository; genuine land-receipt publication must precede final clean and exact
local/tracking/actual-remote-head verification.

## Manual findings

| ID | Severity | File and line | Issue | Reviewer | Confidence | Route |
|---|---|---|---|---|---|---|
| R1 | P2 | `test/integration/review-land-wrappers.test.mjs:113` | Landing regression omits actual remote-head verification | testing | 0.99 | manual -> downstream-resolver; needs verification |
| R2 | P2 | `test/integration/review-land-wrappers.test.mjs:73` | Untracked-subject test never proves staging restores coverage | testing | 0.98 | manual -> downstream-resolver; needs verification |

[P2][manual -> downstream-resolver][needs-verification] R1:
The fixture checks local HEAD against `origin/<branch>` after receipt publication,
but never queries the actual remote. It cannot detect matching local/tracking
heads when a stale tracking ref hides remote divergence. Removing the wrapper's
actual-remote requirement would leave this test green.
Evidence: lines 110-113 test local/tracking equality; lines 118-120 assert
porcelain/unpushed/failure-banner wording but not actual-remote verification;
the source land wrapper explicitly says a stale tracking ref is not publication
evidence.
Fix: query the bare remote with `git ls-remote`, assert three-way agreement, and
advance the remote through another checkout without refreshing the original
tracking ref. Prove local/tracking agreement is insufficient; retain a focused
wrapper-contract assertion. Do not claim these fixtures execute an agent prompt.

[P2][manual -> downstream-resolver][needs-verification] R2:
`ceFiles` is captured at line 57 before `src/untracked.mjs` exists at line 70.
Its absence from that cached list is guaranteed regardless of current enumeration
behavior. The second CLI call proves the untracked subject is discovered but
does not demonstrate the prescribed staging and re-enumeration recovery.
Evidence: lines 71-73 compare the new CLI set with the old CE snapshot; neither
lane stages the subject and re-enumerates both sets.
Fix: check the CLI invocation exit code, enumerate the current pinned diff after
creating the subject, assert the missing subset coverage, then deliberately
stage it, re-run CLI and Git enumeration, and assert unchanged base and restored
coverage for both feature and quick lanes.

No code was fixed, findings dismissed, owner gates approved, cleanup refreshed,
canonical REVIEW proof written, or commits/pushes/PR/landing/release actions
performed. The canonical review JSON preserves both findings as `open`.

## Persona results and synthesis

All seven returned results; no failure, timeout, malformed finding or
confidence suppression. Testing supplied the two complete schema-valid findings.
The other six supplied no actionable findings. Correctness, maintainability,
project-standards, and adversarial independently noted the same coverage gaps as
testing gaps, not separate findings; no duplicate finding or artificial confidence
boost was added.

Correctness verified the exact candidate head/tree, full 25 paths, 18 CLI subjects,
wrapper byte equality, seven version-only substitutions in the bundle, checksum,
upstream lockfile invariance and frozen cleanup hash. It distinguished
prompt-directed obligations from proven execution.

Testing inspected the actual CLI/Git fixtures and existing independence/staleness
tests. It identified R1 and R2, and noted the placeholder land receipt is not a
real `handoff write --phase land` transition.

Maintainability found no actionable complexity/coupling defects. Its risks were
prompt enforcement and unexecuted operational landing; its coverage gaps were
remote divergence and untracked staging recovery.

Project-standards found no confirmed constitution violation. There is no applicable
AGENTS.md for changed paths; `docs/reference/AGENTS.md` does not govern them.
It verified raw bundle/lock bytes and cleanup integrity without claiming this
proves which author generation commands ran. Baton's "18 changed files" is the
CLI subject count, not the full CE coverage count.

Agent-native reported PASS within this diff: scope discovery, deliberate staging,
external capture, receipt publication and final verification are agent-accessible.
It did not grant scope or landing authority. The unchanged upstream CE fast path
still contains a merge-base command; the Baton wrapper explicitly overrides it,
and every reviewer here used the exact supplied base without recomputation.

Learnings inspected all four documents under `docs/solutions/`; relevant patterns:
`quick-lane-scope-and-stranded-land-2026-09-29.md`,
`per-checkout-identity-self-review-2026-09-29.md`,
`crlf-normalized-ownership-hashing-2026-09-29.md`, and
`restricted-mirror-env-only-2026-09-29.md`. No newly introduced contradiction was
found. Historical MemPalace recall was checked against current fixtures, not
treated as current review proof. Critical-patterns document was absent.

Adversarial found no newly introduced reproducible wrapper failure. Upstream land
still emits a completion banner; the Baton caller must enforce its override until
receipt publication and final verification. It noted placeholder receipt,
stale-tracking and staging-recovery coverage gaps.

## Coverage and evidence limits

`review-results.json` contains the exact full tracked and CLI subject sets.
Every persona's returned file list equals the initial exact pinned 25-path tracked
diff. CLI reported the same base and 18 subject files, all contained in that set.
No untracked files existed before report authoring; no unrelated merge-base was
computed. The candidate content remained unchanged during review and targeted tests.

Original authorized 22 paths plus explicit init assertion correction as path 23,
a7 checksum refresh, and WORK JSON make 25. This is not authorization for 25
substantive changes. Original review reporting adds exactly three predictable
paths: this report, `review-results.json` in this frozen directory, and
`.baton/quick/review-land-fixes-012.review.json`, yielding 28 if all are staged.
No additional receipt name or cleanup path was created. These report paths are
not claimed as part of the already completed 25-path review: there is no final
tracked-scope coverage assertion or canonical REVIEW proof.

Tests exercise bundled CLI scope and real Git/bare-remote scenarios plus textual
wrapper assertions. They do not execute CE/ATV prompts, genuine land receipt
transition, destination-failure handling, completion-banner suppression, or
actual live PR publication. These remain operational limits, not invented passes.
No new public behavior/contract or upstream change was found; no scope approval
or quick-scope-held canonical decision was written.

## Independent checks and private seals

Initial `node --test test\integration\review-land-wrappers.test.mjs` failed because
the fresh checkout lacked `yaml`. The original failure log remains unchanged,
SHA256 `46daf6aec42015179dbf34557074949fe46ab0fbbb82d9acbd90d2baa8555ce5`.
Locked dependencies were then restored with process-scoped approved registry
settings; no manifest/lock changes or private registry locator was persisted.

The same targeted command then passed 3/3, zero skips, exit 0.
Independent GREEN log SHA256:
`e5b94820502a311173fadcc4b68aca9f8b0a143c9bdff2f62bffa41eb1cc79d3`.
`node .baton/bin/baton.mjs validate --json` passed, exit 0, with
recommended-pack and W_QUICK_LARGE warnings preserved.
Independent validation log SHA256:
`3713bd4abcacc304cf41e850c05c38a047b9587a198d0ce7c06d6e830ffb1c32`.
The full suite was not independently rerun.

Read-only hash verification matched all supplied author seals:
WORK receipt `e903631be7dcda0b01b17aa724fbafe6758e5f943a5fd5dbafc007f22a171733`;
corrected RED `5aa27d5c1ef5a7de63ff2b2fc4be51a61b0e29c2c23fa016f8e6142d1a6fecf1`;
author GREEN `9faeb6e91906abf54fe8194ead548178b647c42e7ef2d3ef2bdfbcf057c16471`;
author full GREEN `da05b16c02ab029280b739660d3170527ca436b682f380331760d2e864ab0584`.
Hash equality authenticates immutable supplied bytes, not independent execution
of the author's full checks. No author/private originals were mutated.
Frozen cleanup SHA256 remained
`eb375087dc59b79749b669cb62bc7b09b5d20f88a664c63601db77ea77402e5b`.

Review complete
