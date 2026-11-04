# Feature Specification: Upstream Upgrade Pull Requests

**Feature Branch**: `003-upstream-upgrade-prs`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Extend the existing upstream watcher so a new Spec Kit or ATV
upstream is resolved to immutable pins, regenerated on an isolated branch, fully validated
and offered as a draft upgrade PR for human compatibility review. Never auto-merge, tag or
release. Report generation or validation failures in the existing tracking issue instead of
forcing an upgrade through. Make `sync --bump` a consistent, validated operation first."

## Clarifications

### Session 2026-11-04

- Q: Which ATV change should produce an upgrade candidate? → A: Follow the lock's tracked
  ref. Today the lock tracks `main`, so a new `main` HEAD commit is a candidate. Only tagged
  stable releases become candidates after a maintainer deliberately re-points the lock to a
  release.
- Q: How are candidates packaged when several upstreams have changed? → A: One draft PR per
  upstream (Spec Kit, ATV), each based on the current default branch. After one merges, the
  other is regenerated on the next run.
- Q: What happens to an existing candidate PR on a later run? → A: A branch that contains
  only automation commits is replaced by the new candidate. A branch with any commit not
  made by the automation is never overwritten; the newer candidate is reported in the
  tracking issue instead. A candidate PR closed without merging suppresses that exact pin
  until a newer pin appears.
- Q: How do the standard PR checks start on an automation-opened candidate PR? → A: A
  maintainer marks the draft PR "ready for review". Baton's PR check workflow also runs on
  that event.
- Q: Which validation must a candidate pass before its draft PR opens? → A: The full local
  gate plus the reproducibility check on Linux in the watcher run. Cross-platform smoke
  stays a release-candidate step.
- Q: What happens to an open candidate PR that the default branch has made obsolete? → A:
  Close it with an explanatory comment if it has only automation commits. Leave
  human-edited PRs open and note them in the tracking issue.
- Q (review 2, F15): What happens when a candidate PR has lost its hidden marker? → A:
  Stop and report it for manual repair. Do not overwrite an open PR, and do not infer a
  rejected pin from the editable title of a closed PR (FR-030). Decided by the repository
  owner, who chose the recommended option.
- Q (review 3, F22): Which upstream files may a candidate add or remove on its own? → A:
  Only files under `.specify/` from Spec Kit, outside the protected hook registration,
  Baton extension and memory paths. Adding or removing ATV files, pack files or
  `.github` agent, skill or hook files requires a manual, reviewed update. Existing files
  each upstream owns still update automatically. A legitimate upstream release that adds
  or removes such files therefore blocks for manual action instead of opening a draft PR
  (FR-031). This narrows the behavior that the earlier FR-012 wording allowed; the repository
  owner explicitly approved the restricted boundary.
- Q (review 5, F35): May a candidate change Baton-bound files such as the hook
  configuration, the Baton extension and preset, their registries or the Baton hook skill
  wrappers, if the meaning stays the same? → A: No. Any change to
  `.specify/extensions.yml`, to any file under `.specify/extensions/` or
  `.specify/presets/`, or to a Baton hook skill wrapper stops that upstream for a manual,
  reviewed update. Ordinary upstream prompts still update automatically. Registry
  timestamps are normalized by `sync`, not tolerated by the check (FR-031). The repository
  owner explicitly approved this conservative boundary, which replaces the earlier
  contract wording that allowed reformatting and timestamp differences.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review a ready-made Spec Kit upgrade (Priority: P1)

A Baton maintainer learns that Spec Kit published a new stable release. Instead of
running the bump locally, they find a draft PR that already contains the regenerated
snapshot pinned to that release, the upstream release link, a summary of changed vendored
files, and evidence that every repository check passed. They review compatibility, then
merge through the normal PR review gate or close the PR.

**Why this priority**: Spec Kit releases often, and it is the main source of manual
bump work. This story alone delivers the feature's value.

**Independent Test**: In a disposable fork or a preview run, pin the lock to an older
Spec Kit release, run the watcher and check that exactly one draft PR appears. Its diff
must reproduce byte-identically from its pins, and nothing may be merged, tagged or
published.

**Acceptance Scenarios**:

