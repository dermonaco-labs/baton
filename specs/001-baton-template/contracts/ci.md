# Contract: CI & Release

Maintainer workflows (`ci`, `smoke`, `upstream-watch`, `release`) carry `if: github.repository == 'dermonaco-labs/baton'`
on every job, so they stay dormant in derived repos. All workflows use actions pinned by full commit SHA (with a `# vX.Y.Z` comment), `permissions: {}` at the top level
with explicit per-job grants, `concurrency` groups with `cancel-in-progress` for PRs, and `timeout-minutes` on every
job. Only `GITHUB_TOKEN` is used; there are no other secrets. Dependabot updates the `github-actions` and `npm`
ecosystems weekly.

## Workflows

| File | Trigger | Jobs (runner, timeout) | Permissions | Purpose |
|---|---|---|---|---|
| `ci.yml` | `pull_request`, `push` to main | `lint` (ubuntu, 5 min), `test` (ubuntu, 5 min) | `contents: read` | fast, meaningful checks (maintainer; dormant in derived repos) |
| `baton.yml` | `pull_request`, `push` to main | `baton` (ubuntu, 5 min): checkout, setup-node, `node .baton/bin/baton.mjs validate --github`, then `doctor` | `contents: read` | **adopter CI**: the server-side backstop when local hooks are skipped (RK1). Active in both the Baton repo and derived repos, shipped by `init`/`adopt` from `baton/templates/workflows/baton.yml` |
| `smoke.yml` | `pull_request`, `push` to main, `workflow_dispatch` | `smoke` matrix {ubuntu-latest, windows-latest} (10 min) | `contents: read` | e2e: instantiate the template + overlay the fixtures (maintainer; dormant in derived repos) |
| `upstream-watch.yml` | `schedule` (weekly, Mon 06:00 UTC), `workflow_dispatch` | `watch` (ubuntu, 5 min) | `contents: read`, `issues: write` | one tracking issue for new upstream releases/commits (maintainer; dormant) |
| `release.yml` | `push` tags `v*.*.*`, `workflow_dispatch` (`dry_run: true`: builds and verifies, publishes nothing) | `release` (ubuntu, 10 min) | `contents: write`, `id-token: write`, `attestations: write` | build + publish assets (maintainer; dormant) |
| `template-cleanup.yml` | `push` to the default branch | `cleanup` (ubuntu, 5 min), guarded by `if: github.repository != 'dermonaco-labs/baton'` plus a marker file check | `contents: write` | derived-repo cleanup (US1). Runs `baton adopt --no-workflows` and commits. It never touches `.github/workflows/`, because `GITHUB_TOKEN` cannot push workflow changes (research R12); the maintainer workflows stay behind their guards and the adopter can delete them with `baton adopt --prune-workflows` |
| `copilot-setup-steps.yml` | `workflow_dispatch`, `push`/`pull_request` touching itself | `copilot-setup-steps` (ubuntu, 10 min) | `contents: read` | coding-agent environment: node 20, uv, `specify-cli` installed with `uv pip install --require-hashes -r baton/upstream/specify-cli.requirements.txt` (maintainer) or skipped when the file is absent (derived repos need no Spec Kit CLI at runtime), `baton doctor` |

## `ci.yml` steps

- **`lint`**:
  1. checkout
  2. setup-node 20 with the npm cache
  3. `npm ci --ignore-scripts`
  4. `npm run lint:md` (markdownlint-cli2)
  5. `npm run lint:yaml` (yamllint via `pipx run yamllint`, pinned)
  6. actionlint (the pinned action)
  7. `npm run typecheck`
  8. `node .baton/bin/baton.mjs build --check` (bundle freshness)
  9. `node .baton/bin/baton.mjs lock verify`
  10. `node .baton/bin/baton.mjs validate --github` (schemas compile, batons, skill/agent frontmatter, docs coverage,
      model enforcement)
  11. lychee link check, offline mode for relative links only (external links are covered by a weekly job inside
      `upstream-watch`)
- **`test`**: `npm test` (`node --test`, unit + integration, fixture repos).
- `npm run check` runs the same steps locally (Principle VIII). CONTRIBUTING requires it before every push.

## `smoke.yml` steps (per OS)

