# Contract: `baton` CLI

The CLI ships as one file, `.baton/bin/baton.mjs` (Node ≥ 20, no runtime installation). It is also runnable as
`npx --yes github:dermonaco-labs/baton#vX.Y.Z <cmd>` and from the release asset `baton.mjs`.

Global flags: `--cwd <dir>`, `--json` (machine output), `--github` (workflow annotations), `--quiet`,
`--no-color`, `--help`, `--version`.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | success / valid |
| 1 | validation errors found |
| 2 | usage error (bad flags, unknown command) |
| 3 | stopped: `needs-human` (a blocking question, or a gate is pending) |
| 4 | conflicts left unresolved (`init`/`update` wrote `.baton/conflicts/`) |
| 5 | environment/prerequisite missing (for example `uv` for `--script ps` or for `sync`) |
| 10 | internal error (bug; prints the stack with `--debug`) |

## Adopter commands

| Command | Behaviour | Key flags |
|---|---|---|
| `init` | Installs the `core` pack (plus the selected packs, read from `packs/<id>/files/`) into the cwd, merges the marker sections, installs `.github/workflows/baton.yml` and writes the manifest. Idempotent. It never overwrites unmanaged or user-modified files. It writes conflicts to `.baton/conflicts/<path>.new` and prints a report. In a derived repo (no `packs/` dir), `--packs` with an optional pack exits 5 and prints the pinned `npx --yes github:dermonaco-labs/baton#vX.Y.Z init --packs …` command. | `--packs a,b`, `--script sh\|ps\|py`, `--adopt-upstream <glob>`, `--keep <glob>`, `--repair` (fix known-corrupted ATV files), `--dry-run` |
| `update` | Moves to the version of the running CLI (or `--to`, which re-invokes the pinned `npx`). It updates managed, unmodified files and reports the rest. | `--to vX.Y.Z`, `--dry-run` |
| `doctor` | Reports the version, pins, packs, manifest integrity, prerequisites (node, git, bash/pwsh, uv), hook registration in `.specify/extensions.yml`, a misplaced `.github/copilot-setup-steps.yml`, corrupted agents and models that aren't allowed. Warnings only, unless `--strict`. | `--strict` |
| `validate` | Checks every baton, `phases.yml`, `config.yml`, the manifest, `packs/*.yml` (when present), `review.json` files, and skill/agent frontmatter. It also checks model enforcement and docs coverage (only when `docs/reference` exists). | `--changed` (only files changed vs `origin/HEAD`), `--path <file>` |
| `status` | Shows every feature and quick baton: phase, next, owner, status, gate and staleness. | |
| `handoff new` | Creates a baton for a feature dir (after specify) or starts a quick lane: `--quick <slug> --reason R` writes `.baton/quick/<slug>.md` with `phase_completed: none`, `next_phase: work` and a `quick-eligible` decision. | `--feature`, `--quick <slug>`, `--reason` |
| `handoff show [--feature F \| --quick S]` | Prints the current baton (frontmatter summary, `read_first`, open questions, gate) without running checks. | `--json` |
| `handoff receive --phase P` | Runs the entry checks for P. It prints the `read_first` list, or stops (exit 3) with the reason. Called by the before_* hooks (and by the `baton` skill around `ce-work`). | `--mode converge`, `--quick <slug>` (quick baton; otherwise the feature is inferred from the branch or `--feature`) |
| `handoff write --phase P` | Fills the deterministic fields, validates the exit criteria and prints what the agent must still fill. Called by the after_* hooks. | `--from-json <file>` (agent-supplied fields), `--next <phase>` (branching phases; default = first `next`), `--from-brainstorm <path>` / `--from-quick <quick baton>` (with `--phase specify`), `--quick <slug>`, `--analysis-from <file>` (with `--phase analyze`: persists the report to `analysis.md`) |
| `handoff next` | Prints the next command and the suggested model (for example `/speckit-tasks · model role planning → claude-opus-5.5`). | |
| `handoff approve --by "<role>"` | Records the gate approval: `approved_by` = `<role>` or `<role> via <channel>`, `approved_at` = today (full-date). Role and channel must be in `config.gates`; names, handles and emails are rejected (`E_APPROVER_FORMAT`). | `--via "<channel>"`, `--at <date>`, `--note` |
| `handoff answer ID "choice" --by "<role>"` | Resolves an open question into a decision. | |
| `handoff refresh --reason R` | Re-hashes the artifacts after an intentional edit and adds a decision entry. | |
| `handoff escalate --quick <slug>` | Quick → feature lane. It sets the quick baton to `next_phase: specify` with the reason and prints `/speckit-specify` with the quick baton as input. It never creates feature dirs (Spec Kit owns numbering). | `--reason` |
| `handoff init --infer` | Builds a baton for a feature that started before Baton (`status: needs-human`). | |
| `handoff migrate` | Upgrades batons to the current schema version. | `--dry-run` |
| `models apply` | Writes `model:` into managed agent frontmatter from the role config (only when `apply_to_agents: true`, or with `--force`). Idempotent. | `--dry-run` |
| `adopt` | Runs the template cleanup (plan.md "Template disposition"). It refuses to run in the Baton source repo (`GITHUB_REPOSITORY` or the `origin` remote is `dermonaco-labs/baton`; `baton.lock.json` alone is not a signal, because a fresh derived repo still has it) unless `BATON_FORCE_CLEANUP=1`. The `template-cleanup.yml` workflow calls `adopt --no-workflows`, because `GITHUB_TOKEN` cannot change `.github/workflows/`. | `--dry-run`, `--no-workflows`, `--prune-workflows` (deletes the dormant maintainer workflows; run locally) |
| `uninstall` | Removes managed, unmodified files and the marker sections. It keeps `specs/`, `docs/brainstorms`, `docs/solutions` and the constitution. | `--dry-run` |

## Maintainer commands (only in the Baton repo; they refuse if `baton.lock.json` is absent)

| Command | Behaviour | Key flags |
|---|---|---|
| `sync` | Creates a temp venv and runs `uv pip install --require-hashes -r baton/upstream/specify-cli.requirements.txt`, then `specify init --here --integration copilot --script sh --force --ignore-agent-tools` in a temp dir. It installs the Baton extension and preset with the pinned CLI and copies the curated Spec Kit files. It runs `git fetch --depth 1 <atv repo> <commit>`, verifies the commit and tree ids against the lock and copies the pack files (core into place, optional packs to `packs/<id>/files/`). It applies repairs, runs the closure and license checks, and writes `baton.lock.json` and `docs/reference/upstream-diff.md`. It preserves `.specify/memory/constitution.md`. | `--check` (exit 1 on any diff, no writes; also fails if the pinned ATV commit is unreachable), `--bump speckit=<v>\|atv=<sha>` (regenerates the hashed requirements with `uv pip compile --generate-hashes`) |
| `lock verify` | Checks that the sha256 of every locked file matches the working tree (offline, fast; used in CI). | |
| `build` | Bundles `src/` into `.baton/bin/baton.mjs` (esbuild), writes `.baton/bin/baton.mjs.sha256` and derives the bundled-package license inventory from the esbuild metafile (checked against `THIRD_PARTY_NOTICES.md`). | `--check` |

## Output conventions

- Human output uses one line per finding: `CODE path[:pointer] message → fix`.
- `--json` returns `{ ok, command, version, errors: [...], warnings: [...], data }`, and the shape is stable
  within a minor version.
- `--github` prints `::error file=…,title=CODE::message` lines.
- The CLI never makes network calls, except `update --to`, `sync` and `npx` bootstrap. This is documented in the
  manual.
