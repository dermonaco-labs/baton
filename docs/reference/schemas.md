# Schema reference

The authoritative JSON Schemas are installed under `.baton/schemas/` and
maintained under `baton/schemas/`. The validator uses them rather than this
summary. YAML files use YAML 1.2 parsing. Unknown top-level keys are rejected
unless explicitly permitted by the schema.

| Schema | Applies to | Important fields and handoff |
|---|---|---|
| `handoff.schema.json` | Feature `specs/NNN-slug/handoff.md` and quick `.baton/quick/slug.md` frontmatter | `lane`, completed/next phase, owner, status, ordered `read_first`, hashes, entry/exit evidence, gate, decisions and questions → next phase |
| `phases.schema.json` | `.baton/phases.yml` | Phase owners, model roles, transitions, built-in entry/exit checks and optional `all_of`/`any_of` groups → receive/write |
| `config.schema.json` | `.baton/config.yml` | Packs, model role routing and allowlist, check commands, role/channel gate vocabulary, budgets → validator and phase owners |
| `pack.schema.json` | `packs/<id>.yml` in the source repo | Install paths, `requires`, `conflicts`, reasoned `optional_refs` → `sync` closure and `init` |
| `lock.schema.json` | `baton.lock.json` in the source repo | Immutable upstream pins, stored paths, hashes and provenance → `lock verify`, `sync` |
| `manifest.schema.json` | `.baton/manifest.json` in installs | Managed files, hashes, installed packs and source version → `update`, `uninstall` |
| `findings.schema.json` | `specs/<feature>/review.json` or `.baton/quick/<slug>.review.json` | Normalized review findings and blocking severity → `baton-land` |
| `skill-frontmatter.schema.json` | `.github/skills/<name>/SKILL.md` | `name` equals directory, description; frontmatter starts at byte zero → skill discovery |
| `agent-frontmatter.schema.json` | `.github/agents/<name>.agent.md` | Agent metadata and optional allowed model → agent discovery |

A handoff has YAML frontmatter followed by `## Goal`, `## What changed`,
`## Next steps`, `## Watch out for` in that order. Every referenced file's
checksum is validated (task checkbox progress is ignored when hashing
`tasks.md`). A ready baton cannot carry blocking questions or unmet exit
checks. Use [handoffs](../04-handoffs.md) for an annotated example and
[error codes](error-codes.md) for recovery.

`phase_completed: none` permits quick → work, or feature → implement only.
The latter requires exactly one reserved `attached` decision by `baton`,
`x-attached-phase: implement`, full hexadecimal `x-imported-head` and
`x-delivery-base` commits, and a nonnegative integer `x-checked-tasks`.
Every Baton `diff-base` decision must have `x-base-commit` equal to
`x-delivery-base`; initial history is empty and `gate.required: true`.
Duplicate or non-feature attachments are invalid. Provenance remains
permanent through supported implement → review transitions. Existing unattached
feature batons need not begin history at `specify`; their validation is unchanged.
Presence of `attached` or `attach-approved` always requires valid provenance.
Consistently deleting all attachment and approval provenance after implement is
a plaintext rewrite not detectable offline. Authenticity relies on git history
and PR review, as in Baton's declarative trust model for the normal relay.

`x-delivery-base` is the merge-base of imported HEAD with `origin/HEAD`: review covers
the full main → feature delivery and retains this base across later reviews.
`x-imported-head` marks imported pre-Baton work for context only, not prior
review approval. No settled history is relabelled or re-receipted.
Receive and scope require the full imported commit to be reachable from HEAD
and recompute its merge-base with `origin/HEAD`, failing `E_CHECK_FAILED` when
unverifiable. `validate` remains offline, including after merge.

At phase `none`, an approved attachment needs exactly one `attach-approved`
decision by the configured human actor, matching `updated_by`, gate role,
the current source-of-truth snapshot (`x-sources`: path/sha256 pairs) and
`x-imported-head`. `approved_at` cannot precede `x-attached-at` when present.
Refresh clears initial approval evidence; reapproval is required. Approval
decisions persist after implement without inventing phase-`none` receipts.
This is declarative consistency checking of plaintext, not cryptographic
proof that an approval is authentic. Git history and PR review supply trust.
