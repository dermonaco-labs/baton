# Research: Baton Template

**Feature**: 001-baton-template | **Date**: 2026-09-24 | **Method**: I read the upstream sources at their pinned refs
(GitHub API, PyPI, npm) and read a battle-tested reference installation (a private project that has both kits
installed). I only generalized from the reference and copied nothing out of it.

## R1. Upstream versions and immutable references

| Upstream | Channel | Version | Immutable ref | License | Copyright line |
|---|---|---|---|---|---|
| GitHub Spec Kit | PyPI `specify-cli` | 1.0.11 (2026-09-24) | tag `v1.0.11` → commit `8147943512404afb9d99c6252cb9bf84369fd0b0` | MIT | `Copyright GitHub, Inc.` |
| ATV Starter Kit | npm `atv-starterkit` | 2.6.3 (2026-04-27) | tag `v2.6.3` → commit `b2a2d11dd0bea12eb7274dd82e1e71c5362f3acb` | MIT | `Copyright (c) 2026 All The Vibes` |
| ATV Starter Kit | git `main` | unreleased (VERSION file on main) | commit `ad996736b879be87c7755df5c5017d5336203bbc` (2026-07-24) | MIT | same |
| Compound Engineering (bundled in ATV) | git | n/a | vendored via ATV | MIT | `Copyright (c) 2025 Every` |
| autoresearch skill (bundled in ATV) | github/awesome-copilot | n/a | vendored via ATV | MIT | `Copyright GitHub, Inc.` |
| karpathy-guidelines (bundled in ATV) | multica-ai/andrej-karpathy-skills | n/a | n/a | **none** | **not redistributable** |
| gstack (optional in ATV) | garrytan/gstack | n/a | n/a | MIT | not used by Baton |
| agent-browser (optional in ATV) | vercel-labs/agent-browser | n/a | n/a | Apache-2.0 | not used by Baton |

**Cadence**: Spec Kit shipped five releases between 2026-09-15 and 2026-09-24. ATV has not tagged a release since
2026-04-27, but `main` has kept moving. **Decision**: automate upstream watching (weekly) and keep bumps deliberate (R3).

## R2. How the upstreams install

**Spec Kit 1.0.x**

- Install and pin: `uv tool install specify-cli==1.0.11` or ephemeral `uvx --from specify-cli==1.0.11 specify …`. (upstream's documented options; Baton's `sync` uses a hash-locked install instead, see R4.)
  The git form also works: `--from git+https://github.com/github/spec-kit.git@v1.0.11`.
- Init: `specify init --here --integration copilot [--script sh|ps|py] [--force] [--ignore-agent-tools] [--preset <id>]`.
  In non-interactive mode it defaults to Copilot. (`--ai`/`--ai-skills` from 0.x are superseded by `--integration`.)
- The Copilot integration defaults to **skills mode**, which writes `.github/skills/speckit-<cmd>/SKILL.md` and uses
  `-` as the invoke separator. `--integration-options="--commands"` switches to `.github/agents/speckit.*.agent.md`
  with `.github/prompts`.
- Spec Kit writes its own manifests (`.specify/integrations/*.manifest.json` with sha256 per file), plus
  `.specify/integration.json`, `.specify/init-options.json` and a managed `.specify/.gitignore` that excludes
  `feature.json`. **Implication**: generate these by running the real CLI so that they stay authentic and
  `specify integration upgrade copilot` keeps working for adopters.
- Extension points:
  - **Extensions** (`extension.yml`) provide namespaced commands `speckit.<ext>.<cmd>` and **hooks**.
  - **Every core command template** reads `.specify/extensions.yml` for `hooks.before_<cmd>` and
    `hooks.after_<cmd>`. This applies to specify, clarify, plan, tasks, analyze, implement, checklist and converge,
    and was verified in `templates/commands/*.md@v1.0.11`.
  - Mandatory hooks (`optional: false`) emit `EXECUTE_COMMAND:` and the agent MUST run them. Optional hooks prompt.
    Hook `condition` fields are skipped by the templates, so **Baton must not rely on `condition`**.
  - **Presets** can replace, prepend, append or wrap templates and commands, with priority stacking and
    project-local overrides in `.specify/templates/overrides/`.
  - `specify extension add --dev <dir>` installs from a local directory, and `--from <url>` installs from an archive.
