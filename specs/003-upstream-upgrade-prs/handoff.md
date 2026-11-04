---
baton: 1
lane: feature
feature: 003-upstream-upgrade-prs
phase_completed: review
next_phase: implement
next_owner: speckit-implement
status: ready
model_role: implementation
suggested_model: gpt-6-sol
summary: "Independent review 2 of corrected candidate 6d505f9 (base ad5f4a6): review-1 F01-F11 fixed (F12/F13 dismissed); 8 new findings: F14 P1 open (FR-012 ownership bypass for tracked-but-unlocked stored paths via candidate-added files[] row), F15 P2 open (marker-less lifecycle rules recorded as pure tightening; need human decision), F16-F21 P3 open. Route back to implement for F14 (T033). Targeted checks: 71 tests pass, build --check OK, diff --check clean; no full suite or live run."
read_first:
  - path: specs/003-upstream-upgrade-prs/review.json
    why: Review 1 findings F01-F13 being answered
  - path: specs/003-upstream-upgrade-prs/tasks.md
    why: Phase 8 T033-T041, review 1 notes and updated acceptance evidence
  - path: specs/003-upstream-upgrade-prs/spec.md
    why: Requirements, especially FR-010, FR-012 and FR-024
  - path: specs/003-upstream-upgrade-prs/contracts/upstream-watch.md
    why: Amended ownership, digest, PR re-read and marker contract
  - path: specs/003-upstream-upgrade-prs/contracts/sync-bump.md
    why: sync --bump contract
  - path: src/lib/upstream-candidates.mjs
    why: Path policy, files[] ownership, planning, title pin
  - path: src/maintainer/upstream-upgrade.mjs
    why: Digest binding, PR re-read, push error mapping
  - path: .github/workflows/upstream-watch.yml
    why: Per-upstream artifact ids and digests
artifacts:
  - path: specs/003-upstream-upgrade-prs/spec.md
    role: source-of-truth
    sha256: 3f604f8438ff13e8a480b7c241e75b85602596d2e4b605a413cb5c308b33a05b
  - path: specs/003-upstream-upgrade-prs/plan.md
    role: source-of-truth
    sha256: 7c7e8f07641583a09f34fbbcd148afbe1e60054c875270baab5604c96f18fdc1
  - path: specs/003-upstream-upgrade-prs/research.md
    role: source-of-truth
    sha256: fb04ba5a4f629eaea4eb030e93f4ff8a774798306e7e5931bfcc1c4d25cb3ce5
  - path: specs/003-upstream-upgrade-prs/data-model.md
    role: source-of-truth
    sha256: 9f3448473283319f1c91ff2c84f62d4d4bc90cbaf5efe52e03dffa3054863ca0
  - path: specs/003-upstream-upgrade-prs/contracts/upstream-watch.md
    role: source-of-truth
    sha256: a1c25e99c11beacd4c5633c2a72da129b932752569464642f9814a34c63fab56
  - path: specs/003-upstream-upgrade-prs/contracts/sync-bump.md
    role: source-of-truth
    sha256: 812e6951ab8cad817a1d21b69b1183f30dbbc3ca3d8021228d4b5402e863902c
  - path: specs/003-upstream-upgrade-prs/quickstart.md
    role: source-of-truth
    sha256: e03b56f86f2cfe765d5ccdbc2a40b0dc1299ee79e2b13a44f588393ee3fafd7b
  - path: specs/003-upstream-upgrade-prs/tasks.md
    role: source-of-truth
    sha256: 23e248a8040da24cc8d36d3b4c4a03656ca65aa0dcfbdc16bdf599d57a39bb42
entry_checked: []
exit_criteria:
  - id: findings-json-valid
    met: true
    evidence: specs/003-upstream-upgrade-prs/review.json
