---

description: "Task list for the Spec Kit 1.3.0 migration"
---

# Tasks: Spec Kit 1.3.0 migration

**Input**: Design documents from `specs/004-speckit-1-3-0-migration/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Required. FR-014 asks for regression tests, and constitution principle V asks for tests written first.
Each test task must fail before its implementation task, unless the Acceptance Registry marks it `n/a` as a
regression guard.

**Organization**: Tasks are grouped by user story. One ordering constraint crosses stories: the 1.0.11 generator has
no `github` extension (it arrived in 1.0.13), and 1.3.0 no longer generates the old `issues` source. The `issues`
pack repoint and the pin bump must therefore land together, in US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story from spec.md (US1, US2, US3)

## Path conventions

Single-project CLI: `src/`, `test/`, `baton/`, `packs/` at the repository root (see plan.md "Project Structure").

---

## Phase 1: Setup

**Purpose**: Preserve inputs that the bump removes, and confirm the generator environment.

- [X] T001 Copy the 1.0.11 `issues` skill bytes from `packs/issues/files/.github/skills/speckit-taskstoissues/SKILL.md`
  to the new fixture `test/fixtures/speckit-1.0.11/speckit-taskstoissues/SKILL.md`. Copy the bytes exactly, keep LF,
  and record the source commit `0f68b07` in a sibling `test/fixtures/speckit-1.0.11/README.md`. The update test in
  T029 needs these bytes after the bump deletes the original.
- [ ] T002 Confirm the generator environment for the bump (research R9). Use a Linux container or hosted CI with
  public PyPI. Set mirrors only through environment variables (`UV_DEFAULT_INDEX`, `npm_config_registry`), never in
  tracked files. If the approved local mirror lacks `specify-cli==1.3.0`, record the exact local error as
  unavailable tooling in the implement handoff evidence.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Teach the pack schema, sync and the feature 003 bindings about the extension tree. Use fake trees
offline. Nothing here changes the pin or any vendored byte.

**⚠️ CRITICAL**: US1 (bump) cannot pass closure or `sync --check` until this phase is complete.

### Tests (write first; they must fail)

- [X] T003 [P] Add pack-schema cases to `test/unit/schema.test.mjs`, following the negative-case style at lines
  50-56. Cases:
  - Accept `{ from: speckit, extension: github, path: ... }`.
  - Reject `extension: gitlab`. The rule is "enum `github`; no other value".
  - Reject `extension: github` with `from: baton`, and with `from: atv`. The rule is "allowed only when
    `from: speckit`".
  - Confirm that every shipped `packs/*.yml` still validates.
- [X] T004 [P] Add extension-tree sync cases to `test/unit/sync.test.mjs`. Use fake trees in the style of lines
  11-110: a core tree, plus an extension tree that also holds the seven `github` files. Assert:
  - Entries marked `extension: github` are read from the extension tree. Their lock rows have `upstream: speckit`,
    `upstream_path` equal to the extension-tree path, `stored_at: packs/issues/files/<path>`, `packs: ["issues"]`,
    `repair: null`, `license: MIT` and `x-speckit-extension: github`.
  - No `core` entry has a path under `.specify/extensions/github/`, or the skill `speckit-github-taskstoissues`,
    even though the extension tree contains them (FR-009).
  - The `core` `.specify/extensions.yml` and `.specify/extensions/.registry` rows come from the core tree. The
    extension tree's edited copies are ignored.
  - An `extension: github` source that is missing, or is a symlink, raises `E_UPSTREAM_VERIFY`, and nothing is
    written.
  - A CRLF rendered `.github/skills/speckit-github-taskstoissues/SKILL.md` is stored and hashed as LF.
  - `pinnedNames` includes `speckit-github-taskstoissues`.
- [X] T005 [P] Add trust-narrowing cases to `test/unit/upstream-candidates.test.mjs` as **new tests only**. Do not
  edit any existing test or fixture. Assert that a Spec Kit candidate is rejected for manual review when it:
  - changes, deletes or adds a stored path `packs/issues/files/.specify/extensions/github/...` (install target under
    `BOUND_ROOTS`);
  - changes the `x-speckit-extension` row `packs/issues/files/.github/skills/speckit-github-taskstoissues/SKILL.md`;
  - adds `x-speckit-extension` to a row, or removes it (`FROZEN_FIELDS`);
  - adds a lock row at `packs/issues/files/.github/skills/speckit-taskstoissues/SKILL.md` (the wrapper path). This
    must fail through the existing "not a locked upstream output" or "tracked in base tree without base lock row"
    paths.

  Also assert that a regenerated ordinary core row (for example `.specify/scripts/bash/common.sh`) is still
  accepted.

### Implementation

- [X] T006 [P] In `baton/schemas/pack.schema.json` `$defs.file`, add the optional property `extension`
  (`enum: ["github"]`). Add an `if`/`then` conditional so that `extension` requires `from: speckit`. Keep
  `additionalProperties: false`. Makes T003 pass.
- [X] T007 In `src/lib/upstream.mjs`, add an extension-tree step next to `prepareSpeckit` (lines 58-89):
  1. Copy the generated core project to a sibling directory in the same work directory.
  2. Run the verified `specify` binary with `extension add github` there, offline, using the bundled wheel
     extension.
  3. On failure, raise `E_UPSTREAM_VERIFY` with no output written.
  4. Return the tree path.

  Leave the core project untouched (research R3, contract `contracts/sync-github-extension.md`).
- [X] T008 In `src/commands/sync.mjs`, depends on T006 and T007:
  - Add `extension?: 'github'` to the `PackFile` typedef (line 17).
  - Pass the extension tree through `SyncDeps` (lines 364-368) so tests can inject it.
  - Make `sourceFor` and the `add` base check route `extension: github` entries to the extension tree.
  - Write `x-speckit-extension: github` on their lock rows.
  - Make `pinnedNames` collect names from the extension tree.
  - Add the rendered extension skill to `generatedText` so CRLF is normalized to LF.
  - Keep `prepareEntries` core sourcing unchanged.

  Makes T004 pass.
- [X] T009 [P] In `src/lib/candidate-bindings.mjs`, make `isTrusted` (around lines 108-109) also return true when
  either:
  - `targetOf(storedPath).path` starts with a `BOUND_ROOTS` entry; or
  - a base- or candidate-lock row for `storedPath` carries `x-speckit-extension`.

  In `src/lib/upstream-candidates.mjs`, add `x-speckit-extension` to `FROZEN_FIELDS` (around line 49). Do not change
  any existing condition. Makes T005 pass, and existing tests in the file must still pass unmodified (SC-006).

**Checkpoint**: `node --test test/unit/schema.test.mjs test/unit/sync.test.mjs test/unit/upstream-candidates.test.mjs`
is green. The pin is still 1.0.11, and `sync --check` still passes.

---

## Phase 3: User Story 1 - Maintainer bumps Baton to Spec Kit 1.3.0 (Priority: P1) 🎯 MVP

**Goal**: The pin, lock, requirements, snapshot and `issues` payload reflect 1.3.0, and closure and reproducibility
pass.

**Independent Test**: In a clean checkout, `sync --check` and `lock verify` report 0 differences. The lock names
`1.3.0` / `v1.3.0` / `91261fdcf1738cb095a31ff5bee145f502e3af91`, and no pack reports `E_DANGLING_REF`.

### Tests

- [X] T010 [P] [US1] Add a test to `test/unit/packs.test.mjs` that loads the shipped `packs/issues.yml` and its
  stored files. Assert `validatePackClosure` for `issues` returns `[]`. Also assert that removing
  `.github/skills/speckit-github-taskstoissues/SKILL.md` from the contents yields `E_DANGLING_REF` for the wrapper's
  reference. Fails until T012-T014 land. The existing "each shipped pack has a closed dependency set" test (lines
  22-41) stays unchanged and covers `core`.

### Implementation

- [X] T011 [US1] Author the wrapper `baton/skills/speckit-taskstoissues/SKILL.md`, following
  `baton/skills/speckit-optimize-tokens/SKILL.md` as the pattern:
  - Frontmatter: `name: speckit-taskstoissues`, plus a `description` naming it a compatibility alias for
    `/speckit-github-taskstoissues`.
  - Body, per `contracts/issues-pack.md` "Wrapper behavior":
    1. Check for `.github/skills/speckit-github-taskstoissues/SKILL.md`.
    2. If it is absent, stop with the exact message: "`/speckit-github-taskstoissues` is not installed. Install
       Baton's `issues` pack, which ships Spec Kit's `github` extension; `/speckit-taskstoissues` only delegates to
       it."
    3. Otherwise run `/speckit-github-taskstoissues` with the user's arguments unchanged.
  - Exclusions: no issue-creation steps, no `issue_write`, `list_issues` or `gh issue`, and no script invocation.
  - Must pass `npm run lint:md`, which covers `baton/**/*.md`.
- [X] T012 [US1] Rewrite `packs/issues.yml` exactly as in data-model.md "Pack file entry":
  - seven `{ from: speckit, extension: github, path: ... }` entries;
  - the `{ from: baton, path: .github/skills/speckit-taskstoissues/SKILL.md }` wrapper entry;
  - the description "Opt-in GitHub issue creation from tasks.md (Spec Kit github extension)."

  `requires: [core]` and `conflicts: []` stay unchanged.
- [ ] T013 [US1] In the T002 generator environment, run `node .baton/bin/baton.mjs sync --bump speckit=1.3.0`.
  Depends on T008, T011 and T012. Commit the regenerated files:
  - `baton.lock.json`
  - `baton/upstream/specify-cli.requirements.{in,txt}`
  - the `.specify/` snapshot and `.github/skills/speckit-specify/SKILL.md`
  - `packs/issues/files/` (seven extension files plus the wrapper)
  - `docs/reference/upstream-diff.md`

  Verify that the lock's `upstreams.speckit` matches data-model.md "Spec Kit pin", the old `issues` skill row is
  gone, and the seven rows carry `x-speckit-extension: github`.
- [ ] T014 [US1] Update the byte-identical mirror `baton/templates/specify.gitignore` from the regenerated
  `.specify/.gitignore`. `test/unit/payload.test.mjs` lines 8-23 enforce the match; sync does not update this file.
- [X] T015 [P] [US1] In `src/commands/adopt.mjs` line 105, change the hard-coded manifest
  `upstreams: { speckit: '1.0.11@8147943' }` to `'1.3.0@91261fd'`. Update any `test/integration/adopt.test.mjs`
  assertion that names the old value.
- [ ] T016 [US1] Run `node .baton/bin/baton.mjs sync --check`, `lock verify` and `validate` in the generator
  environment. All report 0 differences (SC-001). Record the outputs as evidence.

**Checkpoint**: The pin is 1.3.0, and the tree is reproducible and closed. US1 is deliverable on its own as a bump
whose `issues` pack follows the extension.

---

## Phase 4: User Story 2 - Adopter relay keeps working on 1.3.0 (Priority: P1)

**Goal**: Each relay event still has exactly one mandatory Baton receive or handoff hook. A core-only install has no
issue-creation files.

**Independent Test**: In a fresh install on 1.3.0, the hook registry and phase skills give one Baton hook per event,
`doctor` reports no new errors, and core-only installs contain no `github` or wrapper files.

### Tests

- [ ] T017 [P] [US2] Create `test/unit/relay-hooks.test.mjs`. Parse `.specify/extensions.yml` and assert that each of
  the 14 events `before_`/`after_` × `specify`, `clarify`, `plan`, `tasks`, `analyze`, `implement`, `converge` has
  exactly one entry with `extension: baton`, `optional: false`, `enabled` not `false` and `condition` empty. The
  command is `speckit.baton.receive` for `before_*` and `speckit.baton.handoff` for `after_*` (FR-005, SC-003).
  Also assert that each `.github/skills/speckit-<phase>/SKILL.md` references both `hooks.before_<phase>` and
  `hooks.after_<phase>`, and that `installed` has no `github` entry.
- [ ] T018 [P] [US2] In `test/integration/init.test.mjs`, add a core-only install test. After `init` with no packs,
  these must not exist:
  - `.github/skills/speckit-taskstoissues/`
  - `.github/skills/speckit-github-taskstoissues/`
  - `.specify/extensions/github/`

  Also:
  - `.specify/extensions.yml` and `.specify/extensions/.registry` contain no `github` key.
  - No manifest row has pack `issues`.
  - `doctor --json` exits 0 with no new error (FR-009, FR-014, SC-005).

### Implementation

- [ ] T019 [US2] Run T017 and T018 against the bumped tree. No production change is expected (research R2). If
  either fails, stop and record a blocking question in the baton rather than editing upstream bytes
  (principle IV).

**Checkpoint**: The relay hook contract and core-only surface are pinned by tests.

---

## Phase 5: User Story 3 - Issue creation stays opt-in and keeps its command (Priority: P2)

**Goal**: An `issues` install exposes both commands for every script flavour. The wrapper only delegates. Update
from 1.0.11 replaces the old skill in place.

**Independent Test**: `init --packs issues` installs the wrapper and the seven extension files with recorded
provenance. The wrapper contract holds, the `ps` flavour references existing scripts, and update from a 1.0.11
`issues` install leaves no orphan.

### Tests

- [ ] T020 [P] [US3] In `test/integration/init.test.mjs`, add an `issues` install test. After
  `init --packs issues`:
  - The wrapper is installed with manifest owner `baton` and pack `issues`.
  - The seven extension files are installed with owner `speckit` and pack `issues`, and their bytes equal
    `packs/issues/files/<path>` and the lock `sha256`.
  - `.specify/extensions.yml` and `.specify/extensions/.registry` bytes equal a core-only install's.
- [ ] T021 [P] [US3] Create `test/unit/issues-wrapper.test.mjs` for the wrapper contract. Read
  `packs/issues/files/.github/skills/speckit-taskstoissues/SKILL.md` and assert:
  - its bytes equal `baton/skills/speckit-taskstoissues/SKILL.md`;
  - frontmatter `name: speckit-taskstoissues`;
  - exactly one skill reference, `/speckit-github-taskstoissues`;
  - the exact missing-command message from T011, which names the `issues` pack;
  - no `issue_write`, `list_issues`, `gh issue`, `scripts/` or `.sh`/`.ps1`/`.py` invocation (FR-007).
- [ ] T022 [P] [US3] Extend the live test "F39 live init --script ps..." in `test/integration/init.test.mjs`
  (lines 335-352):
  - Widen `scriptReference` (line 323) to also match `.specify/extensions/<name>/scripts/<flavour>/<file>`.
  - Add a sibling live test that runs `init --script ps --packs issues`. Assert that the installed
    `speckit-github-taskstoissues` skill references `scripts/powershell/resolve-tasks.ps1`, not the bash script,
    and that `missing` is `[]`.
  - Change both skip regexes and messages from `1\.0\.11` to `1\.3\.0`. They skip only when
    `GITHUB_ACTIONS !== 'true'`.
- [ ] T023 [P] [US3] Add a 1.0.11-to-1.3.0 update test to `test/integration/update.test.mjs`:
  - Install with `--packs issues`. Then simulate the 1.0.11 state: write the T001 fixture bytes at
    `.github/skills/speckit-taskstoissues/SKILL.md`, set its manifest row to owner `speckit` with the fixture's
    sha256, and remove the seven extension files and their rows.
  - Run `update`. The unmodified case is replaced in place by the wrapper with owner `baton`. The seven files are
    added. No `W_REMOVED_UPSTREAM` is reported for the wrapper path, and no orphan remains.
  - In a second case, edit the fixture copy first. `update` keeps the edited file and reports a conflict with a
    `.new` copy.

  This is existing behavior (FR-011, Q2 = X). The test name must contain `issues`.
- [ ] T024 [P] [US3] Extend "F99 core.autocrlf checkout..." in `test/integration/update.test.mjs` (lines 137-170),
  or add a sibling test using `--packs issues`. Add `.github/skills/speckit-taskstoissues/SKILL.md` and
  `.github/skills/speckit-github-taskstoissues/SKILL.md` to `paths`, so CRLF checkouts stay owned through doctor,
  update and uninstall. A sibling test's name must contain `issues`.

### Implementation

- [ ] T025 [US3] In `src/commands/init.mjs`, change the ps/py flavour path (around lines 148-230) so that, when the
  resolved packs include `issues`, it also runs `extension add github` in the flavour project. Use the T007 helper.
  Generalize `flavouredBytes` (lines 57-60) to match any Spec Kit file referencing
  `.specify/(extensions/<name>/)?scripts/bash/`. Keep the `sh` path and update logic unchanged (research R6).
  Makes T022 pass.
- [ ] T026 [US3] Run T020, T021, T023 and T024 against the bumped tree. No update-logic change is allowed. If T023
  shows a behavior other than in-place replace or conflict, stop and raise a blocking question.

**Checkpoint**: All three stories pass independently.

---

## Phase 6: Polish & cross-cutting concerns

- [ ] T027 [P] Add a `CHANGELOG.md` entry under **Upstream** (FR-011, FR-012, SC-007) stating:
  - Spec Kit 1.0.11 → 1.3.0 with tag and commit.
  - `/speckit-taskstoissues` is now a compatibility wrapper over `/speckit-github-taskstoissues`.
  - The `issues` pack now ships Spec Kit's `github` extension.
  - `issues` adopters need no manual removal: the wrapper replaces the old skill in place, and a locally modified
    copy appears as a conflict.
  - `specify extension list` does not show `github`.
  - Adopters who installed `github` themselves will see managed-file conflicts.
  - `core` is unchanged.
- [ ] T028 [P] Update the public docs (FR-013) to 1.3.0 and the new `issues` contents:
  - `README.md`: badge at line 15, line 90, packs table at line 425, vendored components at line 653.
  - `CONTRIBUTING.md` lines 29 and 121.
  - `THIRD_PARTY_NOTICES.md` line 14: the commit-pinned license link moves to `91261fd…`.
  - `docs/reference/skills.md` line 140: the `issues` row lists both commands.
  - `docs/06-packs-and-customization.md` line 17.
  - `specs/001-baton-template/contracts/packs.md` lines 67 and 126: the `issues` row and the version line only; the
    excluded table is unchanged.
- [ ] T029 Show that the existing feature 003 tests are unchanged (SC-006). Run
  `git diff 0f68b07 -- test/unit/upstream-candidates.test.mjs` and confirm it shows only added lines. Run
  `git diff 0f68b07 -- src/lib/candidate-bindings.mjs src/lib/upstream-candidates.mjs` and confirm it shows only the
  T009 additions.
- [ ] T030 Run `npm run check` (SC-002). Run it in the generator environment, or record the local mirror limit and
  cite the hosted CI run of the branch.
- [ ] T031 Run the [quickstart.md](quickstart.md) steps 1-6 and attach the outputs as evidence. Extract the
  reviewed 1.0.11 → 1.3.0 diff summary from `docs/reference/upstream-diff.md` for the PR body (FR-015). Do not open,
  merge or tag a PR here; landing belongs to `/baton-land`.

---

## Dependencies & execution order

### Phase dependencies

- Setup (T001-T002): no dependencies. T001 must run before T013 deletes the source bytes.
- Foundational (T003-T009): blocks US1.
- US1 (T010-T016): depends on Foundational. T013 depends on T008, T011 and T012. T014, T015 and T016 follow T013.
- US2 (T017-T019): T017 and T018 can be written any time. Their final run (T019) needs T013.
- US3 (T020-T026): tests can be written after T012. T025 depends on T007. T026 needs T013 and T025.
- Polish (T027-T031): after all stories.

### Within each story

Write tests first and see them fail; regression guards marked `n/a` in the registry are the exception. Then
implement, then run the checkpoint.

### Parallel opportunities

- T003, T004 and T005 run together (different test files). T006 and T009 run together.
- T017 and T018 can run in parallel with US1 implementation.
- T020-T024 run together (different files or independent test blocks).
- T027 and T028 run together.

## Parallel example: Foundational

```text
Task: "Pack schema cases in test/unit/schema.test.mjs" (T003)
Task: "Extension-tree sync cases in test/unit/sync.test.mjs" (T004)
Task: "Trust-narrowing cases in test/unit/upstream-candidates.test.mjs" (T005)
```

## Implementation strategy

1. Setup, then Foundational (offline, still on 1.0.11).
2. US1: author the wrapper, repoint `issues` and bump in the generator environment. This is the MVP: reproducible
   1.3.0 with closure.
3. US2: pin the relay-hook and core-only guarantees.
4. US3: the `issues` install surface, flavours, update path and CRLF.
5. Polish: CHANGELOG, docs, SC-006 diff, `npm run check`, quickstart.

## Notes

- Never edit vendored upstream bytes by hand. Never widen feature 003's allowed outputs.
- Never merge, tag, release, change settings or dispatch workflows.

## Acceptance Registry

<!-- Keep these rows in sync with the handoff acceptance_checks. -->

| ID | Story | Check (command, test ID or manual steps) | Kind (`command`, `test-id`, `manual`) | Expect initial (`fail` or `n/a`) | Initial evidence | Final evidence |
|---|---|---|---|---|---|---|
| AC-US1-1 | US1 | node --test test/unit/packs.test.mjs | command | fail | | |
| AC-US1-2 | US1 | node --test test/unit/schema.test.mjs test/unit/sync.test.mjs test/unit/upstream-candidates.test.mjs | command | fail | | |
| AC-US1-3 | US1 | quickstart §1-§2 in the generator environment: sync --bump speckit=1.3.0, then sync --check, lock verify and validate report 0 differences; lock upstreams.speckit is 1.3.0 / v1.3.0 / 91261fdcf1738cb095a31ff5bee145f502e3af91 | manual | fail | | |
| AC-US1-4 | US1 | npm run check (generator environment or hosted CI run of the branch) | command | n/a | | |
| AC-US2-1 | US2 | node --test test/unit/relay-hooks.test.mjs | command | n/a | | |
| AC-US2-2 | US2 | node --test --test-name-pattern="core-only" test/integration/init.test.mjs | command | n/a | | |
| AC-US3-1 | US3 | node --test test/unit/issues-wrapper.test.mjs | command | fail | | |
| AC-US3-2 | US3 | node --test --test-name-pattern="issues" test/integration/init.test.mjs | command | fail | | |
| AC-US3-3 | US3 | node --test --test-name-pattern="issues" test/integration/update.test.mjs | command | fail | | |
| AC-US3-4 | US3 | git diff 0f68b07 -- test/unit/upstream-candidates.test.mjs shows only added lines (SC-006) | manual | n/a | | |

`n/a` rationale:

- AC-US1-4: the full gate is green on 1.0.11 today and must stay green, so it has no red baseline.
- AC-US2-1 and AC-US2-2: regression guards for behavior that already holds on 1.0.11 (research R2). They must stay
  green across the bump.
- AC-US3-4: a diff property of the final tree, with no meaningful pre-implementation run.
