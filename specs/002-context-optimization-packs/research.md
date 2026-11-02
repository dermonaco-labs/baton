# Research: Optional Context Optimization Packs

## Repository Research

Phase 0 consulted `repo-research-analyst` and `learnings-researcher` during
the approved design proposal. Their read-only findings are incorporated here.

### Source and pack integration

- **Decision**: Add named upstream sources, not `from: baton` snapshots.
- **Rationale**: Sync omits authored files from upstream lock provenance.
  Packs are discovered automatically, but schemas only support Spec Kit/ATV.
  Extend those surfaces, keeping required sources and core defaults.
- **Alternatives rejected**: Unlocked authored snapshots violate pinned
  provenance; upstream installers could register unsafe hooks or place
  optional generated content into core.
- **Evidence**: `src/lib/packs.mjs:32`, `src/commands/sync.mjs:71`,
  `src/commands/sync.mjs:242`, pack/lock schemas.

### Wrappers and removal

- **Decision**: Wrapper sources live under `baton/skills`; sync emits optional
  `files/.github/skills` payloads. Keep whole-install uninstall.
- **Rationale**: Existing sync resolves authored skills from `baton/skills`;
  installed manifest ownership already drives update and uninstall.
- **Alternatives rejected**: No per-pack removal API or second installer.
- **Evidence**: `src/commands/sync.mjs:249`, `src/commands/init.mjs:160`,
  `src/commands/uninstall.mjs:30`.

### Hash semantics and relay

- **Decision**: Preserve normalized ownership/artifact hashes and raw upstream
  integrity checks; mutation eligibility is stricter than freshness.
- **Rationale**: Artifact hashing normalizes CRLF and masks checked task markers.
  Hash equivalence never authorizes compaction of a bound source.
- **Evidence**: `src/lib/hash.mjs:9`,
  `docs/solutions/crlf-normalized-ownership-hashing-2026-09-29.md`.
- **Decision**: Use the feature lane and fresh-checkout review.
- **Evidence**: `docs/solutions/quick-lane-scope-and-stranded-land-2026-09-29.md`.
- **Decision**: Keep local mirrors in process environment only; never repin
  missing upstream packages to work around an internal mirror.
- **Evidence**: `docs/solutions/restricted-mirror-env-only-2026-09-29.md`.

## Pinned Upstream Inspection

| Source | Tag | Commit | Tree |
|--------|-----|--------|------|
| tinesoft/spec-kit-token-budget | v1.1.0 | 11c5589f347ddb3789b51b09927ef825c88e3f19 | 0188d6c187e1f1ddc03293660cc8e4d129ea0fa5 |
| sakitA/spec-kit-optimize | v1.0.0 | d6dba6ae93bf60322deee3bdc4ffcf127e42b2b9 | c5bb7b7a37912ef26bc369397980c26c3d70cf7b |

Tag resolution, trees and MIT licenses were inspected read-only through GitHub
at these exact commits. Preserve complete license files and notices.

### Token-budget

Snapshot `LICENSE`, `extension.yml`, `token-budget-config.template.yml`,
commands `compact.md`, `restore.md`, `scope.md`, `concise.md`, `usage.md`,
Bash helpers `compact_helper.sh`, `estimate_tokens.sh`, `slim_output.sh`,
and PowerShell helpers `compact_helper.ps1`, `estimate_tokens.ps1`.
Keep upstream relative paths under
`packs/token-budget/files/.baton/vendor/token-budget/`.

Compact rewrites artifacts/constitution and injects agent-memory guards.
Restore overwrites files, deletes backups and removes memory guards.
Concise persists instructions. Keep these inputs byte-identical and inactive;
separate guarded wrappers/writer replace the unsafe mutation routes.
Do not register upstream hooks.

### Optimize

Snapshot `LICENSE`, `extension.yml`, `config-template.yml` and commands
`speckit.optimize.run.md`, `speckit.optimize.tokens.md`,
`speckit.optimize.learn.md` under
`packs/optimize/files/.baton/vendor/optimize/`.

Run includes an apply stage despite report-only support. Learn can persist
memories. Wrappers exclude these mutation paths. Mandatory gates,
scanners and approvals remain protected when an audit calls them redundant.

There is no check command at this pin. The user explicitly selected the three
existing commands only; no substitute command or pin change is authorized.

## Safety Boundary

Executable compact/restore guards protect the supported workflow, not an
arbitrary process with repository write access. Semantic preservation still
requires author review. Prompt-only preflight is insufficient: use one
guarded write path and test through the real CLI.

No unresolved design questions remain. Implementation is still gated by the
mandatory pre-code approval after tasks and analysis.
