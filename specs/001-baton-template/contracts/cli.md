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
| 3 | stopped: `needs-human` (a blocking question, pending gate or `E_SELF_REVIEW`) |
| 4 | conflicts left unresolved (`init`/`update` wrote `.baton/conflicts/`) |
| 5 | environment/prerequisite missing (for example `uv` for `--script ps` or for `sync`) |
| 10 | internal error (bug; prints the stack with `--debug`) |

## Adopter commands

| Command | Behaviour | Key flags |
|---|---|---|
| `init` | Installs the `core` pack (plus the selected packs, read from `packs/<id>/files/`) into the cwd, merges the marker sections, installs `.github/workflows/baton.yml` and writes the manifest, including the selected script flavour. Idempotent. It never overwrites unmanaged or user-modified files. It writes conflicts to `.baton/conflicts/<path>.new` and prints a report. In a derived repo (no `packs/` dir), `--packs` with an optional pack exits 5 and prints the pinned `npx --yes github:dermonaco-labs/baton#vX.Y.Z init --packs …` command. | `--packs a,b`, `--script sh\|ps\|py`, `--adopt-upstream <glob>`, `--keep <glob>`, `--repair` (fix known-corrupted ATV files), `--dry-run` |
| `update` | Moves to the version of the running CLI (or `--to`, which re-invokes the pinned `npx`). It preserves adopter hooks and merged sections, protects the adopter constitution, and retains the installed script flavour when restaging. It updates managed, unmodified files and reports the rest. The standalone asset resolves its payload with `--from`. | `--to vX.Y.Z`, `--dry-run`, `--from <baton-template-vX.tar.gz>` |
| `doctor` | Reports the version, pins, packs, manifest integrity, prerequisites (node, git, bash/pwsh, uv), hook registration in `.specify/extensions.yml`, a misplaced `.github/copilot-setup-steps.yml`, corrupted agents and models that aren't allowed. Warnings only, unless `--strict`. | `--strict` |
| `validate` | Checks every baton, `phases.yml`, `config.yml`, the manifest, `packs/*.yml` (when present), `review.json` files, and skill/agent frontmatter. It also checks model enforcement and docs coverage (only when `docs/reference` exists). | `--changed` (only files changed vs `origin/HEAD`), `--path <file>` |
| `status` | Shows every feature and quick baton: phase, next, owner, status, gate and staleness. | |
| `handoff new` | Creates a baton for a feature dir (after specify) or starts a quick lane: `--quick <slug> --reason R` writes `.baton/quick/<slug>.md` with `phase_completed: none`, `next_phase: work`, a `quick-eligible` decision and the current commit as the review diff base. | `--feature`, `--quick <slug>`, `--reason` |
| `handoff show [--feature F \| --quick S]` | Prints the current baton (frontmatter summary, `read_first`, open questions, gate) without running checks. | `--json` |
| `handoff scope [--feature F \| --quick S]` | Prints the reachable recorded review diff base and the sorted changed-file set (excluding Baton bookkeeping and feature artifacts) for review to compare against ce-review output. Fails closed without a usable recorded base. | `--json` |
| `handoff receive --phase P` | Runs the entry checks for P. First-phase `specify` may receive before a feature baton or even the `specs/` directory exists. It prints the `read_first` list, or stops (exit 3) with the reason. Called by the before_* hooks (and by the `baton` skill around `ce-work`). | `--mode converge`, `--quick <slug>` (quick baton; otherwise the feature is inferred from the branch or `--feature`) |
| `handoff write --phase P` | Fills deterministic fields and validates exit criteria. A first `specify` write creates the baton; all writes enforce pending gates and blocking questions. Review writes derive the blocking count from the validated findings file and route back to implement/work when needed. The writer is recorded as the CLI actor (`--by`, default `baton`), not the configured phase owner. Review and land refuse the implement/work writer's checkout unless the owner answered a tagged override question for that implement/work cycle. `--dry-run` is rejected rather than silently writing. | `--from-json <file>` (agent-supplied fields), `--by <agent-id>`, `--next <phase>`, `--from-brainstorm <path>` / `--from-quick <quick baton>`, `--quick <slug>`, `--analysis-from <file>` (with `--phase analyze`) |
| `handoff next` | Prints the next command and suggested model, with `blocked`, gate state and blocking question IDs. When blocked, it tells the agent to approve or answer. After implement/work, it directs the writer to end the session and start an independent review checkout. | |
| `handoff question` | Records a blocking, owner-answerable question even while implementation acceptance evidence is unmet. `--check AC-... --reason R` requests a check-specific waiver; `--tag self-review-override --reason R` requests an independent-review exception at review/land. No waiver or override is effective until `handoff answer` records the authorized role's decision. | `--check <id>` or `--tag self-review-override`, `--reason` |
| `handoff revoke-waivers` | Removes only acceptance-waiver decisions whose saved hash differs from the current checkbox-normalized tasks.md hash; records the revoked IDs and audit reason. Re-request any still-needed waivers using `question` and `answer`. | `--reason` |
| `handoff redact` | Replaces exact text in the handoff body without editing CLI-owned frontmatter, validates the body and records a reasoned decision. | `--find`, `--replace`, `--reason` |
| `handoff approve --by "<role>"` | Records the gate approval: `approved_by` = `<role>` or `<role> via <channel>`, `approved_at` = today (full-date). Role and channel must be in `config.gates`; names, handles and emails are rejected (`E_APPROVER_FORMAT`). | `--via "<channel>"`, `--at <date>`, `--note` |
| `handoff answer ID "choice" --by "<role>"` | Resolves an open question into a decision. A `Waive AC-...` answer records the checkbox-normalized tasks.md hash; an `Allow self-review` answer records the tagged exception. | |
| `handoff refresh --reason R` | Re-hashes the artifacts after an intentional edit and adds a decision entry. | |
| `handoff escalate --quick <slug>` | Quick → feature lane. It sets the quick baton to `next_phase: specify` with the reason and prints `/speckit-specify` with the quick baton as input. It never creates feature dirs (Spec Kit owns numbering). | `--reason` |
| `handoff init --infer` | Builds a baton for a feature that started before Baton (`status: needs-human`). | |
| `handoff migrate` | Upgrades batons to the current schema version. | `--dry-run` |
| `models apply` | Writes `model:` into managed agent frontmatter from the role config (only when `apply_to_agents: true`, or with `--force`). Idempotent. | `--dry-run` |
| `adopt` | Runs the template cleanup (plan.md "Template disposition"). It refuses to run in the Baton source repo (`GITHUB_REPOSITORY` or the `origin` remote is `dermonaco-labs/baton`; `baton.lock.json` alone is not a signal, because a fresh derived repo still has it) unless `BATON_FORCE_CLEANUP=1`. The `template-cleanup.yml` workflow calls `adopt --no-workflows`, because `GITHUB_TOKEN` cannot change `.github/workflows/`. | `--dry-run`, `--no-workflows`, `--prune-workflows` (deletes the dormant maintainer workflows; run locally) |
| `uninstall` | Removes managed, unmodified files and the marker sections. It keeps `specs/`, `docs/brainstorms`, `docs/solutions` and the constitution. | `--dry-run` |

