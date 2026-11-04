# Quickstart: validating upstream upgrade PRs

This guide shows how to check that the feature works end to end. Behavior is defined in
[contracts/upstream-watch.md](./contracts/upstream-watch.md),
[contracts/sync-bump.md](./contracts/sync-bump.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node 20, `uv` and git on PATH, and network access to PyPI and GitHub.
- A clean checkout of the feature branch.
- Use public package indexes. A restricted mirror may be set only through environment
  variables, never in tracked files.

## 1. Local gate (offline-safe parts)

```sh
npm ci --ignore-scripts
npm run check
```

Expected: the command passes. This includes the new unit tests for:

- candidate selection, planning, branch classification, the path policy, manifest
  verification, marker parsing, rendering and excerpt sanitization;
- the job permissions and forbidden tooling in `upstream-watch.yml`;
- the `ready_for_review` triggers, including the adopter template mirror;
- the bump argument forms and the lock fields preserved by `lockFile`.

## 2. One consistent bump (US4, SC-006)

Run this in a scratch clone. Do not commit the result.

```sh
node .baton/bin/baton.mjs sync --bump atv=<newer main commit>
node .baton/bin/baton.mjs sync --check
node .baton/bin/baton.mjs lock verify
node src/commands/build.mjs --check
git diff --stat   # only the lock, docs/reference/upstream-diff.md and ATV-derived files
```

Expected:

- Every check passes with no edit to `src/`.
- Repeating the steps with `speckit=<newer stable version>` also passes, and the
  requirements files change.
- An invalid pin, such as `atv=<unknown 40-hex>` or `speckit=99.0.0`, fails with a stable
  code, and `git status` stays clean.

## 3. Preview run on hosted CI (FR-027)

After the feature is merged, a maintainer runs this dispatch:

```sh
gh workflow run upstream-watch.yml -f preview=true
```

Expected:

- `detect`, plus `generate` for every upstream that has a newer pin, both succeed.
- The run summary lists each upstream's plan and validation result.
- No branch, PR or issue changes.

## 4. First live run (operational, post-merge)

Prerequisite: the repository owner allows GitHub Actions to create pull requests (Settings
→ Actions → Workflow permissions). Without it, the run reports `E_PR_PERMISSION` in the
issue.

Run it with:

```sh
gh workflow run upstream-watch.yml
```

Expected:

- At most one draft PR per upstream, on `baton/upstream-upgrade/<id>`. The body has
  pins, links, the summary, validation results and a checklist.
- The tracking issue shows each row.
- A second dispatch with no upstream change causes no pushes, no PR edits and no new
  runs (SC-004).
- Marking a candidate ready for review starts `ci.yml` and `baton.yml` (FR-017).

## 5. Human-edit and suppression behavior

These cases are covered by unit tests and confirmed manually only when convenient:

- **Human push to a candidate branch:** the next run reports `waiting-human` and does not
  push (FR-020).
- **Human closes a candidate PR unmerged:** the same pin is reported as `suppressed`
  (FR-021).
- **Manual bump merged to the default branch:** the bot-only candidate is closed with an
  explanation (FR-029).
