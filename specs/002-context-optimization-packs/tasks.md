# Tasks: Optional Context Optimization Packs

**Input**: `specs/002-context-optimization-packs/`

**Prerequisites**: Approved scope, plan.md, spec.md, research.md, data-model.md,
contracts/context.md, analysis and the mandatory pre-code approval.

**Tests**: Explicitly required. Write the registered tests first and capture
red evidence before implementing their behavior. Never relax a registered check
without a recorded human decision.

## Phase 1: Setup

- [x] T001 Confirm pre-code approval in `specs/002-context-optimization-packs/handoff.md` and load only the ordered phase context.
- [x] T002 Record initial evidence for registered acceptance commands in `specs/002-context-optimization-packs/tasks.md` before changing implementation code.

## Phase 2: Foundational

- [x] T003 Add the shared context fixture/command harness in `test/integration/context.test.mjs` using existing installed-fixture helpers and isolated draft features.

## Phase 3: User Story 1 - Reproducible Optional Packs (P1)

**Goal**: Explicit selection, immutable provenance and normal ownership.

**Independent test**: Core-only, each optional pack and combined selections;
verify pins/tampering, update/re-init and whole-install uninstall.

- [x] T004 [US1] Write failing `context packs` and `context provenance` checks in `test/integration/context.test.mjs`, including core-only defaults and user-edit preservation.
- [x] T005 [US1] Extend `src/lib/upstream.mjs` with exact source tags, commits, trees and MIT verification from `research.md`.
- [x] T006 [US1] Extend `baton/schemas/pack.schema.json` and `baton/schemas/lock.schema.json` for the two named sources and required upstream paths, preserving old required fields.
- [x] T007 [US1] Extend `src/commands/sync.mjs` source resolution/provenance and replace the obsolete exact-11-pack assumption without weakening required pack validation.
- [x] T008 [US1] Add `packs/token-budget.yml` and `packs/optimize.yml` with exact snapshot lists from `research.md`, requiring core and no default selection.
- [x] T009 [US1] Update only affected installed-provenance sites in `src/commands/init.mjs`, `src/commands/manifest.mjs`, `src/commands/adopt.mjs` and `baton/schemas/manifest.schema.json`; preserve ownership/update/uninstall policy.
- [x] T010 [US1] Extend `test/unit/packs.test.mjs`, `test/unit/schema.test.mjs`, `test/unit/sync.test.mjs` and `test/integration/init.test.mjs` for sources, backward compatibility, raw checksums and optional installation.

## Phase 4: User Story 2 - Safe Draft Compaction (P1)

**Goal**: Executable guards for pre-approval, pre-binding single-target writes.

**Independent test**: Eligible draft round-trip and refusal matrix with
byte-for-byte comparison of protected files and backup side effects.

- [x] T011 [US2] Write failing `context draft` and `context protection` checks in `test/integration/context.test.mjs` and detailed guard cases in `test/unit/context-guards.test.mjs`.
- [x] T012 [US2] Implement target/feature canonicalization and protection discovery in `src/lib/context-guards.mjs`: "Any matching protection denies a write"; metadata failures must not become empty protection sets.
- [x] T013 [US2] Implement candidate freshness, preview and guarded compact/restore in `src/lib/context-guards.mjs`: "never overwrite an existing backup"; preserve original bytes/line endings and refuse stale state before live replacement.
- [x] T014 [US2] Register `context` in `src/cli.mjs` and implement strict option/pack gating and structured diagnostics in `src/commands/context.mjs` according to `contracts/context.md`.
- [x] T015 [US2] Author `baton/skills/speckit-token-budget-compact/SKILL.md` and `baton/skills/speckit-token-budget-restore/SKILL.md`; use only the guarded writer, never upstream mutating helpers or direct live edits.

## Phase 5: User Story 3 - Report-Only Governance Audits (P1)

**Goal**: Three audit commands with no governance or memory mutations.

**Independent test**: Run all optimize operations, reject apply-like requests,
and compare protected governance/gates/scanners/approvals/memory before/after.

- [x] T016 [US3] Write failing `context optimize reports` and `context optimize apply` checks in `test/integration/context.test.mjs`, including rule-removal and memory-persistence requests.
- [x] T017 [US3] Implement non-mutating optimize report/context operations in `src/commands/context.mjs`; expose no apply or check command.
- [x] T018 [US3] Author `baton/skills/speckit-optimize-run/SKILL.md`, `baton/skills/speckit-optimize-tokens/SKILL.md` and `baton/skills/speckit-optimize-learn/SKILL.md`; omit upstream apply/persist steps and route amendments to speckit-constitution.

## Phase 6: User Story 4 - Relay-Safe Context Advice (P2)

**Goal**: Scope, concise and usage preserve context, instructions and errors.

**Independent test**: Ordered handoff context/exclusions survive; concise writes
no instructions; explicit output slimming preserves error evidence and status.