Relay writes, approvals and answers append a history entry with the actual actor and the SHA-256 of a random checkout-local token. The token lives in gitignored `.baton/.local/session.json`; only its hash enters the baton. The token distinguishes worktrees, not people, and must never be copied between checkouts.
Implement/work writes also record an absolute-worktree-path hash. A missing or rotated token in the same worktree
does not permit self-review; an owner override applies only to its recorded implement/work cycle and expires
after the next write. This is a process guard against accidental self-review, **not a security boundary**:
someone who can edit the baton or claim an owner role locally can bypass it.

When writing the implement → review handoff, the `tasks-all-checked-or-deferred` exit check treats only the
explicitly marked `baton handoff write --phase implement` task as satisfied by that write. Other unchecked,
non-deferred tasks still fail the check; see [phase-contracts.md](phase-contracts.md).

## Maintainer commands (only in the Baton repo; they refuse if `baton.lock.json` is absent)

| Command | Behaviour | Key flags |
|---|---|---|
| `sync` | Creates a temp venv and runs `uv pip install --require-hashes -r baton/upstream/specify-cli.requirements.txt`, then `specify init --here --integration copilot --script sh --force --ignore-agent-tools` in a temp dir. It installs the Baton extension and preset with the pinned CLI and copies the curated Spec Kit files. It runs `git fetch --depth 1 <atv repo> <commit>`, verifies the commit and tree ids against the lock and copies the pack files (core into place, optional packs to `packs/<id>/files/`). It applies repairs, runs the closure and license checks, and writes `baton.lock.json` and `docs/reference/upstream-diff.md`. It preserves `.specify/memory/constitution.md`. | `--check` (exit 1 on any diff, no writes; also fails if the pinned ATV commit is unreachable), `--bump speckit=<v>\|atv=<sha>` (regenerates the hashed requirements with `uv pip compile --generate-hashes`) |
| `lock verify` | Checks that the sha256 of every locked file matches the working tree (offline, fast; used in CI). Invalid lock JSON is reported as `E_LOCK_MISMATCH` (exit 1), not an internal error. | |
| `build` | Bundles `src/` into `.baton/bin/baton.mjs` (esbuild), writes `.baton/bin/baton.mjs.sha256` and derives the bundled-package license inventory from the esbuild metafile (checked against `THIRD_PARTY_NOTICES.md`). | `--check` |

## Output conventions

- Human output uses one line per finding: `CODE path[:pointer] message → fix`.
- `--json` returns `{ ok, command, version, errors: [...], warnings: [...], data }`, and the shape is stable
  within a minor version.
- `--github` prints `::error file=…,title=CODE::message` lines.
- The CLI never makes network calls, except `init --script ps|py` (hash-locked `uv` regeneration),
  `update --to`, `sync` and `npx` bootstrap. This is documented in the
  manual.