open_questions: []
decisions:
  - id: D-ATV-REF
    decision: ATV candidates follow the ref recorded in the lock (main HEAD today; release tags only after a maintainer re-points the lock).
    rationale: Answered by the human user during specify (recommended option).
    by: speckit-specify
  - id: D-PER-UPSTREAM
    decision: One draft PR per upstream against the default branch; the other candidate is regenerated after one merges.
    rationale: Answered by the human user during specify (recommended option).
    by: speckit-specify
  - id: D-EXISTING-PR
    decision: Replace bot-only candidate branches; never overwrite branches with non-automation commits; a PR closed unmerged suppresses that exact pin until a newer pin appears.
    rationale: Answered by the human user during specify (recommended option).
    by: speckit-specify
  - id: D-CONTRACT-AMEND
    decision: This feature supersedes the 001 rule that upstream-watch never pushes or opens PRs, only for draft candidate branches and PRs.
    rationale: Accepted recommendation requires draft PRs; default-branch pushes, merges and publication stay forbidden.
    by: speckit-specify
  - id: D-CHECK-TRIGGER
    decision: A maintainer marking a candidate PR ready for review starts the standard checks; the PR check workflow also runs on ready_for_review (adopter-facing). Resolves assumption A-CHECK-TRIGGER.
    rationale: Answered by the human user during clarify (recommended option); workflow-token PRs do not trigger workflows and no new secret is needed.
    by: speckit-clarify
  - id: D-VALIDATION-SCOPE
    decision: Candidates must pass the full local gate plus reproducibility on Linux in the watcher run; cross-platform smoke stays a release-candidate step.
    rationale: Answered by the human user during clarify (recommended option).
    by: speckit-clarify
  - id: D-OBSOLETE-PR
    decision: Obsolete candidate PRs with only automation commits are closed with a comment; human-edited ones stay open and are listed in the tracking issue; automation closes do not suppress pins.
    rationale: Answered by the human user during clarify (recommended option).
    by: speckit-clarify
  - id: D-LOCK-ONLY-PINS
    decision: baton.lock.json is the only Spec Kit/ATV pin record; core vetted constants and their comparison are removed.
    rationale: Constants add no verification beyond lock + sync --check + review and block single-step bumps (R-1).
    by: speckit-plan
  - id: D-ATV-RELEASE-BUMP
    decision: sync --bump accepts atv=<x.y.z> (release tag tracking); atv=<sha> keeps main tracking; lockFile preserves maintainer-owned fields.
    rationale: Realises D-ATV-REF without the automation changing policy (R-2).
    by: speckit-plan
  - id: D-JOB-SPLIT
    decision: upstream-watch uses detect (read), generate (read, runs upstream), publish (write, executes nothing), report (issues).
    rationale: Keeps upstream code away from write credentials (R-3).
    by: speckit-plan
  - id: D-ARTIFACT-VERIFY
    decision: Publish verifies manifest binding to the trusted plan, raw-byte hashes, path policy and lock-diff restriction before committing.
    rationale: Generate output is untrusted (R-4, R-11).
    by: speckit-plan
  - id: D-NO-CACHE
    decision: No caches in upstream-watch; release.yml setup-uv sets enable-cache false.
    rationale: Prevents cache poisoning from untrusted generate code reaching privileged jobs (R-5).
    by: speckit-plan
  - id: D-READY-TRIGGER
    decision: ci.yml, baton.yml and the byte-identical template declare pull_request types including ready_for_review.
    rationale: Implements D-CHECK-TRIGGER (R-6).
    by: speckit-plan
  - id: D-IDEMPOTENCY
    decision: Deterministic branch, single bot commit with trailers, force-with-lease, PR-body marker for suppression/obsolete, constant concurrency group.
    rationale: No redundant pushes/CI and human edits preserved (R-7).
    by: speckit-plan
  - id: D-MAINTAINER-CODE
    decision: Pure src/lib/upstream-candidates.mjs plus unbundled src/maintainer/upstream-upgrade.mjs using Node built-ins only.
    rationale: Testable locally, not shipped to adopters (R-12).
    by: speckit-plan
  - id: D-ASSUMPTIONS-REVIEWED
    decision: A-PR-SETTING kept (missing setting reported as E_PR_PERMISSION); A-OPTIONAL-SOURCES kept (manual).
    rationale: Assumptions due at plan reviewed.
    by: speckit-plan
  - id: D-US4-FIRST
    decision: US4 (single consistent bump) is implemented before US1 despite P3 priority.
    rationale: Candidate generation depends on sync --bump passing sync --check (R-VETTED-PINS).
    by: speckit-tasks
  - id: D-ANALYZE-FINDINGS
    decision: Apply analysis findings C1, C3, C4, C5 as test additions inside existing task scopes and describe names; record C2 (SC-007) and E1 as post-merge evidence.
    rationale: Closes coverage gaps without changing approved scope or registered selectors.
    by: speckit-analyze
  - id: D1
    decision: Record reviewed implementation base
    rationale: Implementation starts at this commit
    tag: diff-base
    x-base-commit: ae34a99201c6b3e6cbd9152253e36ab12ed47c87
    by: baton
  - id: D2
    decision: Artifact hashes refreshed after intentional edit
    rationale: Bind implementation evidence and analysis C1/C3/C4/C5 notes in tasks.md and the upstream-watch contract job-table corrections (report contents read; generate installs uv like ci.yml); approved spec, plan, scope and registered acceptance commands unchanged; owner authorized refresh and gate re-approval
    by: implementation-session
  - id: D-IMPL-REPORT-READ
    decision: "report job gets contents: read in addition to issues: write"
    rationale: Checkout of trusted base code requires contents read; contract table corrected and owner-authorized refresh recorded
    by: speckit-implement
  - id: D-IMPL-GEN-UV
    decision: generate installs uv 0.12.5 via pip into a runner venv, as ci.yml does
    rationale: CI parity for npm run check; setup-uv remains cache-disabled in detect; contract allowed-tooling row updated
    by: speckit-implement
  - id: D-IMPL-DETECT-LINKS
    decision: detect skips npm ci; links step uses continue-on-error
    rationale: detect runs Node built-ins only; lychee failures are reported in the issue instead of aborting planning
    by: speckit-implement
  - id: D-IMPL-ARTIFACTS
    decision: "upload-artifact includes hidden files; download-artifact pinned d3f86a10... # v4.3.0"
    rationale: Candidate payload includes .github/.specify paths; SHA resolved from the official release tag (analysis U1)
    by: speckit-implement
  - id: D-IMPL-GUARD
    decision: Workflow guard accepts the exact repository guard or GUARD && (balanced expression)
    rationale: Jobs need extra conditions while keeping the fork guard mandatory; maintainer-workflows tests cover rejection of unbalanced and negated forms
    by: speckit-implement
  - id: D-IMPL-CLASSIFY
    decision: Human-edited branches detected by comparing base..branch commits; classifyBranch([]) counts as bot-only; null outcome means valid and awaiting publish
    rationale: Matches data-model state order; empty compare means no human commits
    by: speckit-implement
  - id: D-IMPL-UNTRUSTED
    decision: Fixed CHECKS list, render-time sanitization of excerpts, preview publish emits {}
    rationale: Untrusted artifact data never selects commands or reaches unescaped markdown; preview performs no writes
    by: speckit-implement
  - id: D-IMPL-CLEANUP
    decision: Added specs/003-upstream-upgrade-prs/ to .baton/template-cleanup.yml (T001 baseline fix)
    rationale: Baseline template-cleanup test failed for the new feature dir; owner authorized the a7 checksum refresh and re-approved the a7 gate
    by: speckit-implement
  - id: D-IMPL-HIST-REFRESH
    decision: Owner-authorized metadata-only hash refreshes of 001-baton-template and release-014 batons
    rationale: Supersession notes in 001 spec/ci contract and CHANGELOG Unreleased entries are intentional; original 001 text unchanged
    by: speckit-implement
  - id: D-IMPL-003-REFRESH
    decision: 003 refresh after evidence; owner re-approved the pre-code gate
    rationale: tasks.md evidence and contract corrections required rehash; spec, plan, scope and acceptance commands unchanged
    by: speckit-implement
  - id: D-IMPL-ACUS42
    decision: AC-US4-2 executed in a scratch clone with atv=ac6d611 (parent of pinned main) since ATV main has not advanced
    rationale: Exercises a real bump end-to-end without network-dependent newer pins; nothing pushed or committed
    by: speckit-implement
  - id: D-IMPL-PLATFORM
    decision: Symlink rejection case skipped on Windows; actionlint not run locally (Go unavailable)
    rationale: Linux CI runs both; structural workflow assertions run locally
    by: speckit-implement
  - id: D-CONVERGED
    decision: Convergence found no remaining work; no Convergence phase appended
    rationale: Code, tests and docs satisfy spec, plan and tasks; live-run evidence is operational and post-merge by design
    by: speckit-converge
  - id: D-REVIEW1-FR012
    decision: Review 1 treats the missing files[] ownership check in verifyCandidate as a blocking FR-012 violation (F01, P1); contracts/upstream-watch.md FR-012 rule must be amended to bind file rows and stored paths to the candidate's own upstream.
    rationale: spec.md FR-012 MUST outranks the weaker contract wording; reproduced at HEAD with a Spec Kit candidate altering ATV and optimize outputs and lock rows.
    by: review-session
  - id: D-REVIEW1-DANGLING-REF
    decision: E_DANGLING_REF from sync --bump is accepted as correctly reported scope behavior (E_UPSTREAM_VERIFY generate blocker with excerpt, failed run, no PR); no upstream pack/closure repair is in scope.
    rationale: SC-001 allows naming the blocker in the tracking issue; FR-024 is satisfied by the read code path. End-to-end report test gap is tracked as F04.
    by: review-session
  - id: D3
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: 629b56ee2d7b1ddfd2c6180e4f30d574b5d6476460724a3daf8cfe793535ff61
    x-base-commit: ae34a99201c6b3e6cbd9152253e36ab12ed47c87
    by: baton
  - id: D4
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: ad5f4a6c81600fb9e18a2195652370ed850c908b
    by: baton
  - id: D5
    decision: Artifact hashes refreshed after intentional edit
    rationale: Review 1 bound-contract amendment (F01 FR-012 file-row ownership, F02/F05 push/PR race codes, F03 artifact id+digest binding, F06 path charset, F07 marker fallback, F08 checks trust boundary, F13 whitespace) aligning contracts/data-model/research with approved spec FR-010/FR-012/FR-024; tasks T033-T041 appended; no scope change
    by: implementation-session
  - id: D6
    decision: Artifact hashes refreshed after intentional edit
    rationale: "Review 1 fixes complete: Phase 8 ticked, evidence counts updated, bot identity referenced by constant for the tracked-docs host guard; no scope or acceptance change"
    by: implementation-session
  - id: D-REVIEW1-GATE
    decision: No human gate re-approval was sought for the review 1 contract amendment.
    rationale: The review to implement transition has gate.required false, approve refuses non-gated transitions, and the constitution gates only scope, pre-code and land. The amendment tightens contracts/upstream-watch.md, data-model.md and research.md R-4 to the already-approved FR-010, FR-012 and FR-024 with no scope or acceptance change; recorded via handoff refresh. No approval is claimed.
    by: speckit-implement
  - id: D-REVIEW1-OWNERSHIP
    decision: A candidate may change, add or delete only files and files[] rows owned by its own upstream; other upstreams' and optional sources' rows must be identical, and no row may change owner.
    rationale: FR-012; review F01.
    by: speckit-implement
  - id: D-REVIEW1-DIGEST
    decision: publish downloads each leg's artifact by id and requires its verified digest to equal the generate job's attested digest output.
    rationale: Review F03; artifacts from matrix legs that run untrusted code must be bound to their leg.
    by: speckit-implement
  - id: D-REVIEW1-PR-REREAD
    decision: publish re-reads an existing candidate PR and pushes only when it is still open at the detected head, otherwise E_PR_CHANGED with no writes.
    rationale: Review F02; prevents rewriting a PR a human closed during the run and the resulting false suppression.
    by: speckit-implement
  - id: D-REVIEW1-MARKER
    decision: An open bot-only PR with no valid marker is blocked with E_PR_MARKER; a closed unmerged PR without a marker suppresses the pin in its title.
    rationale: Review F07; ownership and suppression no longer silently depend on an editable marker.
    by: speckit-implement
  - id: D-REVIEW1-GUARD
    decision: The literal bot email in the contract and T013 is replaced by a reference to BOT_NAME/BOT_EMAIL; the tracked-docs host guard test is not modified.
    rationale: The guard failed on ad5f4a6 once the 003 specs were tracked; the identity itself is unchanged.
    by: speckit-implement
  - id: D-REVIEW2-FR012-UNLOCKED
    decision: Review 2 treats acceptance of a candidate-added files[] row as owner for an existing tracked path absent from the base lock as a blocking FR-012 violation (F14, P1); the candidate row may own a path only when the path is absent from the base tree.
    rationale: spec.md FR-012 MUST and contracts/upstream-watch.md already limit candidate-row ownership to new paths; reproduced at 6d505f9 with .specify/memory/constitution.md. No contract change needed.
    by: review-session
  - id: D-REVIEW2-GATE
    decision: "D-REVIEW1-GATE is not a gate bypass: the review->implement transition is ungated, no approval is claimed, and the land gate remains. The marker-less E_PR_MARKER blocking and title-based suppression are new FR-019/FR-021 lifecycle behavior and must be recorded as a human decision at or before the land gate (F15)."
    rationale: Constitution IV and BATON preamble require recorded human decisions for public contract changes; the FR-010/012/024 tightening claim holds for F01/F03/F05/F06/F08 but not F07.
    by: review-session
  - id: D7
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: 5c90a1833eb75bfbe930791bc50f832d39dd2b73ced55254ca32ebe02c3917de
    x-base-commit: ad5f4a6c81600fb9e18a2195652370ed850c908b
    by: baton
  - id: D8
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: 6d505f968a62c46757add43a6d60cb5829c7a458
    by: baton
