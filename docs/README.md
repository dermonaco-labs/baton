# Baton guide

Spec-driven relays for Copilot agents. Baton combines pinned Spec Kit and ATV
skills with a validated handoff file. In a repository created from the template,
this manual lives at `docs/baton/`.

| Start here | Use it for |
|---|---|
| [What and why](01-what-and-why.md) | The relay, its boundaries and trade-offs |
| [Quickstart](02-quickstart.md) | Template or overlay installation and a first feature |
| [Workflow](03-workflow.md) | Feature and quick lanes, roles, gates and precedence |
| [Handoffs](04-handoffs.md) | Baton anatomy, commands and recovery |
| [Model routing](05-model-routing.md) | Suggestions, allowlists and managed agents |
| [Packs and customization](06-packs-and-customization.md) | Optional packs, checks, hooks and overrides |
| [Updating](07-updating.md) | Adopter updates and maintainer upstream bumps |
| [Troubleshooting](08-troubleshooting.md) | Common failures and safe recovery |
| [Credits and licensing](09-credits-and-licensing.md) | Provenance, notices and exclusions |

The [upstream diff](reference/upstream-diff.md) records the pinned input and
materialized changes. For exact CLI usage, run
`node .baton/bin/baton.mjs --help` or `<command> --help`; the proposed
`docs/reference/` catalog is not yet complete.
