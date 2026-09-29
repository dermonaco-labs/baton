---
title: Keep quick lanes inside their scope and land reviewed trees before new code
date: 2026-09-29
category: workflow-issues
module: baton relay (quick lane, review, land)
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - Opening a quick lane to fix findings after a feature review
  - More than one baton is between review and land at the same time
  - A land receive fails with E_STALE_REVIEW
  - Adding or removing tracked files under .baton/quick in the template source repo
root_cause: missing_workflow_step
resolution_type: workflow_improvement
tags: [quick-lane, quick-scope-held, e-stale-review, land, template-cleanup, relay]
---

## Context

After feature 001 was reviewed at `c85bf3f`, pre-tag fixes landed on `main` through
the quick lane `pretag-fixes-001`. The feature baton, waiting at review → land, was
then stranded: `handoff receive --phase land` compared the reviewed-tree hash with
current code and failed `E_STALE_REVIEW`, and no command routes land back to review
(F111). Separately, the quick lane had to prove it stayed a quick lane.

## Guidance

**Stranded land (F111).** The owner chose route (a): land feature 001 at its reviewed
tree `c85bf3f` (PR #32, handoff-only diff) and let the quick lane cover
`c85bf3f..main` under its own independent review (PR #35). Either merge order was
safe because both PRs changed only batons, which the reviewed-tree hash excludes.
Route (b), a CLI transition from a stale land back to review, is v0.2 backlog.

**Quick-lane scope.** A quick lane may restore behavior the contract already
promised; it may not add commands, flags, error codes, handoff fields or public
contracts, and it must not edit the feature's `specs/` files. Record
`quick-scope-held` with a concrete diff range and reasoning each review cycle.
The reviewer, not the implementer, should own that decision (F124: the current
check accepts any author; making it author- and cycle-aware is v0.2).

**Template cleanup list (F122).** `.baton/template-cleanup.yml` names source-only
quick batons explicitly. Before every tag, `git ls-files .baton/quick` must be a
subset of its `remove` list, or maintainer batons ship to adopters and fail their
first `validate`.

## Why This Matters

A reviewed-tree hash is the proof that land ships exactly what review saw. Adding
code under a baton waiting at land silently invalidates that proof and leaves no
recovery path today. Quick lanes that grow contracts bypass the scope and pre-code
human gates.

## When to Apply

- Sequence work so each baton at land merges before new subject code reaches `main`.
- If code must land first, split it into its own lane and land the waiting baton at
  its reviewed tree, as with PR #32 / PR #35.
- Escalate a quick lane (`handoff escalate`) as soon as a fix needs a contract change.

## Examples

```powershell
# Pre-tag guard for F122 (run at the tag commit)
git ls-files .baton/quick
Get-Content .baton/template-cleanup.yml   # every listed path above must be in remove
```

## Related

- `.baton/quick/pretag-fixes-001.md` decisions D6, D11, D14, D15; risks R3–R5
- `.baton/quick/pretag-fixes-001.review.json` F111, F122, F124
- `specs/001-baton-template/roadmap.md` v0.2 backlog
