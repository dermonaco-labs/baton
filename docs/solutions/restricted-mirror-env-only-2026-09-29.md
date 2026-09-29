---
title: Restricted package mirrors belong in the process environment, never in tracked files
date: 2026-09-29
category: developer-experience
module: local validation
problem_type: developer_experience
component: development_workflow
severity: medium
applies_when:
  - A workstation cannot reach the public npm or PyPI registries and must use an approved mirror
  - Running npm ci, uv or sync --check locally before a handoff
  - Writing docs, tests or baton evidence that mention a registry workaround
root_cause: config_error
resolution_type: environment_setup
tags: [npm, uv, uv-default-index, registry-mirror, denylist, local-checks]
---

## Context

Feature 001 was validated on workstations that reach packages only through an
approved internal mirror. Two things went wrong during the relay:

- F08: shipped troubleshooting docs named one organisation's internal feed hostnames.
- F44: the regression test written for F08 put the hostname back into the repository.

Separately, the approved PyPI mirror lacked the pinned `specify-cli==1.0.11`, so
`sync --check` (AC-US5-1) could not pass locally even with `UV_DEFAULT_INDEX` set.
That is a feed availability problem, not a red assertion; hosted CI remained the
authoritative gate.

## Guidance

- Set mirrors only in the local process environment:
  `npm_config_registry` for npm and `UV_DEFAULT_INDEX` for uv.
  Do not write `.npmrc`, `uv.toml`, `pip.conf`, lockfile or workflow changes.
- `UV_DEFAULT_INDEX` is read by uv only; it does not affect npm, and
  `npm_config_registry` does not affect uv. Set both when both tools run.
- In docs, tests and batons use placeholders such as `<approved-package-index>`.
  Regression tests assert the *absence* of private hosts; they must not embed one.
- When the mirror lacks a pinned artifact, record the local exit code as
  unavailable tooling and cite the hosted run ID and SHA. Never repin to make the
  mirror pass and never mark the failed local command as passed (roadmap RM20).

## Why This Matters

Feed hostnames are organisation-specific data; once committed they ship to every
adopter of the template and to public history. A mirror-driven repin silently
changes the supply chain for everyone else.

## When to Apply

- Any local `npm ci`, `uv`, `uvx` or `baton sync --check` on a restricted network.
- Any review or docs task touching `docs/08-troubleshooting.md` or its tests.

## Examples

```powershell
$env:npm_config_registry = '<approved-npm-mirror>'
$env:UV_DEFAULT_INDEX = '<approved-pypi-mirror>'
npm ci
node .baton/bin/baton.mjs sync --check   # may exit 1 if the mirror lacks a pin
```

Evidence line pattern: "local exit 1: approved mirror lacks `specify-cli==1.0.11`;
hosted green run `<run-id>` at `<sha>` is retained."

## Related

- [Troubleshooting: restricted package mirrors](../08-troubleshooting.md#restricted-package-mirrors)
- `specs/001-baton-template/review.json` F08, F44; roadmap RM9, RM20
