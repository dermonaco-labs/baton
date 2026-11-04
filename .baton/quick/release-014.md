---
baton: 1
lane: quick
feature: release-014
phase_completed: review
next_phase: land
next_owner: baton-land
status: ready
model_role: implementation
suggested_model: gpt-6-sol
summary: "Independent headless review of exact candidate 0b1a154 against pinned base 51d1f86 (20 tracked files, 12 CLI subjects) by 7 installed personas found no open findings: R014-1/P2 (own run artifact kept untracked), R014-2/P3 (changelog date vs future tag) and R014-3/P3 (historical work evidence count) dismissed with reasons. Product change is version metadata only. Ready for land; merge and tag/publication each need separate human approval."
read_first:
  - path: .baton/quick/release-014.md
    why: Release-preparation intent, pinned diff base and relay state
  - path: .baton/quick/release-014.work.json
    why: Bookkeeping-only scope, preregistered acceptance checks, validation evidence and publication boundary
    sha256: a9eb3abc02a41b5e64e8b94e389e01c526c21c798eee958336d34d439d309f34
  - path: CHANGELOG.md
    why: Dated v0.1.4 release notes and unchanged upstream pins
    sha256: f567395408bb768c02873e1d222795f335ff198b2360bb1bd8de523c9e593a13
artifacts: []
entry_checked: []
exit_criteria:
  - id: findings-json-valid
    met: true
    evidence: .baton/quick/release-014.review.json
  - id: findings-fixed-or-dismissed
    met: true
    evidence: 0 findings unresolved
  - id: quick-scope-held
    met: true
    evidence: "Reviewed exact CLI base 51d1f86 to 0b1a154: 20 tracked files cover all 12 CLI subjects. Source and tests change version identifiers only; the bundle equals base bytes with seven 0.1.3 strings replaced by 0.1.4 (SHA-256 c0709fd2d922c4d4d0ff0f0d4bcacd624479d722ade4e9ee958f0233b18921f9 matches sidecar); CHANGELOG promotes Unreleased verbatim with unchanged pins; manifest, lock and metafile changes are generated metadata; cleanup and a7 refresh are owner-approved bookkeeping. No user-facing behavior, public contract, upstream bytes or component versions change."
