<!--
Sync Impact Report
- Version change: 1.0.0 → 1.0.1 (PATCH, clarifications from the analyze pass; see specs/001-baton-template/analysis.md)
- Modified: Delivery Workflow & Quality Gates (scope gate wording: after clarify, or after specify when clarify is skipped)
- Modified: Supply-Chain & Licensing Constraints (verification means content hashes or git object ids, including
  transitive packages)
- Templates requiring updates: none (.specify/templates/* are still materialized by `baton sync`, tasks T023–T028)
- Deferred items: none
- Previous: none → 1.0.0 (initial ratification: principles I–VIII, Supply-Chain & Licensing Constraints, Delivery
  Workflow & Quality Gates, Governance)
-->

# Baton Constitution

Baton is a public GitHub template that combines GitHub Spec Kit and the ATV Starter Kit
into one spec-driven workflow for GitHub Copilot. Every phase hands off to the next
through an explicit, validated artifact called "the baton".

## Core Principles

### I. Upstream-First, Never Fork

Baton integrates through the extension points the upstreams already provide: Spec Kit
extensions, hooks and presets, plus ATV's file-level templates. Vendored upstream files
MUST stay byte-identical to the pinned upstream source. The only exceptions are
mechanical, documented repairs. Each repair is recorded in `baton.lock.json` with a reason,
and every repair has an upstream issue link or is marked as pending an upstream fix.
Baton behaviour lives in Baton-owned files (the extension, wrapper skills, instructions and
schemas). It MUST NOT be written as edits to upstream prompts.

### II. Pinned, Reproducible, Updatable

Every upstream input is pinned to an immutable reference: an exact package version plus the
commit SHA it resolves to. Each vendored file is recorded with a sha256 and its provenance.
Running the same pins through `baton sync` MUST produce a byte-identical snapshot, and CI
enforces this. Upgrading happens deliberately: bump the pin, sync, review the diff,
then release. Adopters MUST never receive an upstream change that hasn't been reviewed.

### III. Explicit Handoffs (The Baton)

Each phase transition produces or updates exactly one machine-validated handoff file per
feature. It has these properties:

- It declares the completed phase, the next phase, the owning skill or agent and the model role.
- It lists the minimal ordered `read_first` context, including artifact checksums.
- It records entry and exit criteria with evidence.
- It carries open questions and decisions.

An agent MUST NOT start a phase whose entry criteria are unmet. The next agent needs only
the baton and the files it names.

### IV. Stop, Don't Choose

When an agent finds a gap, ambiguity or conflict that affects scope, behaviour, security or
data, it MUST NOT pick an interpretation silently. It records a blocking open question, sets
the baton status to `needs-human` and stops. Assumptions are allowed only when they are
non-blocking. Every assumption is written down and revisited at the next human gate.

### V. Pre-Registration and Honest Evidence

Acceptance checks, meaning the commands, test IDs or observable outcomes, are registered in
tasks before implementation starts, and they are expected to fail first. Implementation and
review evidence is matched against those pre-registered checks. You MUST NOT weaken, skip or
redefine a check after the fact without an explicit and recorded human decision. A partial
result is reported as partial.

### VI. Minimal by Default, Extensible by Packs

The default `core` pack contains only what the relay needs end to end. Everything else is an
opt-in pack. Baton MUST NOT ship two components that do the same job in the same install,
such as two planners, two plan directories or two autonomous pipelines. Adding a component
to `core` requires a stated handoff role.

### VII. Configurable Model Routing

Model choice is expressed as roles (planning, implementation, review, fast), and these roles
are mapped to concrete models in configuration. Baton-owned prompts MUST NOT hard-code model
IDs. The shipped defaults are dated suggestions. If an `allowed` list is configured, it is
enforced by the validator.

### VIII. Cheap, Strict, Local-First Validation

Every check that CI runs can also be run locally with a single command before pushing, and
contributors are expected to run it. CI uses only free hosted runners, has no secrets beyond
`GITHUB_TOKEN`, pins actions by SHA and uses least-privilege permissions. When a check is
flaky or slow, fix it or delete it. Never ignore it.

## Supply-Chain & Licensing Constraints

- Redistribute only content that has a license compatible with MIT, and keep every required
  copyright and permission notice in `THIRD_PARTY_NOTICES.md` and in the file-level provenance.
- Upstream content without a license, such as `karpathy-guidelines`, MUST NOT be vendored. Link to it instead.
- Nothing specific to a single adopter, whether domain rules, hostnames, secrets, personal names
  or local paths, may appear in Baton.
- Downloads made during sync or install are verified against the lockfile before they are used: by sha256 for files
  and packages (including transitive packages, via hash-locked requirements) and by commit and tree id for git fetches.
  Unverified installers such as a bare `uvx` or `npx` of an unpinned package MUST NOT be used by `sync`.

## Delivery Workflow & Quality Gates

- Feature work follows this relay: specify → clarify → plan → tasks → analyze → implement →
  review → land → compound. Each arrow is a handoff, and the validator checks each one.
- Human gates are required for scope (after clarify, or after specify when clarify is skipped),
  after analyze (before any code is written) and at land (PR review). There is no auto-merge.
- The quick lane (ce-work → baton-review → baton-land) is allowed only for changes that add no
  new user-facing behaviour or contract. In any other case, escalate to the feature lane.
- `npm run check`, which is the same as CI, MUST pass locally before `baton-land` pushes.

## Governance

This constitution takes precedence over other Baton practices and prompts. To amend it, open a PR
that updates this file with a Sync Impact Report, a version bump and any affected templates or docs.
Versions follow SemVer. MAJOR is for removing or redefining a principle, MINOR is for adding a
principle or section, and PATCH is for clarifications. Reviewers check compliance with this
constitution in every PR. Any exception MUST be justified in the plan's Complexity Tracking table.

**Version**: 1.0.1 | **Ratified**: 2026-09-24 | **Last Amended**: 2026-09-24