- Commands carry `handoffs:` frontmatter (label/agent/prompt/send). **Only VS Code renders it**, and the
  Copilot CLI ignores it.
- Upgrade path: `specify self upgrade --tag vX.Y.Z` updates the CLI, and `specify integration upgrade copilot`
  followed by `specify extension update` updates project files.

**ATV 2.6.x**

- A Go binary delivered through npm (`npx atv-starterkit@<ver> init`). The templates are embedded
  (`pkg/scaffold/templates/`).
- One-click `init` installs the full ATV catalog for the detected stack. That's ~30 skills and 40+ agents, plus
  instructions, hooks, MCP config, `.vscode` config and docs dirs, **with no pack or preset flags**. Only `--guided`
  (an interactive TUI) offers presets.
- The writer does **write-if-not-exists**. It never overwrites, and it shallow-merges JSON for the MCP, hooks and
  `.vscode` configs. The guided mode writes `.atv/install-manifest.json` with checksums, and `uninstall` uses it.
- It writes setup steps to `.github/copilot-setup-steps.yml`. GitHub's coding agent reads
  `.github/workflows/copilot-setup-steps.yml` (job `copilot-setup-steps`). **Baton writes the correct path.**

**Implication for Baton**: running ATV's binary cannot produce a curated set, and it cannot be reproduced exactly,
because the output depends on stack detection. Baton therefore vendors ATV **templates from the git tree** at the
pinned SHA and never runs the ATV binary.

## R3. Critical finding: corrupted agent templates in ATV 2.6.3

- In tag `v2.6.3`, **49 of the 51** `pkg/scaffold/templates/agents/*.agent.md` files contain **zero newline characters**.
  The frontmatter collapses into `---description: …user-invocable: true---# Title…`. That isn't valid
  YAML frontmatter, so Copilot can't read `description` and may treat the agents as unnamed or invalid.
- The reference installation has byte-identical broken files (0 LF, 0 CR). This means real-world installs of
  2.6.3 are affected.
- Fixed on `main` in `f0a86ef` ("fix(scaffold): repair corrupted agent templates shipped by the installer",
  2026-06-04). Not released.
- **Decision**: pin ATV to the `main` commit `ad996736b879be87c7755df5c5017d5336203bbc`. Add a frontmatter lint to sync
  and CI so that any regression fails loudly. `init` detects the corrupted-agent signature in existing repos and
  offers `--repair` (replace with the pinned good copy when the corrupted file matches the known-bad sha256).
- **Upstream action**: open an ATV issue that asks for a release containing f0a86ef (task T074; the owner files it).

## R4. Vendoring strategy

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| A. Vendored snapshot only | "Use this template" works instantly, offline, deterministic | Drift, manual refresh, easy to lose provenance | Partial |
| B. Install scripts calling upstream installers | Tiny repo, always "real" upstream | ATV can't curate; needs network, uv and node at adoption time; not reproducible (stack detection, `@latest`); corrupted 2.6.3 | Rejected |
| C. Pinned upstream installers only (no snapshot) | Reproducible if pinned | Same curation problem; template path would need a bootstrap step before first use | Rejected |
| **D. Hybrid: pinned lock + materialized snapshot + sync tool** | Instant template use; reproducible (`sync --check`); curated packs; per-file provenance and checksums; upgrades are reviewed diffs; adopters need no upstream tooling | The maintainer side needs uv and node; a bit more tooling | **Chosen** |

How D works:

1. `baton.lock.json` holds the pins (version plus SHA) and one entry per vendored file: `{path, upstream, upstream_path,
   sha256_upstream, sha256_installed, license, repair}`.
