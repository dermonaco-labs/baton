# Data Model: Baton

All machine-readable Baton files are validated by JSON Schema (draft 2020-12). The schemas live in
`baton/schemas/` and are installed to `.baton/schemas/`. YAML files are parsed with `yaml` 2 (YAML 1.2 core
schema, which avoids the "Norway problem"). Every entity has a `schema`/`baton` integer version field, and
unknown top-level keys are rejected (`additionalProperties: false`) except under `x-*` extension keys.

## 1. Baton (handoff) — `specs/<feature>/handoff.md` or `.baton/quick/<slug>.md`

Markdown file = YAML frontmatter (the contract) + a short body (for humans and the next agent).

| Field | Type | Req | Set by | Notes |
|---|---|---|---|---|
| `baton` | const `1` | ✓ | CLI | handoff schema version |
| `lane` | enum `feature`,`quick` | ✓ | CLI | quick batons live in `.baton/quick/` |
| `feature` | string `^[0-9]{3}-[a-z0-9-]+$` (feature) / slug (quick) | ✓ | CLI | matches the directory name |
| `phase_completed` | enum Phase | ✓ | CLI | see §2 |
| `next_phase` | enum Phase or `done` | ✓ | CLI | must be an allowed transition |
| `next_owner` | string | ✓ | CLI | skill/agent id, e.g. `speckit-tasks`, `baton-review` |
| `status` | enum `ready`,`needs-human`,`blocked`,`done` | ✓ | CLI+agent | `needs-human` is required when any blocking question is open |
| `model_role` | enum `planning`,`implementation`,`review`,`fast` | ✓ | CLI | from `phases.yml` / config map |
| `suggested_model` | string or null | ✓ | CLI | resolved from config when written; null = inherit |
| `summary` | string ≤ 600 chars | ✓ | agent | what the completed phase produced |
| `read_first` | array (1..budget) of `{path, why, sha256?}` | ✓ | agent (+CLI sha) | ordered; paths are repo-relative; budget default 12 |
| `do_not_read` | array of `{path, why}` | – | agent | explicitly noisy/superseded files |
| `artifacts` | array of `{path, role, sha256}` | ✓ | CLI | role ∈ `source-of-truth`,`derived`,`evidence`,`review`; sha256 is used for staleness |
| `entry_checked` | array of `{id, ok, note?}` | ✓ | CLI | results of receive for the completed phase |
| `exit_criteria` | array of `{id, met, evidence?}` | ✓ | CLI+agent | ids come from phases.yml; every one must be `met: true` for `status: ready` |
| `acceptance_checks` | array of `{id, story, check, kind, expect_initial}` | cond. | agent | required when `next_phase` = `implement` (kind ∈ `command`,`test-id`,`manual`; `expect_initial` ∈ `fail`,`n/a`) |
| `decisions` | array of `{id, decision, rationale, by}` | – | agent | `by` = agent id or human handle |
| `open_questions` | array of `{id, question, blocking, options?, owner?}` | – | agent | blocking ⇒ status ≠ ready |
| `assumptions` | array of `{id, text, revisit_at}` | – | agent | `revisit_at` = a phase |
| `risks` | array of `{id, text, severity}` | – | agent | severity ∈ low, medium, high |
| `gate` | `{required: bool, approved_by: string or null, approved_at: datetime or null}` | ✓ | CLI | required per phases.yml |
| `review` | `{findings_path, blocking_findings: int}` | cond. | CLI | required after `review` |
| `pr` | `{url, number}` | cond. | CLI | required after `land` |
| `history` | array (≤ 20, FIFO) of `{phase, at, by, commit}` | ✓ | CLI | a compact trail; git holds the full history |
| `updated_at` | RFC 3339 datetime | ✓ | CLI | |
| `updated_by` | string | ✓ | CLI | agent id / `human:<handle>` |

**Body** (≤ 150 lines by default), fixed headings in this order: `## Goal`, `## What changed`,
`## Next steps` (numbered, must start with the exact command from `baton handoff next`), `## Watch out for`.

**State rules**

- `status: ready` ⇔ all `exit_criteria.met`, no blocking `open_questions`, and (`gate.required` ⇒ `gate.approved_by` set
  before the next phase starts; this is checked on receive).
- `status: done` ⇔ `next_phase: done` (after `compound`, or after `land` when compound is skipped with a decision
  recorded).
- Staleness: for every `artifacts[*]` and `read_first[*]` entry that has a sha256, the current file hash MUST be equal,
  otherwise `E_STALE_ARTIFACT`.

## 2. Phase and phase contract — `.baton/phases.yml`

`Phase` enum: `brainstorm`, `specify`, `clarify`, `plan`, `tasks`, `analyze`, `implement`, `review`, `land`,
`compound`. `converge` is modeled as a re-entry of `implement` (its hooks map to `phase: implement` with
`mode: converge`).

```yaml
schema: 1
budgets: { read_first_max: 12, body_max_lines: 150 }
phases:
  plan:
    lane: [feature]
    owner: speckit-plan
    model_role: planning
    human_gate: false
    entry:                      # checked by `baton handoff receive --phase plan`
      - id: spec-exists         # built-in check ids (see contracts/phase-contracts.md)
      - id: from-phase
        any_of: [specify, clarify]
      - id: no-blocking-questions
      - id: gate-approved       # previous phase's gate if required
    exit:                       # checked by `baton handoff write --phase plan`
      - id: artifact-exists
        path: "{feature_dir}/plan.md"
      - id: artifact-exists
        path: "{feature_dir}/research.md"
      - id: no-needs-clarification   # no "NEEDS CLARIFICATION" markers in plan.md
      - id: constitution-check-present
    next: [tasks]
```

