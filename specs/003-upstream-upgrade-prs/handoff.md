---
baton: 1
lane: feature
feature: 003-upstream-upgrade-prs
phase_completed: implement
next_phase: review
next_owner: baton-review
status: ready
model_role: review
suggested_model: claude-opus-5.5
summary: "Converge: 0 findings (missing/partial/contradicts/unrequested) across FR-001..FR-029 and buildable SC-002..SC-006; tasks.md unchanged. SC-001/SC-007 remain post-merge evidence. Next: independent /baton-review."
read_first:
  - why: Completed tasks, acceptance evidence, C1/C3/C4/C5 integration
    sha256: cbf986f7d7c310d54207092597499fdf11620f0a57b143c934cb3fb5307098cc
    path: specs/003-upstream-upgrade-prs/tasks.md
  - why: Requirements to converge against
    sha256: 3f604f8438ff13e8a480b7c241e75b85602596d2e4b605a413cb5c308b33a05b
    path: specs/003-upstream-upgrade-prs/spec.md
  - why: Decisions and structure
    sha256: 7c7e8f07641583a09f34fbbcd148afbe1e60054c875270baab5604c96f18fdc1
    path: specs/003-upstream-upgrade-prs/plan.md
  - why: Job permissions and publish/report contract
    sha256: 2d657827c5de16672b87ac568d2376a24c9a282ea36a1a5bdf01dd8b5df0ab17
    path: specs/003-upstream-upgrade-prs/contracts/upstream-watch.md
  - why: sync --bump contract
    sha256: 7f5018f8004823acd552242a636ec681c346b2d9a6bc75d6728523d828ffa5b2
    path: specs/003-upstream-upgrade-prs/contracts/sync-bump.md
  - why: Workflow stages detect/package/publish/report
    path: src/maintainer/upstream-upgrade.mjs
  - why: Selection, planning, path policy, manifest, marker, rendering
    path: src/lib/upstream-candidates.mjs
  - why: Four-job read/write separated workflow
    path: .github/workflows/upstream-watch.yml
artifacts:
  - path: specs/003-upstream-upgrade-prs/spec.md
    role: source-of-truth
    sha256: 3f604f8438ff13e8a480b7c241e75b85602596d2e4b605a413cb5c308b33a05b
  - path: specs/003-upstream-upgrade-prs/plan.md
    role: source-of-truth
    sha256: 7c7e8f07641583a09f34fbbcd148afbe1e60054c875270baab5604c96f18fdc1
  - path: specs/003-upstream-upgrade-prs/research.md
    role: source-of-truth
    sha256: 4981640e90d887e34c53d0d6891b5747e3b97cfd414977e0d9468aca9fe4a560
  - path: specs/003-upstream-upgrade-prs/data-model.md
    role: source-of-truth
    sha256: 314f419a4765324253394e0850c3cce35bbfa68485769e63908c67bc527bdef1
  - path: specs/003-upstream-upgrade-prs/contracts/upstream-watch.md
    role: source-of-truth
    sha256: 2d657827c5de16672b87ac568d2376a24c9a282ea36a1a5bdf01dd8b5df0ab17
  - path: specs/003-upstream-upgrade-prs/contracts/sync-bump.md
    role: source-of-truth
    sha256: 7f5018f8004823acd552242a636ec681c346b2d9a6bc75d6728523d828ffa5b2
  - path: specs/003-upstream-upgrade-prs/quickstart.md
    role: source-of-truth
    sha256: e03b56f86f2cfe765d5ccdbc2a40b0dc1299ee79e2b13a44f588393ee3fafd7b
  - path: specs/003-upstream-upgrade-prs/tasks.md
    role: source-of-truth
    sha256: cbf986f7d7c310d54207092597499fdf11620f0a57b143c934cb3fb5307098cc
