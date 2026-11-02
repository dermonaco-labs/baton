# Feature Specification: Optional Context Optimization Packs

**Feature Branch**: `dermonaco-add-token-budget-optimize-packs`

**Created**: 2026-11-02

**Status**: Draft - awaiting scope approval

**Input**: Add spec-kit-token-budget and spec-kit-optimize as two optional,
opt-in Baton packs, with pinned upstream provenance and safeguards against
rewriting approved artifacts or weakening governance.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select Reproducible Optional Packs (Priority: P1)

As a repository adopter, I can select either optimization pack or both without
changing the default core installation, and can trace every upstream file to
its reviewed source.

**Why this priority**: Optimization must be an explicit choice, and adopters
must receive the same verified inputs rather than unreviewed upstream updates.

**Independent Test**: Install each optional selection in a clean fixture,
verify provenance, then uninstall and compare against the original fixture.

**Acceptance Scenarios**:

1. **Given** a default installation, **When** neither pack is selected,
   **Then** no optional optimization files or commands are installed and core
   defaults are unchanged.
2. **Given** a clean adopter fixture, **When** token-budget, optimize, or both
   are explicitly selected, **Then** only the selected optional capabilities
   are added alongside core with verified provenance.
3. **Given** an installed optional selection, **When** the adopter updates or
   repeats installation, **Then** ownership remains consistent and user edits
   are not silently overwritten.
4. **Given** an unmodified installed fixture, **When** the adopter uninstalls
   Baton, **Then** the fixture returns to its original state; user-edited
   files in a separate fixture are preserved according to existing policy.
5. **Given** a substituted source revision or modified payload,
   **When** synchronization or installation verifies it, **Then** it refuses
   the unverified input and identifies the failure.

---

### User Story 2 - Compact Drafts Without Invalidating Trust (Priority: P1)

As an author, I can reduce unnecessary context in draft SDD artifacts before
approval and hash binding, without invalidating existing approvals, handoff
reading instructions, or managed instructions.

**Why this priority**: Smaller artifacts are useful only if approval and
handoff integrity remain reliable.

**Independent Test**: Compact and restore an eligible draft, then attempt the
same operations against every protected target category and compare files,
backups, bindings and approval records before and after each refusal.

**Acceptance Scenarios**:

1. **Given** an explicitly selected, unapproved and unbound draft artifact,
   **When** the author requests a preview, **Then** the result describes the
   proposed operation without writing files or creating backups.
2. **Given** that eligible draft and an explicit apply request,
   **When** compaction is applied, **Then** the draft is replaced with the
   reviewed candidate, its original content can be restored, and governance
   and agent instructions remain unchanged.
3. **Given** an approved, hash-bound, source-of-truth, or handoff
   `read_first` target, **When** compact or restore is requested,
   **Then** live mutation is refused with a specific reason and no side effects.
4. **Given** a target with ambiguous approval state, malformed protection
   metadata, a stale candidate or an escaping/aliased path,
   **When** a write is requested, **Then** the operation fails closed.
5. **Given** an unapproved artifact already bound by a recorded hash,
   **When** the author requests compaction, **Then** it remains protected;
   the operation never clears bindings or refreshes approvals to proceed.

---

### User Story 3 - Audit Governance Without Weakening It (Priority: P1)

As a maintainer, I can use optimize to inspect instruction overhead, redundant
rules and session learnings without allowing the audit to remove mandatory
rules or directly modify governance.

**Why this priority**: Optimization advice must not become an alternative
approval or constitution-amendment workflow.

**Independent Test**: Exercise run, tokens and learn, including apply-like
requests, and verify that governance, gates, scanner rules, approval state
and persistent agent memory are unchanged.

**Acceptance Scenarios**:

1. **Given** optimize is selected, **When** run, tokens or learn is invoked,
   **Then** it returns findings or proposals without applying changes.
2. **Given** an audit recommendation that a human gate or scanner rule is
   redundant or costly, **When** the report is generated,
   **Then** that mandatory rule is preserved and cannot be removed by optimize.
3. **Given** a request to apply governance recommendations,
   **When** optimize receives it, **Then** it refuses direct application and
   directs proposed amendments through the normal speckit-constitution flow.
4. **Given** session-learning proposals, **When** learn completes,
   **Then** it does not persist memory entries or update a memory index.

---

### User Story 4 - Reduce Context Without Bypassing the Relay (Priority: P2)

As an author, I can get scoped reading advice, concise session responses and
usage reports without changing the baton's required context or suppressing
failure evidence.

**Why this priority**: These supporting tools provide value without rewriting
approved source artifacts.

**Independent Test**: Invoke scope, concise and usage against a fixture with
ordered handoff context and required diagnostics; verify context constraints,
instruction files, errors and exit status are preserved.

**Acceptance Scenarios**:

1. **Given** ordered `read_first` and `do_not_read` instructions,
   **When** scope suggests a smaller reading set, **Then** it does not replace,
   reorder, omit or contradict the baton requirements.
2. **Given** agent instruction files, **When** concise mode is requested,
   **Then** only the current session's response style changes and no
   instruction file is edited.
3. **Given** usage reporting or explicitly requested output slimming,
   **When** the operation completes, **Then** required errors, diagnostics,
   evidence and failure status remain visible.

### Edge Cases

- An approved artifact changes only by CRLF normalization or task checkbox
  completion: existing hash semantics remain unchanged and do not authorize
  compaction.
- A `read_first` entry lacks a checksum: the referenced file is still protected.
- A feature has no handoff yet: absence alone is not proof of eligibility;
  other protection metadata and explicit feature context must be checked.
- Another feature or quick-lane baton refers to the target: cross-baton
  protection still applies.