Adopters may override `phases.yml`. Overrides are validated, and removing a built-in exit check generates a
`W_WEAKENED_CONTRACT` warning.

## 3. Config — `.baton/config.yml`

```yaml
schema: 1
packs: [core]                 # installed packs (source of truth for update)
lanes:
  quick:
    max_files_changed: 10     # heuristic for escalation suggestion
models:
  roles:                      # suggested defaults as of 2026-09 — edit freely
    planning:        { model: claude-opus-5.5, reasoning: high }
    implementation:  { model: gpt-6-sol,       reasoning: high }
    review:          { model: claude-opus-5.5, reasoning: high }
    fast:            { model: claude-haiku-4.5 }
  phase_roles: {}             # optional overrides, e.g. { analyze: review }
  allowed: []                 # empty = no restriction
  enforce: warn               # off | warn | error
  apply_to_agents: false      # true ⇒ `baton models apply` writes `model:` into managed agents
checks:                       # project checks baton-land runs before pushing
  - name: baton
    run: node .baton/bin/baton.mjs validate
  # - name: tests
  #   run: npm test
budgets: { read_first_max: 12, body_max_lines: 150 }
```

Resolution: `phase → (models.phase_roles[phase] ?? phases.yml.model_role) → models.roles[role].model`.
`enforce` applies to `models.roles[*].model` and to the `model:` field in any agent frontmatter.

## 4. Pack — `packs/<id>.yml` (maintainer side)

```yaml
schema: 1
id: core
description: The minimal complete relay.
requires: []                  # other pack ids
conflicts: []                 # pack ids that must not co-install
files:
  - from: speckit             # speckit | atv | baton
    path: .github/skills/speckit-plan/SKILL.md
    role: phase-owner:plan    # documented handoff role (required for core)
  - from: atv
    upstream_path: pkg/scaffold/templates/agents/correctness-reviewer.agent.md
    path: .github/agents/correctness-reviewer.agent.md
    role: review-persona:always
optional_refs:
  - ref: performance-reviewer
    note: ce-review selects only installed personas (baton-review passes the list)
```

## 5. Lock — `baton.lock.json` (maintainer side)

```json
{
  "schema": 1,
  "generated_by": "baton sync 0.1.0",
  "upstreams": {
    "speckit": { "package": "specify-cli", "version": "1.0.11", "repo": "github/spec-kit",
                 "tag": "v1.0.11", "commit": "8147943512404afb9d99c6252cb9bf84369fd0b0",
                 "license": "MIT", "init_args": ["--integration","copilot","--script","sh"] },
    "atv":     { "package": "atv-starterkit", "version": null, "repo": "All-The-Vibes/ATV-StarterKit",
                 "ref": "main", "commit": "ad996736b879be87c7755df5c5017d5336203bbc",
                 "tarball_sha256": "<computed at first sync>", "license": "MIT",
                 "note": "pinned to main: v2.6.3 ships corrupted agent templates (fixed in f0a86ef)" }
  },
  "files": [
    { "path": ".github/agents/correctness-reviewer.agent.md", "upstream": "atv",
      "upstream_path": "pkg/scaffold/templates/agents/correctness-reviewer.agent.md",
      "sha256_upstream": "…", "sha256": "…", "license": "MIT", "repair": null, "packs": ["core"] }
  ]
}
```

## 6. Manifest — `.baton/manifest.json` (adopter side)

```json
{
  "schema": 1,
  "baton_version": "0.1.0",
  "installed_at": "2026-09-24T12:00:00Z",
  "source": "template|init",
  "upstreams": { "speckit": "1.0.11@8147943", "atv": "main@ad99673" },
  "packs": ["core"],
  "files": [ { "path": "…", "sha256": "…", "pack": "core", "owner": "baton|speckit|atv", "managed": true } ],
  "marker_sections": [ { "path": ".github/copilot-instructions.md", "marker": "BATON", "sha256": "…" } ]
}
```

A file counts as **user-modified** when its current sha256 differs from `manifest.files[].sha256`. `update` and
`uninstall` never touch user-modified files.

## 7. Frontmatter schemas

- **Skill** (`.github/skills/*/SKILL.md`): `name` (required; it must equal the directory name and match
  `^[a-z0-9][a-z0-9-]*$`), `description` (required, 1–1024 chars), plus optional `argument-hint`, `license`,
  `compatibility`, `metadata`, `allowed-tools` and `disable-model-invocation`. Unknown keys generate a warning,
  not an error (upstream evolves).
- **Agent** (`.github/agents/*.agent.md`): `description` (required), plus optional `name`, `tools`, `model`,
  `handoffs`, `target`, `user-invocable`, `infer` and `mcp-servers`. The frontmatter MUST start at byte 0 with
  `---\n` and close with `\n---\n`. That is exactly the signature that the corrupted ATV 2.6.3 files violate
  (`E_FRONTMATTER_MALFORMED`).
