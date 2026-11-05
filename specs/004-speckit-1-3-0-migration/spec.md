# Feature Specification: Spec Kit 1.3.0 Migration

**Feature Branch**: `004-speckit-1-3-0-migration`

**Created**: 2026-11-05

**Status**: Draft

**Input**: Coordinator request (owner-directed): migrate Baton's pinned Spec Kit upstream from 1.0.11 to 1.3.0
through the feature relay. Resolve the 1.1.3–1.3.0 `E_DANGLING_REF` closure failure, where `taskstoissues` refers
to `github-taskstoissues` outside the `issues` pack. Keep issue creation opt-in, with nothing added to `core`.
Keep feature 003's trusted-base byte and mode bindings intact. Add regression tests and run the reproducibility
and required checks.

## Context

Baton vendors GitHub Spec Kit at an exact pin (currently 1.0.11). Spec Kit has since released 1.0.12 through 1.3.0.
Three changes in that range affect Baton:

- Spec Kit moved GitHub issue creation from the core `taskstoissues` command into its bundled, opt-in `github`
  extension (`speckit.github.taskstoissues`). The extension arrived in 1.0.13, core was deprecated in 1.1.0, and
  core was removed in 1.3.0 (upstream #5053). Upstream registers no alias for the old name. Baton's opt-in `issues`
  pack vendors the core command.
- From 1.1.3 onward the core command's content references `github-taskstoissues`. That command is outside the
  `issues` pack and its required closure, so Baton's pack closure check fails with `E_DANGLING_REF`. This blocks
  any bump past 1.1.2, and therefore the upstream-upgrade automation from feature 003.
- 1.3.0 changes registered command hooks so each one is invoked only once (upstream #5219). Baton's relay depends
  on its mandatory `before_*`/`after_*` hooks firing exactly once per phase.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintainer bumps Baton to Spec Kit 1.3.0 (Priority: P1)

A Baton maintainer moves the Spec Kit pin to 1.3.0 using Baton's normal deliberate-upgrade path. The vendored
snapshot, lockfile, and hash-locked installer requirements all reflect 1.3.0, the pack closure check passes,
reproducibility and lock checks pass, and the reviewed upstream diff is recorded for the PR and CHANGELOG.

**Why this priority**: Without the pin bump nothing else in this feature exists. The closure failure blocks
the bump today.

**Independent Test**: On a clean checkout, rebuild the snapshot from the pins and verify the working tree against the
lock. Both commands report no differences, the closure check reports no dangling references, and the lock names Spec
Kit 1.3.0 with its exact tag and commit.

**Acceptance Scenarios**:

1. **Given** the repository pinned to Spec Kit 1.0.11, **When** the maintainer bumps the pin to 1.3.0 through the
   supported bump command, **Then** the lock records version 1.3.0, tag `v1.3.0`, its full commit, and refreshed
   hash-locked requirements, and every vendored Spec Kit file's recorded checksum matches the 1.3.0 source.
2. **Given** the bumped repository, **When** the snapshot is rebuilt from the pins, **Then** the result is
   byte-identical to the committed tree and no pack reports `E_DANGLING_REF`.
3. **Given** the bumped repository, **When** the full local gate runs, **Then** it passes with no new warnings
   attributable to the bump.

---

### User Story 2 - Adopter relay keeps working on 1.3.0 (Priority: P1)

An adopter who installs or updates Baton gets Spec Kit 1.3.0. Every relay phase still runs its mandatory Baton
receive hook before the phase and its handoff hook after it, each exactly once.

**Why this priority**: The relay is Baton's core value. A silent change in hook dispatch would break the
"explicit handoffs" guarantee without any visible error.

**Independent Test**: In a freshly initialized project on the new pin, inspect the registered hooks and run one
phase. Each mandatory Baton hook is registered once per phase event and dispatched once.

**Acceptance Scenarios**:

1. **Given** a fresh Baton install on 1.3.0, **When** the hook registry is inspected, **Then** every relay phase has
   exactly one mandatory Baton receive hook and one mandatory Baton handoff hook, matching the 1.0.11 set.
2. **Given** a fresh install, **When** the installation health check runs, **Then** it reports the Baton hooks as
   registered with no new errors.
3. **Given** a core-only install (no `issues` pack), **When** Baton is installed, **Then** no issue-creation
   command, `github` extension file, or compatibility wrapper is installed, and the core closure check passes.

---

### User Story 3 - Issue creation stays opt-in and keeps its command (Priority: P2)

An adopter who enables the opt-in `issues` pack gets Spec Kit's bundled `github` extension issue-creation command.
The familiar `/speckit-taskstoissues` command keeps working: it is a thin, Baton-authored compatibility wrapper that
delegates to the extension command and does not reimplement it. Existing users of the pack are not forced to learn
a new name. The canonical `/speckit-github-taskstoissues` command is also available.

**Why this priority**: Only adopters who opted into `issues` are affected. Without this story the pack points at a
source that 1.3.0 no longer ships, and the bump cannot pass closure.

**Independent Test**: Install Baton with the `issues` pack on the new pin. Both `/speckit-taskstoissues` and
`/speckit-github-taskstoissues` are present, the wrapper names the extension command as its only implementation,
every pack reference resolves inside the pack and its requirements, and all files have recorded provenance.

**Acceptance Scenarios**:

1. **Given** the `issues` pack enabled, **When** Baton is installed, **Then** the bundled `github` extension's
   issue-creation command and its supporting files are installed from the 1.3.0 pin with recorded checksums.
2. **Given** the `issues` pack enabled, **When** `/speckit-taskstoissues` is invoked, **Then** the wrapper delegates
   to the extension command and adds no other issue-creation behavior.
3. **Given** the `issues` pack enabled, **When** pack closure is checked, **Then** every reference, including
   `taskstoissues` → `github-taskstoissues`, resolves within the `issues` pack plus `core`.
4. **Given** an adopter who had the 1.0.11 `issues` pack, **When** they run Baton's update, **Then** their unmodified
   `/speckit-taskstoissues` skill is replaced in place by the wrapper. A locally modified copy is kept and offered
   as a reviewable conflict, which is existing update behavior.

---

### Edge Cases

- An adopter locally edited a vendored Spec Kit file that 1.3.0 changes: update must not overwrite it, and must
  write the proposed version as a reviewable conflict.
- Stale files after update: the wrapper occupies the same path as the 1.0.11 core `taskstoissues` skill, so the
  skill itself leaves no orphan. Planning must confirm that the 1.0.11 `issues` pack managed no other file that
  1.3.0 drops. Any file it does find is documented as a manual removal step, without changing update behavior.
- The wrapper is invoked in an install where the extension command is missing: the wrapper must fail with a clear
  message naming the missing command and the `issues` pack. It must not fall back to any reimplementation.
- The upstream source for 1.3.0 is unreachable, or its content does not match the lock during sync or install:
  the operation fails closed without writing partial output.
- A required upstream file needs a repair to work under Baton: the repair is declared, not hand-edited, and links
  an upstream issue or is marked pending upstream.
- The upstream-upgrade automation from feature 003 proposes a future bump that touches the wrapper, extension,
  preset, or registry files: those changes stay outside the automation's allowed regenerated outputs and require
  manual review.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Baton MUST pin Spec Kit to exactly version 1.3.0, recording the tag, the full commit, and hash-locked
  installer requirements including transitive packages.
- **FR-002**: Every vendored Spec Kit file in every pack MUST be byte-identical to the 1.3.0 source or covered by a
  declared, documented repair, and its checksum and provenance MUST be recorded in the lock.
- **FR-003**: Rebuilding the snapshot from the pins MUST reproduce the committed tree byte-for-byte, and the lock
  verification MUST pass.
- **FR-004**: Baton's Spec Kit extension MUST declare a supported Spec Kit version range that includes 1.3.0.
- **FR-005**: For each relay phase, exactly one mandatory Baton receive hook and one mandatory Baton handoff hook
  MUST be registered and dispatched once under 1.3.0.
- **FR-006**: The opt-in `issues` pack MUST deliver Spec Kit's bundled `github` extension issue-creation command
  (`/speckit-github-taskstoissues`) and its supporting files from the 1.3.0 pin. It MUST NOT deliver any file from
  the removed core command.
- **FR-007**: The `issues` pack MUST also deliver `/speckit-taskstoissues` as a Baton-authored compatibility
  wrapper. The wrapper's only behavior is to delegate to the extension command. It MUST NOT reimplement issue
  creation, MUST be tracked as Baton-owned rather than as an upstream file, and MUST fail clearly if the extension
  command is absent.
- **FR-008**: The pack closure check MUST pass for `core` alone and for `core` + `issues` with no `E_DANGLING_REF`.
  Every reference from `taskstoissues` to `github-taskstoissues` MUST resolve inside the `issues` pack and its
  requirements.
- **FR-009**: Issue creation MUST remain opt-in. `core` MUST NOT contain the `github` extension, the wrapper, or any
  reference that requires them.
- **FR-010**: The trusted-base byte and mode bindings from feature 003 MUST remain unchanged in effect. The
  upstream-upgrade automation MUST NOT gain permission to regenerate or modify extension, preset, registry, or
  wrapper files; changes to them MUST stay manual-review.
- **FR-011**: Baton's update behavior MUST NOT change. Any residual manual removal for `issues` pack adopters MUST
  be documented in the CHANGELOG and README. If planning confirms there is none, the CHANGELOG MUST say so.
- **FR-012**: The CHANGELOG MUST record the bump under an **Upstream** subsection. It MUST state that
  `/speckit-taskstoissues` is now a compatibility wrapper over `/speckit-github-taskstoissues`.
- **FR-013**: Public documentation that names the Spec Kit version, the `issues` pack commands, or upgrade steps
  MUST be updated to match 1.3.0.
- **FR-014**: Regression tests MUST cover issue-command availability with the `issues` pack (both commands present;
  the wrapper delegates to the extension command), pack closure (`core` and `core` + `issues`), and a core-only
  install without the `issues` pack (no issue-creation files present).
- **FR-015**: The reproducibility check, lock verification, and the full local gate (same as CI) MUST pass on the
  migrated tree. The reviewed 1.0.11 → 1.3.0 upstream diff summary MUST be available for the PR body.

### Key Entities

- **Spec Kit pin**: Upstream version, tag, commit, requirements file, and its checksum in the lock.
- **Vendored file record**: Path, upstream path, pack membership, upstream and stored checksums, and repair.
- **Pack**: A named, opt-in set of files plus its required packs, which together form its closure. Of the existing
  packs, only `issues` changes content.
- **Compatibility wrapper**: A Baton-owned `/speckit-taskstoissues` skill in the `issues` pack that delegates to the
  upstream extension command.
- **Relay hook**: A registered Spec Kit event hook that Baton requires before and after each phase.
- **Trusted-base binding**: Feature 003's recorded byte and mode expectations that limit which files the
  upgrade automation may change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The reproducibility and lock checks report 0 differences on the migrated tree.
- **SC-002**: The full local gate passes in a single run on the migrated tree.
- **SC-003**: 100% of relay phases have exactly one Baton receive hook and one handoff hook registered and
  dispatched under 1.3.0.
- **SC-004**: The pack closure check reports 0 dangling references for `core` and for `core` + `issues`.
- **SC-005**: A core-only install contains 0 issue-creation files, and an `issues` install exposes both issue
  commands.
- **SC-006**: 0 changes to feature 003's trusted-base bindings or to the set of files the upgrade automation may
  regenerate.
- **SC-007**: An adopter with the `issues` pack can learn from the CHANGELOG entry alone whether any action is
  required.

## Assumptions

- Target version is exactly 1.3.0, the latest stable release on 2026-11-05. Intermediate releases are not pinned
  separately; resolving the closure for 1.3.0 also covers the 1.1.3–1.2.6 failure mode.
- Owner decision (Q1, A+): the `issues` pack follows the bundled `github` extension and keeps
  `/speckit-taskstoissues` as a thin Baton-authored wrapper. Owner decision (Q2, X): Baton's update behavior does
  not change. Both are recorded as baton questions awaiting the owner's formal answer at the scope gate.
- The 1.0.11 `issues` pack managed only the core `taskstoissues` skill file. Planning must verify this.
- Adopting Spec Kit's new Copilot `--no-model-invocation` option is out of scope.
- Merging, tagging, releasing, changing repository settings, and dispatching workflows are out of scope. A Baton
  release that ships this migration follows the normal release process separately.
- The opt-in `token-budget` and `optimize` extension packs already declare compatible Spec Kit ranges and need no
  change beyond reverification.
