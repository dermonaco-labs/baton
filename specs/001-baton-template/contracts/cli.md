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
| `init` | Installs the `core` pack (plus the selected packs) into the cwd, merges the marker sections and writes the manifest. Idempotent. It never overwrites unmanaged or user-modified files. It writes conflicts to `.baton/conflicts/<path>.new` and prints a report. | `--packs a,b`, `--script sh\|ps\|py`, `--adopt-upstream <glob>`, `--keep <glob>`, `--repair` (fix known-corrupted ATV files), `--dry-run` |
| `update` | Moves to the version of the running CLI (or `--to`, which re-invokes the pinned `npx`). It updates managed, unmodified files and reports the rest. | `--to vX.Y.Z`, `--dry-run` |
| `doctor` | Reports the version, pins, packs, manifest integrity, prerequisites (node, git, bash/pwsh, uv), hook registration in `.specify/extensions.yml`, a misplaced `.github/copilot-setup-steps.yml`, corrupted agents and models that aren't allowed. Warnings only, unless `--strict`. | `--strict` |
| `validate` | Checks every baton, `phases.yml`, `config.yml`, the manifest, and skill/agent frontmatter. It also checks model enforcement and docs coverage (only when `docs/reference` exists). | `--changed` (only files changed vs `origin/HEAD`), `--path <file>` |
| `status` | Shows every feature and quick baton: phase, next, owner, status, gate and staleness. | |
| `handoff new` | Creates a baton for a feature dir (after specify) or a quick slug. | `--feature`, `--quick <slug>` |
| `handoff receive --phase P` | Runs the entry checks for P. It prints the `read_first` list, or stops (exit 3) with the reason. Called by the before_* hooks. | `--mode converge` |
| `handoff write --phase P` | Fills the deterministic fields, validates the exit criteria and prints what the agent must still fill. Called by the after_* hooks. | `--from-json <file>` (agent-supplied fields) |
| `handoff next` | Prints the next command and the suggested model (for example `/speckit-tasks · model role planning → claude-opus-5.5`). | |
| `handoff approve --by H` | Records the gate approval. | `--note` |
| `handoff answer ID "choice" --by H` | Resolves an open question into a decision. | |
| `handoff refresh --reason R` | Re-hashes the artifacts after an intentional edit and adds a decision entry. | |
| `handoff escalate` | Quick → feature lane. It creates `specs/NNN-slug/` from the quick baton. | |
| `handoff init --infer` | Builds a baton for a feature that started before Baton (`status: needs-human`). | |
| `handoff migrate` | Upgrades batons to the current schema version. | `--dry-run` |
| `models apply` | Writes `model:` into managed agent frontmatter from the role config (only when `apply_to_agents: true`, or with `--force`). Idempotent. | `--dry-run` |
| `adopt` | Runs the template cleanup locally (the same logic as `template-cleanup.yml`). | `--dry-run` |
| `uninstall` | Removes managed, unmodified files and the marker sections. It keeps `specs/`, `docs/brainstorms`, `docs/solutions` and the constitution. | `--dry-run` |

## Maintainer commands (only in the Baton repo; they refuse if `baton.lock.json` is absent)

| Command | Behaviour | Key flags |
|---|---|---|
| `sync` | Runs `uvx --from specify-cli==<pin> specify init --here --integration copilot --script sh --force --ignore-agent-tools` in a temp dir. It installs the Baton extension and preset with the pinned CLI and copies the curated Spec Kit files. It downloads the ATV tarball at the pinned commit, verifies `tarball_sha256` and copies the pack files. It applies repairs, runs the closure and license checks, and writes `baton.lock.json` and `docs/reference/upstream-diff.md`. It preserves `.specify/memory/constitution.md`. | `--check` (exit 1 on any diff, no writes), `--bump speckit=<v>\|atv=<sha>` |
| `lock verify` | Checks that the sha256 of every locked file matches the working tree (offline, fast; used in CI). | |
| `build` | Bundles `src/` into `.baton/bin/baton.mjs` (esbuild) and writes `.baton/bin/baton.mjs.sha256`. | `--check` |

## Output conventions

- Human output uses one line per finding: `CODE path[:pointer] message → fix`.
- `--json` returns `{ ok, command, version, errors: [...], warnings: [...], data }`, and the shape is stable
  within a minor version.
- `--github` prints `::error file=…,title=CODE::message` lines.
- The CLI never makes network calls, except `update --to`, `sync` and `npx` bootstrap. This is documented in the
  manual.
