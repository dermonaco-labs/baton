---
name: speckit-token-budget-restore
description: Restore an eligible draft backup without bypassing artifact or approval protection.
---

# Guarded Draft Restoration

Require explicit feature and target. First run
`node .baton/bin/baton.mjs --json context restore --feature <id> --target <path>`.
Default to preview. Stop on failure or `allowed: false`.

Only for an explicit apply request use:

```text
node .baton/bin/baton.mjs --json context restore --feature <id> --target <path> --expect <preview-sha256> --apply
```

Restoration is a write and obeys the same protection as compaction.
Never copy a backup over a live file directly, delete protected backups,
refresh hashes, clear approvals or run upstream mutating helpers.
Do not follow the memory-guard cleanup or constitution restoration steps in
`.baton/vendor/token-budget/commands/restore.md`; it is inactive reference
material. Never edit AGENTS.md, CLAUDE.md, constitution, mandatory hooks or
other managed instructions.

An artifact that became approved, hashed or `read_first`-bound after
compaction cannot be restored in place through this tool.
Show the actual result or refusal with its errors and exit status intact.
