# CLI syntax

Use `node .baton/bin/baton.mjs [--cwd DIR] [--json|--github] [--quiet]
[--no-color] <command> [options]` (Node.js ≥ 20). `--help` and `--version`
are global. JSON output contains `ok`, `command`, `version`, `errors`,
`warnings` and `data`; `--github` prints workflow annotations.

| Exit | Meaning | Next action |
|---|---|---|
| 0 | Succeeded | Continue to the next phase |
| 1 | Validation failed | Fix reported codes and retry |
| 2 | Invalid usage | Check flags with `--help` |
| 3 | Human gate or blocking question | Obtain a role-based approval/answer |
| 4 | Preserved conflicts | Inspect `.baton/conflicts/` |
| 5 | Missing prerequisite | Install the reported tool or use a pinned payload |
| 10 | Internal failure | Reproduce with `--debug` and report it |

## Handoff actions

| Action | When to use | Hands off to |
|---|---|---|
| `handoff new --feature NNN-slug` | Initialize after a specification exists | `speckit-clarify` |
| `handoff new --quick slug --reason R` | Start contract-neutral quick work | `ce-work` |
| `handoff show [--feature F \| --quick S]` | Inspect a baton without changing it | Current owner |
| `handoff receive --phase P [--quick S]` | Check phase entry and print `read_first` | Phase owner, or human on exit 3 |
| `handoff write --phase P [--next P]` | Check exits, record phase result | `handoff next` |
| `handoff next` | Route role and next command | Named next owner |
| `handoff approve --by "role" [--via "channel"]` | Record a human gate, no personal names | `handoff receive` |
| `handoff answer ID "choice" --by "role"` | Resolve an open question | `handoff receive` |
| `handoff refresh --reason R` | Rehash intentional artifact changes | `validate` |
| `handoff escalate --quick slug --reason R` | Exit quick lane when scope changes | `speckit-specify` |
| `handoff init --feature F --infer [--phase implement --reason R --from-json file]` | Infer a pre-existing feature, or explicitly attach existing sources at implement | Human confirmation, or fresh role approval then implement receive |
| `handoff migrate [--dry-run]` | Upgrade older baton schemas | `validate` |

Explicit implement attachment requires a resolvable merge-base with
`origin/HEAD`, otherwise `E_CHECK_FAILED` prevents creation. Review covers
the full main → feature delivery, not just post-attachment changes.
`x-imported-head` is imported-baseline context, not prior review approval;
no settled history is relabelled or re-receipted.
Receive and scope verify imported-commit ancestry and recompute the pinned
merge-base from `x-imported-head` and `origin/HEAD` (`E_CHECK_FAILED` if
unverifiable). Offline validation rejects any shadowing `diff-base`.
Initial `approve` binds source hashes and imported HEAD in an `attach-approved`
human-role decision; refresh clears it and requires reapproval. Batons and
gates are declarative plaintext, not cryptographic proof of authenticity:
git history and PR review remain the trust boundary.

`handoff write --phase analyze --analysis-from <file>` persists the analysis
report; `--from-brainstorm <path>` and `--from-quick <path>` apply when
writing a specification handoff. `--from-json <file>` supplies phase evidence.
Receive uses `--mode converge` for a converge re-entry. Use the documented
role vocabulary in `.baton/config.yml` for approval and answers.
Review uses a random identity in each worktree's git directory, not the
checkout's absolute path: a fresh clone at the same path can review, while
deleting `.baton/.local/session.json` or running `git clean -xfd` in the
implementing worktree cannot bypass the guard.

## Guarded Context Operations

These commands require the explicitly installed optional pack and support the
normal `--json` envelope. Human-readable reports show the same data.

```text
context compact --feature ID --target PATH [--candidate PATH] [--expect RAW_SHA256] [--apply]
context restore --feature ID --target PATH [--expect RAW_SHA256] [--apply]
context scope --feature ID
context concise [on|off]
context usage --feature ID
context optimize run|tokens|learn
```

Token-budget provides compact/restore/scope/concise/usage; optimize provides
the three report-only audit operations. No `check` or optimize apply command
exists. Unsupported and duplicate options are rejected.

Compact/restore default to preview with `allowed`, protection `reasons` and the
target's raw `sha256`; no backup or target is written. Applying compact needs
`--candidate`, `--expect` and `--apply`; applying restore needs `--expect` and
an existing `.full.md` backup. The expected digest is the exact current target
hash from the preview, not its normalized handoff hash.

Only existing draft SDD Markdown within the explicit numbered feature is
writable: spec, plan, tasks, research, data-model, quickstart and contract
Markdown. Approved/historically approved, hashed, managed, source-of-truth or
any `read_first` targets refuse mutation with `E_CONTEXT_PROTECTED` (exit 1).
Invalid protection metadata and unsafe linked/aliased paths also fail closed.
Constitution, instruction files, handoffs, scanner rules and gate configuration
are never targets. Detected stale content or a conflicting backup fails with
`E_CONFLICT` (exit 4); the existing backup is never overwritten.

Scope returns ordered `read_first` and `do_not_read` unchanged. Concise only
returns session-style guidance, never persisted instructions. Usage and
optimize reports label their estimates as character-based approximations.
Optimize supplies context for the skills' audits; proposed changes are not
applied. Use `/speckit-constitution` for reviewed governance amendments.
No context operation automatically writes reports or learned memories.

## Other commands

For per-command behaviour and switches, see [commands](commands.md).
Adopter commands are `init`, `update`, `doctor`, `validate`, `status`,
`models apply`, `adopt` and `uninstall`. `sync`, `lock verify`, `build` and
`manifest` are maintainer commands. `--path` and `--changed` restrict
validation; full validation includes docs coverage when reference pages
exist. A derived repository can add optional packs from a pinned version
using `npx --yes github:dermonaco-labs/baton#vX.Y.Z init --packs <id>`.
