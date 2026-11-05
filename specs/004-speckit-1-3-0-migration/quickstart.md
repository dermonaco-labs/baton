# Quickstart: validating the Spec Kit 1.3.0 migration

**Feature**: `004-speckit-1-3-0-migration` | **Plan**: [plan.md](plan.md)

Set package mirrors only in the process environment (`UV_DEFAULT_INDEX`, `npm_config_registry`). Never write
them into tracked files. If the approved mirror lacks `specify-cli==1.3.0`, run steps 1–3 in a Linux container or
in hosted CI with public PyPI. Record the local exit code as unavailable tooling and cite the hosted run.

## 1. Bump (maintainer, generator environment)

```sh
npm ci --ignore-scripts
node .baton/bin/baton.mjs sync --bump speckit=1.3.0
git diff --stat -- baton.lock.json baton/upstream .specify .github/skills packs/issues docs/reference/upstream-diff.md
```

Expected:

- `upstreams.speckit` is `1.3.0` / `v1.3.0` / `91261fdcf1738cb095a31ff5bee145f502e3af91`.
- The `issues` rows are the extension files with `x-speckit-extension: github`.
- The old `issues` skill row is gone.

## 2. Reproducibility and integrity (FR-003, FR-015, SC-001)

```sh
node .baton/bin/baton.mjs sync --check     # 0 differences
node .baton/bin/baton.mjs lock verify      # OK
node .baton/bin/baton.mjs validate         # OK
```

## 3. Full local gate (SC-002)

```sh
npm run check
```

## 4. Install checks (SC-005)

```sh
# core only: no issue-creation files
node .baton/bin/baton.mjs init --cwd <tmp-core>
test ! -e <tmp-core>/.github/skills/speckit-taskstoissues/SKILL.md
test ! -e <tmp-core>/.github/skills/speckit-github-taskstoissues/SKILL.md
test ! -e <tmp-core>/.specify/extensions/github

# core + issues: both commands, wrapper delegates
node .baton/bin/baton.mjs init --cwd <tmp-issues> --packs issues
test -f <tmp-issues>/.github/skills/speckit-taskstoissues/SKILL.md
test -f <tmp-issues>/.github/skills/speckit-github-taskstoissues/SKILL.md
test -f <tmp-issues>/.specify/extensions/github/scripts/bash/resolve-tasks.sh
```

The regression tests in `test/` automate these checks. The commands above are for manual confirmation only.

## 5. Upgrade-automation bindings (SC-006)

```sh
node --test test/unit/upstream-candidates.test.mjs
```

The existing cases pass unmodified. New cases show that changing, deleting or adding a file stored at
`packs/issues/files/.specify/extensions/github/...` or a row with `x-speckit-extension` is rejected for manual
review.

## 6. PR body material (FR-015)

Use the reviewed upstream diff summary from `docs/reference/upstream-diff.md` and the lock's `x-bump-summary`.
