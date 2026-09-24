# Tasks: Baton Template

**Input**: Design documents from `specs/001-baton-template/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required. Principle V says acceptance checks are pre-registered, so each story phase starts with tests
that MUST fail first. Every check below is also listed in the Acceptance Registry.

**Format**: `[ID] [P?] [Story] Description`. `[P]` marks tasks that can run in parallel because they touch different
files and have no unfinished dependencies. Paths are repo-relative.

**Implementer notes**:

- Upstream files are never hand-edited. They come only from `baton sync`.
- Use `registry.npmjs.org`, never a private registry. `.npmrc` pins the public registry.
- Run `npm run check` before every commit once T006 exists.
- When a decision isn't covered by these docs, **stop, don't choose**: add it to `handoff.md` `open_questions` and ask.
- Task IDs are stable. T095–T099 were added by the analyze pass (see `analysis.md`), and T100–T102 by post-analyze
  amendment A1–A3 (role-only approvals, check groups, quick lane). They sit in the phase where they belong, so IDs are
  not in numeric order inside a phase.
- Maintainers on a workstation that can't reach `registry.npmjs.org` or PyPI over TLS run registry-dependent
  validation in an ephemeral Linux container, plus hosted CI (quickstart § Local gate). Never disable TLS.

## Phase 1: Setup

- [x] T001 Create `package.json`:
  - name `baton`, `"type": "module"`, `engines.node >=20`, `bin: { "baton": ".baton/bin/baton.mjs" }`
  - scripts `build`, `check`, `lint:md`, `lint:yaml`, `typecheck`, `test`
  - deps `ajv@8`, `ajv-formats`, `yaml@2`; devDeps `esbuild`, `typescript`, `markdownlint-cli2`, `@types/node`

  Also create `.npmrc` (`registry=https://registry.npmjs.org/`) and generate `package-lock.json`.
- [x] T002 [P] Create `tsconfig.json` (`checkJs`, `strict`, `noEmit`, `module: nodenext`), `.editorconfig`, `.gitattributes`
  (`* text=auto eol=lf`), and `.gitignore` (node_modules, `.baton/conflicts/`, `.atv/observations*`).
- [x] T003 [P] Create `.markdownlint-cli2.jsonc` and `.yamllint.yml`. Lint only Baton-authored paths, and ignore vendored
  upstream files, which are checked by the frontmatter validator instead.
- [x] T004 [P] Create `src/cli.mjs` (command router, global flags, and exit codes per `contracts/cli.md`) and
  `src/lib/report.mjs` (human, `--json` and `--github` output).
- [x] T005 [P] Create `src/commands/build.mjs`:
  - esbuild (dynamic import, dev-only) bundles `src/cli.mjs` into `.baton/bin/baton.mjs` plus `.sha256`
  - `--check` compares the bundle with a fresh build (`E_BUNDLE_STALE`)
  - the bundle must stay under 400 KB
  - write the esbuild metafile and derive the license inventory of every bundled npm package (including transitive
    ones such as `fast-uri`, `fast-deep-equal`, `json-schema-traverse` and `require-from-string`); fail with
    `E_LICENSE` when a package is missing from `THIRD_PARTY_NOTICES.md` or isn't MIT-compatible (FR-061)
- [x] T006 [P] Create `test/helpers/` (temp repo factory, fixture copy, `runCli()`), and wire the `check` script to run
  lint, typecheck, `build --check`, `lock verify`, `validate` and `test`.

## Phase 2: Foundational (blocks all stories)

- [x] T007 [P] `baton/schemas/handoff.schema.json`: every field and conditional rule in data-model §1 (draft 2020-12,
  `additionalProperties: false`, `x-*` allowed), including the Actor/Approver patterns of §1.1 (T100) and `phase_completed: none`.
- [x] T008 [P] `baton/schemas/phases.schema.json` and `config.schema.json` (data-model §2–3), including check
  expressions (§2.1), `lane`/`by_lane` (§2.2), and the `gates`/`denylist` config blocks (T100–T102 add the
  behaviour).
- [x] T009 [P] `baton/schemas/pack.schema.json`, `lock.schema.json` and `manifest.schema.json` (data-model §4–6).
- [x] T010 [P] `baton/schemas/skill-frontmatter.schema.json` and `agent-frontmatter.schema.json` (data-model §7).
  Unknown keys produce a warning.
- [x] T097 [P] `baton/schemas/findings.schema.json` (data-model §8: severities P0–P3, disposition, blocking rule) and a
  fixture pair (valid/invalid) under `test/fixtures/findings/`.
- [x] T011 [P] `src/lib/frontmatter.mjs`: detect frontmatter at byte 0, parse YAML 1.2 and round-trip the body.
  Raise `E_FRONTMATTER_MALFORMED` when there is a single-line, no-newline file (the ATV 2.6.3 signature).