gate:
  required: false
  approved_by: null
  approved_at: null
history:
  - phase: specify
    at: 2026-11-04T11:31:30.641Z
    by: baton
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ae34a99
    x-action: write
  - phase: clarify
    at: 2026-11-04T11:34:07.714Z
    by: baton
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ae34a99
    x-action: write
  - phase: clarify
    at: 2026-11-04T11:34:56.756Z
    by: human:repository-owner
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ae34a99
    x-action: approve
  - phase: plan
    at: 2026-11-04T11:47:07.872Z
    by: speckit-plan
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ae34a99
    x-action: write
  - phase: tasks
    at: 2026-11-04T11:50:17.642Z
    by: speckit-tasks
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ae34a99
    x-action: write
  - phase: analyze
    at: 2026-11-04T11:53:25.608Z
    by: speckit-analyze
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ae34a99
    x-action: write
  - phase: analyze
    at: 2026-11-04T11:56:07.123Z
    by: human:repository-owner
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ae34a99
    x-action: approve
  - phase: analyze
    at: 2026-11-04T12:56:17.925Z
    by: implementation-session
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ae34a99
    x-action: refresh
  - phase: analyze
    at: 2026-11-04T12:56:18.333Z
    by: human:repository-owner
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ae34a99
    x-action: approve
  - phase: implement
    at: 2026-11-04T13:04:36.199Z
    by: baton
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ae34a99
    x-action: write
  - phase: implement
    at: 2026-11-04T13:11:53.669Z
    by: baton
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ae34a99
    x-action: write
  - phase: review
    at: 2026-11-04T13:28:21.099Z
    by: baton
    writer: fc349b629fe48de111a1050f706498a02e35d3cf47eddbe0bf86cb880e5efec5
    x-worktree: 1120c1fe4b49f379216b96f088cabbbc8d3a3bc5e0a57f65923e9d5dbcc38de1
    commit: ad5f4a6
    x-action: write
  - phase: review
    at: 2026-11-04T13:34:57.395Z
    by: implementation-session
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: f49cef6
    x-action: refresh
  - phase: review
    at: 2026-11-04T13:57:10.409Z
    by: implementation-session
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: f49cef6
    x-action: refresh
  - phase: implement
    at: 2026-11-04T14:16:32.478Z
    by: baton
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: f49cef6
    x-action: write
  - phase: review
    at: 2026-11-04T14:31:26.857Z
    by: baton
    writer: fc349b629fe48de111a1050f706498a02e35d3cf47eddbe0bf86cb880e5efec5
    x-worktree: 1120c1fe4b49f379216b96f088cabbbc8d3a3bc5e0a57f65923e9d5dbcc38de1
    commit: 6d505f9
    x-action: write
