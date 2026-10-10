# Changelog

All notable changes to Baton are documented here. This follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Keep formal local checks bounded with a per-check timeout, retaining the
  five-minute default and using ten minutes for the source suite on Windows;
  report timeout output and terminate the timed-out foreground process tree.
- Regenerate Baton-owned hook skills with explicit source provenance while
  retaining pinned upstream verification; check snapshot and source-manifest
  freshness in the normal local/PR gate.
- Install the same pinned `uv` prerequisite in all three OS smoke jobs,
  preserving the unconditional live PowerShell-script installation check.

## [0.1.2] - 2026-10-10

### Fixed

- Compare headless CE review coverage with the exact pinned tracked diff,
  while requiring coverage of every CLI subject file. Changed feature
  artifacts and Baton bookkeeping no longer cause false scope mismatches;
  untracked subjects must be staged before review.
- Redirect mandatory upstream landing session notes outside the repository.
  Publish the CLI land receipt before a final clean-tree and exact remote-head
  check, instead of leaving late notes or receipts dirty or unpushed.

### Upstream

- Baton extension and preset component versions remain `0.1.0`; the CLI and
  package patch version is `0.1.2`. Vendored upstream bytes are unchanged.
- Spec Kit `specify-cli` 1.0.11 at commit `8147943512404afb9d99c6252cb9bf84369fd0b0` (unchanged).
- ATV Starter Kit `main` at commit `ad996736b879be87c7755df5c5017d5336203bbc` (unchanged).

## [0.1.1] - 2026-10-10

### Fixed

- Validate phase handoffs only at `specs/<feature>/handoff.md` and
  `.baton/quick/<slug>.md`, so `validate --changed` and `--path` no longer
  misclassify command documentation or handoff templates as phase batons.
  Malformed canonical handoffs remain rejected in all validation modes;
  noncanonical handoff documents retain their frontmatter/body personal-data
  and configured denylist checks without receiving baton-schema validation.

### Upstream

- Baton extension and preset component versions remain `0.1.0` because their
  content is unchanged; the CLI and package patch release is `0.1.1`.
- Spec Kit `specify-cli` 1.0.11 at commit `8147943512404afb9d99c6252cb9bf84369fd0b0` (unchanged).
- ATV Starter Kit `main` at commit `ad996736b879be87c7755df5c5017d5336203bbc` (unchanged).

## [0.1.0] - 2026-10-09

### Added

- Pinned Spec Kit and ATV template with a validated feature and quick-lane relay.
- Offline CLI for adopting, installing, updating, validating, and routing models.
- Public manual, optional packs, GitHub Actions checks, and a dry-run release path.
- Pre-release maintainer checks, community templates, and the release dry run.

### Upstream

- Spec Kit `specify-cli` 1.0.11, installed from hash-locked requirements.
- ATV Starter Kit pinned to commit `ad996736b879be87c7755df5c5017d5336203bbc`.

[Unreleased]: https://github.com/dermonaco-labs/baton/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/dermonaco-labs/baton/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/dermonaco-labs/baton/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/dermonaco-labs/baton/releases/tag/v0.1.0
