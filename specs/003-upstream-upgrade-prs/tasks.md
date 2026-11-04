# Tasks: Upstream Upgrade Pull Requests

**Input**: Design documents from `specs/003-upstream-upgrade-prs/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Required. Constitution Principle V and the Acceptance Registry need red-to-green
evidence for every story.

**Format**: `[ID] [P?] [Story] Description`. `[P]` means the task can run in parallel
(different files, no dependency on an unfinished task).

**Development scope**: Do not run the workflow live, create PRs, merge, tag or release.
Live behavior is checked only after the human merge (quickstart §3–4).

## Phase 1: Setup

- [X] T001 Confirm the starting state: run `npm ci --ignore-scripts` and `npm run check` on the unchanged branch, and record the result in the Acceptance Registry note below `specs/003-upstream-upgrade-prs/tasks.md`. If a dependency is missing, restore it from a public or environment-configured registry without editing any tracked file.

---

## Phase 2: Foundational (blocks US1–US3)

**Purpose**: Shared pure types and helpers, plus the unbundled entry script that every
watcher story uses.

- [X] T002 Create `src/lib/upstream-candidates.mjs` with JSDoc typedefs for the `Upstream`, `Pin`, `UpstreamPlan`, `CandidateManifest`, `CandidateResult`, `Blocker` and `CandidatePR` entities, exactly as in data-model.md. It must also export these format helpers:
  - `isVersion`, matching `^\d+\.\d+\.\d+$`;
  - `isSha`, matching `^[0-9a-f]{40}$`;
  - `isTag`, matching `^v\d+\.\d+\.\d+$`;
  - `compareVersions`, a numeric semver comparison;
  - `sanitizeExcerpt`, which strips control characters, caps at 2000 characters and fences the result (R-9);
  - `buildRunUrl`, built from `GITHUB_SERVER_URL`, `GITHUB_REPOSITORY` and `GITHUB_RUN_ID` after validating each value.
- [X] T003 Create `src/maintainer/upstream-upgrade.mjs`, an entry point using Node built-ins only.
  - It dispatches `detect|package|publish|report` from `process.argv`.
  - It takes injectable `fetch`, `git` runner and `env` for tests.
  - It includes a minimal GitHub REST client that uses `GITHUB_TOKEN` and maps HTTP 403 "GitHub Actions is not permitted to create or approve pull requests" to `E_PR_PERMISSION`.
  - It prints a stable error code on failure.
  - It must not import `src/cli.mjs` or any npm dependency, and `src/cli.mjs` must not import it (R-12).
- [X] T004 [P] Add a test in `test/unit/upstream-candidates.test.mjs` (describe `upstream candidates formats`) covering:
  - the format helpers, including rejection of `v1.2`, `1.2.3-rc1`, uppercase or short SHAs, and values with newline or `$(`;
  - `sanitizeExcerpt` length, control-character stripping and fencing;
  - a check that neither `src/cli.mjs` nor `src/lib/upstream-candidates.mjs` imports from `src/maintainer/`.

**Checkpoint**: The shared helpers exist and are typed. `npm run typecheck` passes.

---

## Phase 3: User Story 4 - Bump locally with the same operation (Priority: P3, implementation prerequisite) 🔧

**Goal**: `sync --bump` updates every pin record Baton checks, so `sync --check` passes
with no hand edits (FR-006 to FR-008, contract
[sync-bump.md](./contracts/sync-bump.md)).

**Independent Test**: AC-US4-1 (unit) and AC-US4-2 (a manual network bump in a scratch
clone, quickstart §2).

### Tests for User Story 4 (write first; capture red evidence)

- [X] T005 [US4] Extend `test/unit/sync-bump.test.mjs` with these cases:
  - **Bump regex:** accepts `speckit=1.2.3`, `atv=<40-hex>` and `atv=1.2.3`, and rejects `atv=v1.2.3`, `atv=main` and `speckit=<sha>` with `E_USAGE`, exit 2.
  - **`lockFile`, ATV release bump:** records `version`, `tag: "v<x.y.z>"` and `ref: "v<x.y.z>"`.
  - **`lockFile`, ATV sha bump:** records `ref: "main"`, `version: null` and no `tag`.
  - **`lockFile`, preserved fields:** keeps the ATV `package` and `note` and the Spec Kit `init_args` from the base lock.
  - **No vetted constants:** `src/lib/upstream.mjs` no longer exports `SPECKIT_VERSION`, `SPECKIT_COMMIT`, `ATV_COMMIT` or `ATV_TREE`.
  - **Missing lock:** sync fails `E_SYNC_DRIFT` with "baton.lock.json is required".
  - **Verify before write (injected failure):** a verification failure leaves every target file byte-identical and restores `baton/upstream/specify-cli.requirements.{in,txt}`.

### Implementation for User Story 4

- [X] T006 [US4] In `src/lib/upstream.mjs`, remove `SPECKIT_VERSION`, `SPECKIT_COMMIT`, `ATV_COMMIT` and `ATV_TREE`. Leave `OPTIONAL_SOURCES` unchanged. Add ATV tag resolution, `refs/tags/v<x.y.z>` → commit and tree, that reuses the existing commit and tree verification.
- [X] T007 [US4] In `src/commands/sync.mjs`, make five changes:
  - Read Spec Kit and ATV pins only from `baton.lock.json`. With the lock missing, fail `E_SYNC_DRIFT` "baton.lock.json is required".
  - Remove the lock-equals-constants `E_UPSTREAM_VERIFY` comparison.
  - Change the bump regex to `^(speckit=\d+\.\d+\.\d+|atv=(?:[0-9a-f]{40}|\d+\.\d+\.\d+))$`.
  - Make `lockFile` take the policy from the bump form and preserve maintainer-owned fields, with no hard-coded `ref: 'main'`.
  - Finish all fetch, license, repair and closure verification before the first write, and restore the requirements files on any failure.

  Export the pure helpers the tests from T005 need.
- [X] T008 [US4] Update every other use of the removed constants (search `src/`, `test/` and `scripts`), including `test/unit/sync.test.mjs:249-277`. Build locks from fixtures or `baton.lock.json`, so that `src/commands/lock.mjs` and `lock verify` behave unchanged.
- [X] T009 [US4] Rebuild the bundle with `npm run build`, updating `.baton/bin/baton.mjs`, its `.sha256` and its license files. Confirm that `node src/commands/build.mjs --check` passes.
- [X] T010 [P] [US4] In `docs/07-updating.md`, remove the manual vetted-constants step. Document `sync --bump speckit=<x.y.z>`, `atv=<sha>` (main tracking) and `atv=<x.y.z>` (release tracking), and state that `sync --check` must pass right after a bump.

**Checkpoint**: AC-US4-1 passes. AC-US4-2 is run if network access is available;
otherwise it is recorded as pending with a reason.

---

## Phase 4: User Story 1 - Review a ready-made Spec Kit upgrade (Priority: P1) 🎯 MVP

**Goal**: A newer stable Spec Kit release produces exactly one validated draft PR. It is
never merged, tagged or released (FR-001, FR-002, FR-004, FR-005, FR-009 to FR-016,
FR-023 to FR-028).

**Independent Test**: AC-US1-1, AC-US1-2 and AC-US1-3. The live preview is quickstart §3,
after merge.

### Tests for User Story 1 (write first; capture red evidence)

- [X] T011 [P] [US1] Extend `test/unit/upstream-candidates.test.mjs` (describe `upstream candidates speckit`) with these cases:
  - **Spec Kit selection** (FR-002, FR-004):
    - draft releases, pre-releases and versions older than current are ignored;
    - the newest stable version must exist both as a PyPI release and as GitHub tag `v<x.y.z>`, and a mismatch gives `E_SOURCE_MISMATCH`;
    - invalid formats give `blocked`.
  - **`planUpstream` state order 1–7** from data-model.md, for the actions `blocked`, `close-obsolete`/`obsolete-human`, `none`, `suppressed`, `waiting-human`, `unchanged` and `generate`.
  - **Path policy**, with each allowed and forbidden form from contracts/upstream-watch.md:
    - fixed files;
    - `stored_at` values under `.github/agents/`, `.github/skills/`, `.specify/` and `packs/<id>/files/`;
    - forbidden `.github/workflows/`, `src/`, `test/`, `.baton/`, `package.json`, `package-lock.json`, `.npmrc`, `uv.toml`, `pip.conf`;
    - paths containing `..`, a leading `/` or a backslash.
  - **Lock-diff restriction (FR-012):** only the own entry's `version`, `tag`, `ref`, `commit`, `tree`, `requirements_sha256`, plus `files` and `x-bump-summary`, may change. Requirements files are allowed for Spec Kit only.
  - **Manifest verification:** plan binding, raw-byte sha256, `mode` ∈ {`100644`, `100755`}, unique normalized paths, and the content digest (canonical JSON without `checks`).
  - **Marker:** render and parse round-trip.
  - **PR body sections 1–6** in order (FR-014, FR-015):
    - links built only from validated values;
    - no release-note text;
    - the checklist includes "changed agent and skill prompts read in full".
  - **Tracking-issue rows and body text:** the text "Opens draft candidate PRs only; never merges, tags, releases or pushes to the default branch." appears in the body.
- [X] T012 [P] [US1] Create `test/integration/upstream-upgrade.test.mjs` (describe `upstream upgrade publish`). It uses a temporary local bare repository and a recording mock of the GitHub API, and covers these cases:
  - **Opening a candidate:**
    - `package` followed by `publish` opens one draft PR titled `Upstream: bump speckit to <ver>` on `baton/upstream-upgrade/speckit`;
    - it contains exactly one commit whose author and committer are the GitHub Actions bot identity `BOT_NAME` / `BOT_EMAIL` (`github-actions[bot]`, user id `41898282` at the GitHub noreply domain), with the trailers `Baton-Upstream`, `Baton-Pin`, `Baton-Base` and `Baton-Content`;
    - git runs with `core.autocrlf=false`.
  - **Rejections:** a tampered hash, a symlink, a forbidden path, a mode outside the allowed set, or a manifest whose `base`/`bump` differs from the plan is rejected before any push.
  - **Preview / non-default ref:** publishing makes no push and no API write.
  - **403 on PR creation:** maps to `E_PR_PERMISSION`.
  - **Forbidden calls (FR-016):** the recorder sees no call to merge, auto-merge, reviews, ready-for-review, tags or releases endpoints, and no push to the default branch.
  - **Report stage:** a failing validation result produces an issue row with upstream, pin, stage, fenced excerpt and run link, and `report` exits non-zero (FR-024).
- [X] T013 [P] [US1] Update `test/unit/maintainer-workflows.test.mjs` (describe `upstream watch workflow`) to assert the following:
  - **Workflow-level:**
    - `permissions: {}`;
    - triggers `schedule` and `workflow_dispatch` with a boolean `preview` input, default `false`;
    - `concurrency.group == 'upstream-watch'` and `cancel-in-progress: false`.
  - **Jobs and timeouts:** the jobs `detect`, `generate`, `publish` and `report`, with timeouts 10, 20, 5 and 5.
  - **Per-job permissions**, exactly as in the contract table.
  - **Job settings:**
    - a repository guard on every job;
    - SHA-pinned actions;
    - `persist-credentials: false`;
    - no `cache` input on setup-node;
    - `enable-cache: false` on every setup-uv.
  - **`publish` and `report`:** no `run` step invokes `npm`, `npx`, `uv`, `uvx`, `pip` or `baton.mjs sync`.
  - **`generate`:** `fail-fast: false`.
  - **`release.yml`:** setup-uv `enable-cache: false`.
  - **Replaced assertions:** the old `id: links` and "Update the single upstream tracking issue" assertions are replaced with equivalents for the new jobs.
  - **Runner (analysis C5, FR-026):** every job has `runs-on: ubuntu-latest`.

### Implementation for User Story 1

- [X] T014 [US1] Implement Spec Kit detection and `planUpstream` in `src/lib/upstream-candidates.mjs`, and the `detect` stage in `src/maintainer/upstream-upgrade.mjs`.
  - Read the base lock.
  - Query PyPI JSON and GitHub releases/tags via the injected `fetch`.
  - Validate every external value, then emit the trusted plan JSON with `publish=false` when `preview` is true or the ref is not the default branch.
  - Find open and closed candidate PRs by branch and marker.
- [X] T015 [US1] Implement the `package` stage in `src/maintainer/upstream-upgrade.mjs`.
  - Diff the working tree against `base`, using git with `core.autocrlf=false`.
  - Write `candidate-<id>/manifest.json` plus the changed files' raw bytes.
  - Always write `result-<id>.json`, including a sanitized blocker on failure.
- [X] T016 [US1] Implement the `publish` stage.
  - Verify the manifest against the trusted plan and the path policy before anything else.
  - Build one bot commit on `base` with git, without executing artifact content.
  - Push with `--force-with-lease`; a lease failure is `E_LEASE`.
  - Create or update the draft PR with the rendered body.
  - Never call any FR-016 API.
- [X] T017 [US1] Implement the `report` stage.
  - Merge plan and result data into one row per upstream, keeping the lychee section and the single-issue lifecycle.
  - Apply the new body text.
  - In preview mode, write only to `$GITHUB_STEP_SUMMARY`.
  - Exit non-zero on a verification failure, link failure or blocker (FR-023 to FR-025, FR-027).
- [X] T018 [US1] Rewrite `.github/workflows/upstream-watch.yml` according to [contracts/upstream-watch.md](./contracts/upstream-watch.md).
  - Use the four jobs, permissions, timeouts, `preview` input and constant concurrency the contract specifies.
  - Disable all caches.
  - Validate in `generate` with `npm ci --ignore-scripts`, `sync --bump <bump>` and `npm run check`.
  - Pass data through upload/download-artifact, pinned by SHA with `# vN`, reusing `ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2` for upload and pinning a matching download-artifact release.
  - Run `publish` and `report` from the trusted base checkout with Node only.
  - Keep `src/lib/maintainer-workflows.mjs` coverage in sync.
- [X] T019 [P] [US1] In `.github/workflows/release.yml`, set `enable-cache: false` on setup-uv (D-NO-CACHE).
- [X] T020 [P] [US1] Add an "Automated upgrade PRs" section to `docs/07-updating.md`. It covers:
  - what the watcher opens;
  - the reviewer checklist;
  - preview dispatch;
  - the owner setting "Allow GitHub Actions to create and approve pull requests" (A-PR-SETTING);
  - that merge and release stay manual.

  Also replace the sentence saying the watcher never pushes or opens PRs.
- [X] T021 [P] [US1] Add supersession notes, pointing to `specs/003-upstream-upgrade-prs/contracts/upstream-watch.md`, to the `upstream-watch` rows and sections of `specs/001-baton-template/contracts/ci.md` (L23, L90-105) and `specs/001-baton-template/spec.md` (L149-150, FR-072 L340-341). Do not rewrite the original 001 requirements (D-CONTRACT-AMEND).

**Checkpoint**: AC-US1-1, AC-US1-2 and AC-US1-3 pass. The MVP is complete for Spec Kit.

---

## Phase 5: User Story 2 - Review an ATV upgrade that follows the tracked ref (Priority: P2)

**Goal**: ATV candidates follow the lock's ref and stay independent of Spec Kit (FR-003,
D-ATV-REF, D-PER-UPSTREAM).

