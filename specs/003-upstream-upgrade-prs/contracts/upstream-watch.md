# Contract: `upstream-watch.yml` with draft upgrade PRs

This contract supersedes the `upstream-watch` row and section of
[001 contracts/ci.md](../../001-baton-template/contracts/ci.md) for draft candidate
branches and PRs only (D-CONTRACT-AMEND). Everything else in that contract still applies.

## Triggers and workflow-level settings

- `schedule: cron '0 6 * * 1'` and `workflow_dispatch` are unchanged (FR-001).
  - New dispatch input: `preview` (boolean, default `false`).
- `permissions: {}`.
- `concurrency: { group: upstream-watch, cancel-in-progress: false }` (FR-022).
- Every job has these settings (FR-026):
  - `if: github.repository == 'dermonaco-labs/baton'`, plus the job's own conditions;
  - `runs-on: ubuntu-latest` and a `timeout-minutes`;
  - actions pinned by full SHA with a `# vN` comment;
  - `persist-credentials: false` on checkout;
  - no cache inputs.

## Jobs

| Job | Needs | Permissions | Allowed tooling | Forbidden |
|-----|-------|-------------|-----------------|-----------|
| `detect` | none | `contents: read`, `pull-requests: read` | checkout, setup-node, setup-uv (`enable-cache: false`), `npm ci --ignore-scripts`, `sync --check`, lychee (sha256-verified), `node src/maintainer/upstream-upgrade.mjs detect` | writes to GitHub |
| `generate` (matrix `upstream`) | `detect` | `contents: read` | checkout of `base`, setup-node, `uv==0.12.5` installed with pip into a runner venv (same as `ci.yml`), `npm ci --ignore-scripts`, `sync --bump`, `npm run check`, `upstream-upgrade.mjs package`, upload-artifact | any other permission or cache |
| `publish` | `detect`, `generate` | `contents: write`, `pull-requests: write` | checkout of `base`, download-artifact, git, `node src/maintainer/upstream-upgrade.mjs publish` (Node built-ins only) | `npm`, `npx`, `uv`, `uvx`, `pip`, `sync`, executing any artifact file |
| `report` | all | `contents: read`, `issues: write` | checkout of `base`, download-artifact, `upstream-upgrade.mjs report` | `npm`, `uv`, `sync` |

Job conditions:

- `generate` runs once for each plan entry whose `action == generate`. Its failure does
  not stop the other leg (`fail-fast: false`).
- `publish` runs with `always()` when detection succeeded and `publish == true`. It acts
  only on upstreams whose leg succeeded and whose plan is `generate` or `close-obsolete`.
- `report` runs with `always()`.
  - In preview mode it writes only `$GITHUB_STEP_SUMMARY` (FR-027).
  - Otherwise it creates, updates, reopens or closes the single issue titled
    "Upstream watch: releases and verification", with label `upstream-bump`.
  - It exits non-zero when any of these holds (FR-024): verification failed, the link
    check failed, or any upstream has a blocker.

## Candidate path policy

`publish` rejects a candidate with `E_PATH_POLICY` unless every path in `changed` and
`deleted` meets both of these conditions:

1. **Matches an allowed form**:
   - one of the fixed files: `baton.lock.json`, `docs/reference/upstream-diff.md`,
     `baton/upstream/specify-cli.requirements.in` or
     `baton/upstream/specify-cli.requirements.txt`; or
   - a `stored_at` value found in the base lock (for `changed` or `deleted`) or in the
     candidate lock (for `changed` only), and under one of `.github/agents/`,
     `.github/skills/`, `.specify/` or `packs/<id>/files/`.
2. **Avoids forbidden paths** (these are always rejected):
   - anything under `.github/workflows/`, `src/`, `test/` or `.baton/`;
   - `package.json`, `package-lock.json`, `.npmrc`, `uv.toml`, `pip.conf`;
   - any path containing `..`, starting with `/` or containing a backslash.

Two further rules apply:

- **FR-012:** apart from its own `upstreams.<id>` entry and its `files` and
  `x-bump-summary` fields, the candidate lock must equal the base lock exactly.
  - Its own entry may change only the pin fields: `version`, `tag`, `ref`, `commit`,
    `tree`, `requirements_sha256`.
  - The ATV `note` is maintainer-owned and preserved.
- **Requirements files:** only a Spec Kit candidate may change them.

## Branch, commit and PR

- **Branch:** `baton/upstream-upgrade/speckit` and `baton/upstream-upgrade/atv` (FR-013).
- **Commit:** exactly one commit on `base`.
  - Author and committer: `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>`.
  - Subject: `chore(upstream): bump <id> to <pin>`.
  - Trailers: `Baton-Upstream`, `Baton-Pin`, `Baton-Base`, `Baton-Content`.
- **Push:**
  - `git push --force-with-lease=refs/heads/<branch>:<observed-sha>`, or
    `--force-with-lease=refs/heads/<branch>:` when the branch does not exist.
  - Never push when the branch is human-edited (FR-020).
  - A lease failure is reported as `E_LEASE`.
- **PR:**
  - Created as a draft against the default branch with title
    `Upstream: bump <id> to <pin>`.
  - Updated in place, never duplicated (FR-019).
  - The automation never calls the APIs to merge, enable auto-merge, review or approve,
    mark ready for review, create a tag or create a release (FR-016).
- **Missing permission:** HTTP 403 "GitHub Actions is not permitted to create or approve
  pull requests" maps to `E_PR_PERMISSION` (A-PR-SETTING).

### PR body sections (FR-014, FR-015, FR-017)

1. The hidden marker `<!-- baton-upstream-candidate upstream=<id> pin=<bump> base=<sha> digest=<hex> -->`.
2. **Pins**: old and new version, commit and tree, as compare and release links built
   from validated values.
3. **Generated change summary**: the `x-bump-summary` text with changed, added and removed
   files.
4. **Validation**: each check with its result and a link to the run.
5. **Reviewer checklist**, with these items:
   - compatibility
   - licenses and `THIRD_PARTY_NOTICES.md`
   - repairs
   - reference closure
   - changed agent and skill prompts read in full
   - normal Baton gates
6. **How checks start**: mark the PR ready for review, or approve the pending workflow
   runs. Merging and release stay manual.

Release notes are never copied.

### Obsolete PRs (FR-029)

For a `close-obsolete` plan, the automation does three things in this order:

1. Rewrite the marker with `closed=obsolete`.
2. Comment with the reason and the default branch's pin.
3. Close the PR.

It does not delete the branch. `obsolete-human` plans are reported in the issue only.

## Tracking issue

- The issue keeps its existing single-issue lifecycle and the lychee section.
- Each upstream gets a row, as defined in [data-model.md](../data-model.md#tracking-issue-row-one-per-upstream).
- The body text "never pushes or opens PRs" becomes: "Opens draft candidate PRs only;
  never merges, tags, releases or pushes to the default branch."

## PR check triggers (FR-017)

`ci.yml` and `baton.yml`, including the adopter template
`baton/templates/workflows/baton.yml`, declare:

```yaml
pull_request:
  types: [opened, synchronize, reopened, ready_for_review]
```