2. `baton sync`:
   - Creates a temp venv and installs Spec Kit with
     `uv pip install --require-hashes -r baton/upstream/specify-cli.requirements.txt`. That file is generated by
     `uv pip compile --generate-hashes` for `specify-cli==<pin>` and committed, so the CLI **and every transitive
     dependency** is verified by sha256 before it runs (constitution: Supply-Chain). A bare
     `uvx --from specify-cli==<pin>` is not used, because it verifies nothing.
   - Runs `specify init --here --integration copilot --script sh --force --ignore-agent-tools` from that venv
     in a temp dir.
   - Installs the Baton extension there with `specify extension add --dev ./baton/speckit-extension`, so that
     `.specify/extensions.yml` and the generated `speckit-baton-*` skills are produced by Spec Kit itself.
   - Fetches ATV with git (`git init` + `git fetch --depth 1 <repo> <commit>` + `git checkout FETCH_HEAD`) and verifies
     that `git rev-parse HEAD^{commit}` and `HEAD^{tree}` equal the locked `commit` and `tree`. Git objects are
     content-addressed, so this is intrinsic verification. **Codeload tarballs are not used**, because GitHub
     does not guarantee that generated archive bytes stay stable, which would make `sync --check` flaky.
   - Selects files per pack, checks each one against `sha256_upstream` in the lock (except on `--bump`), applies
     the declared repairs, lints them, and writes the snapshot and the lock.
3. CI runs `baton sync --check` weekly (it needs network) and on PRs that touch `baton.lock.json` or `packs/`.
   It also runs an offline `lock verify` on every PR (checksums of the committed files).
4. Adopters: the template already contains the snapshot. Existing repos install it from the **release archive**,
   whose sha256 is verified. Updates follow the manifest and only touch unmodified files.

## R5. Integration strategy: extension and hooks, not presets or patches

- **Spec Kit side**: a Baton **extension** with commands `speckit.baton.receive` (entry check) and
  `speckit.baton.handoff` (exit write), registered as **mandatory** `before_*`/`after_*` hooks on the seven gated
  commands (specify, clarify, plan, tasks, analyze, implement, converge). `checklist` supports hooks upstream but is
  not a Baton handoff phase. The core Spec Kit prompts stay untouched, so upgrades stay clean.
- Presets were considered, for example appending a "Handoff" section to each command. They were rejected as the
  primary mechanism because they change the command text, and because `append` composition couples Baton to
  upstream prompt structure. A preset remains an option for template text additions (for example a
  "Pre-registered acceptance checks" section in `tasks-template.md`) using `append`, which is low risk.
  Decision: **one small preset `baton-templates`**. It appends to `tasks-template.md` (acceptance-check registry)
  and `plan-template.md` (model-routing and handoff notes). It is re-evaluated at analyze.
- **ATV side**: ATV skills have no hook system. Baton adds **wrapper skills** (`baton-review`, `baton-land`) and a
  relay skill (`baton`). These do the following:
  1. Receive (validate the baton).
  2. Invoke the upstream skill (`ce-review`, `land`) with explicit context from `read_first`.
  3. Write the baton.

  The upstream ATV skill files remain byte-identical.
- **Hook caveat**: hooks run only when the agent follows the command template. The validator in CI is therefore the
  backstop, and a baton that is missing or stale fails `baton validate` on the PR.

## R6. Conflicts between the kits and how they resolve

The full rules are in `contracts/conflict-rules.md`. Summary:

| Concern | Spec Kit | ATV | Baton rule |
|---|---|---|---|
| Requirements | `speckit-specify` → `specs/NNN/spec.md` | `ce-brainstorm` → `docs/brainstorms/` | Brainstorm is an optional **pre-phase**. Its doc feeds specify through `read_first`. Spec.md is the source of truth. |
| Planning | `speckit-plan` → `plan.md`, research, contracts | `ce-plan` → `docs/plans/*.md`, `deepen-plan` | **speckit-plan only.** ATV's research agents (`repo-research-analyst`, `learnings-researcher`) are invoked from the Baton `before_plan`/research guidance. `ce-plan`, `deepen-plan` and `docs/plans/` are excluded. |
| Task list | `tasks.md` with checkboxes | Plan checkboxes | `tasks.md` only. |
| Implementation | `speckit-implement` | `ce-work` | Feature lane: `speckit-implement`. Quick lane: `ce-work`. They never both run on one feature. |
| Consistency | `speckit-analyze`, `speckit-converge` | — | Keep both (pre-code gate and gap fill). |
| Code review | — | `ce-review` (+ personas) | `baton-review` → `ce-review`, with spec/plan/tasks as the intent source. |
| Doc review | `speckit-checklist` | `document-review` | Core: `speckit-checklist`. `document-review` is in the optional `docs-review` pack. |
| Shipping | git extension (optional) | `land` | `baton-land` → `land`. The Spec Kit `git` extension is not installed (no double commits). |
| Knowledge | — | `ce-compound` → `docs/solutions/` | Keep. `learnings-researcher` reads it during plan and review. |
| Autonomy | `workflows/speckit` (gated) | `lfg`, `slfg`, `ralph-loop` | Excluded in v0.1. Gates are human, and a future `baton next --auto` respects them. |
| Instructions | SPECKIT markers in agent context | ATV-authored instructions template | Baton-owned `copilot-instructions.md` with a BATON marker section. The SPECKIT block is preserved. The ATV template text isn't copied. |
| Hooks | `.github/hooks/speckit.json` (extension events) | `.github/hooks/copilot-hooks.json` observer | Both allowed. The observer only comes with the `learning` pack. |