- [x] T012 [P] `src/lib/schema.mjs`: an ajv 2020 registry that compiles all schemas once and maps errors to JSON
  pointers and fix hints.
- [x] T013 [P] `src/lib/hash.mjs`: sha256 of the raw bytes, plus a helper to hash a file list.
- [x] T014 [P] `src/lib/markers.mjs`: insert or replace `<!-- BATON:START -->…<!-- BATON:END -->` and leave every byte
  outside the markers untouched. If an unbalanced marker is detected, it's an error.
- [x] T015 `src/lib/manifest.mjs`: read and write `.baton/manifest.json`, detect user-modified files, and track marker
  sections.
- [x] T016 `src/lib/packs.mjs`: load `packs/*.yml`, resolve the `requires` closure, enforce `conflicts`, and always
  include `core`.
- [x] T017 `src/lib/phases.mjs`: load `.baton/phases.yml` over the built-in defaults, validate it, raise
  `W_WEAKENED_CONTRACT`, and provide the check registry interface.
- [x] T018 [P] Unit tests for T011–T014 in `test/unit/{frontmatter,schema,hash,markers}.test.mjs`.
- [ ] T019 [P] Unit tests for T015–T017 in `test/unit/{manifest,packs,phases}.test.mjs`. Include the SC-003 test:
  every feature-lane phase in the default `phases.yml` has ≥ 1 entry check and ≥ 1 exit check (`brainstorm` is
  exempt from entry).
- [ ] T020 Write `packs/core.yml`, the ten optional packs and `packs/repairs.yml`, exactly as in `contracts/packs.md`.
  Every core entry has a `role`. Every `optional_refs` entry has a `reason` and a `note`, and the A6 additions
  (`review-plus`: code-simplicity-reviewer, performance-oracle, data-integrity-guardian, pattern-recognition-specialist;
  `design`: design-iterator) are included, as in `contracts/packs.md` § Reference classification at the pin.
- [x] T021 Create the `baton/speckit-extension/` skeleton:
  - `extension.yml` defines the commands `speckit.baton.receive` and `speckit.baton.handoff`
  - mandatory (`optional: false`, no `condition`) `before_*` and `after_*` hooks for specify, clarify, plan, tasks,
    analyze, implement and converge
  - stub command files that call `node .baton/bin/baton.mjs handoff receive|write --phase <p>`
- [x] T022 [P] Create the `baton/speckit-preset/` preset `baton-templates`. It is **append-only**:
  - The tasks template gets a `## Acceptance Registry` table.
  - The plan template gets a Phase 0 note to invoke `repo-research-analyst` and `learnings-researcher`, and a
    `## Handoff` pointer section.
- [ ] T096 `baton/upstream/specify-cli.requirements.in` (`specify-cli==1.0.11`) and the generated
  `baton/upstream/specify-cli.requirements.txt` (`uv pip compile --generate-hashes --python-version 3.11`), plus its
  sha256 in `baton.lock.json` (`requirements_sha256`). `lock verify` checks it.
- [ ] T023 `src/lib/upstream.mjs`:
  - Create a temp venv, run `uv pip install --require-hashes -r baton/upstream/specify-cli.requirements.txt` (T096),
    then `specify init --here --integration copilot --script <s> --force --ignore-agent-tools` in a temp dir. No bare
    `uvx`: every wheel, including transitive ones, is hash-checked (constitution II, research R4).
  - `git fetch --depth 1 https://github.com/All-The-Vibes/ATV-StarterKit <commit>` into a temp repo and verify that the
    fetched commit id and its tree id equal the lock (`E_UPSTREAM_VERIFY`). No codeload tarballs: their bytes aren't
    stable.
  - Never execute ATV code.
- [ ] T024 `src/lib/repairs.mjs`: declared mechanical repairs, currently only the frontmatter newline restoration
  for known-corrupted ATV agents. Verify each result by re-parsing it, and detect no-op repairs (`repair: none`).
- [ ] T025 `src/commands/sync.mjs`:
  - In the temp Spec Kit project, install the Baton extension and preset (`specify extension add --dev`,
    `specify preset add --dev`).
  - Copy the curated `.specify/` and `.github/skills` files and the ATV pack files: `core` to the installed paths,
    optional packs to `packs/<id>/files/<installed path>` (FR-053). Record `stored_at` per file.
  - Back up `.specify/memory/constitution.md` before the copy and restore it afterwards.
  - Write `baton.lock.json` (provenance, sha256_upstream, sha256, license, repair, packs) and
    `docs/reference/upstream-diff.md`.
  - Support `--check`, which writes nothing and raises `E_SYNC_DRIFT`.