open_questions: []
decisions:
  - id: D1
    decision: Start a quick lane
    tag: quick-eligible
    rationale: Bookkeeping-only v0.1.4 release preparation for all merged Unreleased entries; no new behavior, contract, component versions or upstream pins
    by: baton
  - id: D2
    decision: Record quick-lane review base
    rationale: Work starts at this commit
    tag: diff-base
    x-base-commit: 51d1f86f85420ff93df7a90e2e98926a828daa0a
    by: baton
  - id: D3
    decision: Record the release-preparation authorization without approving merge or publication
    rationale: "The repository owner requested, via coordinator relay on 2026-11-03: cut Baton release v0.1.4 with a release-prep PR (version bump, changelog Unreleased -> 0.1.4, rebuilt/checksummed CLI as the process requires), then after merge the annotated tag and pinned release workflow, then verify published tag, commit and CLI SHA-256. The owner confirmed bookkeeping-only scope, promotion of all current Unreleased entries, and unchanged product behavior, upstream pins and component versions. Separate explicit human approvals are required before merge and before tag push/publication. This author task prepares the candidate only: no review receipt, PR, merge, tag or workflow dispatch is performed or inferred."
    by: release-014-work
  - id: D4
    decision: Keep this mechanical patch bump in the supported quick lane and record analyze applicability honestly
    rationale: "Refreshed origin/main equals the verified base 51d1f86f85420ff93df7a90e2e98926a828daa0a (PR #55 merge); no Unreleased work beyond the approved entries appeared. No remote v0.1.4 tag exists. The release follows the v0.1.3 (PR #51) version-bump surfaces. speckit-analyze was consulted but is not executable: its mandatory prerequisite is a feature spec/plan/tasks set, and this release-only quick lane has none. The feature plan receive returned E_USAGE because no release feature exists among multiple historical features; no feature directory, analyze receipt, phase receipt or human approval is fabricated. The quick work receive verified quick-eligible and no-feature-tasks. Quick lanes have no acceptance registry (acceptance-registered applies to feature tasks.md), so D5 is the supported pre-edit preregistration. Any advisory quick-size excess is mechanical version, generated and process bookkeeping only."
    by: release-014-work
  - id: D5
    decision: Preregister release acceptance checks before editing
    rationale: "Written before any repository edit. AC1: all and only current Unreleased entries move verbatim into a 0.1.4 section dated 2026-11-03, leaving an empty Unreleased heading, with an Upstream subsection stating unchanged Spec Kit/ATV pins, unchanged optional-pack pins and unchanged 0.1.0 extension/preset components, plus v0.1.3...v0.1.4 and v0.1.4...HEAD comparison links. AC2: package.json, package-lock root, src/cli, report, doctor, adopt, init manifest, pinned install hint, sync generated_by, .baton/manifest.json and baton.lock.json agree on 0.1.4; generic historical-version fixtures and history stay unchanged. AC3: targeted version-bound init/update tests pass. AC4: npm run build regenerates the bundle; generated CLI reports 0.1.4, its raw-byte SHA-256 equals .baton/bin/baton.mjs.sha256, build freshness passes and size stays strictly below the 450 KiB cap. AC5: sync/manifest generator diffs are version metadata only; upstream pins and file hashes unchanged. AC6: release.yml tag/changelog guards reproduced locally; markdownlint on CHANGELOG passes. AC7: git diff --check, scoped validate and the mandatory npm run check through the supported work write pass, with any failure preserved honestly. AC8: no internal feed hostnames or machine paths in committed artifacts."
    by: release-014-work
  - id: D6
    decision: Record pre-check acceptance evidence from supported generators and targeted checks
    rationale: 'D3-D5 are byte-identical to the preregistration written before edits (payload SHA-256 2e94553b06b518109f45181c25dc48a553643e4fca11ff71cffccba24b0dfbcd at 2026-11-03T20:09:14+01:00; only summary changed and D6+ were appended later). AC1: CHANGELOG promotes the Added/Changed entries verbatim under ## [0.1.4] - 2026-11-03, keeps an empty Unreleased heading, adds Upstream (components 0.1.0, specify-cli 1.0.11 at 8147943512404afb9d99c6252cb9bf84369fd0b0, ATV main at ad996736b879be87c7755df5c5017d5336203bbc, token-budget v1.1.0 at 11c5589f347ddb3789b51b09927ef825c88e3f19, optimize v1.0.0 at d6dba6ae93bf60322deee3bdc4ffcf127e42b2b9) and v0.1.4 comparison links. Lock comparison with v0.1.3: speckit/atv entries identical; 19 files added, all optional-pack; none changed. AC2: package, package-lock root and packages[""], cli, report, doctor, adopt, init manifest and install hint, sync generated_by, .baton/manifest.json and baton.lock.json report 0.1.4; git grep finds 0.1.3 under src/test only in generic fixtures test/integration/context.test.mjs:52 and test/unit/schema.test.mjs:77, intentionally unchanged. AC3: node --test --test-name-pattern "derived install explains|update replaces only unmodified" test/integration/init.test.mjs test/integration/update.test.mjs passed 2/2; node --test test/integration/adopt.test.mjs passed 16/16.'
    by: release-014-work
  - id: D7
    decision: Record build, generator and guard evidence
    rationale: "Initial npm run build failed: Cannot find package esbuild (exit 10). npm ci --ignore-scripts --no-audit --no-fund with a process-scoped npm_config_registry=<approved internal npm feed> added 92 packages; no committed registry configuration changed. AC4: npm run build passed, 426781 bytes (strictly below the unchanged 450 KiB = 460800-byte cap); raw-byte SHA-256 c0709fd2d922c4d4d0ff0f0d4bcacd624479d722ade4e9ee958f0233b18921f9 equals .baton/bin/baton.mjs.sha256; the base bundle with its 7 occurrences of 0.1.3 replaced by 0.1.4 equals the new bundle byte-for-byte; doctor --json reports version 0.1.4; build --check passed. The build also rewrote the diagnostic metafile: only the input byte counts of src/lib/context-guards.mjs (20336 -> 19923) and src/commands/context.mjs (4896 -> 4806) changed, matching their canonical LF bytes (the committed counts were evidently generated from a CRLF working tree). The metafile is not checked or published; this is generator output, not behavior. AC5: node .baton/bin/baton.mjs sync (process-scoped UV_DEFAULT_INDEX/UV_INDEX_URL/PIP_INDEX_URL=<approved internal PyPI feed>) and npm run manifest passed; diffs only generated_by and baton_version; lock verify passed. AC6: a local node assertion reproduced release.yml tag/package equality and the 0.1.4 section/Upstream guard, and confirmed all four lock pins appear in that section; npx --no-install markdownlint-cli2 CHANGELOG.md passed, 0 errors. AC8: no feed hostnames or machine paths in changed/untracked files; git diff --check passed; scoped validate passed (pack-recommendation and advisory W_QUICK_LARGE warnings only)."
    by: release-014-work
  - id: D8
    decision: Leave the frozen template-cleanup.yml unchanged and escalate quick-record cleanup coverage
    rationale: "An attempted addition of release-014 entries to .baton/template-cleanup.yml was reverted: .baton/quick/release-records-docs-a7.md records that file at sha256 232ee939153736600d8802e9be822ebdb5fe141135a9073d0146e0089c22df5d (equal to base 51d1f86), so any edit makes validate fail with E_STALE_ARTIFACT, and the v0.1.2 precedent (review-land-fixes-012, frozen cleanup) treated an a7 checksum refresh as needing separate explicit human approval. Refreshing a historical approved baton would exceed this bookkeeping-only scope, and PR #51 (v0.1.3) did not touch the file. Consequence, consistent with v0.1.3: tracked release-013 (4 files), partial-feature-attach-013 (6 files), release-014 records and .context/compound-engineering/ce-review/release-013-7e5eb2c/ are not in remove, contrary to the F122 pre-tag guidance in docs/solutions/quick-lane-scope-and-stranded-land-2026-09-29.md; adopt skips nothing for them and adopt tests still validate. Not fixed here; Q1 asks for a human decision before tagging."
    by: release-014-work
  - id: D9
    decision: Run the mandatory configured check once through the supported work write
    rationale: "First supported write attempt (same command and environment) exited 1 after about 29 s: lint:md, lint:yaml (warnings only), typecheck, build --check, sync --check and lock verify passed, then validate failed E_STALE_ARTIFACT .baton/template-cleanup.yml, so E_EXIT_UNMET local-checks-pass and npm test did not run; the baton was not modified. Cause was this lane's own edit (D8), reverted with git checkout; global validate then exited 0. One justified retry runs the unchanged configured npm run check with process-scoped UV_DEFAULT_INDEX=<approved internal PyPI feed>. Only a successful CLI-generated receipt attests the run; a further failure is reported, not bypassed. No independent review, PR, merge, tag or workflow dispatch is authorized by this author task."
    by: release-014-work
  - id: D10
    decision: Include in this release with explicit approval
    rationale: "Pre-existing: .baton/template-cleanup.yml is frozen by the recorded a7 artifact hash, so tracked .baton/quick records for release-013, partial-feature-attach-013 and release-014 and the committed release-013-7e5eb2c CE report directory are not in its remove list, contrary to the F122 pre-tag guidance; they shipped in v0.1.3 and would ship in v0.1.4. Before tagging v0.1.4: fix in a separate approved quick lane (cleanup entries plus an approved a7 checksum refresh), include that in this release with explicit approval, or accept as in v0.1.3?"
    by: human:repository-owner
  - id: D11
    decision: Artifact hashes refreshed after intentional edit
    rationale: Owner answered Q1 to include cleanup bookkeeping, authorized the a7 checksum refresh, and separately selected Approve the fresh cleanup/checksum gate. Cleanup SHA-256 3393afa501a48e053be76683d8588ef7de90accc16e5613eb025ea2753078a1f. node --test test/integration/adopt.test.mjs passed 16/16; a YAML-based assertion verified all 48 tracked quick/review maintenance records are covered by cleanup remove entries; global validate and git diff --check passed. Original author work receipt preceded these metadata-only cleanup additions; independent review and mandatory land checks must cover this new candidate. No merge or publication approval inferred.
    by: implementation-session
  - id: D12
    decision: Verify candidate remains within quick scope
    tag: quick-scope-held
    rationale: "Reviewed exact CLI base 51d1f86 to 0b1a154: 20 tracked files cover all 12 CLI subjects. Source and tests change version identifiers only; the bundle equals base bytes with seven 0.1.3 strings replaced by 0.1.4 (SHA-256 c0709fd2d922c4d4d0ff0f0d4bcacd624479d722ade4e9ee958f0233b18921f9 matches sidecar); CHANGELOG promotes Unreleased verbatim with unchanged pins; manifest, lock and metafile changes are generated metadata; cleanup and a7 refresh are owner-approved bookkeeping. No user-facing behavior, public contract, upstream bytes or component versions change."
    by: release-014-review
  - id: D13
    decision: Dismiss all findings with reasons and route to land
    rationale: "R014-1 is dismissed because this lane keeps its CE run artifact untracked and commits no review payload; land must re-verify tracked .baton/quick and .context cleanup coverage at the final head. R014-2 is surfaced to the owner: the 2026-11-03 heading may precede the tag date, which depends on later human approvals. R014-3 refers to a historical CLI work receipt. No auto-fixes were applied. The first reviewer dispatch was lost to a tool interruption before results and was re-dispatched once unchanged. This receipt is not merge or publication approval."
    by: release-014-review
  - id: D14
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: aaa9c21865ede4438951a49893f87c988b8d3da72d3d77645f0f06b5fc55b5d1
    x-base-commit: 51d1f86f85420ff93df7a90e2e98926a828daa0a
    by: baton
  - id: D15
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: 0b1a1548cf8ecdbf507acce8ef644301462bd910
    by: baton