**Independent Test**: AC-US2-1.

### Tests for User Story 2 (write first; capture red evidence)

- [X] T022 [P] [US2] Extend `test/unit/upstream-candidates.test.mjs` (describe `upstream candidates atv`) with these cases:
  - **Main policy:** the latest pin is the `main` HEAD commit and tree, giving bump `atv=<sha>`.
  - **Release policy:** the newest stable `vX.Y.Z` release gives bump `atv=<x.y.z>`. When only `main` advanced, the action is `none`, with the newer commit kept as informational text for the issue row.
  - **Unsupported ref:** any other lock ref gives `blocked` with `E_UNSUPPORTED_REF`.
  - **Independence:** plans for both upstreams are independent, and an ATV manifest that changes the `speckit` lock entry or the requirements files is rejected.

### Implementation for User Story 2

- [X] T023 [US2] Implement ATV detection in `src/lib/upstream-candidates.mjs` and the `detect` stage of `src/maintainer/upstream-upgrade.mjs`, covering branch HEAD commit and tree for main tracking, GitHub releases for release tracking, the informational main commit, and `E_UNSUPPORTED_REF`. The `report` stage renders the informational commit in the ATV row.

**Checkpoint**: AC-US2-1 passes, and US1 checks still pass.

---

## Phase 6: User Story 3 - Trust repeated runs and human edits (Priority: P2)

