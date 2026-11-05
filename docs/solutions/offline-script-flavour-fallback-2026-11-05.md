---
title: Offline ps/py update fallback must decide per Spec Kit-owned file, not per byte pattern
date: 2026-11-05
category: logic-errors
module: baton update script-flavour fallback (src/commands/update.mjs)
problem_type: logic_error
component: tooling
symptoms:
  - Offline ps/py update overwrote the issues skill with bash-flavoured bytes (F01)
  - Offline ps/py update from 1.0.11 replaced a working taskstoissues skill with an alias to a delegate it never installed (F11)
  - Offline ps/py update skipped .baton/bin/baton.mjs but still wrote its new .sha256 and baton_version (CLI hash)
  - No test failed when the extension-scripts exemption or the alias-with-delegate path was removed (F18)
root_cause: logic_error
resolution_type: code_fix
severity: high
tags: [update, fallback, uv-offline, script-flavour, powershell, python, taskstoissues, alias, speckit-extension]
---

## Problem

`baton update` stages the new payload with `init --script <installed flavour>`.
If that cannot run because uv or a wheel is unavailable (for example with
`UV_OFFLINE`), ps/py installs fall back to a `sh` stage. Anything in that stage
that calls `.specify/scripts/bash/` has the wrong flavour for the project.
Feature 004 (Spec Kit 1.3.0) moved the issues command into the bundled `github`
extension and kept `/speckit-taskstoissues` as a delegating alias. That exposed
four ways the fallback chose the wrong files.

## Symptoms

- ps/py + `UV_OFFLINE`: the new `speckit-github-taskstoissues` skill was written
  with bash script paths. The extension scripts live under
  `.specify/extensions/github/scripts/`, which the old `.specify/scripts/bash/`
  check did not cover (F01).
- An offline update from 1.0.11 with the issues pack replaced the working legacy
  skill with the new alias, but skipped the alias's delegate. The command stopped
  working (F11).
- The Baton CLI bundle contains the literal string `.specify/scripts/bash/`, so the
  fallback skipped `.baton/bin/baton.mjs`. It still wrote the new `.sha256` and
  `baton_version`, so the hash and the version no longer matched the bytes.
- Removing either the `(extensions/<id>/)?` part of the script regex or the
  delegate-presence condition left every test green (F18).

## What Didn't Work

- **Hard-coding `.specify/scripts/bash/`:** Spec Kit 1.3.0 extensions ship
  scripts under `.specify/extensions/<id>/scripts/`, so one root is not enough.
- **"Skip any file whose bytes call bash scripts":** files that only *mention*
  the path, such as the bundled CLI, are not Spec Kit script callers. Skipping
  only some of the artefacts that belong together (bundle vs. `.sha256` and
  manifest version) breaks integrity checks later.
- **Treating the alias like any other file:** the alias works only if its
  delegate exists. When the delegate is skipped, refreshing the alias deletes a
  working command.

## Solution

`src/commands/update.mjs` (the owner-approved narrow T026/D7 exception):

```js
// init.mjs: one regex for core and extension script roots
const scriptDirectory = String.raw`\.specify\/(?:extensions\/[^/]+\/)?scripts\/`;

// update.mjs: only Spec Kit-owned, non-script files that call bash scripts keep their flavour
const unrefreshed = (entry, bytes) => scriptFallback && entry.owner === 'speckit' &&
  !isSpeckitScriptPath(entry.path) && callsBashScripts(bytes);

// alias: keep the installed skill unless its delegate already exists
const delegate = fallbackAliases.get(entry.path);
if (delegate && delegateEntry && unrefreshed(delegateEntry, stagedDelegate) &&
    !await optionalBytes(root, delegate)) { warn W_SCRIPT_UNREFRESHED; continue; }
```

- Baton-owned files such as the CLI bundle are always refreshed, together with
  their hash and version.
- Script payload files are refreshed. Files that call scripts keep the installed
  flavour and produce one `W_SCRIPT_UNREFRESHED` warning.
- The alias is refreshed when its delegate is installed (F18). Otherwise the alias
  is kept with a warning that names the delegate (F11).

## Why This Works

The deciding facts are **ownership** (manifest `owner: speckit`) and **role**
(script file vs. script caller), not whether some byte string appears. Delegating
aliases form a pair, so they are refreshed only if the pair stays complete on
disk.

## Prevention

- Keep the tests for each branch in `test/integration/update.test.mjs` for both
  `ps` and `py`:
  - "F11 … keeps a 1.0.11 taskstoissues skill whose delegate cannot be generated";
  - "F18 … refreshes an outdated taskstoissues alias when its delegate is installed";
  - "… fallback refreshes the Baton CLI with its hash and Spec Kit script payload files";
  - "update retains the installed … script flavour".
- When adding a fallback branch, mutation-check it: delete the condition and
  confirm a test fails. F18 existed only because nothing failed before.
- When a Spec Kit bump adds an extension, a new script root or a new alias, add
  it to `scriptDirectory` / `fallbackAliases` and add a `UV_OFFLINE` ps/py test.
- Never refresh a file without refreshing what is derived from it (`.sha256`,
  manifest hash, `baton_version`), and never refresh those derived values alone.

## Related Issues

- `specs/004-speckit-1-3-0-migration/review.json` F01, F11, F18 and the CLI-hash
  finding (decisions D51–D59, D66 in `handoff.md`)
- [crlf-normalized-ownership-hashing-2026-09-29.md](crlf-normalized-ownership-hashing-2026-09-29.md):
  manifest hashing that update relies on