- [x] T019 [US4] Write failing `context advisory` and `context output` checks in `test/integration/context.test.mjs`, including mandatory context, instruction bytes, error streams and failure status.
- [x] T020 [US4] Implement read-only scope/concise/usage operations in `src/commands/context.mjs`; never replace ordered `read_first` or persist concise state.
- [x] T021 [US4] Author `baton/skills/speckit-token-budget-scope/SKILL.md`, `baton/skills/speckit-token-budget-concise/SKILL.md` and `baton/skills/speckit-token-budget-usage/SKILL.md`; keep slim_output explicit and preserve diagnostics/status.

## Phase 7: Polish and Cross-Cutting Concerns

- [x] T022 Update `docs/06-packs-and-customization.md`, `docs/reference/cli.md`, `README.md`, `THIRD_PARTY_NOTICES.md` and `CHANGELOG.md` Unreleased; retain complete upstream MIT notices.
- [x] T023 Build `.baton/bin/baton.mjs` and sync `packs/*/files/`, `baton.lock.json` and `docs/reference/upstream-diff.md`; verify byte identity, reference closure and absence of registered upstream compaction hooks.
- [x] T024 Run targeted tests/lint/types, follow `specs/002-context-optimization-packs/quickstart.md`, capture final acceptance evidence here, then run one final `npm run check` before handing off to fresh-checkout baton-review. The configured suite runs inside `baton handoff write --phase implement --mode converge`; check this task only after that receipt succeeds. <!-- baton:handoff-write:implement -->

## Dependencies and Execution Order

T001 -> T002 -> T003. T004 precedes T005-T010; T005/T006 precede T007,
T007/T008 precede T009/T010. T011 precedes T012-T015; T012 precedes T013;
T013 precedes T014/T015. T016 precedes T017/T018; T017 uses the CLI adapter
from T014. T019 precedes T020/T021; T020 also uses T014. T022 follows the
settled contracts; T023 follows all source/pack/wrapper changes; T024 follows
T022/T023.

US1 supplies installation needed by the integration fixtures; US2 supplies the
shared command adapter, but each story's behavioral checks use independent
fixtures. Deliver all four stories in one PR, not a partial installation-only
MVP.

## Parallel Examples

US1 source/schema design can proceed alongside US2 guard tests after T003,
provided shared sync/manifest files are not concurrently edited.
US3 and US4 wrapper files are independent after their adapter contracts settle;
their shared `context.mjs` edits must be integrated sequentially.
No autonomous workflow/fleet is required or authorized by these examples.

## Implementation Strategy

Write and observe each story's failing tests, implement its behavior, run the
smallest covering selector, then integrate and document. Preserve strict pins,
existing approval/hashing semantics and full failure evidence. Stop at
required gates; use fresh-checkout review and one cohesive PR without merge,
release or tag. Do not rerun CI on an unchanged head.

## Acceptance Registry

<!-- Register checks before implementation. Match handoff acceptance_checks.
Capture red evidence before implementing each behavior; do not weaken checks. -->

| ID | Story | Check | Kind | Expect initial | Initial evidence | Final evidence |
|----|-------|-------|------|----------------|------------------|----------------|
| AC-US1-1 | US1 | node --test --test-name-pattern="context packs" test/integration/context.test.mjs | command | fail | Original-baseline replay: 4 failures; timing disclosed below | Pass: 5 tests, including clean uninstall |
| AC-US1-2 | US1 | node --test --test-name-pattern="context provenance" test/integration/context.test.mjs | command | fail | Live regression: modified commit incorrectly verified; original baseline lacks named pins | Pass: 1 test |
| AC-US2-1 | US2 | node --test --test-name-pattern="context draft" test/integration/context.test.mjs | command | fail | Context command absent; original-baseline replay: 1 failure | Pass: 1 test |
| AC-US2-2 | US2 | node --test --test-name-pattern="context protection" test/integration/context.test.mjs | command | fail | Strengthened assertions reject unknown-command false positives; baseline: 21 failures | Pass: 22 tests |
| AC-US3-1 | US3 | node --test --test-name-pattern="context optimize reports" test/integration/context.test.mjs | command | fail | Context command absent; original-baseline replay: 1 failure | Pass: 1 test |
| AC-US3-2 | US3 | node --test --test-name-pattern="context optimize apply" test/integration/context.test.mjs | command | fail | Positive control prevents unknown-command false positives; baseline: 1 failure | Pass: 1 test |
| AC-US4-1 | US4 | node --test --test-name-pattern="context advisory" test/integration/context.test.mjs | command | fail | Context command absent; original-baseline replay: 1 failure | Pass: 1 test |
| AC-US4-2 | US4 | node --test --test-name-pattern="context output" test/integration/context.test.mjs | command | fail | Usage report absent; original-baseline replay: 1 failure | Pass: 1 test |

## Phase 8: Convergence

Assessment checked 20 functional requirements, 6 success criteria, 17 story
scenarios, 10 buildable plan decisions, all 24 existing tasks and 8 constitution
principles. Three partial gaps remain: one HIGH and two MEDIUM; no missing,
contradicting or unrequested implementation was identified. Delivery checks
remain pending, not waived.

