# Feature Specification: Spec Kit 1.3.0 Migration

**Feature Branch**: `004-speckit-1-3-0-migration`

**Created**: 2026-11-05

**Status**: Draft

**Input**: Coordinator request: "Spec Kit 1.3.0 migration" — move Baton's pinned Spec Kit upstream from 1.0.11 to 1.3.0 through the feature relay.

## Context

Baton vendors GitHub Spec Kit at an exact pin (currently 1.0.11). Spec Kit has since released 1.0.12 through 1.3.0.
Two changes in that range affect Baton's public surface:

- 1.3.0 removes the core `taskstoissues` command (upstream #5053). The same function now lives in Spec Kit's
  bundled `github` extension (introduced in 1.0.13 and deprecated in core since 1.1.0). Baton's opt-in `issues`
  pack currently vendors the removed core command.
- 1.3.0 changes registered command hooks so each one is invoked only once (upstream #5219). Baton's relay depends
  on its mandatory `before_*`/`after_*` hooks firing exactly once per phase.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintainer bumps Baton to Spec Kit 1.3.0 (Priority: P1)

A Baton maintainer moves the Spec Kit pin to 1.3.0 using Baton's normal deliberate-upgrade path. The vendored
snapshot, lockfile, and hash-locked installer requirements all reflect 1.3.0. Reproducibility and lock checks pass,
and the reviewed upstream diff is recorded for the PR and CHANGELOG.

**Why this priority**: Without the pin bump nothing else in this feature exists. Every Baton release ships the pinned
snapshot to adopters.

**Independent Test**: On a clean checkout, rebuild the snapshot from the pins and verify the working tree against the
lock. Both commands report no differences, and the lock names Spec Kit 1.3.0 with its exact tag and commit.

**Acceptance Scenarios**:

1. **Given** the repository pinned to Spec Kit 1.0.11, **When** the maintainer bumps the pin to 1.3.0 through the
   supported bump command, **Then** the lock records version 1.3.0, tag `v1.3.0`, its full commit, and refreshed
   hash-locked requirements, and every vendored Spec Kit file's recorded checksum matches the 1.3.0 source.
2. **Given** the bumped repository, **When** the snapshot is rebuilt from the pins, **Then** the result is
   byte-identical to the committed tree.
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
3. **Given** an existing adopter on 1.0.11 Baton files, **When** they run Baton's update, **Then** unmodified
   managed files move to the 1.3.0 snapshot and local edits are preserved as reviewable conflicts.

---

### User Story 3 - Issue-creation pack follows Spec Kit's replacement (Priority: P2)

An adopter who enabled the opt-in `issues` pack can still create GitHub issues from `tasks.md`. The pack now
delivers Spec Kit's bundled `github` extension command in place of the removed core command. The command name
change is documented as a breaking change for that pack.

**Why this priority**: Only adopters who opted into `issues` are affected, but leaving the pack pointing at a file
that no longer exists upstream would break `sync` and the lock.

**Independent Test**: Install Baton with the `issues` pack on the new pin. The pack's issue-creation command is
present, comes from the pinned 1.3.0 source with recorded provenance, and the old core command is absent.

**Acceptance Scenarios**:

1. **Given** the `issues` pack enabled, **When** Baton is installed, **Then** the issue-creation command from Spec
   Kit's bundled `github` extension is installed with its supporting files and recorded checksums.
2. **Given** the `issues` pack enabled, **When** Baton is installed, **Then** no file from the removed core
   `taskstoissues` command is installed.
3. **Given** the release notes, **When** an adopter reads the upgrade entry, **Then** it names the old and new
   command and states what an existing `issues` pack user must do.

---

### Edge Cases

- An adopter locally edited a vendored Spec Kit file that 1.3.0 changes: update must not overwrite it, and must
  write the proposed version as a reviewable conflict.
- An adopter still has the old core `taskstoissues` skill from a previous install: Baton's update does not remove
  files that left the snapshot, so the upgrade guidance must name the stale path and the manual removal step.
- The upstream source for 1.3.0 is unreachable or its content does not match the lock during sync or install:
  the operation fails closed without writing partial output.
- A required upstream file needs a repair to work under Baton: the repair is declared, not hand-edited, and links
  an upstream issue or is marked pending upstream.
- Pack closure: no pack may still reference an upstream path that 1.3.0 no longer provides.

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
  from the 1.3.0 pin and MUST NOT deliver the removed core command.
- **FR-007**: The upgrade guidance MUST tell adopters who had the `issues` pack how to remove the stale core
  `taskstoissues` files that Baton's update leaves behind. Baton's update behavior does not change.
- **FR-008**: The CHANGELOG MUST record the bump under an **Upstream** subsection. The entry MUST call out the
  `issues` pack command rename as a breaking change and describe adopter action.
- **FR-009**: Public documentation that names the Spec Kit version, the `issues` pack command, or upgrade steps
  MUST be updated to match 1.3.0.
- **FR-010**: The full local gate (same as CI) MUST pass on the migrated tree.
- **FR-011**: The reviewed upstream diff summary for 1.0.11 → 1.3.0 MUST be available for the PR body.

### Key Entities

- **Spec Kit pin**: Upstream version, tag, commit, requirements file, and its checksum in the lock.
- **Vendored file record**: Path, upstream path, pack membership, upstream and stored checksums, and repair.
- **Pack**: A named, opt-in set of files. The `issues` pack is the only pack whose upstream source moves.
- **Relay hook**: A registered Spec Kit event hook that Baton requires before and after each phase.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The reproducibility and lock checks report 0 differences on the migrated tree.
- **SC-002**: The full local gate passes in a single run on the migrated tree.
- **SC-003**: 100% of relay phases have exactly one Baton receive hook and one handoff hook registered and
  dispatched under 1.3.0.
- **SC-004**: 0 files in any pack reference Spec Kit's removed core `taskstoissues` source.
- **SC-005**: An adopter with the `issues` pack can find the replacement command and required action from the
  CHANGELOG entry alone.

## Assumptions

- Target version is exactly 1.3.0, the latest stable release on 2026-11-05. Intermediate releases are not pinned
  separately.
- The `issues` pack follows Spec Kit's replacement (bundled `github` extension) rather than being retired.
  This is the recommended option; the baton records it as blocking question Q1 for the scope gate.
- Removing stale managed files during update is documented as a manual step rather than built into Baton's update.
  This is the recommended option; the baton records it as blocking question Q2 for the scope gate.
- Adopting Spec Kit's new Copilot `--no-model-invocation` option is out of scope.
- Cutting a Baton release that ships this migration is out of scope and follows the normal release process.
- The opt-in `token-budget` and `optimize` extension packs already declare compatible Spec Kit ranges and need no
  change beyond reverification.
- Automated upstream-watch upgrade PRs are not required for this migration. The bump is performed deliberately
  through the existing maintainer path.