**Goal**: Reruns are idempotent. Human-edited branches are preserved, rejected pins are
suppressed, obsolete PRs are handled, and a human ready-for-review starts the standard
checks (FR-017 to FR-022, FR-029).

**Independent Test**: AC-US3-1, AC-US3-2 and AC-US3-3.

### Tests for User Story 3 (write first; capture red evidence)

- [X] T024 [P] [US3] Extend `test/unit/upstream-candidates.test.mjs` (describe `upstream candidates lifecycle`) with these cases:
  - **`classifyBranch`:** bot-only only when every commit in `base..branch` has both author and committer `github-actions[bot]`.
  - **Same pin:** with the same base and digest, the action is `unchanged`. With a new base or a content change, it is `generate`.
  - **Human-edited branch:** with a newer pin, the action is `waiting-human`.
  - **Closed unmerged by a human:** the PR for pin `Y` gives `suppressed` for `Y`, and a newer `Z` gives `generate`.
  - **Closed with `closed=obsolete`:** the automation's own obsolete close never suppresses.
  - **Default branch pins `Y` or newer:** `close-obsolete` for a bot-only PR, `obsolete-human` for a human-edited one.
- [X] T025 [P] [US3] Extend `test/integration/upstream-upgrade.test.mjs` (describe `upstream upgrade lifecycle`) with these cases:
  - **Rerun with no change:** a second run of an `unchanged` plan performs zero pushes and zero PR/issue-body writes beyond the unchanged issue content (SC-004).
  - **Human commit on the candidate branch:** no push.
  - **Bot-only PR with a newer pin:** a lease-protected push updates the same PR number (FR-019).
  - **Lease mismatch:** gives `E_LEASE`.
  - **Obsolete close:** marker rewrite with `closed=obsolete`, then the comment, then the close, in that order. The branch is not deleted.
  - **Negative publish paths (analysis C4, FR-020, FR-024, SC-005):** a failed or missing `generate` leg opens or modifies no candidate PR, and an `obsolete-human` PR receives no push, comment or close. The recording mock asserts zero writes.
  - **Issue lifecycle (analysis C1, FR-025):** the tracking issue stays open while any candidate is open, waiting on a human edit or suppressed-but-newer, and closes only when everything is current. These cases live in this describe rather than `upstream upgrade publish`, so the AC-US3-2 selector runs them.
