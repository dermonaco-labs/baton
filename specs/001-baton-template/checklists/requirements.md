# Specification Quality Checklist: Baton Template

**Purpose**: Check that the spec is complete and of good quality before implementation
**Created**: 2026-09-24
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] CHK001 The user stories describe user value and are independently testable (US1–US7 each have an Independent Test)
- [x] CHK002 Priorities are assigned, and the P1 set (US1–US3) forms a viable MVP
- [x] CHK003 Written for the maintainers and adopters of a template, with technology named only where the product is
  the tooling
- [x] CHK004 All mandatory sections are complete (scenarios, requirements, success criteria, assumptions)

## Requirement Completeness

- [x] CHK005 No `[NEEDS CLARIFICATION]` markers remain
- [x] CHK006 Every FR is testable. Each maps to an acceptance scenario, a quickstart scenario or a CI check
- [x] CHK007 The success criteria are measurable (file counts, minutes, byte-equality, exit codes, coverage)
- [x] CHK008 Edge cases are identified: existing Spec Kit, no bash, existing hooks, pre-Baton features, multiple
  features, upstream path changes, VS Code-only handoffs
- [x] CHK009 Scope is bounded (the Out of Scope section: npm publish, Pages site, gstack, autonomous pipelines)
- [x] CHK010 Dependencies and assumptions are listed (A1–A9), with upstream pins in research.md R1

## Handoff & Workflow Integrity (Baton-specific)

- [x] CHK011 Every feature-lane transition has entry and exit checks (contracts/phase-contracts.md, SC-003)
- [x] CHK012 There is exactly one planner, one executor per lane, one review path and one ship path
  (contracts/conflict-rules.md C2–C5)
- [x] CHK013 Artifact locations don't overlap (`specs/`, `docs/brainstorms`, `docs/solutions`, `.baton/quick`; no
  `docs/plans`)
- [x] CHK014 Human gates are explicit and recorded (clarify/specify, analyze, land)
- [x] CHK015 Stop-don't-choose is enforced mechanically (`E_BLOCKING_OPEN`, receive exit 3)
- [x] CHK016 Acceptance checks are pre-registered before implement (`E_NO_PREREG`, the Acceptance Registry in tasks.md)
- [x] CHK017 Model routing is configurable, not hard-coded. Defaults are dated suggestions, and enforcement is opt-in

## Supply Chain & Licensing

- [x] CHK018 Every upstream is pinned by an immutable reference (a version plus a commit SHA, and the tarball sha256
  recorded at the first sync)
- [x] CHK019 License and attribution duties are identified for every vendored source, and unlicensed content is
  excluded
- [x] CHK020 No project-specific content from the reference installation is carried over (only generalized
  lessons, research R8)
- [x] CHK021 The known upstream defect (ATV 2.6.3 agents) is detected, avoided (pinned to main) and repairable for
  adopters

## Notes

- All items pass. One item to verify during implementation doesn't block the plan: agent frontmatter `model`
  support (T064), which has an explicit stop-and-ask fallback.
