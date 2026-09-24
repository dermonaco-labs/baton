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
- `core` has 28 planned skill/agent files, and SC-002 caps it at 30
- 10 optional packs
- 11 phases: 10 in the feature lane, plus `work` in the quick lane (which shares `review`, `land` and `compound`)
- ~12 CLI subcommands

**Maintainer validation environment**: Some maintainer workstations can't make TLS connections to
`registry.npmjs.org` or PyPI. On those, registry-dependent validation (`npm ci`, `npm run check`, and the
`uv`/`specify-cli` steps) runs in an ephemeral Linux container that has registry access, with the repo mounted
(for example `node:20-bookworm`), plus hosted CI, which is the authoritative gate. Never disable TLS verification,
and never commit a private registry or mirror. See quickstart.md § Local gate. Adopters are unaffected, because
Baton has no runtime network access.

## Constitution Check

*GATE: must pass before Phase 0 research and again after Phase 1 design.*

| Principle | How the plan complies | Status |
|---|---|---|
| I. Upstream-first | extension and hooks, wrapper skills, a small append-only preset. No upstream edits. Repairs are declared in `packs/repairs.yml`. | ✅ |
| II. Pinned & reproducible | `baton.lock.json` holds the SHAs and sha256s. Spec Kit is installed from a hash-locked requirements file, and ATV is fetched by commit with the commit and tree ids verified. `sync --check` runs in CI. | ✅ |
| III. Explicit handoffs | `handoff.schema.json` + `phases.yml` + receive/handoff hooks + CI validator | ✅ |
| IV. Stop, don't choose | the validator enforces `needs-human` on blocking questions. The receive hook stops. | ✅ |
| V. Pre-registration | acceptance-check registry in the tasks template. Implement entry requires it. | ✅ |
| VI. Minimal by default | `core` has 28 planned files (≤ 30) with no duplicate roles. Everything else goes in packs. | ✅ |
| VII. Model routing | role-based config. No model IDs in prompts. Frontmatter writes are opt-in. | ✅ |
| VIII. Cheap, strict, local-first | `npm run check` == CI. Free runners. SHA-pinned actions. | ✅ |
| Licensing | karpathy is excluded. THIRD_PARTY_NOTICES and per-file provenance are included. | ✅ |

The post-design re-check passed (data-model and contracts introduce no violations). The analyze re-check
(2026-09-24, [analysis.md](./analysis.md)) fixed one supply-chain gap. The un-hashed `uvx` install and the codeload
tarball have been replaced by a hash-locked install and a git fetch whose ids are verified.

## Project Structure

### Documentation (this feature)

```text
specs/001-baton-template/
├── spec.md              # what & why
├── research.md          # upstream facts, decisions (R1–R13)
├── plan.md              # this file
├── data-model.md        # entities & schemas (baton, phase, config, pack, lock, manifest)
├── quickstart.md        # validation scenarios for implement/review
├── analysis.md          # persisted speckit-analyze report (pre-code gate evidence)
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
├── packs/                          # MAINTAINER: pack definitions + repairs + optional-pack payload
│   ├── core.yml  learning.yml  docs-review.yml  review-plus.yml  security.yml  research.yml
│   ├── issues.yml  stack-python.yml  stack-typescript.yml  stack-rails.yml  design.yml
│   ├── <id>/files/…                # optional-pack files, mirroring install paths (written by sync)
│   └── repairs.yml
├── baton/                          # Baton-authored sources (installed into adopters)
│   ├── upstream/specify-cli.requirements.txt   # hash-locked (uv pip compile --generate-hashes)
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
│   ├── templates/{handoff.md,README.adopter.md,config.yml,phases.yml,gitignore.adopter,workflows/baton.yml}
│   └── schemas/{handoff,phases,config,pack,lock,manifest,findings,skill-frontmatter,agent-frontmatter}.schema.json
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
│   ├── template-cleanup.yml        # the disposition table below, machine-readable
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
    ├── workflows/{baton.yml,ci.yml,smoke.yml,upstream-watch.yml,release.yml,template-cleanup.yml,copilot-setup-steps.yml}
    ├── ISSUE_TEMPLATE/{bug.yml,feature.yml,upstream-bump.yml,config.yml}
    ├── pull_request_template.md  dependabot.yml  CODEOWNERS
```

**Structure Decision**: The repo root is itself a working Baton installation, so it dogfoods Baton, and it also
holds the dev sources.

- Paths marked *dev only* are listed in `.baton/template-cleanup.yml` and removed in derived repos.
- `docs/` is moved to `docs/baton/` in derived repos, which leaves `docs/brainstorms/` and `docs/solutions/` at the
  top level.
