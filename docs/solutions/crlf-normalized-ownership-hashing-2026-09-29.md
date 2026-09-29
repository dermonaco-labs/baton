---
title: Normalize CRLF for ownership hashes, keep integrity hashes raw
date: 2026-09-29
category: logic-errors
module: hashing (src/lib/hash.mjs)
problem_type: logic_error
component: tooling
symptoms:
  - Overlay adopters with core.autocrlf=true got E_FRONTMATTER_MALFORMED on every handoff command
  - update --dry-run on a CRLF checkout reported every managed file as a conflict (exit 4)
  - uninstall kept CRLF files with W_USER_MODIFIED
  - models apply failed with E_FRONTMATTER_MALFORMED on CRLF agent files (F100)
root_cause: logic_error
resolution_type: code_fix
severity: high
tags: [crlf, autocrlf, windows, hashing, manifest, frontmatter, overlay-adopter]
---

## Problem

Template adopters inherit `* text=auto eol=lf`; overlay adopters on Windows do not,
so Git's default `core.autocrlf=true` checks out batons and managed files with
CRLF. Raw-byte hashes and LF-only parsers then treated every file as changed or
malformed.

## Symptoms

See frontmatter. In the review scratch repo 42 of 83 managed files were CRLF and
`update --dry-run` exited 4 with 42 conflicts.

## What Didn't Work

- Normalizing only some call sites (doctor/adopt/models) while update, uninstall and
  init kept raw digests (F99): the two sides disagreed on the same file.
- Normalizing inside `isUserModified` without teaching the frontmatter writer about
  CRLF (F100): detection passed, then `models apply` failed hard.

## Solution

Separate the two meanings of a hash in `src/lib/hash.mjs`:

- **Ownership / "user-unmodified"** (`hashManaged`, `hashArtifact`): decode UTF-8,
  replace `\r\n` with `\n`, then hash. Binary or non-UTF-8 content falls back to raw
  bytes. `hashArtifact` also neutralizes `tasks.md` checkbox state.
- **Integrity** (`lock verify`, bundle `build.mjs --check`, init payload lock check):
  stay raw-byte strict, so a converted locked file still fails `E_LOCK_MISMATCH`.

Every command that compares against the manifest uses the same ownership hash.
Writers preserve the file's existing line endings (models apply keeps pure CRLF).

## Why This Works

Line-ending conversion is a checkout artifact, not a user edit, so it must not
change ownership. Supply-chain checks, by contrast, must detect any byte change.
No payload file contains CRLF, so existing manifests stayed valid.

## Prevention

- Keep a real-CLI fixture: overlay init, then a `core.autocrlf=true` clone; assert
  doctor clean, `update --dry-run` 0 conflicts, uninstall removes managed files,
  `models apply` leaves no bare LF.
- When adding a hash comparison, decide explicitly: ownership (normalized) or
  integrity (raw). Sweep all call sites together.
- Known v0.1 gap: uninstall on an autocrlf clone leaves the inert `.gitattributes`
  block (F105); a UTF-8 BOM before that block trips a false marker conflict (F127).

## Related Issues

- `specs/001-baton-template/review.json` CRLF baton finding (autocrlf overlay adopters)
- `.baton/quick/pretag-fixes-001.review.json` F99, F100, F105, F127
