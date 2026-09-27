# Troubleshooting

Start with `node .baton/bin/baton.mjs doctor` and
`node .baton/bin/baton.mjs validate --json`; for one file use
`validate --path <path>`. `--github` emits CI annotations.
Exit 3 means a human gate or question; exit 4 means install/update
conflicts; exit 5 means a missing prerequisite or payload. Don't treat
these as success.

| Symptom | Check and remedy |
|---|---|
| Hooks do not fire | Check `.specify/extensions.yml` for the mandatory unconditional `speckit.baton.receive` and `speckit.baton.handoff` hooks, and run `doctor`. Use `/speckit-<command>` skills; `.github/hooks/` are a separate optional pack mechanism. CI's `baton.yml` validates even if local hooks were skipped. |
| `E_STALE_ARTIFACT` | Inspect the named file. Task checkbox changes are ignored for freshness, but task text and other artifact edits aren't. Re-run the producing phase, or record an intentional change with `handoff refresh --reason "<why>"`. |
| Gate pending / question open | Stop. Get configured role approval through `handoff approve --by "<role>" --via "<channel>"`, or resolve the exact question with `handoff answer`. Never fabricate an approval. |
| Windows script failure | Shell-based Spec Kit scripts need Git Bash or WSL. For an overlay, `init --script ps` or `--script py` regenerates the chosen script flavor through pinned Spec Kit; it requires `uv` and network access. |
| Malformed ATV agent | `E_FRONTMATTER_MALFORMED` detects a missing initial YAML delimiter/newline (notably ATV 2.6.3). Preview `init --repair` for the known signature; review conflicts instead of broadly rewriting user agents. |
| Model unavailable / `E_MODEL_NOT_ALLOWED` | A suggestion doesn't change the host model. Select an available model and adjust `models.roles`/`models.allowed`, or ask the project owner to do so; preview `models apply --dry-run` before touching managed agents. |
| Template cleanup cannot push | The workflow cannot push modifications under `.github/workflows/` with `GITHUB_TOKEN`. Run `baton adopt` locally; optionally `baton adopt --prune-workflows` locally after reviewing the dormant maintainer workflows. Do not use a PAT workaround. |
| `E_LOCK_MISMATCH`, `E_SYNC_DRIFT`, `E_DANGLING_REF` | Don't edit vendored files by hand. `lock verify` compares offline hashes; `sync --check` reproduces pins online and checks closure. Investigate a proposed bump and its diff before syncing. |
| `E_UPSTREAM_VERIFY` during `sync --check` | The generated upstream content differs from the locked snapshot; do not update the lock just to pass the check. For generated JSON registries and manifests, sync preserves committed bytes when the parsed content matches after retaining installation timestamps, regardless of object-key order. Added, removed or changed file hashes still fail verification. |
| `E_LICENSE` | The bundle or vendored snapshot lacks a compatible license or a required notice. Review the upstream LICENSE and the bundled-package inventory; do not suppress the check. |

## Restricted package mirrors

On a workstation that cannot reach public registries over TLS, use the
approved internal npm feed
`https://packagefeedproxy.microsoft.io/npm/` and PyPI feed
`https://packagefeedproxy.microsoft.io/pypi/simple/` **for local
validation only**. Do not commit mirror settings, disable TLS checks or
change the lockfile for this workaround. The internal npm mirror may be
missing `ignore@7.0.10`, which a tool's dependency graph requires:
`npm ci` can fail even though Baton's own dependencies are healthy.
The internal PyPI mirror may lack `specify-cli`, so `sync --check` and
Spec Kit script regeneration cannot run there. A cache miss is a feed
availability issue, not evidence that a pin should be changed.

When the approved feed cannot supply a pinned dependency, run the exact
hash-locked check in an ephemeral environment with authorized upstream
access, or use hosted CI as the authoritative gate. Never use bare
`uvx` to install an unverified `specify-cli` for sync. For a standalone
asset requiring installation payload, pass `--from` as described in
[updating](07-updating.md).