gate:
  required: false
  approved_by: null
  approved_at: null
history:
  - phase: work
    at: 2026-11-03T19:19:24.491Z
    by: release-014-work
    writer: 8e1a8d9ee98645a87426425344fb1fc5931903cbab39a61776b68ac48bf492c2
    x-worktree: bbd5004f069d8ef5cf20933a5b03c083f1059183c9da9e1be7a4de6fdfb14e1b
    commit: 51d1f86
    x-action: write
  - phase: work
    at: 2026-11-04T07:42:57.276Z
    by: human:repository-owner
    writer: 8e1a8d9ee98645a87426425344fb1fc5931903cbab39a61776b68ac48bf492c2
    x-worktree: bbd5004f069d8ef5cf20933a5b03c083f1059183c9da9e1be7a4de6fdfb14e1b
    commit: d2f3f51
    x-action: answer
  - phase: work
    at: 2026-11-04T07:44:00.441Z
    by: implementation-session
    writer: 8e1a8d9ee98645a87426425344fb1fc5931903cbab39a61776b68ac48bf492c2
    x-worktree: bbd5004f069d8ef5cf20933a5b03c083f1059183c9da9e1be7a4de6fdfb14e1b
    commit: d2f3f51
    x-action: refresh
  - phase: review
    at: 2026-11-04T08:09:40.285Z
    by: baton
    writer: 1406fb9d272be693b787799dd7fb21306b53cb2795722dcf79c844abb452a59f
    x-worktree: b5a01a3b5998db3f5aa9a583fc85f8ab120cb17c265045fa17cde674c7ebea6e
    commit: 0b1a154
    x-action: write