1. **Given** the lock pins Spec Kit `X` and a newer stable release `Y` exists on both the
   package index and the upstream repository, **When** the scheduled or manual watcher
   runs, **Then** a draft PR against the default branch pins `Y` to its exact version, tag
   commit and hash-locked requirements, and the reproducibility check passes from the PR
   content alone.
2. **Given** the candidate was generated, **When** any required validation fails,
   **Then** no PR is opened or updated for it, and the tracking issue names the upstream,
   the candidate pin, the failed stage, an error excerpt and the run link.
3. **Given** a draft candidate PR is open, **When** the watcher finishes, **Then** the PR
   is still a draft. It is not approved, merged or set to auto-merge, and no tag, release
   or package publication has happened.

---

### User Story 2 - Review an ATV upgrade that follows the tracked ref (Priority: P2)

The lock currently tracks ATV `main`. When `main` advances, the maintainer receives a
separate draft PR for ATV, pinned to the exact commit and tree. If a maintainer later
re-points the lock to a release, only new stable ATV releases produce candidates.

**Why this priority**: ATV changes less predictably. Keeping it separate from Spec Kit
lets each upstream be reviewed, merged or rejected on its own.

**Independent Test**: With the lock tracking `main` at an older commit, run the watcher
and verify that one ATV-only draft PR pins the current `main` HEAD commit and tree. Repeat
with a lock tracking a release and verify that a newer `main` commit alone yields no PR.

**Acceptance Scenarios**:

1. **Given** the lock tracks ATV `main` at commit `A` and `main` HEAD is `B`, **When** the
   watcher runs, **Then** an ATV draft PR pins commit `B` and its tree id, and the Spec Kit
   pin is unchanged in that PR.
2. **Given** the lock tracks an ATV release, **When** only `main` has advanced, **Then** no
   ATV PR is created, and the tracking issue still lists the newer commit for information.
3. **Given** both upstreams have candidates, **When** the watcher runs, **Then** two
   independent draft PRs exist. After one is merged, the next run regenerates the other on
   the updated default branch.

---

### User Story 3 - Trust repeated runs and human edits (Priority: P2)

The watcher runs weekly and on demand. A maintainer may push compatibility fixes to a
candidate branch, close a candidate they reject, or re-run the workflow. Repeated runs
must not churn branches, trigger redundant CI or discard human work.

**Why this priority**: Unattended automation is only acceptable if it is predictable
and never overwrites reviewed work.

**Independent Test**: Run the watcher twice with no upstream change and confirm the second
run pushes nothing and edits no PR. Push a human commit to a candidate branch, publish a
newer upstream pin and confirm the branch is untouched and the issue reports the newer pin.

**Acceptance Scenarios**:

1. **Given** an open candidate PR already carries the latest pin and its content is
   current for the default branch, **When** the watcher runs again, **Then** nothing is
   pushed and the PR is not edited.
2. **Given** an open candidate branch contains only automation commits, **When** a newer
   pin appears or the candidate no longer applies cleanly to the default branch, **Then**
   the branch is replaced with a freshly validated candidate and the same PR is updated.
3. **Given** an open candidate branch contains a commit not made by the automation,
   **When** a newer pin appears, **Then** the branch and PR are left untouched and the
   tracking issue reports that the newer pin is waiting on the human-edited PR.
4. **Given** a candidate PR for pin `Y` was closed without merging, **When** the watcher
   runs and `Y` is still the latest, **Then** no new PR is opened for `Y`. **When** a newer
   pin `Z` appears, **Then** a new candidate for `Z` is proposed.
5. **Given** an open candidate PR for pin `Y` and a default branch that already pins `Y`
   or newer, **When** the watcher runs, **Then** a bot-only PR is closed with a comment
   explaining why, and a human-edited PR stays open and is listed as obsolete in the
   tracking issue.
6. **Given** a draft candidate PR, **When** a maintainer marks it ready for review,
   **Then** the repository's standard PR checks run on it without any additional secret.

---

### User Story 4 - Bump locally with the same operation (Priority: P3)

A maintainer runs the documented bump command locally. A single command updates every
pin record that Baton checks, so the reproducibility check passes immediately with no
hand-edited constants.

**Why this priority**: This is a prerequisite for safe automation. The automation and
maintainers must share one validated operation.

**Independent Test**: Run the bump for a newer pin in a clean checkout, then run the
reproducibility check and the full local gate with no other edits.