- [X] T026 [P] [US3] Add the test `pull_request types include ready_for_review` to `test/unit/maintainer-workflows.test.mjs`. It asserts `types: [opened, synchronize, reopened, ready_for_review]` for `.github/workflows/ci.yml`, `.github/workflows/baton.yml` and `baton/templates/workflows/baton.yml`, and that the latter two are byte-identical.

### Implementation for User Story 3

- [X] T027 [US3] Implement `classifyBranch`, suppression via markers, the obsolete states and digest comparison in `src/lib/upstream-candidates.mjs`. Use them in `detect` (listing PR commits through the read-only API) and in `publish` (the obsolete-close sequence, and no push for `unchanged` or `waiting-human`) in `src/maintainer/upstream-upgrade.mjs`. The `report` stage lists waiting-human and obsolete-human PRs.
- [X] T028 [US3] Add `types: [opened, synchronize, reopened, ready_for_review]` under `pull_request` in `.github/workflows/ci.yml`, `.github/workflows/baton.yml` and `baton/templates/workflows/baton.yml`, keeping the template byte-identical. Confirm that `test/integration/adopt.test.mjs` still passes.
- [X] T029 [P] [US3] In the `CHANGELOG.md` Unreleased section, record the adopter-facing `baton.yml` `ready_for_review` trigger and the new `sync --bump atv=<x.y.z>` form.

**Checkpoint**: AC-US3-1, AC-US3-2 and AC-US3-3 pass, and all earlier checks still pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T030 Run `npm run check` (markdown and YAML lint, typecheck, build check, sync check, lock verify, validate, tests), and fix any failures without weakening a registered check.
- [X] T031 Fill in the final evidence for every Acceptance Registry row in `specs/003-upstream-upgrade-prs/tasks.md`. Record quickstart §3–4 as post-merge operational steps, not development evidence.
  - **Selector counts (analysis C3):** record the number of tests each `--test-name-pattern` command ran. Zero counts as a failure.
  - **Post-merge evidence (analysis C2, E1):** SC-007 (a run finishes within 30 minutes) and the live SC-001 behavior come from the quickstart §3–4 runs after merge. They are never claimed from job timeouts.
