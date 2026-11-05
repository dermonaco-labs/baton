---
baton: 1
lane: quick
feature: release-015
phase_completed: land
next_phase: compound
next_owner: ce-compound
status: ready
model_role: planning
suggested_model: claude-opus-5.5
summary: "Landed the v0.1.5 release-prep candidate as PR #60 into main from the reviewed head 6c12e0b. Land receive and the configured checks passed. The PR review gate is pending; merge, the v0.1.5 tag, publication and any workflow dispatch each need separate owner approval."
read_first:
  - path: .baton/quick/release-015.md
    why: Release scope, decisions and review base
  - path: CHANGELOG.md
    why: Promoted release notes and pinned upstream versions
  - path: .github/workflows/smoke.yml
    why: macOS-only local-checks coverage
artifacts: []
entry_checked: []
exit_criteria:
  - id: pr-opened
    met: true
    evidence: https://github.com/dermonaco-labs/baton/pull/60
open_questions: []
decisions:
  - id: D1
    decision: Start a quick lane
    tag: quick-eligible
    rationale: Prepare v0.1.5 release candidate for merged Unreleased changes and owner-approved macOS smoke coverage
    by: baton
  - id: D2
    decision: Record quick-lane review base
    rationale: Work starts at this commit
    tag: diff-base
    x-base-commit: 2c53a55bf0a04a68c8f518b4a1eed98acbc7bcca
    by: baton
  - id: D3
    decision: Keep v0.1.5 preparation in the quick lane
    rationale: The requester chose v0.1.5 and macOS smoke coverage for the existing local-checks suite. This release only versions existing CLI behavior and changes test selection on macOS, with no new user-facing behavior or public contract. Base origin/main is merge 2c53a55; v0.1.4 is the latest published release. No feature tasks.md exists for this release-only lane; feature analyze does not apply. Independent review follows work, before any PR or publication. Release preparation is authorized, not merge, tag, workflow dispatch or release publication.
    by: release-015-work
  - id: D4
    decision: Preregister v0.1.5 acceptance before editing release subjects
    rationale: "AC1: Move all and only the current Unreleased entries into a dated 0.1.5 section, add a faithful F07 POSIX bounded reap/Darwin EPERM note, retain an empty Unreleased heading and accurate unchanged/upgraded upstream pins and comparison links. Preserve historical 0.1.4 notes. AC2: Every current 0.1.4 package/CLI/test version surface and generated manifest/lock/bundle/sidecar reports 0.1.5, with historic fixtures untouched. AC3: The macOS smoke job alone adds test/unit/local-checks.test.mjs to its existing node --test selector; other OS jobs, source guard and action SHAs unchanged. AC4: Targeted local-checks/init/update and smoke-selector checks pass. AC5: npm run build, manifest and sync produce fresh metadata with upstream versions/commits/trees/file hashes unchanged from base; bundle SHA matches sidecar, size below 450 KiB, and build --check passes. AC6: release.yml tag/package and changelog guards reproduced, git diff --check and scoped/global baton validate pass, and one final npm run check passes through work write. AC7: No credentials, feed configuration, machine paths, merge, tag, release, PR or workflow dispatch. AC8: Fresh release-015 records are covered by template cleanup if the owner authorizes the bound a7 refresh; any historic release-014 CHANGELOG binding refresh requires separate owner authorization and its CLI-required gate."
    by: release-015-work
  - id: D5
    decision: Record owner-authorized historical binding updates without changing historical release claims
    rationale: The repository owner explicitly authorized via control-plane delegation a metadata-only release-014 CHANGELOG binding refresh for the 0.1.5 promotion/F07 note; CLI handoff refresh added D19 while leaving release-014's prior gate pending and its 0.1.4 section unchanged. In a separate owner decision via the same channel, they authorized the release-015 template-cleanup.yml entries, metadata-only release-records-docs-a7 binding refresh and renewed a7 gate; supported CLI refresh and approve recorded D22 and repository owner via control-plane delegation, without editing a7's subject or prior decisions. The CLI's schema-bounded 20-entry history trims its oldest entries; those remain in git history. No release-015 review or publication approval is implied.
    by: release-015-work
  - id: D6
    decision: Record focused pre-handoff acceptance evidence
    rationale: "AC1: all preexisting Unreleased bullets remain in the dated 2026-11-05 0.1.5 section, 0.1.4 historical section is byte-identical, F07 wording matches src/lib/local-checks.mjs and feature 004 D41/D48; comparison links and lock's peeled 1.3.0 commit match. AC2: src/cli, report, doctor, adopt, init and sync; package and lock roots; version-bound init/update expectations; generated manifest and lock now report 0.1.5. AC3: only the macOS smoke scenario command gained test/unit/local-checks.test.mjs; an existing maintainer-workflows test pins macOS-only inclusion, unconditional execution, unchanged source guard and SHA-pinned actions. AC4: initial focused test run passed 87/88 with the lone version-bound init regex expecting 0.1.4; updated it to 0.1.5 and reran all three affected test names with 3/3 pass. AC5: npm run build generated a 431965-byte bundle (<460800); raw SHA-256 02960c63952c11345410fe1a0004bc36e4867fae6ad9fc81349cced84f1c5acc equals sidecar; manifest, sync, build --check and lock verify passed. A comparison of lock upstreams/files against HEAD is identical. AC6: global validate passed with advisory recommended-pack/quick-size warnings; no approval, merge or publication was inferred. The first build and targeted tests failed for missing Node dependencies; npm ci --ignore-scripts --no-audit --no-fund restored 92 packages. Final configured check remains for the work write."
    by: release-015-work
  - id: D7
    decision: Verify v0.1.5 candidate remains within quick scope
    tag: quick-scope-held
    rationale: "Reviewed exact CLI base 2c53a55 to 843884e: 22 tracked files cover all 14 CLI subjects. Source and tests change only version literals. The bundle equals the base bundle with seven 0.1.4 strings replaced by 0.1.5, and its SHA-256 02960c63952c11345410fe1a0004bc36e4867fae6ad9fc81349cced84f1c5acc matches the sidecar. The manifest and lock are identical to base apart from baton_version and generated_by, so the Spec Kit 1.3.0, ATV main ad99673, token-budget v1.1.0 and optimize v1.0.0 pins are unchanged. The CHANGELOG promotes every Unreleased bullet with a faithful F07 note for the already-merged reapProcessGroup, which is absent at v0.1.4. The 0.1.4 history is byte-identical. smoke.yml is maintainer-only (template cleanup removes it) and only its macos step changed. The release-014, a7 and cleanup changes are owner-authorized bookkeeping. No user-facing behavior, public contract or component version changes."
    by: release-015-review
  - id: D8
    decision: Dismiss both P3 findings with reasons and route to land
    rationale: "R015-1 (testing) is a false positive: maintainer-workflows.test.mjs:122-123 already requires the macos job. R015-2 (project-standards) is a stale placeholder body with existing precedent; the frontmatter and `handoff next` route, and D3-D6 record the changes. No P0, P1 or P2 findings and no auto-fixes. Targeted checks passed: build --check, sync --check, lock verify, typecheck, git diff --check, the release.yml tag/package and changelog guards for v0.1.5, local-checks plus maintainer-workflows 28/28, init/update version tests 2/2, and global and path validate exit 0 with advisory warnings only. The work-write npm run check (706 pass, 0 fail) was not rerun. The CE run artifact and this payload stay untracked under gitignored .context/. This receipt is not owner approval."
    by: release-015-review
  - id: D9
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: 15dcb27e46b6ec60c370ce3214680232263ae5e022c4192658298e7c9eacaa9b
    x-base-commit: 2c53a55bf0a04a68c8f518b4a1eed98acbc7bcca
    by: baton
  - id: D10
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: 843884e862e13e4ff2779542a8a2d8b16df4fb5a
    by: baton
  - id: D11
    decision: Open the v0.1.5 release-prep PR without merging
    rationale: "Owner approved landing via control-plane delegation. Run from the independent review checkout at 6c12e0b, which is not the work checkout. `handoff receive --phase land --quick release-015` exited 0 with no E_SELF_REVIEW. `npm run check` exited 0 (tests 717, suites 10, pass 706, fail 0, cancelled 0, skipped 11, todo 0). `baton validate` exited 0 with advisory W_PACK_RECOMMENDED and W_QUICK_LARGE warnings only. `gh pr create --base main` opened #60 using .github/pull_request_template.md. The session note is written outside the repo. No merge, gate approval, tag, release, workflow dispatch, CI rerun or settings change."
    by: release-015-land
