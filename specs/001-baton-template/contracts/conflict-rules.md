# Contract: Conflict-Resolution Rules (Spec Kit ↔ ATV)

These rules are normative. They are rendered into the BATON section of `.github/copilot-instructions.md`
(in short form) and into `docs/03-workflow.md` (in full form).

## Rule 0: precedence

1. The Constitution (`.specify/memory/constitution.md`)
2. The current baton (`specs/<feature>/handoff.md`)
3. The feature artifacts (`spec.md` > `plan.md` > `tasks.md`)
4. The BATON section of `copilot-instructions.md`
5. Upstream skill prompts (Spec Kit, ATV)

When an upstream skill prompt contradicts a higher layer, the higher layer wins. An example is a skill telling you
to write to `docs/plans/`. The agent MUST note the override in the baton `decisions`.

## Rules

| # | Area | Rule |
|---|---|---|
| C1 | Artifact roots | Feature artifacts live **only** in `specs/NNN-slug/`. `docs/plans/` is not created and not used. Brainstorms go in `docs/brainstorms/`. Solutions go in `docs/solutions/`. Quick-lane batons go in `.baton/quick/`. |
| C2 | Planner | `speckit-plan` is the only planner. `ce-plan` and `deepen-plan` are not installed. The research value of ATV comes from invoking `repo-research-analyst` and `learnings-researcher` during plan Phase 0 (guided by the `baton-templates` plan-template addition). |
| C3 | Executor | For a feature with `specs/NNN/tasks.md`, use `speckit-implement` (with `speckit-converge` for gap fill). `ce-work` is allowed only in the quick lane and MUST NOT run against a feature that has tasks.md. |
| C4 | Review | Code review is `baton-review` → `ce-review`, with intent taken from spec/plan/tasks (and not from PR text alone). Artifact consistency before code is `speckit-analyze`. Requirements quality is `speckit-checklist`. `document-review` is optional (the `docs-review` pack) and advisory. |
| C5 | Shipping | `baton-land` → `land`. The Spec Kit `git` extension is not installed, so commits are never automated twice. Landing never merges. |
| C6 | Autonomy | `lfg`, `slfg` and `ralph-loop` are excluded. No pipeline may skip a human gate. |
| C7 | Instructions | Baton owns the `<!-- BATON:START -->…<!-- BATON:END -->` section. Spec Kit owns `<!-- SPECKIT START -->…<!-- SPECKIT END -->`. Everything outside both belongs to the adopter. ATV's instruction template is not used, so there are no references to tools that aren't installed. |
| C8 | Hooks | Spec Kit extension hooks live in `.specify/extensions.yml` (the Baton hooks are mandatory). Copilot lifecycle hooks (`.github/hooks/*.json`) come only from packs that declare them (`learning`). Baton merges hook entries by command string and never reorders them. |
| C9 | Setup steps | `.github/workflows/copilot-setup-steps.yml` is the only setup-steps file. ATV's `.github/copilot-setup-steps.yml` is not installed, and `doctor` warns if it is present. |
| C10 | Knowledge loop | `ce-compound` writes to `docs/solutions/`. `learnings-researcher` reads it during plan and review. `/learn`, `/instincts` and `/evolve` are opt-in (the `learning` pack), and their outputs (`.github/skills/learned-*`) must be reviewed before commit. |
| C11 | Naming | Skills are invoked as `/speckit-<cmd>` (skills-mode separator `-`), and the Baton extension commands as `/speckit-baton-receive` and `/speckit-baton-handoff`. The Baton user-facing skills are `/baton`, `/baton-review` and `/baton-land`. |
| C12 | Models | Upstream prompts that mention specific models are advisory. The role config in `.baton/config.yml` decides. |
| C13 | Excluded upstream content | `karpathy-guidelines` (no license), gstack, agent-browser, `meme-iq`, `claude-permissions-optimizer`, `feature-video`, `test-browser`, `atv-doctor`, `atv-update`, `setup`, `ce-ideate` (overlaps brainstorm), `brainstorming` (unless it is required by ce-brainstorm, which is verified by the dependency closure), `takeoff` (replaced by `/baton` status), `resolve-todo-parallel`, `ce-compound-refresh` (docs-review pack). |