**Acceptance Scenarios**:

1. **Given** a clean checkout, **When** a maintainer bumps Spec Kit or ATV to a valid pin,
   **Then** the reproducibility check passes without any manual edit, and every pin record
   changed by the bump is visible in the diff.
2. **Given** a bump to a pin that does not resolve, has the wrong license, or produces
   dangling references, **When** the bump runs, **Then** it fails with a stable error code
   and leaves the checkout unchanged.

### Edge Cases

- The package index has a new Spec Kit version, but the matching upstream tag is missing,
  not stable, or resolves to a different commit: no candidate; report the mismatch.
- The newest upstream version is older than the pinned one, or is a pre-release or draft:
  no candidate.
- ATV `main` is force-pushed and an earlier candidate commit disappears: the candidate is
  regenerated from the new HEAD only if it validates; otherwise it is reported.
- The default branch moves while a bot-only candidate is open: the candidate is
  regenerated only when its generated content would differ or no longer applies cleanly.
- A newer pin appears while an older human-edited candidate PR is open: report it; do
  not open a second PR for the same upstream.
- A maintainer bumps an upstream manually and merges it while a candidate PR for the same
  or an older pin is open: the candidate is obsolete and handled by FR-029.
- A maintainer removes or breaks the hidden marker of a candidate PR, open or closed:
  the upstream is blocked for manual repair (FR-030); nothing is pushed, edited or
  closed, and no pin is inferred from the title.
- An upstream release adds or removes a file outside Spec Kit's unprotected `.specify/`
  paths, for example a new ATV agent or skill: no draft PR; the upstream is reported as
  blocked (`E_PATH_POLICY`) for a manual, reviewed update (FR-031).
- An upstream release changes the format of a Baton-bound file, such as the hook
  configuration, a registry, the Baton preset or a hook skill wrapper: no draft PR; the
  upstream is blocked (`E_PATH_POLICY`) for a manual, reviewed update (FR-031).
- Upstream content adds an unlicensed file, an excluded component or a dangling
  reference: validation fails and the issue reports it.
- Network or registry outages stop detection or generation: no branch or PR changes; the
  issue records the problem and the run reports failure.
- The repository does not allow the workflow token to create pull requests: the run
  reports this prerequisite in the issue instead of failing silently.
- Two runs overlap, for example a manual dispatch during a scheduled run: runs are
  serialized and never create duplicate PRs or branches.
- Upstream release metadata contains markup, very long text or values outside the expected
  format: it is rejected or neutralized, never executed or rendered as instructions.

## Requirements *(mandatory)*

### Functional Requirements

#### Detection and pinning

- **FR-001**: The existing weekly and manually dispatched upstream watcher MUST remain the
  only detection mechanism. No second schedule or detector may be added.
- **FR-002**: A Spec Kit candidate MUST be the newest stable (not draft, not pre-release)
  version that is published both on the package index and as the matching upstream tag.
  It MUST be newer than the current pin.
- **FR-003**: An ATV candidate MUST follow the ref the lock records. When the lock tracks
  `main`, the candidate is `main`'s current HEAD commit. When it tracks a release, the
  candidate is the newest stable release tag commit. Changing the tracked ref is a manual
  maintainer decision and outside the automation.
- **FR-004**: Every candidate MUST be resolved to immutable pins before generation: an
  exact version where one exists, the full commit id, the tree id where applicable, and
  hash-locked requirements. Mutable names such as a branch name, `latest` or a bare tag
  MUST NOT appear as the pin.
- **FR-005**: Externally sourced values, including version strings, commit ids, tag names
  and release text, MUST be validated against strict formats before they are used in any
  command, branch name, file or PR text. Invalid values abort that candidate and are
  reported.

#### One consistent bump operation

- **FR-006**: A single documented bump operation MUST update every pin record that Baton
  verifies for that upstream, so that the reproducibility check passes right after the
  bump without manual edits. The automation and maintainers MUST use the same operation.
- **FR-007**: A failed bump MUST leave the repository state as it was before the bump and
  report a stable error code.
- **FR-008**: The bump MUST keep the existing verification guarantees: commit and tree
  identity for git sources, sha256 for packages including transitive requirements, license
  checks, reference closure, documented repairs, and no execution of ATV code.

