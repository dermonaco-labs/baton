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
| `phase_completed` | enum Phase, or `none` | ✓ | CLI | see §2. `none` is legal only on a fresh quick baton written by `handoff new --quick` |
| `next_phase` | enum Phase or `done` | ✓ | CLI | must be an allowed transition |
| `next_owner` | string | ✓ | CLI | skill/agent id, e.g. `speckit-tasks`, `baton-review` |
| `status` | enum `ready`,`needs-human`,`blocked`,`done` | ✓ | CLI+agent | `needs-human` is required when any blocking question is open |
| `model_role` | enum `planning`,`implementation`,`review`,`fast` | ✓ | CLI | from `phases.yml` / config map |
| `suggested_model` | string or null | ✓ | CLI | resolved from config when written; null = inherit |
| `summary` | string ≤ 600 chars | ✓ | agent | what the completed phase produced |
| `read_first` | array (1..budget) of `{path, why, sha256?}` | ✓ | agent (+CLI sha) | ordered; paths are repo-relative; budget default 12 |
| `do_not_read` | array of `{path, why}` | – | agent | explicitly noisy/superseded files |
| `artifacts` | array of `{path, role, sha256}` | ✓ | CLI | role ∈ `source-of-truth`,`derived`,`evidence`,`review`; sha256 is used for staleness |
| `entry_checked` | array of `{id, ok, note?, members?}` | ✓ | CLI | results of receive for the completed phase. `id` is the check key (§2.1); `members` (same shape) is present only for groups |
| `exit_criteria` | array of `{id, met, evidence?, members?}` | ✓ | CLI+agent | one entry per top-level exit check in phases.yml, keyed by its check key (§2.1); every one must be `met: true` for `status: ready`. Groups carry `members: [{id, met, evidence?}]` |
| `acceptance_checks` | array of `{id, story, check, kind, expect_initial}` | cond. | agent | required when `next_phase` = `implement` (kind ∈ `command`,`test-id`,`manual`; `expect_initial` ∈ `fail`,`n/a`) |
| `decisions` | array of `{id, decision, rationale, by, tag?}` | – | agent | `by` is an Actor (§1.1). `tag` (kebab-case) makes a decision machine-checkable, e.g. `skip-compound`, `quick-eligible`, `escalated` |
| `open_questions` | array of `{id, question, blocking, options?, owner?}` | – | agent | blocking ⇒ status ≠ ready |
| `assumptions` | array of `{id, text, revisit_at}` | – | agent | `revisit_at` = a phase |
| `risks` | array of `{id, text, severity}` | – | agent | severity ∈ low, medium, high |
| `gate` | `{required: bool, approved_by: Approver or null, approved_at: date or datetime or null}` | ✓ | CLI | required per phases.yml. `approved_by` is role-only text (§1.1); `approved_at` is an RFC 3339 full-date (`2026-09-24`) or date-time; both are set together or both null |
| `review` | `{findings_path, blocking_findings: int}` | cond. | CLI | required after `review`. `findings_path` points to a Baton-owned `findings.schema.json` file (`specs/<f>/review.json`), never to upstream run artifacts |
| `analysis` | `{report_path, critical: int, high: int}` | cond. | CLI | required after `analyze`. The report is persisted to `specs/<f>/analysis.md` by `speckit.baton.handoff` |
| `pr` | `{url, number}` | cond. | CLI | required after `land` |
| `history` | array (≤ 20, FIFO) of `{phase, at, by, commit}` (`by` is an Actor) | ✓ | CLI | a compact trail; git holds the full history. `commit` = short `HEAD` when the entry was written (null before the first commit) |
| `updated_at` | RFC 3339 datetime | ✓ | CLI | |
| `updated_by` | Actor | ✓ | CLI | §1.1 |

**Body** (≤ 150 lines by default), fixed headings in this order: `## Goal`, `## What changed`,
`## Next steps` (numbered, must start with the exact command from `baton handoff next`), `## Watch out for`.

**State rules**

- `status: ready` ⇔ all `exit_criteria.met`, no blocking `open_questions`, and (`gate.required` ⇒ `gate.approved_by` set
  before the next phase starts; this is checked on receive).
- `status: done` ⇔ `next_phase: done` (after `compound`, or after `land` when compound is skipped with a decision
  recorded).
- Staleness: for every `artifacts[*]` and `read_first[*]` entry that has a sha256, the current file hash MUST be equal,
  otherwise `E_STALE_ARTIFACT`.
- Hashing: sha256 over the raw bytes, with one exception. For files named `tasks.md` the hash is computed after
  normalizing task checkboxes (`^(\s*- )\[[xX]\]` → `$1[ ]`), so progress made during implement (including across
  sessions) never makes the baton stale. Adding, removing or rewording tasks still does.
- Branching: when a phase has several `next` values, `handoff write` uses the first one unless `--next <phase>` is
  given. `specify --next plan` (skipping clarify) is legal only when the spec has 0 `[NEEDS CLARIFICATION]`
  markers, and it sets `gate.required: true`.