gate:
  required: true
  approved_by: null
  approved_at: null
history:
  - phase: work
    at: 2026-11-05T14:58:04.047Z
    by: release-015-work
    writer: 7eaa43b0f60faebc891a621528b92c2d8a7804de7e591f0d3e703093cdbb64aa
    x-worktree: 2c2debb6cccf5bef661bd1eb4f4feb2d2eddebf4667460a974d77dc3acfaeb88
    commit: 2c53a55
    x-action: write
  - phase: review
    at: 2026-11-05T15:05:23.500Z
    by: release-015-review
    writer: 56be92467971b4566ea06882af1cd79134253df6d62a6dade3b5d477afb94c5e
    x-worktree: a8c6ef7ed2851dc84c200c494d28cc74cba6cbbb49d3ab67f4c0b5ab1424842c
    commit: 843884e
    x-action: write
  - phase: land
    at: 2026-11-05T15:20:59.977Z
    by: release-015-land
    writer: 56be92467971b4566ea06882af1cd79134253df6d62a6dade3b5d477afb94c5e
    x-worktree: a8c6ef7ed2851dc84c200c494d28cc74cba6cbbb49d3ab67f4c0b5ab1424842c
    commit: 6c12e0b
    x-action: write
updated_at: 2026-11-05T15:20:59.968Z
updated_by: baton-land
risks:
  - id: R1
    text: The macOS runner can exercise the real Darwin process-group behavior only after a separately approved tag or workflow dispatch; local Linux tests cover injected-dependency paths.
    severity: low
x-implementation-writer: 7eaa43b0f60faebc891a621528b92c2d8a7804de7e591f0d3e703093cdbb64aa
x-implementation-worktree: 2c2debb6cccf5bef661bd1eb4f4feb2d2eddebf4667460a974d77dc3acfaeb88
x-implementation-cycle: 01318e6574a449d831077e2a883524b791a1935774298bc1c3ad9c781339f4c9
review:
  findings_path: .baton/quick/release-015.review.json
  blocking_findings: 0
pr:
  url: https://github.com/dermonaco-labs/baton/pull/60
  number: 60
---
## Goal
Keep the work in scope.

## What changed
Pending phase work.

## Next steps
1. `/ce-work`

## Watch out for
- Escalate decisions that change behaviour or public contracts.