- [ ] T026 Closure and license checks in sync:
  - Run the per-pack reference scan from `contracts/packs.md` § Closure rules (including dispatched agents) and
    raise `E_DANGLING_REF`. Test in `test/unit/packs.test.mjs`: every shipped pack is closed over itself plus its
    `requires`, and a `docs-review` fixture without `adversarial-document-reviewer` fails with `E_DANGLING_REF`
    (AC-US2-4). **The test must fail first.**
  - A6 reasons and scanner precision (packs.md closure rules 1, 5, 6): validate each `optional_refs.reason`
    (`upstream-absent` checked against the materialized pinned trees, `pack-provided:<id>` against `packs/`,
    `excluded:C<n>` against § Excluded) and compute recommended packs. `packs.test.mjs` cases: shipped `core` closes
    with its reasoned `optional_refs` (incl. `linting-agent`, `compound`, `research`); a fixture entry without
    `reason`, with `pack-provided:nope`, or with `upstream-absent` for a name present at the pin fails
    `E_DANGLING_REF`; backticked `@tool` / `@font-face` are not references; a backticked `performance-oracle` in a
    list is one (AC-US2-5). **The test must fail first.**
  - Check upstream LICENSE files and raise `E_LICENSE`.
  - Decide from the closure result whether `brainstorming` joins `core` (#29).
  - Record the result in research.md R6.
- [ ] T027 `src/commands/lock.mjs`: `lock verify`, which works offline and raises `E_LOCK_MISMATCH`.
- [ ] T028 Run the first `baton sync` with the Spec Kit 1.0.11 and ATV `ad99673` pins. Commit the materialized
  `.specify/` (constitution preserved), `.github/skills/`, `.github/agents/`, `baton.lock.json` and the Spec Kit
  SPECKIT instruction block. `sync --check` must be clean.
- [ ] T029 Verify three upstream facts at the pins and record them in research.md:
  - the exact `.specify/extensions.yml` format produced by `specify extension add`
  - that the Baton hooks are mandatory and unconditional
  - whether `ce-review` degrades gracefully when personas are missing
  - that `ce-review mode:headless` returns the structured findings that T042 normalizes (R13; re-check at the pin)

  If ce-review does not degrade gracefully, add the needed personas to core only if SC-002 still holds. Otherwise
  **stop and ask**.

**Checkpoint**: The CLI builds, the schemas compile, the upstream snapshot is reproducible, and every story can start.

## Phase 3: User Story 3 — Relay a feature through validated handoffs (P1) 🎯 MVP

**Goal**: Every core phase receives and writes a validated baton, with gates, freshness and stop-don't-choose checks.
**Independent Test**: quickstart S3.

- [ ] T030 [P] [US3] Fixtures in `test/fixtures/handoffs/`: `valid/` (at least one per phase and lane) and
  `invalid/<CODE>.md` (one per baton error code in `contracts/handoff-contract.md`).
- [ ] T031 [P] [US3] `test/fixtures/features/sample/` (minimal spec, plan, research and tasks with an Acceptance
  Registry).
- [ ] T032 [P] [US3] `test/unit/validate-handoff.test.mjs`: valid fixtures pass, and each invalid fixture fails with
  exactly its code (AC-US3-1). **Must fail before T034–T036.**
- [ ] T033 [P] [US3] `test/integration/relay.test.mjs`: the headless relay from quickstart S3, covering the pending gate
  (exit 3), approve, stale artifact, refresh, `E_NO_PREREG` and `E_PR_MISSING` (AC-US3-2..5).
- [x] T098 [US3] Checkbox-insensitive `tasks.md` hashing in `src/lib/hash.mjs` (data-model §1 Hashing) with a test in
  `test/integration/relay.test.mjs`: checking a task box after `receive --phase implement` keeps the baton fresh, and
  rewording a task makes it stale (AC-US3-7). **The test must fail first.**
- [ ] T034 [US3] `src/lib/handoff.mjs`:
  - read and write batons, fill the deterministic fields (hashes, role, `suggested_model`, timestamps, commit)
  - FIFO history (≤ 20), body section order, and budgets
- [ ] T035 [US3] Implement every built-in check id from `contracts/phase-contracts.md` in `src/lib/phases.mjs`.
- [ ] T036 [US3] `src/commands/validate.mjs`: batons, phases, config, manifest, and skill and agent frontmatter.
  Supports `--changed` and `--path`, and emits the stable codes.
- [ ] T037 [US3] `src/commands/handoff.mjs`: new, show, receive, write (`--from-json`, `--next`, `--from-brainstorm`,
  `--analysis-from`, `--from-quick`, `--quick`), next, approve (`--by <role> --via <channel>`), answer, refresh,
  escalate, `init --infer` and migrate (a no-op for schema 1), as in `contracts/cli.md`.
  Branching and brainstorm rules follow `contracts/phase-contracts.md` § Transition rules.
- [x] T038 [P] [US3] `src/commands/status.mjs`: a table of all feature and quick batons.
- [x] T039 [P] [US3] `baton/templates/phases.yml` (the defaults, exactly as the phase table and the quick-lane table,
  with the `compound-recorded` group) and
  `baton/templates/handoff.md` (the body skeleton).
- [x] T040 [US3] Full prompts for `baton/speckit-extension/commands/{receive,handoff}.md`:
  - Keep them thin, and don't repeat upstream instructions.
  - `receive` loads exactly `read_first`, honours `do_not_read`, and stops on exit 3.
  - `handoff` fills the judgement fields through `--from-json`, applies stop-don't-choose, and prints
    `handoff next`.
  - After analyze, `handoff` persists the analyze report verbatim to `specs/<f>/analysis.md` (`--analysis-from`),
    because upstream `speckit-analyze` is read-only and its report exists only in the chat (R13).
- [x] T041 [P] [US3] `baton/skills/baton/SKILL.md`: status, the next step, starting a quick lane, gate approval
  guidance, and escalation.
- [x] T042 [P] [US3] `baton/skills/baton-review/SKILL.md`:
  - Take intent from spec, plan and tasks, and pass the installed persona list to ce-review.
  - Always call `ce-review mode:headless` (never interactive/autofix, so no `todo-create` side effects).
  - Normalize the structured findings into `specs/<f>/review.json` (quick lane: `.baton/quick/<slug>.review.json`)
    validated by `findings.schema.json` (T097). Store that path and the blocking count.
  - Map findings to tasks, or dismiss them with a reason.
  - Raise `E_LANE_ESCALATE` in the quick lane.
- [x] T043 [P] [US3] `baton/skills/baton-land/SKILL.md`:
  - Run `config.checks` and `validate` before any push, then delegate to `land`.
  - Record `pr.url` and never merge.
  - Suggest `/ce-compound`.
- [ ] T044 [US3] Quick-lane rules (normative: `contracts/phase-contracts.md` § Quick lane; the CLI and checks are T102):
  - batons live in `.baton/quick/<slug>.md`
  - a `ce-work` guard: the `baton` skill refuses to run `ce-work` on a feature that has tasks.md (conflict rule C3)
  - `handoff escalate` sets `next_phase: specify` with the reason and hands the quick baton to `/speckit-specify`;
    it never creates feature dirs (Spec Kit owns numbering)
- [ ] T100 [US3] Role-only actors and approvals (data-model §1.1, handoff-contract § denylist scan):
  - `config.gates.approver_roles`/`approval_channels` in `config.schema.json` and the default `config.yml`;
    Approver/Actor patterns in `handoff.schema.json`; the vocabulary check in `validate`
  - `approve --by "<role>" [--via "<channel>"]` sets `approved_by` and `approved_at` together; `answer --by "<role>"`
  - the `E_DENYLIST` scan (email, `@mention`, user-home paths, and the untracked terms file) over batons and
    Baton-authored files, with the exemptions from the contract
  - invalid fixtures `E_APPROVER_FORMAT.md`, `E_ACTOR_FORMAT.md` and `E_DENYLIST.md`, and a test that
    `approve --by "@x"`, `--by "Jane Doe"` and `--by "a@b.io"` are rejected while `--by "maintainer" --via
    "direct approval"` is accepted (AC-US3-8). **The test must fail first.**
  - A5 word grammar (data-model §1.1, words `[a-z]+(-[a-z]+)*`): `valid/` fixtures with
    `approved_by: "repository owner via control-plane delegation"` and `by: "human:repository-owner"`; invalid cases
    (in `validate-handoff.test.mjs`, all `E_APPROVER_FORMAT`) for a leading hyphen (`-maintainer`), a double hyphen
    (`control--plane delegation`), upper case (`Repository owner`) and `@` (`@maintainer`), plus `human:-owner` /
    `human:Owner` (`E_ACTOR_FORMAT`). The default `config.yml` vocabulary must compile against the phrase pattern
    (AC-US3-8).
- [x] T101 [US3] Check expressions (data-model §2.1): leaf/group grammar with `all_of`/`any_of` in
  `phases.schema.json`, the evaluator in `src/lib/phases.mjs` (all members evaluated, evidence per member), check keys,
  `E_CHECK_UNKNOWN`/`E_CHECK_GROUP`/`E_CHECK_KEY_DUP`, and `W_WEAKENED_CONTRACT` for a built-in moved into an
  `any_of`. The default compound exit is the `compound-recorded` group. Unit tests cover each code, and the relay
  test covers both compound alternatives plus the `E_EXIT_UNMET` member evidence (AC-US3-9). **The tests must fail
  first.**
- [ ] T102 [US3] Quick lane in the defaults and the CLI (phase-contracts § Quick lane, data-model §2.2): the `work`
  phase and `by_lane.quick` for review/land/compound in `baton/templates/phases.yml`; `handoff new --quick <slug>
  --reason`, `--quick <slug>` on show/receive/write/escalate, and `write --phase specify --from-quick`;
  `from-phase:none`, `decision:<tag>`, `no-feature-tasks`, `findings-fixed-or-dismissed` and `quick-scope-held`;
  `E_LANE_MISMATCH` and `W_QUICK_LARGE`; the quick relay from quickstart S3 in `relay.test.mjs`, including escalation
  and the rejected feature → quick transition (AC-US3-10). **The test must fail first.**
- [ ] T045 [US3] `baton/instructions/copilot-instructions.baton.md` (fewer than 80 lines, covering conflict rules C1–C13
  in short form). Apply it to `.github/copilot-instructions.md` with the SPECKIT block preserved.
- [ ] T046 [US3] Re-run `baton sync`. Verify that `.specify/extensions.yml` registers the mandatory Baton hooks for
  all seven commands and that the extension commands appear as `.github/skills/speckit-baton-*`.
- [ ] T047 [US3] Dogfood: `baton validate --path specs/001-baton-template/handoff.md` passes (AC-US3-6). Fix any drift
  between this plan and the implementation by amending the docs, not by weakening the validator.

**Checkpoint**: The relay works headlessly and in Copilot. This is the MVP.

## Phase 4: User Story 1 — Start from the template (P1)

**Goal**: "Use this template" gives a clean, valid Baton repo.
**Independent Test**: quickstart S1.

- [ ] T048 [P] [US1] `test/integration/adopt.test.mjs`: dev paths removed, docs moved, README replaced, manifest
  `source: template`, and the "cannot push" message (AC-US1-1, AC-US1-3).
- [x] T049 [P] [US1] `.baton/template-cleanup.yml`: the full plan.md "Template disposition" table (Remove, Replace,
  Move, Keep dormant, Keep active). Workflows are never in the Remove list. Also the
  `.baton/template-cleanup-pending` marker.
- [x] T050 [P] [US1] `baton/templates/README.adopter.md`: a short README for derived repos that links to `docs/baton/`.
- [ ] T095 [P] [US1] `baton/templates/workflows/baton.yml` (adopter CI per `contracts/ci.md`: `contents: read`,
  SHA-pinned, `validate --github` then `doctor`) and `baton/templates/gitignore.adopter`. Install `baton.yml` in the
  Baton repo itself and from `init` and `adopt` when absent; `doctor` warns `W_NO_ADOPTER_CI` when it's missing.
  adopt.test asserts it exists and validates in the derived repo (AC-US1-5).
- [ ] T051 [US1] `src/commands/adopt.mjs`:
  - remove the listed paths, move `docs/` to `docs/baton/` (keeping `brainstorms/` and `solutions/` at the top) and
    rewrite relative links
  - apply the Replace rows: adopter README, the placeholder constitution (`.specify/templates/constitution-template.md`),
    a fresh CHANGELOG and the `github-actions`-only `dependabot.yml`; merge `gitignore.adopter`; write the manifest
  - ensure `.github/workflows/baton.yml` exists (T095)
  - remove the marker; support `--dry-run`, `--no-workflows` (touch nothing under `.github/workflows/`) and
    `--prune-workflows` (delete the dormant maintainer workflows; local use)
  - refuse in the Baton source repo (`GITHUB_REPOSITORY`/`origin` is `dermonaco-labs/baton`) unless `BATON_FORCE_CLEANUP=1`
- [ ] T052 [US1] `.github/workflows/template-cleanup.yml`:
  - guard with `github.repository != 'dermonaco-labs/baton'` and the marker file
  - run `adopt --no-workflows` and commit as `github-actions[bot]` (`GITHUB_TOKEN` can't push workflow changes, R12)
  - the job summary tells the adopter they may run `baton adopt --prune-workflows` locally
  - if the push fails, fail with a message that says to run `baton adopt` locally
- [ ] T053 [US1] `src/commands/doctor.mjs`: every check in `contracts/cli.md` (hooks registered, misplaced setup steps,
  corrupted agents, prerequisites, integrity, and `W_PACK_RECOMMENDED` per packs.md rule 6, also emitted by
  `validate`). Supports `--strict` (which does not escalate `W_PACK_RECOMMENDED`).
- [ ] T054 [US1] Generate `.baton/manifest.json` and `.baton/config.yml` for the repo itself (`npm run manifest`),
  and add `docs/brainstorms/.gitkeep` and `docs/solutions/.gitkeep`. The repo's own `config.checks` runs
  `npm run check`. The smoke S1 script passes (AC-US1-2).

## Phase 5: User Story 2 — Overlay onto an existing repo (P1)

**Goal**: `init` installs core (plus any selected packs) safely and idempotently.
**Independent Test**: quickstart S2.

- [ ] T055 [P] [US2] `test/fixtures/repos/{empty,has-instructions,atv-263-broken}` and `test/fixtures/expected/*.txt`.
  The broken fixture is generated by a script (`test/fixtures/make-broken.mjs`) that strips newlines from two pinned
  ATV agents. Its provenance note sits next to it.
- [ ] T056 [P] [US2] `test/integration/init.test.mjs`: file sets, preserved user bytes, conflict report exit 4,
  `--repair`, idempotent rerun and `--packs core,learning` (AC-US2-1..3).
- [ ] T057 [US2] Payload resolution. `init` and `update` read the payload from the package root next to the bundle,
  which covers `npx github:` and derived repos. With the standalone release asset they need
  `--from <baton-template-vX.tar.gz>`, and they exit 5 with guidance if it's missing.
- [ ] T058 [US2] `src/commands/init.mjs`: install the pack closure, merge markers, write the manifest, never overwrite
  unmanaged or user-modified files, and support `--dry-run`.
- [ ] T059 [US2] Conflicts:
  - write `.baton/conflicts/<path>.new` and a report
  - support `--adopt-upstream <glob>` and `--keep <glob>`
  - make `--repair` fix known-corrupted ATV files (via T024)
- [ ] T060 [US2] Existing Spec Kit installs: preserve `.specify/memory`, `feature.json` and `specs/`, and offer the
  pinned template and script upgrade. `--script ps|py` regenerates the Spec Kit files through uv (exit 5 without uv).
- [ ] T061 [US2] Merge Copilot hook JSON (`learning` pack) by command string, without reordering or duplicating
  entries.
- [ ] T062 [US2] `src/commands/uninstall.mjs` plus a test. It keeps specs, brainstorms, solutions and the
  constitution.
- [ ] T063 [US2] Verify `npx --yes github:dermonaco-labs/baton#<branch> init --dry-run` on a scratch repo, and document
  the command in the README.

## Phase 6: User Story 4 — Model routing (P2)

**Goal**: Role-based, configurable model suggestions, with optional enforcement.
**Independent Test**: quickstart S4.

- [ ] T064 [US4] Check current docs.github.com for custom-agent frontmatter `model` support, and for how the CLI,
  VS Code and the coding agent treat it. Update research.md R7 and `apply_to_agents` guidance. If `model` is
  unsupported where it matters, **stop and ask** before building T067.
- [ ] T065 [P] [US4] `test/unit/models.test.mjs`: resolution, `phase_roles` overrides, `enforce` off/warn/error, and
  apply idempotency (AC-US4-1..3).
- [ ] T066 [US4] `src/lib/models.mjs`: resolution and `allowed` enforcement (`E_MODEL_NOT_ALLOWED`), wired into
  `validate` and `handoff write`.
- [ ] T067 [US4] `src/commands/models.mjs`: `models apply`, which touches only managed agents, supports `--dry-run`
  and is idempotent.
- [ ] T068 [US4] `handoff next` output (the command plus the role and model), and a commented `baton/templates/config.yml`
  that says the defaults are suggestions dated 2026-09.

## Phase 7: User Story 5 — Update safely (P2)

**Goal**: Reproducible upstream bumps, and adopter updates that never clobber local edits.
**Independent Test**: quickstart S5.

- [ ] T069 [P] [US5] `test/fixtures/prev-release/` and `test/integration/update.test.mjs` (AC-US5-2).
- [ ] T070 [US5] `src/commands/update.mjs`: update managed, unmodified files, skip and report the rest with a
  `.new` copy, and rewrite the manifest. `--to` re-invokes the pinned `npx`.
- [ ] T071 [US5] `sync --bump speckit=<v>|atv=<sha>` and a human-readable upstream diff summary for the PR body.
- [ ] T072 [US5] `.github/workflows/upstream-watch.yml` per `contracts/ci.md`. It keeps a single tracking issue and
  never pushes (AC-US5-3). It also runs `baton sync --check` (FR-072, AS3).
- [ ] T073 [P] [US5] `.github/ISSUE_TEMPLATE/upstream-bump.yml`.
- [ ] T074 [US5] Draft an issue for All-The-Vibes/ATV-StarterKit that asks for a release containing f0a86ef (the agent
  frontmatter fix), in `specs/001-baton-template/upstream-issue-draft.md`. It also lists the names referenced at the
  pin but absent upstream (A6): `linting-agent` (ce-work), `compound`, `research`, `cora-test-reviewer`,
  `every-style-editor` (ce-compound, best-practices-researcher) and `cso` (atv-security). **The owner files it.**
  Agents must not post to third-party repos.

## Phase 8: User Story 6 — Public manual (P2)

**Goal**: A newcomer can adopt, operate, customize and troubleshoot Baton from the docs alone.
**Independent Test**: quickstart S6.

- [ ] T075 [US6] Write the `README.md` hero:
  - the name, the tagline "Spec-driven relays for Copilot agents", and a one-paragraph pitch
  - badges (CI, release, license)
  - a "Use this template" link and the `npx … init` overlay command
  - the Mermaid relay diagram
  - "what's inside" (core pack counts), and links to the manual and the credits
- [ ] T076 [P] [US6] `docs/README.md` (index), `docs/01-what-and-why.md` and `docs/02-quickstart.md`.
- [ ] T077 [P] [US6] `docs/03-workflow.md` (both lanes, gates, roles and the full conflict rules) and
  `docs/04-handoffs.md` (anatomy, annotated example, fixing each error).
- [ ] T078 [P] [US6] `docs/05-model-routing.md` and `docs/06-packs-and-customization.md`.
- [ ] T079 [P] [US6] `docs/07-updating.md` (adopter and maintainer) and `docs/08-troubleshooting.md`.
- [ ] T080 [P] [US6] `docs/09-credits-and-licensing.md` and `THIRD_PARTY_NOTICES.md`:
  - full MIT texts and copyright lines for Spec Kit (GitHub, Inc.), ATV (All The Vibes), Compound Engineering
    (Every), awesome-copilot (GitHub), and every bundled npm package from the T005 license inventory (ajv, ajv-formats,
    yaml, fast-uri (BSD-3-Clause), fast-deep-equal, json-schema-traverse, require-from-string, …)
  - the exclusions and why (karpathy-guidelines: no license)
- [ ] T081 [P] [US6] `docs/reference/{commands,skills,agents,cli,schemas,error-codes}.md`: every core item with "when to
  use" and "hands off to", and every optional pack item.
- [ ] T082 [US6] Docs coverage check in `validate` (`E_UNDOCUMENTED`) plus a test (AC-US6-1). README visual review
  (AC-US6-2).

## Phase 9: User Story 7 — Cheap, meaningful CI (P3)

**Goal**: The same strict checks run locally and in CI, on free runners.
**Independent Test**: quickstart S7.

- [ ] T083 [US7] `.github/workflows/ci.yml` (lint and test jobs per `contracts/ci.md`, SHA-pinned, least privilege).
- [ ] T084 [US7] `.github/workflows/smoke.yml` (matrix ubuntu and windows, steps S1–S5, and `sync --check` behind a
  paths filter).
- [ ] T085 [US7] `.github/workflows/release.yml`:
  - preconditions: the tag matches the version, the CHANGELOG has an Upstream section, and the checks pass
  - assets plus `SHA256SUMS`, and attest-build-provenance
  - a `dry_run` dispatch (AC-US7-3)
- [ ] T086 [P] [US7] `.github/workflows/copilot-setup-steps.yml` (job `copilot-setup-steps`: node 20, uv,
  `specify-cli` from `uv pip install --require-hashes -r baton/upstream/specify-cli.requirements.txt` when that file
  exists, a documented project-defined dependency step (FR-032, e.g. `npm ci` when `package-lock.json` exists), and
  `baton doctor`).
- [ ] T087 [P] [US7] `.github/dependabot.yml` (github-actions and npm, weekly). Verify that every `uses:` is pinned
  by SHA with a version comment.
- [ ] T099 [US7] Guard every job of `ci.yml`, `smoke.yml`, `upstream-watch.yml` and `release.yml` with
  `if: github.repository == 'dermonaco-labs/baton'`. Add a validate check (Baton repo only) that fails when a maintainer
  workflow job lacks the guard, plus a test.
- [ ] T088 [US7] Push the branch, confirm green checks within budget (AC-US7-1), and confirm the broken-frontmatter
  annotation with a throwaway commit (AC-US7-2).

## Phase 10: Polish & Community

- [ ] T089 [P] `CONTRIBUTING.md`: setup, `npm run check` before push, how upstream bumps work, the maintainer release
  checklist, how to add a pack, and the registry-restricted workstation note (ephemeral Linux container plus hosted
  CI; never disable TLS).
- [ ] T090 [P] `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1, attributed), `SECURITY.md` (GitHub private
  vulnerability reporting, supported versions) and `SUPPORT.md`.
- [ ] T091 [P] `.github/ISSUE_TEMPLATE/{bug,feature,config}.yml`, `.github/pull_request_template.md` (checklist:
  check passes, CHANGELOG, baton valid, no upstream hand-edits) and `.github/CODEOWNERS` (the maintainer handle,
  removed by template cleanup).
- [ ] T092 `CHANGELOG.md`: Keep a Changelog, with `[Unreleased]` and a planned `0.1.0` that includes an Upstream
  subsection.
- [ ] T093 Run quickstart S1–S7 end to end, and record the evidence per acceptance check in the baton. Also run the timed
  newcomer walkthrough for SC-001 (template → first validated baton in ≤ 10 min, following only the README; AC-US1-4).
- [ ] T094 Write the baton `phase_completed: implement → next_phase: review` (`baton handoff write --phase implement`).
  Do not tag. Tagging `v0.1.0` is a human action after review and land.

## Acceptance Registry

| ID | Story | Check | Kind | Expect initial |
|---|---|---|---|---|
| AC-US1-1 | US1 | `node --test test/integration/adopt.test.mjs` | test-id | fail |
| AC-US1-2 | US1 | quickstart S1 script exits 0 | command | fail |
| AC-US1-3 | US1 | adopt.test "cannot push → run baton adopt" case | test-id | fail |
| AC-US1-4 | US1 | timed newcomer walkthrough ≤ 10 min (SC-001) | manual | n/a |
| AC-US1-5 | US1 | adopt.test "baton.yml installed, workflows untouched, constitution replaced" | test-id | fail |
| AC-US2-1 | US2 | `node --test test/integration/init.test.mjs` (fixtures + preserved bytes) | test-id | fail |
| AC-US2-2 | US2 | init.test "idempotent rerun" case | test-id | fail |
| AC-US2-3 | US2 | init.test "`--packs core,learning`" case | test-id | fail |
| AC-US2-4 | US2 | packs.test "per-pack closure; docs-review without adversarial-document-reviewer → E_DANGLING_REF" | test-id | fail |
| AC-US2-5 | US2 | packs.test "core closes with reasoned optional_refs; reason-less / unknown-pack / stale upstream-absent → E_DANGLING_REF; @ in code is not a ref" | test-id | fail |
| AC-US3-1 | US3 | `node --test test/unit/validate-handoff.test.mjs` | test-id | fail |
| AC-US3-2 | US3 | relay.test "gate pending exits 3" | test-id | fail |
| AC-US3-3 | US3 | relay.test "stale artifact then refresh" | test-id | fail |
| AC-US3-4 | US3 | relay.test "E_NO_PREREG before implement" | test-id | fail |
| AC-US3-5 | US3 | relay.test "land requires pr.url and checks" | test-id | fail |
| AC-US3-6 | US3 | `baton validate --path specs/001-baton-template/handoff.md` | command | fail |
| AC-US3-7 | US3 | relay.test "checked task stays fresh, reworded task is stale" | test-id | fail |
| AC-US3-8 | US3 | validate-handoff.test + relay.test "role-only approver incl. control-plane delegation; handle/email/name, bad hyphens and upper case rejected; denylist" | test-id | fail |
| AC-US3-9 | US3 | phases.test + relay.test "any_of compound: solution or skip-compound; group errors" | test-id | fail |
| AC-US3-10 | US3 | relay.test "quick relay new→work→review→land, escalate, feature→quick rejected" | test-id | fail |
| AC-US4-1 | US4 | models.test "role resolution + overrides" | test-id | fail |
| AC-US4-2 | US4 | models.test "enforce error → E_MODEL_NOT_ALLOWED" | test-id | fail |
| AC-US4-3 | US4 | models.test "apply idempotent, managed only" | test-id | fail |
| AC-US5-1 | US5 | `baton sync --check` | command | fail |
| AC-US5-2 | US5 | `node --test test/integration/update.test.mjs` | test-id | fail |
| AC-US5-3 | US5 | upstream-watch `workflow_dispatch` updates one issue, no push | manual | n/a |
| AC-US6-1 | US6 | validate.test "missing reference → E_UNDOCUMENTED" | test-id | fail |
| AC-US6-2 | US6 | README renders hero, both quick starts, diagram, credits | manual | n/a |
| AC-US7-1 | US7 | PR checks green within SC-007 budget | manual | n/a |
| AC-US7-2 | US7 | broken-frontmatter commit yields `E_FRONTMATTER_MALFORMED` annotation | manual | n/a |
| AC-US7-3 | US7 | release `dry_run` produces assets + SHA256SUMS | manual | n/a |

## Dependencies & Execution Order

- Setup (T001–T006) comes first. Foundational (T007–T029, T096, T097) blocks every story.
- **US3 → US1 → US2** is the P1 order. US1 and US2 reuse `validate` and `doctor` from US3 and US1.
- US4, US5 and US6 can run in parallel after US2.
- US7 (T083–T088, T099) can start after US1, but T088 needs everything before it.
- Polish comes last. T093 and T094 are final.
- Within a phase, tests come first (they must fail), then libs, then commands, then prompts, then the re-sync.

## Parallel Examples

- Foundational: T007–T014 and T018 run together, and T020–T022 run together after T016.
- US3: T030–T033 run together, then T034, then T035–T037. T038, T039, T041, T042 and T043 run in parallel with T037.
  T100 and T101 follow T034–T036, and T102 follows T037 and T101.
- US6: T076–T081 run in parallel after T075 (they share only the docs index).

## Implementation Strategy

1. **MVP** = Setup + Foundational + US3 + US1 (T001–T054 plus T095–T098 and T100–T102). At that point a derived repo runs the
   validated relay.
2. Then US2 (overlay), US4/US5/US6 in parallel, and US7 for CI.
3. After each checkpoint, run `npm run check`, commit (with the Co-authored-by trailer the owner requests) and update
   `handoff.md`.
4. Suggested models: implementation role (gpt-6-sol, high). Stop and hand back to the planning role for any spec
   amendment.
