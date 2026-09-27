# Quickstart

Node.js 20 or newer is required. The committed `.baton/bin/baton.mjs` runs
without installing npm dependencies. For shell-based Spec Kit scripts use a
POSIX shell (Linux, macOS, WSL or Git Bash); see [Windows
options](08-troubleshooting.md).

## Use the template

1. Select **Use this template** on the [Baton repository](https://github.com/dermonaco-labs/baton)
   and create your repository. The template-cleanup workflow replaces Baton's
   own README and constitution, relocates this manual to `docs/baton/`, and
   removes maintainer sources. If its push is blocked, run
   `node .baton/bin/baton.mjs adopt` locally; see [troubleshooting](08-troubleshooting.md).
2. Run `/speckit-constitution` to replace the placeholder with your project's
   actual principles.
3. Run `node .baton/bin/baton.mjs doctor` and
   `node .baton/bin/baton.mjs validate`. The shipped `baton.yml` workflow also
   validates PRs when local hooks are skipped.
4. Run `/baton` to inspect the next phase, then `/speckit-specify` for a
   feature. At the scope gate approve by **role**, for example:

   ```sh
   node .baton/bin/baton.mjs handoff approve --by "repository owner" --via "direct approval"
   ```

## Overlay an existing repository

From the target repository, install the pinned Baton snapshot:

```sh
npx --yes github:dermonaco-labs/baton#v0.1.0 init --dry-run
npx --yes github:dermonaco-labs/baton#v0.1.0 init
node .baton/bin/baton.mjs doctor
node .baton/bin/baton.mjs validate
```

The versioned `npx` command needs a network connection for bootstrap; the
installed CLI is offline for ordinary validation and handoffs. Before a
release tag exists, use a reviewed commit or branch ref instead of `v0.1.0`.
The dry run lists changes without writing. `init` installs `core`, merges
only Baton-owned marker sections, preserves unmanaged and changed files, and
writes `.baton/manifest.json`. Exit 4 means unresolved conflicts; see
[updating](07-updating.md). To opt into another pack from the source payload,
use `init --packs core,learning`. A derived repo lacks the optional payload:
use the pinned `npx` command when adding packs.

## First feature

Run `/speckit-specify`, then `/speckit-clarify` when questions remain.
Approve the scope gate after clarify (or after specify when clarify is
skipped). Continue with `/speckit-plan`, `/speckit-tasks` and
`/speckit-analyze`; approve the pre-code gate before `/speckit-implement`.
Then run `/baton-review` (headless review grounded in the spec and tasks) and
`/baton-land` to open, **not merge**, the PR. `/ce-compound` can record a
reusable solution afterward. At any point run:

```sh
node .baton/bin/baton.mjs status
node .baton/bin/baton.mjs handoff next
node .baton/bin/baton.mjs validate
```

The before-phase hook reads **only** the ordered `read_first` paths; a pending
gate or blocking question stops it (exit 3). See [workflow](03-workflow.md)
and [handoffs](04-handoffs.md).
