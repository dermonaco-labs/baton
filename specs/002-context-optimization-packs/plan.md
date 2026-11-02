# Implementation Plan: Optional Context Optimization Packs

**Branch**: `dermonaco-add-token-budget-optimize-packs`

**Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: `specs/002-context-optimization-packs/spec.md`

## Summary

Add independently selectable token-budget and optimize packs with pinned,
byte-identical upstream snapshots stored as inactive reference inputs.
Install eight Baton-owned skills as the only supported entry points.
Use a Node guarded writer for compact/restore; report-only adapters for
optimize; session-only concise and baton-subordinate scope behavior.
No upstream installers, auto-compaction hooks, core default changes,
constitution amendments, releases, tags or merges.

## Technical Context

**Language/Version**: JavaScript ESM, Node 20 or newer; TypeScript checked.

**Primary Dependencies**: Existing yaml, ajv and Node built-ins; no new
runtime dependency. Existing git, uv and build tools for sync/verification.

**Storage**: Pack payloads, lock/manifest records, draft candidates and backups.

**Testing**: node:test unit/integration suites and existing local lint/check.

**Target Platform**: Windows and existing supported POSIX hosts.

**Project Type**: Packaged CLI with generated bundled runtime.

**Performance Goals**: Local protection discovery is bounded to known Baton
metadata and selected feature files, not unrestricted workspace text search.

**Constraints**: Fail-closed mutations; no approved artifact edits, prompt
forks, weakened gates, or automatic compaction. Preserve existing CRLF and
task checkbox hashing behavior.

**Scale/Scope**: Two optional packs, eight wrappers, one CLI namespace, one
shared protection module. Existing whole-install uninstall remains unchanged.

## Constitution Check

| Principle | Design evidence | Result |
|-----------|-----------------|--------|
| I: Upstream-first | Unmodified snapshots; behavior in owned wrappers/code | Pass |
| II: Pinned inputs | Tag, commit, tree, license and per-file raw checksums | Pass |
| III: Handoffs | New feature baton; required receive/write hooks | Pass |
| IV: Stop | Scope approved; pre-code and PR-review gates still mandatory | Pass |
| V: Preregistration | Named acceptance checks in tasks before coding | Pass |
| VI: Optional | Both packs require explicit selection; core unchanged | Pass |
| VII: Model routing | Wrappers use role routing, never hard-coded models | Pass |
| VIII: Local-first | Targeted checks, one final full suite, normal CI | Pass |
| Licensing | Both MIT notices and source licenses preserved | Pass |

Phase 1 recheck: no optimize apply operation. Compact/restore cannot rebind
hashes or clear approvals. No exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/002-context-optimization-packs/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/context.md
  tasks.md
  handoff.md
```

### Source Code (repository root)

```text
src/commands/context.mjs
src/lib/context-guards.mjs
packs/token-budget.yml
packs/optimize.yml
packs/token-budget/files/.baton/vendor/token-budget/
packs/optimize/files/.baton/vendor/optimize/
baton/skills/speckit-token-budget-{compact,restore,scope,concise,usage}/SKILL.md
baton/skills/speckit-optimize-{run,tokens,learn}/SKILL.md
test/unit/context-guards.test.mjs
test/integration/context.test.mjs
```

**Structure Decision**: Extend existing pack manifests and source handling,
not a second installer. Sync materializes wrappers into each pack's
`files/.github/skills/` tree. Vendors install under `.baton/vendor/` and are
never registered as commands or hooks. See research for exact snapshot lists.

## Implementation Design

Extend `src/lib/upstream.mjs`, `src/commands/sync.mjs`, pack/lock schemas and
installed provenance handling for two named sources. Remove the obsolete
exact-11-pack assumption without weakening required pack validation.
Keep existing required lock sources and backward compatibility.

`src/lib/context-guards.mjs` discovers all feature/quick handoffs and installed
manifest/lock protection. Restrict writes to explicitly selected draft SDD
Markdown under one existing numbered feature directory. Check real paths,
links, aliases, relevant metadata schemas, approval history, all `read_first`
references and artifact/source hash bindings. Missing first handoff is allowed
only when other checks establish an unbound draft. Unreadable/invalid relevant
metadata refuses writes.

Use normalized artifact hashes for bindings and raw hashes for upstream
integrity and candidate freshness. Require an expected original digest for
apply. Check target and protection snapshots again immediately before writing.
Preserve original bytes in a non-overwritten backup; restore uses the same
guard. Refusals and previews create no files.

Apply is single-target, not a bulk transaction. Avoid new concurrent-writer
protocols or claims of an OS sandbox. Supported operations refuse detected
stale state; arbitrary external filesystem writers remain outside the boundary.

Constitution and instruction files, handoffs, phase configuration/defaults,
scanners and approval logic are never mutation targets. Existing BATON/SPECKIT
markers provide ownership boundaries, not bypassable optimization permissions.

`context optimize run|tokens|learn` supplies only non-mutating context/report
data. Wrappers use pinned upstream audit guidance for proposals, omitting all
apply/persist steps. Apply-like flags are errors. Constitution amendments are
explicit handoffs to `/speckit-constitution`, not delegated direct edits.

Scope preserves ordered baton context and exclusions. Concise changes only
session response style. Usage exposes estimates as estimates. Slimming stays
explicit, never filters required error evidence, and never hides failure status.

## Validation and Delivery

Implement registered tests first, observing initial failures. Use targeted
unit/integration selectors and local lint/type checks during development.
Rebuild `.baton/bin/baton.mjs` and sync snapshots with existing commands.
Update current public docs, CLI reference, MIT notices and Unreleased changelog;
do not rewrite historical approved feature contracts.

Run one `npm run check` on the final candidate. Use a fresh checkout for
`/baton-review`, then required human approval and `/baton-land` to open one PR.
Observe required CI on the PR head once; do not rerun an unchanged head.

## Complexity Tracking

No constitution violations or exceptions are requested.

## Phase 0 Research (Baton addition)

The approved proposal consulted `repo-research-analyst` and
`learnings-researcher`. Their repository and past-solution findings are
incorporated in [research.md](research.md). Spec Kit remains the only planner.

## Handoff

The phase result, decisions, context and required approvals live in
[handoff.md](handoff.md), written by the mandatory handoff hook.
