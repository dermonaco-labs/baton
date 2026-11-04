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
summary: "Review 5 fixes: F33 root fix binds every trusted file (hooks config, .specify/extensions and .specify/presets trees, x-baton-source rows incl. wrappers) to exact base bytes and removes the YAML/frontmatter/registry interpretation; requirements limited to printable ASCII; F34 hostile heading stops; F35 owner boundary in FR-031, clarification and contract; F36 bounded causes, committed-tree and layout drift tests, docs. E_DANGLING_REF still upstream; live evidence pending."
read_first:
  - path: specs/003-upstream-upgrade-prs/review.json
    why: Review 5 findings F33-F36 being answered
  - path: specs/003-upstream-upgrade-prs/spec.md
    why: FR-031 and review 5 clarification amended for the owner decision
  - path: specs/003-upstream-upgrade-prs/tasks.md
    why: Phase 12 T062-T067 and red vs characterization evidence
  - path: specs/003-upstream-upgrade-prs/contracts/upstream-watch.md
    why: Trusted bindings now raw-byte, no parser
  - path: src/lib/candidate-bindings.mjs
    why: Raw-byte trusted binding verifier
  - path: src/lib/upstream-candidates.mjs
    why: PROTECTED_PATHS reuse and bounded error cause
  - path: test/unit/upstream-candidates.test.mjs
    why: Poison, committed-tree and layout drift tests
  - path: test/integration/upstream-upgrade.test.mjs
    why: Coherent poison cases with re-attested digest
  - path: docs/07-updating.md
    why: E_PATH_POLICY causes and manual remedy
