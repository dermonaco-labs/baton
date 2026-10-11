# Independent Baton v0.1.2 re-review

Code review complete (headless mode).

Timestamp: `2026-10-10T22:09:14.421Z` (frozen lane identifier retained after
local date rollover).
Base: `bf0753104b2c6c673dddc3e11dc04a567226bfc8`, used exactly with no merge-base
recomputation.
Authorized candidate: `85a90e7078ae5e7a43899fc7a743d5429add184d`.
Local cherry-pick head: `88d4cc3c9d94367f3a40fa35a997e7d431763d91`.
Both candidate trees: `6b583cfffd7fed1cdb1bd86a647bc1260a4b9fd9`.
Mode: headless; no automatic code fixes, owner approvals, refreshes, push or land.
Verdict: **Ready with fixes** for review handoff, not acceptance or merge approval.
Artifact: `.context/compound-engineering/ce-review/review-land-fixes-012-independent-r1-20261010/`.

Intent remains the authorized Baton-only exact pinned full tracked CE scope with
CLI subject subset, untracked staging recovery, mandatory external ATV Step 9
capture and receipt publication before final clean/local/tracking/actual-remote
verification. Upstream bytes and CLI scope/proof/schema/identity enforcement are
unchanged. CLI/package/generator are 0.1.2; extension/preset remain 0.1.0.

## Findings and resolutions

| ID | Original severity | Original location | Final disposition | Evidence |
|---|---|---|---|---|
| R1 | P2 | `test/integration/review-land-wrappers.test.mjs:113` | fixed | Actual `ls-remote` equality, remote-only URL push leaving tracking stale, negative mismatch, fetch/fast-forward recovery, wrapper actual-remote assertion |
| R2 | P2 | `test/integration/review-land-wrappers.test.mjs:73` | fixed | Fresh post-creation Git list, missing subset assertion, deliberate staging, restarted CLI exit check, both-lane re-enumeration/inclusion/unchanged-base recovery |

Original evidence and open dispositions remain frozen in the original independent
directory. Normalized canonical review JSON preserves both IDs, severity,
confidence, original lines and reasons; it does not pretend the original review
was clean. The authorized fix changes only the existing test path, 27 additions
and one deletion. A URL push and `commit-tree` intentionally create the same
real remote-only divergence state without needing another fixture checkout.

Seven installed reviewers were selected and dispatched on `gpt-6.1-sol`, medium:
correctness, testing, maintainability, project-standards, agent-native, learnings,
adversarial. Six are always-on; adversarial is conditional because the full diff
exceeds 50 non-test/non-generated/non-lock changed lines. No absent persona was
invoked. All seven returned; no new actionable finding, suppressed finding,
malformed finding, duplicate, failure or timeout.

Correctness traced both fixes and exact scope, checked wrapper byte equality,
seven bundle version substitutions, upstream lock and cleanup integrity.
Testing confirmed both original P2s fixed, including genuine stale-tracking
state and both-lane recovery. The initial untracked CLI invocation still lacks
an explicit exit-code assertion, but invalid JSON throws and missing/wrong data
fails concrete subject assertions; this does not invalidate the bounded fix.
Maintainability found no new complexity/coupling defect.
Project-standards found no confirmed constitution violation and no applicable
AGENTS.md for changed paths; historical/current reports are explicitly distinct.
Agent-native passed all five relevant workflow capabilities with no parity gap.
Learnings found no new contradiction with the four existing solution documents:
quick scope/stranded land, per-checkout identity, normalized versus raw hashing,
and process-only mirrors. Recall was verified against source, not used as proof.
Adversarial confirmed the remote-only and staging failure states and no new
reproducible defect. Full outputs remain in this session's tool history;
`review-results.json` preserves structured synthesis and per-persona limits.

## Exact coverage

Every persona enumerated and reviewed the same exact `git diff <base>` 28-path
tracked set, including original reports and canonical findings staged before
dispatch. CLI base matched exactly; 20 subjects were a subset of those 28.
Historical counts 25/18 are not substituted for current coverage.

Final run reporting adds exactly this report and its `review-results.json`.
The parent review worker additionally inspects both authored files and the full
resulting tracked inventory before writing proof: final 30 tracked paths,
22 CLI subjects, same exact base, no missing untracked subjects.
No report content may change or be staged after canonical REVIEW proof.
This distinguishes seven-persona coverage28 from parent final coverage30 rather
than inventing seven-persona coverage of files created after their dispatch.

Scope accounting: original authorized22, explicit init assertion path23,
checksum-only a7 refresh and WORK JSON make25. Original report pair plus
canonical review JSON make28. Final report pair makes30. No new substantive
path, receipt name, cleanup entry or unlimited size exception was introduced.
Frozen cleanup remains
`eb375087dc59b79749b669cb62bc7b09b5d20f88a664c63601db77ea77402e5b`.
W_QUICK_LARGE remains advisory and is reported, not disabled.

## Checks and sealed evidence

Independent corrected `node --test test\integration\review-land-wrappers.test.mjs`
passes3/3, zero skips, exit0. Private log SHA256:
`fb1f3299b6ebf3567c46b201a83c0257ca6af44eec35c1e823cd818628a2a8f6`.
Independent `node .baton/bin/baton.mjs validate --json` exit0, pack/size warnings
preserved; private log SHA256:
`283232092d9816f75578e40b13c9305346ee69ceb07c6597de556c7b1be97f05`.
No full suite was independently rerun.
Author reports corrected targeted3/3 SHA256
`eca36c4aa27c4514346ffb8ecf9364c32918b3fb8ff39706cf6f0b5cfec32e82`
and full381/381 zero skips SHA256
`3fe08223d71c900ed55f2a5ce5e58e0ff7694fc051a309efe274d1aed53c6ebc`;
these are supplied execution evidence, not claimed independent runs.

Original author WORK receipt seal:
`e903631be7dcda0b01b17aa724fbafe6758e5f943a5fd5dbafc007f22a171733`.
Original corrected RED and GREEN/fullGREEN seals remain in the original report.
Associated failed version-assertion gate is preserved as
`c6edfa35b0f30c21964c2a547dc2233826192ecbefc1f2b965c042737f2490f9`;
path23 is separately authorized version maintenance, not an omitted failure.
No original private evidence was modified.

One-use D1 checksum refresh/approval history and provenance remain exactly as
recorded in a7. The checksum approval occurred at baseline
`bf0753104b2c6c673dddc3e11dc04a567226bfc8` and is **not acceptance of the patch PR
at its final exact head**. Future owner acceptance is a separate human gate.
No second WORK receipt or fabricated history, approval or refresh was performed.

## Residual limits

Git/CLI fixtures and text assertions do not execute CE/ATV prompts or prove
external-destination failure handling, actual coverage refusal/restart,
genuine land transition, successful-banner suppression, or live PR publication.
These remain operational duties for an independent LAND worker.
The original upstream fast-path merge-base example and early land banner are
unchanged; Baton overrides them. This invocation used the exact base directly.
Canonical REVIEW is to be generated by the real CLI after staged final inspection,
never represented by this report alone.

Review complete
