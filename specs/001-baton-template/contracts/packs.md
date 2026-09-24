# Contract: Packs

Packs are declared in `packs/<id>.yml` (schema: [data-model §4](../data-model.md)). `sync` resolves the files,
`init --packs` installs them, and `doctor` reports them. The file names below are the installed paths. Their upstream
paths are recorded in `baton.lock.json`. Storage in the Baton repo: `core` files live at their installed paths (the
template is a working install); optional pack files live under `packs/<id>/files/<installed path>` (lock field
`stored_at`, FR-053). Derived repos don't carry `packs/`, so they add optional packs through the pinned
`npx --yes github:dermonaco-labs/baton#vX.Y.Z init --packs <id>`.

## `core` (always installed): 28 files

| # | Installed file | From | Role |
|---|---|---|---|
| 1 | `.github/skills/speckit-constitution/SKILL.md` | speckit | project principles |
| 2 | `.github/skills/speckit-specify/SKILL.md` | speckit | phase-owner:specify |
| 3 | `.github/skills/speckit-clarify/SKILL.md` | speckit | phase-owner:clarify |
| 4 | `.github/skills/speckit-plan/SKILL.md` | speckit | phase-owner:plan |
| 5 | `.github/skills/speckit-tasks/SKILL.md` | speckit | phase-owner:tasks |
| 6 | `.github/skills/speckit-analyze/SKILL.md` | speckit | phase-owner:analyze |
| 7 | `.github/skills/speckit-implement/SKILL.md` | speckit | phase-owner:implement |
| 8 | `.github/skills/speckit-converge/SKILL.md` | speckit | implement re-entry (gap fill) |
| 9 | `.github/skills/speckit-checklist/SKILL.md` | speckit | requirements-quality gate (optional use) |
| 10 | `.github/skills/speckit-baton-receive/SKILL.md` | baton (extension) | before_* hook |
| 11 | `.github/skills/speckit-baton-handoff/SKILL.md` | baton (extension) | after_* hook |
| 12 | `.github/skills/baton/SKILL.md` | baton | entry point: status, next step, quick lane |
| 13 | `.github/skills/baton-review/SKILL.md` | baton | phase-owner:review (wraps ce-review) |
| 14 | `.github/skills/baton-land/SKILL.md` | baton | phase-owner:land (wraps land) |
| 15 | `.github/skills/ce-brainstorm/SKILL.md` | atv | phase-owner:brainstorm |
| 16 | `.github/skills/ce-work/SKILL.md` | atv | quick-lane executor |
| 17 | `.github/skills/ce-review/SKILL.md` (+ `references/`) | atv | review engine (always called as `mode:headless` by baton-review; its interactive `todo-create` dependency is an `optional_ref`) |
| 18 | `.github/skills/ce-compound/SKILL.md` | atv | phase-owner:compound |
| 19 | `.github/skills/land/SKILL.md` | atv | ship engine |
| 20 | `.github/agents/correctness-reviewer.agent.md` | atv | review-persona:always |
| 21 | `.github/agents/testing-reviewer.agent.md` | atv | review-persona:always |
| 22 | `.github/agents/maintainability-reviewer.agent.md` | atv | review-persona:always |
| 23 | `.github/agents/project-standards-reviewer.agent.md` | atv | review-persona:always |
| 24 | `.github/agents/agent-native-reviewer.agent.md` | atv | review-persona:always |
| 25 | `.github/agents/learnings-researcher.agent.md` | atv | review-persona:always + plan research |
| 26 | `.github/agents/security-reviewer.agent.md` | atv | review-persona:conditional |
| 27 | `.github/agents/adversarial-reviewer.agent.md` | atv | review-persona:conditional |
| 28 | `.github/agents/repo-research-analyst.agent.md` | atv | plan research (Phase 0) |

Supporting files (not counted toward SC-002):

- the `.specify/` tree (templates, scripts, integration manifests, the `baton` extension, the `baton-templates` preset)
- `.baton/*`
- the instructions marker section
- `.github/workflows/copilot-setup-steps.yml`
- `.github/workflows/baton.yml` (adopter CI, FR-033)
- `.gitignore` additions from `baton/templates/gitignore.adopter` (`.context/` for ce-review run artifacts,
  `.baton/conflicts/`, `.baton/.tmp/`)
- `.baton/schemas/findings.schema.json` (review.json, data-model §8)

If the dependency closure (T026) shows that `ce-brainstorm` requires the `brainstorming` skill, `brainstorming` is
added as #29. That is still within SC-002 (≤ 30). Any further required reference fails the closure check and needs a
spec amendment.

## Optional packs

