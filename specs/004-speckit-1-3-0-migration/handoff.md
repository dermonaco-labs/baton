---
baton: 1
lane: feature
feature: 004-speckit-1-3-0-migration
phase_completed: review
next_phase: implement
next_owner: speckit-implement
status: ready
model_role: implementation
suggested_model: gpt-6-sol
summary: "Review 2 of the review-1 corrections at 729ecac (base ad64d19, D35): no P0/P1; F01-F06 and F08-F10 verified fixed; F07 stays open under the user-directed deferral D41. New P2 F11 (F01 fix regression on the offline ps/py 1.0.11 issues upgrade) and P3 F12-F16 are open and mapped. The user chose to fix F11 and return to implement, extending the fallback exception (D47)."
read_first:
  - path: specs/004-speckit-1-3-0-migration/review.json
    why: "Review-2 findings: fix F11 under D47; F12-F16 open P3s mapped to T008/T025/T013/T030; F07 deferred (D41)"
  - path: specs/004-speckit-1-3-0-migration/tasks.md
    why: T001-T031 and the Acceptance Registry (unchanged)
    sha256: 3bb996d06287633357ee443bc96dc557e7c6d981d153908217fb24e2d057bc3c
  - path: specs/004-speckit-1-3-0-migration/spec.md
    why: Approved scope FR-001..FR-015, SC-001..SC-007
    sha256: b21abe7d51d9e2d68fede7bf6c1e5a140fd8d1c7264953bd3fcb8b4bceee0063
  - path: specs/004-speckit-1-3-0-migration/plan.md
    why: Design, risks and D7/T026 update constraints
    sha256: 00ce00a456a9be36d8fdec1beb3e4b13a0e953402ae5c30c68884aafa4866419
artifacts:
  - path: specs/004-speckit-1-3-0-migration/spec.md
    role: source-of-truth
    sha256: b21abe7d51d9e2d68fede7bf6c1e5a140fd8d1c7264953bd3fcb8b4bceee0063
  - path: specs/004-speckit-1-3-0-migration/plan.md
    role: derived
    sha256: 00ce00a456a9be36d8fdec1beb3e4b13a0e953402ae5c30c68884aafa4866419
  - path: specs/004-speckit-1-3-0-migration/research.md
    role: derived
    sha256: 8d4d2f7283032ba4caf804e383d6becd3a46705aa68b3c82e02b681040e6be02
  - path: specs/004-speckit-1-3-0-migration/data-model.md
    role: derived
    sha256: 38be196dbb6c61e37a466c196c686f078e9c74bd3849754e88c7d61b60c5b0de
  - path: specs/004-speckit-1-3-0-migration/contracts/issues-pack.md
    role: derived
    sha256: 892c096f2958feb0790e9e1d1cb0f404cdc233360f77886859a58ce736945286
  - path: specs/004-speckit-1-3-0-migration/contracts/sync-github-extension.md
    role: derived
    sha256: aa5866e5883280e4d03cf393c0581b3fb0662f49c38327c4b343af5f211e3fe0
  - path: specs/004-speckit-1-3-0-migration/quickstart.md
    role: derived
    sha256: 25babcb745a8696818e702db90a334766f4ec014005a5640491aed6e52fec4d1
  - path: specs/004-speckit-1-3-0-migration/tasks.md
    role: derived
    sha256: 3bb996d06287633357ee443bc96dc557e7c6d981d153908217fb24e2d057bc3c
entry_checked: []
exit_criteria:
  - id: findings-json-valid
    met: true
    evidence: specs/004-speckit-1-3-0-migration/review.json
