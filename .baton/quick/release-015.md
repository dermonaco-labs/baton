---
baton: 1
lane: quick
feature: release-015
phase_completed: work
next_phase: review
next_owner: baton-review
status: ready
model_role: review
suggested_model: claude-opus-5.5
summary: "Prepare the v0.1.5 candidate from merge 2c53a55: promote all Unreleased entries with F07, version CLI/package/metadata, run local-checks in macOS smoke only, and refresh owner-authorized historical bindings and template cleanup. Independent review is next; no PR, merge or publication."
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
  - id: diff-nonempty
    met: true
    evidence: 14 changed files
  - id: local-checks-pass
    met: true
    evidence: |-
      baton: 0
      stdout (tail):
      ch the written bytes (826.427542ms)
        ✔ new rows may not collide with each other or with kept rows in any letter case (6.836701ms)
        ✔ every committed lock row has the shape sync writes, so the shared row policy cannot drift from sync (1.389449ms)
        ✔ install targets outside the upstream install roots are rejected even for a base-locked row (6.200965ms)
      ✔ upstream candidates speckit and atv row ownership policy (1002.825118ms)
      ▶ upstream candidates lifecycle
        ✔ a branch is bot-only only when every commit is authored and committed by the bot (0.280007ms)
        ✔ the same pin, base and digest is unchanged; a new base or content regenerates (0.699372ms)
        ✔ a human-edited candidate with a newer pin waits for the human (1.228038ms)
        ✔ a candidate PR without a valid marker blocks for manual repair; its title is never trusted (2.034569ms)
        ✔ a closed candidate with a restored marker suppresses its pin or, when marked obsolete, releases it (0.572703ms)
        ✔ a human close suppresses exactly that pin; a newer pin generates again (1.001511ms)
        ✔ the automation obsolete close never suppresses (0.26187ms)
        ✔ when the default branch pins the same or newer, bot-only PRs close and human PRs are reported (1.920149ms)
      ✔ upstream candidates lifecycle (8.302724ms)
      ▶ upstream candidates Spec Kit github extension trust (feature 004)
        ✔ stored extension files under a pack install root are trusted like BOUND_ROOTS (9.373068ms)
        ✔ a lock row carrying x-speckit-extension is trusted in either lock (12.659653ms)
        ✔ x-speckit-extension is frozen on existing rows (5.24474ms)
        ✔ the Baton wrapper may not become a Spec Kit lock row (4.144021ms)
        ✔ regenerated ordinary core rows stay outside the narrowed trust (4.674662ms)
        ✔ x-speckit-extension appears only on issues-pack extension rows, always as github (0.744559ms)
        ✔ the bound requirements paths are the ones sync and lock use (0.086599ms)
      ✔ upstream candidates Spec Kit github extension trust (feature 004) (37.246155ms)
      ✔ every feature phase and quick lane phase has a valid independent fixture (281.564547ms)
      ✔ pre-existing feature baton without specify history or attachment still validates (98.915022ms)
      ▶ each invalid baton fixture reports its named stable error, without unrelated errors
        ✔ E_ACTOR_FORMAT (81.587257ms)
        ✔ E_ANALYSIS_CRITICAL (4.888781ms)
        ✔ E_ANALYSIS_MISSING (2.623096ms)
        ✔ E_APPROVER_FORMAT (3.316939ms)
        ✔ E_BLOCKING_OPEN (2.158234ms)
        ✔ E_BODY_SECTIONS (6.155497ms)
        ✔ E_BUDGET (4.185743ms)
        ✔ E_DENYLIST (2.849383ms)
        ✔ E_EXIT_UNMET (2.311863ms)
        ✔ E_GATE_PENDING (18.648662ms)
        ✔ E_LANE_ESCALATE (97.629086ms)
        ✔ E_LANE_MISMATCH (2.733881ms)
        ✔ E_MISSING_ARTIFACT (2.325784ms)
        ✔ E_MODEL_NOT_ALLOWED (7.224068ms)
        ✔ E_MULTIPLE_BATONS (5.021438ms)
        ✔ E_NO_PREREG (4.319702ms)
        ✔ E_OWNER (5.030631ms)
        ✔ E_PR_MISSING (4.662113ms)
        ✔ E_REVIEW_BLOCKING (52.691386ms)
        ✔ E_REVIEW_MISSING (4.193896ms)
        ✔ E_SCHEMA (6.03011ms)
        ✔ E_STALE_ARTIFACT (2.973068ms)
        ✔ E_TRANSITION (2.327286ms)
      ✔ each invalid baton fixture reports its named stable error, without unrelated errors (345.801778ms)
      ✔ quick phase checks require a reasoned decision, resolved findings and explicit scope evidence (125.616985ms)
      ✔ feature phase checks reject missing story evidence, clarification and critical analysis (15.647852ms)
      ▶ model allowlist warns in warn mode and errors in error mode
        ✔ warn mode emits W_MODEL_NOT_ALLOWED without an error (73.656828ms)
        ✔ error mode emits E_MODEL_NOT_ALLOWED (16.260224ms)
      ✔ model allowlist warns in warn mode and errors in error mode (115.726858ms)
      ✔ sample handoff satisfies its schema, phase contract, hashes and gate (91.052953ms)
      ✔ sample evidence uses LF bytes so checked-in fixture hashes stay portable (11.05281ms)
      ✔ malformed frontmatter is reported as E_FRONTMATTER_MALFORMED (10.856558ms)
      ✔ ready with a blocking question is rejected (85.951576ms)
      ✔ role-only A5 examples reject malformed approvers and actors with their stable codes (111.943172ms)
      ℹ tests 717
      ℹ suites 10
      ℹ pass 706
      ℹ fail 0
      ℹ cancelled 0
      ℹ skipped 11
      ℹ todo 0
      ℹ duration_ms 169850.996925
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
gate:
  required: false
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
updated_at: 2026-11-05T14:55:05.189Z
updated_by: ce-work
risks:
  - id: R1
    text: The macOS runner can exercise the real Darwin process-group behavior only after a separately approved tag or workflow dispatch; local Linux tests cover injected-dependency paths.
    severity: low
x-implementation-writer: 7eaa43b0f60faebc891a621528b92c2d8a7804de7e591f0d3e703093cdbb64aa
x-implementation-worktree: 2c2debb6cccf5bef661bd1eb4f4feb2d2eddebf4667460a974d77dc3acfaeb88
x-implementation-cycle: 01318e6574a449d831077e2a883524b791a1935774298bc1c3ad9c781339f4c9
---
## Goal
Keep the work in scope.

## What changed
Pending phase work.

## Next steps
1. `/ce-work`

## Watch out for
- Escalate decisions that change behaviour or public contracts.