**Pinned closure verification (Spec Kit 1.0.11, ATV `ad99673`).** Verified `sync` materialized 114 locked upstream files and checked all 11 packs in isolation. Core has 28 counted resources; `ce-brainstorm` does not require `brainstorming`. The ATV tree contains `.github/skills/every-style-editor/SKILL.md` as development tooling, but the pinned installable scaffold does not provide it. Per the clarified closure rule, `upstream-absent` applies to the installable inventory; the upstream file and pin remain unchanged.

**Pinned runtime verification.** Spec Kit's `extension add --dev` generates `.specify/extensions.yml` with 14 `before_*`/`after_*` entries for the seven gated commands; each Baton hook is enabled, mandatory (`optional: false`) and unconditional (`condition: null`). With the pinned `--ignore-agent-tools` init flags it emits no `.github/copilot-instructions.md`, so Baton installs its own BATON section and preserves a SPECKIT section if one already exists. ATV `ce-review` always selects its six core personas and conditionally selects more, without its own missing-persona fallback; the `baton-review` wrapper restricts dispatch to installed personas and stops if upstream cannot honor the restriction. `mode:headless` emits a structured text finding envelope and a run artifact, not Baton JSON; the wrapper normalizes that output.

## R7. Model routing

- The Copilot custom agent frontmatter supports `model` (VS Code and CLI) and `tools`. `handoffs` works only in VS Code.
  `target` is ignored by the CLI. **Verify against docs.github.com during implementation** (task T064).
  Skills don't carry `model`.
- The phase owner is usually a *skill*, not an agent. Model routing therefore can't rely only on frontmatter.
  **Decision**: the baton carries `model_role` and `suggested_model`, and `baton handoff next` prints a ready
  command (for example `copilot --model <m>` or "switch model to <m>, then run /speckit-tasks"). Writing agent
  frontmatter is opt-in.
- Lessons from the reference project, generalized:
  - High-reasoning models for specify, clarify, plan, tasks, analyze and review.
  - A strong coding model for implement.
  - A central allowed-model list for teams, with validator enforcement.

## R8. Lessons from the reference installation (generalized, nothing copied)

1. **Pre-registration**: registering acceptance evidence expectations (a red baseline) before implementing stopped
   goalpost-moving. → Baton adds an acceptance-check registry in tasks and an implement entry criterion.
2. **Stop, don't choose**: agents that guessed at gaps created costly rework. → Blocking questions force `needs-human`.
3. **Reviewer checklists**: structured JSON findings with confidence gating (the ce-review findings schema) outperform
   free-form reviews. → `baton-review` requires a findings JSON and records its path in the baton.
4. **Strict local validation before CI**: → `baton-land` refuses to push unless the local `npm run check` (or
   the configured `checks`) passes.
