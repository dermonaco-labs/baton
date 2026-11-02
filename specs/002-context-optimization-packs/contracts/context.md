# Contract: Guarded Context Operations

## Pack Selection

`baton init --packs token-budget`, `--packs optimize`, or
`--packs token-budget,optimize` adds only selected packs plus core.
Existing install/update/uninstall policies remain in force.

Public skills are `/speckit-token-budget-compact`, `-restore`, `-scope`,
`-concise`, `-usage`, and `/speckit-optimize-run`, `-tokens`, `-learn`.
There is no optimize check or apply command.

## Guarded Writer

```text
baton context compact --feature ID --target PATH
  [--candidate PATH] [--expect RAW_SHA256] [--apply]
baton context restore --feature ID --target PATH
  [--expect RAW_SHA256] [--apply]
```

Both require the token-budget pack to be installed. Without `--apply`, return
a non-mutating eligibility/preview report. Applying compact requires a
candidate and expected original raw digest; applying restore requires the
digest and an existing backup. Reject unsupported/duplicate flags, multiple
targets, missing context, target/candidate aliases and invalid digest values.
No auto-discovery of a writable feature from the current branch.

Apply is limited to existing unapproved/unbound SDD Markdown within the
selected feature. Deny any `read_first`, source/artifact checksum, managed
ownership or current/historical approval protection. Deny instruction,
constitution, handoff, governance and runtime/scanner targets.

Check eligibility before creating backups. Preserve original bytes and line
endings; never overwrite an existing backup. Revalidate freshness/protection
before target replacement. Failures are nonzero and identify the target/reason
using repository-standard diagnostics; previews/refusals have no filesystem
side effects. Never refresh hashes or approvals through context operations.

## Non-Mutating Operations

```text
baton context scope --feature ID
baton context concise [on|off]
baton context usage --feature ID
baton context optimize run|tokens|learn
```

Token-budget actions require that pack; optimize actions require optimize.
Return structured data through existing `--json` support and readable
reports through normal output. Estimate tokens transparently; do not claim
provider billing accuracy.

Scope includes the baton's ordered `read_first` and exclusions unchanged;
additional scoped advice cannot remove mandatory context. Concise returns
session-style guidance only, with no instruction writes. Usage does not
edit artifacts or hide errors.

Optimize CLI supplies report inputs and overhead estimates; wrappers apply
pinned analytical guidance without upstream apply/persist steps.
Every optimize operation is report-only, including learn. Apply-like arguments
are rejected, not ignored. Proposed governance changes must be
handed to `/speckit-constitution`; mandatory gates, scanner rules and approval
semantics remain non-removable.

## Vendor Boundary

Upstream extension manifests, prompts and helpers install only under
`.baton/vendor/<id>/` as byte-identical reference inputs. They are not
registered commands, hooks or execution entry points. No compaction hook is
auto-executed. Public wrappers must not execute upstream mutation helpers
or delegate live edits to raw prompts.

Output slimming, if requested, must preserve required diagnostic
streams and original command failure status. It is not automatically inserted
into checks or review evidence.

## Limits

This is not an OS sandbox or a semantic-equivalence proof. The guarded writer
rejects detected races/stale state; external tools with filesystem access
remain subject to normal human review and approvals.
