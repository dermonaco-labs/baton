# Contributing to Baton

Baton is a template and a pinned, reproducible integration of Spec Kit and ATV.
Please open an issue to discuss changes to behavior or the public handoff contract
before implementing them. Features use the scoped `specs/<feature>/handoff.md`
relay; fixes without new behavior may use `.baton/quick/<slug>.md`.

## Local setup

Install Node.js 20 or newer and `uv`. Run `npm ci` and `npm run check`
before pushing. `npm run check` covers markdown and YAML lint, types, bundle
freshness, pinned snapshot reproduction, lock verification, validation, and tests. Use
`node .baton/bin/baton.mjs doctor` to diagnose prerequisites.

The source repository's formal phase check has a finite 600,000 ms budget:
the measured passing Windows test stage takes about 413 seconds. Per-check
`timeout_ms` accepts integers from 1 through 3,600,000; omission preserves the
300,000 ms default. This source-only override does not change adopter checks,
test selection, exit criteria or hosted job limits. Timed-out foreground
check trees are terminated by their owned PID (Windows) or process group
(POSIX); timeout and cleanup errors remain failures with captured output.
Check commands must stay in the foreground, not daemonize or reparent work.

Some managed workstations cannot reach public npm or PyPI over TLS. Use an
ephemeral Linux container with registry access and the checkout mounted, then
the hosted CI gate. Never disable TLS verification or commit private registry
settings. This repository's `.npmrc` intentionally uses the public registry.
Restricted mirrors may also lack locked pins (npm `ignore` version 7.0.10 and
`specify-cli==1.0.11` on PyPI). Run the available local checks, record the
missing-pin failures, and use hosted CI as the authoritative full gate; the
planned devcontainer (roadmap RM9) will offer a repeatable local fallback.

## Changing upstream inputs and packs

Never hand-edit `.specify/` materialized templates, vendored
`.github/skills/` or `.github/agents/`, or `packs/<id>/files/`. For upstream
bumps, change the immutable pin via `baton sync --bump speckit=<version>` or
`baton sync --bump atv=<commit>`, review the generated upstream diff, then run
`baton sync --check`, `baton lock verify`, and `npm run check`. Keep provenance
and all bundled dependency notices in `THIRD_PARTY_NOTICES.md`.

After editing Baton-owned extension sources under `baton/speckit-extension/`,
run `node .baton/bin/baton.mjs sync`, then `npm run manifest` and
`npm run build`. Do not update generated hooks or their digests by hand.
The root `baton.lock.json` records the pinned generator's outputs; its exact
Baton extension entries additionally record `x-baton-source` and the input
digest. These authored inputs are not immutable Spec Kit templates.
Generated hook skill text and hooks YAML are serialized with LF on every
host; copied upstream templates remain byte-identical. `sync --check`
reproduces and compares all outputs and provenance, and the source-manifest
test checks canonical manifest freshness. Both run in the normal local/PR gate.

To add a pack, declare its files, `requires`, `conflicts`, and reasoned
`optional_refs` in `packs/<id>.yml`; run sync to materialize it, then exercise
the per-pack closure and installer tests. Add a "when to use" and "hands off
to" entry to the public reference. Do not enlarge `core` without identifying
the relay role.

## Pull requests and releases

Include the task/acceptance evidence and relevant changelog entry. Keep all
GitHub Actions pinned by full SHA and source-repository guards on maintainer
jobs. An owner cuts a release only **after** review and land:

1. Confirm `npm run check`, `baton sync --check`, and CI are green.
2. Update `CHANGELOG.md` with the version and an **Upstream** subsection;
   verify the tag will match `package.json`.
3. Run the release workflow's `dry_run` manually and verify its assets,
   `SHA256SUMS`, and attestations.
4. Create and push the version tag. The tag-triggered workflow publishes
   the GitHub release; it never publishes to npm.
