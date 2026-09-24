# Feature Specification: Baton Template (Spec Kit × ATV with Validated Handoffs)

**Feature Branch**: `001-baton-template`
**Created**: 2026-09-24
**Status**: Planned (awaiting analyze → implement)
**Input**: Build a public, reusable GitHub template repository called "Baton". It combines GitHub
Spec Kit and the ATV Starter Kit for GitHub Copilot into one non-conflicting workflow. Specs, plans,
tasks and reviews are passed between agents and humans like a relay baton. Each handoff carries the
context the next agent needs and no more, with explicit entry and exit criteria, configurable model
routing, cheap CI and a public manual.

**Tagline**: *Spec-driven relays for Copilot agents.*

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a new project from the template (Priority: P1)

A developer clicks **Use this template**, clones the new repository and asks Copilot "where's the
baton?". Copilot explains the relay and suggests `/speckit-specify` as the first step. No extra
tooling is required before the first spec is written.

**Why this priority**: This is the headline adoption path. If it fails, Baton has no value.

**Independent Test**: Simulate template instantiation (`git archive` → fresh repo). Run the template
cleanup, then `node .baton/bin/baton.mjs doctor` and `validate`. Both must exit 0. The core skills and
agents must be present and must have valid frontmatter, and no Baton-internal dev or dogfood files
may remain.

**Acceptance Scenarios**:

1. **Given** a repo created from the template, **When** the first push triggers `template-cleanup`,
   **Then** Baton's dev files are removed (`src/`, `test/`, `specs/001-baton-template/`, the Baton CHANGELOG and the
   other paths in plan.md § Template disposition). The constitution is replaced by Spec Kit's pristine template,
   the README is replaced by the adopter README, and `.baton/manifest.json` records the Baton version it was created
   from. The cleanup never touches `.github/workflows/`, because `GITHUB_TOKEN` cannot push workflow changes. The
   maintainer workflows stay dormant (repository guard) and `baton.yml` validates the adopter's batons.
2. **Given** the cleaned repo, **When** `baton doctor` runs, **Then** it reports the Baton version,
   the upstream pins, the installed packs, checksum integrity (all files unmodified) and any
   missing optional prerequisites (uv/specify, node) as warnings only.
3. **Given** GitHub Actions is not allowed to push in the derived repo, **When** cleanup cannot commit,
   **Then** the workflow fails with a clear message that tells the user to run `baton adopt` locally,
   and running it produces the same result.

---

### User Story 2 - Overlay Baton onto an existing repository (Priority: P1)

A team with an existing codebase runs one pinned command. Baton installs the `core` pack without
overwriting any of their files, merges its managed sections into their Copilot instructions and
reports every conflict it didn't resolve.

**Why this priority**: Most adopters already have a repository. This path also covers repos that
already contain Spec Kit or ATV.

**Independent Test**: Run `npx --yes github:dermonaco-labs/baton#<tag> init` (in CI: `node bin/baton.mjs init`)
against three fixture repos (empty; has its own `.github/copilot-instructions.md`; has a prior
ATV 2.6.3 install with broken agents). Assert the expected file set, that user content is preserved,
that the conflict report is correct, and that a second run changes nothing (idempotent).

**Acceptance Scenarios**:

1. **Given** a repo with a hand-written `.github/copilot-instructions.md`, **When** `init` runs,
   **Then** the user content is preserved byte-for-byte outside the `<!-- BATON:START -->`/`<!-- BATON:END -->`
   markers, and the Baton section is inserted once.
2. **Given** a repo with pre-existing ATV files, **When** `init` runs, **Then** Baton-managed files whose
   content differs from the pinned version are listed as conflicts with their resolution options
   (`--adopt-upstream`, `--keep`). A known-corrupted ATV agent (no newlines) is detected and
   flagged as "repairable".
3. **Given** `init` has already completed, **When** it runs again, **Then** no file changes and the
   exit code is 0.
4. **Given** `init --packs core,learning`, **When** it completes, **Then** only files that belong to
   those packs are installed, and they are recorded in `.baton/manifest.json`.

---

