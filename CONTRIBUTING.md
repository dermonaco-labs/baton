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

### v0.1.0 release evidence

[Baton v0.1.0](https://github.com/dermonaco-labs/baton/releases/tag/v0.1.0)
(release ID `407861289`) was published at `2026-10-09T11:46:36Z`, neither
draft nor prerelease. Its immutable tag targets
`60064bfb1cde27b792603b78c3b36a22d28b9918`.
The actual tag is **lightweight**, created as a Git ref through the REST API;
the publication plan expected an annotated tag. This is a procedural
deviation, not evidence of an approved exception. The tag was not replaced
or moved.

All runs below completed successfully at that exact source commit, on attempt 1.

| Evidence | Event and ref | Public run |
|---|---|---|
| A3 release rehearsal | `workflow_dispatch`, `main` | [37922294825](https://github.com/dermonaco-labs/baton/actions/runs/37922294825) |
| A3 three-OS smoke | `workflow_dispatch`, `main` | [37922670598](https://github.com/dermonaco-labs/baton/actions/runs/37922670598) |
| A5 release publication | `push`, `v0.1.0` | [37925519452](https://github.com/dermonaco-labs/baton/actions/runs/37925519452) |
| A5 three-OS smoke | `push`, `v0.1.0` | [37925519366](https://github.com/dermonaco-labs/baton/actions/runs/37925519366) |
| A5 CI | `push`, `v0.1.0` | [37925520176](https://github.com/dermonaco-labs/baton/actions/runs/37925520176) |

Both smoke runs passed on Ubuntu, macOS and Windows: each job reported
`adopt: OK`, passed F39, and completed 129 tests with 129 passes and zero
failures, cancellations, skips or todos; no failed steps were observed.
The rehearsal skipped publication; the tag-push release published
successfully and skipped the dry-run upload as expected.

The release has **four attached assets**. They match the frozen A3
rehearsal bytes, and all three entries in `SHA256SUMS` were verified.

| Asset | Bytes | SHA-256 |
|---|---|---|
| `baton.mjs` | 407251 | `cb35d7f1df19e526a28d2e116fd42168f48924f03f7f9f115a642f3d848f7f84` |
| `baton-template-v0.1.0.tar.gz` | 844777 | `6cba481511e97943d698ac13854aca70eccef31452963e385251a026352b101c` |
| `baton.lock.json` | 62078 | `b28f9f3d3f85e4f805fb0cd6fdcea2c1ac6f97ac74eb3c819386540a09d29392` |
| `SHA256SUMS` | 253 | `bdad4261615b4baf94e3b11aaf113acc7316b5f551fb7097498080fd796290ab` |

Release notes are the **release body**, not a fifth attached asset. The
873-byte body matches the rehearsal notes, SHA-256
`118af30fa93970b1e59381ffb97adfd200b10d6a9bbd4afca9329a992841ff83`.
Both `baton.mjs` and the tarball have verified public tag-push provenance:
source commit above, `refs/tags/v0.1.0`, event `push`, Release run
`37925519452`, attempt 1, signer `release.yml@refs/tags/v0.1.0`.
The A3 attestations instead name `refs/heads/main` and
`workflow_dispatch`; they are distinct evidence, not tag-push provenance.
The tarball contains 392 regular files matching 392 source blobs,
version `0.1.0` and release date `2026-10-09`; all 16 quick/context
support files in that release are covered by template cleanup.
Pins remain Spec Kit `1.0.11@8147943512404afb9d99c6252cb9bf84369fd0b0`
and ATV `ad996736b879be87c7755df5c5017d5336203bbc`.

A6 exercised `npx --yes github:dermonaco-labs/baton#v0.1.0 init --dry-run`
in a fresh empty workspace: exit 0 in 18 seconds, stdout `init: OK`,
zero entries before and after. npm resolved the exact tag commit and the
installed CLI hash matched the public `baton.mjs` asset. Two nonfatal
`gitignore-fallback` warnings were retained. This proves the pinned
consumer dry-run path on one workstation, not a timed human walkthrough
or an adopter initialization.

#### Release-task status

T085 was already complete; A3 and A5 add exact-release evidence without
rewriting its earlier dry-run record. For T088, the existing
Linux/Windows budget and broken-frontmatter annotation evidence is
supplemented by the successful full three-OS runs above. For T090,
the community files are present and a read-only check of GitHub's
private-vulnerability-reporting endpoint returned `enabled: true`
on 2026-10-09; no settings were changed by this documentation work.

**Task bookkeeping remains deferred.** T088 and T090 are still unchecked
in the original `tasks.md`; these observations do not claim their
repository records were updated or accepted. An initial quick WORK
attempt including task-checkbox updates was refused with
`E_TRANSITION` because `no-feature-tasks` forbids changes under `specs/`.
That refused lane was not retried or treated as completed WORK.
This separate documentation-only lane leaves all original task bytes
and historical baton/review evidence unchanged; it records the later
release observations without overriding phase authority.
T093 remains pending: neither release smoke nor A6 proves the timed
newcomer walkthrough (AC-US1-4), live README visual review (AC-US6-2),
or every step of the human S1-S7 walkthrough.
Other unperformed owner checks, upstream-watch, Dependabot, compound,
adopter and downstream-project work are not closed by this record.