updated_at: 2026-11-04T14:31:26.849Z
updated_by: baton-review
risks:
  - id: R-UPSTREAM-EXEC
    text: Generation executes upstream Spec Kit code; it must run without write credentials and publication must not execute upstream content.
    severity: high
  - id: R-VETTED-PINS
    text: sync --bump currently leaves vetted constants stale so sync --check fails; bump must become a single consistent operation first.
    severity: medium
  - id: R-PROMPT-INJECTION
    text: A hostile upstream can change vendored agent/skill prompts within allowed paths; PR checklist requires reading changed prompts in full and drafts never auto-merge.
    severity: medium
  - id: R-SPECKIT-CLOSURE
    text: Spec Kit 1.1.3 and 1.2.4 fail sync --bump with E_DANGLING_REF (speckit-taskstoissues references speckit-github-taskstoissues outside the issues pack closure); first live run will report a Spec Kit blocker instead of a candidate PR. Out of feature scope; a maintainer pack/closure change is needed before Spec Kit candidates can validate. Workflow surfaces it in the tracking issue.
    severity: medium
  - id: R-POST-MERGE-EVIDENCE
    text: npm run check inside generate after a live bump, SC-007 30-minute target and live SC-001 behavior are unproven until after merge; quickstart 3-4 preview and first live run post-merge (analysis C2, E1)
    severity: medium
  - id: R-PR-SETTING
    text: PR creation needs the owner setting Allow GitHub Actions to create and approve pull requests. Not enabled by this work; run reports E_PR_PERMISSION until the owner decides
    severity: low
