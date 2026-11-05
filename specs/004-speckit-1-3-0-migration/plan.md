# Implementation Plan: Spec Kit 1.3.0 migration

**Branch**: `dermonaco-spec-kit-1-3-0-migration` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-speckit-1-3-0-migration/spec.md`. The scope gate is approved:
Q1 = A+, Q2 = X.

## Summary

Bump Baton's vendored Spec Kit from 1.0.11 to 1.3.0. In the 1.3.0 core output, the deprecated
`speckit-taskstoissues` skill is gone, `speckit-specify` resolves templates through a script, and a handful of core
scripts, manifests and registries change. Hook registration is byte-identical.

The opt-in `issues` pack is repointed to Spec Kit's bundled `github` extension:

- seven files, sourced from a separate generated **extension tree** so that `core` never contains them;
- a thin Baton-authored `/speckit-taskstoissues` wrapper at the old skill path, which delegates to
  `/speckit-github-taskstoissues` and fails clearly if that command is absent.

This fixes the 1.1.3–1.3.0 `E_DANGLING_REF` closure failure.

Feature 003's trusted-base bindings keep every existing rule. A narrowing-only addition makes the new extension rows
manual-review. Update behavior is unchanged: the wrapper replaces the old skill in place, so no residual manual
removal remains.

## Technical Context

**Language/Version**: Node.js 20 (ESM, JSDoc types checked by `tsc --noEmit`); Python 3.11 only inside the generator
venv.

**Primary Dependencies**: `specify-cli==1.3.0` (hash-locked through `uv`), `yaml`, and the bundled Spec Kit `github`
extension 1.0.5 from the pinned wheel.

**Storage**: Repository files: `baton.lock.json`, `packs/*.yml`, `packs/issues/files/`, `.specify/` snapshot.

**Testing**: `node:test` through `npm test` (`test/run.mjs`), plus `npm run check` (markdownlint, yamllint, typecheck,
build/sync/lock checks, validate, tests).

**Target Platform**: Maintainer and CI on Linux (generator); adopters on Linux, macOS and Windows with `sh`, `ps` or
`py` script flavours.

**Project Type**: CLI and template payload.

**Performance Goals**: CI jobs stay within their existing 5-minute timeouts. The extension tree adds one offline
`specify extension add` to sync.

**Constraints**:

- Fail closed with no partial writes.
- Hashing: raw-byte integrity hashes for lock and payload; CRLF-normalized ownership hashes for adopter files.
- No mirror configuration in tracked files.
- No change to update logic (Q2 = X) or to existing feature 003 bindings (FR-010).

**Scale/Scope**: About 15 core snapshot files regenerated, 8 `issues` pack files, 4 source modules, 1 schema, about 8
documentation files and new regression tests.

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 design. No violations.*

| Principle | Check | Result |
|-----------|-------|--------|
| I. Upstream-First, Never Fork | Uses the extension point Spec Kit provides (the bundled `github` extension) unchanged. The wrapper only delegates. No upstream file is edited or repaired. | Pass |
| II. Pinned, Reproducible, Updatable | Exact pin, tag and full commit; hash-locked requirements. The extension comes from the pinned wheel. `sync --check` regenerates both trees. Update logic is unchanged. | Pass |
| III. Explicit Handoffs | Relay hooks are byte-identical under 1.3.0; a regression test pins one receive and one handoff per event (FR-005). | Pass |
| IV. Stop, Don't Choose | Q1 and Q2 were answered by the owner at the scope gate. Interpretations made in planning (flavour parity, narrowing trust) are recorded as decisions for the pre-code gate. | Pass |
| V. Pre-Registration and Honest Evidence | Acceptance checks are registered before code (tasks/analyze). A mirror gap is recorded as unavailable tooling, with hosted CI as the gate. | Pass |
| VI. Minimal by Default, Extensible by Packs | `core` gains nothing; issue creation stays in opt-in `issues` (FR-009). | Pass |
| VII. Configurable Model Routing | Not affected. | Pass |
| VIII. Cheap, Strict, Local-First Validation | `npm run check` covers every CI step. The only limit is the bump needing public PyPI, which follows the documented procedure. | Pass |

Supply chain and licensing: Spec Kit is MIT and the `github` extension declares MIT. `THIRD_PARTY_NOTICES.md`
updates its pinned commit link.

## Phase 0: Research

See [research.md](research.md), sections R1–R10. Repository conventions and prior learnings were gathered with
`repo-research-analyst` and `learnings-researcher` (constitution C2) and are summarised below.

### Repository conventions

From `repo-research-analyst`:

- **Offline vs live tests.** Offline tests call exported pure functions (`prepareEntries`, `lockFile`,
  `diffDocument`) on a fake generated tree (`test/unit/sync.test.mjs:7-110`). They can also inject `deps`
  into `sync()` (`src/commands/sync.mjs:364-373`; stub pattern in `test/unit/sync-bump.test.mjs:117-129`).
  Live-generator tests skip locally only on a missing-wheel `E_PREREQUISITE` and never skip in CI
  (`test/integration/init.test.mjs:~353-366`). Its skip message names the pin and must move to 1.3.0.
- **Pack schema.** `baton/schemas/pack.schema.json` `$defs.file` has `additionalProperties: false`, so the new
  `extension` key needs a schema change with a conditional. It is enforced by `baton validate`
  (`src/commands/validate.mjs:131-136`). Add negative cases in the style of `test/unit/schema.test.mjs:50-56`.
  `loadPacks` (`src/lib/packs.mjs:32-37`) passes unknown keys through. The `PackFile` typedef is at
  `sync.mjs:17`.
- **Install path.** Authored pack files with no lock row are installed from `packs/<id>/files/<path>` with owner
  `baton` (`init.mjs:191-199`). A same-path owner change from `speckit` to `baton` is applied through `Object.assign`
  in init and update (`init.mjs:292`, `update.mjs:156-166`). An unmodified file is rewritten, and a modified file
  conflicts. There is no existing test for this, so one is added.
- **Sync inputs.** `specs/001-baton-template/contracts/packs.md` is a sync input: its excluded table feeds
  closure. `docs/reference/upstream-diff.md` is generated. `baton validate` cross-checks
  `docs/reference/skills.md` only for `core` skills.
- **CI.** `npm run check` = `lint:md`, `lint:yaml`, `typecheck`, `build --check`, `sync --check`, `lock verify`,
  `validate`, `npm test`. CI (`.github/workflows/ci.yml`) runs the same steps on ubuntu with Node 20 and uv 0.12.5.

### Prior learnings

From `learnings-researcher`, reading `docs/solutions/`:

- `restricted-mirror-env-only-2026-09-29.md`: keep mirrors in the environment only, use placeholders in tracked text,
  never re-pin to suit a mirror, and use hosted CI as the authoritative gate (R9).
- `crlf-normalized-ownership-hashing-2026-09-29.md`: lock and payload hashes are raw integrity hashes, so the new
  files must be LF. The rendered extension skill is normalized through `generatedText` (R3). Extend the
  `core.autocrlf` adopter fixture to the `issues` files.
- `quick-lane-scope-and-stranded-land-2026-09-29.md`: this is correctly a feature lane, since it changes a pack's
  public command surface. Land any baton waiting at land before this reaches `main`.
- No prior learning exists on pack closure, wrappers, script flavours or feature 003 bindings. A `ce-compound` note is
  a candidate after delivery.

## Phase 1: Design

- [data-model.md](data-model.md): pin, pack entry with `extension`, lock rows with `x-speckit-extension`, wrapper,
  trusted-path rule, manifest effects.
- [contracts/issues-pack.md](contracts/issues-pack.md): install surface per selection, wrapper behavior and failure
  message, closure, update path, automation behavior.
- [contracts/sync-github-extension.md](contracts/sync-github-extension.md): extension-tree generation, validation
  and exit behavior.
- [quickstart.md](quickstart.md): bump, reproducibility, gate, install and bindings checks.

### Design decisions (summary)

1. **Separate extension tree** (R3). `core` generation is unchanged. The `github` extension is added only to a
   derived copy that sources `issues` entries.
2. **No registration** (R3). Adopter `.specify/extensions.yml` and `.registry` are unchanged. `specify extension list`
   does not show `github`, and this is documented.
3. **Full extension payload** (R3, R6). All three resolve scripts ship. Init's existing flavour step also renders the
   extension skill for `ps` and `py` when `issues` is selected.
4. **Wrapper as a `from: baton` skill** (R5). Source is `baton/skills/speckit-taskstoissues/SKILL.md`, at the same
   path as the old skill, so no stale file remains (FR-011).
5. **Pack schema `extension: github`** (R8). Only valid with `from: speckit`. Lock rows carry
   `x-speckit-extension: github`.
6. **Narrowing-only trust addition** (R7). `isTrusted` also matches install targets under `BOUND_ROOTS` and rows with
   `x-speckit-extension`. `FROZEN_FIELDS` gains the key. Existing bindings and tests are unchanged.
7. **Bump environment** (R9). Linux container or hosted CI with public PyPI.

## Project Structure

### Documentation (this feature)

```text
specs/004-speckit-1-3-0-migration/
├── spec.md
├── plan.md                       # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── issues-pack.md
│   └── sync-github-extension.md
├── checklists/requirements.md
├── handoff.md                    # baton (CLI-managed)
└── tasks.md                      # /speckit-tasks
```

### Source code (repository root)

```text
src/
├── lib/
│   ├── upstream.mjs              # extension-tree step (prepareSpeckitExtension or similar)
│   ├── candidate-bindings.mjs    # isTrusted narrowing addition
│   └── upstream-candidates.mjs   # FROZEN_FIELDS += x-speckit-extension
└── commands/
    ├── sync.mjs                  # PackFile.extension, sourceFor/add routing, pinnedNames, generatedText, x-speckit-extension rows
    ├── init.mjs                  # flavour step: extension add github for ps/py when issues selected; flavour rule covers extension scripts
    └── adopt.mjs                 # manifest upstreams.speckit = 1.3.0@91261fd

baton/
├── schemas/pack.schema.json      # optional `extension` (github) only with from: speckit
├── skills/speckit-taskstoissues/SKILL.md   # NEW wrapper source
└── upstream/specify-cli.requirements.{in,txt}   # regenerated by sync --bump

packs/
├── issues.yml                    # repointed entries
└── issues/files/                 # regenerated payload (7 extension files + wrapper)

.specify/, .github/skills/speckit-specify/SKILL.md, baton.lock.json, docs/reference/upstream-diff.md   # regenerated by sync

test/
├── unit/sync.test.mjs            # extension-tree routing, closure (core, core+issues), core has no github files
├── unit/schema.test.mjs          # pack `extension` positive/negative
├── unit/upstream-candidates.test.mjs   # new trusted cases; existing cases unchanged
├── unit/packs.test.mjs           # wrapper closure resolution / E_DANGLING_REF without extension skill
├── integration/init.test.mjs     # core-only has 0 issue files; issues has both commands; wrapper contract; ps flavour; skip message 1.3.0
└── integration/update.test.mjs   # 1.0.11 issues skill → wrapper in place (unmodified) / conflict (modified); no orphan

README.md, CONTRIBUTING.md, CHANGELOG.md, THIRD_PARTY_NOTICES.md,
docs/reference/skills.md, docs/06-packs-and-customization.md,
specs/001-baton-template/contracts/packs.md (live pack contract: issues row and version line)
```

**Structure Decision**: This is the existing single-project CLI layout. No new top-level directory. The only new
source file is the wrapper skill.

## Risks

- **Mirror lacks 1.3.0** (R9). The bump and `sync --check` need public PyPI. Implement runs them in a Linux container
  or hosted CI, and records the local limit honestly.
- **Adopter already installed `github` independently.** Existing unmanaged-file conflict handling reports the
  overlap. Documented in the CHANGELOG.
- **`specify extension add github` later run by an adopter** rewrites managed files and the registry. The next update
  reports the changed managed files as conflicts (existing behavior). Documented.
- **Live install tests for the ps flavour** need the 1.3.0 wheel. They skip locally only on a missing-wheel
  prerequisite, never in CI.

## Complexity Tracking

No constitution violations. Two design choices need explicit pre-code review:

| Choice | Why needed | Simpler alternative rejected because |
|--------|------------|--------------------------------------|
| Separate extension tree in sync | `prepareEntries` puts every generated `.specify/` file in `core` | Registering `github` in the core generation violates FR-009 and changes trusted registry files |
| Narrowing addition to `isTrusted` | Stored pack paths escape `BOUND_ROOTS`, which would let the automation regenerate extension files (FR-010) | A new lock upstream id changes the schema, pins, diff and owner mapping; forbidding the prefix blocks legitimate rows and misses the skill |

## Phase 0 research (Baton addition)

During Phase 0, invoke the installed `repo-research-analyst` to inspect
repository conventions and `learnings-researcher` to inspect
`docs/solutions/` for relevant prior lessons. Fold relevant findings into
`research.md` and the plan; if an agent is unavailable, record that fact
rather than inventing its findings. `speckit-plan` remains the only planner.

## Handoff

The current phase context, gate, decisions and next `read_first` list live
in `specs/<feature>/handoff.md`. The mandatory
`/speckit-baton-handoff` hook writes and validates that baton after planning.
Do not put feature-specific handoff state in global instructions.
