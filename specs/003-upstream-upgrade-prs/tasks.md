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
    - it contains exactly one commit whose author and committer are `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>`, with the trailers `Baton-Upstream`, `Baton-Pin`, `Baton-Base` and `Baton-Content`;
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
| AC-US1-1 | Red: the file failed with `ERR_MODULE_NOT_FOUND` for `src/lib/upstream-candidates.mjs`, before that module existed (T014); Green: 15 tests, 15 pass, 0 fail. |
| AC-US1-2 | Red: 1/1 failed with module-not-found for `src/maintainer/upstream-upgrade.mjs`, captured after implementation with the module moved aside; Green: 7 tests, 7 pass, 0 fail. |
| AC-US1-3 | Red: 6 tests, 0 pass, 6 fail against the old workflow before T018; Green: 6 tests, 6 pass, 0 fail, including `runs-on: ubuntu-latest` per job. |
| AC-US2-1 | Red: the file failed with `ERR_MODULE_NOT_FOUND` for `src/lib/upstream-candidates.mjs`, the same pre-module red run as AC-US1-1 (before T014, T023); Green: 4 tests, 4 pass, 0 fail. |
| AC-US3-1 | Red: the file failed with `ERR_MODULE_NOT_FOUND` for `src/lib/upstream-candidates.mjs`, the same pre-module red run as AC-US1-1 (before T014, T027); Green: 6 tests, 6 pass, 0 fail. |
| AC-US3-2 | Red: 1/1 failed with module-not-found for `src/maintainer/upstream-upgrade.mjs`, captured after implementation with the module moved aside; Green: 7 tests, 7 pass, 0 fail, including analysis C1 and C4 cases. |
| AC-US3-3 | Red: 1 test, 0 pass, 1 fail before T028; Green: 1 test, 1 pass, 0 fail. |