assumptions:
  - id: A-PR-SETTING
    text: The owner enables the repository setting that lets the workflow token create PRs; otherwise runs report it.
    revisit_at: plan
  - id: A-CHECK-TRIGGER
    text: Workflow-token PRs do not trigger other workflows, so validation runs in the watcher and a documented human action starts standard PR checks without extra secrets.
    revisit_at: clarify
  - id: A-OPTIONAL-SOURCES
    text: Optional sources token-budget and optimize stay manual and out of scope.
    revisit_at: plan
acceptance_checks:
  - id: AC-US4-1
    story: US4
    check: node --test test/unit/sync-bump.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US4-2
    story: US4
    check: "quickstart §2 in a scratch clone: sync --bump atv=<newer main commit> then sync --check, lock verify and build --check pass; invalid pin fails with clean git status"
    kind: manual
    expect_initial: fail
  - id: AC-US1-1
    story: US1
    check: node --test --test-name-pattern="upstream candidates (formats|speckit)" test/unit/upstream-candidates.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US1-2
    story: US1
    check: node --test --test-name-pattern="upstream upgrade publish" test/integration/upstream-upgrade.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US1-3
    story: US1
    check: node --test --test-name-pattern="upstream watch workflow" test/unit/maintainer-workflows.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US2-1
    story: US2
    check: node --test --test-name-pattern="upstream candidates atv" test/unit/upstream-candidates.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US3-1
    story: US3
    check: node --test --test-name-pattern="upstream candidates lifecycle" test/unit/upstream-candidates.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US3-2
    story: US3
    check: node --test --test-name-pattern="upstream upgrade lifecycle" test/integration/upstream-upgrade.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US3-3
    story: US3
    check: node --test --test-name-pattern="ready_for_review" test/unit/maintainer-workflows.test.mjs
    kind: command
    expect_initial: fail
