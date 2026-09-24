# Implementation Plan: Baton Template

**Branch**: `001-baton-template` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-baton-template/spec.md`

## Summary

Baton ships as a GitHub template repository. It carries a **pinned, materialized snapshot** of a curated subset of
Spec Kit (v1.0.11) and ATV (main@ad99673), plus Baton-owned components:

- a Spec Kit extension (`baton`) whose mandatory hooks receive and hand off the baton around every core command
- wrapper skills (`baton`, `baton-review`, `baton-land`) for the ATV-side phases
- JSON Schemas for handoffs, phases, config, packs, the lock and the manifest
- a single-file Node CLI (`baton`) that validates, installs, updates, syncs and routes models
- cheap CI and a public manual

Upstream files stay byte-identical, apart from declared mechanical repairs. See [research.md](./research.md).

## Technical Context

**Language/Version**: Node.js ≥ 20 (ESM + JSDoc, type-checked with `tsc --noEmit`). The maintainer side also needs
Python ≥ 3.11 and `uv` (to run `specify-cli==1.0.11`).
**Primary Dependencies**: `ajv` 8 + `ajv-formats`, `yaml` 2. Dev-only: `esbuild`, `typescript`, `markdownlint-cli2`.
The CI actions are actionlint and yamllint.
**Storage**: Files only (YAML/JSON/Markdown in the repo).
**Testing**: `node --test` for unit and integration tests (fixture repos under `test/fixtures/`). E2E smoke uses the
GitHub Actions matrix (ubuntu, windows).
**Target Platform**: Any OS with Node ≥ 20. Spec Kit `sh` scripts need a POSIX shell (Codespaces, Linux, macOS,
WSL, Git Bash). The `ps` and `py` flavours are available through `baton init --script`.
**Project Type**: Template repository + CLI tool + documentation.
**Performance Goals**: `baton validate` finishes in under 2 s on a repo with 20 features. `init` finishes in
under 5 s offline.
**Constraints**:
- no runtime network access for adopters
- the bundle is under 400 KB
- CI stays on free runners with `GITHUB_TOKEN` only
- actions are pinned by SHA
**Scale/Scope**:
- `core` is 28 skill/agent files or fewer
- 10 optional packs
- 9 phases
- ~12 CLI subcommands

## Constitution Check

*GATE: must pass before Phase 0 research and again after Phase 1 design.*

| Principle | How the plan complies | Status |
|---|---|---|
| I. Upstream-first | extension and hooks, wrapper skills, a small append-only preset. No upstream edits. Repairs are declared in `packs/repairs.yml`. | ✅ |
| II. Pinned & reproducible | `baton.lock.json` holds the SHAs and sha256s. `sync --check` runs in CI. | ✅ |
| III. Explicit handoffs | `handoff.schema.json` + `phases.yml` + receive/handoff hooks + CI validator | ✅ |
| IV. Stop, don't choose | the validator enforces `needs-human` on blocking questions. The receive hook stops. | ✅ |
| V. Pre-registration | acceptance-check registry in the tasks template. Implement entry requires it. | ✅ |
| VI. Minimal by default | `core` ≤ 28 files with no duplicate roles. Everything else goes in packs. | ✅ |
| VII. Model routing | role-based config. No model IDs in prompts. Frontmatter writes are opt-in. | ✅ |
| VIII. Cheap, strict, local-first | `npm run check` == CI. Free runners. SHA-pinned actions. | ✅ |
| Licensing | karpathy is excluded. THIRD_PARTY_NOTICES and per-file provenance are included. | ✅ |

The post-design re-check passed (data-model and contracts introduce no violations).

## Project Structure

### Documentation (this feature)

```text
specs/001-baton-template/
├── spec.md              # what & why
├── research.md          # upstream facts, decisions (R1–R12)
├── plan.md              # this file
├── data-model.md        # entities & schemas (baton, phase, config, pack, lock, manifest)
├── quickstart.md        # validation scenarios for implement/review
├── contracts/
│   ├── handoff-contract.md   # baton frontmatter, validator rules, error codes
│   ├── phase-contracts.md    # per-phase entry/exit, transitions, roles, gates
│   ├── conflict-rules.md     # Spec Kit ↔ ATV resolution rules
│   ├── packs.md              # core + optional packs, exact file lists
│   ├── cli.md                # baton CLI commands, flags, exit codes
│   └── ci.md                 # workflows, jobs, budgets, release
├── checklists/requirements.md
├── tasks.md
└── handoff.md           # the dogfooded baton (next: analyze → implement)
```

### Source Code (repository root)

```text
.
├── README.md                       # hero, tagline, quick start (both paths), relay diagram
├── LICENSE                         # MIT © derMonaco Labs (Baton-authored content)
├── THIRD_PARTY_NOTICES.md          # Spec Kit, ATV, Every, awesome-copilot, ajv, yaml
├── CHANGELOG.md  CONTRIBUTING.md  CODE_OF_CONDUCT.md  SECURITY.md  SUPPORT.md
├── package.json  package-lock.json  tsconfig.json  .markdownlint-cli2.jsonc  .yamllint.yml
├── .editorconfig  .gitattributes (* text=auto eol=lf)  .gitignore
├── baton.lock.json                 # MAINTAINER: upstream pins + per-file provenance/sha256
├── packs/                          # MAINTAINER: pack definitions + repairs
│   ├── core.yml  learning.yml  docs-review.yml  review-plus.yml  security.yml  research.yml
│   ├── issues.yml  stack-python.yml  stack-typescript.yml  stack-rails.yml  design.yml
│   └── repairs.yml
├── baton/                          # Baton-authored sources (installed into adopters)
│   ├── speckit-extension/          # Spec Kit extension "baton"
│   │   ├── extension.yml           # commands + mandatory before_*/after_* hooks
│   │   ├── commands/receive.md     # speckit.baton.receive
│   │   ├── commands/handoff.md     # speckit.baton.handoff
│   │   └── README.md
│   ├── speckit-preset/             # preset "baton-templates" (append-only)
│   │   ├── preset.yml
│   │   └── templates/{tasks-template.md,plan-template.md}
│   ├── skills/{baton,baton-review,baton-land}/SKILL.md
│   ├── instructions/copilot-instructions.baton.md   # BATON marker section
│   ├── templates/{handoff.md,README.adopter.md,config.yml,phases.yml}
│   └── schemas/{handoff,phases,config,pack,lock,manifest,skill-frontmatter,agent-frontmatter}.schema.json
├── src/                            # CLI sources (dev only; stripped by template-cleanup)
│   ├── cli.mjs
│   ├── commands/{init,update,doctor,validate,handoff,models,status,adopt,uninstall,sync,lock}.mjs
│   └── lib/{frontmatter,schema,hash,manifest,markers,phases,packs,upstream,repairs,report}.mjs
├── test/                           # node --test (dev only)
│   ├── unit/*.test.mjs
│   ├── integration/*.test.mjs
│   └── fixtures/{repos/{empty,has-instructions,atv-263-broken},handoffs/{valid,invalid},configs,prev-release}/
├── docs/                           # public manual (kept in derived repos under docs/baton/)
│   ├── README.md                   # manual index
│   ├── 01-what-and-why.md  02-quickstart.md  03-workflow.md  04-handoffs.md  05-model-routing.md
│   ├── 06-packs-and-customization.md  07-updating.md  08-troubleshooting.md  09-credits-and-licensing.md
│   ├── reference/{commands.md,skills.md,agents.md,cli.md,schemas.md,error-codes.md}
│   ├── brainstorms/.gitkeep        # ATV pre-phase output (adopter-owned)
│   └── solutions/.gitkeep          # ce-compound knowledge base (adopter-owned)
├── specs/001-baton-template/       # dogfood (dev only; stripped by template-cleanup)
├── .baton/
│   ├── bin/baton.mjs               # bundled CLI (committed, CI checks freshness)
│   ├── config.yml                  # models, packs, checks, budgets
│   ├── phases.yml                  # phase contracts (Baton-managed; overridable by adopter copy)
│   ├── manifest.json               # installed files + sha256 (adopter side)
│   ├── template-cleanup.yml        # paths removed in derived repos
│   └── template-cleanup-pending    # marker (present only in the template)
├── .specify/                       # materialized by `baton sync` via real specify-cli 1.0.11
│   ├── memory/constitution.md      # Baton's own (preserved across sync)
│   ├── templates/  scripts/bash/  integrations/  extensions/baton/  presets/baton-templates/
│   ├── extensions.yml  integration.json  init-options.json  .gitignore
└── .github/
    ├── copilot-instructions.md     # Baton-managed section + preserved SPECKIT block
    ├── skills/                     # core pack (speckit-*, speckit-baton-*, ce-*, land, baton*)
    ├── agents/                     # core pack reviewers/researchers
    ├── hooks/speckit.json          # only if extension events require it
    ├── workflows/{ci.yml,smoke.yml,upstream-watch.yml,release.yml,template-cleanup.yml,copilot-setup-steps.yml}
    ├── ISSUE_TEMPLATE/{bug.yml,feature.yml,upstream-bump.yml,config.yml}
    ├── pull_request_template.md  dependabot.yml  CODEOWNERS
```

**Structure Decision**: The repo root is itself a working Baton installation, so it dogfoods Baton, and it also
holds the dev sources.

- Paths marked *dev only* are listed in `.baton/template-cleanup.yml` and removed in derived repos.
- `docs/` is moved to `docs/baton/` in derived repos, which leaves `docs/brainstorms/` and `docs/solutions/` at the
  top level.
- Adopter-owned files are never managed after they're installed: `docs/brainstorms`, `docs/solutions`,
  `.specify/memory/constitution.md` and everything under `specs/`.

## Key Design Decisions

1. **Vendoring = hybrid D** (research R4). The maintainer runs `baton sync`, which uses the real `specify init` in a
   temp dir and reads ATV templates from the tarball at the pinned SHA. Nobody runs the ATV binary.
2. **ATV is pinned to main@ad99673** rather than 2.6.3, because of the corrupted agents (R3). A repair rule is kept,
   but it is only used for the adopter-side `init --repair` of an existing corrupted install.
3. **Hooks over patches** (R5). Every core Spec Kit command gets a mandatory `before_*` hook
   (`speckit.baton.receive`) and a mandatory `after_*` hook (`speckit.baton.handoff`). The hook commands are thin:
   they call `node .baton/bin/baton.mjs handoff receive|write --phase <p>` for deterministic work and ask the agent
   only for the judgement fields (summary, decisions, open questions).
4. **Deterministic vs. agent-authored fields.**
   - The CLI computes the phase, next phase, artifact checksums, `model_role`, `suggested_model`, timestamps and
     the git commit.
   - The agent fills in the summary, `read_first` rationale, decisions, open questions, risks and acceptance checks.
   - This split keeps batons trustworthy and cheap to produce.
5. **Human gates** (constitution): after `clarify` (or after `specify` if clarify is skipped), after `analyze`, and
   at `land` (the PR). `baton handoff approve --by <handle>` records the approval in the baton. The receive hook for
   the next phase requires it.
6. **Context budget.** `read_first` has at most 12 entries, and the baton body has at most 150 lines by default
   (configurable). `do_not_read` lets the previous agent exclude noisy files explicitly, such as superseded
   research.
7. **Quick lane.** `ce-work` → `baton-review` → `baton-land` → (`ce-compound`). The baton lives at
   `.baton/quick/<slug>.md` (so there's no `docs/plans/`). It uses the same schema with `lane: quick`, and escalates
   to the feature lane on `E_LANE_ESCALATE` (new behaviour or contract detected by the reviewer).
8. **Review personas in core.**
   - Always included: correctness, testing, maintainability, project-standards, agent-native, learnings-researcher.
   - Also included: security-reviewer and adversarial-reviewer.
   - The other conditional personas go to `review-plus`.
   - `baton-review` passes ce-review the list of installed persona agents, so that it selects only the ones that
     are available. This is the documented graceful degradation.
9. **Dependency closure check.** Sync scans each vendored skill or agent for references to other
   skills and agents (`/name`, `agent: name`, `compound-engineering:*:name`). It fails with `E_DANGLING_REF`
   unless the reference is installed in the same pack set or is declared in `packs/*.yml` under
   `optional_refs` with a graceful-degradation note.
10. **Instructions.** `.github/copilot-instructions.md` is under 80 lines of Baton guidance between BATON markers:
    - where the baton lives
    - stop, don't choose
    - the lanes
    - the conflict rules
    - the local checks

    Spec Kit's SPECKIT block is preserved as-is. Feature detail goes in the batons, not in global instructions.
11. **Versioning.**
    - Baton follows SemVer and stays at 0.x until the handoff schema is frozen at 1.0.
    - The handoff schema version (`baton: 1`) is independent of the tool version. A breaking change to it requires
      a migration command (`baton handoff migrate`).
    - Release names use the form "Baton vX.Y.Z — Spec Kit A.B.C · ATV <ref>".
    - The CHANGELOG follows Keep a Changelog with a mandatory "Upstream" subsection.

## Manual (docs/) outline

1. **What & why**: the relay metaphor, the problems with running both kits raw (duplicate planners, drifting
   instructions, lost context, unvalidated handoffs, corrupted upstream files) and the design principles.
2. **Quick start**: the template path (4 steps) and the overlay path (`npx … init`). Your first feature from
   specify to land.
3. **Workflow**: a Mermaid relay diagram showing both lanes, the gates, and which model role each phase uses.
4. **Handoffs**: the baton anatomy, an annotated example, validator rules, error codes and how to fix each one.
5. **Model routing**: roles, config, allowed list, applying frontmatter, and switching models in CLI, VS Code and the
   coding agent.
6. **Packs & customization**: the pack catalog, adding and removing packs, overriding `phases.yml`, adding project
   checks, presets, and writing your own hooks.
7. **Updating**: `baton update`, reading conflict reports, and how maintainers bump the upstreams (the sync workflow).
8. **Troubleshooting**: hooks not firing, stale baton, Windows scripts, broken ATV agents, model not available,
   template cleanup failed.
9. **Credits & licensing**: both upstreams and the bundled authors, full notices, what is excluded and why.
10. **Reference**: every command, skill and agent, with "when to use" and "hands off to"; CLI; schemas; error codes.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| Bundled CLI committed in repo | offline validation in adopter CI, no npm publish | `npx` on every CI run means network access, supply-chain exposure and slowness |
| Sync tool running real `specify init` | authentic Spec Kit manifests, clean `specify integration upgrade` | hand-copying templates drifts and breaks Spec Kit's own manifests |
| Template-cleanup workflow | the repo is both product and dogfood | separate template repo doubles the maintenance, and the owner has one repo |
| Small preset (append-only) | the pre-registration section must sit inside tasks.md where agents look | a separate file is often ignored by the tasks agent |
