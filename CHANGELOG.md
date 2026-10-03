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

## [0.1.0] - 2026-10-03

### Added

- Pinned Spec Kit and ATV template with a validated feature and quick-lane relay.
- Offline CLI for adopting, installing, updating, validating, and routing models.
- Public manual, optional packs, GitHub Actions checks, and a dry-run release path.
- Pre-release maintainer checks, community templates, and the release dry run.

### Upstream

- Spec Kit `specify-cli` 1.0.11, installed from hash-locked requirements.
- ATV Starter Kit pinned to commit `ad996736b879be87c7755df5c5017d5336203bbc`.

[Unreleased]: https://github.com/dermonaco-labs/baton/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/dermonaco-labs/baton/releases/tag/v0.1.0
