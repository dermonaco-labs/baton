# Data Model: Optional Context Optimization Packs

## Source Pin

Each optional source has ID, repository URL, tag/version, immutable commit,
tree and MIT license. Each vendored file records source ID, upstream path,
installed path, stored payload path and raw SHA-256. New source fields are
optional in existing lock/manifest shapes; old required fields stay required.

## Installed Pack

A selected pack requires core and owns its reference snapshot plus authored
wrappers. Installed provenance and managed-file hashes use existing manifest
semantics. No optional selection is implied by installing core.

## Context Operation

An operation has recognized action, explicit feature ID, target, preview or
apply mode, optional candidate and expected original raw digest. Apply for
compact requires a candidate; restore reads an existing original backup.

Allowed live targets are draft Markdown SDD documents in one numbered feature:
spec, plan, tasks, research, data-model, quickstart and contract Markdown.
Handoffs and instructions are never eligible, regardless of path.

## Protection Snapshot

Read-only snapshot of relevant valid feature/quick handoffs, gate/history
approval evidence, all `read_first` and artifact/source bindings, installed
ownership metadata and canonical paths. Any matching protection denies a
write. Metadata failure yields a diagnostic, not an empty protection set.
Compare the snapshot and target immediately before writing.

## Candidate and Backup

Candidate bytes are separate from the live target and must be valid text.
Use an expected raw target digest to reject stale candidates. Preserve the
original target bytes in a non-overwritten `.full.md` backup before the first
eligible compact. Restore passes the same protection checks before replacing
the target. Preserve line endings; previews and refusals create no backup.

## Report

Read-only result identifying action, targets, estimated tokens, protection
reasons or audit inputs and proposals. Optimize reports have no apply state;
concise has no persisted state. Reports never rewrite a protection source,
memory index, approval record, or instruction file.

## State Transitions

1. Draft/unbound -> preview: no mutation.
2. Draft/unbound + explicit valid apply -> compacted draft + original backup.
3. Eligible compacted draft + explicit restore -> original draft.
4. Any approved/bound/ambiguous state -> refusal, no mutation.
5. Optimize report -> proposed amendment input for speckit-constitution,
   never a direct transition into amended governance.