artifacts:
  - path: specs/003-upstream-upgrade-prs/spec.md
    role: source-of-truth
    sha256: d13587172aa74b199bccecc5358b803382a67ef155c1d2c0951618a3bd8df20a
  - path: specs/003-upstream-upgrade-prs/plan.md
    role: source-of-truth
    sha256: 7c7e8f07641583a09f34fbbcd148afbe1e60054c875270baab5604c96f18fdc1
  - path: specs/003-upstream-upgrade-prs/research.md
    role: source-of-truth
    sha256: fb04ba5a4f629eaea4eb030e93f4ff8a774798306e7e5931bfcc1c4d25cb3ce5
  - path: specs/003-upstream-upgrade-prs/data-model.md
    role: source-of-truth
    sha256: 9a442e9010e2ca48a9f50144ba4743a938509800dc6ad491af13b9fe7c6ec247
  - path: specs/003-upstream-upgrade-prs/contracts/upstream-watch.md
    role: source-of-truth
    sha256: 1745272af5308c4e55508e37407904bc1b49a17d454b050c4eb1404482d10f27
  - path: specs/003-upstream-upgrade-prs/contracts/sync-bump.md
    role: source-of-truth
    sha256: 812e6951ab8cad817a1d21b69b1183f30dbbc3ca3d8021228d4b5402e863902c
  - path: specs/003-upstream-upgrade-prs/quickstart.md
    role: source-of-truth
    sha256: e03b56f86f2cfe765d5ccdbc2a40b0dc1299ee79e2b13a44f588393ee3fafd7b
  - path: specs/003-upstream-upgrade-prs/tasks.md
    role: source-of-truth
    sha256: 8a17acc65e0bdcc441147099ea0e4bc78401198e90926369a527dd73c05b0994
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
      are the newest stable release; a moved main is informational only (0.5406ms)
        ✔ any other tracked ref is an unsupported-ref blocker (1.1453ms)
        ✔ upstream plans are independent and an ATV candidate cannot touch Spec Kit (7.4753ms)
      ✔ upstream candidates atv (9.9976ms)
      ▶ upstream candidates speckit and atv row ownership policy
        ✔ the committed lock satisfies every owned-row invariant for both upstreams (6.3832ms)
        ✔ a regenerated owned file under every owned stored root and a new .specify file are accepted (48.9245ms)
        ✔ repair metadata is never added or altered; a written row keeps or drops its base repair (21.1289ms)
        ✔ no upstream adds or removes rows outside its growth root, and protected paths never grow or shrink (111.061ms)
        ✔ owned rows keep their install target, provenance, license and shape; hashes match the written bytes (828.6015ms)
        ✔ new rows may not collide with each other or with kept rows in any letter case (4.5958ms)
        ✔ every committed lock row has the shape sync writes, so the shared row policy cannot drift from sync (1.5691ms)
        ✔ install targets outside the upstream install roots are rejected even for a base-locked row (5.9932ms)
      ✔ upstream candidates speckit and atv row ownership policy (1028.7725ms)
      ▶ upstream candidates lifecycle
        ✔ a branch is bot-only only when every commit is authored and committed by the bot (0.295ms)
        ✔ the same pin, base and digest is unchanged; a new base or content regenerates (1.3536ms)
        ✔ a human-edited candidate with a newer pin waits for the human (0.63ms)
        ✔ a candidate PR without a valid marker blocks for manual repair; its title is never trusted (2.4361ms)
        ✔ a closed candidate with a restored marker suppresses its pin or, when marked obsolete, releases it (0.5868ms)
        ✔ a human close suppresses exactly that pin; a newer pin generates again (1.1612ms)
        ✔ the automation obsolete close never suppresses (0.4805ms)
        ✔ when the default branch pins the same or newer, bot-only PRs close and human PRs are reported (2.2391ms)
      ✔ upstream candidates lifecycle (9.5478ms)
      ✔ every feature phase and quick lane phase has a valid independent fixture (207.5261ms)
      ✔ pre-existing feature baton without specify history or attachment still validates (87.6235ms)
      ▶ each invalid baton fixture reports its named stable error, without unrelated errors
        ✔ E_ACTOR_FORMAT (58.3012ms)
        ✔ E_ANALYSIS_CRITICAL (2.9261ms)
        ✔ E_ANALYSIS_MISSING (2.7992ms)
        ✔ E_APPROVER_FORMAT (2.957ms)
        ✔ E_BLOCKING_OPEN (3.5635ms)
        ✔ E_BODY_SECTIONS (2.5965ms)
        ✔ E_BUDGET (4.4384ms)
        ✔ E_DENYLIST (2.319ms)
        ✔ E_EXIT_UNMET (2.0934ms)
        ✔ E_GATE_PENDING (74.1424ms)
        ✔ E_LANE_ESCALATE (796.2272ms)
        ✔ E_LANE_MISMATCH (2.2425ms)
        ✔ E_MISSING_ARTIFACT (2.8306ms)
        ✔ E_MODEL_NOT_ALLOWED (4.2513ms)
        ✔ E_MULTIPLE_BATONS (5.2335ms)
        ✔ E_NO_PREREG (3.5593ms)
        ✔ E_OWNER (2.655ms)
        ✔ E_PR_MISSING (2.6161ms)
        ✔ E_REVIEW_BLOCKING (178.604ms)
        ✔ E_REVIEW_MISSING (4.1379ms)
        ✔ E_SCHEMA (3.0112ms)
        ✔ E_STALE_ARTIFACT (3.65ms)
        ✔ E_TRANSITION (3.3882ms)
      ✔ each invalid baton fixture reports its named stable error, without unrelated errors (1194.3967ms)
      ✔ quick phase checks require a reasoned decision, resolved findings and explicit scope evidence (76.3332ms)
      ✔ feature phase checks reject missing story evidence, clarification and critical analysis (22.4564ms)
      ▶ model allowlist warns in warn mode and errors in error mode
        ✔ warn mode emits W_MODEL_NOT_ALLOWED without an error (62.0248ms)
        ✔ error mode emits E_MODEL_NOT_ALLOWED (7.2422ms)
      ✔ model allowlist warns in warn mode and errors in error mode (89.8732ms)
      ✔ sample handoff satisfies its schema, phase contract, hashes and gate (77.0452ms)
      ✔ sample evidence uses LF bytes so checked-in fixture hashes stay portable (1.4314ms)
      ✔ malformed frontmatter is reported as E_FRONTMATTER_MALFORMED (19.0974ms)
      ✔ ready with a blocking question is rejected (75.1829ms)
      ✔ role-only A5 examples reject malformed approvers and actors with their stable codes (101.4638ms)
      ℹ tests 673
      ℹ suites 9
      ℹ pass 671
      ℹ fail 0
      ℹ cancelled 0
      ℹ skipped 2
      ℹ todo 0
      ℹ duration_ms 313081.8201
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
  - id: D9
    decision: Artifact hashes refreshed after intentional edit
    rationale: "Review 2 fixes: FR-030 records the human missing-marker decision (no title trust); contract defines new stored paths from the trusted base tree (F14), pre-push open-PR check (F21), empty-digest excerpt (F19); tasks T042-T048"
    by: implementation-session
  - id: D10
    decision: Artifact hashes refreshed after intentional edit
    rationale: "Review 2: move the new-path definition into its own contract subsection (lint)"
    by: implementation-session
  - id: D-REVIEW2-MARKER
    by: speckit-implement
    decision: "Records the repository owner decision (FR-030): a candidate PR without a valid marker stops the upstream with E_PR_MARKER for manual marker restoration; a rejected pin is never inferred from the editable PR title."
    rationale: Owner selected the recommended option after the open no-overwrite and closed title-inference cases were explained; relayed via control-plane delegation. Recorded as FR-030.
  - id: D-REVIEW2-TRACE
    by: speckit-implement
    decision: "D5 and D-REVIEW1-GATE are corrected: the marker-less rules were not pure FR-010/012/024 tightening; they trace to FR-019-FR-022 and now FR-030, and the title fallback is withdrawn."
    rationale: F15 showed the review 1 amendment introduced lifecycle behavior beyond tightening; the human decision now governs it.
  - id: D-REVIEW2-NEWPATH
    by: speckit-implement
    decision: A stored path without a base-lock row is new only if the trusted base tree (git ls-tree of the plan base) neither tracks it in any letter case nor holds unowned files in its root or ancestor directories; otherwise E_PATH_POLICY.
    rationale: "F14: ownership must come from trusted base state, not the candidate declaration; covers the 13 tracked unlocked stored paths and future ones."
  - id: D-REVIEW2-GATE-IMPL
    by: speckit-implement
    decision: "No gate re-approval was sought: review->implement is ungated, refresh and validate pass, and FR-030 records the owner decision itself rather than an agent choice."
    rationale: Disclosed to the parent for an explicit gate decision if wanted; no approval is claimed.
  - id: D-REVIEW2-PREPUSH
    by: speckit-implement
    decision: When detection saw no PR, publish lists open PRs for the branch before pushing and fails with E_PR_CHANGED; other push failures report generic E_PUSH naming the branch.
    rationale: "F21 and F17: avoid pushing into a PR opened after detection."
  - id: D-REVIEW3-F14
    decision: F14-F21 verified fixed; residual FR-012 bypass recorded as new P1 F22 rather than reopening F14
    rationale: The base-tree policy works for tracked/unlocked claims; the cross-pack root and own-row path/packs retarget are distinct paths reproduced by probe.
    by: review-session
  - id: D-REVIEW3-FR030
    decision: Accept F15 resolution under recorded human decision D-REVIEW2-MARKER (FR-030)
    rationale: Decision recorded by role, implementation and tests match it; no approval fabricated.
    by: review-session
  - id: D-REVIEW3-GATE
    decision: Review does not approve any gate; review->implement remains ungated and blockers route to implement
    rationale: Open P1 F22 blocks landing.
    by: review-session
  - id: D11
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: 5aabdf61f076cd4f3a4c510897a412364b00f23086c41fe32897443017c87652
    x-base-commit: 6d505f968a62c46757add43a6d60cb5829c7a458
    by: baton
  - id: D12
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: 056edbe63ffcff4e5d6d833cffe1a7b9c3dc4864
    by: baton
  - id: D13
    decision: Artifact hashes refreshed after intentional edit
    rationale: "Review 3 F22-F25: contracts/upstream-watch.md Owned rows section enumerates the FR-012 row policy (growth paths, frozen fields, stored_at-derived install target, content), PR-list fail-closed; tasks Phase 10 T049-T052"
    by: implementation-session
  - id: D-REVIEW3-ROWPOLICY
    decision: "Every candidate-owned files[] row is checked by one policy shared by package and publish: rows appear or disappear only on growth paths (Spec Kit under .specify/ minus extensions.yml, extensions/ and memory/; ATV none), existing rows keep their field set and frozen fields, and every owned row installs at the target its stored_at implies inside the upstream install roots, never at the constitution or a forbidden path, with consistent license, hashes, repair and written bytes."
    rationale: "Review 3 F22 (P1) under spec FR-012 MUST. Tightens contracts/upstream-watch.md to the approved spec without scope or acceptance change; new upstream files outside .specify take the manual reviewed pack-definition route. Verified on the committed base: identity candidates have no issues and all 133 rows satisfy the target mapping."
    by: speckit-implement
  - id: D-REVIEW3-PRLIST
    decision: A candidate-branch PR list that is not a JSON array fails closed with E_SOURCE_FORMAT in detect and E_PUBLISH in publish and writes nothing; detect-plan blockers carry the run URL.
    rationale: Review 3 F24; data-model run field.
    by: speckit-implement
  - id: D-REVIEW3-DOCS
    decision: docs/07-updating.md gives the exact marker template with values from the latest bot commit's Baton-Pin, Baton-Base and Baton-Content trailers, and a remedy for every emitted blocker code; a unit test guards both.
    rationale: Review 3 F23.
    by: speckit-implement
  - id: D14
    decision: Artifact hashes refreshed after intentional edit
    rationale: "Owner decision FR-031 (restricted automation boundary): spec clarification, edge case and FR-031; contract and tasks reference it"
    by: implementation-session
  - id: D15
    decision: Artifact hashes refreshed after intentional edit
    rationale: "Records repository owner decision (relayed via control-plane delegation, by role): approve the restricted automation boundary, recorded as spec.md review 3 clarification and FR-031. Automatic additions and removals only on Spec Kit's unprotected .specify/ paths; new or removed ATV, pack and .github agent, skill or hook files need a manual reviewed update; existing owned files still auto-update; a legitimate upstream release may block with E_PATH_POLICY instead of a draft PR. This narrows behavior the earlier FR-012 contract wording allowed and is an owner decision, not a pure spec interpretation; D-REVIEW3-ROWPOLICY's 'without scope or acceptance change' rationale is corrected accordingly. Code and acceptance selectors unchanged from 96580ae; no gate approval claimed."
    by: implementation-session
  - id: D-REVIEW4-F22
    decision: F22-F25 verified fixed; residual verifier gaps recorded as F26, F28-F30
    rationale: Probes against the real lock and base tree reject the review-3 cross-pack and retarget cases, while identity and legitimate Spec Kit content, growth and removal pass.
    by: review-session
  - id: D-REVIEW4-SEVERITY
    decision: Adversarial A1 recorded as P2 (F26), not P1
    rationale: Pre-existing since ad5f4a6; generate-leg content is already untrusted and human-reviewed; CI lock verify and sync --check catch the inconsistency before merge. The trusted verifier should still fail closed.
    by: review-session
  - id: D-REVIEW4-FR031
    decision: Accept the owner-approved FR-031 boundary as recorded
    rationale: Recorded by role in D15 and spec clarification; no gate approval fabricated. The cross-reference gap is F27.
    by: review-session
  - id: D-REVIEW4-ROUTE
    decision: Route review 4 to implement so F26-F32 are fixed before land
    rationale: Coordinator relayed the parent decision to resolve the open non-blocking P2/P3 integrity findings before a development PR. Findings and severities unchanged; no gate approved. An earlier write of this review (receipt 00e71d9) routed to land; ba529db restored handoff.md to correct that routing, and both commits stay in history.
    by: review-session
  - id: D16
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: 3a8124fbf11c385dbf604342beed93ba5bcb28bf46977e8d1b0cfc1b7837b34f
    x-base-commit: 056edbe63ffcff4e5d6d833cffe1a7b9c3dc4864
    by: baton
  - id: D17
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: ba529dbcd939d8ccbbad2d6a217d5e456a10178f
    by: baton
  - id: D18
    decision: Artifact hashes refreshed after intentional edit
    rationale: "Bind review 4 F26-F32 fixes: trusted binding inventory in the upstream-watch contract, Phase 11 tasks with red vs characterization evidence and actual selector counts, binding verifier code, tests and closed-marker docs; review->implement is ungated and no gate approval is claimed"
    by: implementation-session
  - id: D-REVIEW4-BINDINGS
    decision: package and publish verify every trusted cross-file binding inventoried in contracts/upstream-watch.md Trusted bindings from the candidate's written bytes and base files read through git cat-file, never from generate claims, manifests, paths or logs; broken bindings and deleted fixed outputs are E_PATH_POLICY. Spec Kit internal records and regenerated upstream prompts stay unbound and are reviewed in the draft PR.
    rationale: Review 4 F26 under FR-012; the inventory stops serial rediscovery. Coherent tamper cases with a re-attested generate digest were published by pre-fix 6733578 and are now blocked before any push.
    by: speckit-implement
  - id: D-REVIEW4-PRESETS
    decision: .specify/presets/ joins the protected growth paths, and the registries, .specify/extensions.yml and wrapper frontmatter must match the base, so an upstream format change in a bound file blocks and takes the manual FR-031 route.
    rationale: Tightening required to bind the Baton preset and extension registration; consistent with the FR-031 owner boundary (D15) and recorded so review can confirm it.
    by: speckit-implement
  - id: D-REVIEW4-EVIDENCE
    decision: Phase 11 records genuine red runs against 6733578 (docs drift test 1 fail; five coherent tamper cases each published) separately from characterization unit tests written with the fix, and the acceptance counts are the actual selector results (31/15/7/4/8/10/1/10).
    rationale: Review 4 F27; no invented red history.
    by: speckit-implement
  - id: D-REVIEW5-SEVERITY
    decision: Record the extensions.yml parser differential as P1 (F33)
    rationale: It bypasses a trusted binding introduced by this correction with an edit invisible in the PR diff, matching the F14/F22 class; unlike pre-existing, visible F26 (D-REVIEW4-SEVERITY), draft-PR review cannot catch it.
    by: review-session
  - id: D-REVIEW5-PRESETS
    decision: D-REVIEW4-PRESETS is a narrowing within the owner-approved FR-031 intent, not a broadening; spec alignment tracked as F35
    rationale: The protection fails closed and keeps new or removed trusted scaffolding manual; spec text must state it. No approval invented.
    by: review-session
  - id: D19
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: f2bb324197c140f53cb013b755abc07442ecdad4c12c6625d369e9ffd23ebe72
    x-base-commit: ba529dbcd939d8ccbbad2d6a217d5e456a10178f
    by: baton
  - id: D20
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: be2b7ecb328428b42f16862c0f22e7ac788361ef
    by: baton
  - id: D21
    decision: Artifact hashes refreshed after intentional edit
    rationale: "Records repository owner decision (relayed via control-plane delegation, by role): approve the conservative protected-file boundary and amend the spec (review 5, F35). Any change to .specify/extensions.yml, to any file under .specify/extensions/ or .specify/presets/ (including registries), or to a Baton hook skill wrapper stops that upstream for a manual reviewed update; ordinary upstream prompts still update automatically; registry installed_at/updated_at are normalized deterministically by sync and not tolerated by the verifier. Recorded as spec.md review 5 clarification, FR-031 and edge case, and the contract Trusted bindings section; no gate approval claimed."
    by: implementation-session
  - id: D-REVIEW5-RAWBYTES
    decision: "The trusted verifier no longer interprets YAML, frontmatter or registry JSON: .specify/extensions.yml, every file under .specify/extensions/ and .specify/presets/, and every file with an x-baton-source row in the base or candidate lock must equal its base bytes read through git cat-file; new or deleted trusted paths are rejected; sourced rows still prove their base source hash. The requirements file is limited to printable ASCII and newlines. Other candidate-controlled comparisons (canonical lock bytes, rendered summary and diff document, marker and manifest read only by Baton code) were reassessed and need no parser."
    rationale: "Review 5 F33/F34: any handwritten interpretation differs from Spec Kit's PyYAML and the yaml package; raw bytes are honest because sync already reproduces base bytes for unchanged registries. Poison cases (NBSP, FEFF, U+2003, U+2028, U+0085, __proto__, hostile heading) published at be2b7ec and now stop before any push."
    by: speckit-implement
  - id: D-REVIEW5-FR031
    decision: "FR-031, its review 5 clarification, an edge case and the contract Trusted bindings section record the repository owner's approved conservative protected-file boundary: any change to the hook configuration, the Baton extension and preset trees including registries, or a Baton hook skill wrapper takes the manual reviewed route; ordinary upstream prompts still update automatically; registry timestamps are normalized by sync, not tolerated by the verifier."
    rationale: Review 5 F35; owner decision relayed by role and recorded through handoff refresh. No gate approval claimed.
    by: speckit-implement
  - id: D-REVIEW5-EVIDENCE
    decision: "Phase 12 records genuine red runs against be2b7ec (each of the three integration poison cases published: 1 push, exit 0, no blocker) separately from characterization unit tests written with the fix; acceptance counts are actual selector results (33/15/7/4/8/10/1/10)."
    rationale: No invented red history; the unit tests import exports that did not exist at be2b7ec.
    by: speckit-implement
