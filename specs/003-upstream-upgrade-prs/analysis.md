## Specification Analysis Report

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| C1 | Coverage gap | MEDIUM | spec.md FR-025; tasks.md T012, T017 | The new issue-close condition "no candidate is pending" has no registered test. T012 only covers the failing-validation report path. | In T012 (describe `upstream upgrade publish`), add report cases: the issue stays open while a candidate PR is open, waiting on a human edit or suppressed-but-newer, and closes only when everything is current. |
| C2 | Coverage gap | MEDIUM | spec.md SC-007; contracts/upstream-watch.md jobs; tasks.md T013 | SC-007 (a run finishes within 30 minutes) has no measurement task. The job timeouts on the critical path add up to 40 minutes (detect 10 + generate 20 + publish 5 + report 5). They are caps, not evidence. | Record SC-007 as post-merge evidence from the quickstart §3 preview run in T031. Do not claim it from timeouts. |
| C3 | Coverage detail | MEDIUM | tasks.md Acceptance Registry | Six acceptance commands use `--test-name-pattern` filters. They can pass with zero matching tests if names drift. | In T031, verify that each selector runs a nonzero number of tests, and record the counts. |
| C4 | Coverage gap | MEDIUM | spec.md FR-020, FR-024, SC-005; tasks.md T012, T025 | Two negative publish paths are only unit-tested at the planning level (T024). (1) A failed or missing generate leg must not open or modify its candidate PR. (2) An `obsolete-human` PR must receive no push, comment or close. | Add both cases to the T025 integration suite, with assertions on the recording API mock. |
| U1 | Underspecification | LOW | tasks.md T018 | The download-artifact SHA is not yet chosen ("a matching release"). | Resolve it from the official release tag at implementation time, verify the SHA, and record it with a `# vN` comment. Never invent it. |
| C5 | Coverage detail | LOW | spec.md FR-026; tasks.md T013 | T013 does not explicitly assert `runs-on: ubuntu-latest`, the free hosted runner the contract requires. | Add a `runs-on` assertion to T013's per-job checks. |
| I1 | Ordering | LOW | tasks.md Phase 3; plan.md D-US4-FIRST | US4 is P3 but is implemented before the P1 MVP. | No action. The bump operation is a prerequisite of candidate generation, as recorded in decision D-US4-FIRST. |
| A1 | Ambiguity | LOW | tasks.md T025 | "zero PR/issue-body writes beyond the unchanged issue content" allows an issue update with identical content. SC-004 counts only pushes, PR edits and CI runs. | Prefer skipping the issue update when the rendered body is unchanged. Either way, assert zero pushes and zero PR edits. |
| E1 | Evidence timing | LOW | tasks.md AC-US4-2, T031; quickstart §3–4 | AC-US4-2 needs network access, and the live behavior (SC-001) can only be verified after merge. | Record AC-US4-2 as pending with a reason if no network is available. Keep quickstart §3–4 as post-merge operational evidence. |

**Coverage Summary**

| Requirement key | Has task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | Yes | T013, T018 | The existing watcher stays the only detector |
| FR-002, FR-004, FR-005 | Yes | T002, T004, T006, T011, T014, T022 | Strict formats and immutable pins |
| FR-003 | Yes | T022, T023 | ATV follows the lock's ref |
| FR-006–FR-008 | Yes | T005–T010 | Lock-only pins; verify before write; restore on failure |
| FR-009–FR-010 | Yes | T012, T013, T016, T018 | Four-job least-privilege split; publish executes nothing |
| FR-011 | Yes | T018, T030 | Full Linux local gate in generate |
| FR-012 | Yes | T011, T022 | Lock-diff restriction and path policy |
| FR-013–FR-016 | Yes | T011, T012, T016 | Draft PR on a deterministic branch, body sections, forbidden-API recorder |
| FR-017 | Yes | T011, T026, T028 | `ready_for_review` trigger; PR body section 6 |
| FR-018–FR-021 | Yes | T024, T025, T027 | Partial integration coverage, see C4 |
| FR-022 | Yes | T013, T018 | Constant concurrency group |
| FR-023–FR-025 | Yes | T011, T012, T017 | Close condition, see C1 |
| FR-026 | Yes | T013, T018, T032 | `runs-on` assertion, see C5 |
| FR-027 | Yes | T012, T013, T017 | Preview writes only the run summary |
| FR-028 | Yes | T010, T020, T021, T029 | Docs, 001 supersession notes, CHANGELOG |
| FR-029 | Yes | T024, T025, T027 | Obsolete close order; no suppression |
| SC-001 | Yes | T011–T023 | Live confirmation post-merge (E1) |
| SC-002 | Yes | T018, T030 | `sync --check` inside `npm run check` |
| SC-003 | Yes | T011 | PR body content |
| SC-004 | Yes | T025 | See A1 |
| SC-005 | Yes | T012, T025 | See C4 |
| SC-006 | Yes | T005, AC-US4-2 | |
| SC-007 | Partial | T013 | Timeouts only, see C2 |

**Constitution alignment:** No conflicts found.

- Principle II is preserved and strengthened. The lock becomes the only pin record, so every verified pin has one source. Candidates reproduce through `sync --check`, and adopters receive nothing until a human merges and releases.
- ATV's commit-only main pin (`version: null`) is pre-existing. Release tracking adds an exact version.
- Supply-chain verification (sha256, commit and tree, hash-locked requirements, no ATV execution, no unpinned installers) is unchanged.
- Principles III–VIII hold: handoff phases are unchanged, scope questions were resolved by the human gate, the acceptance checks are pre-registered, there is no second detector, no model names are hard-coded, and the local gate runs before publication.

**Unmapped tasks:** None. T001 covers initial evidence. T002–T004 are shared foundations. T030–T032 are the final gate, evidence and leak scan.

**Metrics:**

| Metric | Value |
|--------|-------|
| Requirements/outcomes | 36 (29 FR, 7 SC) |
| Tasks | 32 |
| Requirements with at least one task | 100% |
| Unresolved ambiguities | 0 |
| Material duplications | 0 |

| Summary | Counts |
|---------|--------|
| Findings remaining open | CRITICAL: 0, HIGH: 0, MEDIUM: 4, LOW: 5 |

**Next actions:** No blocking design findings. Obtain the mandatory pre-code approval. During implementation, apply the C1, C3, C4 and C5 test additions within the existing task scopes. Their describe names keep the registered selectors valid. Record C2 and E1 as post-merge evidence. No remediation was applied to spec.md, plan.md or tasks.md during analysis.
