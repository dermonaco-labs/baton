# Model routing

Baton suggests models by **role**, not by embedding model IDs into phase
prompts. `.baton/phases.yml` assigns each phase `planning`,
`implementation`, `review` or `fast`; `.baton/config.yml` maps roles to
model names. `models.phase_roles` can override the role for a phase. The
shipped mappings are suggestions dated 2026-09, not a guarantee that every
model is available in every Copilot host or account.

```yaml
models:
  roles:
    planning: { model: claude-opus-5.5, reasoning: high }
    implementation: { model: gpt-6-sol, reasoning: high }
    review: { model: claude-opus-5.5, reasoning: high }
    fast: { model: claude-haiku-4.5 }
  phase_roles: {}
  allowed: []
  enforce: warn
  apply_to_agents: false
```

Resolution is phase → optional `phase_roles` override → role → configured
model. An empty `allowed` list imposes no restriction; otherwise
`enforce: off` ignores it, `warn` reports `W_MODEL_NOT_ALLOWED`, and
`error` reports `E_MODEL_NOT_ALLOWED` for a disallowed model or managed
agent frontmatter. `handoff next` prints the next skill, role and model;
`suggested_model` is recorded in the baton. **It does not switch the
running model.** Select an available model in Copilot CLI or the host's model
picker before invoking the next skill; VS Code and the coding agent may
honor agent frontmatter differently. If unavailable, change the config to
an available permitted model rather than silently treating a suggestion
as enforced.

Agent frontmatter is opt-in. Set `apply_to_agents: true`, preview with
`node .baton/bin/baton.mjs models apply --dry-run`, then run
`node .baton/bin/baton.mjs models apply`. `--force` also enables a
one-off apply without that config setting. The command changes only
managed agent files and is idempotent; it does not edit upstream source
prompts or arbitrary user agents. Review its diff and run `validate`
afterward. See [workflow](03-workflow.md) for the phase roles and
[troubleshooting](08-troubleshooting.md) for unavailable models.