entry_checked: []
exit_criteria:
  - id: tasks-all-checked-or-deferred
    met: true
    evidence: 0 outstanding tasks
  - id: acceptance-evidence
    met: true
    evidence: 0 checks lack evidence
  - id: local-checks-pass
    met: true
    evidence: |-
      baton: 0
      stdout (tail):
      are built only from validated environment values (0.7748ms)
        ✔ the maintainer entry point is never imported by the CLI or bundled code (8.5312ms)
      ✔ upstream candidates formats (19.0742ms)
      ▶ upstream candidates speckit
        ✔ selection takes the newest stable version published on PyPI and as a GitHub release (0.4003ms)
        ✔ a PyPI and GitHub release mismatch is a source mismatch (0.1463ms)
        ✔ pins validate every external value and record the exact bump form (1.7064ms)
        ✔ planning follows the documented state order (5.1508ms)
        ✔ the path policy allows only regenerated outputs (0.9828ms)
        ✔ a candidate lock may change only its own pin fields, files and bump summary (5.7074ms)
        ✔ manifest verification binds plan, bytes, modes, paths and digest (22.6905ms)
        ✔ markers render and parse round-trip; malformed markers are ignored (0.6139ms)
        ✔ PR body has sections 1-6 in order with validated links and no release notes (1.8856ms)
        ✔ tracking issue states the draft-only boundary and one row per upstream (0.5714ms)
      ✔ upstream candidates speckit (40.4726ms)
      ▶ upstream candidates atv
        ✔ main policy candidates are the main HEAD commit and tree (0.5227ms)
        ✔ release policy candidates are the newest stable release; a moved main is informational only (0.4199ms)
        ✔ any other tracked ref is an unsupported-ref blocker (0.7812ms)
        ✔ upstream plans are independent and an ATV candidate cannot touch Spec Kit (1.8244ms)
      ✔ upstream candidates atv (3.7063ms)
      ▶ upstream candidates lifecycle
        ✔ a branch is bot-only only when every commit is authored and committed by the bot (0.1677ms)
        ✔ the same pin, base and digest is unchanged; a new base or content regenerates (1.2745ms)
        ✔ a human-edited candidate with a newer pin waits for the human (1.0221ms)
        ✔ a human close suppresses exactly that pin; a newer pin generates again (0.8022ms)
        ✔ the automation obsolete close never suppresses (0.2701ms)
        ✔ when the default branch pins the same or newer, bot-only PRs close and human PRs are reported (1.1831ms)
      ✔ upstream candidates lifecycle (4.9357ms)
      ✔ every feature phase and quick lane phase has a valid independent fixture (222.0537ms)
      ✔ pre-existing feature baton without specify history or attachment still validates (93.1012ms)
      ▶ each invalid baton fixture reports its named stable error, without unrelated errors
        ✔ E_ACTOR_FORMAT (69.0033ms)
        ✔ E_ANALYSIS_CRITICAL (3.5212ms)
        ✔ E_ANALYSIS_MISSING (2.9441ms)
        ✔ E_APPROVER_FORMAT (3.8453ms)
        ✔ E_BLOCKING_OPEN (3.0941ms)
        ✔ E_BODY_SECTIONS (2.6666ms)
        ✔ E_BUDGET (4.8792ms)
        ✔ E_DENYLIST (3.9254ms)
        ✔ E_EXIT_UNMET (2.9529ms)
        ✔ E_GATE_PENDING (83.2284ms)
        ✔ E_LANE_ESCALATE (950.266ms)
        ✔ E_LANE_MISMATCH (3.5496ms)
        ✔ E_MISSING_ARTIFACT (3.6319ms)
        ✔ E_MODEL_NOT_ALLOWED (7.2543ms)
        ✔ E_MULTIPLE_BATONS (5.6513ms)
        ✔ E_NO_PREREG (5.1411ms)
        ✔ E_OWNER (4.7663ms)
        ✔ E_PR_MISSING (4.127ms)
        ✔ E_REVIEW_BLOCKING (213.5597ms)
        ✔ E_REVIEW_MISSING (4.8817ms)
        ✔ E_SCHEMA (4.3664ms)
        ✔ E_STALE_ARTIFACT (4.0747ms)
        ✔ E_TRANSITION (3.4401ms)
      ✔ each invalid baton fixture reports its named stable error, without unrelated errors (1423.0277ms)
      ✔ quick phase checks require a reasoned decision, resolved findings and explicit scope evidence (97.0583ms)
      ✔ feature phase checks reject missing story evidence, clarification and critical analysis (28.2197ms)
      ▶ model allowlist warns in warn mode and errors in error mode
        ✔ warn mode emits W_MODEL_NOT_ALLOWED without an error (70.2013ms)
        ✔ error mode emits E_MODEL_NOT_ALLOWED (9.0778ms)
      ✔ model allowlist warns in warn mode and errors in error mode (103.8168ms)
      ✔ sample handoff satisfies its schema, phase contract, hashes and gate (88.316ms)
      ✔ sample evidence uses LF bytes so checked-in fixture hashes stay portable (1.7568ms)
      ✔ malformed frontmatter is reported as E_FRONTMATTER_MALFORMED (19.7627ms)
      ✔ ready with a blocking question is rejected (84.006ms)
      ✔ role-only A5 examples reject malformed approvers and actors with their stable codes (119.6372ms)
      ℹ tests 641
      ℹ suites 7
      ℹ pass 639
      ℹ fail 0
      ℹ cancelled 0
      ℹ skipped 2
      ℹ todo 0
      ℹ duration_ms 360757.7386
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
updated_at: 2026-11-04T13:05:31.002Z
updated_by: speckit-implement
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
x-implementation-cycle: 8b2112e434f28662f7ac2f6c4d545898bd3d5150252a87c28fd208bf1a16b92c
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