- Brainstorm writes no baton, because no feature dir exists yet. `handoff write --phase specify --from-brainstorm <path>`
  records the brainstorm doc in `artifacts` (role `evidence`) and adds a `brainstorm` history entry.

### 1.1 Actor and Approver formats (no personal data)

Batons never contain a personal name, handle or email. People are recorded by **role** only.

- **Role vocabulary**: `config.yml` `gates.approver_roles` (default `repository owner`, `maintainer`, `reviewer`,
  `release manager`, `security lead`) and `gates.approval_channels` (default `direct approval`,
  `control-plane delegation`, `pull request review`). Each entry matches `^[a-z]+( [a-z]+){0,3}$`.
- **Approver** (`gate.approved_by`): `<role>` or `<role> via <channel>`, where role and channel come from the
  vocabulary. Schema pattern (structural): `^[a-z]+( [a-z]+){0,3}( via [a-z]+( [a-z-]+){0,3})?$`. The validator then
  checks the vocabulary. Example: `approved_by: "repository owner via control-plane delegation"`,
  `approved_at: 2026-09-24`.
- **Actor** (`decisions[].by`, `history[].by`, `updated_by`): an agent or session id (`^[a-z][a-z0-9-]{1,63}$`, e.g.
  `speckit-plan`, `planning-session`) or `human:<role-slug>`, where role-slug is a vocabulary role with spaces
  replaced by `-` (e.g. `human:repository-owner`). Schema pattern: `^(human:[a-z]+(-[a-z]+){0,3}|[a-z][a-z0-9-]{1,63})$`.
- The patterns exclude `@`, `.`, `_`, `/`, `\`, digits in roles and upper case, so no email, `@handle`, path or
  username fits. The denylist scan (handoff-contract `E_DENYLIST`) is therefore consistent with the schema: a value
  that passes the schema can only fail the scan through a configured denylist term.
- Errors: `E_APPROVER_FORMAT` (pattern or vocabulary), `E_ACTOR_FORMAT` (pattern or unknown `human:` role).
## 2. Phase and phase contract — `.baton/phases.yml`

`Phase` enum: `brainstorm`, `specify`, `clarify`, `plan`, `tasks`, `analyze`, `implement`, `review`, `land`,
`compound` (feature lane) and `work` (quick lane only; owner `ce-work`). `review`, `land` and `compound` belong to
both lanes. `converge` is modeled as a re-entry of `implement` (its hooks map to `phase: implement` with
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
        phases: [specify, clarify]
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
`W_WEAKENED_CONTRACT` warning. Moving a built-in exit check into an `any_of` group next to a new alternative also
counts as removing it.

### 2.1 Check expressions (`entry`, `exit`)

`entry` and `exit` are lists of **check expressions**. The list itself is an implicit `all_of`.

```text
expr  := leaf | group
leaf  := { id: <built-in check id>, <param>?: <value> }        # at most one parameter (table below)
group := { id: <group key>, all_of: [expr, expr, ...] }        # every member met
       | { id: <group key>, any_of: [expr, expr, ...] }        # at least one member met
