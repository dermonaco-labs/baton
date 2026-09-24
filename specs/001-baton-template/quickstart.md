# Quickstart: Validation Scenarios

These scenarios are the executable acceptance path for `speckit-implement` and `baton-review`. Each one maps to a
user story and to the acceptance checks pre-registered in [tasks.md](./tasks.md) § Acceptance Registry. The commands
assume the Baton repo root, Node ≥ 20 and (for S5) `uv`.

## Local gate (run before every push)

```sh
npm ci
npm run check        # lint:md, lint:yaml, typecheck, build --check, lock verify, validate, test
```

### Maintainer environment note: registry-restricted workstations

Some maintainer workstations can't make TLS connections to `registry.npmjs.org` or PyPI (for example, because of a
corporate proxy). Don't disable TLS verification, and don't add a private registry or mirror to the repo. Instead,
run the registry-dependent steps (`npm ci`, `npm run check`, S1/S2/S5 and `uv pip install --require-hashes`) in an
ephemeral Linux container that has registry access, with the repo mounted:

```sh
docker run --rm -it -v "$PWD":/w -w /w node:20-bookworm bash -lc 'npm ci && npm run check'
```

Hosted CI (`ci.yml` and `smoke.yml`) is the authoritative gate. Steps that need no registry (`node .baton/bin/baton.mjs validate`
with the committed build, and the markdown and hash checks) can still run on the workstation.

## S1: Template instantiation (US1)

```sh
tmp=$(mktemp -d); git archive HEAD | tar -x -C "$tmp"; cd "$tmp"; git init -q
git add -A; git -c user.name=t -c user.email=t@t commit -qm base
BATON_FORCE_CLEANUP=1 node .baton/bin/baton.mjs adopt --no-workflows      # same call as template-cleanup.yml
test ! -e src && test ! -e test && test ! -e specs/001-baton-template && test ! -e package.json && test -d docs/baton
test -f .github/workflows/baton.yml && test -z "$(git status --porcelain -- .github/workflows)"   # workflows untouched
! grep -q 'Baton Constitution' .specify/memory/constitution.md                  # placeholder constitution
node .baton/bin/baton.mjs doctor --strict && node .baton/bin/baton.mjs validate
```

Expected results:

- Every command exits 0.
- `.baton/manifest.json` has `source: template` and the Baton version.
- `README.md` starts with the adopter README heading.
- `.github/workflows/` is unchanged (`GITHUB_TOKEN` can't push workflow changes), and `baton.yml` is present.
- Every other row of the plan.md "Template disposition" table holds (checked in detail by adopt.test, AC-US1-5).

## S2: Overlay onto existing repos (US2)

```sh
for f in empty has-instructions atv-263-broken; do
  d=$(mktemp -d); cp -R test/fixtures/repos/$f/. "$d"
  node .baton/bin/baton.mjs init --cwd "$d" --json > "$d.init.json"; echo "exit=$?"
  node .baton/bin/baton.mjs init --cwd "$d"; git -C "$d" status --porcelain   # expect empty (idempotent)
done
```

Expected results:

- `empty` exits 0.
- `has-instructions` exits 0, and the user bytes outside the BATON markers are unchanged (checked by comparing with the
  fixture's `expected/` copy).
- `atv-263-broken` exits 4 and reports `repairable` for the corrupted agents. `init --repair` then exits 0.

## S3: Relay handoffs (US3)

```sh
node .baton/bin/baton.mjs validate --path test/fixtures/handoffs/valid          # exit 0
for f in test/fixtures/handoffs/invalid/*.md; do
  node .baton/bin/baton.mjs validate --path "$f" --json | node -e "…expect code from filename…"
done
```

Each invalid fixture is named after the error it must produce. For example, `E_STALE_ARTIFACT.md` and
`E_BLOCKING_OPEN.md` must each fail with exactly that code.

Headless relay:

1. `handoff write --phase specify` gives `status: ready` and `gate.required: true` (clarify skipped).
2. `receive --phase plan` exits 3 (`E_GATE_PENDING`).
3. Run `approve --by "maintainer" --via "direct approval"`: `approved_by` is `maintainer via direct approval` and
   `approved_at` is today. `approve --by "@tester"` and `approve --by "Jane Doe"` fail with `E_APPROVER_FORMAT`
   (AC-US3-8).
4. `receive --phase plan` exits 0 and prints the `read_first` list.
5. Edit spec.md; `receive` now fails with `E_STALE_ARTIFACT`.
6. `refresh --reason test` makes `receive` exit 0 again.
7. Advance to `implement`, check one box in tasks.md, and run `receive --phase implement --mode converge`: it
   exits 0 (checkbox-insensitive hashing). Rewording a task makes it fail with `E_STALE_ARTIFACT` (AC-US3-7).
8. At compound, `write --phase compound` succeeds with either `docs/solutions/<x>.md` or a decision tagged
   `skip-compound`. With neither, it fails with `E_EXIT_UNMET`, and the evidence lists both members of
   `compound-recorded` (AC-US3-9).

Quick relay (AC-US3-10):

1. `handoff new --quick fix-typo --reason "typo in docs, no behaviour change"` writes `.baton/quick/fix-typo.md`
   (`phase_completed: none`, `next_phase: work`, a `quick-eligible` decision).
2. `receive --phase work --quick fix-typo` exits 0. `receive --phase work` on a feature baton fails with
   `E_LANE_MISMATCH`.
3. Commit a change, then run `write --phase work --quick fix-typo`, then run review with a findings file whose
   findings are all `fixed` or `dismissed`. `receive --phase land --quick fix-typo` exits 0.
4. In a second run, a review finding of new behaviour makes `write --phase review` fail with `E_LANE_ESCALATE`.
   `escalate --quick <slug>` then sets `next_phase: specify`. The first feature baton written with `--from-quick`
   lists the quick baton as `evidence`, and the quick baton ends as `status: done`.

## S4: Model routing (US4)

- `npm test -- --test-name-pattern=models` covers role resolution, `phase_roles` overrides and each
  `enforce` mode.
- `models apply --dry-run` lists only the managed agents. Running `apply` twice gives zero diff on the second run.

## S5: Update and upstream reproducibility (US5)

```sh
node .baton/bin/baton.mjs lock verify
node .baton/bin/baton.mjs sync --check                      # needs uv; reproduces the snapshot byte-for-byte
node --test test/integration/update.test.mjs                # prev-release fixture + one local edit
```

Expected results:

- The modified file is untouched.
- `.baton/conflicts/<path>.new` exists.
- The manifest shows the new version.

## S6: Manual coverage (US6)

- `node .baton/bin/baton.mjs validate` includes docs coverage, so a missing core item gives `E_UNDOCUMENTED`.
- Check the README visually on GitHub: hero, tagline, both quick starts, the Mermaid relay diagram and the credits
  link.

## S7: CI (US7)

- Push a branch and confirm that `ci / lint`, `ci / test`, `smoke (ubuntu-latest)` and `smoke (windows-latest)` are
  green and each is within the budget in [contracts/ci.md](./contracts/ci.md).
- A throwaway commit that breaks an agent's frontmatter must fail `lint` with a `::error … E_FRONTMATTER_MALFORMED`
  annotation. Revert it afterwards.