updated_at: 2026-11-04T08:09:40.276Z
updated_by: baton-review
risks:
  - id: R1
    text: Owner approval and merge must bind the exact final PR head. Only after merge may publication proceed through the pinned dry run and an owner-approved annotated v0.1.4 tag; neither action is performed by this release-preparation task.
    severity: low
x-implementation-writer: 8e1a8d9ee98645a87426425344fb1fc5931903cbab39a61776b68ac48bf492c2
x-implementation-worktree: bbd5004f069d8ef5cf20933a5b03c083f1059183c9da9e1be7a4de6fdfb14e1b
x-implementation-cycle: ba98a0f20405a5d7fb381aeaf85771f4e93533da1027be8d6daf68c188f4394d
review:
  findings_path: .baton/quick/release-014.review.json
  blocking_findings: 0
---
## Goal
Prepare the bookkeeping-only Baton v0.1.4 release candidate for all merged
Unreleased entries (PR #55). No new behavior, public contract, component
version or upstream pin changes.

## What changed
Version 0.1.3 -> 0.1.4 on the v0.1.3 (PR #51) surfaces: package.json,
package-lock root, src/cli, report, doctor, adopt, init manifest and pinned
install hint, sync generated_by, version-bound init/update tests, generated
.baton/manifest.json and baton.lock.json. CHANGELOG promotes all Unreleased
entries verbatim to 0.1.4 (2026-11-03) with an Upstream subsection and
comparison links. npm run build regenerated the bundle (version bytes only),
SHA-256 sidecar and metafile. Following the owner's Q1 answer,
template-cleanup.yml now removes release-014 and previously uncovered
release-013/partial-feature-attach-013 maintenance records and the release-013
review directory. The owner authorized the historical a7 checksum refresh
and separately approved its fresh gate; both are recorded through the CLI.
Acceptance checks were preregistered in D5 before edits; evidence is in the
work receipt decisions. The original work payload preserves the pre-Q1
state and is historical input, not the current cleanup decision.

## Next steps
1. `/baton-review` in a separate fresh checkout with its own identity
   (`/ce-review mode:headless`), then `/baton-land` -> `/land`.
2. Merge and v0.1.4 tag/publication each need separate explicit human
   approval bound to exact commits.

## Watch out for
- Generic 0.1.3 schema/context test fixtures are intentionally unchanged.
- The refreshed a7 artifact binding covers the owner-approved cleanup
  additions; do not edit the cleanup list again without refreshing that
  binding and obtaining its fresh gate approval.
- Package feeds are process-environment only; never commit feed addresses.
