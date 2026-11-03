---
name: speckit-optimize-run
description: Audit governance overhead in report-only mode and route amendments through constitution.
---

# Report-Only Governance Audit

Run `node .baton/bin/baton.mjs --json context optimize run`.
Use `.baton/vendor/optimize/commands/speckit.optimize.run.md` as analytical
reference only. Report context overhead, redundant wording, ambiguity and
potential savings. Never execute upstream apply or post-application steps.
Treat upstream handoffs as references, not automatic commands.

This wrapper is always report-only. Reject apply-like requests and explain
that proposed governance changes must go through `/speckit-constitution`
with its normal review and amendment rules. Do not directly edit constitution,
redirected governance sources, AGENTS.md, CLAUDE.md, instructions or memory.
Do not save reports over protected sources.

Mandatory Baton gates, `.baton/phases.yml`, built-in phase defaults, scanner
rules, approval semantics and BATON/SPECKIT sections are non-removable even
when redundant or expensive. Marker removal never grants optimization
permission. Do not propose dropping human gates as token savings.
Preserve errors and failure status; do not claim changes were applied.
