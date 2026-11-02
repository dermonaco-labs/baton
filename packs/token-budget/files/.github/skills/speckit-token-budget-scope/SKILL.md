---
name: speckit-token-budget-scope
description: Report scoped reading advice without replacing the baton's ordered context.
---

# Relay-Safe Scope Advice

Run `node .baton/bin/baton.mjs --json context scope --feature <id>` with the
explicit feature. Show its ordered `read_first` and `do_not_read` unchanged.
Do not omit, reorder or replace mandatory context to fit a token budget.
Do not read excluded sources or introduce a competing phase reading manifest.

Use `.baton/vendor/token-budget/commands/scope.md` only for optional advice
within those boundaries. If budget and required context conflict, report the
conflict and follow the baton, never silently shrink required context.
Do not write artifacts, instructions, memory files or hooks.
Preserve all diagnostic output and failure status.