```

| Built-in check with a parameter | Parameter | Check key |
|---|---|---|
| `artifact-exists` | `path` (glob; `{feature_dir}` / `{quick_dir}` placeholders) | `artifact-exists:<path relative to the dir>` |
| `no-needs-clarification` | `path` | `no-needs-clarification:<file>` |
| `fresh` | `names` (list) | `fresh:<a,b,c>` |
| `from-phase` | `phases` (list; `none` allowed) | `from-phase:<a,b>` |
| `decision` | `tag` | `decision:<tag>` |

Leaves without a parameter use their id as the key. The **check key** identifies results in `entry_checked` and
`exit_criteria`, so it must be unique within one list.

Rules (the schema enforces the shape, the loader the rest):

- A group has exactly one of `all_of` / `any_of`, a required kebab-case `id` (the group key, which must not collide
  with a built-in id), and 2–8 members. Nesting depth is at most 2 (a group may contain groups whose members are
  leaves only).
- All members are evaluated (no short-circuit), so the evidence is complete. A group is met when its operator holds.
  Evidence lists which members were met, e.g. `any_of: artifact-exists:docs/solutions/*.md ✗, decision:skip-compound ✓`.
- Errors: `E_PHASES` (schema), `E_CHECK_UNKNOWN` (unknown leaf id), `E_CHECK_GROUP` (missing or colliding group id,
  fewer than 2 or more than 8 members, depth > 2, both or neither operator), `E_CHECK_KEY_DUP` (duplicate key in one
  list). An unmet group reports `E_EXIT_UNMET` (or the receive stop) with the member results.

Example (compound exit, the default):

```yaml
compound:
  lane: [feature, quick]
  owner: ce-compound
  exit:
    - id: compound-recorded
      any_of:
        - { id: artifact-exists, path: "docs/solutions/*.md" }
        - { id: decision, tag: skip-compound }     # a decisions[] entry with tag: skip-compound and a rationale
```

Recorded in the baton as:

```yaml
exit_criteria:
  - id: compound-recorded
    met: true
    evidence: "any_of: 1/2 met"
    members:
      - { id: "artifact-exists:docs/solutions/*.md", met: false }
      - { id: "decision:skip-compound", met: true, evidence: "D4" }
```

### 2.2 Lanes

Each phase declares `lane: [feature]`, `[quick]` or `[feature, quick]`. A phase shared by both lanes may define
`by_lane.<lane>` with any of `entry`, `exit`, `next`, `human_gate`, `read_first_hint`. Each key given there
**replaces** the phase-level value for that lane (no merging). Receiving or writing a phase with a baton whose `lane`
isn't listed fails with `E_LANE_MISMATCH`. The normative quick-lane table is in
[contracts/phase-contracts.md](./contracts/phase-contracts.md) § Quick lane.

```yaml
review:
  lane: [feature, quick]
  owner: baton-review
  model_role: review
  entry: [ { id: diff-nonempty }, { id: fresh, names: [tasks] } ]
  exit:  [ { id: findings-json-valid }, { id: findings-mapped-to-tasks-or-dismissed } ]
  next: [land, implement]
  by_lane:
    quick:
      entry: [ { id: diff-nonempty } ]
      exit:  [ { id: findings-json-valid }, { id: findings-fixed-or-dismissed }, { id: quick-scope-held } ]
      next: [land, work, specify]
```n
## 3. Config — `.baton/config.yml`

```yaml
schema: 1
packs: [core]                 # installed packs (source of truth for update)
lanes:
  quick:
    max_files_changed: 10     # heuristic for escalation suggestion
gates:                        # role-only approvals (§1.1); never names, handles or emails
  approver_roles: [repository owner, maintainer, reviewer, release manager, security lead]
  approval_channels: [direct approval, control-plane delegation, pull request review]
denylist:                     # extra terms for E_DENYLIST; keep real names out of git (see handoff-contract)
  terms_file: null            # e.g. a path listed in .gitignore, or env BATON_DENYLIST_FILE
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
  - ref: todo-create
    note: only used by ce-review interactive/autofix modes; baton-review always calls mode:headless
```

## 5. Lock — `baton.lock.json` (maintainer side)

```json
{
  "schema": 1,
  "generated_by": "baton sync 0.1.0",
  "upstreams": {
    "speckit": { "package": "specify-cli", "version": "1.0.11", "repo": "github/spec-kit",
                 "tag": "v1.0.11", "commit": "8147943512404afb9d99c6252cb9bf84369fd0b0",
                 "requirements": "baton/upstream/specify-cli.requirements.txt",
                 "requirements_sha256": "…", "license": "MIT",
                 "init_args": ["--integration","copilot","--script","sh"] },
    "atv":     { "package": "atv-starterkit", "version": null, "repo": "All-The-Vibes/ATV-StarterKit",
                 "ref": "main", "commit": "ad996736b879be87c7755df5c5017d5336203bbc",
                 "tree": "<git tree id, recorded by sync and verified on every fetch>", "license": "MIT",
                 "note": "pinned to main: v2.6.3 ships corrupted agent templates (fixed in f0a86ef)" }
  },
  "files": [
    { "path": ".github/agents/correctness-reviewer.agent.md", "upstream": "atv",
      "upstream_path": "pkg/scaffold/templates/agents/correctness-reviewer.agent.md",
      "stored_at": ".github/agents/correctness-reviewer.agent.md",
      "sha256_upstream": "…", "sha256": "…", "license": "MIT", "repair": null, "packs": ["core"] }
  ]
}
```

`stored_at` is the location in the Baton repo. It equals `path` for `core`, and is `packs/<id>/files/<path>` for
optional packs (FR-053). A repair entry is `{id, reason, upstream_issue}`, where `upstream_issue` is a URL or
`"pending"` (Principle I).

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

## 8. Findings — `specs/<feature>/review.json` (quick lane: `.baton/quick/<slug>.review.json`)

This file is Baton-owned (`findings.schema.json`). `baton-review` builds it by normalizing the structured output of
`ce-review mode:headless`, so the validator never parses upstream run artifacts.

```json
{
  "schema": 1,
  "source": { "engine": "ce-review", "mode": "headless", "run_artifact": ".context/compound-engineering/ce-review/<run-id>/" },
  "base": "<merge-base sha>", "head": "<sha>",
  "personas": ["correctness-reviewer", "testing-reviewer"],
  "findings": [
    { "id": "F1", "severity": "P1", "title": "…", "file": "src/x.mjs", "line": 42, "persona": "correctness-reviewer",
      "confidence": 0.8, "task": "T034", "disposition": "open|fixed|dismissed", "reason": null }
  ]
}
```

`severity` ∈ `P0`…`P3`. Findings at `P0`/`P1` with `disposition: open` are **blocking** (they count toward
`review.blocking_findings`). A `dismissed` finding needs a `reason`, and a finding that isn't dismissed needs a
`task` (the `findings-mapped-to-tasks-or-dismissed` exit check).