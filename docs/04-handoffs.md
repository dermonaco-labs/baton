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

### Attach a pre-Baton feature at implement

For an existing feature with `spec.md`, `plan.md` and `tasks.md`, explicitly
attach it at implementation rather than claiming earlier Baton phases ran:

```sh
node .baton/bin/baton.mjs handoff init --feature 011-existing --infer --phase implement --reason "Resume pre-Baton work" --from-json attach.json
node .baton/bin/baton.mjs handoff approve --feature 011-existing --by "repository owner"
node .baton/bin/baton.mjs handoff receive --feature 011-existing --phase implement
```

`attach.json` may contain only `acceptance_checks`, `summary`, `read_first`,
`assumptions` and `risks`. Register acceptance checks for every story in
`tasks.md` and its `## Acceptance Registry`; receive checks registry IDs.
Missing sources or invalid checks prevent creation. Keep all three sources
fresh: attachment hashes them without changing their bytes.

The attached baton has `phase_completed: none`, empty history and a pending
human gate. Prior checked tasks are counted as imported provenance, not
Baton-executed work; earlier approvals and phase receipts are not imported.
A fresh configured-role approval is required before implement receive.
Review covers the full main → feature delivery, including pre-Baton product
work and post-attachment changes. The `diff-base` decision records
`git merge-base HEAD origin/HEAD`; an unresolved base fails closed with
`E_CHECK_FAILED` and no baton is written. Ensure `origin/HEAD` resolves before
attaching. The `attached` decision records that merge-base as
`x-delivery-base`, the full attachment HEAD as `x-imported-head`, and the
imported checked-task count as `x-checked-tasks`, plus the attachment date as
`x-attached-at`.

Receive and scope verify that `x-imported-head` resolves to a full commit
which is an ancestor of (or equal to) the current HEAD, and that
`x-delivery-base` equals `git merge-base <x-imported-head> origin/HEAD`.
Missing commits, unrelated history or an unresolved remote HEAD fail closed
with `E_CHECK_FAILED`. This uses the imported commit, not today's HEAD, so
ordinary main advances do not narrow the pinned delivery scope.
Offline validation checks that **every** `diff-base` decision equals the
delivery base, preventing later shadowing. Validation does not need Git and
continues to work after merge.

`approve` also records one reserved `attach-approved` human-role decision
binding the current source-of-truth paths/hashes (`x-sources`) and imported
HEAD. At phase `none`, approval must match this evidence and the human
`updated_by` actor; its date cannot precede the recorded attachment date.
Refresh of an initial attachment clears this evidence and the gate, requiring
reapproval. Source edits without refresh are stale. No phase-`none` history
receipt is invented; the decision remains provenance after implementation.

Batons are plaintext and gates are declarative process guards, not
cryptographic attestations. These checks reject inconsistent or unverifiable
states, including hand-set gate fields without matching approval evidence;
they cannot establish the authenticity of a consistently rewritten baton.
Authenticity relies on git history and PR review, as in the normal relay.

`x-imported-head` distinguishes context only: reviewers can identify the imported
baseline from Baton-executed work, but Baton does not attest that imported
work was previously reviewed. Settled history is never relabelled or
re-receipted. Normal implement → review relay resumes after the first write;
later review writes retain the attachment's delivery base, including when
findings send the feature back to implement. Normal unattached features keep
their existing analyze/review base semantics.
For a feature history shorter than the 20-entry retention limit, it must
begin with `specify` (optionally preceded by one `brainstorm`, quick `work`
or quick `review` seed) or carry exactly one valid `attached` decision.
An attachment or its approval decision always requires valid provenance.
Full 20-entry histories may have lost their normal start and remain accepted
for compatibility; this is not proof of origin.
Without `--phase`, `init --infer` still requests human confirmation before
clarification. Only `--phase implement` is supported, with a required reason.