- [X] T032 Scan the diff for private registry URLs, local machine paths, secrets, and any `pull_request_target`, `secrets.` or extra token usage. None may appear.

---

## Phase 8: Review 1 fixes (review.json F01–F11, F13)

Independent review 1 routed back to implement. The bound-contract amendment in
contracts/upstream-watch.md, data-model.md and research.md R-4 aligns the contracts with
the approved spec FR-010, FR-012 and FR-024 and does not change scope. New tests run
under the existing acceptance selectors, so their acceptance counts rise. No registered
command or assertion is weakened.

- [X] T033 [US1] F01 (P1, FR-012) in `src/lib/upstream-candidates.mjs`:
  - `lockDiffIssues` compares `files[]` rows by `stored_at`. Rows of other upstreams and optional sources must be present and identical, none may be added, and no row may change its `upstream`.
  - `pathPolicyIssue` accepts a stored path only when its owning row (base for deleted or changed existing paths, candidate for new paths) has the candidate's upstream.
  - Unit tamper cases in both directions (speckit→atv, speckit→optimize, atv→speckit, atv→token-budget) give `E_PATH_POLICY`. An integration case shows `publish` makes no push and no API write.
- [X] T034 [US1] F06: `pathPolicyIssue` rejects any character outside `[A-Za-z0-9._/@+-]`, with a unit test using a backtick path.
- [X] T035 [US1] F02, F05 in `src/maintainer/upstream-upgrade.mjs`:
  - Before pushing for an existing PR, `publish` re-reads it and requires `state == open` and the detected head. Otherwise `E_PR_CHANGED` with no push or PATCH.
  - `push` maps `[remote rejected]` to `E_PUSH` with the remote's reason, and only stale-lease rejections to `E_LEASE`.
  - Integration cases: a PR closed between detect and publish, and a remote-rejected push.
- [X] T036 [US1] F03 in `.github/workflows/upstream-watch.yml` and `publish`:
  - Per-upstream `<id>_artifact` and `<id>_digest` generate outputs, gated on `matrix.upstream`.
  - `artifact-ids` downloads into `artifacts/<id>`.
  - `publish` rejects a verified digest that differs from the leg's output with `E_CANDIDATE_VERIFY`.
  - Workflow unit assertions, and integration cases for a missing or mismatched digest.
- [X] T037 [US3] F07 in `planUpstream` and `detect`:
  - An open bot-only PR without a valid marker is `blocked` with `E_PR_MARKER`.
  - A closed unmerged PR without a marker suppresses the pin in its `Upstream: bump <id> to <pin>` title. *Superseded by T043 (review 2, FR-030): titles are never trusted.*
  - Unit cases for both.
- [X] T038 [US1] F08: the `checks` rejection reads as a schema mismatch, and the PR body Validation section states the trust boundary. Unit assertions for both.
- [X] T039 [US1] F04, F09 test coverage:
  - `report` with an `E_DANGLING_REF` bump log gives exit 1, an `E_UPSTREAM_VERIFY (generate)` row, a Blockers entry and a fenced excerpt.
  - A `manifest.pin` tamper case is rejected.
  - Exact lock-diff issue strings are asserted.
  - A compare with `total_commits > commits.length` is not bot-only.
  - `report` fallbacks: a missing artifact gives `E_CHECK_FAILED`, an incomplete publish `E_PUBLISH`, and a malformed `PLAN` the failed-detection plan.
- [X] T040 [P] F10, F11, F13:
  - `docs/07-updating.md` names the issue title and `upstream-bump` label, explains the stage environment and the maintainer `note` edit needed to switch the ATV policy.
  - Upstream repository slugs and SHA checks reuse `SPECKIT_REPO`, `ATV_REPO` and `isSha`.
  - The trailing whitespace in `contracts/sync-bump.md` is removed.
- [X] T041 Rerun the targeted selectors, then `npm run check` once on the corrected candidate, and update the acceptance evidence counts.

Review 1 implementation notes:

- F12 was dismissed by the reviewer as pre-existing behavior. It is documented in `docs/07-updating.md` but not changed.
- The `docs/07-updating.md` note that the ATV `note` needs a maintainer edit closes F11's first half. The `note` stays maintainer-owned per the contract.
- The final gate found that `test/unit/review-fix-docs.test.mjs` fails on the committed `ad5f4a6`. That test scans tracked `specs/**/*.md` for unlisted hosts. It passed during the first implementation only because the 003 files were still untracked. The literal bot email domain in the contract and T013 is now a reference to `BOT_NAME`/`BOT_EMAIL`. The identity is unchanged and the guard test is not modified.

---

## Phase 9: Review 2 fixes (review.json F14–F21)

Independent review 2 routed back to implement. F14 is a code fix against the existing
FR-012 contract, which already limits candidate-row ownership to new paths. The contract
now spells out how "new" is decided. F15 records a human decision as the new FR-030; it
replaces the title-based suppression from T037. New tests run under the existing
acceptance selectors. No registered command or assertion is weakened.

