---
baton: 1
lane: quick
feature: validate-command-docs-011
phase_completed: land
next_phase: compound
next_owner: ce-compound
status: ready
model_role: planning
suggested_model: claude-opus-5.5
summary: Independent LAND received the corrected frozen 19-subject proof and exact delivery tree771c8a12da1ce1ad7d48117980b9dd74bf533c1d. Own serial npm run check378/378 zero skips, sync/full/changed validation all exit0; actual PR opened. Final automatic CI must pass on the final receipt head. Stop at coordinator Gate A and unapproved PR-review gate; no merge, release dispatch, tag, publication, reruns or compound performed.
read_first:
  - path: .baton/quick/validate-command-docs-011.md
    why: Authorized bounded patch scope, decisions and release stop gate
  - path: .baton/quick/validate-command-docs-011.work.json
    why: Registered regression scenarios, red/green evidence and owner decision provenance
  - path: src/commands/validate.mjs
    why: One-line canonical feature-handoff classifier; all other checks retained
  - path: test/integration/validate.test.mjs
    why: Changed/untracked command-doc selectors and non-weakening canonical rejection cases
  - path: CHANGELOG.md
    why: Patch release notes and unchanged component/upstream versions
  - path: .baton/quick/release-records-docs-a7.md
    why: CLI-only cleanup evidence refresh and expressly delegated owner re-approval
  - path: CONTRIBUTING.md
    why: Normal review/release safeguards; no merge or dispatch before coordinator go
artifacts: []
entry_checked: []
exit_criteria:
  - id: pr-opened
    met: true
    evidence: https://github.com/dermonaco-labs/baton/pull/47
open_questions: []
decisions:
  - id: D1
    decision: Start a quick lane
    tag: quick-eligible
    rationale: Fix changed-path command-doc misclassification without changing the handoff contract; prepare immutable v0.1.1
    by: baton
  - id: D2
    decision: Record quick-lane review base
    rationale: Work starts at this commit
    tag: diff-base
    x-base-commit: be5525fb144dd2f5c9e9fc2933de0aa7117bff29
    by: baton
  - id: D3
    decision: Retain unchanged component versions
    rationale: May unchanged extension and preset components retain version 0.1.0 while the CLI releases as 0.1.1, avoiding an out-of-scope sync provenance change?
    by: human:repository-owner
  - id: D4
    decision: Refresh historical quick evidence and surface its approval gate
    rationale: May the prior release-records-docs-a7 quick baton be refreshed for the required cleanup entry change, with any cleared approval surfaced for explicit reapproval?
    by: human:repository-owner
  - id: D5
    decision: Record authorized Q1 and Q2 provenance without changing gate vocabulary
    rationale: Q1 was delegated under the original owner authorization. Q2 owner response was verbatim approved at 2026-10-10T17:44:34.645+02:00; the subsequent clarification returned user unavailable. The coordinator explicitly authorized CLI refresh and re-approval with the original repository owner/control-plane delegation role and channel.
    by: baton-011-coder
  - id: D6
    decision: Register and preserve test-first classification evidence
    rationale: "Changed and untracked states cover .specify/extensions/baton/commands/handoff.md, baton/templates/handoff.md and baton/speckit-extension/commands/handoff.md using --changed and --path. Malformed specs/001-example/handoff.md and .baton/quick/example-fix.md must still report E_SCHEMA, E_ACTOR_FORMAT and E_BODY_SECTIONS in full, changed and path modes. Initial RED was 8/10 passing; expanded RED recorded eight failing selector/state subtests plus two failing parents. GREEN passes 53/53 targeted checks. Private receipts: regression-red-all-modes.txt sha256 b9927a13fceeb8016266facbbff93cfc04bbe5548fa7dc3d459e69672a646f06; regression-green-all-modes.txt sha256 efa890c68bf937180e68711e2fc03498170add7d8e7f6e8fab021fd45e47aaef."
    by: baton-011-coder
  - id: D7
    decision: Keep the bounded release and execution overrides explicit
    rationale: The coordinator authorized advisory quick-size overage for hard-coded release metadata. CLI/package/manifest generator are 0.1.1; unchanged extension/preset versions remain 0.1.0. Upstream pins, lock hashes and registry checks are unchanged; package-lock changes are only its two version fields. User-directed execution is gpt-6.1-sol/medium; repository routing remains advisory and unchanged. Review must use another checkout/identity; no merge, release dispatch or tag until coordinator Gate A go.
    by: baton-011-coder
  - id: D8
    decision: Retain failed probes honestly and rerun the full gate serially
    rationale: Public PyPI TLS failed; a process-scoped approved UV_INDEX_URL resolved pinned installs without registry-file edits. Component version bump failed the immutable registry guard and was reverted under Q1. Full validation was blocked by the prior cleanup checksum until authorized Q2 refresh/re-approval. A concurrent sync/full-test probe failed EPERM copying transient sync-work files; no source workaround was added. Serial npm run check then passed with 328 tests, zero failures/skips. Installer/adopter version coverage separately passed 46/46 including live PS installation.
    by: baton-011-coder
  - id: D9
    decision: Independent review holds bounded quick scope
    tag: quick-scope-held
    rationale: Frozen tree6f1e42785e9843704ba20721079f92e46405d9a2 restores canonical classification and previous parsed-frontmatter/body privacy validation; existing quickregex, fullroots, scanner rules, schemas and errorcode definitions retained. No new command/flag/publiccontract. Q1 authorizes unchanged components0.1.0 with CLI/package/generator0.1.1, and required metadata overage is explicitly authorized. Independent real Git-state/CLI regressions and fresh correctness/testing/adversarial review close R1/R2.
    by: baton-011-independent-review
  - id: D10
    decision: Reissue genuine REVIEW for expanded delivery evidence scope
    rationale: Coordinator A1 authorizes receipt replay from byte-exact original WORK input whose SHA2560a1c5794748df7943ebbc0c468e54839d81d017e473bb75937e8a434d9726a6a independently matches original transfer patch and immutable candidate blob. Initial16file proof correctly became stale when delivery staged3context reports. All16 code bytes unchanged; all3 portable reports inspected and frozen before staging. Normal independent CLI receive/write now binds19subjects; no proof/phase handedit, new approval or selfoverride.
    by: baton-011-independent-review
  - id: D11
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: eb3c8579e7ad4a8ed80e6549d4d3811ee00fde1f79c70ad59d450f1ef922e44d
    x-base-commit: be5525fb144dd2f5c9e9fc2933de0aa7117bff29
    by: baton
  - id: D12
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: be5525fb144dd2f5c9e9fc2933de0aa7117bff29
    by: baton
  - id: D13
    decision: Land only to a checked open PR with separate human review
    rationale: Canonical independent REVIEW reissue covers19 frozen subjects including3 portable support reports. Genuine LAND writer/checkout differs from author and reviewer. Initial stale16proof correctly blocked landing; corrected delta was coordinator-authorized and exact staged delivery tree verified. Own configured check and explicit serial npm run check378/378, sync --check, validate and validate --changed passed exit0 before push. Preserve historical WORK/review reports unchanged. Actual PR is open; observe first automatic CI on final receipt head, without rerun. Coordinator Gate A, human PR approval, merge, release dispatch, tag, publication and compound remain separate and unauthorized.
    by: baton-011-landing
