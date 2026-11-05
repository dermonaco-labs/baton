# Implementation Plan: Upstream Upgrade Pull Requests

**Branch**: `003-upstream-upgrade-prs` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-upstream-upgrade-prs/spec.md`

## Summary

The existing weekly or manual `upstream-watch` workflow will turn new Spec Kit releases
and new commits on ATV's tracked ref into validated **draft** upgrade PRs, one per
upstream. Human review, merge and release stay manual.

Three changes make this safe:

1. `baton.lock.json` becomes the only Spec Kit and ATV pin record, so a single
   `sync --bump` passes `sync --check` with no hand edits (research R-1). The lock also
   gains release tracking for ATV (R-2).
2. The watcher is split into four jobs that keep upstream code away from write
   credentials: read-only `detect`, credential-less `generate`, a non-executing `publish`
   and an issues-only `report` (R-3, R-4). Workflow caches are closed off (R-5).
3. Pure, unit-tested maintainer logic decides each upstream's action idempotently. It
   preserves human-edited branches, suppresses pins that a human rejected, and closes
   obsolete bot-only PRs (R-7).

## Technical Context

**Language/Version**: Node.js 20 ESM (`.mjs`) with JSDoc types, checked by `tsc --noEmit`;
GitHub Actions YAML

**Primary Dependencies**:

- Node built-ins only for the new maintainer code.
- Existing `yaml` for workflow tests.
- Existing toolchain for generation: `uv`, git and the hash-locked `specify-cli`.
- Pinned actions: checkout, setup-node, setup-uv, and upload/download-artifact.

**Storage**: Git (lock, payload, one candidate branch per upstream) and GitHub PR and
issue history (markers). No new state store.

**Testing**: `node --test` through `npm test`, using unit tests with injected `fetch` and
git runners plus a local bare-repo integration test for publish. Workflow structure is
asserted in `test/unit/maintainer-workflows.test.mjs`. The full gate is `npm run check`.

**Target Platform**: GitHub-hosted `ubuntu-latest` for the watcher. The maintainer CLI
runs on Linux, macOS and Windows.

**Project Type**: CLI and template repository with maintainer CI automation

**Performance Goals**: A run that generates and validates both upstreams finishes within
30 minutes (SC-007). Job timeouts are detect 10, generate 20 (legs run in parallel),
publish 5 and report 5 minutes.

**Constraints**:

- No secrets beyond `GITHUB_TOKEN`.
- Least privilege per job and SHA-pinned actions.
- No caches in the watcher.
- No upstream execution where write access exists.
- Raw-byte integrity.
- No auto-merge, tag or publication.

**Scale/Scope**: Two upstreams, at most two open candidate PRs, one weekly run

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment |
|-----------|------------|
| I. Upstream-first | Pass. Candidates vendor upstream bytes through the existing sync, with repairs and the license and closure checks unchanged. Upstream prompts are never edited. |
| II. Pinned and reproducible | Pass. Pins are immutable (version, commit, tree, hashes). The flow stays bump → sync → review → release, with automation preparing only the bump and sync step. Candidates must pass `sync --check` (FR-011), and adopters get nothing until a human merges and releases. Removing the vetted constants moves the single pin record to the lock without weakening verification (R-1). |
| III. Explicit handoffs | Pass. The feature follows the relay. Candidate PRs are upstream bumps, not features, and need no baton. |
| IV. Stop, don't choose | Pass. Ambiguities were resolved by the user (7 decisions). Any value outside the expected formats becomes a blocker, not a guess. |
| V. Pre-registration | Pass. Acceptance checks will be registered in `tasks.md` before implementation. |
| VI. Minimal | Pass. The existing detector is extended. No second detector, schedule or CLI command is added. The maintainer code is not bundled or shipped. |
| VII. Model routing | Not applicable. |
| VIII. Cheap, strict, local-first | Pass. Only `GITHUB_TOKEN` is used, with per-job least privilege, SHA-pinned actions and free hosted runners. The pure logic is testable locally through `npm run check`. Live behavior is covered by preview mode. |
| Supply chain | Pass. Hash-locked installs are kept, there is no unverified `uvx` in sync, and the path policy rejects mirror config. Cache closure (R-5) hardens release. |
| Delivery gates | Pass. The scope gate was approved (repository owner, direct approval). The pre-code gate after analyze and PR review remain. The draft PRs it creates never merge themselves. |

**Post-design re-check**: Pass, with no violations. The two notable changes are recorded
as decisions, not exceptions. One supersedes the 001 contract rule that the watcher never
opens PRs (D-CONTRACT-AMEND). The other is the adopter-facing `ready_for_review` trigger
(D-CHECK-TRIGGER).

## Project Structure

### Documentation (this feature)

```text
specs/003-upstream-upgrade-prs/
├── spec.md
├── plan.md               # this file
├── research.md           # Phase 0
├── data-model.md         # Phase 1
├── quickstart.md         # Phase 1
├── contracts/
│   ├── upstream-watch.md # workflow, jobs, path policy, PR and issue
│   └── sync-bump.md      # sync --bump contract changes
├── checklists/requirements.md
├── handoff.md
└── tasks.md              # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── upstream.mjs               # remove core vetted constants; tag-based ATV fetch
│   └── upstream-candidates.mjs    # NEW pure logic: formats, selection, plan, classify,
│                                  #   path policy, manifest, markers, rendering, sanitize
├── maintainer/
│   └── upstream-upgrade.mjs       # NEW workflow entry: detect | package | publish | report
└── commands/
    └── sync.mjs                   # lock-only pins, atv=<semver>, lockFile keeps owned fields,
                                   #   verify-before-write
