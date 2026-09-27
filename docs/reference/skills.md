# Skill reference

Invoke slash skills by the names below. Core is always installed; optional
packs are opt-in. The phase owner must receive and validate its incoming
baton before acting. `docs/solutions/` contains compound knowledge, never
implementation plans.

## Core

### `baton`

When to use: enter the relay, inspect status, route the next phase, or start a
gated quick lane. Hands off to: the owner returned by `handoff next`, or
`ce-work` for quick-lane work.

### `speckit-constitution`

When to use: establish or amend repository principles. Hands off to:
`speckit-specify` after human review of governance changes.

### `speckit-specify`

When to use: describe a new feature's user stories and success criteria in
`specs/NNN-slug/spec.md`. Hands off to: `speckit-clarify`, or `speckit-plan`
after the scope gate if no clarification is needed.

### `speckit-clarify`

When to use: resolve underspecified parts of a feature specification. Hands
off to: the human scope gate, then `speckit-plan`.

### `speckit-plan`

When to use: plan a scoped feature; this is Baton's only planner. Hands off
to: `speckit-tasks` with plan and design artifacts.

### `speckit-tasks`

When to use: generate dependency-ordered tasks and preregister acceptance
checks. Hands off to: `speckit-analyze` before coding.

### `speckit-analyze`

When to use: compare spec, plan and tasks for contradictions and missing
coverage. Hands off to: the human pre-code gate, then `speckit-implement`
(or back to the earlier owner if an artifact must be corrected).

### `speckit-implement`

When to use: execute approved `tasks.md` with red-to-green acceptance
evidence. Hands off to: `baton-review` after all tasks/checks are satisfied.

### `speckit-converge`

When to use: re-enter implementation to append unbuilt work detected against
spec, plan and tasks. Hands off to: `speckit-implement` to finish added tasks.

### `speckit-checklist`

When to use: generate a requirements-quality checklist; checked items mean
requirements were reviewed, not implemented. Hands off to: a reviewer or
the current Spec Kit phase owner.

### `speckit-baton-receive`

When to use: mandatory before-phase Spec Kit hook, not a replacement for the
phase command. Hands off to: its phase owner after `handoff receive` passes,
or stops at a gate.

### `speckit-baton-handoff`

When to use: mandatory after-phase Spec Kit hook to persist and validate
phase evidence. Hands off to: `handoff next` and its named owner.

### `ce-brainstorm`

When to use: frame a vague or ambitious feature before a spec, writing
`docs/brainstorms/`. Hands off to: `speckit-specify`.

### `ce-work`

When to use: quick-lane changes with no new user-facing behaviour or public
contract, after `baton handoff new --quick`. Hands off to: `baton-review`;
escalate to `speckit-specify` if scope changes.

### `ce-review`

When to use: headless multi-persona review engine invoked by `baton-review`.
Hands off to: `baton-review` to normalize findings into `review.json`.
The interactive `todo-create` dependency is excluded.

### `baton-review`

When to use: review implementation against spec, plan and tasks, or review
quick-lane scope; wraps `ce-review mode:headless`. Hands off to:
`speckit-implement`/`ce-work` if findings block, otherwise `baton-land`.

### `baton-land`

When to use: validate local checks and land reviewed work without merging.
Hands off to: `land`, then the human PR-review gate.

### `land`

When to use: commit, push and open a PR after `baton-land` passes its checks.
Hands off to: the human PR-review gate, then `ce-compound`.

### `ce-compound`

When to use: capture a solved problem after landing in `docs/solutions/`.
Hands off to: the next `/baton` entry, or a reasoned skip-compound decision.

## Optional packs

Optional skill names are listed individually; support files under each
skill's `references/` or `assets/` are not separately invoked.
The `learning` pack also installs `.github/hooks/copilot-hooks.json` and
`.github/hooks/scripts/observe.js` to record local observations, plus
`.atv/.gitignore` to keep raw telemetry out of version control. The
`docs-review` and `design` packs include supporting templates/references
alongside their skills; these are read by the skills, not run as commands.

| Pack | Skill | When to use | Hands off to |
|---|---|---|---|
| `learning` | `observe` | Capture local opt-in observations | `learn` |
| `learning` | `learn` | Turn observations into candidate knowledge | Human review of generated skills |
| `learning` | `instincts` | Inspect learned instincts | Human review or `evolve` |
| `learning` | `evolve` | Refine reviewed learned skills | Human review before commit |
| `docs-review` | `document-review` | Advisory spec/plan prose review | Current Spec Kit owner; not the code-review gate |
| `docs-review` | `ce-compound-refresh` | Refresh an existing solution | `ce-compound` or human review |
| `security` | `atv-security` | Deeper opt-in security audit | `baton-review` or human reviewer |
| `issues` | `speckit-taskstoissues` | Create GitHub issues from tasks | Maintainer review of issues |
| `design` | `frontend-design` | Design frontend components | `speckit-implement` or `ce-work` under the chosen lane |
