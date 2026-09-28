# Roadmap after v0.1 (amendment A7)

**Status**: backlog, not in v0.1 scope. Nothing here adds a task to `tasks.md`, changes an acceptance check, or
changes a v0.1 contract. The implement session does not read this file (`handoff.md` lists it in `do_not_read`).

## Rules

1. Each item becomes its own Spec Kit feature (`specs/NNN-slug/`) when it is picked up, and it goes through the full
   relay: specify, plan, tasks, analyze and the pre-code gate. The sketches below are inputs to `specify`. They are
   not decisions.
2. An item may not weaken a v0.1 guarantee: closed packs (packs.md), human gates (C6), role-only identities (A1/A5),
   the git-tracked source of truth, and no secrets in the repo.
3. New baton data goes under `x-*` keys first (data-model: unknown top-level keys are rejected except `x-*`). It is
   promoted to a real field only with a schema change and `baton handoff migrate`.
4. Anything that costs premium requests or needs a third-party account is opt-in: an optional pack or a manual
   workflow, never PR CI.
5. Targets are intentions, not promises. After v0.1 ships, a short manual page links here (a v0.2 docs task; the
   v0.1 manual tasks T076–T081 stay unchanged).

## v0.2: strengthen the core promise (small)

| ID | Item | Why | Sketch | Touches |
|---|---|---|---|---|
| RM1 | Cloud agent dispatch | A task group assigned to the Copilot cloud agent should start with exactly the baton's context | `speckit-taskstoissues` (issues pack) plus a Baton issue template: the body holds the baton path, `read_first`, task IDs and AC IDs, never copied prose. The agent runs `baton handoff receive` via `copilot-setup-steps.yml`. The issue body passes `E_DENYLIST` | packs.md (issues), cli.md, phase-contracts |
| RM2 | Path-specific instructions | Fewer tokens per request; Copilot code review applies the same rules | Split the Baton section into `.github/instructions/baton-*.instructions.md` with `applyTo` (`specs/**`, `.baton/**`, `docs/solutions/**`). The marker block in `copilot-instructions.md` shrinks to a pointer. Ownership stays with Baton (C7) | conflict-rules C7, T045 |
| RM3 | Context budget check | Installed skills, instruction files and MCP servers all cost context on every turn | `baton doctor` warns `W_CONTEXT_BUDGET` when instruction lines, total skill-description bytes or the enabled MCP server count exceed `config.budgets` (conservative defaults, adopter-tunable) | cli.md, data-model §3 |
| RM4 | Terse default output | Agents read every line a tool prints | On success each command prints one summary line; details go to `--json` (already stable, cli.md) or `--verbose`. Errors keep code, file and fix hint | cli.md |
| RM5 | Rulesets template | A server-side backstop for skipped hooks (RK1) | `baton/templates/rulesets/baton-required.json` makes the `baton` check required on the default branch. Docs explain the import. `doctor --github` checks it read-only and warns `W_NO_REQUIRED_CHECK` | ci.md, cli.md, RK1 |
| RM6 | `baton handoff diff` | Re-receiving a long relay shouldn't re-read unchanged files | Compare the baton with the version at the last receive (git): changed hashes, new decisions, questions and assumptions. `receive` shows the diff when a prior receive exists | cli.md, handoff-contract |
| RM7 | Knowledge hygiene | `docs/solutions` rots and gets duplicated | Validate `docs/solutions/**` frontmatter against the pinned ATV `schema.yaml` (warn only). An optional Baton key `x-revisit-at` flags stale entries. Promotion rule: a pattern recorded 3+ times becomes a proposed instruction line, which a human approves | data-model, C10 |
| RM8 | `AGENTS.md` pointer | First step toward RM19: other agents can discover the relay | A generated, marker-managed `AGENTS.md` that points to the current baton, the conflict rules and `baton` commands. Full multi-agent integrations remain RM19 scope | spec Out of Scope, C7 |
| RM9 | Devcontainer | The same toolchain everywhere; workstations with restricted registry access and Windows without bash (RK4) | `.devcontainer/devcontainer.json` with pinned node LTS, uv and bash, used by maintainers and Codespaces. Optional `devcontainer` pack for adopters | plan structure, quickstart § Local gate |
| RM20 | Hosted-CI evidence route | Restricted mirrors may lack pinned dependencies, blocking `local-checks-pass` even when hosted checks are green | Define an explicit, verifiable handoff route for hosted check run IDs and commit SHAs, without treating a failed local command as passed. Coordinate with RM9's devcontainer fallback; require a human decision before changing phase contracts | phase-contracts, cli.md, quickstart § Local gate |
| RM10 | OpenSSF Scorecard | Visible supply-chain trust for a public template; free | A Scorecard workflow in the maintainer repo (dormant guard, SHA-pinned). Dependabot is already planned | ci.md |

