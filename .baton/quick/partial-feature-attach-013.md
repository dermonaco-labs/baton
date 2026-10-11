---
baton: 1
lane: quick
feature: partial-feature-attach-013
phase_completed: work
next_phase: review
next_owner: baton-review
status: ready
model_role: review
suggested_model: claude-opus-5.5
summary: Address F1 and F2 with verified imported-commit ancestry/delivery base, all-diff-base consistency, retained attachment provenance and source-bound human approval evidence. Targeted attachment/normal validation tests pass 76/76 and relay/check tests 130/130. The single configured npm run check is executed and persisted by this work write. Bundle is 409595 bytes under the unchanged 409600 ceiling. Local-only; fresh independent review remains required. No shipping authorized.
read_first:
  - path: .baton/quick/partial-feature-attach-013.md
    why: Quick intent and relay state
  - path: .baton/quick/partial-feature-attach-013.work.json
    why: Direct owner override, coordinator corrections and verification evidence
    sha256: 2216712b9c92b8cbf6e190931e37b4c730374acd697f6f8fc89dc0a03da01895
artifacts: []
entry_checked: []
exit_criteria:
  - id: diff-nonempty
    met: true
    evidence: 24 changed files
  - id: local-checks-pass
    met: true
    evidence: |-
      baton: 0
      stdout (tail):
      s exact bytes for nested gitignore files (14.3694ms)
      ✔ built-in phase defaults deeply match the shipped phase template (16.8432ms)
      ✔ every feature phase has entry and exit checks (1.0002ms)
      ✔ removing a built-in exit criterion warns (0.4597ms)
      ✔ check groups evaluate every member and preserve evidence (1.5864ms)
      ✔ check validation rejects unknown checks, malformed groups and duplicate keys (0.2431ms)
      ✔ weakened contract detects moving mandatory exit into a disjunction (0.2141ms)
      ✔ weakened contracts report removed entry checks, including quick-lane entry overrides (0.7773ms)
      ✔ weakened contracts report disabled human gates without flagging unchanged defaults (0.2367ms)
      ✔ shipped phase template is valid and never weakens its built-in contracts (17.7361ms)
      ✔ tracked Baton documentation contains no private feed hostnames (83.3996ms)
      ✔ shipped troubleshooting names no concrete registry host beyond public or placeholder hosts (0.8248ms)
      ✔ adopter command table remains contiguous (0.5734ms)
      ✔ review instructions explain the normalized handoff payload (baton/skills/baton-review/SKILL.md) (0.5709ms)
      ✔ review instructions explain the normalized handoff payload (.github/skills/baton-review/SKILL.md) (0.5121ms)
      ✔ every Baton-authored skill a pack installs is byte-identical to its baton/skills source (28.749ms)
      ✔ maintainer workflow list matches template-cleanup keep_dormant and every workflow is classified (2.6156ms)
      ✔ compiles all draft 2020-12 schemas once (125.3394ms)
      ✔ findings fixture validates and invalid fixture reports a JSON pointer (2.9843ms)
      ✔ pack schema requires a classified reason for every optional reference (0.7234ms)
      ✔ sync bump explains pin and file changes for a PR body (1.1808ms)
      ✔ sync rejects unpinned bump values and check/bump combination (22.8193ms)
      ✔ pinned generator can refresh Baton-authored handoff outputs without blessing upstream drift (163.9675ms)
      ✔ generated registry preserves verified bytes when only installation time changes (8.5819ms)
      ✔ generated Spec Kit manifest preserves locked bytes when file keys are reordered (5.2241ms)
      ✔ F52 every in-tree mkdtemp root used by tests is gitignored (553.5696ms)
      ✔ every feature phase and quick lane phase has a valid independent fixture (217.492ms)
      ▶ each invalid baton fixture reports its named stable error, without unrelated errors
        ✔ E_ACTOR_FORMAT (79.2725ms)
        ✔ E_ANALYSIS_CRITICAL (4.5116ms)
        ✔ E_ANALYSIS_MISSING (3.5003ms)
        ✔ E_APPROVER_FORMAT (4.4098ms)
        ✔ E_BLOCKING_OPEN (3.0876ms)
        ✔ E_BODY_SECTIONS (3.6321ms)
        ✔ E_BUDGET (6.7318ms)
        ✔ E_DENYLIST (3.069ms)
        ✔ E_EXIT_UNMET (3.183ms)
        ✔ E_GATE_PENDING (72.9143ms)
        ✔ E_LANE_ESCALATE (793.9255ms)
        ✔ E_LANE_MISMATCH (4.4688ms)
        ✔ E_MISSING_ARTIFACT (2.5386ms)
        ✔ E_MODEL_NOT_ALLOWED (5.0142ms)
        ✔ E_MULTIPLE_BATONS (5.1182ms)
        ✔ E_NO_PREREG (4.089ms)
        ✔ E_OWNER (2.8862ms)
        ✔ E_PR_MISSING (2.9006ms)
        ✔ E_REVIEW_BLOCKING (169.3647ms)
        ✔ E_REVIEW_MISSING (4.9645ms)
        ✔ E_SCHEMA (5.706ms)
        ✔ E_STALE_ARTIFACT (3.6848ms)
        ✔ E_TRANSITION (2.9282ms)
      ✔ each invalid baton fixture reports its named stable error, without unrelated errors (1220.2854ms)
      ✔ quick phase checks require a reasoned decision, resolved findings and explicit scope evidence (71.624ms)
      ✔ feature phase checks reject missing story evidence, clarification and critical analysis (24.5976ms)
      ▶ model allowlist warns in warn mode and errors in error mode
        ✔ warn mode emits W_MODEL_NOT_ALLOWED without an error (63.9415ms)
        ✔ error mode emits E_MODEL_NOT_ALLOWED (7.4776ms)
      ✔ model allowlist warns in warn mode and errors in error mode (94.5607ms)
      ✔ sample handoff satisfies its schema, phase contract, hashes and gate (73.0319ms)
      ✔ sample evidence uses LF bytes so checked-in fixture hashes stay portable (2.1725ms)
      ✔ malformed frontmatter is reported as E_FRONTMATTER_MALFORMED (19.8351ms)
      ✔ ready with a blocking question is rejected (71.7247ms)
      ✔ role-only A5 examples reject malformed approvers and actors with their stable codes (96.8109ms)
      ℹ tests 419
      ℹ suites 0
      ℹ pass 419
      ℹ fail 0
      ℹ cancelled 0
      ℹ skipped 0
      ℹ todo 0
      ℹ duration_ms 205321.3848
