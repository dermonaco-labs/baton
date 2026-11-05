# Research: Spec Kit 1.3.0 migration

**Feature**: `004-speckit-1-3-0-migration` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Method

Phase 0 ran empirically against the real upstream rather than release notes alone:

- Downloaded the `v1.3.0` source (tag commit `91261fdcf1738cb095a31ff5bee145f502e3af91`) and installed
  `specify-cli` 1.3.0 into a scratch virtual environment.
- Ran Baton's exact generator command (`specify init --here --integration copilot --script sh --force
  --ignore-agent-tools`, then `extension add --dev baton/speckit-extension` and `preset add --dev
  baton/speckit-preset`) and compared the tree with the committed 1.0.11 snapshot after newline normalization.
- Ran `specify extension add github` on separate copies rendered with `--script sh` and `--script ps`.
- Read the sync, pack-closure, init/update and feature 003 candidate-validation code paths.
- Consulted `repo-research-analyst` (repository conventions) and `learnings-researcher` (`docs/solutions/`), per
  constitution C2. Their findings are folded in under R11 and R12.

Scratch trees lived only under the system temp directory and are not part of the repository.

## R1 – Core 1.3.0 delta

**Decision**: Take the 1.3.0 core output as generated; no repair is needed.

**Findings**:

- `specify init` on 1.3.0 installs no extension by default, and no longer emits
  `.github/skills/speckit-taskstoissues/SKILL.md`. No other file is added or removed in the core tree.
  `.specify/memory/.constitution-template.json` and `.specify/scripts/bash/resolve-template.sh` already exist.
- Changed core files: `.specify/{.gitignore,init-options.json,integration.json}`,
  `.specify/extensions/.registry`, `.specify/presets/.registry`,
  `.specify/integrations/{copilot,speckit}.manifest.json`, `.specify/memory/constitution.md` (excluded from sync),
  `.specify/scripts/bash/{check-prerequisites,common,create-new-feature,setup-plan}.sh`,
  `.specify/workflows/workflow-registry.json`, and `.github/skills/speckit-specify/SKILL.md`.
- `.specify/templates/` and every other `speckit-*` skill are byte-identical after newline normalization.
- The core tree (core + Baton extension + preset) references `taskstoissues` nowhere, so core closure passes.

**Alternatives considered**: pinning an intermediate release (1.1.3–1.2.6). Rejected: the spec fixes the target at
1.3.0, and those releases carry the same closure failure (R4).

## R2 – Hook registration and dispatch (FR-005, SC-003)

**Decision**: Treat registration as verified; add a regression test for "exactly one mandatory Baton receive and
handoff entry per relay event" and for unchanged dispatch instructions in every phase skill.

**Findings**:

- The 1.3.0 `.specify/extensions.yml` produced with Baton's extension and preset is identical to the committed file
  after newline normalization. Every relay event keeps exactly one mandatory Baton entry (spec assumption A2; upstream
  #5219 does not change Baton's registration).
- Phase skills other than `speckit-specify` are unchanged, so their hook-dispatch text is unchanged. The only
  `speckit-specify` change replaces "resolve the template through the preset stack" with a call to
  `.specify/scripts/bash/resolve-template.sh`; its hook sections are untouched.

**Alternatives considered**: a live agent run to observe dispatch. Rejected as non-deterministic; the generated
registration plus the unchanged skill text is the testable contract.

## R3 – The bundled `github` extension

**Decision**: The `issues` pack ships the full installed `github` extension payload, sourced from a separate
generated tree, without registering the extension in the adopter's Spec Kit registries.

**Findings** (`specify extension add github`, bundled extension version 1.0.5, offline):

- Adds `.github/skills/speckit-github-taskstoissues/SKILL.md` and `.specify/extensions/github/{extension.yml,
  README.md, commands/speckit.github.taskstoissues.md, scripts/bash/resolve-tasks.sh,
  scripts/powershell/resolve-tasks.ps1, scripts/python/resolve_tasks.py}`.
- Also edits `.specify/extensions.yml` (adds `installed: [github]`, `hooks: {}`) and
  `.specify/extensions/.registry` (adds a `github` entry with `installed_at`). It registers no hooks.
- The rendered skill calls only the flavour script (`scripts/bash/resolve-tasks.sh` for `--script sh`,
  `scripts/powershell/resolve-tasks.ps1` for `--script ps`); the sh and ps renderings differ in that one line.
  The scripts are self-contained.
- The skill refers to `/speckit-converge` (core) and `/speckit-git-commit` (already an `excluded:C5` optional
  reference in `packs/core.yml`, inherited through `requires: [core]`).
- `requires.tools`: `git` and `github-mcp-server`, the same prerequisites as the 1.0.11 skill.
- The six extension files are copied bytes with LF line endings. The rendered skill is generated text: on Windows,
  Spec Kit writes it with CRLF. Sync adds it to `generatedText`, which normalizes CRLF to LF, as it already does for
  the Baton hook skills. Lock hashes stay raw integrity hashes over the stored LF bytes; this follows
  `docs/solutions/crlf-normalized-ownership-hashing-2026-09-29.md`.

**Why a separate tree**: `prepareEntries` in `src/commands/sync.mjs` adds every file under the generated `.specify/`
to `core`. Adding the extension to the core generation would put the extension files, the changed registry and the
changed `extensions.yml` into `core`, violating FR-009 and touching feature 003's trusted roots.

**Why no registration**: registering would change the `core`-owned `.specify/extensions/.registry` and
`.specify/extensions.yml` for every adopter, or require pack-conditional merging of those trusted files. The skill
does not consult the registry. Consequence: `specify extension list` does not show `github`. This is documented.

**Why all three scripts**: they are the upstream extension's installed payload, the skill needs the flavour
matching the adopter's install, and shipping all of them keeps the payload byte-identical to an upstream install.

**Alternatives considered**:

- Register `github` in the core generation. Rejected (FR-009, FR-010).
- Ship only `resolve-tasks.sh`. Rejected: PowerShell and Python adopters would get a skill pointing at a script
  their flavour does not use (R6).
- Reimplement issue creation in Baton. Rejected by Q1 (A+) and FR-007.

## R4 – Closure failure in 1.1.3–1.2.x

**Decision**: The fix is the `issues` pack content change; no closure-algorithm change.

**Finding**: In 1.1.3–1.2.x the deprecated core `speckit-taskstoissues` skill points to
`speckit-github-taskstoissues`, which no Baton pack shipped, so `referenceClosure` raised `E_DANGLING_REF`
(feature 003 risk). In 1.3.0 the deprecated skill is gone. After the change, the wrapper's reference to
`/speckit-github-taskstoissues` resolves inside `issues`, and the extension skill's references resolve in
`issues` + `core`.

`pinnedNames` must also learn names from the extension tree, so that closure recognises
`speckit-github-taskstoissues` as an upstream name.

## R5 – Compatibility wrapper (FR-007)

**Decision**: Author `baton/skills/speckit-taskstoissues/SKILL.md` and list it in `packs/issues.yml` as
`{ from: baton, path: .github/skills/speckit-taskstoissues/SKILL.md }`.

**Findings**:

- For `from: baton`, sync first looks in the generated tree; 1.3.0 no longer generates that path, so it falls back to
  `baton/skills/<name>/SKILL.md` and records an authored entry (no lock row, since the lock `upstream` enum has no
  `baton`). Init and update install pack files without lock rows from `packs/<pack>/files/<path>` with owner `baton`.
- The wrapper's body:
  1. checks that `.github/skills/speckit-github-taskstoissues/SKILL.md` exists;
  2. if it is missing, stops with a message naming `/speckit-github-taskstoissues` and the `issues` pack;
  3. otherwise delegates to `/speckit-github-taskstoissues` with the user's arguments.
  It holds no issue-creation steps and no GitHub tool names.
- A future Spec Kit could again generate a file at the wrapper's path, and sync would then prefer it. That is
  already safe without a new guard: the upgrade automation rejects it (`newPathIssue`: "tracked in the base tree
  without a base lock row"), and a manual bump shows a new Spec Kit lock row for the path in review.

**Stale files (FR-011)**: the 1.0.11 `issues` pack managed exactly one file,
`.github/skills/speckit-taskstoissues/SKILL.md` (`packs/issues/files/` contains only it). The wrapper occupies the
same path, so update replaces an unmodified copy in place, and existing conflict handling keeps a modified copy.
**No residual manual removal exists**; the CHANGELOG says so. The new extension files are additions.

## R6 – Script flavours for PowerShell and Python installs

**Decision**: Extend init's existing flavour step to the `github` extension: when the generated ps/py project is
prepared and the `issues` pack is selected, also run `specify extension add github` in it. Treat any Spec Kit file
that calls a `scripts/bash/` path under `.specify/` (core or extension) as flavour-dependent.

**Finding**: `flavouredBytes` in `src/commands/init.mjs` swaps a locked Spec Kit file for its flavour-specific
rendering only when the file contains `.specify/scripts/bash/`. The 1.0.11 issues skill matched that rule; the
extension skill calls `.specify/extensions/github/scripts/bash/resolve-tasks.sh`, which does not. Without this change
a ps/py adopter of the `issues` pack would regress to a bash-only command.

This preserves today's install outcome for each flavour. It is not an update-behavior change in the sense of Q2/X:
there is no new removal, replacement or conflict rule.

## R7 – Feature 003 trusted-base bindings (FR-010, SC-006)

**Decision**: Keep every existing binding unchanged, and make the new extension rows trusted with a narrowing-only
addition to `isTrusted` in `src/lib/candidate-bindings.mjs`. A stored path is also trusted when:

- (a) its install target, from `targetOf`, starts with a `BOUND_ROOTS` entry (`.specify/extensions/`,
  `.specify/presets/`); or
- (b) a base- or candidate-lock row for it carries the provenance key `x-speckit-extension`.

Add `x-speckit-extension` to `FROZEN_FIELDS`.

**Findings**:

- `BOUND_ROOTS` are compared with the *stored* path. Pack files are stored at
  `packs/issues/files/.specify/extensions/github/...`, so without the change they would be ordinary Spec Kit rows
  that a Spec Kit candidate may regenerate (`pathPolicyIssue` allows rows owned by the candidate upstream). That
  would grant the automation new permission, which FR-010 forbids.
- With (a), any change, deletion or new file under an extension or preset install root fails with "manual review",
  whatever pack stores it. With (b), the rendered extension skill (installed under `.github/skills/`) is bound too.
- New rows must have exactly `ROW_KEYS` (`ownRowIssue`), so a candidate cannot add a row carrying the key, and
  key-set changes are already rejected.
- The wrapper has no lock row; `pathPolicyIssue` rejects it as "not a locked upstream output". It is already
  outside the automation's allowed outputs.

**Interpretation of SC-006, recorded as a decision**: the bindings for every currently trusted path and their
results are unchanged, existing tests pass unmodified, and no path joins the automation's allowed regenerated
outputs. The allowed set only shrinks: the old `issues` skill row becomes the authored wrapper, and the new extension
rows are trusted.

**Alternatives considered**:

- A distinct lock `upstream` value such as `speckit-github`. Rejected: it changes the lock schema enum and the pin,
  diff and owner mapping across sync, init and the automation.
- Forbidding `packs/*/files/.specify/` in `STORED_PREFIX`. Rejected: it would also block legitimate future Spec Kit
  pack rows and does not cover the skill.

## R8 – Pack definition change

**Decision**: Add an optional `extension` field to the pack file schema (`baton/schemas/pack.schema.json`), allowed
only with `from: speckit` and only the value `github`. `sourceFor` routes such entries to the extension tree, and
`add` accepts that tree as the expected base. Lock rows record `upstream: speckit`, `upstream_path` = the path in the
extension tree, and `x-speckit-extension: github`.

**Alternatives considered**: a new `from: speckit-github` source. Rejected for the same reasons as the separate
upstream id in R7.

## R9 – Generator environment and the package mirror

**Decision**: Run the bump (`sync --bump speckit=1.3.0`, which compiles hash-locked requirements with `uv`) and
`sync --check` where public PyPI is reachable: a Linux container or hosted CI. This is the procedure in
`CONTRIBUTING.md`.

**Finding**: the approved internal mirror on the maintainer laptop does not serve `specify-cli==1.3.0`; public PyPI
does (HTTP 200). The same mirror gap occurred for 1.0.11 (`docs/solutions/restricted-mirror-env-only-2026-09-29.md`).
Mirror settings stay in the process environment, with no tracked `.npmrc`, `uv.toml` or `pip.conf`. A local
"no version found" failure is recorded as a feed-availability limit, not a red assertion; hosted CI is the
authoritative gate.

## R10 – Version-bearing files and documentation

**Decision**: Update every place that names 1.0.11 as the current pin; leave historical feature records unchanged.

- Generated by sync: `baton.lock.json`, `baton/upstream/specify-cli.requirements.{in,txt}`,
  `docs/reference/upstream-diff.md`, the `.specify/` snapshot and the `packs/issues/files/` payload.
- Hand-maintained: `README.md` (badge, workflow line, packs table, vendored-components line), `CONTRIBUTING.md`
  (current-pins line and mirror example), `CHANGELOG.md` (an **Upstream** subsection),
  `docs/reference/skills.md` (`issues` row), `docs/06-packs-and-customization.md` if it lists `issues` contents,
  `src/commands/adopt.mjs` (hard-coded manifest `upstreams.speckit`), `THIRD_PARTY_NOTICES.md` if it names the
  version, and the `skip` message in `test/integration/init.test.mjs`.
- Unchanged: `speckit_version: ">=1.0.11,<2.0.0"` in the Baton extension and preset already includes 1.3.0
  (FR-004). Historical records in `specs/001-*` and `specs/003-*` stay as written, with one exception:
  `specs/001-baton-template/contracts/packs.md`. It is the live pack contract and a sync input, because its excluded
  table feeds closure, so its `issues` row and its Spec Kit version line are updated. Its excluded table is unchanged.
  `docs/07-updating.md` describes the bump generically and needs no change.

## R11 – Repository conventions (repo-research-analyst)

See the "Repository conventions" section in [plan.md](plan.md#repository-conventions), which records the analyst's
findings with citations.

## R12 – Prior learnings (learnings-researcher)

See the "Prior learnings" section in [plan.md](plan.md#prior-learnings).

## Open items

None blocking. The owner's Q1/Q2 answers cover the design choices. R6 (flavour parity) and R7 (narrowing trust)
are recorded as plan decisions for review at the pre-code gate.