#### Isolated, validated generation

- **FR-009**: Candidate generation, including any execution of upstream-provided code,
  MUST run with read-only repository access and without any credential that can write
  to the repository, issues or pull requests.
- **FR-010**: Any step that holds write access MUST NOT install or execute
  upstream-provided code or generated content. It may only publish a candidate produced
  and validated by the read-only stage, and it MUST verify that the published content
  matches what was validated.
- **FR-011**: Before a candidate is published, it MUST pass, in the same run on a Linux
  hosted runner and on its final content, all of the following: the reproducibility
  check, lock verification, and the repository's full local gate (lint, type checks, build
  and payload checks, handoff validation and tests). Cross-platform smoke checks are not
  part of candidate validation; they remain a release-candidate step.
- **FR-012**: Each candidate MUST change only its own upstream's pins and the files
  regenerated from them. It MUST NOT change other upstreams, optional sources, unrelated
  dependencies, the release version or release records.

#### Draft pull requests

- **FR-013**: Each upstream MUST have at most one open candidate PR, on a deterministic
  branch name for that upstream, targeting the default branch.
- **FR-014**: Candidate PRs MUST be opened as drafts. The body MUST contain the old and new
  pins, upstream release or comparison links, the generated bump summary (changed, added
  and removed files), the validation results with a link to the run, and a reviewer
  checklist covering compatibility, licenses, repairs, reference closure and the normal
  Baton gates.
- **FR-015**: Upstream release notes MUST NOT be copied into the PR or issue. Only links
  and validated metadata may appear there.
- **FR-016**: The automation MUST NOT approve, merge, enable auto-merge, mark a PR ready
  for review, push to the default branch, create tags or releases, or publish packages.
- **FR-017**: A maintainer marking a candidate PR "ready for review" MUST start the
  repository's standard PR checks on it. Baton's PR check workflow, which adopters also
  receive, MUST additionally run on that event, and the PR body MUST state this step. No
  additional secret may be added for this.

#### Idempotency and human work

- **FR-018**: When an open candidate already matches the latest pin and its content is
  current for the default branch, a run MUST NOT push, edit the PR or cause any CI run.
- **FR-019**: A candidate branch that contains only automation commits MAY be replaced by
  a freshly validated candidate when a newer pin appears or when the candidate's generated
  content changes against the current default branch. The existing PR is updated, not
  duplicated.
- **FR-020**: A candidate branch that contains any commit not made by the automation MUST
  NOT be pushed to, rebased, renamed or closed by the automation. Newer pins are reported
  in the tracking issue instead.
- **FR-021**: A candidate PR that a human closes without merging MUST suppress that
  upstream's exact pin. No new PR is opened for it until a newer pin appears.
- **FR-022**: Overlapping runs MUST be serialized so that branches and PRs are never
  created twice or updated concurrently.
- **FR-029**: An open candidate PR is obsolete when the default branch already pins the
  same or a newer version of its upstream. An obsolete PR with only automation commits
  MUST be closed with a comment stating the reason and the default branch's pin. An
  obsolete human-edited PR MUST stay open and be listed as obsolete in the tracking issue.
  Closing an obsolete PR does not create a suppression under FR-021.
- **FR-030**: A candidate PR, open or closed without merging, whose hidden marker is
  missing or invalid MUST stop that upstream for manual repair and be reported as a
  blocker in the tracking issue. The automation MUST NOT push to, edit, comment on or
  close that PR, and MUST NOT infer a pin from editable fields such as the PR title. The
  upstream stays blocked until a maintainer restores the marker.
- **FR-031**: A candidate MAY add or remove lock rows and files only for Spec Kit under
  `.specify/`, excluding `.specify/extensions.yml`, `.specify/extensions/`,
  `.specify/presets/` and `.specify/memory/`. Any other addition or removal, including
  ATV, pack and `.github` agent, skill or hook files, MUST block that upstream for a
  manual, reviewed update and be reported in the tracking issue. Existing owned rows MAY
  update their content only; their install target, packs and provenance MUST NOT change.
  Trusted Baton-bound files MUST keep their exact base bytes: the hook configuration
  `.specify/extensions.yml`, every file under `.specify/extensions/` and
  `.specify/presets/` (including both `.registry` files), and the Baton hook skill
  wrappers. Any change to them, including whitespace, reformatting or a registry
  timestamp, MUST block that upstream for a manual, reviewed update. Registry
  `installed_at` and `updated_at` timestamps are normalized deterministically by `sync`
  to the base values, so an otherwise unchanged registry reproduces its base bytes; the
  verifier tolerates no timestamp or other semantic difference. Ordinary upstream
  prompts, skills and other owned files outside these paths still update automatically.

