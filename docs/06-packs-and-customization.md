# Packs and customization

`core` is always installed and contains 28 skill and agent files: Spec Kit
phase owners, Baton receive/handoff/review/land wrappers, ATV's brainstorm,
work, review, land and compound skills, plus review and research agents.
Support files (schemas, extension, preset, workflow, CLI) do not count toward
that file count. Optional packs resolve their `requires` closure; `core`
cannot be removed.

| Pack | Purpose |
|---|---|
| `review-plus` | Additional review personas and compound enhancement agents |
| `learning` | Opt-in observation, learning, instincts and evolution hooks |
| `docs-review` | Advisory document review and refresh; not the code-review gate |
| `security` | Deeper security skill and sentinel agent |
| `research` | Specialized research agents |
| `issues` | Tasks-to-issues skill; needs GitHub access |
| `stack-python` | Python reviewer |
| `stack-typescript` | TypeScript and frontend race reviewers |
| `stack-rails` | Rails reviewers |
| `design` | Frontend design, sync and iteration |

Preview `init --packs core,learning --dry-run` and then install. Adding a
pack in a derived repo requires a pinned `npx` source payload because
template cleanup removed `packs/`:

```sh
npx --yes github:dermonaco-labs/baton#v0.1.0 init --packs core,learning
```

Before a release tag exists, use a reviewed commit or branch ref.
`W_PACK_RECOMMENDED` means an installed pack mentions an optional
enhancement from another pack. It is advisory (even with `doctor --strict`)
and never auto-installs anything. `learning` captures local observations:
review generated learned skills before committing them.

## Project settings

Edit `.baton/config.yml` to choose packs, model roles, approved role/channel
vocabulary and `checks` commands. `/baton-land` runs the configured checks
before push; in this repository `npm run check` is the local gate. Keep
personal terms in an **untracked** denylist file configured through
`denylist.terms_file` or `BATON_DENYLIST_FILE`. Never commit that file.

`.baton/phases.yml` can override entry, exit, next and gate rules. Overrides
are schema-checked; removing a built-in exit check (including by moving it
inside `any_of`) warns `W_WEAKENED_CONTRACT`. Treat that as a contract
change requiring review, not as a way to force a baton through. Groups
support `all_of` and `any_of`; compound accepts a solution in
`docs/solutions/` **or** a reasoned `skip-compound` decision.

Maintainers add packs in `packs/<id>.yml`, with payloads mirrored under
`packs/<id>/files/`; `sync` checks each pack's references against itself,
its dependencies and declared `optional_refs` reasons. Missing or stale
references fail `E_DANGLING_REF`. Vendored upstream prompts are not edited;
custom behavior belongs in Baton-owned skills, the append-only Spec Kit
preset or a separate extension. Mandatory phase hooks are registered in
`.specify/extensions.yml`; the `learning` pack's Copilot lifecycle hooks
are separate `.github/hooks/` files. See [workflow conflict
rules](03-workflow.md) and [updating](07-updating.md).
