# Research: Upstream Upgrade Pull Requests

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-04

Phase 0 consulted two agents:

- `repo-research-analyst` mapped the sync, lock, workflow and test code.
- `learnings-researcher` searched `docs/solutions/` and found no prior lesson on GitHub
  Actions security, so that area is new ground. Its relevant lessons are folded in as
  R-10 and R-11.

The plan has no `NEEDS CLARIFICATION` items left open.

## R-1 One pin record: the lock replaces the vetted constants

- **Decision**: `baton.lock.json` becomes the only record of the Spec Kit and ATV pins.
  - Remove the four core constants from `src/lib/upstream.mjs`: `SPECKIT_VERSION`,
    `SPECKIT_COMMIT`, `ATV_COMMIT` and `ATV_TREE`.
  - Remove the check in `src/commands/sync.mjs:390-393` that rejects a lock that differs
    from them.
  - `sync` and `sync --check` read pins only from the lock and still verify every fetch
    against those pins: commit, tree, hash-locked requirements and license.
  - A missing lock is an error. Constants no longer serve as a fallback.
  - `OPTIONAL_SOURCES` stays as it is, because the optional sources keep manual, vetted
    pins (spec Assumptions).
- **Rationale**:
  - Today a maintainer has to hand-edit the source after every bump. Until they do,
    `sync --check` fails (`docs/07-updating.md:59-62`). FR-006 forbids that.
  - The constants add no security over the lock. A PR that changes pins has to change the
    lock and the regenerated payload together, and `sync --check` proves they are
    consistent. Either way the change is visible in review.
  - The constants are also bundled into `.baton/bin/baton.mjs`, so every bump would
    otherwise need `src/` edits and a rebuild.
- **Alternatives considered**:
  - Have `sync --bump` rewrite `upstream.mjs` and rebuild the bundle. Rejected: the sync
    command would be generating source code and a bundle, and there would still be two
    records to keep consistent.
  - Keep the constants only as bootstrap defaults. Rejected: a second record would drift
    silently.

## R-2 ATV tracked-ref policy in the lock

- **Decision**: The form of the last bump determines the lock's ATV ref policy.
  - `sync --bump atv=<40-hex>` records `ref: "main"` and `version: null`. This is
    main-HEAD tracking, as today.
  - The new form `sync --bump atv=<x.y.z>` fetches `refs/tags/v<x.y.z>` from the ATV
    repository and records `version`, `tag: "v<x.y.z>"` and `ref: "v<x.y.z>"`, plus
    the commit and tree. This is release tracking.
  - `lockFile` stops hard-coding `ref: 'main'`.
  - The watcher reads the policy from the lock:
    - `version === null` and `ref === "main"` means the candidate is `main` HEAD.
    - A semver `version` with a matching tag means the candidate is the newest stable
      release.
    - Anything else is reported as an `unsupported-ref` blocker.
  - The automation always uses the bump form that matches the current policy, so it
    never changes the policy. Switching policy is a maintainer bump (FR-003).
- **Rationale**:
  - FR-003 requires release tracking, which the current lock cannot express.
  - ATV publishes stable `vX.Y.Z` GitHub releases (checked: `v2.6.3` … `v2.5.9`, none
    draft or pre-release).
  - The tag-to-commit flow mirrors Spec Kit's existing `refs/tags/v<ver>` fetch.
- **Alternatives considered**:
  - Support only `main` and report other refs as unsupported. Rejected because it
    contradicts FR-003.
  - Add a separate `track:` field. Rejected: the policy is redundant with the
    `version`/`ref` pair.

## R-3 Job topology and the trust boundary

- **Decision**: Split `upstream-watch.yml` into four jobs. Top-level `permissions: {}`
  stays, and each job carries its own guard.

  | Job | Permissions | Runs upstream code | Purpose |
  |-----|-------------|--------------------|---------|
  | `detect` | `contents: read`, `pull-requests: read` | Pinned, already reviewed code only (`sync --check`) | Verification, link check, upstream probes, PR and branch state, per-upstream plan |
  | `generate` (matrix over upstreams that need a candidate) | `contents: read` | **Yes**: new upstream version | `sync --bump`, full local gate, candidate artifact |
  | `publish` | `contents: write`, `pull-requests: write` | **No** | Verify the artifact, commit, push with a lease, create or update a draft PR, close obsolete bot-only PRs |
  | `report` | `issues: write` | No | Update the single tracking issue and the run summary; fail the run on any blocker |

