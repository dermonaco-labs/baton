# Updating Baton

## Adopter: update the installed snapshot

Preview first, then run from the repository that has `.baton/manifest.json`:

```sh
node .baton/bin/baton.mjs update --dry-run
node .baton/bin/baton.mjs update
node .baton/bin/baton.mjs doctor
node .baton/bin/baton.mjs validate
```

`update` uses the version of the running CLI. To target a published release,
`update --to vX.Y.Z` invokes a pinned `npx` process and needs network access.
A standalone `baton.mjs` asset does not contain its payload: supply
`--from <baton-template-vX.tar.gz>` or use the package-based CLI. Missing
payloads exit 5 with guidance.

The manifest tracks managed files, their hashes and marker sections. Only
managed, unmodified files update automatically; modified or unmanaged files
remain untouched and get `.baton/conflicts/<path>.new` plus a report (exit
4). Compare each `.new` with your copy, decide whether to keep local work
or deliberately accept the new content, and rerun validation. `init` also
supports `--keep <glob>` and `--adopt-upstream <glob>` to resolve known
conflicts; don't use an acceptance flag without inspecting the diff.
`init --repair` addresses known corrupted ATV agent frontmatter in an
existing install. The installed constitution, feature specs and local
brainstorms/solutions are adopter-owned, not update targets.

To remove an install, preview
`node .baton/bin/baton.mjs uninstall --dry-run`, then run `uninstall`.
Only managed, unmodified files and Baton marker sections are removed.
User-modified files, `specs/`, `docs/brainstorms/`, `docs/solutions/` and
`.specify/memory/constitution.md` remain.

## Maintainer: bump pinned upstreams

In the Baton source repository, `baton.lock.json` records Spec Kit's
version, hash-locked Python requirements and commit, ATV's commit/tree,
and per-file hashes, provenance and licenses. Use
`node .baton/bin/baton.mjs sync --check` to reproduce the current snapshot
without writes (requires `uv`, reachable package and git sources).

For a deliberate bump, run one of:

```sh
node .baton/bin/baton.mjs sync --bump speckit=<version>
node .baton/bin/baton.mjs sync --bump atv=<commit-sha>
```

`sync` uses a temporary environment and hash-locked `specify-cli`
requirements; it fetches ATV by commit and verifies the tree. It never
executes ATV code. Inspect `docs/reference/upstream-diff.md`, the lock and
every changed vendored file; review licenses, reference closure and repairs
before submitting a PR. A bump changes lock pins, but the current sync
implementation also checks vetted constants in `src/lib/upstream.mjs`; the
maintainer must review and update those constants for the new pins before
the next `sync --check` can succeed. Do not hand-edit vendored content.
Run the configured local gate and `lock verify`; release/tagging is a
separate human-reviewed step. The weekly `upstream-watch` workflow reports
new upstreams and `sync --check` drift in one tracking issue; it **does not
push, open a PR or bump anything**. See [troubleshooting](08-troubleshooting.md)
for restricted registries.

## Maintainer: prepare a release

The owner cuts the tag only after review and land. Update the
`CHANGELOG.md` version section and its **Upstream** subsection, run
`npm run check` and `baton sync --check`, then manually dispatch
`release.yml` with `dry_run: true`. Its dry run builds the CLI, template
archive, lockfile, checksums, notes, and attestations without creating
a tag or GitHub release. Verify the downloaded assets before the owner
pushes `vX.Y.Z`; only that matching tag invokes the publication step.
No workflow publishes to npm.

`ci.yml` and `smoke.yml` are tag/manual-only to conserve runner minutes.
The existing `baton.yml` and Windows smoke workflow remain the PR
backstops; the manual CI and smoke runs are available for a release
candidate. Source-only jobs are guarded so adopters do not run them.