- Approval is historical rather than on the current gate: it cannot be
  bypassed by clearing the current approval fields.
- A constitution redirects to another file: that source remains governance,
  not a compaction target.
- An existing backup or concurrent edit conflicts with an apply request:
  no existing backup is overwritten and stale state is refused.
- Windows case aliases, symbolic links, junctions and traversal must not
  evade target protection.
- An upstream prompt asks to inject or remove agent-memory directives:
  the Baton wrapper does not permit that instruction mutation.
- The pinned optimize source has no check command: no check command is added.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Baton MUST provide token-budget and optimize as two independent,
  optional packs requiring explicit selection; core defaults MUST NOT change.
- **FR-002**: Upstream files MUST remain byte-identical to their verified
  pins, with source paths, raw checksums, license and immutable provenance.
- **FR-003**: The token-budget source MUST be v1.1.0 at commit
  `11c5589f347ddb3789b51b09927ef825c88e3f19`; optimize MUST be v1.0.0 at
  commit `d6dba6ae93bf60322deee3bdc4ffcf127e42b2b9`.
- **FR-004**: Installation, update and uninstall MUST preserve existing
  ownership and user-edit protections for both packs and their combination.
- **FR-005**: The supported compact and restore operations MUST enforce
  eligibility in executable guards rather than relying solely on prompt text.
- **FR-006**: In-place compaction and restoration MUST be limited to explicitly
  selected draft SDD artifacts before approval and hash binding.
- **FR-007**: Approved, historical-approval, hash-bound, source-of-truth,
  managed and any `read_first` targets MUST refuse compact and restore writes.
- **FR-008**: Ambiguous context, unreadable or malformed protection metadata,
  stale state and invalid or escaping paths MUST fail closed for mutation.
- **FR-009**: Refused mutation and dry-run operations MUST leave targets,
  backups, handoffs, bindings, approvals and instructions unchanged.
- **FR-010**: Allowed compaction MUST preserve a recoverable original without
  overwriting an existing backup; restore MUST pass the same protection checks.
- **FR-011**: Compaction MUST NOT rewrite constitution or agent instructions,
  inject or remove memory guards, or alter Baton/SPECKIT instruction sections.
- **FR-012**: No compaction hook MUST be automatically executed; existing
  mandatory relay hooks MUST remain unchanged and enabled.
- **FR-013**: Optimize run, tokens and learn MUST remain report-only and MUST
  NOT directly modify governance, persistent memory, gates, scanner rules or
  approval semantics, including when given apply-like requests.
- **FR-014**: Governance amendments proposed by optimize MUST go through the
  existing speckit-constitution process, not an optimize apply path.
- **FR-015**: Mandatory Baton rules MUST remain protected regardless of token
  cost, redundancy findings, or removal of advisory markers.
- **FR-016**: Scope MUST remain advisory and subordinate to ordered baton
  `read_first` and `do_not_read` context. Concise MUST be session-only.
- **FR-017**: Usage reports and optional output slimming MUST preserve
  diagnostic evidence and failure status.
- **FR-018**: Upstream manifests, prompts and mutating helpers MUST NOT become
  directly registered bypasses around the supported guarded commands.
- **FR-019**: Existing artifact hash normalization and approval semantics
  MUST NOT be weakened or changed by these packs.
- **FR-020**: Public documentation MUST explain opt-in installation, safe
  command boundaries, limitations and provenance; MIT notices and the
  Unreleased changelog MUST identify the additions.

### Key Entities

- **Optional pack**: An explicitly selected group of pinned upstream inputs
  and Baton-owned guarded command entry points.
- **Draft artifact**: A selected SDD document not yet approved or hash-bound.
- **Protection binding**: A handoff reference, source checksum, managed-file
  record or approval that prevents in-place optimization.
- **Candidate and backup**: Proposed replacement content and recoverable
  original associated with an eligible draft artifact.
- **Governance report**: Non-mutating findings or proposals requiring the
  existing amendment process before they can change governing instructions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three optional selections (each pack alone and both
  together) complete install/update/uninstall fixture checks; the core-only
  fixture receives zero optional optimization files.
- **SC-002**: Every vendored input has verified immutable provenance and a
  checksum; every tested substituted pin or modified payload is refused.
- **SC-003**: An eligible draft completes compact/restore with its original
  content recoverable; previews and all protected-target refusal scenarios
  produce zero changes to protected files or approval state.
- **SC-004**: All optimize entry points produce zero governance, gate,
  scanner, approval or persistent-memory edits, including apply-like requests.
- **SC-005**: Scope and concise checks preserve all mandatory context and
  instruction files; output-slimming checks preserve every required diagnostic
  and failure status in the registered cases.
- **SC-006**: One final local suite and the required checks on the PR head
  provide passing evidence before delivery; unchanged heads are not rerun
  merely to consume another CI attempt.

## Assumptions

- The existing whole-install uninstall policy remains the removal interface;
  per-pack removal is not added.
- These are workflow safety guards, not an operating-system sandbox against
  an arbitrary process with filesystem write permissions.
- Artifact semantic preservation still requires author review; draft
  compaction does not itself constitute approval.
- Upstream files are retained as inactive reference inputs; only Baton-owned
  guarded wrappers are public command entry points.
- Report-only includes no automatic memory writes or persistent learning.

## Clarifications

- The requested optimize check command does not exist in the pinned source.
  The user selected the three existing upstream commands only: run, tokens,
  learn. Do not invent a fourth command or change the pin.
- The user approved the session design proposal, authorizing specification
  work. This is not a recorded scope, pre-code, or PR-review gate approval.
- Delivery is one cohesive PR without release, tag, version cut, or merge.
  Work in yata is out of scope.