open_questions: []
decisions:
  - id: D1
    decision: Start a quick lane
    tag: quick-eligible
    rationale: Owner-authorized bug fix for the existing pre-Baton init --infer promise; direct user quick-lane override and plan approval; full delivery remains unreviewed until fresh review
    by: baton
  - id: D2
    decision: Record quick-lane review base
    rationale: Work starts at this commit
    tag: diff-base
    x-base-commit: 35347c559994e884b66fff69267954f1e9f83f5b
    by: baton
  - id: D3
    decision: Record directly approved owner quick-lane constitution override
    rationale: "The user answered directly in this session through ask_user; no timestamp is available. The question cited constitution lines 105-106: The quick lane (ce-work → baton-review → baton-land) is allowed only for changes that add no new user-facing behaviour or contract. In any other case, escalate to the feature lane. Choices were feature lane (recommended) versus quick lane. Exact answer: User selected: Quick lane, framed as a bug fix to the existing FR/edge case that promises init --infer works for pre-Baton features (requires recording an owner override of the constitution rule). This records the repository owner override for this bug fix only, not a control-plane approval. In the same session, exit_plan_mode returned: Plan approved! Exited plan mode."
    by: baton-013-work
  - id: D4
    decision: Apply the coordinator's full-delivery design correction and revert unrelated decision-text drift
    rationale: Attachment records x-imported-head as the full HEAD at import for context only, x-delivery-base as git merge-base HEAD origin/HEAD and x-checked-tasks. The initial diff-base and later attached-feature review writes retain that delivery base, so scope and reviewed-tree cover both pre-Baton product work and Baton-executed changes. An unresolved origin/HEAD base fails E_CHECK_FAILED before handoff.md is written. Baton does not attest that imported work was previously reviewed; settled history is neither relabelled nor re-receipted. Restored original quick decision Record quick-lane review base / Work starts at this commit and analyze/review decision Record reviewed implementation base with original rationales. Normal unattached features retain their existing HEAD-based analyze/review semantics.
    by: baton-013-work
  - id: D5
    decision: Record the user-required implementation model and same-worktree execution
    rationale: Implementation ran on gpt-6.1-sol with medium reasoning in a same-worktree subagent. The session model is Claude Opus 5.5 for planning and coordination only. This user-required routing overrides the configured implementation suggestion for this task only; no configured model, personal identity or downstream repository was changed.
    by: baton-013-work
  - id: D6
    decision: Record correction-specific test-first RED and targeted GREEN
    rationale: "Before source corrections, node --test test\\integration\\handoff-attach.test.mjs failed 7/23 with 16 passing and zero skips. Failing tests: attach preserves imported bytes and requires fresh approval, including the bundled hook CLI; no-origin-head (and its parent attach rejects invalid inputs without writing a baton); attached review scope includes pre-Baton product work and post-attachment changes; quick initialization retains original review-base decision text; attached implement write resumes normal relay with one genuine phase receipt and the attach diff base; attachment provenance is fail-closed and remains permanent after implementation. An earlier RED run had accidentally nested new tests; fixed placement and reran before implementation to obtain these clean counts. After corrections and supported build, node --test test\\integration\\handoff-attach.test.mjs test\\integration\\handoff-management.test.mjs test\\unit\\validate-handoff.test.mjs test\\unit\\temp-roots.test.mjs passed 62/62, zero skips. Synthetic local bare remote and a fresh synthetic reviewer clone verify full delivery scope before and after actual review write, valid approved receive, unapproved/invalid rejection, tamper/forge rejection, quick/feature mismatch and unchanged default inference. Logs are local ignored evidence, not imported approvals."
    by: baton-013-work
  - id: D8
    decision: Verify unchanged normal relay and exact original decision texts
    rationale: "node --test test\\integration\\relay.test.mjs test\\unit\\checks.test.mjs passes 130/130 with zero skips. Compared all five original decision and rationale strings directly against git show 35347c5:src/commands/handoff.mjs: byte-identical Record quick-lane review base, Work starts at this commit, Record reviewed implementation base, Implementation starts at this commit and Review completed at this commit. Preflight node .baton\\bin\\baton.mjs --json validate passes with no errors; recommended-pack and advisory W_QUICK_LARGE warnings remain. Independent review is intentionally not performed by this sole implementer; no review approval is imported or fabricated."
    by: baton-013-work
  - id: D7
    decision: Preserve the strict bundle ceiling through behavior-neutral reuse
    rationale: The first corrected build failed E_BUNDLE_SIZE at 410135 bytes versus the unchanged 409600-byte ceiling. Shared Git commit lookup, JSON field-shape validation, usage-error construction and initialization/routing remove duplication without changing existing messages, error codes, decision text or default feature semantics. Final npm run build reports 409557 bytes. No build ceiling, dependency manifest, lock pin, version, tag or release changed. npm run typecheck, npm run lint:md and git diff --check pass. Initial supported sync failed a PyPI TLS fetch; retrying the pinned, hash-verified sync with process-scoped UV_INDEX_URL and PIP_INDEX_URL set to the approved PyPI proxy succeeded, then supported build regenerated the bundle. README and historical batons remain unchanged.
    by: baton-013-work
  - id: D9
    decision: Use the explicitly user-required independent review model
    rationale: The user required gpt-6.1-sol with medium reasoning for this independent review, overriding the .baton/config.yml review suggestion of claude-opus-5.5 for this review only. Applied ce-review headless as one cohesive reviewer without a persona swarm, as directly requested. Separate detached checkout received review successfully; no product edits, push, PR, merge, tag or release.
    by: baton-013-review
  - id: D10
    decision: Keep the reviewed recovery fix inside the explicitly owner-overridden quick scope
    tag: quick-scope-held
    rationale: Inspected all 16 pinned tracked files at 35347c559994e884b66fff69267954f1e9f83f5b..96e4aa04bdbec06c88ee4469837e1a9c14730a7a, including all 11 CLI subjects, generated bundle and bookkeeping. Changes are limited to the requested pre-Baton attachment recovery, supporting validation, tests and documentation. The new attachment flag/fields are not eligible under the unmodified constitution rule; current baton D3 expressly records the repository-owner exception for this bug fix. Honor that exception, not a general permission to expand quick lanes. No additional unapproved scope was found. Two P1 blockers remain open and route to work.
    by: baton-013-review
  - id: D11
    decision: Record independent targeted validation and fail-closed counterexamples
    rationale: node --test test\integration\handoff-attach.test.mjs test\integration\handoff-management.test.mjs test\unit\validate-handoff.test.mjs passed 61/61, zero skips after restoring missing locked dependencies. node src\commands\build.mjs --check passed at 409557 bytes; bundle SHA matches its sidecar; git diff --check passed. Bundled-CLI fixture probes demonstrated accepted coordinated delivery-base tampering, shadowing diff-base, nonexistent imported HEAD and never-approved forged stale gate fields. Full gate was not rerun; earlier author 404/404 evidence remains author evidence. Structured review file preserves exact base, all 16 reviewed files, 11 CLI subjects, evidence and two open P1 findings.
    by: baton-013-review
  - id: D12
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: 97832b0baed829ae26c494abab80673a25772bb6e8772e7775061fb842c2d379
    x-base-commit: 35347c559994e884b66fff69267954f1e9f83f5b
    by: baton
  - id: D13
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: 96e4aa04bdbec06c88ee4469837e1a9c14730a7a
    by: baton
  - id: D14
    decision: Record the coordinator's honest declarative trust-model boundary
    rationale: Baton batons are plaintext. Existing approvals are declarative role/date gates; authenticity relies on git history and PR review. Cryptographic unforgeability is out of scope Baton-wide. Attachment validation now rejects inconsistent or Git-unverifiable states at least as strictly as the normal relay; it does not claim a consistently rewritten baton is cryptographically impossible. No fake human action was taken on this work baton. The user-required gpt-6.1-sol medium implementation routing remains the task-specific override recorded in D5.
    by: baton-013-work
  - id: D15
    decision: Address F1 provenance tampering and diff-base shadowing
    rationale: Offline validation requires exactly one valid attached decision when attachment or attach-approved evidence exists, or when a feature's non-full history lacks its normal start. Every attached diff-base must be written by baton and equal x-delivery-base; no later narrowing/shadowing is allowed. Receive, scope and initial approve verify that the full imported commit exists, is an ancestor of or equal to HEAD, and its merge-base with origin/HEAD equals the delivery base; all unresolved/missing/unrelated Git states fail E_CHECK_FAILED. Existing recordDiffBase producers already retain the delivery base for attached review/analyze paths and their original normal-feature decision/rationale strings remain unchanged. Regressions exercise paired valid-SHA base tampering, shadowing, nonexistent/unrelated imported commits, missing origin/HEAD, removed provenance after implement, actual supported implement/review writes, advancing main, and offline validation after Git removal.
    by: baton-013-work
  - id: D16
    decision: Address F2 forged and stale attachment approval evidence
    rationale: Initial approve validates fresh artifacts/Git provenance, records one reserved attach-approved decision by the configured human role with source-of-truth path/hash pairs and imported HEAD, and validates its actor/date consistency before writing. At phase none, gate approval requires matching human updated_by, exactly one source/imported-head-bound approval decision and approved_at not earlier than x-attached-at when recorded. Refresh of the initial attachment clears approval evidence and gate for reapproval, including bookkeeping refresh that changes updated_by. No none history receipt is invented; the decision persists after implement. Regressions reject gate-field-only forgery, actor mismatch, stale or mismatched hashes, backdated approval and duplicate decisions; supported role/channel approve and refresh/reapprove receive pass.
    by: baton-013-work
  - id: D17
    decision: Record reviewer-scenario RED and final targeted GREEN
    rationale: "Before source changes node --test test\\integration\\handoff-attach.test.mjs reported 37 tests: 24 passed, 13 failed, zero skips. Exact RED failures: receive rejects paired delivery base; receive rejects nonexistent imported head; receive rejects unrelated imported head; receive rejects missing origin HEAD; validate and receive reject shadowing diff base; validate and receive reject deleted provenance after implement; validate and receive reject hand-set approval; validate and receive reject mismatched approval hashes; validate and receive reject stale approval hashes; validate and receive reject mismatched approval actor; validate and receive reject backdated approval; validate and receive reject duplicate approval; supported attachment approval binds sources and refresh requires reapproval without none receipts. Final node --test test\\integration\\handoff-attach.test.mjs test\\integration\\handoff-management.test.mjs test\\unit\\validate-handoff.test.mjs passed 76/76, zero skips. node --test test\\integration\\relay.test.mjs test\\unit\\checks.test.mjs passed 130/130, zero skips. A newly added compatibility fixture initially had an incomplete spec; repaired it using the existing synthetic sample spec, then reran the full targeted selection green. This work write runs the one required configured npm run check and persists its exact output/counts under local-checks-pass. Standalone bundled validate passed; recommended-pack and W_QUICK_LARGE warnings are advisory."
    by: baton-013-work
  - id: D18
    decision: Preserve the fixed bundle ceiling with behavior-neutral source reuse
    rationale: The initial corrected build measured 411812 bytes and failed the unchanged strict 409600-byte ceiling. Shared usage-error construction, issue emission, initial feature fields, append-decision machinery, last-decision lookup, attachment lookup and normalized directory/human actor reuse remove duplication while preserving normal decision strings, error codes/messages, property ordering and phase behavior. Final supported build reports 409595 bytes, five bytes below the limit. Supported sync regenerates the source skill's installed copy. The first pinned sync hit a PyPI TLS metadata failure; retry with process-scoped UV_INDEX_URL and PIP_INDEX_URL pointing to the approved PyPI proxy succeeded. No dependency manifests, lock pins, bundle limit, release/version or downstream files changed.
    by: baton-013-work
  - id: D19
    decision: Choose the provenance-required invariant compatible with bounded historical relays
    rationale: Normal new, old init --infer and plain first specify writes begin history at specify. Cross-source first writes may prepend exactly one brainstorm or quick work/review seed before specify. For feature histories shorter than the existing 20-entry retention bound, a missing such normal start requires exactly one valid attached decision; phase none always requires it. Full 20-entry histories may be truncated and retain legacy compatibility. Presence of attached or attach-approved always requires valid attached provenance even at the bound. This cannot prove origin after an attacker consistently replaces/removes all plaintext evidence or fabricates a saturated history; git/PR review remains authoritative. Fourteen synthetic feature-phase fixtures previously recorded only their terminal phase; they now include a normal specify start so their named positive/negative semantics remain independently tested. The real completed specs/001-baton-template baton is untouched and validates. No scope expansion or normal phase producer behavior is changed.
    by: baton-013-work
  - id: D20
    decision: Artifact hashes refreshed after intentional edit
    rationale: "Coordinator correction — reverted history-start invariant to preserve existing-baton validation; residual disclosed: consistent removal of attachment and approval provenance after implement is a plaintext rewrite detectable only via git/PR review. Restored 14 pre-existing fixtures to e1713a4. Receive/write cannot re-enter work while next_phase is review; this supported refresh records additional work without forging a work receipt."
    by: implementation-session
  - id: D21
    decision: Artifact hashes refreshed after intentional edit
    rationale: "Coordinator correction — reverted history-start invariant to preserve existing-baton validation; residual disclosed. Work evidence D19/D20 records restored fixtures, 207/207 targeted tests, 409433-byte bundle and the single npm run check blocked by pinned PyPI TLS download. Separate full suite 419/420; only live installer F39 lacks pinned dependencies. Refresh only: no supported work re-entry from next_phase review, no new work or approval receipt claimed."
    by: implementation-session