### User Story 3 - Relay a feature through validated handoffs (Priority: P1)

A developer runs the feature lane. After each phase, Baton writes or updates
`specs/<feature>/handoff.md`. Before each phase, Baton checks that the baton is valid, fresh and
addressed to this phase. The next agent reads only the baton and the files it lists.

**Why this priority**: Optimized handoffs are Baton's reason to exist.

**Independent Test**: Use fixture features in `test/fixtures/handoffs/`, both valid and invalid.
`baton validate` accepts the valid ones and rejects each invalid one with a specific error code.
In the e2e smoke test, run the `speckit.baton.handoff` command logic headlessly (script mode) against
a sample feature and validate the result.

**Acceptance Scenarios**:

1. **Given** `/speckit-plan` completes, **When** the mandatory `after_plan` hook runs,
   **Then** `handoff.md` has `phase_completed: plan`, `next_phase: tasks`, `model_role: planning`,
   sha256 values for spec.md and plan.md, and a `read_first` list within the context budget.
2. **Given** the baton lists a blocking open question, **When** any agent tries to start the next phase,
   **Then** the `before_*` hook stops the agent with `status: needs-human` and prints the question. The
   agent must not pick an answer (stop, don't choose).
3. **Given** spec.md changed after the baton was written, **When** the next phase starts,
   **Then** the validator reports `E_STALE_ARTIFACT` and asks for the previous phase to be re-run, or for
   an explicit `baton handoff refresh` with a recorded reason.
4. **Given** `tasks` is complete, **When** `implement` starts, **Then** entry requires at least one
   pre-registered acceptance check per user story in scope (`E_NO_PREREG` otherwise).
5. **Given** the relay reaches `land`, **When** `baton-land` runs, **Then** local validation
   (`baton validate` plus the configured project checks) passes before any push, and the baton records
   the PR URL and suggests `/ce-compound`.

---

### User Story 4 - Route phases to the right model (Priority: P2)

A team lead configures which model handles planning, implementation and review. Every handoff
shows the suggested model for the next phase and a ready-to-run command. Optionally, Baton writes
`model:` into the Baton-owned agent frontmatter, and it rejects models that aren't on an allowed list.

**Why this priority**: Explicitly requested, and it has proven valuable, but Baton works without it.

**Independent Test**: Unit tests over `.baton/config.yml` variants. Check role resolution, the
phase→role map, `allowed` enforcement (off, warn, error) and the `baton models apply` idempotency and diff.

**Acceptance Scenarios**:

1. **Given** the default config, **When** a baton is written for `next_phase: implement`,
   **Then** it includes `model_role: implementation` and the suggested model from config. It does not
   write any agent frontmatter.
2. **Given** `models.enforce: error` and an agent with a `model:` value not in `models.allowed`,
   **When** `baton validate` runs, **Then** it fails with `E_MODEL_NOT_ALLOWED` and names the file.
3. **Given** `baton models apply`, **When** it is run twice, **Then** the second run changes nothing.
   Only files in the Baton-owned, managed set are touched.

---

### User Story 5 - Update Baton and upstreams safely (Priority: P2)

A maintainer bumps Spec Kit or ATV and produces a reviewed release. An adopter updates to that
release without losing local edits.

**Why this priority**: Both upstreams release often (Spec Kit shipped 5 releases in 10 days), so
the template has to stay current without breaking.

**Independent Test**: `baton sync --check` in CI reproduces the snapshot from the pins. For
`baton update`, run the fixture "adopter at vPrev with one locally modified file" against the new
version: unmodified files are updated, the modified file is reported and not overwritten, and the
manifest is rewritten.

**Acceptance Scenarios**:

1. **Given** new pins in `baton.lock.json`, **When** `baton sync` runs, **Then** the snapshot, the per-file
   sha256 values and the provenance are regenerated. Frontmatter lint and schema checks run, and a
   human-readable upstream diff summary is written for the PR.
2. **Given** the weekly `upstream-watch` finds a newer upstream release or commit, **When** it runs,
   **Then** it opens or updates a single tracking issue. It never pushes changes.
3. **Given** an adopter runs `baton update --to vNext`, **When** a managed file was edited locally,
   **Then** that file is skipped and listed, with a `.baton/conflicts/<path>.new` copy for manual merge.

---

### User Story 6 - Learn Baton from a public manual (Priority: P2)

A newcomer reads the README and `docs/` to understand what Baton is, why it exists, how to start,
what each command, skill and agent does and when to use it, how handoffs work, how to customize
and update it, how to troubleshoot it, and who the credits and licenses belong to.

**Independent Test**: A docs lint and link check passes. Every command, skill and agent in `core` is
documented, which is checked automatically by comparing the docs index to the installed manifest.

**Acceptance Scenarios**:

1. **Given** the core manifest, **When** the docs coverage check runs, **Then** every installed skill
   and agent appears in `docs/reference/` (`E_UNDOCUMENTED` otherwise).
2. **Given** the README, **When** it is rendered on GitHub, **Then** it shows the hero, the tagline, a
   quick start for both adoption paths, the Mermaid relay diagram and links to the manual and credits.

---

### User Story 7 - Maintain Baton with cheap, meaningful CI (Priority: P3)

A contributor opens a PR. CI lints Markdown, YAML and workflows, validates the schemas and all
skill and agent frontmatter, runs the unit tests and runs the e2e smoke on Linux and Windows,
all on free hosted runners.

**Independent Test**: The workflows pass on the Baton repo. A deliberately broken fixture PR
(invalid frontmatter) fails with a precise annotation.

**Acceptance Scenarios**:

1. **Given** a PR, **When** CI runs, **Then** the `lint`, `test` and `smoke (ubuntu, windows)` jobs
   complete within the budget in SC-007 using only `GITHUB_TOKEN`.
2. **Given** a `vX.Y.Z` tag, **When** `release` runs, **Then** it publishes `baton.mjs`, a template
   archive, `SHA256SUMS` and build-provenance attestations. The release notes list the upstream pins
   and the CHANGELOG section.

### Edge Cases

- A repo already initialized with Spec Kit at a different version: `init` keeps the user's `.specify/`
  state (constitution, feature.json, specs) and offers to upgrade the vendored `.specify/templates`/`scripts`
  to the pinned version. It never deletes specs.
- A Windows user without bash: the Spec Kit `sh` scripts are the default. `baton init --script ps` (or `py`)
  requires `uv` and regenerates the Spec Kit files with the pinned CLI. `doctor` explains this.
- A repo with Copilot hooks already present: Baton only merges its hook entries by id. It doesn't
  duplicate or reorder them.
- A feature was started before Baton was installed and has no `handoff.md`: `baton handoff init
  --infer` builds a baton from the existing artifacts with `status: needs-human` so it gets reviewed.
- Multiple features in flight: batons are per feature directory. `baton status` lists all of them. The
  active feature follows Spec Kit's `.specify/feature.json`.
- The upstream later fixes, or changes the paths of, files that Baton repaired: the sync repair step
  becomes a no-op, and the lock records `repair: none`. A path change is a hard sync error.
- Copilot CLI ignores `handoffs:` frontmatter (it's VS Code only). Baton relies on the file-based baton, so
  the buttons are a convenience, not a dependency.

## Requirements *(mandatory)*

### Functional Requirements

**Distribution & installation**

- **FR-001**: The repository MUST work as a GitHub template. A derived repo MUST be usable after the
  one-time cleanup, with no upstream CLIs installed.
- **FR-002**: Baton MUST provide `init` for existing repos. It must be idempotent, must never overwrite
  unmanaged or user-modified files, must support pack selection, and must write `.baton/manifest.json`
  (installed files, sha256, pack, Baton version, upstream pins).
- **FR-003**: Baton MUST provide `update`, `doctor`, `adopt` (template cleanup, run locally), `uninstall`
  (removes only unmodified managed files) and `status`.
- **FR-004**: The distributed CLI MUST be a single bundled Node ≥ 20 file with no runtime installation.
  It is shipped as `.baton/bin/baton.mjs` in the template and as a release asset with `SHA256SUMS`.

**Vendoring & upstream**

- **FR-010**: `baton.lock.json` MUST pin each upstream by immutable reference (package version plus
  commit SHA) and list every vendored file with its sha256, upstream path, license id and any repair applied.
- **FR-011**: `baton sync` (maintainer) MUST regenerate the Spec Kit files by running the pinned
  `specify-cli` (`specify init --here --integration copilot --script sh --force --ignore-agent-tools` in a temp dir).
  The CLI is installed from a committed, hash-locked requirements file (`uv pip install --require-hashes`). It MUST
  take ATV files from the pinned git tree (`pkg/scaffold/templates/`), fetched by commit SHA with the commit and
  tree ids verified, and not from the prebuilt binary or a generated archive.
- **FR-012**: `baton sync --check` MUST fail on any difference between the committed snapshot and the
  regenerated one.
- **FR-013**: Repairs MUST be mechanical, declared in `packs/repairs.yml`, and verified afterwards
  (for example, "restore frontmatter delimiters and newlines"). If a repair can't be verified, the
  file is excluded and the sync fails.
- **FR-014**: Files without an MIT-compatible license MUST NOT be vendored (`E_LICENSE`).

**Handoffs**

- **FR-020**: Each feature directory MUST contain at most one `handoff.md`, whose YAML frontmatter
  validates against `handoff.schema.json` (schema version `baton: 1`).
- **FR-021**: Phase contracts MUST be machine-readable (`.baton/phases.yml`, validated by
  `phases.schema.json`). They define, per phase: the owning skill, entry criteria, exit criteria,
  required artifacts, allowed next phases, the default model role and whether a human gate applies.
- **FR-022**: Baton MUST register a Spec Kit extension (`baton`). It provides a mandatory `before_<cmd>`
  hook (`speckit.baton.receive`) and a mandatory `after_<cmd>` hook (`speckit.baton.handoff`) for specify,
  clarify, plan, tasks, analyze, implement and converge.
- **FR-023**: The ATV-side phases (review, land, compound, and brainstorm as a pre-phase) MUST be
  covered by Baton wrapper skills (`baton-review`, `baton-land`) and by the relay skill (`baton`). These
  read and write the same baton and delegate to the upstream skills unchanged.
- **FR-024**: The validator MUST check these rules:
  - Schema.
  - Legal transition (as defined by phases.yml).
  - Required artifacts exist.
  - The artifact sha256 values match (staleness). `tasks.md` is hashed checkbox-insensitively (`[x]`/`[X]` are
    normalized to `[ ]`), so progress made during a multi-session implement doesn't make the baton stale.
  - The analyze report is persisted to `specs/<feature>/analysis.md` by the Baton handoff command (Spec Kit analyze
    is read-only), and implement entry requires it to contain no CRITICAL findings.
  - A blocking open question implies `status ∈ {needs-human, blocked}`.
  - The `read_first` budget: ≤ 12 entries by default, configurable.
  - Pre-registered acceptance checks exist before implement.
  - Human-gate approval is recorded where the phase requires one. `approved_by` and every `human:` actor are
    role-only (a configured role, optionally `via <channel>`), never a personal handle, name or email; a denylist
    scan rejects personal data in batons (`E_APPROVER_FORMAT`, `E_ACTOR_FORMAT`, `E_DENYLIST`).
  - Entry/exit criteria may combine checks with `all_of`/`any_of` groups, which have defined error codes.
  - Every error has a stable code, listed in the handoff contract.
- **FR-025**: `baton handoff` MUST provide at least `new`, `show`, `receive`, `write`, `next` (prints the next
  command and the suggested model), `approve --by`, `answer`, `refresh --reason`, `escalate`, `init --infer` and
  `migrate`. [contracts/cli.md](./contracts/cli.md) is normative for flags and exit codes.

**Workflow coherence**

- **FR-030**: Baton MUST define one feature workflow and one quick lane (phases `work` → `review` → `land` →
  `compound`, with only legal escalation to the feature lane; see contracts/phase-contracts.md), and document the conflict
  rules (see contracts/conflict-rules.md). The `core` pack MUST NOT install `ce-plan`, `deepen-plan`,
  `lfg`, `slfg`, `ralph-loop` or `docs/plans/`.
- **FR-031**: Baton MUST own `.github/copilot-instructions.md` through the marker-managed section, and
  it must keep Spec Kit's `<!-- SPECKIT START -->`/`<!-- SPECKIT END -->` block intact.
- **FR-032**: The Copilot coding-agent setup MUST be at `.github/workflows/copilot-setup-steps.yml`
  (job `copilot-setup-steps`). It installs Node and uv, installs `specify-cli` from the hash-locked requirements
  when that file is present (the Baton repo; derived repos don't need the Spec Kit CLI at runtime), and runs a
  project-defined dependency step.
- **FR-033**: Every Baton installation (template-derived or `init`) MUST include an adopter workflow
  `.github/workflows/baton.yml`. It runs `node .baton/bin/baton.mjs validate --github` on pull requests and pushes,
  with `contents: read` only, which is the CI backstop for skipped hooks. The maintainer workflows MUST be guarded
  with `if: github.repository == 'dermonaco-labs/baton'`.

**Model routing**

- **FR-040**: `.baton/config.yml` MUST define model roles, the phase→role map, optional `allowed` models
  and `enforce: off|warn|error`, and it validates against `config.schema.json`.
- **FR-041**: Batons MUST include `model_role`, plus `suggested_model` resolved from the config at the
  time the baton was written.
- **FR-042**: `baton models apply` MUST only write `model:` into Baton-managed agent files, and it MUST be idempotent.

**Packs**

- **FR-050**: Packs MUST be declared in `packs/*.yml` (validated by `pack.schema.json`), each with a
  purpose, files (upstream or Baton), dependencies and conflicts. `core` MUST be self-sufficient for
  the whole relay.
- **FR-051**: Optional packs: `review-plus`, `learning`, `docs-review`, `security`, `research`, `issues`,
  `stack-python`, `stack-typescript`, `stack-rails`, `design`.
- **FR-052**: The dependency closure MUST be checked. A vendored file that references (or dispatches) a skill or agent that isn't
  in its own pack or that pack's `requires` closure fails sync with `E_DANGLING_REF`, unless the reference is declared as an optional reference with a
  graceful-degradation note.
- **FR-053**: The files of optional packs MUST be stored in the Baton repo under `packs/<id>/files/` (mirroring the
  install paths) so that `init --packs` works offline from the package. `core` files live in place. In a
  template-derived repo, where `packs/` has been removed, adding a pack MUST exit 5 and print the exact pinned
  `npx --yes github:dermonaco-labs/baton#v<manifest version> init --packs <id>` command.

**Documentation & community**

- **FR-060**: Baton MUST ship a README hero and a `docs/` manual with the sections listed in plan.md.
- **FR-061**: It MUST ship `THIRD_PARTY_NOTICES.md` with full license texts and copyright lines for
  Spec Kit (GitHub, Inc.), ATV (All The Vibes), compound-engineering (Every) and any other vendored
  source, plus per-file provenance. This includes every npm package bundled into `baton.mjs`, including the
  transitive ones (inventory generated from the esbuild metafile).
- **FR-062**: It MUST ship CONTRIBUTING, CODE_OF_CONDUCT (Contributor Covenant 2.1), SECURITY (private
  vulnerability reporting), SUPPORT, issue forms (bug, feature, upstream-bump), a PR template with a
  handoff checklist, a CHANGELOG (Keep a Changelog) and dependabot config.

**CI & release**

- **FR-070**: CI MUST lint Markdown, YAML and workflows (actionlint). It MUST compile all JSON Schemas,
  validate every skill and agent frontmatter, validate all batons in `specs/` and all pack files,
  verify the lock checksums, and check internal links.
- **FR-071**: CI MUST run the unit tests and an e2e smoke on `ubuntu-latest` and `windows-latest`.
  The smoke covers template instantiation plus cleanup, overlay into 3 fixture repos, idempotent re-run
  and update from the previous fixture.
- **FR-072**: A scheduled `upstream-watch` (weekly) MUST detect new upstream versions and run
  `sync --check`, and it reports the result through a single issue.
- **FR-073**: A tag-triggered `release` MUST build the assets, publish them with checksums and
  attestations, and fail if the CHANGELOG has no section for the tag.

### Key Entities

- **Baton (handoff)**: the current relay state for a feature. The schema is in data-model.md.
- **Phase contract**: the rules for one phase (entry, exit, artifacts, transitions, role, gate).
- **Pack**: a named set of files with a purpose, dependencies and conflicts.
- **Lock**: the upstream pins plus the per-file provenance and checksums (maintainer side).
- **Manifest**: what is installed in a given repo (adopter side).
- **Config**: adopter preferences (models, packs, checks, budgets).

## Success Criteria *(mandatory)*

- **SC-001**: A new user can go from "Use this template" to a validated first `spec.md` with a valid baton
  in ≤ 10 minutes, following only the README.
- **SC-002**: The `core` pack installs ≤ 30 skill and agent files in total (versus ~80 for a full ATV and
  Spec Kit install), and every one of them has a documented handoff role.
- **SC-003**: 100% of the phase transitions in the feature lane are covered by an automated entry
  check and an automated exit check.
- **SC-004**: `init` run twice produces zero changes, and it never overwrites a user-modified file
  across all fixture repos.
- **SC-005**: `sync --check` reproduces the committed snapshot byte-for-byte from the pins.
- **SC-006**: Zero vendored files lack a license, and every vendored file has provenance in the lock.
- **SC-007**: The PR CI wall-clock time is ≤ 10 minutes, with ≤ 25 billable-equivalent minutes per PR
  (free for public repos).
- **SC-008**: Every skill, agent and command in `core` is documented (the coverage check passes).

## Assumptions

- A1: Node ≥ 20 is available wherever Baton's CLI runs. Python ≥ 3.11 with `uv` is needed only for
  maintainers (`sync`) and for users who choose a non-default script flavour.
- A2: ATV is pinned to a `main` commit (`ad996736b879be87c7755df5c5017d5336203bbc`) instead of npm 2.6.3, because the
  2.6.3 release ships 49 agent templates with broken frontmatter and the fix (f0a86ef) is unreleased.
  Baton switches to a tag pin as soon as ATV cuts a release that contains the fix.
- A3: The ATV installer binary is not run by Baton. Only the MIT-licensed template files are vendored.
  `atv-doctor`, `atv-update` and `setup` are excluded because they assume an ATV-managed install.
- A4: There's no npm package publish in v0.x. The distribution channels are `npx github:` and release
  assets, which keeps secrets out of CI.
- A5: The template-cleanup workflow commits directly to the default branch of the derived repo with
  `contents: write`. If the org policy forbids that, the documented fallback is `baton adopt`.
- A6: GitHub Pages is out of scope for v0.1. The docs render on GitHub, and Mermaid diagrams are supported.
- A7: The suggested model defaults (as of 2026-09) are claude-opus-5.5 for planning and review,
  gpt-6-sol for implementation and claude-haiku-4.5 for fast. They are suggestions only, and agent
  frontmatter stays model-free unless `baton models apply` is run.
- A8: The Spec Kit script flavour is `sh` by default (the most battle-tested, and it works in Codespaces,
  Linux, macOS, WSL and Git Bash).
- A9: The observer hooks in ATV's learning pipeline are opt-in (the `learning` pack), because they log tool
  use locally and a public template should default to no telemetry-like behaviour.

## Out of Scope (v0.1)

- gstack skills, agent-browser, Claude- or Cursor-specific configurations, and other agent integrations
  besides Copilot (Spec Kit supports them, and Baton may add them later).
- Autonomous end-to-end pipelines (`lfg`/`slfg`). A gated `baton next --auto` is a later feature.
- Publishing to the Spec Kit community extension catalog (it's in the backlog once v0.1 is stable).

## Open Questions

None blocking. The assumptions above are revisited at the analyze gate.
