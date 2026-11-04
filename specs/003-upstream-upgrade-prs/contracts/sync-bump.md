# Contract: `baton sync --bump` as one consistent operation

The maintainer CLI contract changes as follows (FR-006 to FR-008). Adopter-facing commands
are unchanged.

## Arguments

| Form | Meaning |
|------|---------|
| `sync` | Regenerate from the pins in `baton.lock.json` |
| `sync --check` | Same, and fail `E_SYNC_DRIFT` on any difference (unchanged) |
| `sync --bump speckit=<x.y.z>` | Re-pin Spec Kit to the commit that `refs/tags/v<x.y.z>` resolves to, and regenerate the hash-locked requirements (unchanged) |
| `sync --bump atv=<40-hex>` | Re-pin ATV to that commit. Records `ref: "main"`, `version: null` and no `tag` (main tracking). |
| `sync --bump atv=<x.y.z>` | **New.** Re-pin ATV to the commit that `refs/tags/v<x.y.z>` resolves to. Records `version`, `tag` and `ref: "v<x.y.z>"` (release tracking). |

The bump regex becomes `^(speckit=\d+\.\d+\.\d+|atv=(?:[0-9a-f]{40}|\d+\.\d+\.\d+))$`.
Any other value still fails `E_USAGE` with exit code 2.

## Pin source

- `baton.lock.json` is the only Spec Kit and ATV pin record.
- These are removed:
  - the constants `SPECKIT_VERSION`, `SPECKIT_COMMIT`, `ATV_COMMIT` and `ATV_TREE`;
  - the `E_UPSTREAM_VERIFY` "require an explicit --bump" comparison against them.
- `OPTIONAL_SOURCES` and its `lock verify` comparison are unchanged.
- A missing lock without `--check` fails with `E_SYNC_DRIFT` "baton.lock.json is
  required", since sync no longer falls back to constants. `--check` already fails that
  way.
- `lockFile` keeps the fields that maintainers own:
  - ATV `package` and `note`;
  - Spec Kit `init_args`.
  
  It no longer hard-codes `ref: 'main'`.

## Guarantees (unchanged unless stated otherwise)

- Every fetch is verified before use. Git sources are checked by commit and tree.
  Packages, including transitive ones, are checked by sha256 through hash-locked
  requirements.
- License checks, documented repairs and reference closure all still run.
- ATV code is never executed.
- After `sync --bump X` succeeds, running `sync --check`, `lock verify` and `build --check`
  on the result passes with no other edit (FR-006, SC-006).
- All verification finishes before the first file is written. On any failure:
  - the requirements files are restored;
  - no other file has been written;
  - the run exits with a stable code (FR-007).
- `x-bump-summary` lists the changed, added and removed vendored files (unchanged).