gate:
  required: false
  approved_by: null
  approved_at: null
history:
  - phase: work
    at: 2026-10-11T18:39:05.810Z
    by: baton-013-work
    writer: 97ada5a563007864a957541059b8020b8b4b4660b36cb8bf67485d7ce465c414
    x-worktree: 6812f2b57cde56efd67cf02d2fe93b35fa1394f470368658688efd81a813c29b
    commit: 35347c5
    x-action: write
  - phase: review
    at: 2026-10-11T18:44:46.359Z
    by: baton-013-review
    writer: 2f72ece7e88d9a138fc04bb143285ceb5553afd84017436d3e9f0b2628a989bd
    x-worktree: cc50c11fe81968589b9acf45ffbbf4c5c26c585f041237b3860f9a71e738a165
    commit: 96e4aa0
    x-action: write
  - phase: work
    at: 2026-10-11T19:04:04.239Z
    by: baton-013-work
    writer: 97ada5a563007864a957541059b8020b8b4b4660b36cb8bf67485d7ce465c414
    x-worktree: 6812f2b57cde56efd67cf02d2fe93b35fa1394f470368658688efd81a813c29b
    commit: e1713a4
    x-action: write
  - phase: work
    at: 2026-10-11T19:07:51.861Z
    by: implementation-session
    writer: 97ada5a563007864a957541059b8020b8b4b4660b36cb8bf67485d7ce465c414
    x-worktree: 6812f2b57cde56efd67cf02d2fe93b35fa1394f470368658688efd81a813c29b
    commit: 287a8b1
    x-action: refresh
  - phase: work
    at: 2026-10-11T19:17:34.199Z
    by: implementation-session
    writer: 97ada5a563007864a957541059b8020b8b4b4660b36cb8bf67485d7ce465c414
    x-worktree: 6812f2b57cde56efd67cf02d2fe93b35fa1394f470368658688efd81a813c29b
    commit: 287a8b1
    x-action: refresh