| Pack | Adds | Requires | Notes |
|---|---|---|---|
| `review-plus` | performance, api-contract, data-migrations, reliability, cli-readiness, previous-comments and code-simplicity reviewers, plus schema-drift-detector, deployment-verification-agent, performance-oracle, data-integrity-guardian and pattern-recognition-specialist | core | ce-review auto-selects the extra personas; the last four (A6) are the optional `ce-compound` enhancement agents. **Recommended** by core |
| `learning` | skills: observe, learn, instincts, evolve. `.github/hooks/copilot-hooks.json` (observer). `.atv/` scaffolding with a `.gitignore` for raw observations | core | opt-in because it writes local telemetry. Learned skills must be reviewed before commit (C10) |
| `docs-review` | skills: document-review, ce-compound-refresh. Agents: coherence, feasibility, scope-guardian, product-lens, design-lens, security-lens and adversarial-document reviewers | core | advisory review of spec/plan prose. `adversarial-document-reviewer` is dispatched by `document-review`, so it ships in this pack (never in core; closure rule 2) |
| `security` | skill: atv-security. Agent: security-sentinel | core | a deeper audit than the core security persona |
| `research` | agents: best-practices-researcher, framework-docs-researcher, git-history-analyzer, issue-intelligence-analyst | core | used by plan Phase 0 when present |
| `issues` | skill: speckit-taskstoissues | core | needs the GitHub MCP / `gh`. Creates issues from tasks.md |
| `stack-python` | agent: kieran-python-reviewer | core | |
| `stack-typescript` | agents: kieran-typescript-reviewer, julik-frontend-races-reviewer | core | |
| `stack-rails` | agents: dhh-rails-reviewer, kieran-rails-reviewer | core | |
| `design` | skill: frontend-design. Agents: design-implementation-reviewer, figma-design-sync, design-iterator (A6) | core | |

The exact upstream paths are resolved and locked by `sync`. When a listed upstream file does not exist at the pinned
ref, sync fails with a hard error (no silent drop).

## Excluded (never installed)

| Item | Reason |
|---|---|
| `karpathy-guidelines` | no license upstream (FR-014) |
| gstack skills, agent-browser | out of scope; heavy external runtimes (C13) |
| `ce-plan`, `deepen-plan` | duplicate planner (C2) |
| `lfg`, `slfg`, `ralph-loop` | skip human gates (C6) |
| `ce-ideate`, `takeoff` | overlap brainstorm / `/baton` (C13) |
| `meme-iq`, `feature-video`, `test-browser`, `claude-permissions-optimizer` | unrelated or tool-specific |
| `atv-doctor`, `atv-update`, `setup` | replaced by `baton doctor` / `baton update` / `baton init` |
| `resolve-todo-parallel`, `ankane-readme-writer` | niche; they conflict with the tasks.md ownership |
| Spec Kit `git` extension (`speckit-git-commit`), ATV `git-commit`, `git-commit-push-pr` | double commit automation; `baton-land` → `land` ships (C5) |
| `todo-create` | only used by ce-review interactive/autofix modes; baton-review always calls `mode:headless` (C4) |
| ATV `copilot-instructions.md` template, `.github/copilot-setup-steps.yml` | replaced (C7, C9) |

## Closure rules

1. For every installed file, collect its references: `/<skill>`, `` `<skill>` skill ``, `agent: <name>`,
   `@<agent>`, `compound-engineering:<ns>:<name>`, `speckit.<cmd>`, and agent names a skill dispatches (reviewer or
   persona lists, `subagent_type`/agent-name arguments). Scanner precision (A6): `@<name>` counts only outside inline
   code spans and fenced blocks (same scope as `E_DENYLIST`), so `@tool`, `@font-face`, `@e1`, `@package` are not
   references. A backticked or bold full token ending in `-reviewer`, `-researcher`, `-oracle`, `-guardian`,
   `-specialist`, `-sentinel`, `-analyst`, `-editor` or `-agent` is a dispatched agent (this catches the `ce-compound`
   enhancement lists). A persona short name `x` resolves to `x-reviewer` in the same closure (e.g. `scope-guardian`).
2. Closure is checked **per pack in isolation**: every reference in a file of pack X must resolve to a file in X or
   in X's `requires` closure (always including `core`), independent of which other packs happen to be installed. So
   `core` can't depend on an optional pack, and an optional pack can't rely on a sibling pack it doesn't `require`.
   Otherwise the reference must be listed in X's `optional_refs` with a valid `reason` (rule 5) and a degradation
   `note`, or `sync` (and `sync
   --check` in CI) fails with `E_DANGLING_REF` naming the pack, the file and the reference. Example: `docs-review`
   without `adversarial-document-reviewer` fails, because `document-review` dispatches it.