- [X] T042 [US1] F14 (P1, FR-012) in `src/lib/upstream-candidates.mjs` and `src/maintainer/upstream-upgrade.mjs`:
- `package` and `publish` read the trusted base tree with `git ls-tree -r -z --name-only <base>` and pass it to `verifyCandidate`. A missing base tree fails closed with `E_PATH_POLICY`.
- A candidate-lock row owns a path only if the path is new: untracked in any letter case, not a tracked directory, not below a tracked file, under a tracked stored root, and in no directory that holds a tracked file another owner or no lock row owns. An added own `files[]` row must name such a changed path.
- Unit cases: every tracked stored path without a base-lock row (13 at this base, including `.specify/memory/constitution.md` and Baton's skills) is rejected for both upstreams. A case-variant, directory, nested-path and ownership-rename table is rejected. Genuinely new paths in owned directories are accepted. An integration tamper case claims the constitution with a candidate row, then adds a file beside it; both give `E_PATH_POLICY` with no push and no API write.
- [X] T043 [US3] F15, F18 (FR-030, human decision): any unmerged PR on the candidate branch without a valid marker, open or closed, blocks with `E_PR_MARKER` and an excerpt naming the PR, its state and the repair. `titlePin` is removed, so F18 no longer applies. Suppression reads only the marker. Unit cases cover open, closed and merged PRs, a restored marker (suppressed) and a restored `closed=obsolete` marker (released). An integration case asserts no push and no non-GET call, and that a closed PR's intact title does not suppress.
- [X] T044 [US2] F16: the integration harness packages either upstream. For both speckit and ATV, an empty and a mismatched `DIGEST_<ID>` each give `E_CANDIDATE_VERIFY` with no push, write or branch, and the correct digest opens a draft PR on `baton/upstream-upgrade/<id>`. The workflow test checks, for every `UPSTREAMS` id, the gated outputs, one publish and one report download into `artifacts/<id>`, and `DIGEST_<ID>`.
- [X] T045 [US1] F17: exact unit assertions for the check-schema message and the PR body attestation sentence. An integration case for an unclassified push failure gives `E_PUSH` naming the branch.
- [X] T046 [P] F19, F20:
- An empty attested digest has its own excerpt (`… has no digest attested by the generate job (DIGEST_<ID> is empty)`).
- `docs/07-updating.md` describes each stage's actual inputs and adds a blocker remedy table.
- `repoSlug`, `isVersion` and `isSha` live in `src/lib/upstream.mjs` and are used by `parseBump` and `upstream-upgrade.mjs`.
- [X] T047 [US1] F21: when detection saw no open PR, `publish` lists open PRs for the candidate branch just before pushing. If one exists, it reports `E_PR_CHANGED` and writes nothing. Integration case included.
- [X] T048 Rerun the targeted selectors, then `npm run check` once on the corrected candidate, and update the acceptance evidence counts.

---

## Phase 10: Review 3 fixes (review.json F22–F25)

Independent review 3 routed back to implement. F22 is a code fix under FR-012. The
contract's `files[]` row rules now enumerate every candidate-controlled field
([Owned rows](./contracts/upstream-watch.md#owned-rows)). The growth boundary they set
narrows the earlier contract wording: only Spec Kit's unprotected `.specify/` paths grow
or shrink automatically. The repository owner explicitly approved this restricted
boundary, recorded as FR-031, a review 3 clarification and decision
`D-REVIEW3-BOUNDARY`. Acceptance selectors are unchanged, and no registered command or
assertion is weakened.

- [X] T049 [US1] F22 (P1, FR-012, FR-031) in `src/lib/upstream-candidates.mjs`. One row policy applies to every `files[]` row, and `package` and `publish` both reach it through `verifyCandidate`:
  - **Growth paths.** Only Spec Kit adds or removes rows, only under `.specify/`, and never under `.specify/extensions.yml`, `.specify/extensions/` or `.specify/memory/`. ATV has no growth path. Rows outside `.specify/`, including every `packs/<id>/files/` root, come from Baton pack definitions; new files there take the manual reviewed route. A removed row needs its file in `deleted`.
  - **Existing owned rows** keep their field set and `path`, `packs`, `upstream`, `upstream_path`, `license`, `x-baton-source` and `x-baton-source-sha256`.
  - **New rows** have exactly the sync row fields, with `upstream_path` equal to `stored_at`.
  - **Every owned row** installs at the target its `stored_at` implies (`packs/<p>/files/<x>` → `<x>` for `[p]`, otherwise in place for `["core"]`). The target is inside the upstream install roots, is not the constitution and is not a forbidden path. The row is MIT with valid hashes, and its `repair` is consistent. A Baton-sourced non-skill row keeps its source hash. `sha256` is the written file's hash or unchanged.
  - **Evidence.**
    - On the committed base tree and lock, identity candidates give no issues for both upstreams, and all 133 rows satisfy the target mapping (0 violations, verified rather than assumed).
    - Unit cases in `upstream candidates speckit and atv row ownership policy` (selected by AC-US1-1):
      - a valid regenerated file is accepted under every owned stored root (at least 8 Spec Kit and 10 ATV roots), along with a new file in every non-protected `.specify` directory and an ATV repair;
      - every forbidden growth class is rejected for both upstreams: `.github/agents`, `.github/skills`, `.github/hooks`, each pack root including the optional `optimize` and `token-budget` (new subdirectory or nested `.github/skills` path), removals outside `.specify/`, the protected `.specify` paths and a Spec Kit skill rename;
      - every owned root rejects a retarget of `path` to a workflow, the constitution, `.specify/extensions.yml`, `.baton/`, a feature handoff gate, `AGENTS.md`, `package.json` or `src/`; a `packs` move to `core`, `optimize`, `token-budget`, `issues`, an added pack or none; each other frozen field; and the hash, repair and written-byte mismatches;
      - new rows reject a workflow target, a foreign pack, a wrong `upstream_path`, extra fields, a non-MIT license, a Spec Kit repair and hash mismatches, and every Baton-sourced row rejects a forged hash;
      - base-locked rows installing under `.github/workflows/`, `.baton/` or `specs/`, or from a pack to `.baton/`, are rejected.
    - Integration cases give `E_PATH_POLICY` with no push, no branch and no API write:
      - ATV rows at `packs/optimize/files/x.md`, `packs/token-budget/files/x.md` and `packs/issues/files/new/x.md`;
      - an owned ATV row retargeted to `.github/workflows/ci.yml` (`changes path from ".github/agents/adversarial-reviewer.agent.md" to ".github/workflows/ci.yml"`);
      - an owned row moved to the `optimize` pack;
      - a Spec Kit pack-root row.
- [X] T050 [US3] F24: every PR list for a candidate branch must be a JSON array, or it fails closed: `E_SOURCE_FORMAT` in `detect`, `E_PUBLISH` before the push in `publish`, with no write. Integration tests assert the exact query paths (`state=all` in detect, `state=open` before the push). The closed-marker publish, both `E_PUSH` cases, the PR-closed race and the PR-opened race now assert the exact result object (`deepEqual`) and an empty non-GET call list. A detect-plan blocker now carries the run URL (`data-model.md` `run`).
- [X] T051 [P] F23, F25:
  - `docs/07-updating.md`:
    - has the exact marker template, and says to take its values from the `Baton-Pin`, `Baton-Base` and `Baton-Content` trailers of the latest bot commit on the PR head;
    - gives a remedy for every blocker code, including `E_UNSUPPORTED_REF`, `E_SOURCE_MISMATCH`, `E_SOURCE_FORMAT` and `E_PUBLISH`;
    - separates an empty `DIGEST_<ID>` (workflow wiring) from a digest mismatch (rerun);
    - gives the manual reviewed route for a blocked new upstream file.
  - A unit test (selected by AC-US1-3) fails if the table misses a code emitted by the maintainer modules or if the template drifts from `renderMarker`.
  - The duplicated branch-PR queries are now one `branchPulls` helper, and `upstream-candidates.mjs` no longer re-exports `isSha`, `isVersion` or `repoSlug`.
- [X] T052 Rerun the targeted selectors, then `npm run check` once on the corrected candidate, and update the acceptance evidence counts.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T004)**.
- **US4 (T005–T010)** depends on Setup only. US1 needs it because candidates run
  `sync --bump` and must then pass `sync --check`. It is implemented first despite being
  P3.
- **US1 (T011–T021)** depends on Foundational and US4. This is the MVP.
- **US2 (T022–T023)** depends on US1's detect, plan and package/publish pipeline.
- **US3 (T024–T029)** depends on US1. T026 and T028 (triggers) depend on nothing else and
  can be done at any time after Setup.
- **Polish (T030–T032)** depends on every story.
- **Review 1 fixes (T033–T041)** depend on the completed candidate. T033 and T034 come
  before T036. T041 runs last.
- **Review 2 fixes (T042–T048)** depend on review 1 fixes. T048 runs last.
- **Review 3 fixes (T049–T052)** depend on review 2 fixes. T052 runs last.
- Within each story, the tests come first and their red evidence is recorded before
  implementation.

### Parallel opportunities

- T004 can run alongside T003.
- T010 can run alongside T006–T009.
- Within US1, tests T011, T012 and T013 run in parallel (different files). T019, T020 and
  T021 run in parallel with T014–T018.
- Within US3, tests T024, T025 and T026 run in parallel. T029 runs in parallel with T027
  and T028.

## Implementation Strategy

1. Do Setup, Foundational and US4 first. This removes the vetted-constant prerequisite
   (R-VETTED-PINS) and stands on its own as a maintainer improvement.
2. Deliver US1 as the MVP: validated draft Spec Kit PRs with the security split.
3. Add US2 (ATV), then US3 (lifecycle and triggers).
4. Polish, then `/baton-review` and the PR-review gate. Merging, the preview run and the
   first live run happen only after human approval.

## Acceptance Registry

<!-- Register checks before implementation. Match handoff acceptance_checks.
Capture red evidence after writing each story's tests and before implementing it.
A pattern-filtered run counts only if its evidence shows at least one test executed.
Do not weaken checks. -->

| ID | Story | Check | Kind | Expect initial | Initial evidence | Final evidence |
|----|-------|-------|------|----------------|------------------|----------------|
| AC-US4-1 | US4 | node --test test/unit/sync-bump.test.mjs | command | fail | | |
| AC-US4-2 | US4 | quickstart §2 in a scratch clone: `sync --bump atv=<newer main commit>`, then `sync --check`, `lock verify` and `build --check` all pass, and an invalid pin fails with a clean `git status` | manual | fail | | |
| AC-US1-1 | US1 | node --test --test-name-pattern="upstream candidates (formats\|speckit)" test/unit/upstream-candidates.test.mjs | command | fail | | |
| AC-US1-2 | US1 | node --test --test-name-pattern="upstream upgrade publish" test/integration/upstream-upgrade.test.mjs | command | fail | | |
| AC-US1-3 | US1 | node --test --test-name-pattern="upstream watch workflow" test/unit/maintainer-workflows.test.mjs | command | fail | | |
| AC-US2-1 | US2 | node --test --test-name-pattern="upstream candidates atv" test/unit/upstream-candidates.test.mjs | command | fail | | |
| AC-US3-1 | US3 | node --test --test-name-pattern="upstream candidates lifecycle" test/unit/upstream-candidates.test.mjs | command | fail | | |
| AC-US3-2 | US3 | node --test --test-name-pattern="upstream upgrade lifecycle" test/integration/upstream-upgrade.test.mjs | command | fail | | |
| AC-US3-3 | US3 | node --test --test-name-pattern="ready_for_review" test/unit/maintainer-workflows.test.mjs | command | fail | | |

### Acceptance evidence

Red evidence was captured after each story's tests were written. AC-US1-2 and AC-US3-2
are the exception: their red runs were captured after implementation by temporarily
moving `src/maintainer/upstream-upgrade.mjs` aside. That is recorded as such and not
claimed as a pre-code run. Every selector ran a nonzero number of tests (analysis C3).
No registered command, expectation or assertion was weakened.

AC-US4-2 ran in a scratch clone outside the repository, with the uncommitted feature
tree applied. Nothing was pushed or committed to this repository. ATV `main` had not
advanced past the pinned `ad996736b879be87c7755df5c5017d5336203bbc`, so the bump used
its parent `ac6d611fe425308a9e47328f5708f6729b05af22`. Every Spec Kit release newer than
1.0.11 that was tried (1.1.3, 1.2.4) failed with `E_DANGLING_REF`: the
`speckit-taskstoissues` skill references `speckit-github-taskstoissues`, which is outside
the `issues` pack closure. Each failure left the tree unchanged. That is an upstream
compatibility blocker, which the workflow would report, not a defect in this feature.

Post-merge operational evidence, not claimed here (analysis C2, E1):

- SC-007, a run finishing within 30 minutes;
- the live preview and candidate behavior (SC-001, quickstart §3–4).

| Check | Result and evidence |
|-------|---------------------|
| AC-US4-1 | Red: 1/1 failed because `parseBump` was not exported from `src/commands/sync.mjs` before T007; Green: 10 tests, 10 pass, 0 fail. |
| AC-US4-2 | Red: on main `ae34a99`, `sync --bump atv=ac6d611…` wrote the lock, then `sync --check` exited 1 with `E_UPSTREAM_VERIFY` ("Lock pins differ from the vetted Spec Kit/ATV refs"); Green: on the feature tree the same bump, then `sync --check`, `lock verify` and `build --check` all exit 0, the diff touches only `baton.lock.json` and `docs/reference/upstream-diff.md` with no `src/` edit, and `atv=<unknown 40-hex>` (`E_UPSTREAM_VERIFY`) and `speckit=99.0.0` (unsatisfiable) both exit 1 with a clean `git status`. |
| AC-US1-1 | Red: the file failed with `ERR_MODULE_NOT_FOUND` for `src/lib/upstream-candidates.mjs`, before that module existed (T014); Green: 17 tests, 17 pass, 0 fail (15 before review 2; adds the tracked-path claim and base-tree cases). |
| AC-US1-2 | Red: 1/1 failed with module-not-found for `src/maintainer/upstream-upgrade.mjs`, captured after implementation with the module moved aside; Green: 13 tests, 13 pass, 0 fail (7 before review 1; adds remote-rejected push, report fallbacks and the `E_DANGLING_REF` report; 10 before review 2; adds per-upstream digests with an ATV draft PR, a PR opened after detection, and the generic `E_PUSH`). |
| AC-US1-3 | Red: 6 tests, 0 pass, 6 fail against the old workflow before T018; Green: 6 tests, 6 pass, 0 fail, including `runs-on: ubuntu-latest` per job. |
| AC-US2-1 | Red: the file failed with `ERR_MODULE_NOT_FOUND` for `src/lib/upstream-candidates.mjs`, the same pre-module red run as AC-US1-1 (before T014, T023); Green: 4 tests, 4 pass, 0 fail. |
| AC-US3-1 | Red: the file failed with `ERR_MODULE_NOT_FOUND` for `src/lib/upstream-candidates.mjs`, the same pre-module red run as AC-US1-1 (before T014, T027); Green: 8 tests, 8 pass, 0 fail (6 before review 1; adds the `E_PR_MARKER` case; 7 before review 2; adds the restored-marker case, and the marker case now covers closed PRs without title trust). |
| AC-US3-2 | Red: 1/1 failed with module-not-found for `src/maintainer/upstream-upgrade.mjs`, captured after implementation with the module moved aside; Green: 10 tests, 10 pass, 0 fail, including analysis C1 and C4 cases (7 before review 1; adds the truncated compare, the PR closed after detection, and the missing-marker case, which review 2 rewrote for FR-030 marker restoration). |
| AC-US3-3 | Red: 1 test, 0 pass, 1 fail before T028; Green: 1 test, 1 pass, 0 fail. |
