---
name: speckit-taskstoissues
description: Compatibility alias for /speckit-github-taskstoissues from Spec Kit's github extension.
---

# Compatibility Alias for GitHub Issues from Tasks

This skill only delegates. It performs no work of its own.

1. Check whether `.github/skills/speckit-github-taskstoissues/SKILL.md`
   exists.
2. If it is absent, stop and report exactly:
   "`/speckit-github-taskstoissues` is not installed. Install Baton's
   `issues` pack, which ships Spec Kit's `github` extension;
   `/speckit-taskstoissues` only delegates to it."
   Do not try any other way to create issues.
3. Otherwise run `/speckit-github-taskstoissues` with the user's original
   arguments unchanged, and follow that skill's instructions.

Preserve its diagnostics and failure status.