gate:
  required: false
  approved_by: null
  approved_at: null
history:
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
  - phase: review
    at: 2026-11-04T14:53:49.849Z
    by: implementation-session
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ee68e37
    x-action: refresh
  - phase: review
    at: 2026-11-04T14:54:42.135Z
    by: implementation-session
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ee68e37
    x-action: refresh
  - phase: implement
    at: 2026-11-04T15:09:08.782Z
    by: baton
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: ee68e37
    x-action: write
  - phase: review
    at: 2026-11-04T15:29:51.531Z
    by: baton
    writer: fc349b629fe48de111a1050f706498a02e35d3cf47eddbe0bf86cb880e5efec5
    x-worktree: 1120c1fe4b49f379216b96f088cabbbc8d3a3bc5e0a57f65923e9d5dbcc38de1
    commit: 056edbe
    x-action: write
  - phase: review
    at: 2026-11-04T15:59:30.362Z
    by: implementation-session
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: 7743fe9
    x-action: refresh
  - phase: implement
    at: 2026-11-04T16:13:50.471Z
    by: baton
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: 7743fe9
    x-action: write
  - phase: implement
    at: 2026-11-04T16:17:08.158Z
    by: implementation-session
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: 96580ae
    x-action: refresh
  - phase: implement
    at: 2026-11-04T16:17:28.759Z
    by: implementation-session
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: 96580ae
    x-action: refresh
  - phase: review
    at: 2026-11-04T16:32:18.963Z
    by: baton
    writer: fc349b629fe48de111a1050f706498a02e35d3cf47eddbe0bf86cb880e5efec5
    x-worktree: 1120c1fe4b49f379216b96f088cabbbc8d3a3bc5e0a57f65923e9d5dbcc38de1
    commit: ba529db
    x-action: write
  - phase: review
    at: 2026-11-04T17:14:40.527Z
    by: implementation-session
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: "6733578"
    x-action: refresh
  - phase: implement
    at: 2026-11-04T17:20:41.601Z
    by: baton
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: "6733578"
    x-action: write
  - phase: review
    at: 2026-11-04T17:38:40.406Z
    by: baton
    writer: fc349b629fe48de111a1050f706498a02e35d3cf47eddbe0bf86cb880e5efec5
    x-worktree: 1120c1fe4b49f379216b96f088cabbbc8d3a3bc5e0a57f65923e9d5dbcc38de1
    commit: be2b7ec
    x-action: write
  - phase: review
    at: 2026-11-04T18:04:17.376Z
    by: implementation-session
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: d2954e5
    x-action: refresh
  - phase: implement
    at: 2026-11-04T18:17:05.992Z
    by: baton
    writer: 88cffeac8f04c6b77d9f3385cad5951914e226ccebd3eb55496e25defb4cfe45
    x-worktree: 162abe481b05e2accd9aef3908d9146d7e40e2f93fc79eae33ec09b01803a8db
    commit: d2954e5
    x-action: write
updated_at: 2026-11-04T18:11:33.727Z
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
x-implementation-cycle: 90210fa4edad817f9ef824509a55f3120ca66af725339222ddb526c987fea5da
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
