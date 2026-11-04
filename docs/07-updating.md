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
Before using `--from`, verify the archive against the release's `SHA256SUMS`
obtained from the trusted release page; `--from` does not verify the archive
checksum itself.

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
node .baton/bin/baton.mjs sync --bump speckit=<x.y.z>
node .baton/bin/baton.mjs sync --bump atv=<commit-sha>
node .baton/bin/baton.mjs sync --bump atv=<x.y.z>
```

`atv=<commit-sha>` tracks ATV `main` (40-hex commit); `atv=<x.y.z>` tracks
the stable release tag `v<x.y.z>`. `sync` uses a temporary environment and
hash-locked `specify-cli` requirements; it fetches ATV by commit and
verifies the tree. It never executes ATV code. Pins live only in
`baton.lock.json`: a bump is one operation and `sync --check` must pass
immediately afterwards without editing source constants. An invalid pin or
failed bump exits non-zero and leaves the working tree unchanged. Inspect
`docs/reference/upstream-diff.md`, the lock and every changed vendored
file; review licenses, reference closure and repairs before submitting a
PR. Do not hand-edit vendored content. Run the configured local gate and
`lock verify`; release/tagging is a separate human-reviewed step. See
[troubleshooting](08-troubleshooting.md) for restricted registries.

## Maintainer: automated upgrade PRs

The weekly (and manually dispatched) `upstream-watch` workflow detects a
newer stable Spec Kit release and a newer ATV pin for the lock's tracked
ref (`main` commit or stable release). For each upstream it regenerates
the snapshot with `sync --bump` on the default-branch base, runs the full
`npm run check`, and opens or updates **one draft PR per upstream** on
`baton/upstream-upgrade/<upstream>`. It opens draft candidate PRs only;
it never merges, approves, tags, releases or pushes to the default branch.
Generation and validation run with a read-only token; a separate job
re-verifies the generated files against the detected pins before it
commits them, and runs no upstream or build tooling.

Repeated runs are idempotent: an unchanged candidate is not pushed again.
A branch with any human commit is never overwritten; the newer pin waits
in the tracking issue. Closing a candidate PR without merging suppresses
that pin until a newer one appears. A bot-only candidate made obsolete by
the default branch is closed with a comment; its branch is kept. Failed
generation or validation, link failures and blocked candidates are
reported in the single tracking issue titled **Upstream watch: releases
and verification** (label `upstream-bump`; find it with
`gh issue list --label upstream-bump`) with a run link, and the workflow
run fails. Keep that title and label: the workflow finds the issue by both
and opens a new one if either changes.

The ATV tracking policy is the lock's `ref` and is never switched by the
workflow. To move ATV between `main` and stable releases, run the
matching `sync --bump atv=…` yourself and edit the maintainer-owned ATV
`note` in `baton.lock.json` in the same PR; `sync` preserves the note
unchanged.

To review a candidate: read the PR's check summary, compare the pins and
upstream links, read every changed agent and skill prompt in full, review
licenses and `docs/reference/upstream-diff.md`, then mark the PR **Ready
for review** to start the standard PR checks. Merge and any release remain
manual, human decisions under the normal Baton gates.

The workflow drives `node src/maintainer/upstream-upgrade.mjs <stage>`
with these stages: `detect`, `package`, `publish` and `report`. Each stage
reads only environment variables set by the workflow. They share
`GITHUB_REPOSITORY`, `GITHUB_SERVER_URL`, `GITHUB_RUN_ID`, `GITHUB_REF` and
`PREVIEW`. `detect` also reads the sync-check and link-check results
(`SYNC_*`, `LINKS_*`) and emits the `PLAN` JSON that the later stages
read. `package` reads `UPSTREAM`, `CANDIDATE_DIR` and the bump and check
step outcomes and logs (`BUMP_*`, `CHECK_*`), and receives no token.
`publish` and `report` read each upstream's downloaded artifact from
`ARTIFACTS_DIR/<upstream>`. `publish` also requires `DIGEST_SPECKIT` and
`DIGEST_ATV`, the digests attested by the generate job, and rejects a
candidate whose verified digest differs. `report` also reads `RESULTS`
and the job results. `detect` gets a read-only `GITHUB_TOKEN`; only
`publish` (contents and pull requests) and `report` (issues) get write
permissions.

Dispatch with `preview: true` to detect, generate and validate without
any branch, PR or issue write; results appear in the run summary. Runs on
a non-default ref behave the same way. Opening PRs requires the owner to
enable **Allow GitHub Actions to create and approve pull requests**
(repository Settings → Actions → General); without it the run reports
`E_PR_PERMISSION` in the tracking issue. The workflow never approves PRs.

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
The existing Linux `baton.yml` and Windows smoke workflow remain the PR
backstops; separate Linux, macOS and Windows smoke jobs run for a release
candidate. Source-only jobs are guarded so adopters do not run them.
