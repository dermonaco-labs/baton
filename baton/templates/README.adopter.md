# Your project, with Baton

Start by running `/speckit-constitution` to replace Spec Kit's
placeholder constitution with your project's principles. Then use
`/baton` to see the current phase, or `/speckit-specify` to begin a
feature. For a small change with no new behavior or public contract,
`/baton` can start the quick lane.

The [Baton manual](docs/baton/README.md) explains the relay, human
gates, local checks, packs, updates and troubleshooting. The
`baton.yml` workflow checks handoffs on pull requests even when local
hooks are skipped.

Your own code may have a different license. Keep `LICENSE` and
`THIRD_PARTY_NOTICES.md` alongside the vendored and Baton-authored
materials to preserve their notices. If template cleanup did not
finish, run `node .baton/bin/baton.mjs adopt` locally; optionally run
`adopt --prune-workflows` to remove dormant maintainer workflows.
