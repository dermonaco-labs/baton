# Baton guide

Baton helps agents pass validated work between Spec Kit phases. Start a project
by running `/speckit-constitution` to replace the placeholder constitution;
use `/baton` to see the current handoff and `/speckit-specify` to begin a feature.

Before handing work to the next phase, run
`node .baton/bin/baton.mjs validate`. The repository's `baton.yml` workflow
performs the same validation for pull requests. Run
`node .baton/bin/baton.mjs doctor` if hooks or managed files appear broken.

The [upstream diff](reference/upstream-diff.md) records the pinned Spec Kit and
ATV inputs.
