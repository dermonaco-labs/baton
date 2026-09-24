# Specification Analysis Report: Baton Template

**Feature**: `001-baton-template` · **Command**: `/speckit-analyze` (review role) · **Date**: 2026-09-24
**Inputs**: spec.md, plan.md, tasks.md, research.md, data-model.md, contracts/*, quickstart.md,
`.specify/memory/constitution.md`
**Analyzed at**: commit `23b1a1d` · **Fixes applied in**: the commit that adds this file

Spec Kit's analyze is read-only and prints its report in the chat. This file is that report, persisted the way
Baton's `speckit.baton.handoff` will persist it (phase-contracts `analysis-recorded`). The analysis ran first, and all
CRITICAL and HIGH findings were then fixed in the planning docs. The "Disposition" column records the outcome.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation → Disposition |
|---|---|---|---|---|---|
| C1 | Constitution | CRITICAL | research R4, FR-011, T023, data-model §5 | `sync` installed Spec Kit via bare `uvx --from specify-cli==<pin>` (transitive PyPI deps unhashed) and fetched ATV as a codeload tarball whose bytes GitHub does not guarantee to be stable (TOFU `tarball_sha256`). This violates the constitution's "verified against the lockfile" rule and risks SC-005. | Hash-locked install plus content-addressed git fetch. → **Fixed**: `uv pip install --require-hashes -r baton/upstream/specify-cli.requirements.txt` (new T096); `git fetch --depth 1 <repo> <commit>` with commit and tree ids verified (`E_UPSTREAM_VERIFY`); lock fields `requirements_sha256`, `tree`; constitution 1.0.1 wording. |
| H1 | Inconsistency | HIGH | ci.md template-cleanup, T049, T052, R12 | The cleanup workflow deleted maintainer workflows, but `GITHUB_TOKEN` can never push changes under `.github/workflows/`, so cleanup would always fail. | Don't touch workflows from CI. → **Fixed**: `adopt --no-workflows` in the workflow; maintainer workflows are dormant behind `if: github.repository == 'dermonaco-labs/baton'` (T099); optional local `adopt --prune-workflows`; plan Complexity row. |
| H2 | Coverage gap | HIGH | plan RK1, spec | Risk RK1 (hooks skipped locally) relied on "CI catches it", but derived repos got no CI at all. | Ship an adopter workflow. → **Fixed**: FR-033, `baton.yml` (`contents: read`, `validate --github`, `doctor`), T095, AC-US1-5, `W_NO_ADOPTER_CI`. |
| H3 | Underspecification | HIGH | plan structure, T049, T051 | The cleanup list was vague: derived repos would inherit Baton's own constitution, `package.json`, CODEOWNERS, community files and dependabot npm config. | Normative disposition table. → **Fixed**: plan.md "Template disposition" (Remove / Replace / Move / Keep dormant / Keep active); T049/T051/S1 assert it. |
| H4 | Underspecification | HIGH | packs.md, FR-050/051, T025, T057 | Where optional-pack payloads live in the Baton repo was undefined, so `init --packs` had nothing to copy, and derived repos had no path to add packs. | Define storage and the derived-repo path. → **Fixed**: FR-053, `packs/<id>/files/`, lock `stored_at`, exit 5 plus the pinned `npx` command. |
| H5 | Inconsistency | HIGH | phase-contracts analyze exit, FR-024, T040 | The implement gate required an analyze report file, but upstream `speckit-analyze` is strictly read-only and writes nothing, so `analysis-recorded` could never pass. | Persist the report from the Baton hook. → **Fixed**: `analysis.md` written by `handoff write --phase analyze --analysis-from`; baton field `analysis`; `E_ANALYSIS_MISSING`, `E_ANALYSIS_CRITICAL`; R13. |
| H6 | Inconsistency | HIGH | data-model staleness, FR-024, S3 | `fresh:tasks` hashed raw `tasks.md`, but implement checks boxes as it goes, so every multi-session implement or converge re-entry would fail with `E_STALE_ARTIFACT`. | Checkbox-insensitive hashing for `tasks.md`. → **Fixed**: data-model §1 Hashing, FR-024, T098, AC-US3-7, quickstart S3 step 7. |
| H7 | Ambiguity / supply chain | HIGH | phase-contracts `findings-json-valid`, T042 | Review validation depended on an upstream-internal ce-review file (`references/findings-schema.json`) and on interactive mode, which calls `todo-create` (not in core). | Baton-owned findings format, headless mode. → **Fixed**: `ce-review mode:headless`, normalized to `review.json` validated by `findings.schema.json` (T097, data-model §8); `todo-create` is an `optional_ref`; `.context/` gitignored; C4 note. |
| M1 | Inconsistency | MEDIUM | FR-025 vs cli.md, T037 | `show` was required by FR-025 but missing from cli.md and T037. | → **Fixed**: `handoff show` in cli.md and T037. |
| M2 | Underspecification | MEDIUM | phase table (specify, analyze, review) | Who picks `next_phase` on branching phases was undefined. | → **Fixed**: `handoff write --next`; default = first `next`; specify→plan only with 0 markers (sets the gate); review→implement automatic with blocking findings. phase-contracts § Transition rules. |
| M3 | Underspecification | MEDIUM | brainstorm row | Brainstorm has no feature dir, so it can't write a baton, yet specify's entry referenced it. | → **Fixed**: `--from-brainstorm <path>` on the first baton; history entry satisfies `from-phase:brainstorm`. |
| M4 | Coverage gap | MEDIUM | FR-072 vs ci.md, T072 | FR-072 requires `sync --check` in upstream-watch; ci.md and T072 omitted it (it's also how an unreachable ATV commit, AS3, gets detected). | → **Fixed**: ci.md upstream-watch and T072. |
| M5 | Coverage gap | MEDIUM | FR-061, T080 | Notices listed ajv and yaml but not their bundled transitive deps (fast-uri is BSD-3-Clause, plus fast-deep-equal, json-schema-traverse, require-from-string). | → **Fixed**: T005 derives a license inventory from the esbuild metafile; `E_LICENSE` covers bundled packages; FR-061 and T080 updated. |
| M6 | Coverage gap | MEDIUM | SC-001 | SC-001 (≤ 10 min for a newcomer) had no acceptance check. | → **Fixed**: AC-US1-4 (manual, timed walkthrough) in T093. |
| L1 | Inconsistency | LOW | plan Scale vs SC-002 | The plan said "≤ 28" while SC-002 says ≤ 30. | → **Fixed**: 28 planned, ≤ 30 allowed. |
| L2 | Underspecification | LOW | cli.md `adopt` | `BATON_FORCE_CLEANUP` and adopt's refusal to run in the source repo were undocumented; `baton.lock.json` would wrongly block a fresh derived repo. | → **Fixed**: cli.md (signal = `GITHUB_REPOSITORY`/`origin`), T051. |
| L3 | Coverage gap | LOW | FR-070, cli.md validate | `validate` didn't list `packs/*.yml`. | → **Fixed**: cli.md validate scope includes packs and `review.json`. |
| L4 | Coverage gap | LOW | SC-003 | No test asserted that every feature-lane phase has ≥ 1 entry and ≥ 1 exit check. | → **Fixed**: added to T019. |
| L5 | Ambiguity | LOW | data-model `history.commit` | Meaning of `commit` was unstated (the baton can't contain its own commit). | → **Fixed**: short `HEAD` at write time, null before the first commit. |
| L6 | Duplication | LOW | T044, cli.md escalate | `escalate` created `specs/NNN-slug/` itself, duplicating Spec Kit's numbering and branch logic. | → **Fixed**: escalate hands the quick baton to `/speckit-specify`. |
| L7 | Underspecification | LOW | T054 | The Baton repo's own `config.checks` wasn't defined. | → **Fixed**: `npm run check`. |
| L8 | Coverage gap | LOW | FR-032, T086 | T086 lacked the project-defined dependency step. | → **Fixed**: T086 and FR-032 (hash-locked install when the requirements file exists). |
| L9 | Ambiguity | LOW | phase table | `gate-approved` appeared only for plan and implement, though every phase after a gate needs it. | → **Fixed**: "Implicit gate entry" rule in phase-contracts. |
| L10 | Constitution wording | LOW | constitution § Delivery Workflow | "Gates after specify and clarify" read as two scope gates, contradicting the phase table. | → **Fixed**: constitution PATCH 1.0.1 with a Sync Impact Report. |

## Coverage Summary

| Requirement | Has task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | ✓ | T048–T054, T095 | |
| FR-002 | ✓ | T015, T055–T059 | |
| FR-003 | ✓ | T038, T051, T053, T062, T070 | |
| FR-004 | ✓ | T005, T085 | |
| FR-010 | ✓ | T009, T025, T027, T096 | |
| FR-011 | ✓ | T023, T025, T028, T096 | fixed by C1 |
| FR-012 | ✓ | T025, T084 | |
| FR-013 | ✓ | T020, T024 | |
| FR-014 | ✓ | T026, T080 | |
| FR-020 | ✓ | T007, T034 | |
| FR-021 | ✓ | T008, T017, T039 | |
| FR-022 | ✓ | T021, T040, T046 | |
| FR-023 | ✓ | T041–T043 | |
| FR-024 | ✓ | T032–T036, T040, T098 | fixed by H5, H6 |
| FR-025 | ✓ | T037 | fixed by M1 |
| FR-030 | ✓ | T020, T045, T077 | |
| FR-031 | ✓ | T014, T045 | |
| FR-032 | ✓ | T086 | fixed by L8 |
| FR-033 | ✓ | T095, T099 | new (H2) |
| FR-040 | ✓ | T008, T066, T068 | |
| FR-041 | ✓ | T034, T068 | |
| FR-042 | ✓ | T067 | |
| FR-050 | ✓ | T009, T016, T020 | |
| FR-051 | ✓ | T020 | |
| FR-052 | ✓ | T026 | |
| FR-053 | ✓ | T025, T057, T058 | new (H4) |
| FR-060 | ✓ | T075–T081 | |
| FR-061 | ✓ | T005, T080 | fixed by M5 |
| FR-062 | ✓ | T087, T089–T092 | |
| FR-070 | ✓ | T036, T082, T083, T097 | |
| FR-071 | ✓ | T084 | |
| FR-072 | ✓ | T072 | fixed by M4 |
| FR-073 | ✓ | T085 | |
| SC-001 | ✓ | T093 (AC-US1-4) | fixed by M6 |
| SC-002 | ✓ | T020, T026 | |
| SC-003 | ✓ | T019, T035 | fixed by L4 |
| SC-004 | ✓ | T056 (AC-US2-2) | |
| SC-005 | ✓ | T025, T084 (AC-US5-1) | fixed by C1 |
| SC-006 | ✓ | T026, T080 | |
| SC-007 | ✓ | T088 (AC-US7-1) | |
| SC-008 | ✓ | T082 (AC-US6-1) | |

## Constitution Alignment

- **Before fixes**: one violation (C1, Supply-Chain & Licensing and Principle II) and one wording ambiguity (L10).
- **After fixes**: no violations. Principles I–VIII are satisfied by the plan's Constitution Check. The only exception
  is the dormant maintainer workflows in derived repos, which is justified in plan.md Complexity Tracking. The
  constitution is amended to 1.0.1 (PATCH, clarifications only).

## Unmapped Tasks

None. Setup tasks T001–T006 are the build and check infrastructure for FR-004 and FR-070. T074 (the ATV upstream issue)
stays a draft only; the owner files it.

## Metrics

| Metric | Value |
|---|---|
| Functional requirements | 33 (FR-001 … FR-073, including new FR-033 and FR-053) |
| Success criteria | 8 |
| Total tasks | 99 (T001–T094 unchanged IDs, T095–T099 added) |
| Acceptance checks registered | 26 (AC-US1-4, AC-US1-5 and AC-US3-7 added) |
| Requirement coverage (≥ 1 task) | 100% (41/41) |
| Ambiguity count | 3 found (H7, L5, L9), 0 remaining |
| Duplication count | 1 found (L6), 0 remaining |
| Findings found | CRITICAL 1 · HIGH 7 · MEDIUM 6 · LOW 10 |
| Findings remaining open | **CRITICAL 0 · HIGH 0** · MEDIUM 0 · LOW 0 |

## Next Actions

- No CRITICAL or HIGH findings remain, so the pre-code gate can be reviewed.
- The owner or orchestrator approves the gate (`gate.approved_by` in handoff.md), then `/speckit-implement` starts at
  T001. MVP = Setup + Foundational + US3 + US1: T001–T054 plus T095–T098.