open_questions: []
decisions:
  - id: D1
    decision: Run the migration in the feature lane
    rationale: "1.3.0 removes core taskstoissues (upstream #5053) and changes the opt-in issues pack contents; the quick lane forbids public contract changes."
    by: speckit-specify
  - id: D2
    decision: Target exactly Spec Kit 1.3.0
    rationale: Latest stable release; resolving closure for 1.3.0 also covers the 1.1.3-1.2.6 E_DANGLING_REF failure mode.
    by: speckit-specify
  - id: D3
    decision: Exclude the Copilot --no-model-invocation option, the Baton release, merge, tag, settings changes and workflow dispatch
    rationale: None is needed to migrate; release follows the normal process separately.
    by: speckit-specify
  - id: D4
    decision: Regenerated the unapproved specify baton (first written in commit 9e5045e) so Q1/Q2 options state the owner-directed A+ and X choices exactly
    rationale: The coordinator relayed owner choices A+ and X; handoff answer needs an exact recorded option and the earlier options lacked A+. The gate was never approved, so no approval is lost; the formal answers and approval remain with the owner.
    by: speckit-specify
  - id: D5
    decision: No stale skill file remains for issues-pack adopters
    rationale: The compatibility wrapper occupies the same path as the 1.0.11 core taskstoissues skill (.github/skills/speckit-taskstoissues/SKILL.md), so existing update replaces unmodified copies and flags modified ones as conflicts; plan verifies no other residual file.
    by: speckit-specify
  - id: D6
    decision: "A+: repoint the issues pack to the bundled github extension and keep /speckit-taskstoissues as a thin Baton-authored compatibility wrapper backed by the extension command (owner-directed; spec assumes this)"
    rationale: Spec Kit 1.3.0 removes core taskstoissues. How should the opt-in issues pack be handled?
    by: human:repository-owner
  - id: D7
    decision: "X: no update behavior change; document any residual manual removal in CHANGELOG/README (owner-directed; spec assumes this)"
    rationale: How should files that leave the issues pack be handled on baton update?
    by: human:repository-owner
  - id: D8
    decision: Generate the github extension in a separate tree derived from the pinned core project; core generation is unchanged
    rationale: prepareEntries assigns every generated .specify/ file to core, so adding the extension there would violate FR-009 and change trusted registry files (research R3).
    by: speckit-plan
  - id: D9
    decision: Do not register the github extension in adopter .specify/extensions.yml or .registry; document that specify extension list does not show it
    rationale: Registration files are core-owned and feature 003-bound; the extension registers no hooks, and its command skill works unregistered (R3).
    by: speckit-plan
  - id: D10
    decision: Ship all seven extension files including bash, PowerShell and Python resolve scripts; init renders the extension skill for ps/py when issues is selected
    rationale: Keeps flavour parity with core scripts using the existing flavour mechanism; not an update-behaviour change (R6). Flagged for pre-code review.
    by: speckit-plan
  - id: D11
    decision: "Add optional pack-entry field extension (enum github, only with from: speckit) and lock-row key x-speckit-extension: github"
    rationale: Routes sourcing explicitly without a new upstream id, keeping lock upstream enum, pins and diff unchanged (R8).
    by: speckit-plan
  - id: D12
    decision: "Narrowing-only addition to isTrusted: install targets under BOUND_ROOTS and rows with x-speckit-extension are trusted-base bound; FROZEN_FIELDS gains x-speckit-extension"
    rationale: Stored pack paths escape BOUND_ROOTS; without this the automation could regenerate extension files. SC-006 read as existing bindings unchanged and the automated set only shrinks (R7). Flagged for pre-code review.
    by: speckit-plan
  - id: D13
    decision: "Wrapper is a from: baton skill sourced from baton/skills/speckit-taskstoissues/SKILL.md with no lock row; no wrapper-path guard added"
    rationale: Same path as the 1.0.11 skill, so update rewrites unmodified copies (owner speckit -> baton) and conflicts modified ones; newPathIssue already rejects a future upstream file at that path (R5, R7).
    by: speckit-plan
  - id: D14
    decision: Normalize the rendered extension skill to LF via generatedText; raw lock hashes stay integrity hashes
    rationale: The rendered skill is CRLF on Windows; follows docs/solutions/crlf-normalized-ownership-hashing-2026-09-29.md (R3).
    by: speckit-plan
  - id: D15
    decision: Run the bump and sync --check in a Linux container or hosted CI with public PyPI; keep mirror settings env-only
    rationale: The internal mirror lacks specify-cli==1.3.0; follows docs/solutions/restricted-mirror-env-only-2026-09-29.md (R9).
    by: speckit-plan
  - id: D16
    decision: Resolved assumptions A1-A3 during planning
    rationale: "A1: token-budget and optimize vendor inert extensions declaring speckit_version >=0.1.0, unaffected by the bump. A2: 1.3.0 extensions.yml is byte-identical after EOL normalization, so hooks are unchanged; a regression test pins one receive and one handoff per event. A3: baton.lock.json lists only .github/skills/speckit-taskstoissues/SKILL.md for issues."
    by: speckit-plan
  - by: speckit-tasks
    id: D17
    decision: Land the issues pack repoint (T012) and wrapper (T011) in the same change as the 1.3.0 bump (T013)
    rationale: Spec Kit 1.0.11 has no bundled github extension and 1.3.0 no longer generates the old taskstoissues skill, so neither order is reproducible on its own.
  - by: speckit-tasks
    id: D18
    decision: Capture the 1.0.11 issues skill bytes as test/fixtures/speckit-1.0.11/speckit-taskstoissues/SKILL.md before the bump
    rationale: The update owner-change test (T023) needs the old upstream bytes after sync deletes packs/issues/files copies.
  - by: speckit-tasks
    id: D19
    decision: Update baton/templates/specify.gitignore by a dedicated task (T014)
    rationale: payload.mjs requires a byte-identical mirror of .specify/.gitignore and sync does not refresh it.
  - id: D20
    decision: Record reviewed implementation base
    rationale: Implementation starts at this commit
    tag: diff-base
    x-base-commit: dea5807d5a7e343059837ddf67e85d8d3e55f79d
    by: baton
  - id: D21
    decision: Artifact hashes refreshed after intentional edit
    rationale: "speckit-implement marked T002-T031 complete and added implementation and acceptance evidence to tasks.md; spec.md, plan.md, registered acceptance commands and approved scope are unchanged. Clears the pre-code gate; renewed approval is required before the implement handoff (precedent: 002 D8)."
    by: implementation-session
  - id: D22
    decision: "Owner decision A: keep the x-speckit-extension: github lock key and amend only the feature-003 row-shape filter at test/unit/upstream-candidates.test.mjs:1148 to exclude it like the provenance pair; a new test asserts the key appears only on issues-pack rows with value github"
    rationale: 'User-directed owner decision relayed by the coordinator. Amends T029/SC-006 "added lines only": the single modified test line is 1148; src changes stay additive or narrowing-only (isTrusted extended with ||, FROZEN_FIELDS gains one field).'
    by: speckit-implement
  - id: D23
    decision: Pin the peeled v1.3.0 commit 34a0d388eac671d656eb05b125ad3ed6056168ed; 91261fdcf1738cb095a31ff5bee145f502e3af91 in research/data-model/plan/quickstart/tasks is the annotated tag object
    rationale: git ls-remote shows refs/tags/v1.3.0 = 91261fd (tag object) and refs/tags/v1.3.0^{} = 34a0d38; sync records the peeled commit. adopt.mjs, CHANGELOG and THIRD_PARTY_NOTICES use 34a0d38. Bound planning artifacts are not rewritten; this decision is the correction.
    by: speckit-implement
  - id: D24
    decision: Run T013/T014/T016/T030 in the owner-authorized GitHub cloud sandbox with public PyPI (T002 outcome)
    rationale: Locally the TLS handshake to files.pythonhosted.org fails and the approved mirror lacks the pinned closure (no specify-cli==1.3.0, no anyio==4.16.0). Owner authorized branch push plus cloud session only; no mirror settings committed. Bump commit f702474; final checks at 7cf28f3.
    by: speckit-implement
  - id: D25
    decision: "Metadata-only refreshes of bound docs for T027/T028: 001 D175, 002 D35, release-014 D17 and D18, release-records-docs-a7 D20/D21 with a fresh a7 approval by repository owner via control-plane delegation; 002 and release-014 gates left pending"
    rationale: Owner authorization A (user-directed) limited to feature 004 T027/T028 Spec Kit 1.3.0 documentation edits and the template-cleanup entry for specs/004. release-014 D18 corrects the CHANGELOG commit to the peeled commit (D23).
    by: speckit-implement
  - id: D26
    decision: Keep CONTRIBUTING.md line 121 unchanged (T028 deviation)
    rationale: Line 121 is the historical v0.1.0 release record; rewriting it to 1.3.0 would falsify history. Owner preserved it as proposed.
    by: speckit-implement
  - id: D27
    decision: "C1: the wrapper is alias-only (delegates to /speckit-github-taskstoissues, no issue-creation logic); recorded here instead of editing the bound plan.md"
    rationale: Owner-approved at the pre-code gate; avoids invalidating the approved plan.md hash. Enforced by test/unit/issues-wrapper.test.mjs.
    by: speckit-implement
  - id: D28
    decision: T024 asserts LF for the two skill files and CRLF ownership for the extension extension.yml and command file
    rationale: The adopter .gitattributes pins .github/skills/** to text eol=lf, so CRLF checkouts never apply to skills; the CRLF ownership property is exercised on the extension files under .specify/extensions/github/.
    by: speckit-implement
  - id: D29
    decision: "Post-bump test and generator fixes: plainLock fixture inside the feature-004 describe block, T023 expects the wrapper row alongside lock issues rows, upstream-upgrade report test reads the pinned version from the lock, upstream-diff summary rendered as h2 with blank lines around lists, manifest regenerated"
    rationale: "Real extension rows in baton.lock.json after the bump conflicted with feature-004 fixtures; the wrapper is from: baton with no lock row; a feature-003 integration test hardcoded 1.0.11; markdownlint MD001/MD032 failed on the generated doc. No feature-003 unit test in SC-006 scope changed beyond D22."
    by: speckit-implement
  - id: D30
    decision: "Converge outcome: converged, 0 findings, no convergence tasks appended"
    rationale: Checked FR-001..FR-015, SC-001..SC-007, 10 acceptance scenarios, 6 edge cases, plan D1-D17 and constitution I/II/VI/VIII against the tree at 6955489. Remaining 1.0.11 mentions are historical records (CONTRIBUTING:121, docs/solutions), fixtures, or the compatible range >=1.0.11,<2.0.0 (FR-004). Pre-code gate re-approved by repository owner via control-plane delegation after the D21 refresh.
    by: speckit-converge
  - id: D31
    decision: "Harden src/lib/local-checks.mjs terminateTree: after SIGKILL of the process group, wait up to 2s until process.kill(-pgid,0) reports ESRCH before runLocalCheck returns (292d7b1); tests unchanged."
    rationale: "Pre-existing local-checks.test.mjs:85/:105 failed 4/4 under the nested npm run check inside handoff write on the Linux sandbox: SIGKILLed orphans stay signalable as zombies until init (tini) reaps them. User-directed choice of the src hardening over test polling; outside the original 004 task list, recorded as a decision without editing tasks.md."
    by: speckit-implement
  - id: D32
    decision: Review 1 recorded against the exact CLI base dea5807 after unshallowing the review clone
    rationale: The review checkout began as a depth-1 clone at dba6cea, so receive reported the D20 base as missing. git fetch --unshallow made dea5807 a reachable ancestor. No merge-base was recomputed. The ce-review base and reviewed file set match the CLI base and the 64-file pinned diff.
    by: baton-review
  - id: D33
    decision: Review 1 routed to implement instead of land so the open findings F01-F10 can be addressed
    rationale: "Receipt 7c4ff6b had routed to land. handoff write refuses a second review write from next_phase land with E_TRANSITION (Expected land, not review), and no CLI action reroutes land. The user authorized the history-preserving correction: handoff.md was restored to its dba6cea content in a labelled commit, review.json and 7c4ff6b are kept in history, and this write records --next implement. Findings and severities are unchanged."
    by: baton-review
  - id: D34
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: 7380fcd7cfb7067f413aaec965602bd47fd849edba7667e6ef1e8781b7d981d0
    x-base-commit: dea5807d5a7e343059837ddf67e85d8d3e55f79d
    by: baton
  - id: D35
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: ad64d197c9caa4f85c3d042bfb32060a0683c2c0
    by: baton
  - id: D36
    decision: "F01 fixed: update fallback keeps ps/py issues-pack extension skills that call extension bash scripts"
    rationale: Owner-approved narrow T026/D7 exception, limited to update.mjs unavailable-generator/offline fallback. callsBashScripts (init.mjs) now matches .specify/(extensions/<id>/)?scripts/bash/ and is shared by flavouredBytes and the update fallback skip; script files themselves are not skipped. UV_OFFLINE ps/py test in update.test.mjs extended with --packs issues; failed 2/2 on the old bundle, passes after rebuild.
    by: speckit-implement
  - id: D37
    decision: "F02/F05 fixed: reapProcessGroup bounds the post-SIGKILL wait and handles Darwin EPERM without assuming the group is gone"
    rationale: "SIGKILL then signal-0 probes every 20ms up to reapWaitMs (2000). ESRCH returns. EPERM or the deadline consults ps -A -o pid=,pgid=,stat=: no non-zombie member returns; live members at the deadline throw an explicit cleanup error; EPERM with ps unavailable rethrows. Other errors rethrow. Injected-deps unit tests cover ESRCH, Darwin EPERM on kill and probe, live-then-empty, unverifiable EPERM, live-at-deadline, EINVAL, and parseGroupMembers; POSIX runLocalCheck-level tests cover EPERM and always-signalable probes."
    by: speckit-implement
  - id: D38
    decision: "F03 fixed: prepareSpeckitExtension guards, failure cleanup and the sync invocation are tested hermetically"
    rationale: test/unit/speckit-extension.test.mjs covers E_USAGE for unsupported ids, E_UPSTREAM_VERIFY without specify or project, and (POSIX fake specify) non-zero exit and missing manifest leaving no project-github with the core project unchanged, plus the success path removing stale trees. sync-bump.test.mjs asserts sync calls it once with extension github and the core project and that its failure propagates with no writes.
    by: speckit-implement
  - id: D39
    decision: "F04 fixed: hermetic flavouredBytes and callsBashScripts case for the github extension skill"
    rationale: init.test.mjs F39 hermetic test now renders the issues skill from a ps project and pins callsBashScripts for extension bash, ps and README references, independent of live uv.
    by: speckit-implement
  - id: D40
    decision: "F06 fixed: requirements compile uses root-relative forward-slash paths"
    rationale: regenerateRequirements runs uv pip compile from the repo root with baton/upstream/specify-cli.requirements.in -o baton/upstream/specify-cli.requirements.txt, so the header no longer records a host worktree path. Header line 2 and baton.lock.json requirements_sha256 (6b4fd915...7b68) updated; cloud regeneration with public PyPI reproduces it byte-for-byte.
    by: speckit-implement
  - id: D41
    decision: F07 deferred to release preparation
    rationale: "User decision relayed by the coordinator: defer F07 to release prep with a recorded reason. CHANGELOG.md is hash-bound by .baton/quick/release-014.md; adding the entry now would need another bound-record refresh. The release-preparation lane adds the local-checks POSIX reap fix entry."
    by: speckit-implement
  - id: D42
    decision: "F08 fixed: sync validates extension ids against SPECKIT_EXTENSIONS"
    rationale: sync.mjs splits the from-speckit check from an unsupported-extension check using SPECKIT_EXTENSIONS; prepareSpeckitExtension no longer defaults to 'github'; schema.test.mjs pins the pack schema extension enum to SPECKIT_EXTENSIONS and sync.test.mjs covers the unsupported id error.
    by: speckit-implement
  - id: D43
    decision: "F09 fixed: shared packExtensionIds helper"
    rationale: upstream.mjs exports packExtensionIds used by init (selected pack definitions) and sync (all packs); unit-tested for sorting, de-duplication and undefined definitions.
    by: speckit-implement
  - id: D44
    decision: F10 fixed by pinning the transform rather than adding a render option
    rationale: sync.test.mjs pins diffDocument output for a bump summary exactly (h2 heading, blank line after each bold list header, no h3) and its absence without x-bump-summary; this keeps the PR-body summary format unchanged while guarding lint-clean nesting.
    by: speckit-implement
  - id: D45
    decision: No tasks.md, spec.md or plan.md edits for the correction pass
    rationale: Findings map to existing tasks (T025, T030, T004, T022, T013, T027, T008, T016); editing hashed artifacts would reset the approved pre-code gate. Dispositions are recorded as decisions D36-D44 for the next review.
    by: speckit-implement
  - id: D46
    decision: Review 2 recorded against the exact CLI base ad64d19 (D35) after unshallowing the review clone
    rationale: "Independent worktree at 729ecac; receive OK, no E_SELF_REVIEW. The depth-1 clone was unshallowed so ad64d19, dba6cea and dea5807 are reachable; no merge-base was recomputed. handoff scope reports 14 CLI subjects, a strict subset of the 18-file pinned tracked diff ad64d19..729ecac; ce-review base and reviewed file set equal the CLI base and the 18-file set. The full 64-file feature scope was covered by review 1 (D32/D34). Installed personas only: correctness, testing, maintainability, project-standards, agent-native, learnings-researcher, adversarial."
    by: baton-review
  - id: D47
    decision: Fix F11 and route review 2 to implement; the update fallback exception (D36) is extended to preserve the adopter's existing working skill when its script-calling delegate is skipped and missing
    rationale: "User decision relayed by the coordinator, choosing to fix F11 before landing and explicitly authorizing this extension of the narrow T026/D7 fallback exception. Scope stays limited to the unavailable-generator fallback: when the issues-pack delegate .github/skills/speckit-github-taskstoissues/SKILL.md is skipped and absent, keep the existing .github/skills/speckit-taskstoissues/SKILL.md rather than overwriting it with the alias, with a UV_OFFLINE ps/py 1.0.11 issues upgrade regression test. F12-F16 are open P3s for the implementer's discretion within their mapped tasks."
    by: baton-review
  - id: D48
    decision: F07 remains deferred to release preparation (D41)
    rationale: User-directed deferral preserved; review 2 judged the recorded disposition adequate. CHANGELOG.md and .baton/quick/release-014.md stay untouched; release prep should cover both the bounded reap wait (D31) and the Darwin EPERM/ps confirmation (D37).
    by: baton-review
  - id: D49
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: bd76e8e34f6d3cea187416fdfd96b95bd90f3ad5ea2ad8772e6ba323547215d1
    x-base-commit: ad64d197c9caa4f85c3d042bfb32060a0683c2c0
    by: baton
  - id: D50
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: 729ecac81e2d4369832f3f4ed19659c6debc2a70
    by: baton
gate:
  required: false
  approved_by: null
  approved_at: null
history:
  - phase: specify
    at: 2026-11-05T09:15:49.859Z
    by: speckit-specify
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 9e5045e
    x-action: write
  - phase: specify
    at: 2026-11-05T09:24:50.418Z
    by: human:repository-owner
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 799faec
    x-action: answer
  - phase: specify
    at: 2026-11-05T09:24:50.667Z
    by: human:repository-owner
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 799faec
    x-action: answer
  - phase: specify
    at: 2026-11-05T09:24:50.914Z
    by: human:repository-owner
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 799faec
    x-action: approve
  - phase: plan
    at: 2026-11-05T09:39:07.141Z
    by: speckit-plan
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 787d63b
    x-action: write
  - phase: tasks
    at: 2026-11-05T09:43:59.455Z
    by: speckit-tasks
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 0f68b07
    x-action: write
  - phase: analyze
    at: 2026-11-05T09:45:52.461Z
    by: speckit-analyze
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: dea5807
    x-action: write
  - phase: analyze
    at: 2026-11-05T09:46:39.458Z
    by: human:repository-owner
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 17ff3ab
    x-action: approve
  - phase: analyze
    at: 2026-11-05T10:34:15.733Z
    by: implementation-session
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: 71ed8a8
    x-action: refresh
  - phase: analyze
    at: 2026-11-05T10:35:37.867Z
    by: human:repository-owner
    writer: 08c2e2d3da13346f9702db0b9bed038be45ec2f104c6e663589851b189637f7c
    x-worktree: c2546d4d6546a79b6cdcfbf98f3bfbf45d1a606aff92e3569ca225f4d16d50ab
    commit: "6955489"
    x-action: approve
  - phase: implement
    at: 2026-11-05T11:08:00.258Z
    by: speckit-implement
    writer: 5f00924a333f2145b5cc3d08b5263dc13be579de2a88786886896cbca9be8a7d
    x-worktree: 3af7f0b63ff67b2e3ccc9a408807884e9d0c75834279136c220a52ab422f0752
    commit: 292d7b1
    x-action: write
  - phase: review
    at: 2026-11-05T11:28:55.320Z
    by: baton-review
    writer: d7572f831ab8a8df18779f03ecf1a33e4ca3f9b1ba6c4702b95ba1c124ca004e
    x-worktree: 3a89c9d1ee435b7c5e7b9076c65570e45b4bd6164d59351b51a934d0cbc2f86e
    commit: ad64d19
    x-action: write
  - phase: implement
    at: 2026-11-05T11:46:13.471Z
    by: speckit-implement
    writer: 5f00924a333f2145b5cc3d08b5263dc13be579de2a88786886896cbca9be8a7d
    x-worktree: 3af7f0b63ff67b2e3ccc9a408807884e9d0c75834279136c220a52ab422f0752
    commit: "8099026"
    x-action: write
  - phase: review
    at: 2026-11-05T11:59:36.718Z
    by: baton-review
    writer: 158e1476ecedc36637831c971d650850d2e4b522f18f4f32db46ad0fd4df23b1
    x-worktree: a19401dbf164393d6cf7d3e8e6b82100e4c8bdf3a78f19d128a479b96abc39c7
    commit: 729ecac
    x-action: write
updated_at: 2026-11-05T11:59:36.710Z
updated_by: baton-review
risks:
  - id: R1
    text: Hook dispatch changes in 1.1-1.3 could silently skip or double Baton receive/handoff hooks.
    severity: high
  - id: R2
    text: Vendored speckit skill text changes may conflict with existing repairs in packs/repairs.yml.
    severity: medium
  - id: R3
    text: New transitive Python dependencies in specify-cli 1.3.0 change the hash-locked requirements and notices.
    severity: low
  - id: R4
    text: Adding github extension or wrapper paths could accidentally widen feature 003's automated upgrade path policy or trusted-base bindings.
    severity: high
  - id: R5
    text: The skills-mode rendering of the github extension command may differ from the core skill layout, affecting where the wrapper and canonical command land.
    severity: medium
  - id: R6
    text: Internal PyPI mirror lacks specify-cli==1.3.0; local bump and live install tests cannot run on this laptop.
    severity: medium
  - id: R7
    text: Adopters who installed or later run specify extension add github themselves will see managed-file conflicts on update.
    severity: low
  - id: R8
    text: The trust-narrowing addition could unintentionally reject a legitimate future automated core row if BOUND_ROOTS matching is wrong.
    severity: medium
  - id: R9
    text: F39 live --script ps init tests (core and --packs issues) cannot run on hosts without public PyPI egress; they passed 2/2 in the hosted sandbox at ca95054.
    severity: low
  - id: R10
    text: Darwin zombie-group cleanup relies on ps; without ps an EPERM probe rethrows instead of assuming the group is gone (deliberately fail-safe per review). Linux ESRCH path is unaffected.
    severity: low
assumptions: []
acceptance_checks:
  - id: AC-US1-1
    story: US1
    check: node --test test/unit/packs.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US1-2
    story: US1
    check: node --test test/unit/schema.test.mjs test/unit/sync.test.mjs test/unit/upstream-candidates.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US1-3
    story: US1
    check: "quickstart §1-§2 in the generator environment: sync --bump speckit=1.3.0, then sync --check, lock verify and validate report 0 differences; lock upstreams.speckit is 1.3.0 / v1.3.0 / 91261fdcf1738cb095a31ff5bee145f502e3af91"
    kind: manual
    expect_initial: fail
  - id: AC-US1-4
    story: US1
    check: npm run check (generator environment or hosted CI run of the branch)
    kind: command
    expect_initial: n/a
  - id: AC-US2-1
    story: US2
    check: node --test test/unit/relay-hooks.test.mjs
    kind: command
    expect_initial: n/a
  - id: AC-US2-2
    story: US2
    check: node --test --test-name-pattern="core-only" test/integration/init.test.mjs
    kind: command
    expect_initial: n/a
  - id: AC-US3-1
    story: US3
    check: node --test test/unit/issues-wrapper.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US3-2
    story: US3
    check: node --test --test-name-pattern="issues" test/integration/init.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US3-3
    story: US3
    check: node --test --test-name-pattern="issues" test/integration/update.test.mjs
    kind: command
    expect_initial: fail
  - id: AC-US3-4
    story: US3
    check: git diff 0f68b07 -- test/unit/upstream-candidates.test.mjs shows only added lines (SC-006)
    kind: manual
    expect_initial: n/a
analysis:
  critical: 0
  high: 0
  report_path: specs/004-speckit-1-3-0-migration/analysis.md
x-implementation-writer: 5f00924a333f2145b5cc3d08b5263dc13be579de2a88786886896cbca9be8a7d
x-implementation-worktree: 3af7f0b63ff67b2e3ccc9a408807884e9d0c75834279136c220a52ab422f0752
x-implementation-cycle: 76215a35edb77b3713dd1697d8a5fda57fc5d7f75f019767bea8da36cf628506
review:
  findings_path: specs/004-speckit-1-3-0-migration/review.json
  blocking_findings: 0
---

## Goal

Move Baton's vendored Spec Kit from 1.0.11 to 1.3.0 under the owner's A+/X decisions. `core` stays free of issue
creation, relay hooks fire once, and feature 003's trusted-base bindings are unchanged.

## What changed

Spec, plan, 31 tasks and the analysis are complete. `analysis.md` reports CRITICAL 0 and HIGH 0, with three MEDIUM
and three LOW findings. No code has been written.

## Next steps

1. Human pre-code gate: the repository owner approves, and confirms the SC-006 reading of D12 (finding I1).
2. After approval, run `/speckit-implement` in the generator environment for the bump (R6).

## Watch out for

- The internal mirror lacks `specify-cli==1.3.0`; run the bump in a Linux container or hosted CI with public PyPI and
  keep mirror settings env-only.
- Never merge, tag, release, change settings or dispatch workflows.
- Do not widen the automated upgrade path for extension, preset, registry or wrapper files.
