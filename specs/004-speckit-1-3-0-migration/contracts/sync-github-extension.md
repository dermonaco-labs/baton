# Contract delta: `sync` with the Spec Kit `github` extension tree

**Feature**: `004-speckit-1-3-0-migration`
**Base contract**: `specs/003-upstream-upgrade-prs/contracts/sync-bump.md`
**Requirements**: FR-001–FR-003, FR-006, FR-009, FR-015

## Generation

1. `prepareSpeckit` produces the core project exactly as before: init, then the Baton extension and preset.
2. A new step derives the **extension tree**: it copies the core project to a sibling directory in the same work
   directory and runs `specify extension add github` there, using the same verified `specify-cli`. The step runs
   offline and uses the extension bundled in the pinned wheel. If the step fails, it raises `E_UPSTREAM_VERIFY` and
   writes no output.
3. Core entries come only from the core project. The extension tree supplies only `extension: github` pack entries
   and the names that `pinnedNames` collects for closure.
4. For the ps and py flavours, init runs the same extension step on its flavour project when the resolved packs
   include `issues`.
5. The rendered extension skill is generated text, so sync normalizes its CRLF to LF before hashing.

## Validation

- Pack loading fails the schema check if `extension` has any value other than `github`, or appears with a `from`
  other than `speckit`.
- An `extension: github` entry's source must be a regular file, not a symlink, inside the extension tree. Otherwise
  sync raises `E_UPSTREAM_VERIFY`.
- `--check` regenerates both trees and compares every output and lock row. Outside a bump, an extension row whose
  `sha256_upstream` changed fails, as for any Spec Kit row.
- The rendered `docs/reference/upstream-diff.md` lists the extension rows with their `issues` stored paths.

## Exit behavior

Unchanged from feature 003. `E_UPSTREAM_VERIFY`, `E_DANGLING_REF`, `E_LICENSE` and `E_PREREQUISITE` fail closed
with no partial writes.
