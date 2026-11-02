---
name: speckit-token-budget-usage
description: Report estimated artifact token overhead without changing files or hiding errors.
---

# Read-Only Usage Estimates

Run `node .baton/bin/baton.mjs --json context usage --feature <id>`.
Report the file estimates and total as character-based approximations, not
provider billing or measured model usage. Never edit source artifacts,
instructions, phase context or handoffs to meet a reported budget.

The inactive reference
`.baton/vendor/token-budget/commands/usage.md` supplies reporting background.
Vendored helpers, including `scripts/bash/slim_output.sh`, are not automatically
executed by this wrapper. Never pipe checks or required evidence through them.
If the user explicitly requests output slimming, summarize only nonessential
successful stdout in the conversation; retain original stderr, required
evidence and the original command's failure status. Do not execute a vendor
helper as a shortcut around these guarantees.