## v0.3: differentiators (larger)

| ID | Item | Why | Sketch | Risks |
|---|---|---|---|---|
| RM11 | Parallel implement | The largest implementation speed-up | `baton split` turns `[P]` task groups with **declared, disjoint file sets** into child batons (`x-parent`, `x-children`), one per worktree or session. `baton join` refuses overlapping edits, checks the lock and manifest, and re-hashes `tasks.md` | merge conflicts; groups without file sets are refused |
| RM12 | Task-level model routing | Mechanical tasks don't need the implementation model | Optional task tags (`[fast]`) or `config.models.rules` map tasks to the `fast` role; `baton models suggest --task T0xx`. Off by default; advisory like the rest of routing | quality drops on mislabelled tasks |
| RM13 | Relay evals | Makes handoff quality measurable instead of claimed | `test/evals/` fixture feature: for each phase a fresh agent gets only `read_first`. Record turns, tokens where available, `do_not_read` files opened, and exit criteria met under `x-metrics` in `history`. Manual or scheduled `workflow_dispatch`, never PR CI (rule 4) | premium-request cost, non-determinism (use thresholds, not exact values) |
| RM14 | Review → compound proposals | Recurring findings should become knowledge | `baton-review` aggregates finding categories across `review.json` files and drafts `docs/solutions` entries for human approval | noise; drafts only |
| RM19 | Multi-agent hosts | Run the same relay in Claude Code, Codex, Cursor, Gemini CLI and other hosts | `baton init --agent <copilot\|claude\|codex\|cursor\|gemini\|...>` maps to Spec Kit `--ai` integrations. Per-host renderers produce skills and commands (`.claude/skills/` and commands, `.codex/prompts/`, `.cursor/rules/`, `CLAUDE.md`, `GEMINI.md`) with C7-style marker ownership. Model-role mappings stay advisory. Add per-host `baton doctor` checks and a render/validate smoke for every supported host in CI, with no premium calls. Touches spec Out of Scope, packs.md, C7, cli.md `init`, and handoff model roles; no v0.1 contract or tasks change | Host format churn; per-host maintenance cost covered by upstream-watch |

## Optional packs (on demand)

| ID | Pack | Sketch | Guardrails |
|---|---|---|---|
| RM15 | `docs-mcp` | MCP config for a current-docs server (for example Context7) | no key committed; works without a key or reads it from the user's environment |
| RM16 | `agentic-workflows` | GitHub Agentic Workflows for scheduled triage (upstream-watch findings, stale `docs/solutions`) | read-only or PR-only output; never passes a human gate (C6) |
| RM17 | `memory-mempalace` | MemPalace (MIT) MCP index over git-tracked sources only: `docs/solutions`, `specs/`, batons, constitution | rebuildable from git at any time; transcript mining off; answers cite the repo file, never the index |
| RM18 | `baton context` | An optional command that writes a compressed repo map (for example Repomix `--compress`) to `.baton/.tmp/` (gitignored) | pinned tool version; needs registry access; never committed |

## Considered and not planned

- **Prompt-compression proxies** (LLMLingua and similar): Copilot calls its own hosted models, so a proxy can't sit
  in between. Baton reduces tokens at the source instead (RM2–RM4, RM6, handoff limits).
- **Newer tool-output compressors** (2026 products with self-reported savings): revisit when independent
  benchmarks and licenses are verified. RM4 covers Baton's own output.
- **Memory outside git as the source of truth**: it conflicts with review in PRs and with the cloud agent. RM17 only
  adds an index.
