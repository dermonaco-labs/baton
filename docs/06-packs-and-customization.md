# Packs and customization

`core` is always installed and contains 28 skill and agent files: Spec Kit
phase owners, Baton receive/handoff/review/land wrappers, ATV's brainstorm,
work, review, land and compound skills, plus review and research agents.
Support files (schemas, extension, preset, workflow, CLI) do not count toward
that file count. Optional packs resolve their `requires` closure; `core`
cannot be removed.

| Pack | Purpose |
|---|---|
| `review-plus` | Additional review personas and compound enhancement agents |
| `learning` | Opt-in observation, learning, instincts and evolution hooks |
| `docs-review` | Advisory document review and refresh; not the code-review gate |
| `security` | Deeper security skill and sentinel agent |
| `research` | Specialized research agents |
| `issues` | Tasks-to-issues skill; needs GitHub access |
| `stack-python` | Python reviewer |
| `stack-typescript` | TypeScript and frontend race reviewers |
| `stack-rails` | Rails reviewers |
| `design` | Frontend design, sync and iteration |
| `token-budget` | Guarded draft compaction/restore, relay-safe scope, session-only concise and usage estimates |
| `optimize` | Report-only governance audits, token overhead and session-learning proposals |

Preview `init --packs core,learning --dry-run` and then install. Adding a
pack in a derived repo requires a pinned `npx` source payload because
template cleanup removed `packs/`:

```sh
npx --yes github:dermonaco-labs/baton#v0.1.1 init --packs core,learning
```

Before a release tag exists, use a reviewed commit or branch ref.
`W_PACK_RECOMMENDED` means an installed pack mentions an optional
enhancement from another pack. It is advisory (even with `doctor --strict`)
and never auto-installs anything. `learning` captures local observations:
review generated learned skills before committing them.

## Context Optimization Packs

Select `--packs token-budget`, `--packs optimize`, or
`--packs token-budget,optimize` explicitly using a reviewed source payload.
Neither is part of core. The first release containing these packs has not
been cut; do not assume an older release tag includes them.

Token-budget pins `tinesoft/spec-kit-token-budget` v1.1.0 at
`11c5589f347ddb3789b51b09927ef825c88e3f19`. Optimize pins
`sakitA/spec-kit-optimize` v1.0.0 at
`d6dba6ae93bf60322deee3bdc4ffcf127e42b2b9`. Both are MIT; source commits,
trees and byte checksums are recorded in `baton.lock.json`. Upstream files
install unchanged under `.baton/vendor/<id>/` as inactive references,
including their licenses. Upstream extension manifests are not registered
and their mutating helpers must not be executed against live files.

The public token-budget skills are `/speckit-token-budget-compact`,
`/speckit-token-budget-restore`, `/speckit-token-budget-scope`,
`/speckit-token-budget-concise` and `/speckit-token-budget-usage`.
Compact/restore default to non-mutating previews. Explicit apply uses the
guarded Node writer with a selected feature/target and expected raw digest.
Only draft SDD artifacts before approval **and** hash binding are eligible.
An unapproved but already hashed artifact is protected.

The same protections and exclusions cover `.full.md` backups: a backup bound
by any feature or quick baton cannot be created, consumed or deleted by these
commands. Previews report missing restore backups, existing compact backups
and invalid supplied candidates before apply.

Restore previews show the backup's raw digest and an overwrite warning.
`--expect` binds the current target, not backup provenance: restore explicitly
replaces that target with the selected sibling backup and then removes the
backup. Review both files first; later target edits are not preserved, and an
arbitrary sibling backup is not authenticated as a prior compaction result.
The backup digest is informational and is not an expected-backup reservation
across separate preview/apply calls. Re-preview and inspect the backup before
an explicit restore; the writer checks the backup it reads during apply
against its in-operation snapshot. Arbitrary external filesystem writers
remain outside the supported-workflow boundary.

