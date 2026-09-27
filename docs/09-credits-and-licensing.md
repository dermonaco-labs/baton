# Credits and licensing

Baton-authored files are MIT-licensed (see the repository [LICENSE](../LICENSE)).
The relay stands on [GitHub Spec Kit](https://github.com/github/spec-kit),
[ATV Starter Kit](https://github.com/All-The-Vibes/ATV-StarterKit),
Compound Engineering by Every and GitHub's awesome-copilot materials
incorporated through ATV. Their respective notices and the bundled CLI
dependencies' permissions are retained in
[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). A template-derived
repository keeps that file. An overlay `init` does not copy it: retain the
notices from the source distribution when redistributing its vendored files.

`baton.lock.json` identifies each upstream pin and every redistributed
file's source path, stored path, hash, pack and license. Maintainer `sync`
checks provenance and licenses, and `build --check` checks the bundled npm
inventory against the notices. The CLI bundle includes packages under
MIT, BSD-3-Clause and ISC terms; a compatible license does **not** remove
the obligation to preserve its notice.

`karpathy-guidelines` is excluded because its upstream distribution has no
license granting redistribution. Duplicate planners, autonomous gate-skipping
tools and unrelated integrations are also excluded from this curated snapshot;
their absence does not change their own upstream licensing. Users may license
their own application code independently, but must retain the notices
covering the redistributed Baton and third-party files. See
[packs](06-packs-and-customization.md) and the
[upstream diff](reference/upstream-diff.md).
