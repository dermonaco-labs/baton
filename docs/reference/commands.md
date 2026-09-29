# Command reference

Run `node .baton/bin/baton.mjs <command>` in the repository root. In a
derived repository the manual is at `docs/baton/reference/`. The CLI reports
errors as `CODE path message → fix`; see [error codes](error-codes.md).
The commands below are CLI commands, not slash skills. Maintainer commands
require the source repository's lockfile; do not run `sync` in an adopter repo.

## Adopter commands

### `init`

When to use: overlay Baton on an existing repository, select optional packs,
or preview an installation with `--dry-run`. Hands off to: `doctor`, then
`/baton` to start the relay. Key options: `--packs a,b`, `--script sh|ps|py`,
`--adopt-upstream`, `--keep`, `--repair`.
Installed-file ownership hashes normalize CRLF to LF for valid UTF-8
text while keeping binary files byte-exact. The same rule applies to
`init`, `update`, `uninstall`, `doctor`, `adopt`, `manifest` and
`models apply`; it does not weaken the raw-byte `lock verify` or bundle
SHA-256 checks.

### `update`

When to use: update managed, unmodified installation files to the running
version, using `--dry-run` first. Hands off to: inspect `.baton/conflicts/`,
then `doctor` and `validate`. `--to vX.Y.Z` selects a pinned release;
standalone assets use `--from`.

### `doctor`

When to use: inspect installation, prerequisites, hooks, model choices and
recommended packs. Hands off to: fix reported prerequisites or run `validate`.
`--strict` raises most warnings, but not `W_PACK_RECOMMENDED`.

### `validate`

When to use: check handoffs, schemas, frontmatter, model policy, optional
packs, and reference coverage before handing work over. Hands off to: fix
the reported code using [error codes](error-codes.md), then rerun the phase
receive/write command. `--path <file>` targets an artifact; `--changed`
limits file scanning to the merge-base diff. Full validation checks docs
coverage when the reference catalog is present.

### `status`

When to use: survey feature and quick batons and their pending gates. Hands
off to: `handoff next` or `/baton`.

### `handoff`

When to use: create, receive, inspect, update or resolve a phase baton. Hands
off to: the phase owner shown by `handoff next`, or a human gate when status
is `needs-human`. See [CLI](cli.md) for the actions.

### `models`

When to use: opt into writing configured model roles into managed agent
frontmatter (`models apply --dry-run`, then `models apply`). Hands off to:
`validate` to check the allowed-model policy. Nothing is rewritten unless
`apply_to_agents` is enabled or `--force` is passed.

### `adopt`

When to use: personalize a repository made with **Use this template**;
template cleanup invokes `adopt --no-workflows`. Hands off to: locally
review workflow disposition, run `doctor`, then `/baton`. `--dry-run` previews
changes; `--prune-workflows` is a local-only cleanup option.

### `uninstall`

When to use: remove managed, unmodified files and Baton marker sections
without deleting specifications, solutions or the constitution. Hands off to:
review preserved user files and conflicts. Preview with `--dry-run`.

## Maintainer commands

### `sync`

When to use: **maintainers only**, materialize pinned upstream snapshots
and lockfile provenance. Hands off to: `sync --check`, `lock verify`, and
`build --check`; `--bump` deliberately advances a pin.

### `lock`

When to use: **maintainers only**, run `lock verify` for offline verification
of each pinned file against the working tree. Hands off to: `sync --check`
or repair a mismatched pinned snapshot rather than editing vendored files.

### `build`

When to use: **maintainers only**, bundle the Node CLI and calculate package
license inventory. Hands off to: `build --check` in local checks or CI.

### `manifest`

When to use: **maintainers only**, regenerate the installation manifest
from the lock and current managed files. Hands off to: `validate` and
`lock verify`; avoid hand-editing managed entries.
