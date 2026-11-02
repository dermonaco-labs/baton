# Quickstart Validation: Optional Context Optimization Packs

Run these checks only after the pre-code gate permits implementation.
Use isolated adopter fixtures; do not compact this approved feature's sources.

## Pack and Provenance Checks

Exercise core-only, token-budget-only, optimize-only and combined fixture
installs. Re-init/update each selection, then whole-install uninstall.
Compare restored fixture bytes and preservation of user edits.

Run `node .baton/bin/baton.mjs lock verify` after sync. Modified vendored bytes
or an incorrect source commit/tree must fail verification.

## Draft Mutation Checks

Create a separate unbound draft feature in an installed fixture.
Preview compact and verify no target/backup changes. Apply a smaller candidate
with explicit feature, target and expected original digest. Confirm the
original backup, then restore and compare original bytes.

Repeat with current/historical approval, a checksum binding, a checksum-free
`read_first`, a cross-feature/quick reference, managed ownership, instructions,
malformed metadata, stale content, aliases and traversal. Each apply must fail
with no target, backup, binding, approval or instruction changes.

## Report Checks

Run optimize run/tokens/learn and reject apply-like requests. Compare all
governance, phase, scanner, approval and persistent-memory files before/after.
Run scope with ordered `read_first` and exclusions; preserve both exactly.
Run concise on/off and usage with zero instruction/artifact edits.

## Local Commands

```powershell
node --test test/unit/context-guards.test.mjs test/unit/packs.test.mjs test/unit/schema.test.mjs test/unit/sync.test.mjs test/integration/context.test.mjs test/integration/init.test.mjs
npm run typecheck
npm run lint:md
npm run lint:yaml
```

Build the bundled runtime and sync payloads through existing commands.
Run one `npm run check` on the final candidate. Observe required CI on
the PR head once; do not rerun an unchanged head.

Expected outcomes: selected packs only, exact provenance, eligible draft
round-trip, all protected writes refused, all governance reports non-mutating.