3. `init --packs X` installs the `requires` closure of X and refuses packs that are in each other's `conflicts`.
4. `core` cannot be removed. `init --packs` always includes it.
5. **`optional_refs` reasons (A6).** Every entry is `{ref, reason, note}`. `reason` is exactly one of:
   - `upstream-absent`: the name is not an installable resource in the pinned Spec Kit output or ATV scaffold
     templates. `sync` checks those resource inventories after verifying the upstream commits and trees; if
     the name *is* installable at the pin, the reason is stale. Upstream development-only `.github/skills/`
     outside the ATV scaffold is not an installable resource.
   - `pack-provided:<pack-id>`: `<pack-id>` is an existing pack in `packs/` and installs a file with that name.
   - `excluded:C<n>`: the name is listed in § Excluded, that row cites `C<n>`, and no pack installs it. This third
     reason keeps settled exclusions expressible (see D18).
   A missing, unknown or unverifiable reason fails with `E_DANGLING_REF` (same as an unlisted reference). A present
   upstream file needed by a core phase's exit criteria may instead join core, but only while core stays ≤ 30 files.
6. **Recommended packs.** Every pack named by a `pack-provided:` reason in X is *recommended* by X. `baton validate`
   and `baton doctor` emit one warning `W_PACK_RECOMMENDED` per recommended pack that is not installed, listing the
   refs it would provide. It is a warning, never an error (exit code unchanged); `--strict` does not escalate it.

## Reference classification at the pin (A6)

Source: the verified `sync` of Spec Kit v1.0.11 + ATV `ad99673` (12 unique file→token pairs, repeated in every
closure) plus the enhancement lists the old scanner missed. Upstream files are never edited; the pin does not move.

| Pack · file | Reference | At pin | Reason / action | Degraded behaviour |
|---|---|---|---|---|
| core · `ce-work` | `linting-agent` | absent (only `lint`) | `upstream-absent`; T074 | Baton's `local-checks-pass` runs `config.checks`, which include lint |
| core · `ce-compound` | `compound` | absent (legacy self-name of `/ce-compound`) | `upstream-absent`; T074 | none, it means the skill itself |
| core · `ce-compound` | `research` | absent (only `autoresearch`, a different skill) | `upstream-absent`; T074 | "Related commands" text only, nothing dispatched |
| core · `ce-compound` | `cora-test-reviewer` | absent | `upstream-absent`; T074 | enhancement skipped |
| core · `ce-compound`; research · `best-practices-researcher` | `every-style-editor` | absent from installable scaffold (present in ATV development `.github/skills/`) | `upstream-absent`; T074 | enhancement skipped |
| core · `ce-compound` | `security-sentinel` | present | `pack-provided:security` | optional Phase 3 enhancement skipped |
| core · `ce-compound` | `best-practices-researcher`, `framework-docs-researcher` | present | `pack-provided:research` | enhancement skipped |
| core · `ce-compound` | `kieran-rails-reviewer` | present | `pack-provided:stack-rails` | enhancement skipped |
| core · `ce-compound` | `code-simplicity-reviewer`, `performance-oracle`, `pattern-recognition-specialist` | present, in no pack | added to `review-plus` → `pack-provided:review-plus` | enhancement skipped |
| core · `ce-compound`; review-plus · `schema-drift-detector` | `data-integrity-guardian` | present, in no pack | added to `review-plus` (closes it) → core: `pack-provided:review-plus` | enhancement skipped |
| review-plus · `code-simplicity-reviewer` | `ce-plan` | present | `excluded:C2` | `speckit-plan` is the planner |
| security · `atv-security` | `cso` | absent (legacy alias of `/atv-security`) | `upstream-absent`; T074 | none, heritage alias |
| core · `agent-native-reviewer`; design · `frontend-design`, `design-implementation-reviewer`; security · `atv-security` | `@tool`, `@font-face`, `@e1`, `@package`, `@semver` | – | not references (rule 1 precision) | – |

None of the present names is needed by a core exit criterion (`compound-recorded` is an `any_of` group that core
satisfies alone), so **core gains no files** (28, or 29 with `brainstorming`).

Existing entries, re-classified: core `todo-create` → `excluded:C4`; `ce-plan` → `excluded:C2`; `lfg`, `slfg` →
`excluded:C6`; `takeoff`, `agent-browser` → `excluded:C13`; `git-commit`, `git-commit-push-pr`, `speckit-git-commit`
→ `excluded:C5`; `simplify` → `upstream-absent`; review-plus personas → `pack-provided:review-plus`;
`kieran-python-reviewer` → `pack-provided:stack-python`; `kieran-typescript-reviewer`, `julik-frontend-races-reviewer`
→ `pack-provided:stack-typescript`; `dhh-rails-reviewer`, `kieran-rails-reviewer` → `pack-provided:stack-rails`;
`document-review`, `ce-compound-refresh` → `pack-provided:docs-review`. research `ce-ideate` → `excluded:C13`. design
`agent-browser` → `excluded:C13`; `design-iterator` now ships in `design` and resolves. Recommended by core:
`review-plus`, `security`, `research`, `docs-review`, `stack-python`, `stack-typescript`, `stack-rails`.
