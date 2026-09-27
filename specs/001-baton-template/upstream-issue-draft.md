# Draft for All-The-Vibes/ATV-StarterKit (owner to file)

**Title:** Release the agent-template frontmatter fix and reconcile missing agent references

The published `atv-starterkit` v2.6.3 scaffold has malformed Copilot agent frontmatter:
49 of 51 files under `pkg/scaffold/templates/agents/` have no newline separators, so the
`description` and other YAML fields cannot be parsed. The fix appears on `main` in
[`f0a86ef`](https://github.com/All-The-Vibes/ATV-StarterKit/commit/f0a86ef)
(`fix(scaffold): repair corrupted agent templates shipped by the installer`), but has not
been included in a release. Could you publish a release containing this fix? A fresh
install of that release should produce agent files with valid, newline-delimited YAML
frontmatter.

While reviewing the installable scaffold at
[`ad996736b879be87c7755df5c5017d5336203bbc`](https://github.com/All-The-Vibes/ATV-StarterKit/tree/ad996736b879be87c7755df5c5017d5336203bbc),
we also found references to names not provided by its installable agent inventory:

| Referenced by | Name |
| --- | --- |
| `ce-work` | `linting-agent` (the scaffold has `lint`, not this name) |
| `ce-compound` | `compound`, `research`, `cora-test-reviewer`, `every-style-editor` |
| `best-practices-researcher` | `every-style-editor` |
| `atv-security` | `cso` (a legacy alias) |

`every-style-editor` exists under the upstream development `.github/skills/` tree
but not in the installable `pkg/scaffold/templates/` inventory. Could you clarify
which names are intended to be available to installed users and either include
their definitions in the scaffold or update the references? This would make
fresh installs self-contained without requiring downstream projects to invent
agents.

This is a draft only. The Baton repository owner will decide whether and when
to file it upstream.
