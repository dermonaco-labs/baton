# What Baton does

Baton gives each Copilot agent a short, validated handoff instead of asking the
next agent to reconstruct intent from a long chat. A feature's baton is
`specs/NNN-slug/handoff.md`; a quick fix uses `.baton/quick/slug.md`. The
frontmatter identifies the owner, next phase, model role, ordered `read_first`
files, their hashes, evidence, decisions, questions and human approval. The
body explains what changed and what to do next.

Spec Kit owns feature specification, planning, tasks, analysis and implementation.
ATV contributes brainstorming, focused work, review, landing and learning.
Baton connects them with mandatory Spec Kit extension hooks, wrapper skills,
phase checks and an offline Node CLI. This avoids duplicate planners and plan
directories, instructions that fight each other, silently skipped gates and
context lost between phases. The pinned snapshot and manifest also make
upstream provenance and local modifications visible.

**The safety boundary:** an agent must stop on a blocking scope, behavior,
security, data or contract question, record it, and wait for a role-based human
answer. A green validator is evidence of the configured checks, not a substitute
for reviewing the result. Review opens a PR through `/baton-land`; Baton does
not merge it.

The default `core` pack carries the complete relay (28 skill and agent files);
optional packs add specialized help. Vendored files remain pinned and are not
hand-edited. See [workflow](03-workflow.md), [packs](06-packs-and-customization.md)
and [licensing](09-credits-and-licensing.md).