.github/workflows/
├── upstream-watch.yml             # 4 jobs, preview input, constant concurrency, no caches
├── ci.yml                         # pull_request types + ready_for_review
├── baton.yml                      # pull_request types + ready_for_review
└── release.yml                    # setup-uv enable-cache: false
baton/templates/workflows/baton.yml  # byte-identical adopter mirror of baton.yml
.baton/bin/baton.mjs (+ .sha256, licenses)  # rebuilt bundle (sync changes)
test/unit/
├── upstream-candidates.test.mjs   # NEW
├── upstream-upgrade.test.mjs      # NEW (injected fetch/git; local bare repo for publish)
├── sync-bump.test.mjs             # extended: arg forms, lockFile fields, no-constants
├── sync.test.mjs                  # locks built from fixtures instead of constants
└── maintainer-workflows.test.mjs  # per-job permissions, forbidden tooling, no cache,
                                   #   triggers, concurrency
docs/07-updating.md                # automation section; remove manual constant step
specs/001-baton-template/contracts/ci.md, spec.md (FR-072)  # supersession notes
CHANGELOG.md                       # Unreleased: adopter baton.yml trigger, sync --bump atv=<ver>
```

**Structure Decision**: This is the existing single-project layout. New maintainer-only
code lives under `src/maintainer/` and `src/lib/`. `src/cli.mjs` does not import it, so it
is not bundled, and `src/` is excluded from the npm package by `.npmignore`.

## Decisions carried into tasks

| ID | Decision | Source |
|----|----------|--------|
| D-LOCK-ONLY-PINS | The lock is the only Spec Kit and ATV pin record. Core constants and their comparison are removed. | R-1 |
| D-ATV-RELEASE-BUMP | `sync --bump atv=<x.y.z>` gives release tracking. The bump form decides the policy, and the automation never changes the policy. | R-2 |
| D-JOB-SPLIT | detect (read), generate (read, runs upstream code), publish (write, executes nothing), report (issues) | R-3 |
| D-ARTIFACT-VERIFY | Manifest bound to the trusted plan, raw-byte hashes, path policy, lock-diff restriction | R-4 |
| D-NO-CACHE | No caches in the watcher. `release.yml` setup-uv disables its cache. | R-5 |
| D-READY-TRIGGER | Explicit `pull_request` types including `ready_for_review` in `ci.yml`, `baton.yml` and the template mirror | R-6 |
| D-IDEMPOTENCY | Deterministic branch, single bot commit with trailers, force-with-lease, PR-body marker for suppression and obsolete closes, constant concurrency group | R-7 |
| D-MAINTAINER-CODE | Pure library plus an unbundled entry script using Node built-ins only | R-12 |

## Risks

- **R-UPSTREAM-EXEC** (high): mitigated by the job split, cache closure, the path policy
  and human review.
  - **Residual risk:** a hostile upstream could change vendored agent or skill prompts
    under `.github/` within the allowed paths.
  - **Mitigation:** the PR checklist requires reading changed prompts in full. The draft
    is never merged automatically.
- **R-VETTED-PINS** (medium): resolved by D-LOCK-ONLY-PINS.
- **Live behavior is unverified until after merge.** Preview mode and the post-merge
  first run (quickstart §3–4) are operational steps outside this development scope.

## Assumption review (revisit_at: plan)

- **A-PR-SETTING**: kept. The owner enables "Allow GitHub Actions to create and approve
  pull requests". A missing setting is reported as `E_PR_PERMISSION`.
- **A-OPTIONAL-SOURCES**: kept. `OPTIONAL_SOURCES` stays vetted and manual.

## Complexity Tracking

No constitution violations, so nothing needs justifying.