gate:
  required: true
  approved_by: null
  approved_at: null
history:
  - phase: work
    at: 2026-10-10T15:53:20.525Z
    by: baton-011-coder
    writer: e2999febfb8418465d933b0361c2a555ee45907022492510ddfc647cdc5c4175
    x-worktree: 56eff5ab69b22e7c286c51e51340ed322a9c9875a122e714d062b721eb8e2b79
    commit: be5525f
    x-action: write
  - phase: review
    at: 2026-10-10T18:02:42.122Z
    by: baton
    writer: 603425fb8627d30f069d96460d414c956ba413bfcd7737b291a070dfaf3a7072
    x-worktree: c058ed65042d2e31fafe168e979f087d14d9ce89f9c7b76dec9237653b702995
    commit: be5525f
    x-action: write
  - phase: land
    at: 2026-10-10T18:27:23.285Z
    by: baton-011-landing
    writer: 344ce0a2c796c2bf14a304513ba5b0f95f793e2961dc70fb72515d077ab89430
    x-worktree: 2819f8ef0f71bd04760b0435f18c8b2d4e1c0c1cfd9c81b12c4db45897595e1e
    commit: 5da81f9
    x-action: write
updated_at: 2026-10-10T18:27:23.276Z
updated_by: baton-land
x-implementation-writer: e2999febfb8418465d933b0361c2a555ee45907022492510ddfc647cdc5c4175
x-implementation-worktree: 56eff5ab69b22e7c286c51e51340ed322a9c9875a122e714d062b721eb8e2b79
x-implementation-cycle: da383716d8911862757ef3b34a29afd62a913cc00257fe09d6e8ea2f159ffe61
review:
  findings_path: .baton/quick/validate-command-docs-011.review.json
  x-portable-metadata:
    operation: Portable provenance annotation only; payload already contained no absolute workstation locators.
    private_original: private-artifact:reviewer/original-review-handoff.json
    private_original_sha256: 49d8827735d632333170f48034385e3c61e9fd6c199cdfd650726d04f8eeeb15
    private_original_retained: true
    reference_semantics: Opaque private evidence label, not a repository path or committed evidence claim.
    redacted_fields: []
  blocking_findings: 0
pr:
  url: https://github.com/dermonaco-labs/baton/pull/47
  number: 47
---
## Goal
Fix B-A command-document misclassification and prepare the immutable v0.1.1 patch release.

## What changed
The feature classifier now accepts only `specs/<feature>/handoff.md`; the existing quick-baton classifier and every other validator check are unchanged. Regression coverage exercises changed and untracked command docs/templates through both selectors and rejects malformed canonical batons in full, changed and path modes.

Release metadata reports CLI/package version 0.1.1. Q1 keeps unchanged extension/preset components at 0.1.0. Q2 authorizes CLI-only refresh and re-approval of the prior a7 cleanup evidence; its phase and original history remain intact.

## Next steps
1. Receive independent `/baton-review` in a separate checkout with the exact frozen subject diff.
2. After review, commit, push and open the PR; collect its first automatic CI results.
3. Stop at coordinator Gate A before merge, release workflow dispatch or tag creation.

## Watch out for
- No upstream pin, schema, error-code, denylist, workflow or v0.1.0 tag/release changes.
- Quick scope exceeds the advisory 10-file threshold solely for required release metadata and evidence; coordinator authorized this.
- Owner authority is recorded only by configured role/channel. The a7 re-approval uses the same control-plane delegation semantics and preserves the exact owner-response provenance in the CLI refresh decision.
