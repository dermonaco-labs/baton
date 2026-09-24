## Phase 0 research (Baton addition)

During Phase 0, invoke the installed `repo-research-analyst` to inspect
repository conventions and `learnings-researcher` to inspect
`docs/solutions/` for relevant prior lessons. Fold relevant findings into
`research.md` and the plan; if an agent is unavailable, record that fact
rather than inventing its findings. `speckit-plan` remains the only planner.

## Handoff

The current phase context, gate, decisions and next `read_first` list live
in `specs/<feature>/handoff.md`. The mandatory
`/speckit-baton-handoff` hook writes and validates that baton after planning.
Do not put feature-specific handoff state in global instructions.
