---
name: speckit-token-budget-concise
description: Toggle concise responses for this session without persisting agent instructions.
---

# Session-Only Concise Responses

Run `node .baton/bin/baton.mjs --json context concise on` or `off`.
Apply the returned response-style guidance only within this conversation.
No persisted toggle is created; a new session starts with its normal defaults.

Unlike the inactive reference
`.baton/vendor/token-budget/commands/concise.md`, this wrapper must never write
AGENTS.md, CLAUDE.md, other instruction files, memory entries or marker blocks.
Never sacrifice errors, required evidence, blocking questions or baton context
for shorter prose. Preserve diagnostic output and failure status.