- **Rationale**:
  - FR-009 and FR-010 require upstream execution to hold no write credential, and the
    writer to execute nothing from upstream.
  - `publish` and `report` therefore do not run `npm ci`, `uv` or `sync`. They run
    Baton's own dependency-free maintainer script with the preinstalled Node, from a
    checkout of the trusted default-branch commit.
- **Alternatives considered**:
  - A single job that lowers its permissions per step. Rejected: GitHub cannot do that.
  - A GitHub App or personal access token. Rejected: it would add a secret, which
    Principle VIII and FR-026 forbid.

## R-4 Candidate transfer and integrity

- **Decision**: After the full gate passes in `generate`, the job uploads the artifact
  `candidate-<upstream>` and exposes its `artifact-id` and verified content digest as
  per-upstream job outputs. Downstream jobs download it by id, not by name
  ([contracts](./contracts/upstream-watch.md#candidate-artifacts)).
  - Contents: `manifest.json` and the changed files. The manifest records the upstream,
    the pin, the base commit, `{path, sha256, mode}` for each added or modified file, and
    the list of deleted paths.
  - `generate` also uploads `result-<upstream>.json` with `if: always()`.
  - `publish` accepts a candidate only if all of the following hold:
    1. The manifest's upstream, pin and base commit equal the plan produced by the
       trusted `detect` job.
    2. Every file hash matches.
    3. Every path passes the candidate path policy ([contracts](./contracts/upstream-watch.md#candidate-path-policy)).
    4. The candidate lock changes only its own upstream entry, its own `files[]` rows
       and `x-bump-summary` (FR-012).
    5. No symlinks are present and only modes 100644 and 100755 are used.
  - `publish` then builds a single commit on the base with git and does not execute any
    candidate file.
- **Rationale**:
  - These checks make what is published exactly what was validated (FR-010).
  - The path policy limits what a hostile generator could inject. Human review of the
    draft PR stays the final control.
- **Alternatives considered**:
  - Passing a patch through job outputs. Rejected: outputs are limited to 1 MB in total
    and matrix outputs collide.
  - Rerunning the generator in `publish`. Rejected: that would execute upstream code
    with write access.

## R-5 Cache-poisoning boundary

- **Decision**:
  - No job in `upstream-watch.yml` restores or saves a cache. No `cache:` input on
    `setup-node`, and `enable-cache: false` on `setup-uv`.
  - `release.yml` also sets `enable-cache: false` on its `setup-uv` step.
  - npm caches elsewhere stay, because `npm ci` verifies every tarball's integrity
    against `package-lock.json`.
- **Rationale**:
  - Scheduled runs use the default-branch cache scope, and tag and PR runs read from it.
    Code running in a job can reach that job's Actions runtime token and write cache
    entries.
  - Until now the watcher executed only reviewed upstream code. `generate` will execute
    unreviewed versions.
  - uv's cache would serve `uvx --from yamllint==1.37.1` without a hash check, inside
    `release.yml`, which has `contents: write` and `id-token: write`.
- **Alternatives considered**: Accept the risk. Rejected: the release job holds write and
  attestation credentials.

## R-6 Workflow-token PRs and checks

- **Finding** (GitHub Docs, "Triggering a workflow"):
  - When the workflow token opens or updates a PR, the `opened`, `synchronize` and
    `reopened` events create workflow runs in an **approval-required** state. No CI
    executes until a user with write access approves them.
  - Other event types triggered by the token create no runs.
  - Events that a human triggers, such as "ready for review", run normally.
- **Decision**: Add `ready_for_review` to the `pull_request` types in `ci.yml` and
  `baton.yml`, including the adopter template mirror
  `baton/templates/workflows/baton.yml`. Listing types explicitly means listing all four:
  `opened`, `synchronize`, `reopened` and `ready_for_review`. The PR body states that
  marking the PR ready for review starts the checks, and that approving the pending runs
  works too (FR-017).
- **Rationale**:
  - The clarified answer (D-CHECK-TRIGGER).
  - Pending approval-required runs consume no CI, so SC-004 holds.

## R-7 Idempotency, branch state and suppression

- **Decision**:
  - **Branch**: one deterministic branch per upstream, `baton/upstream-upgrade/<id>`, so
    an open PR can be updated in place (FR-013, FR-019).
  - **Commit**: one commit per candidate, authored and committed as
    `github-actions[bot]`. It carries the trailers `Baton-Upstream`, `Baton-Pin`,
    `Baton-Base` and `Baton-Content`; the last is the manifest sha256.
  - **Bot-only**: every commit in `default..branch` has both author and committer equal to
    `github-actions[bot]`. Merge commits from "Update branch" have the web-flow committer
    and a human author, so they count as human edits, which is the conservative reading.
  - **Unchanged** (FR-018): skip the run when the PR is open and bot-only, the pin is the
    same, `Baton-Base` equals the default HEAD, and the content digest is unchanged.
    Otherwise compare the new changed-file manifest with the branch's current
    `base..branch` changes, and push only when they differ or the PR cannot merge.
  - **Push**: `--force-with-lease` with the observed branch SHA, so a concurrent human
    push makes the run abort and report.
  - **Suppression** (FR-021): a hidden marker in the PR body records the upstream and
    pin. A PR that is closed, not merged and lacks the `closed=obsolete` mark suppresses
    its pin. Before the automation closes an obsolete PR (FR-029), it writes that mark
    first, so its own closes never suppress.
  - **Serialization** (FR-022): use a constant concurrency group, `upstream-watch`, with
    `cancel-in-progress: false`.
- **Alternatives considered**:
  - Put the pin in the branch name. Rejected: an open PR's head branch cannot change.
  - Record suppression in a repository file or variable. Rejected: it needs extra write
    scopes, and the PR history already holds the fact.

## R-8 Validation inside `generate`

- **Decision**:
  - `generate` checks out the base commit, installs the pinned toolchain the way `ci.yml`
    does, runs `npm ci --ignore-scripts`, then `sync --bump <pin>`, then
    `npm run check`.
  - `npm run check` covers lint, types, `build --check`, `sync --check`, `lock verify`,
    `validate` and the tests.
  - `generate` packages the candidate only if all of these pass (FR-011, D-VALIDATION-SCOPE).
  - Job timeouts: `detect` 10 minutes, each `generate` leg 20 minutes in parallel,
    `publish` and `report` 5 minutes each. This fits SC-007's 30 minutes.
- **Rationale**: The candidate passes the same gate a maintainer runs before landing.

## R-9 Untrusted metadata handling

- **Decision**: Every external value is checked against a strict format before use:
  - versions match `^\d+\.\d+\.\d+$`;
  - SHAs match `^[0-9a-f]{40}$`;
  - tags match `^v\d+\.\d+\.\d+$`;
  - URLs are built from these values and fixed hosts, never taken from API text.
  - Error excerpts placed in issues are stripped of control characters, capped at
    2,000 characters, and fenced with a fence longer than any backtick run they contain.
  - Release notes are never copied (FR-005, FR-015).

## R-10 Mirrors and private hosts (learning)

- **Source**: `docs/solutions/restricted-mirror-env-only-2026-09-29.md`.
- **Guidance**:
  - Generated candidates use the public indexes.
  - Mirrors exist only as environment variables on maintainer machines, never in
    candidate files.
  - The path policy also rejects `.npmrc`, `uv.toml` and `pip.conf`.

## R-11 Raw-byte integrity and CRLF (learning)

- **Source**: `docs/solutions/crlf-normalized-ownership-hashing-2026-09-29.md`.
- **Guidance**: Lock, bundle and payload hashes stay raw-byte. The manifest therefore
  hashes raw bytes too, and `publish` writes the bytes exactly as received. `git` runs
  with `core.autocrlf=false` so line endings are not normalized.

## R-12 Where the maintainer code lives

- **Decision**:
  - Pure logic goes in `src/lib/upstream-candidates.mjs`: parsing, selection, planning,
    classification, manifest and rendering.
  - The workflow entry point is `src/maintainer/upstream-upgrade.mjs`, with stages
    `detect`, `package`, `publish` and `report`. It uses only Node built-ins, with
    injected `fetch` and git runners for tests.
  - Neither file is imported by `src/cli.mjs`, so neither is bundled. `src/` is listed in
    `.npmignore`, so adopters never receive them. `tsc` covers both through
    `src/**/*.mjs`.
- **Alternatives considered**:
  - Inline workflow script. Rejected: it cannot be type-checked or unit-tested.
  - A new `baton` CLI command. Rejected: it would add an adopter-facing contract for
    maintainer-only behavior.