- The template disposition is set out in full in the table below, which `.baton/template-cleanup.yml` encodes.
- Adopter-owned files are never managed after they're installed: `docs/brainstorms`, `docs/solutions`,
  `.specify/memory/constitution.md` and everything under `specs/`.

### Template disposition (derived repos)

| Disposition | Paths |
|---|---|
| **Remove** | `src/`, `test/`, `specs/001-baton-template/`, `packs/`, `baton/`, `baton.lock.json`, `package.json`, `package-lock.json`, `tsconfig.json`, `.npmrc`, `.markdownlint-cli2.jsonc`, `.yamllint.yml`, `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, `CODE_OF_CONDUCT.md` (their contacts belong to the Baton project), `.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/`, `.baton/template-cleanup-pending` |
| **Replace** | `README.md` → `baton/templates/README.adopter.md`; `.specify/memory/constitution.md` → Spec Kit's pristine `.specify/templates/constitution-template.md` (the adopter README says to run `/speckit-constitution` first); `CHANGELOG.md` → a fresh Keep a Changelog stub; `.github/dependabot.yml` → a `github-actions`-only version (derived repos have no Baton `package.json`) |
| **Move** | `docs/*` → `docs/baton/*`, with relative links rewritten. `docs/brainstorms/` and `docs/solutions/` stay at the top level. |
| **Keep (dormant)** | `.github/workflows/{ci,smoke,upstream-watch,release}.yml` (repository guard) and `template-cleanup.yml` (the marker is gone). `GITHUB_TOKEN` cannot push workflow changes (research R12). `baton adopt --prune-workflows`, run locally, removes them. |
| **Keep (active)** | `.github/workflows/baton.yml`, `.github/workflows/copilot-setup-steps.yml`, `.github/skills/`, `.github/agents/`, `.github/copilot-instructions.md`, `.github/pull_request_template.md` (handoff checklist), `.specify/` (except the constitution), `.baton/` (bin, config, phases, schemas, manifest), `LICENSE`, `THIRD_PARTY_NOTICES.md`, `.editorconfig`, `.gitattributes`, `.gitignore` (merged with `gitignore.adopter`) |

`LICENSE` stays because the vendored and Baton-authored files keep their MIT terms. The adopter README explains
that adopters may relicense their own code, and that the notices must remain for the vendored files.

## Key Design Decisions

1. **Vendoring = hybrid D** (research R4). The maintainer runs `baton sync`, which uses the real `specify init`
   (installed from the hash-locked requirements file) in a temp dir, and reads the ATV templates from a git fetch
   of the pinned commit (the commit and tree ids are verified). Nobody runs the ATV binary.
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
   at `land` (the PR). `baton handoff approve --by "<role>" [--via "<channel>"]` records the approval in the baton,
   role-only and never a personal handle or email (data-model §1.1). The receive hook for
   the next phase requires it.
6. **Context budget.** `read_first` has at most 12 entries, and the baton body has at most 150 lines by default
   (configurable). `do_not_read` lets the previous agent exclude noisy files explicitly, such as superseded
   research.
7. **Quick lane.** `ce-work` → `baton-review` → `baton-land` → (`ce-compound`). The baton lives at
   `.baton/quick/<slug>.md` (so there's no `docs/plans/`). It uses the same schema with `lane: quick`, and escalates
   to the feature lane on `E_LANE_ESCALATE` (new behaviour or contract detected by the reviewer). Its phases
   (`work`, plus `by_lane.quick` for review/land/compound), entry checks, gate and lane transitions are normative in
   contracts/phase-contracts.md § Quick lane. Compound exit criteria with OR use check groups (`any_of`/`all_of`,
   data-model §2.1).
8. **Review personas in core.**
   - Always included: correctness, testing, maintainability, project-standards, agent-native, learnings-researcher.
   - Also included: security-reviewer and adversarial-reviewer.
   - The other conditional personas go to `review-plus`.
   - `baton-review` calls `ce-review mode:headless` and passes the list of installed persona agents, so that
     ce-review selects only the ones that are available. This is the documented graceful degradation.
   - It normalizes the structured output into `specs/<feature>/review.json` (`findings.schema.json`, Baton-owned;
     research R13).
9. **Dependency closure check.** Sync scans each vendored skill or agent for references to other
   skills and agents (`/name`, `agent: name`, `compound-engineering:*:name`). It fails with `E_DANGLING_REF`
   unless the reference is in the same pack or its `requires` closure (checked per pack) or is declared in `packs/*.yml` under
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
| Dormant maintainer workflows in derived repos | `GITHUB_TOKEN` cannot push workflow changes | a PAT secret for cleanup breaks the "`GITHUB_TOKEN` only" rule (Principle VIII) |
| Small preset (append-only) | the pre-registration section must sit inside tasks.md where agents look | a separate file is often ignored by the tasks agent |
