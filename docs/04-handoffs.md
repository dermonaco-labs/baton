# Handoffs and recovery

The feature baton is `specs/NNN-slug/handoff.md`; the quick baton is
`.baton/quick/<slug>.md`. Its YAML frontmatter is validated against
`.baton/schemas/handoff.schema.json`. It records the completed and next
phases, owner, `status`, `model_role`, `suggested_model`, an ordered
`read_first` list with reasons and hashes, `do_not_read`, artifacts, entry
and exit evidence, decisions, questions, gate approval and history.
Review adds `review.findings_path`/`blocking_findings`; land adds `pr.url`.
The human-readable body must contain, in order, `## Goal`,
`## What changed`, `## Next steps` and `## Watch out for`.

For example, after tasks (abbreviated; the CLI fills hashes and the full
evidence arrays):

```yaml
---
baton: 1
lane: feature
feature: 002-export-csv
phase_completed: tasks
next_phase: analyze
next_owner: speckit-analyze
status: ready
model_role: review
suggested_model: claude-opus-5.5
summary: Acceptance checks and implementation steps are registered.
read_first:
  - path: specs/002-export-csv/tasks.md
    why: Pre-registered checks and implementation order
    sha256: "<computed by baton>"
do_not_read:
  - path: specs/002-export-csv/research.md
    why: Decisions are folded into plan.md
gate: { required: false, approved_by: null, approved_at: null }
---
```

`receive --phase <phase>` checks transition, freshness, questions and gates;
on success load **exactly** `read_first`, in order, respecting `do_not_read`.
`write --phase <phase> --from-json <file>` records the next handoff from
agent-authored judgment and CLI-computed facts; `--next` chooses a legal
branch. `handoff show`, `status` and `handoff next` inspect it. Checkboxes
in `tasks.md` do not change its freshness hash, but task wording does.
The default budgets are 12 `read_first` entries and 150 body lines.

## Fixing validation errors

Run `node .baton/bin/baton.mjs validate --path <baton>` for a precise
code, path, pointer and suggested fix. `--json` gives structured errors.

| Error | Recovery |
|---|---|
| `E_SCHEMA`, `E_BODY_SECTIONS`, `E_BUDGET` | Correct the named field or body section and trim context to the configured budget. Do not invent required evidence. |
| `E_TRANSITION`, `E_OWNER`, `E_LANE_MISMATCH` | Use `handoff next` and the phase contract; choose a legal `--next` or escalate quick work instead of relabeling a feature. |
| `E_MISSING_ARTIFACT`, `E_MULTIPLE_BATONS` | Restore the named artifact, or retain one feature handoff. |
| `E_STALE_ARTIFACT` | Re-run the producing phase after a meaningful edit, or use `handoff refresh --reason "<why>"` for an intentional change; revalidate. |
| `E_BLOCKING_OPEN`, `E_GATE_PENDING` | Stop; answer the question with `handoff answer` or get a configured role's approval with `handoff approve`. Pending receive exits 3. |
| `E_APPROVER_FORMAT`, `E_ACTOR_FORMAT`, `E_DENYLIST` | Use role-only vocabulary in `.baton/config.yml`; remove personal identifiers from the named file. Never put names or emails in batons. |
| `E_EXIT_UNMET` | Finish the listed exit criteria and provide evidence. Group failures list each member; never declare an unmet check met. |
| `E_NO_PREREG` | Add the story's acceptance checks to `tasks.md` before implementation; do not retrofit a passing test as red evidence. |
| `E_ANALYSIS_MISSING`, `E_ANALYSIS_CRITICAL` | Persist the analyze report via the after-analyze hook and resolve critical findings before implementation. |
| `E_REVIEW_MISSING`, `E_REVIEW_BLOCKING` | Run `/baton-review`, write valid normalized findings and fix or dismiss blocking findings with reasons before land. |
| `E_PR_MISSING` | After land opens the PR, record its URL in the baton. Do not claim a PR was opened before it exists. |
| `E_LANE_ESCALATE` | Run `handoff escalate --quick <slug> --reason "<why>"`, then `/speckit-specify`; don't stretch quick scope. |
| `E_MODEL_NOT_ALLOWED` | Choose a permitted model or ask the owner to change the allowlist; enforcement is configured. |

`W_ASSUMPTION_DUE`, `W_WEAKENED_CONTRACT`, `W_QUICK_LARGE` and `W_NO_BATON`
are warnings: revisit assumptions, review removed checks, consider feature
escalation, or use `handoff init --infer` for a pre-Baton feature
(it requires human review). `handoff migrate --dry-run` inspects schema
migration; schema 1 currently needs no change. For non-baton codes, see
[troubleshooting](08-troubleshooting.md).