A compact preview without a candidate checks draft eligibility. `allowed`
does not waive the required candidate and expected target digest for apply;
supplied candidates are checked during preview.
Candidate paths must be repository-relative, such as `.baton/.tmp/candidate.md`,
not absolute paths or drive-letter paths. Protection metadata with unsafe
Windows trailing-dot, trailing-space or short-name spellings fails closed
and identifies the declaring handoff, manifest or lock.

Approved or historically approved sources, managed files, source-of-truth
bindings and all `read_first` targets (even without a checksum) refuse
in-place compact/restore. Missing or malformed protection metadata and
unsafe/aliased paths fail closed. No approvals are cleared, hashes refreshed,
instructions injected, or automatic compaction hooks installed. Compact
before the first handoff binds the draft; never compact an approved artifact
and then reapprove merely to silence a stale binding.

Constitution, AGENTS.md, CLAUDE.md, other agent instructions and Baton/SPECKIT
sections are never compaction targets. Concise applies only to the current
session. Scope cannot replace, reorder or shrink the baton's required context
and must honor exclusions. Scope/usage include nested contract Markdown but
do not follow linked trees. Usage estimates use characters divided by four,
not provider billing. Output slimming is explicitly requested conversational
summarization only, never automatic filtering of checks, stderr, required
evidence or command failure status.

Optimize exposes `/speckit-optimize-run`, `/speckit-optimize-tokens` and
`/speckit-optimize-learn`, always report-only. The pin has no `check` command.
There is no optimize apply operation or automatic memory persistence.
Proposed amendments go through `/speckit-constitution`. Mandatory human gates,
`.baton/phases.yml`, built-in phase defaults, scanner rules and approval
semantics cannot be removed as redundant overhead.

See [CLI syntax](reference/cli.md#guarded-context-operations) for writer
arguments. Guards protect the supported workflow, not an arbitrary process
with filesystem write access. Semantic preservation still needs author review.
Removal uses the existing whole-install uninstall policy, not a new
per-pack removal command.

## Project settings

Edit `.baton/config.yml` to choose packs, model roles, approved role/channel
vocabulary and `checks` commands. `/baton-land` runs the configured checks
before push; in this repository `npm run check` is the local gate. Keep
personal terms in an **untracked** denylist file configured through
`denylist.terms_file` or `BATON_DENYLIST_FILE`. Never commit that file.
The default email, mention and home-path rules skip backtick-delimited
spans in Markdown, JavaScript and YAML, as well as Markdown fenced
examples; identities there can escape those checks. Review
published code examples manually rather than treating the denylist as a
complete privacy filter.

Each check may set `timeout_ms` to a finite integer from 1 to 3,600,000;
omitting it keeps the 300,000 ms default. The source suite uses 600,000 ms
because its measured passing Windows test stage exceeds five minutes.
Timeouts remain failed checks, with captured output and PID/process-group
cleanup of foreground command trees. Commands must not daemonize or reparent
background work. Failed exit codes and cleanup errors are never success.

`.baton/phases.yml` can override entry, exit, next and gate rules. Overrides
are schema-checked; removing a built-in exit check (including by moving it
inside `any_of`) warns `W_WEAKENED_CONTRACT`. Treat that as a contract
change requiring review, not as a way to force a baton through. Groups
support `all_of` and `any_of`; compound accepts a solution in
`docs/solutions/` **or** a reasoned `skip-compound` decision.

Maintainers add packs in `packs/<id>.yml`, with payloads mirrored under
`packs/<id>/files/`; `sync` checks each pack's references against itself,
its dependencies and declared `optional_refs` reasons. Missing or stale
references fail `E_DANGLING_REF`. Vendored upstream prompts are not edited;
custom behavior belongs in Baton-owned skills, the append-only Spec Kit
preset or a separate extension. Mandatory phase hooks are registered in
`.specify/extensions.yml`; the `learning` pack's Copilot lifecycle hooks
are separate `.github/hooks/` files. See [workflow conflict
rules](03-workflow.md) and [updating](07-updating.md).
