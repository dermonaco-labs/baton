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
