# Specification Analysis Report: Spec Kit 1.3.0 migration

**Feature**: `004-speckit-1-3-0-migration`

**Inputs**: `spec.md` (approved scope), `plan.md`, `tasks.md` (T001-T031), `research.md`, `data-model.md`,
`contracts/`, `.specify/memory/constitution.md`

**Mode**: read-only. No artifact was changed by this analysis.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| C1 | Constitution | MEDIUM | plan.md Constitution Check (VI); tasks.md T011 | Principle VI forbids two components doing the same job in one install. The `issues` install ships both `/speckit-taskstoissues` and `/speckit-github-taskstoissues`. The wrapper is a delegating alias with no issue-creation logic (FR-007, T021 asserts this), so only one component does the job. The plan's VI row does not state this reasoning. | Treat as compliant: the owner chose A+, and FR-007 forbids reimplementation. At implement, add one sentence to the plan's VI row saying the wrapper is an alias, not a second implementation. |
| I1 | Inconsistency | MEDIUM | spec.md SC-006; plan.md D12; tasks.md T009, T029 | SC-006 says "0 changes" to feature 003's bindings and to the set of files automation may regenerate. T009 adds a narrowing-only trust rule, and the old issues skill path leaves the upstream set. The effect is stricter, never wider. This matches FR-010 ("unchanged in effect"), but it is a literal code change in `candidate-bindings.mjs`. | Owner to confirm the D12 interpretation at the pre-code gate: narrowing-only change, existing tests unmodified, evidence by T029. |
| A1 | Ambiguity | MEDIUM | tasks.md T021 | "Exactly one skill reference, `/speckit-github-taskstoissues`" is ambiguous. The wrapper names itself in its message and names the extension command more than once. | At implement, read it as: the set of distinct skills referenced, other than the wrapper itself, is exactly `{speckit-github-taskstoissues}`. |
| G1 | Coverage | LOW | spec.md FR-004; tasks.md | No task verifies FR-004. It is already met: `baton/speckit-extension/extension.yml:11` declares `speckit_version: ">=1.0.11,<2.0.0"`. | Add an assertion in T017 (`relay-hooks.test.mjs`) that the range admits 1.3.0, or record the line as evidence in T016. |
| U1 | Underspecification | LOW | tasks.md Acceptance Registry AC-US1-4 | The check text mixes the command with a location note. The kind is `command`, but the evidence may be a hosted CI run. | Record the exact command and the CI run URL in the final evidence. Do not redefine the check. |
| E1 | Environment | LOW | plan.md R6; constitution VIII; tasks.md T002, T030 | Locally, `npm run check` cannot pass on the migrated tree when the approved mirror lacks `specify-cli==1.3.0`. Principle VIII is still met: the check is a single local command, and it runs anywhere with public PyPI. | Keep R6. Record the exact local error, plus the container or CI evidence, at implement. |

## Coverage Summary

| Requirement | Has task? | Task IDs | Notes |
|-------------|-----------|----------|-------|
| FR-001 | Yes | T013, T015, T016 | Pin, requirements and adopt manifest |
| FR-002 | Yes | T013, T016 | No Spec Kit repairs exist (`packs/repairs.yml`) |
| FR-003 | Yes | T013, T016, T030 | |
| FR-004 | No | none | Already met; see G1 |
| FR-005 | Yes | T017, T019 | |
| FR-006 | Yes | T004, T007, T008, T012, T020 | |
| FR-007 | Yes | T011, T021, T023 | |
| FR-008 | Yes | T010, T013 | The existing closure test covers `core` |
| FR-009 | Yes | T004, T018 | |
| FR-010 | Yes | T005, T009, T029 | See I1 |
| FR-011 | Yes | T023, T026, T027, T028 | |
| FR-012 | Yes | T027 | |
| FR-013 | Yes | T014, T028 | |
| FR-014 | Yes | T010, T018, T020, T021 | |
| FR-015 | Yes | T016, T030, T031 | |
| SC-001 | Yes | T016 | |
| SC-002 | Yes | T030 | See E1 |
| SC-003 | Yes | T017 | |
| SC-004 | Yes | T010 | |
| SC-005 | Yes | T018, T020 | |
| SC-006 | Yes | T005, T029 | See I1 |
| SC-007 | Yes | T027 | |

**Constitution alignment**: Principles I-VIII have no conflicts. C1 is a missing rationale, not a violation.
Principle V is met: ten acceptance checks are registered before code, and `n/a` baselines are justified in
`tasks.md`.

**Unmapped tasks**: none. T001-T002 are setup for T013 and T023. T019 and T026 are checkpoint runs.

## Metrics

| Metric | Value |
|--------|-------|
| Total requirements | 22 (FR-001-FR-015, SC-001-SC-007) |
| Total tasks | 31 |
| Coverage | 95% (21/22; FR-004 is already met) |
| Ambiguity count | 1 |
| Duplication count | 0 |
| Critical issues | 0 |
| Findings remaining open | CRITICAL: 0, HIGH: 0, MEDIUM: 3, LOW: 3 |

## Next actions

1. There are no CRITICAL or HIGH findings, so `/speckit-implement` may proceed after human pre-code approval.
2. At the gate, the owner confirms the I1 interpretation (D12, narrowing-only trust).
3. During implement, apply C1, A1 and G1 as described in the table. Treat E1 per R6.