1. **Template instantiation**:
   - `git archive HEAD` into a temp dir, then `git init`.
   - Set `BATON_FORCE_CLEANUP=1` and run `node .baton/bin/baton.mjs adopt --no-workflows` (the same call as the workflow).
   - Assert the disposition table (plan.md): the Remove paths are gone (including `package.json`), the constitution
     is the placeholder template, `README.md` is the adopter README, `docs/baton/` exists, `.github/workflows/` is
     byte-identical, and `.github/workflows/baton.yml` exists.
   - Run `doctor --strict` and `validate` and assert exit 0. The dormant maintainer workflows must carry
     `if: github.repository == 'dermonaco-labs/baton'` on every job (a validate check in the Baton repo).
2. **Overlay**: for each fixture repo in `test/fixtures/repos/{empty,has-instructions,atv-263-broken}`:
   - copy it to a temp dir and run `init`
   - assert the expected file set (`test/fixtures/expected/<name>.txt`) and the preserved user bytes
   - check the conflict report exit code (0 or 4 as expected) and that `--repair` flags the corrupted agents
3. **Idempotency**: run `init` again and assert `git status --porcelain` is empty.
4. **Relay (headless)**:
   - Copy `test/fixtures/features/sample` and run `handoff write --phase specify --from-json …`, then
     `receive --phase plan`.
   - Assert that the gate is pending (exit 3), then `approve`, `receive` (exit 0), and that `validate` passes.
5. **Update**:
   - Install the previous release fixture (`test/fixtures/prev-release/`), modify one file and run `update`.
   - Assert that the modified file is untouched and that `.baton/conflicts/<path>.new` exists.
6. **Upstream reproducibility** (ubuntu only, when `baton.lock.json` or `packs/` changed; `dorny/paths-filter` pinned):
   - install uv, then run `baton sync --check`.

## Budget (SC-007)

| Job | Target wall-clock |
|---|---|
| lint | ≤ 3 min |
| test | ≤ 2 min |
| smoke ubuntu | ≤ 4 min (+3 for sync --check when triggered) |
| smoke windows | ≤ 6 min (2× billing multiplier; free on public repos) |

The jobs run in parallel, so the PR wall-clock stays within 10 minutes.

## `upstream-watch.yml`

- Queries the PyPI JSON for `specify-cli`, the GitHub releases of `github/spec-kit`, the npm `atv-starterkit` latest,
  and the `All-The-Vibes/ATV-StarterKit` main HEAD and releases.
- Compares them to `baton.lock.json`.
- When there are differences, it creates or updates **one** issue labelled `upstream-bump` with a table, the
  changelog links and the exact `baton sync --bump …` command.
- It never pushes, and it never opens PRs (maintainers run sync locally; Principle II).
- It also runs the external link check for docs and appends any failures to the same issue.
- It runs `baton sync --check` against the current pins (FR-072), so upstream drift, a moved or unreachable ATV commit
  (AS3) or a changed Spec Kit wheel hash also land in the same issue.
- Every job has `if: github.repository == 'dermonaco-labs/baton'`.

## `release.yml` and versioning

- **Preconditions**:
  - the tag matches `package.json` version
  - `CHANGELOG.md` has a `## [X.Y.Z]` section with an `### Upstream` subsection
  - `build --check`, `lock verify` and `sync --check` pass
- **Assets**:
  - `baton.mjs`
  - `baton-template-vX.Y.Z.tar.gz` (a `git archive` after `adopt --dry-run` has listed the paths, for users who
    download instead of using the template)
  - `baton.lock.json`
  - `SHA256SUMS`
- **Provenance**: `actions/attest-build-provenance` for `baton.mjs` and the archive.
- **Release name**: `Baton vX.Y.Z — Spec Kit A.B.C · ATV <ref>`. The body is the CHANGELOG section plus the pin table
  plus verification instructions (`sha256sum -c`, `gh attestation verify`).
- **Versioning**:
  - SemVer 0.x.
  - A minor release is for new packs/commands or schema additions.
  - A patch release is for fixes and upstream patch bumps.
  - A handoff-schema-breaking change requires `baton handoff migrate` and a minor bump (during 0.x).
  - 1.0 happens when `baton: 1` is frozen.
