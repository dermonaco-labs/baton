# Agent reference

Agents are invoked by phase owners; they do not independently advance a
baton. `baton-review` uses headless `ce-review` and only installed personas.
Plan Phase 0 consults the two core research agents.

## Core

### `correctness-reviewer`

When to use: always-on code review for logic and state errors. Hands off to:
`ce-review` to merge findings.

### `testing-reviewer`

When to use: always-on review of test quality and missing cases. Hands off to:
`ce-review` to merge findings.

### `maintainability-reviewer`

When to use: always-on review of unnecessary complexity and coupling. Hands
off to: `ce-review` to merge findings.

### `project-standards-reviewer`

When to use: always-on review of repository rules and conventions. Hands
off to: `ce-review` to merge findings.

### `agent-native-reviewer`

When to use: always-on review of agent parity for UI, tools and prompts.
Hands off to: `ce-review` to merge findings.

### `learnings-researcher`

When to use: always-on review and plan Phase 0 lookup in `docs/solutions/`.
Hands off to: `ce-review` or `speckit-plan`.

### `security-reviewer`

When to use: conditional review when code touches authentication, public
input or permissions. Hands off to: `ce-review` to merge findings.

### `adversarial-reviewer`

When to use: conditional review of large or high-risk diffs. Hands off to:
`ce-review` to merge findings.

### `repo-research-analyst`

When to use: plan Phase 0 research into repository structure and conventions.
Hands off to: `speckit-plan`.

## Optional packs

Every row names one installable agent; optional reviewers feed findings back
to `ce-review`, while advisory agents feed their calling skill.

| Pack | Agent | When to use | Hands off to |
|---|---|---|---|
| `review-plus` | `performance-reviewer` | Performance-sensitive diff | `ce-review` |
| `review-plus` | `api-contract-reviewer` | Public API change | `ce-review` |
| `review-plus` | `data-migrations-reviewer` | Schema or migration change | `ce-review` |
| `review-plus` | `reliability-reviewer` | Failure/retry semantics | `ce-review` |
| `review-plus` | `cli-readiness-reviewer` | CLI interface change | `ce-review` |
| `review-plus` | `previous-comments-reviewer` | Follow-up to earlier feedback | `ce-review` |
| `review-plus` | `schema-drift-detector` | Detect schema divergence | `ce-review` |
| `review-plus` | `deployment-verification-agent` | Deployment-risk change | `ce-review` |
| `review-plus` | `code-simplicity-reviewer` | Simplification opportunities | `ce-review` |
| `review-plus` | `performance-oracle` | Compound performance analysis | `ce-compound` |
| `review-plus` | `data-integrity-guardian` | Compound database analysis | `ce-compound` |
| `review-plus` | `pattern-recognition-specialist` | Compound pattern analysis | `ce-compound` |
| `docs-review` | `coherence-reviewer` | Prose consistency | `document-review` |
| `docs-review` | `feasibility-reviewer` | Plan feasibility | `document-review` |
| `docs-review` | `scope-guardian-reviewer` | Scope boundaries | `document-review` |
| `docs-review` | `product-lens-reviewer` | Product requirements | `document-review` |
| `docs-review` | `design-lens-reviewer` | Design assumptions | `document-review` |
| `docs-review` | `security-lens-reviewer` | Documented security needs | `document-review` |
| `docs-review` | `adversarial-document-reviewer` | Challenge spec/plan assumptions | `document-review` |
| `security` | `security-sentinel` | Deeper security audit | `atv-security` or `ce-compound` |
| `research` | `best-practices-researcher` | Research external practice | `speckit-plan` |
| `research` | `framework-docs-researcher` | Research framework docs | `speckit-plan` |
| `research` | `git-history-analyzer` | Trace repository history | `speckit-plan` |
| `research` | `issue-intelligence-analyst` | Explore issue context | `speckit-plan` |
| `stack-python` | `kieran-python-reviewer` | Python-specific code review | `ce-review` |
| `stack-typescript` | `kieran-typescript-reviewer` | TypeScript-specific code review | `ce-review` |
| `stack-typescript` | `julik-frontend-races-reviewer` | Frontend race conditions | `ce-review` |
| `stack-rails` | `dhh-rails-reviewer` | Rails idioms | `ce-review` |
| `stack-rails` | `kieran-rails-reviewer` | Rails correctness | `ce-review` |
| `design` | `design-implementation-reviewer` | Fidelity of built design | `frontend-design` |
| `design` | `figma-design-sync` | Align Figma and implementation | `frontend-design` |
| `design` | `design-iterator` | Refine design iteration | `frontend-design` |
