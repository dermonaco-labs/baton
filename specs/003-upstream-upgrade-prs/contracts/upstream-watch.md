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
   - a `stored_at` path under one of `.github/agents/`, `.github/skills/`, `.specify/` or
     `packs/<id>/files/` whose owning `files[]` row has `upstream` equal to the
     candidate's upstream. The owning row is the base-lock row for a deleted path or a
     changed existing path, and the candidate-lock row only for a **new path** (see below).
2. **Avoids forbidden paths** (these are always rejected):
   - anything under `.github/workflows/`, `src/`, `test/` or `.baton/`;
   - `package.json`, `package-lock.json`, `.npmrc`, `uv.toml`, `pip.conf`;
   - any path containing `..`, starting with `/` or containing a backslash;
   - any path with a character outside `A-Z`, `a-z`, `0-9` and `._/@+-`, so that
     rendered paths stay inert in the PR body.

Two further rules apply:

- **FR-012:** apart from its own `upstreams.<id>` entry, its own `files[]` rows and the
  `x-bump-summary` field, the candidate lock must equal the base lock exactly.
  - Its own entry may change only the pin fields: `version`, `tag`, `ref`, `commit`,
    `tree`, `requirements_sha256`.
  - The ATV `note` is maintainer-owned and preserved.
  - `files[]` rows are compared by `stored_at`. Every row owned by another upstream or by
    an optional source (such as `optimize` or `token-budget`) must be present and
    identical, and none may be added. No row may change its `upstream`. Only rows owned
    by the candidate's upstream may be added, changed or removed (see
    [Owned rows](#owned-rows)).
- **Requirements files:** only a Spec Kit candidate may change them.

Violations of either the path policy or FR-012 are rejected with `E_PATH_POLICY`
before any git object is written.

### New paths

A stored path without a base-lock row is a **new path** only when the trusted base tree
allows it. `publish` and `package` read that tree themselves with
`git ls-tree -r -z --name-only <base>`; the candidate's declarations never decide it. The
path is rejected with `E_PATH_POLICY` when any of these holds:

- the base tree is unavailable;
- it is tracked in the base tree, in any letter case (for example
  `.specify/memory/constitution.md` or `.github/skills/baton/SKILL.md`, which no lock row
  owns);
- it names a tracked directory, lies below a tracked file, or spells a tracked directory
  in a different letter case;
- it is not a growth path of the candidate's upstream (see
  [Owned rows](#owned-rows)); in particular no candidate adds files under
  `.github/agents`, `.github/skills` or any `packs/<id>/files` root;
- its stored root is not tracked in the base tree;
- it is added directly in a stored root that holds a file not owned by the candidate's
  upstream in the base lock;
- any of its directories below the stored root contains, at any depth, a tracked file
  not owned by the candidate's upstream in the base lock.

The last two rules keep unlocked or foreign-owned trusted files, such as Baton's own
skills, the constitution and pack files, in directories no candidate can extend.

### Owned rows

Every `files[]` row field the candidate controls is checked against trusted data, for new
and existing rows alike:

- **Growth paths.** Rows appear or disappear only on growth paths. A Spec Kit candidate
  may add or remove rows under `.specify/` except `.specify/extensions.yml`,
  `.specify/extensions/` and `.specify/memory/`, which are protected. An ATV candidate
  has no growth path. Rows elsewhere come from Baton pack definitions, so new files there
  take the manual route: a reviewed pack-definition change, then `sync --bump`. A
  removed row needs its path in `deleted`, and a deleted path keeps no row.
- **Existing rows** keep their field set and the frozen fields `path`, `packs`,
  `upstream`, `upstream_path`, `license`, `x-baton-source` and `x-baton-source-sha256`.
- **New rows** (new paths only) have exactly the fields `license`, `packs`, `path`,
  `repair`, `sha256`, `sha256_upstream`, `stored_at`, `upstream` and `upstream_path`,
  and `upstream_path` equals `stored_at`.
- **Install target.** Every owned row installs where its `stored_at` implies:
  `packs/<pack>/files/<path>` installs `<path>` for `[<pack>]`, and any other stored path
  installs in place for `["core"]`. The target must lie under `.github/agents/`,
  `.github/skills/`, `.github/hooks/` or `.specify/`, must not be
  `.specify/memory/constitution.md`, and must avoid the forbidden paths.
- **Content.** The license is `MIT`; `sha256` and `sha256_upstream` are 64 hexadecimal
  digits; `repair` is `null` with equal hashes, or for ATV only an object with the
  non-empty strings `id`, `reason` and `upstream_issue`. A row with a Baton source
  (other than a `SKILL.md`) keeps both hashes equal to that source's hash. When the
  candidate writes the file, `sha256` equals the written bytes' hash; otherwise it is
  unchanged from the base row, and a new row must have a written file.

## Candidate artifacts

- Each `generate` leg exposes the job outputs `<id>_artifact` (the `artifact-id` of its
  upload) and `<id>_digest` (the content digest its package step verified). Each output
  expression is gated on `matrix.upstream == '<id>'`, so a leg can set only its own
  upstream's outputs.
- `publish` and `report` download each upstream's artifact by `artifact-ids` into a
  separate directory per upstream, never by name or pattern. A missing id means the leg
  produced no candidate.
- `publish` accepts a candidate only if its verified content digest equals the leg's
  `<id>_digest` output. An empty `DIGEST_<ID>` (a wiring fault) and a different digest
  (a changed artifact) are reported as distinct `E_CANDIDATE_VERIFY` excerpts.

## Check results trust boundary

- The authoritative gate is the outcome of the `generate` leg's `sync --bump` and
  `npm run check` steps. The package step writes a manifest only when both succeeded.
- The manifest's `checks` list is attested by that read-only leg. `publish` verifies only
  that it matches the fixed check schema; it does not re-run the checks.
- The required PR checks, which start when a human marks the draft PR ready for review,
  remain the backstop before merge. The PR body states this.

## Branch, commit and PR

- **Branch:** `baton/upstream-upgrade/speckit` and `baton/upstream-upgrade/atv` (FR-013).
- **Commit:** exactly one commit on `base`.
  - Author and committer: the GitHub Actions bot identity, `BOT_NAME` (`github-actions[bot]`) and `BOT_EMAIL` (user id `41898282` at the GitHub noreply domain) in `src/lib/upstream-candidates.mjs`.
  - Subject: `chore(upstream): bump <id> to <pin>`.
  - Trailers: `Baton-Upstream`, `Baton-Pin`, `Baton-Base`, `Baton-Content`.
- **Push:**
  - `git push --force-with-lease=refs/heads/<branch>:<observed-sha>`, or
    `--force-with-lease=refs/heads/<branch>:` when the branch does not exist.
  - Never push when the branch is human-edited (FR-020).
  - Before pushing for an existing candidate PR, re-read the PR. It must still be open
    with the head observed during detection. Otherwise report `E_PR_CHANGED` and write
    nothing.
  - When detection saw no open PR, list open PRs whose head is the candidate branch just
    before pushing. If one exists, report `E_PR_CHANGED` and write nothing.
  - Every PR list for a candidate branch (`head=<owner>:<branch>`, `per_page=100`;
    `state=all` in `detect`, `state=open` before pushing) must be a JSON array.
    Anything else fails closed with `E_SOURCE_FORMAT` in `detect` or `E_PUBLISH` in
    `publish`, and nothing is written.
  - A lease failure is reported as `E_LEASE`. A `[remote rejected]` push (for example a
    branch protection rule) is reported as `E_PUSH` with the remote's reason. Any other
    push failure is reported as `E_PUSH` naming the branch.
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
4. **Validation**: each check with its result and a link to the run, noting that the
   results are attested by the generate job and that the required PR checks run after
   the PR is marked ready for review.
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

### Missing markers (FR-030)

- Any unmerged candidate PR on the upstream's branch, open or closed, without a valid
  marker blocks that upstream with `E_PR_MARKER`. The excerpt is
  `#<n> (<state>) on <branch> has no valid candidate marker; restore the marker in its description, then rerun`.
- The automation does not push to, edit, comment on or close that PR, and it does not
  generate a candidate for the upstream. It never infers a pin from an editable field
  such as the title.
- Recovery is manual. A maintainer restores the marker in the PR description (closed PR
  descriptions stay editable). A marker with the closed PR's pin keeps that pin
  suppressed; a marker with `closed=obsolete` releases it.

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