analysis:
  high: 0
  critical: 0
  report_path: specs/003-upstream-upgrade-prs/analysis.md
x-implementation-writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
x-implementation-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
x-implementation-cycle: 1ece47bed642ef52742f7ad13863966d0595e1b2e4e3763d535daf90696e5785
review:
  findings_path: specs/003-upstream-upgrade-prs/review.json
  blocking_findings: 1
---
## Goal

Let the existing upstream watcher prepare one validated draft upgrade PR per
upstream (Spec Kit, ATV), with lock-only pins and a single `sync --bump`
operation. Merge, tags and releases stay manual.

## What changed

The scope gate was approved by the repository owner. The spec, research, data
model, contracts, quickstart, plan, tasks and analysis are complete. The
analysis recorded 0 CRITICAL, 0 HIGH, 4 MEDIUM and 5 LOW findings, and no
remediation was applied. No code has been written.

## Next steps

1. A human records pre-code approval with `handoff approve`.
2. `/speckit-implement`: US4 first, then US1, US2 and US3, applying the
   C1, C3, C4 and C5 test additions from `analysis.md`.

## Watch out for

- Never merge, tag, release, publish, or run the watcher live during development.
- Write credentials stay out of every job that runs upstream or generated code.
- Keep `baton/templates/workflows/baton.yml` byte-identical to `.github/workflows/baton.yml`.
