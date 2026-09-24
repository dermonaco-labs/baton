# Contract: Packs

Packs are declared in `packs/<id>.yml` (schema: [data-model §4](../data-model.md)). `sync` resolves the files,
`init --packs` installs them, and `doctor` reports them. The file names below are the installed paths. Their upstream
paths are recorded in `baton.lock.json`.

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
| 17 | `.github/skills/ce-review/SKILL.md` (+ `references/`) | atv | review engine |
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

If the dependency closure (T026) shows that `ce-brainstorm` requires the `brainstorming` skill, `brainstorming` is
added as #29. That is still within SC-002 (≤ 30). Any further required reference fails the closure check and needs a
spec amendment.

## Optional packs

| Pack | Adds | Requires | Notes |
|---|---|---|---|
| `review-plus` | performance, api-contract, data-migrations, reliability, cli-readiness and previous-comments reviewers, plus schema-drift-detector and deployment-verification-agent | core | ce-review auto-selects the extra personas |
| `learning` | skills: observe, learn, instincts, evolve. `.github/hooks/copilot-hooks.json` (observer). `.atv/` scaffolding with a `.gitignore` for raw observations | core | opt-in because it writes local telemetry. Learned skills must be reviewed before commit (C10) |
| `docs-review` | skills: document-review, ce-compound-refresh. Agents: coherence, feasibility, scope-guardian, product-lens, design-lens and security-lens reviewers | core | advisory review of spec/plan prose |
| `security` | skill: atv-security. Agent: security-sentinel | core | a deeper audit than the core security persona |
| `research` | agents: best-practices-researcher, framework-docs-researcher, git-history-analyzer, issue-intelligence-analyst | core | used by plan Phase 0 when present |
| `issues` | skill: speckit-taskstoissues | core | needs the GitHub MCP / `gh`. Creates issues from tasks.md |
| `stack-python` | agent: kieran-python-reviewer | core | |
| `stack-typescript` | agents: kieran-typescript-reviewer, julik-frontend-races-reviewer | core | |
| `stack-rails` | agents: dhh-rails-reviewer, kieran-rails-reviewer | core | |
| `design` | skill: frontend-design. Agents: design-implementation-reviewer, figma-design-sync | core | |

The exact upstream paths are resolved and locked by `sync`. When a listed upstream file does not exist at the pinned
ref, sync fails with a hard error (no silent drop).

## Excluded (never installed)

| Item | Reason |
|---|---|
| `karpathy-guidelines` | no license upstream (FR-014) |
| gstack skills, agent-browser | out of scope; heavy external runtimes |
| `ce-plan`, `deepen-plan` | duplicate planner (C2) |
| `lfg`, `slfg`, `ralph-loop` | skip human gates (C6) |
| `ce-ideate`, `takeoff` | overlap brainstorm / `/baton` |
| `meme-iq`, `feature-video`, `test-browser`, `claude-permissions-optimizer` | unrelated or tool-specific |
| `atv-doctor`, `atv-update`, `setup` | replaced by `baton doctor` / `baton update` / `baton init` |
| `resolve-todo-parallel`, `ankane-readme-writer` | niche; they conflict with the tasks.md ownership |
| Spec Kit `git` extension | double commit automation (C5) |
| ATV `copilot-instructions.md` template, `.github/copilot-setup-steps.yml` | replaced (C7, C9) |

## Closure rules

1. For every installed file, collect its references: `/<skill>`, `` `<skill>` skill ``, `agent: <name>`,
   `@<agent>`, `compound-engineering:<ns>:<name>` and `speckit.<cmd>`.
2. Every reference must resolve to a file in the installed pack set. Otherwise it must be listed in
   `optional_refs` with a degradation note, or `sync` fails with `E_DANGLING_REF`.
3. `init --packs X` installs the `requires` closure of X and refuses packs that are in each other's `conflicts`.
4. `core` cannot be removed. `init --packs` always includes it.
