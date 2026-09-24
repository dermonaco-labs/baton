# Quickstart: Validation Scenarios

These scenarios are the executable acceptance path for `speckit-implement` and `baton-review`. Each one maps to a
user story and to the acceptance checks pre-registered in [tasks.md](./tasks.md) § Acceptance Registry. The commands
assume the Baton repo root, Node ≥ 20 and (for S5) `uv`.

## Local gate (run before every push)

```sh
npm ci
npm run check        # lint:md, lint:yaml, typecheck, build --check, lock verify, validate, test
```

## S1: Template instantiation (US1)

```sh
tmp=$(mktemp -d); git archive HEAD | tar -x -C "$tmp"; cd "$tmp"; git init -q
BATON_FORCE_CLEANUP=1 node .baton/bin/baton.mjs adopt
test ! -e src && test ! -e test && test ! -e specs/001-baton-template && test -d docs/baton
node .baton/bin/baton.mjs doctor --strict && node .baton/bin/baton.mjs validate
```

Expected results:

- Every command exits 0.
- `.baton/manifest.json` has `source: template` and the Baton version.
- `README.md` starts with the adopter README heading.

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
3. Run `approve --by tester`.
4. `receive --phase plan` exits 0 and prints the `read_first` list.
5. Edit spec.md; `receive` now fails with `E_STALE_ARTIFACT`.
6. `refresh --reason test` makes `receive` exit 0 again.

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