5. **Model routing and enforcement**: → R7.
6. **Instructions drift**: the reference project's `copilot-instructions.md` grew long, feature-specific SPECKIT
   blocks and generic ATV boilerplate (references to gstack that wasn't installed). → Baton keeps instructions short.
   Per-feature context lives in the baton and not in global instructions.
7. **Setup-steps location**: the reference project had placeholder `echo` steps at the non-functional path. → FR-032.
8. **Broken agent frontmatter shipped unnoticed** (R3). → Frontmatter lint in CI and sync.

## R9. Tooling language and distribution

- Node ≥ 20 is required anyway (ATV hooks, Copilot CLI). Python and uv are required only for Spec Kit's CLI.
  **Decision**: write the Baton CLI in Node, as ESM with JSDoc types (checked by `tsc --noEmit`), using the
  deps `ajv`, `ajv-formats` and `yaml`.
- The bundle is built with `esbuild` into `.baton/bin/baton.mjs` (target: a single file under 400 KB) and committed.
  CI verifies that it is up to date (`npm run build && git diff --exit-code`). The bundle banner and
  `THIRD_PARTY_NOTICES.md` carry the ajv (MIT) and yaml (ISC) notices.
- Distribution: `npx --yes github:dermonaco-labs/baton#vX.Y.Z <cmd>` (the package.json `bin` points to the
  bundle), and the release asset `baton.mjs` with `SHA256SUMS`.
- Tests use `node --test`, which adds no dependency.

## R10. CI cost

- Public repos get free standard hosted runners. Estimated budget per PR:
  - lint: ~1 minute
  - unit: ~1 minute
  - smoke on ubuntu: ~3 minutes
  - smoke on windows: ~5 minutes, which is billed 2× on private repos and free on public ones
- Set `concurrency` so that superseded runs are cancelled, and add `paths-ignore` for pure docs-only changes in smoke.
- The weekly upstream-watch takes ~3 minutes with network.
- Release uses `actions/attest-build-provenance`, which is free for public repos.

## R11. Docs site

GitHub renders the Markdown and Mermaid in `docs/` natively. A Pages site (Jekyll or just-the-docs) would add
config, a build and link maintenance. **Decision**: defer it. Add a backlog issue "Optional docs site" once
the manual has stabilised.

## R12. Template instantiation hygiene

"Use this template" copies every file, but it does not copy topics, settings, releases or tags. Baton's repo
also contains its own dev sources and dogfood spec.

**Constraint (verified during analyze)**: `GITHUB_TOKEN` can never push a commit that adds, modifies or deletes
files under `.github/workflows/`. The push is rejected with "refusing to allow a GitHub App to create or update
workflow … without `workflows` permission", and no `permissions:` key can grant that. An automated cleanup that
deletes workflows, including itself, would **always** fail.

**Decision**: add a `template-cleanup.yml` workflow. It runs on `push` when
`github.repository != 'dermonaco-labs/baton'` and `.baton/template-cleanup-pending` exists. It runs
`baton adopt --no-workflows`, which applies the disposition table in plan.md § Template disposition:

- delete the dev paths
- replace the constitution with Spec Kit's pristine template
- swap in the adopter README
- reset the CHANGELOG
- write the manifest
- delete the pending marker

It **never touches `.github/workflows/`**, commits as `github-actions[bot]`, and leaves itself in place. The
workflow stays dormant because the marker is gone.

- The maintainer workflows (`ci`, `smoke`, `upstream-watch`, `release`) are guarded by
  `if: github.repository == 'dermonaco-labs/baton'`, so they stay dormant in derived repos.
- The adopter workflow `baton.yml` is active in every repo.
- `baton adopt --prune-workflows`, run locally with the user's own credentials, optionally deletes the dormant
  workflow files.
- The fallback for a failed push (for example, branch protection) is running `baton adopt` locally.

## R13. Upstream behaviour verified during analyze (2026-09-24)

- **Spec Kit `analyze` is strictly read-only.** Its template (v1.0.11) says "Output a Markdown report (no file
  writes)". The report exists only in the chat, so Baton's `speckit.baton.handoff` command (phase `analyze`)
  persists it to `specs/<feature>/analysis.md`. That is a Baton-owned write that happens after analyze has finished,
  so the analyze prompt stays untouched. The `analysis-recorded` and `no-critical-findings` exit checks read that
  file.
- **`ce-review` output.**
  - The interactive mode asks for decisions and creates todos through the `todo-create` skill, which Baton doesn't
    install.
  - `mode:headless` is built for skill-to-skill calls. It returns structured findings (severity, autofix_class,
    owner, confidence, evidence) and writes a run artifact under
    `.context/compound-engineering/ce-review/<run-id>/`. It doesn't create todos or prompt the user.
  - Decision: `baton-review` always calls `ce-review mode:headless`, and normalizes the output into a Baton-owned
    findings file (`baton/schemas/findings.schema.json`) at `specs/<feature>/review.json` (quick lane:
    `.baton/quick/<slug>.review.json`).
  - `.context/` is added to the adopter `.gitignore`.
  - `todo-create` is declared as an `optional_ref` (headless mode doesn't use it).
  - The validator never depends on upstream-internal file formats.
