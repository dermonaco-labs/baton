---
title: Self-review guard needs a random per-checkout identity, not a path hash
date: 2026-09-29
category: security-issues
module: handoff writer identity (src/lib/writer.mjs)
problem_type: security_issue
component: tooling
symptoms:
  - An implement session could write its own review and land handoffs (F62)
  - A fresh clone at the same absolute path as the implement checkout was refused with E_SELF_REVIEW (F98)
  - Committed x-worktree values were unsalted path hashes that leak the OS username (F102)
  - Deleting the token and calling through a junction, 8.3 or subst alias bypassed the check (F107)
root_cause: logic_error
resolution_type: code_fix
severity: high
tags: [self-review, e-self-review, checkout-identity, git-path, worktree, writer-token]
---

## Problem

Baton must refuse review and land from the checkout that implemented the change
(F62). The first identity was a hash of the absolute checkout path. That was
both too strict (a fresh independent clone reusing the path was refused) and too
weak (path aliases bypassed it and the committed hash revealed the username).

## Symptoms

- `handoff receive --phase review` in a new clone at the old path: exit 3 `E_SELF_REVIEW`.
- With `.baton/.local/session.json` deleted, the same checkout reached through a
  junction/8.3/subst path passed.
- `x-worktree` in committed batons matched `sha256(<absolute path>)`.

## What Didn't Work

- Hashing `resolve(root)`: path spelling is not identity; the same path can hold a
  different clone and one clone has many spellings.
- The gitignored token alone: deleting it is a documented one-cycle override (F88),
  so it cannot also be the only identity.

## Solution

Two independent random identities, both hashed before they reach a baton:

1. `.baton/.local/session.json` — gitignored writer token (`writerHash`).
2. `git rev-parse --git-path baton/checkout-id` — 32 random bytes stored inside the
   git dir (`checkoutHash`). A second `git worktree` gets its own file under
   `.git/worktrees/<name>/`, so worktrees are distinct; a new clone gets a new id.

```js
const gitPath = (await execFileAsync('git', ['rev-parse', '--git-path', 'baton/checkout-id'], { cwd: root })).stdout.trim();
await writeFile(resolve(root, gitPath), randomBytes(32).toString('hex') + '\n', { flag: 'wx', mode: 0o600 });
return hashBytes(identity); // never the path
```

Corrupt tokens or ids raise `E_CHECKOUT_TOKEN` (exit 2), not `E_INTERNAL` (F96).

## Why This Works

Identity lives with the git directory, which is what "the same checkout" really
means, and it is random, so nothing about the host leaks. Path aliases resolve to
the same git dir, so they cannot bypass it.

## Prevention

- Test with the real CLI across: same-path re-clone (must pass), second worktree
  (must pass), implement checkout after token deletion only (must deny), and alias
  paths *with the token removed first* (F118 — otherwise the token masks the check).
- Never commit raw or unsalted environment-derived values in batons.
- It is a process guard, not a security boundary: deleting both files is an
  accepted, deliberate override. Fresh-review sessions should use a separate
  worktree or clone.

## Related Issues

- `specs/001-baton-template/review.json` F62
- `.baton/quick/pretag-fixes-001.review.json` F96, F98, F102, F107, F112, F118