- [x] T025 [US1] Add a clean optional-pack uninstall fixture separate from user-modified wrapper preservation; compare original fixture files and removal of every optional owned path per US1/AC4, FR-004 and SC-001 (partial).
- [x] T026 Record honest initial/final acceptance evidence and nonzero selector counts; distinguish observed delegate unit failures from retrospective original-baseline selector replay, never claim replay preceded coding, per T002, T004 and Constitution V (partial).
- [x] T027 Complete the single final configured local suite on the settled candidate and record its actual result before fresh-checkout review per T024 and SC-006 (partial). Execute `baton handoff write --phase implement --mode converge`; the mandatory local-check exit records the full-suite result. <!-- baton:handoff-write:implement -->

## Implementation Evidence

The eight commands were registered before coding. Initial source-integration
tests failed on a missing OPTIONAL_SOURCES export and two schema/pack
assertions; positive context behavior failed because the context command
did not exist. Missing yaml was a tooling failure, not behavioral red evidence.
Dependencies were then restored through the configured internal feed.

**Timing disclosure for T002/T004/T011/T016:** the delegate wrote its source
red tests in unit/init files, not the registered context selectors. The named
lifecycle/provenance selectors were populated later, and initial negative-only
checks could pass for the wrong unknown-command reason. No claim is made that
all eight exact selectors failed before implementation. Assertions were
strengthened, every unchanged selector was executed with a nonzero test count,
and the final tests were replayed against an isolated archive of original
commit `5e6de1be30c555f26669211b55194b5746611a8a`. All eight commands exited 1
on that original baseline. The replay is retrospective evidence, not a
fabricated pre-code run. The later lock-pin regression also failed live before
its corrective implementation. Registered commands/expectations were not
weakened, skipped or replaced.

| Check | Result and evidence |
|-------|---------------------|
| AC-US1-1 | Red: retrospective original-baseline selector exited 1, 5 tests with 4 failures because optional packs were unknown; Green: same selector passes 5 tests, all four selections, clean uninstall, re-init/update and edited-wrapper retention. |
| AC-US1-2 | Red: live selector accepted a substituted commit and failed; original-baseline replay also fails for missing named source pins; Green: selector passes 1 test covering exact pins, pin/tree tampering and raw payload changes. |
| AC-US2-1 | Red: positive operation failed because context was unknown; retrospective baseline confirms 1 failed test; Green: selector passes 1 draft CRLF compact/restore and no-write preview test. |
| AC-US2-2 | Red: strengthened selector fails 21 of 22 original-baseline tests, rejecting generic unknown-command errors as protection proof; Green: selector passes all 22 protection tests without forbidden side effects. |
| AC-US3-1 | Red: context optimize command absent, confirmed by original-baseline replay; Green: selector passes 1 test exercising all three report operations and unchanged governance, gates, scanner config, approval history and memory. |
| AC-US3-2 | Red: known-positive optimize control fails on original baseline rather than accepting arbitrary errors as safety; Green: selector passes 1 test covering apply, rule-removal, auto-execute, persistence and absent-pack refusal. |
| AC-US4-1 | Red: scope/concise operations absent, confirmed by original-baseline replay; Green: selector passes 1 test preserving ordered context, exclusions and session-only guidance. |
| AC-US4-2 | Red: readable usage operation fails on original baseline; Green: selector passes 1 test preserving readable reports, diagnostics, nonzero failures and duplicate-flag refusal. |

Targeted source/guard/build units: 29 passed. Additional filtered init and
validator checks: 4 passed, including live PowerShell-flavour initialization.
Markdown lint and type checking passed. YAML lint passed with unchanged
upstream formatting warnings. Sync check reproduced all 133 locked files;
offline lock verification passed. Latest runtime is 424942 bytes, below the
human-approved, strictly enforced 460800-byte cap.

The single final full suite is not claimed complete here in advance.
Its exact command and actual result belong to the mandatory implementation
exit receipt; T024/T027 stay unchecked until that receipt succeeds.
Independent review, human PR review and PR-head CI remain required.

## Final Validation Attempt 1

The mandatory implementation exit ran `npm run check`. Lint, types, bundle,
sync, lock and validation stages completed; the test stage failed: 464 tests,
462 passed, 2 failed. No implementation handoff was issued.

- New optional-lock test uses an in-tree `lock-optional-` temporary prefix
  without an ignore rule; F52 correctly rejects it.
- The unchanged landing fixture assumes pushing to a remote URL leaves local
  tracking stale. This Git updates the matching tracking ref, so the existing
  stale-tracking assertion fails. A targeted replay reproduces both failures.

These are not waived and the failed suite is not relabelled as passing.
The next full run requires a corrected candidate, not an unchanged-head retry.

- [x] T028 Move the new optional-lock test's temporary root to os.tmpdir(), retaining all provenance assertions and F52 enforcement.
- [x] T029 With explicit owner approval, simulate the remote-only advance from an independent repository in the existing landing fixture, retaining every stale-tracking and actual-remote publication assertion; do not alter production land behavior.