updated_at: 2026-10-11T19:17:34.198Z
updated_by: implementation-session
risks:
  - id: R1
    text: Imported work is not prior review approval. A fresh configured-role implement gate and independent review of the full delivery remain required.
    severity: medium
  - id: R2
    text: The unchanged strict bundle ceiling has 43 bytes of headroom; future CLI additions need behavior-neutral savings or separately authorized design changes.
    severity: medium
  - id: R3
    text: This task is a local upstream correction only; no push, pull request, merge, downstream adoption, tag, release or version bump is authorized.
    severity: medium
  - id: R4
    text: Current corrected bundle is 409595 bytes with five bytes of headroom; plaintext consistency guards are not cryptographic authenticity, and saturated legacy histories cannot prove their origin offline.
    severity: medium
x-implementation-writer: 97ada5a563007864a957541059b8020b8b4b4660b36cb8bf67485d7ce465c414
x-implementation-worktree: 6812f2b57cde56efd67cf02d2fe93b35fa1394f470368658688efd81a813c29b
x-implementation-cycle: 1809e9cc86481b2b01935ebde8e59b4046697ecbed23693c5e5bce839f88e7d3
review:
  findings_path: .baton/quick/partial-feature-attach-013.review.json
  blocking_findings: 2
---
## Goal
Keep the work in scope.

## What changed
Pending phase work.

## Next steps
1. `/ce-work`

## Watch out for
- Escalate decisions that change behaviour or public contracts.
