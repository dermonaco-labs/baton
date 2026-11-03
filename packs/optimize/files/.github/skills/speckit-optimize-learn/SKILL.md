---
name: speckit-optimize-learn
description: Propose evidence-backed session learnings without persisting memory or governance changes.
---

# Report-Only Session Learning

Run `node .baton/bin/baton.mjs --json context optimize learn`.
Use `.baton/vendor/optimize/commands/speckit.optimize.learn.md` as analytical
reference for the current session only. Present evidence-backed proposals;
do not speculate about unrelated historical sessions.

Never execute upstream apply or save-report stages. Do not write memory
entries, MEMORY.md, indexes, learned skills or governance files. Reject
apply-like requests even if upstream offers an apply-all option.
Route proposed constitution rules through `/speckit-constitution` and normal
human review, not direct edits. This wrapper grants no persistence permission.

Mandatory gates, scanner rules, approval semantics and protected instructions
are non-removable; learning cannot weaken them. Preserve diagnostic output
and failure status and never claim proposals were applied.