#### Reporting

- **FR-023**: The existing single upstream tracking issue MUST stay the one status
  report. For each upstream it lists the current pin, the latest detected pin, the
  candidate PR link or state (opened, updated, unchanged, suppressed or waiting on a human
  edit), and any blocker with its stage, error excerpt and run link.
- **FR-024**: Detection, generation, validation and publication failures MUST be reported
  in the tracking issue and MUST make the run fail visibly. They MUST NOT open or modify a
  candidate PR.
- **FR-025**: The tracking issue MUST close automatically only when every upstream is
  current, no candidate is pending and all verification passes, as it does today.

#### Safety and operation

- **FR-026**: The workflow MUST continue to use only the workflow-provided token with
  least-privilege permissions per job, actions pinned by full commit SHA, free hosted
  runners, and the repository guard that keeps it dormant in derived repositories.
- **FR-027**: A manual dispatch MUST support a preview mode that detects, generates and
  validates candidates and reports the results in the run summary without writing
  branches, PRs or issues.
- **FR-028**: The maintainer documentation for updating Baton and the existing
  maintainer-workflow contract MUST be updated. The earlier rule that the watcher "never
  pushes or opens PRs" is superseded only for draft candidate branches and PRs. Pushing to
  the default branch, merging and publication stay forbidden. The adopter-facing PR check
  workflow change from FR-017 MUST be documented as a template change.

### Key Entities

- **Upstream**: a pinned input (Spec Kit or ATV) with a tracked ref policy, current pin and
  detected latest pin.
- **Pin**: the immutable identity of an upstream input: version where one exists, commit
  id, tree id where applicable, and requirements hash.
- **Candidate**: the regenerated repository content for one upstream at one new pin,
  together with its validation results.
- **Candidate PR**: the draft PR and deterministic branch that carry one candidate. Its
  state is open (bot-only or human-edited), merged or closed without merging.
- **Tracking issue**: the single existing issue that reports watcher status, candidates
  and blockers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every new stable Spec Kit release, or new commit on ATV's tracked ref,
  the first scheduled run after it either produces a draft candidate PR that passes all
  validation, or names the blocker in the tracking issue, in 100% of cases.
- **SC-002**: 100% of candidate PRs reproduce byte-identically from their recorded pins
  on a clean checkout.
- **SC-003**: A maintainer can review an upgrade without running any local sync command:
  pins, diff summary, links and validation evidence are all in the PR.
- **SC-004**: Repeat runs with no upstream or default-branch change cause zero pushes, zero
  PR edits and zero additional CI runs.
- **SC-005**: Zero automation runs merge, approve, tag, release, publish, push to the
  default branch or overwrite a branch that has a human commit.
- **SC-006**: A maintainer bump followed immediately by the reproducibility check passes
  with zero manual edits.
- **SC-007**: A watcher run that generates and validates both upstreams finishes within
  30 minutes on a free hosted runner.

## Assumptions

- The repository owner enables the repository setting that lets the workflow token create
  pull requests. Without it, runs report the missing prerequisite (edge case above).
- PRs created with the workflow token do not trigger other workflows automatically. That
  is why validation runs inside the watcher, and a human "ready for review" action starts
  the standard checks (FR-011, FR-017).
- "Stable" means a published release that is neither a draft nor a pre-release. The ATV
  npm package is not used as a pin source, because the lock tracks ATV by commit. Its
  version stays informational in the issue.
- The optional sources (`token-budget`, `optimize`) keep manual, vetted pins and are out of
  scope. The watcher does not detect them today.
- The weekly schedule, single tracking issue and external-link check stay as they are.
- Release preparation, changelog edits, tags and publication remain separate
  human-reviewed steps.
- Running the automation live against the real repository is a post-merge operational
  step. During development it is exercised through tests and preview mode only.
