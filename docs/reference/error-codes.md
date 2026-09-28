# Validator error codes

Run `node .baton/bin/baton.mjs validate --json` for machine-readable
findings. `--github` formats annotations. Errors stop validation (exit 1);
warnings are informational unless a command explicitly documents otherwise.

## Handoff and phase

| Code | Meaning and recovery |
|---|---|
| `E_SCHEMA` | Invalid handoff frontmatter; fix the reported JSON pointer. |
| `E_BODY_SECTIONS` | Add or reorder the required body headings. |
| `E_BUDGET` | Reduce `read_first` entries or body lines to configured budgets. |
| `E_TRANSITION` | Use a permitted phase transition; clarify unresolved spec markers. |
| `E_OWNER` | Use the owner configured for `next_phase`, or record an override decision. |
| `E_MISSING_ARTIFACT` | Create a required file or correct its path. |
| `E_STALE_ARTIFACT` | Re-run the owning phase or `handoff refresh --reason R` after intentional edits. |
| `E_BLOCKING_OPEN` | Set `needs-human` and resolve the blocking question. |
| `E_EXIT_UNMET` | Meet the phase exit criteria before declaring ready. |
| `E_CHECK_FAILED` | A configured local check failed; inspect the reported command and exit status (exit 1). |
| `E_GATE_PENDING` | Obtain human role approval before receiving the next phase (exit 3). |
| `E_APPROVER_FORMAT` | Use a configured role and channel, not a personal name/handle. |
| `E_ACTOR_FORMAT` | Use an agent id or a configured `human:<role-slug>`. |
| `E_DENYLIST` | Remove personal data from generated content. |
| `E_NO_PREREG` | Register acceptance checks before implementing stories. |
| `E_ANALYSIS_MISSING` | Persist the analyze report with the handoff hook. |
| `E_ANALYSIS_CRITICAL` | Resolve critical findings before implementation. |
| `E_REVIEW_MISSING` | Write valid normalized `review.json`. |
| `E_REVIEW_BLOCKING` | Resolve blocking review findings before land. |
| `E_PR_MISSING` | Record the opened PR after landing. |
| `E_LANE_ESCALATE` | Escalate a behaviour/contract change to the feature lane. |
| `E_LANE_MISMATCH` | Receive a phase available in the baton's lane. |
| `E_MODEL_NOT_ALLOWED` | Choose a model on the configured allowlist. |
| `E_MULTIPLE_BATONS` | Keep exactly one handoff per feature directory. |

## Files, packs and tooling

| Code | Meaning and recovery |
|---|---|
| `E_FRONTMATTER_MALFORMED` | Fix skill/agent byte-zero frontmatter, YAML or schema. |
| `E_CONFIG`, `E_PHASES`, `E_MANIFEST`, `E_PACK`, `E_LOCK` | Fix the named file against its [schema](schemas.md). |
| `E_CHECK_UNKNOWN` | Use a known built-in phase check id. |
| `E_CHECK_GROUP` | Correct a malformed `all_of`/`any_of` group. |
| `E_CHECK_KEY_DUP` | Remove duplicate check keys from one entry/exit list. |
| `E_LOCK_MISMATCH` | Restore the locked working-tree file rather than editing upstream content. |
| `E_SYNC_DRIFT` | Review and regenerate the pinned snapshot. |
| `E_DANGLING_REF` | Add the required same-pack/dependency item or a reasoned optional ref. |
| `E_LICENSE` | Resolve incompatible/unrecorded upstream or bundled-package notices. |
| `E_UNDOCUMENTED` | Add the missing core command, skill or agent to its reference page with “When to use” and “Hands off to”. |
| `E_WORKFLOW_GUARD` | A source-only maintainer workflow job lacks the repository guard; restore `if: github.repository == 'dermonaco-labs/baton'` on each maintainer job. CI runs on PRs/main; smoke also permits manual dispatch; release runs on version tags or manual dry runs. The adopter `baton.yml` must remain active in derived repos. |
| `E_BUNDLE_STALE` | Rebuild and verify the CLI bundle. |
| `E_UPSTREAM_VERIFY` | Correct failed upstream pin, tree, hash or file provenance. |

## Warnings

| Code | Meaning |
|---|---|
| `W_ASSUMPTION_DUE` | An assumption must be revisited this phase. |
| `W_WEAKENED_CONTRACT` | An override weakened a built-in exit check. |
| `W_QUICK_LARGE` | The quick-lane diff exceeds the configured file threshold. |
| `W_NO_BATON` | A feature spec has no baton; consider `handoff init --infer`. |
| `W_SETUP_STEPS_MISPLACED` | Move setup steps under `.github/workflows/`. |
| `W_NO_ADOPTER_CI` | Add the adopter `baton.yml` workflow. |
| `W_PACK_RECOMMENDED` | An optional enhancement pack is absent; core still works. |
