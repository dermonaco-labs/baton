---
baton: 1
lane: feature
feature: 001-baton-template
phase_completed: review
next_phase: land
next_owner: baton-land
status: ready
model_role: implementation
suggested_model: gpt-6-sol
summary: "Re-review 4 of fix pass 4 (PR 28): F86-F89 and F91 verified, F90/F96 partial (P3), F92-F95/F97 deferrals accepted; 13 new findings (0 P0, 0 P1, 3 P2, 10 P3). No blocking findings."
read_first:
  - path: specs/001-baton-template/spec.md
    why: Review scope and acceptance criteria
    sha256: af38490d3093545c1ea3c533f24ba09311eafce04de57fc2d510ec60f0e4ca9d
  - path: specs/001-baton-template/plan.md
    why: Review architecture and technical constraints
    sha256: 84dd6fe310b5696ba5beb088aa74c450fa13c3778bfc763d64c32bcbead37079
  - path: specs/001-baton-template/tasks.md
    why: Review recovered-red evidence and check-specific waivers
    sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - path: specs/001-baton-template/review.json
    why: Review fixed and deferred findings, including owner-raised F62
    sha256: 5f75801603a27b1115807dcf912350e3bfd2e8496fa16b592e36dcbdd1889539
  - path: specs/001-baton-template/contracts/ci.md
    why: Review F39 hosted verification and restored link check
    sha256: d90ecc2e0839d0314ae4df5a4591c40b6ce538549db8fbca3fa5ef9d97791fb5
do_not_read:
  - path: specs/001-baton-template/roadmap.md
    why: Future release scope
artifacts:
  - path: .specify/memory/constitution.md
    role: source-of-truth
    sha256: 2483435fa0d2f24999d9c4351b6c1b286a41bfce344c1eef5b84f269a7299391
  - path: specs/001-baton-template/spec.md
    role: source-of-truth
    sha256: af38490d3093545c1ea3c533f24ba09311eafce04de57fc2d510ec60f0e4ca9d
  - path: specs/001-baton-template/research.md
    role: evidence
    sha256: afdc07d728b0eb6c412c427ef9c976268fe0337f0b376b7c0c96c262a1572bda
  - path: specs/001-baton-template/plan.md
    role: source-of-truth
    sha256: 84dd6fe310b5696ba5beb088aa74c450fa13c3778bfc763d64c32bcbead37079
  - path: specs/001-baton-template/data-model.md
    role: source-of-truth
    sha256: 923bfff75c172f22ef081e09d4ded440926f6c8c39beaecc580187482dfa8654
  - path: specs/001-baton-template/contracts/handoff-contract.md
    role: source-of-truth
    sha256: 92494280140abe8467ad936f4b6fa52bb5d30a5f6e21f777c1b44758aa2d1d66
  - path: specs/001-baton-template/contracts/phase-contracts.md
    role: source-of-truth
    sha256: c7b762f985dc3e0d2c6e09a53e8306eb46e42cf1375b1b3aaaf3f391e8414b9e
  - path: specs/001-baton-template/contracts/conflict-rules.md
    role: source-of-truth
    sha256: 2468e82ca33bd1a19530cc9b177bbc23f64dfec3a1b2b094a7aeecb3f0cafd4a
  - path: specs/001-baton-template/contracts/packs.md
    role: source-of-truth
    sha256: 75dcc68ac03b9caa0b731635e3ccfd5895ed0d00e05b19fca8cd6b438be4bbf4
  - path: specs/001-baton-template/contracts/cli.md
    role: source-of-truth
    sha256: 96a4eca544c8a9bf345ccad8da0b384efbd0a9994e0400169f3bd78ed78e1423
  - path: specs/001-baton-template/contracts/ci.md
    role: source-of-truth
    sha256: d90ecc2e0839d0314ae4df5a4591c40b6ce538549db8fbca3fa5ef9d97791fb5
  - path: specs/001-baton-template/quickstart.md
    role: derived
    sha256: 286706951ad3f80db0ebf81084d49690b6f01b92a906b0517c811d68656aff04
  - path: specs/001-baton-template/tasks.md
    role: derived
    sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - path: specs/001-baton-template/analysis.md
    role: evidence
    sha256: cabcda605da244e6a427c0c0c81755b54fb7ec1468778726df3fab40411daf2d
  - path: specs/001-baton-template/checklists/requirements.md
    role: evidence
    sha256: 893d152f9bb358301756d5485d7b34cc767e4466a933f9417eaced35c3eea017
  - path: specs/001-baton-template/review.json
    role: evidence
    sha256: 5f75801603a27b1115807dcf912350e3bfd2e8496fa16b592e36dcbdd1889539
entry_checked:
  - id: tasks-exists
    ok: true
  - id: fresh:spec,plan,tasks
    ok: true
    evidence: analyzed at 23b1a1d; the artifacts were then amended by the analyze fixes and amendments A1-A6 and re-hashed here
exit_criteria:
  - id: findings-json-valid
    met: true
    evidence: specs/001-baton-template/review.json
  - id: findings-mapped-to-tasks-or-dismissed
    met: true
    evidence: 0 findings unresolved
analysis:
  report_path: specs/001-baton-template/analysis.md
  critical: 0
  high: 0
acceptance_checks:
  - id: AC-US1-1
    story: US1
    check: node --test test/integration/adopt.test.mjs
    kind: test-id
    expect_initial: fail
  - id: AC-US1-2
    story: US1
    check: quickstart S1 script exits 0
    kind: command
    expect_initial: fail
  - id: AC-US1-3
    story: US1
    check: adopt.test 'cannot push -> run baton adopt'
    kind: test-id
    expect_initial: fail
  - id: AC-US1-4
    story: US1
    check: timed newcomer walkthrough <= 10 min (SC-001)
    kind: manual
    expect_initial: n/a
  - id: AC-US1-5
    story: US1
    check: adopt.test 'baton.yml installed, workflows untouched, constitution replaced'
    kind: test-id
    expect_initial: fail
  - id: AC-US2-1
    story: US2
    check: node --test test/integration/init.test.mjs
    kind: test-id
    expect_initial: fail
  - id: AC-US2-2
    story: US2
    check: init.test 'idempotent rerun'
    kind: test-id
    expect_initial: fail
  - id: AC-US2-3
    story: US2
    check: init.test '--packs core,learning'
    kind: test-id
    expect_initial: fail
  - id: AC-US2-4
    story: US2
    check: packs.test 'per-pack closure; docs-review without adversarial-document-reviewer -> E_DANGLING_REF'
    kind: test-id
    expect_initial: fail
  - id: AC-US2-5
    story: US2
    check: packs.test 'core closes with reasoned optional_refs; reason-less, unknown-pack or stale upstream-absent entry -> E_DANGLING_REF; @ in code is not a ref'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-1
    story: US3
    check: node --test test/unit/validate-handoff.test.mjs
    kind: test-id
    expect_initial: fail
  - id: AC-US3-2
    story: US3
    check: relay.test 'gate pending exits 3'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-3
    story: US3
    check: relay.test 'stale artifact then refresh'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-4
    story: US3
    check: relay.test 'E_NO_PREREG before implement'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-5
    story: US3
    check: relay.test 'land requires pr.url and checks'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-6
    story: US3
    check: node .baton/bin/baton.mjs validate --path specs/001-baton-template/handoff.md
    kind: command
    expect_initial: fail
  - id: AC-US3-7
    story: US3
    check: relay.test 'checked task stays fresh, reworded task is stale'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-8
    story: US3
    check: validate-handoff.test + relay.test 'role-only approver incl. control-plane delegation; handle/email/name, bad hyphens and upper case rejected; denylist'
    kind: test-id
    expect_initial: fail
  - id: AC-US3-9
    story: US3
    check: "phases.test + relay.test 'any_of compound: solution or skip-compound; group errors'"
    kind: test-id
    expect_initial: fail
  - id: AC-US3-10
    story: US3
    check: relay.test 'quick relay new->work->review->land, escalate, feature->quick rejected'
    kind: test-id
    expect_initial: fail
  - id: AC-US4-1
    story: US4
    check: models.test 'role resolution + overrides'
    kind: test-id
    expect_initial: fail
  - id: AC-US4-2
    story: US4
    check: models.test 'enforce error -> E_MODEL_NOT_ALLOWED'
    kind: test-id
    expect_initial: fail
  - id: AC-US4-3
    story: US4
    check: models.test 'apply idempotent, managed only'
    kind: test-id
    expect_initial: fail
  - id: AC-US5-1
    story: US5
    check: node .baton/bin/baton.mjs sync --check
    kind: command
    expect_initial: fail
  - id: AC-US5-2
    story: US5
    check: node --test test/integration/update.test.mjs
    kind: test-id
    expect_initial: fail
  - id: AC-US5-3
    story: US5
    check: upstream-watch workflow_dispatch updates one issue, no push
    kind: manual
    expect_initial: n/a
  - id: AC-US6-1
    story: US6
    check: validate.test 'missing reference -> E_UNDOCUMENTED'
    kind: test-id
    expect_initial: fail
  - id: AC-US6-2
    story: US6
    check: README renders hero, both quick starts, diagram, credits
    kind: manual
    expect_initial: n/a
  - id: AC-US7-1
    story: US7
    check: PR Linux baton and Windows MVP smoke green within SC-007 budget; full three-OS smoke on tag or manual dispatch
    kind: manual
    expect_initial: n/a
  - id: AC-US7-2
    story: US7
    check: broken-frontmatter commit yields E_FRONTMATTER_MALFORMED annotation
    kind: manual
    expect_initial: n/a
  - id: AC-US7-3
    story: US7
    check: release dry_run produces assets + SHA256SUMS
    kind: manual
    expect_initial: n/a
decisions:
  - id: D1
    decision: "Vendoring = hybrid D: lock + materialized snapshot + baton sync (specify-cli 1.0.11 from hash-locked requirements; ATV templates from a git fetch at the pinned commit with commit and tree ids verified, never executed)"
    rationale: reproducible, offline for adopters, updatable, CI-verifiable with sync --check, and every download verified (research R4, analyze C1)
    by: planning-session
  - id: D2
    decision: Pin ATV to main@ad996736b879be87c7755df5c5017d5336203bbc instead of npm 2.6.3
    rationale: 49/51 agent templates in 2.6.3 have no newlines (broken frontmatter); fixed in f0a86ef but unreleased (research R3)
    by: planning-session
  - id: D3
    decision: Integrate through a Spec Kit extension with mandatory before_/after_ hooks, 3 wrapper skills and an append-only preset; never patch upstream files
    rationale: Principle I; upstream updates stay mechanical (research R5)
    by: planning-session
  - id: D4
    decision: speckit-plan is the only planner; ce-plan, deepen-plan, docs/plans, lfg, slfg and ralph-loop are excluded; the quick lane is ce-work -> baton-review -> baton-land
    rationale: removes the duplicate and conflicting workflows (conflict-rules C1-C6)
    by: planning-session
  - id: D5
    decision: Model routing by role in .baton/config.yml (planning/review claude-opus-5.5, implementation gpt-6-sol, fast claude-haiku-4.5), enforce defaults to warn, writing agent frontmatter is opt-in
    rationale: Principle VII; the defaults are dated suggestions
    by: planning-session
  - id: D6
    decision: No GitHub Pages site and no npm publish in v0.1; distribute via the template, npx github:...#tag and release assets with SHA256SUMS and provenance
    rationale: cheap and verifiable (research R9, R11)
    by: planning-session
  - id: D7
    decision: "Scope gate (specify; clarify skipped because there are 0 NEEDS CLARIFICATION markers): the owner approved the planning outline in plan mode before the artifacts were written"
    rationale: recorded honestly; the owner re-confirms scope at the analyze gate
    by: human:repository-owner
  - id: D8
    decision: Template cleanup never touches .github/workflows/ (adopt --no-workflows); maintainer workflows are dormant behind a repository guard; every install ships an adopter baton.yml
    rationale: GITHUB_TOKEN cannot push workflow changes, and RK1 needs a server-side backstop (research R12, analyze H1-H3)
    by: review-session
  - id: D9
    decision: Persist the read-only analyze report to analysis.md from the Baton hook, and hash tasks.md checkbox-insensitively
    rationale: the implement gate needs a file, and implement progress must not make the baton stale (research R13, analyze H5-H6)
    by: review-session
  - id: D10
    decision: baton-review always runs ce-review mode:headless and normalizes the findings into a Baton-owned review.json (findings.schema.json)
    rationale: no load-bearing upstream-internal files or interactive todo-create side effects (research R13, analyze H7)
    by: review-session
  - id: D11
    decision: Optional pack payloads live in packs/<id>/files/; derived repos add packs via the pinned npx command
    rationale: init --packs needs a payload, and derived repos drop packs/ (FR-053, analyze H4)
    by: review-session
  - id: D12
    tag: amendment-a1
    decision: "gate.approved_by is role-only: '<role>' or '<role> via <channel>' from config.gates, plus approved_at as an ISO date; human actors are 'human:<role-slug>'; E_DENYLIST scans batons for emails, at-mentions, user-home paths and untracked terms"
    rationale: public repo; no personal handles or emails in committed batons (data-model 1.1)
    by: human:repository-owner
  - id: D13
    tag: amendment-a2
    decision: Entry/exit lists accept check groups {id, all_of|any_of}; the top level is an implicit all_of; compound exit is the any_of group compound-recorded
    rationale: OR criteria need an exact, validated syntax (data-model 2.1)
    by: human:repository-owner
  - id: D14
    tag: amendment-a3
    decision: The quick lane is phases work -> review -> land -> compound with by_lane.quick overrides; it starts with handoff new --quick, escalates to specify only from work/review via --from-quick, and feature -> quick is illegal
    rationale: the owner and entry checks of the quick lane must be representable in phases.yml and the baton (phase-contracts Quick lane)
    by: human:repository-owner
  - id: D15
    tag: amendment-a4
    decision: adversarial-document-reviewer ships in the docs-review pack (not core); closure is checked per pack (the pack plus its requires) and covers dispatched agents
    rationale: document-review dispatches that agent; MIT upstream ATV content (packs.md Closure rules)
    by: human:repository-owner
  - id: D16
    tag: amendment-a5
    decision: Approver and actor words are [a-z]+(-[a-z]+)* (internal single hyphens); role and channel are 1-4 words separated by single spaces; human actors are human:[a-z]+(-[a-z]+)*; nothing else changes
    rationale: the A1 pattern rejected the prescribed channel control-plane delegation (data-model 1.1)
    by: human:repository-owner
  - id: D17
    tag: license-notice-exemption
    decision: Verbatim third-party license emails are exempt from email scanning only in THIRD_PARTY_NOTICES.md and vendored license files; all other privacy checks still apply
    rationale: copyright attribution and full license text are mandatory, while repository-owner data remains prohibited
    by: human:repository-owner
  - id: D18
    tag: amendment-a6
    decision: "Resolves implement Q1 (E_DANGLING_REF at the pin): upstream files and the pin stay unchanged and closure stays strict; every optional_refs entry needs reason upstream-absent (checked absent at the pin, listed in the T074 draft), pack-provided:<pack> (recommended pack, W_PACK_RECOMMENDED warning) or excluded:C<n> (settled exclusions); review-plus gains four ce-compound enhancement agents, design gains design-iterator; @ inside code is not a reference; core is unchanged"
    rationale: references must be classified, not silenced (packs.md Reference classification at the pin); D17 is recorded on the implementation branch
    by: human:repository-owner
  - id: D19
    decision: Artifact hashes refreshed after intentional edit
    rationale: Merge approved A6 and reconcile D17-D18 with updated planning artifacts
    by: implementation-session
  - id: D20
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record verified A6 pack closure and derived recommendation metadata
    by: implementation-session
  - id: D21
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record verified A6 upstream resource contradiction without choosing a policy
    by: implementation-session
  - id: D22
    tag: pin-resource-inventory
    decision: Classify upstream-absent against verified installable resources rather than development-only upstream tooling
    rationale: ATV ad99673 contains every-style-editor under its development .github/skills tree but not in pkg/scaffold/templates; A6 classifies the installable enhancement as absent
    by: implementation-session
  - id: D23
    decision: Artifact hashes refreshed after intentional edit
    rationale: Clarify verified installable pin inventory for A6
    by: implementation-session
  - id: D24
    decision: Artifact hashes refreshed after intentional edit
    rationale: Clarify quick reviewer scope evidence in phase contract
    by: implementation-session
  - id: D25
    decision: Artifact hashes refreshed after intentional edit
    rationale: Require independently verified analysis severity and reviewer scope evidence
    by: implementation-session
  - id: D26
    decision: Artifact hashes refreshed after intentional edit
    rationale: Completed relay and adoption task checkboxes after pinned verification
    by: implementation-session
  - id: D27
    decision: Artifact hashes refreshed after intentional edit
    rationale: Recorded verified MVP tasks and corrected seven-hook runtime evidence
    by: implementation-session
  - id: D28
    tag: amendment-a7
    decision: Record the post-v0.1 backlog RM1-RM18 in roadmap.md (v0.2 core-promise items, v0.3 differentiators, optional packs); every item becomes its own Spec Kit feature, new baton data starts under x-* keys, and v0.1 scope, tasks and acceptance checks are unchanged
    rationale: keeps the MVP stable while preserving the optimization and integration ideas (analysis A7)
    by: human:repository-owner
  - id: D29
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record A7 post-v0.1 roadmap
    by: implementation-session
  - id: D30
    decision: Artifact hashes refreshed after intentional edit
    rationale: Mark T075 README hero done
    by: implementation-session
  - id: D31
    decision: Artifact hashes refreshed after intentional edit
    rationale: US2 CLI contract clarifies standalone update payload; T055-T062 implemented while remaining feature tasks stay open
    by: implementation-session
  - id: D32
    decision: Artifact hashes refreshed after intentional edit
    rationale: US2 overlay CLI contract refined for explicit uv regeneration; T055-T063 are implemented and locally exercised; other feature tasks remain open
    by: implementation-session
  - id: D33
    decision: Artifact hashes refreshed after intentional edit
    rationale: T064 updated research R7 after verifying current GitHub agent model documentation
    by: implementation-session
  - id: D34
    decision: Artifact hashes refreshed after intentional edit
    rationale: US4 T064-T068 implemented and locally validated; implement baton remains open for later feature stories before review
    by: implementation-session
  - id: D35
    decision: Artifact hashes refreshed after intentional edit
    rationale: US5 T069-T074 implemented and locally checked; full feature implement remains open; networked sync --check blocked by missing specify-cli 1.0.11 in internal PyPI feed
    by: implementation-session
  - id: D36
    decision: New maintainer workflows use tag or manual triggers, separate OS jobs without a matrix, and no release is cut during implementation
    rationale: The current task's explicit release rules take precedence over the earlier PR-triggered matrix in ci.md; owner resolution is recorded in D37
    by: implementation-session
  - id: D37
    decision: PR CI remains Linux baton validation plus Windows MVP smoke; full lint, tests and separate Linux, macOS and Windows smoke run only on tags or manual dispatch
    rationale: Repository owner resolved Q2 through control-plane delegation to conserve GitHub Actions minutes; spec AC-US7-1, FR-070/071, ci.md, quickstart S7 and tasks T083/T084 now match
    by: human:repository-owner
  - id: D38
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record owner-approved CI contract and updated acceptance registry
    by: implementation-session
  - id: D39
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record verified release dry-run assets and provenance in T085; retain open manual gates
    by: implementation-session
  - id: D40
    decision: Artifact hashes refreshed after intentional edit
    rationale: Annotate owner-pending close-out subitems and roadmap backlog
    by: implementation-session
  - id: D41
    decision: Artifact hashes refreshed after intentional edit
    rationale: Correct S3 fixture setup instructions
    by: implementation-session
  - id: D42
    decision: Artifact hashes refreshed after intentional edit
    rationale: Document fixture bootstrapping for S2 and S3
    by: implementation-session
  - id: D43
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record S1-S6 acceptance evidence and pending owner checks
    by: implementation-session
  - id: D44
    decision: Use hosted PR CI as the authoritative npm check and sync verification when this workstation's internal feeds lack locked packages
    rationale: Repository owner resolved the feed blocker through control-plane delegation; local npm lacks ignore version 7.0.10 and internal PyPI lacks specify-cli version 1.0.11; never switch this workstation to public registries. Record CI run IDs before implement-to-review handoff
    by: human:repository-owner
  - id: D45
    decision: Record RM19 as a docs-only v0.3 backlog item without changing v0.1 tasks or contracts
    rationale: The owner's explicit roadmap request supersedes the previous do_not_read hint for roadmap.md
    by: human:repository-owner
  - id: D46
    decision: Artifact hashes refreshed after intentional edit
    rationale: Document owner-authorized hosted CI fallback and RM19
    by: implementation-session
  - id: D47
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record hosted annotation in acceptance registry
    by: implementation-session
  - id: D48
    decision: Artifact hashes refreshed after intentional edit
    rationale: Repair CI denylist wording and commit refreshed task hashes
    by: implementation-session
  - id: D49
    decision: Defer only owner-pending v0.1 subitems and keep the implement handoff blocked on the actual local-checks-pass contract
    rationale: Repository owner approved an explicit deferred-task record and requested a v0.2 hosted-CI evidence route rather than a v0.1 CLI contract change
    by: human:repository-owner
  - id: D50
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record green PR checks, defer owner-only subitems and log RM20
    by: implementation-session
  - id: D51
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record the implement-handoff task marker and clarified exit contract for the checkbox-loop fix
    by: implementation-session
  - id: D52
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record local internal-feed dependency gate evidence
    by: implementation-session
  - id: D53
    decision: Artifact hashes refreshed after intentional edit
    rationale: Align review context and restricted-mirror guidance with completed local gate
    by: implementation-session
  - id: D54
    decision: Review scope uses the explicit base 8aeed8a (initial commit) to head 0673c66 instead of the diff-nonempty merge-base
    rationale: Every implement increment (PRs 1-7, 16-20) was merged to main before review, so merge-base HEAD origin/HEAD yields 0 changed files and receive --phase review fails diff-nonempty. The whole v0.1 implementation is the review subject; the limitation is recorded as finding F09.
    by: baton-review
  - id: D55
    decision: Review-role session records findings only; no safe_auto fixes applied and next is set to implement explicitly
    rationale: The requester scoped this session to review artifacts. Seven P1 findings are open, and auto-routing review to implement is not implemented (F02), so --next implement is passed explicitly. Personas were limited to the installed reviewer agents.
    by: baton-review
  - id: D56
    decision: Artifact hashes refreshed after intentional edit
    rationale: Review fix pass updates findings dispositions and command contract while preserving the received implement phase
    by: implementation-session
  - id: D57
    decision: Artifact hashes refreshed after intentional edit
    rationale: Fix-pass contract clarification changed phase checks after the initial implementation receive
    by: implementation-session
  - id: D58
    decision: Artifact hashes refreshed after intentional edit
    rationale: Review finding dispositions and CLI/phase contracts updated after verified fixes
    by: implementation-session
  - id: D59
    decision: Artifact hashes refreshed after intentional edit
    rationale: Update fix-pass acceptance evidence and 201-test local result
    by: implementation-session
  - id: D60
    decision: Artifact hashes refreshed after intentional edit
    rationale: Distinguish archived red-first regression evidence from legacy acceptance checks without retained red runs
    by: implementation-session
  - id: D61
    decision: Artifact hashes refreshed after intentional edit
    rationale: Update fix-pass evidence to final 204-test count after acceptance parser regression tests
    by: implementation-session
  - id: D62
    tag: review-fix-deferrals
    decision: Defer F21-F23 with explicit reasons in review.json while re-reviewing the completed P1, P2 and trivial P3 fixes
    rationale: Archive checksum distribution, configured-check trust boundaries and denylist placeholder policy each need a separately approved public contract; this pass does not silently choose one
    by: implementation-session
  - tag: rereview-scope
    decision: Re-review scope is the fix-pass diff 763d81f..658ba43 plus verification of every prior finding; review.json base moves to 763d81f
    id: D63
    rationale: receive --phase review passed via the prior review.json base (8aeed8a); the fix pass is the new review subject, so the next diff base is the head of the previous review
    by: baton-review
  - decision: Review-role session records findings only; no safe_auto fixes applied and ce-review ran headless with the 8 installed personas
    id: D64
    rationale: The requester scoped this session to review artifacts; personas were limited to the installed .github/agents list (repo-research-analyst not needed)
    by: baton-review
  - tag: deferral-review
    decision: F21, F22 and F23 deferrals are acceptable for v0.1 and do not block release; each needs a docs note before the first public release
    id: D65
    rationale: F21 --from uses an operator-chosen local archive with published SHA256SUMS; F22 checks never run in CI and equal running npm test on the branch; F23 is an accidental-leak false negative with frontmatter fully scanned. A human still decides at the land/PR gate
    by: baton-review
  - id: D66
    decision: Artifact hashes refreshed after intentional edit
    rationale: Fix pass 2 implementation and review evidence changed after the incoming review handoff
    by: implementation-session
  - id: D67
    decision: Artifact hashes refreshed after intentional edit
    rationale: Clarify check-specific human waiver procedure in phase contract
    by: implementation-session
  - id: D68
    decision: Recover red-first evidence first and waive only check-specific results that cannot be recovered locally
    rationale: control-plane delegation, 2026-09-28
    by: human:repository-owner
  - id: D69
    decision: Run Linux CI tests on this PR so the F39 pinned ps-flavour install is verified in hosted CI; do not dispatch the three-OS smoke
    rationale: control-plane delegation, 2026-09-28; supersedes D37 for this F39 verification
    by: human:repository-owner
  - id: D87
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record owner-delegated check-specific waivers and recovered red evidence
    by: implementation-session
  - id: D88
    decision: Artifact hashes refreshed after intentional edit
    rationale: Keep CI maintainer guard exact while adding Linux PR verification
    by: implementation-session
  - id: D89
    decision: Artifact hashes refreshed after intentional edit
    rationale: Update PR CI contract test for F39
    by: implementation-session
  - id: D90
    decision: Artifact hashes refreshed after intentional edit
    rationale: Apply review fixes, bind waivers to approved evidence, and retain spec and plan freshness
    by: implementation-session
  - id: D91
    decision: Record the fix-pass implementation base for scoped review
    rationale: The incoming review baton predates automatic diff-base recording; this fix pass started at d61a7237, the verified branch merge-base with origin/main.
    tag: diff-base
    x-base-commit: d61a7237bd7215615050aa594b6777a3197de2db
    by: baton
  - id: D92
    decision: Artifact hashes refreshed after intentional edit
    rationale: Retain scoped review base and update reviewed code and skill hashes
    by: implementation-session
  - id: D93
    decision: Artifact hashes refreshed after intentional edit
    rationale: Align model guard test with human-directed next instruction
    by: implementation-session
  - id: D94
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record headless review findings and scoped diff-base contract
    by: implementation-session
  - id: D96
    decision: Artifact hashes refreshed after intentional edit
    rationale: CI startup rejected an unallowlisted link-check action; replace it with a documented deferred offline check and pinned uv installation
    by: implementation-session
  - id: D97
    decision: Restore implement-to-review handoff for independent review; keep the existing open PR but do not self-land
    rationale: control-plane delegation, 2026-09-28; owner requested an independent re-review after the CI and evidence fixes
    by: human:repository-owner
  - id: D98
    decision: Audit each check-specific waiver against the exact historical source and selected test command
    rationale: control-plane delegation, 2026-09-28; replay table below records the base, command, and behavior barrier for D70-D86 without inventing red evidence
    by: human:repository-owner
  - id: D99
    decision: Artifact hashes refreshed after intentional edit
    rationale: Owner-directed implement-to-review correction, waiver replay audit, hosted F39 evidence and CI repairs
    by: implementation-session
  - id: D100
    decision: "Review-role session: headless ce-review safe_auto fixes were not applied"
    rationale: The review phase records findings only; fixes belong to the implement phase (C4, owner instruction for this re-review).
    by: baton-review
  - id: D101
    decision: F62 self-review/self-land blocks v0.1
    rationale: "No actor identity exists and history.by records contract.owner, so an implement session can review and land its own work undetected. Fix: per-checkout writer token, E_SELF_REVIEW on review/land by the implement writer, a handoff next session break, and relay tests (review.json F62 x-fix)."
    by: baton-review
  - id: D102
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: 815ca0bd754fe288b4dd80f641a60d0320568488
    by: baton
  - id: D103
    decision: Handoff body redacted
    rationale: Remove workstation-only feed hostname from handoff narrative
    by: baton
  - id: D104
    decision: Artifact hashes refreshed after intentional edit
    rationale: Rehash task and contract documentation after feed redaction
    by: implementation-session
  - id: D105
    decision: Invalid acceptance waivers revoked
    rationale: Audit identified raw tasks hashes that cannot satisfy checkbox-normalized acceptance evidence
    by: baton
    x-revoked:
      - D70
      - D71
      - D72
      - D73
      - D74
      - D75
      - D76
      - D77
      - D78
      - D79
      - D80
      - D81
      - D82
      - D83
      - D84
      - D85
      - D86
  - id: D106
    decision: Artifact hashes refreshed after intentional edit
    rationale: Update normalized tasks evidence and audited waiver citations
    by: implementation-session
  - id: D107
    decision: Waive AC-US1-2
    rationale: "Control-plane delegation, 2026-09-28; exact S1 script creates a forbidden OS temp directory in this replay environment. Green: prior local S1 archive/adopt/doctor/validate passed; no run ID was recorded."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US1-2
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D108
    decision: Waive AC-US1-3
    rationale: "Control-plane delegation, 2026-09-28; the pre-MVP workflow assertion already passes. Green: adopt test 'cleanup workflow tells the adopter to run baton adopt if push fails'."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US1-3
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D109
    decision: Waive AC-US1-5
    rationale: "Control-plane delegation, 2026-09-28; old adopt omits config and stops before the workflow/constitution assertions; next usable source passes. Green: adopt test 'adopt replaces the constitution, README and manifest without touching workflows'."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US1-5
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D110
    decision: Waive AC-US2-2
    rationale: "Control-plane delegation, 2026-09-28; pre-US2 init is unsupported, so the exact idempotent rerun is never reached. Green: init test 'init installs the locked core file set and is byte-for-byte idempotent'."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US2-2
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D111
    decision: Waive AC-US2-3
    rationale: "Control-plane delegation, 2026-09-28; pre-US2 init is unsupported, so the pack assertion is never reached. Green: init test 'init installs core plus learning and merges existing Copilot hooks by command'."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US2-3
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D112
    decision: Waive AC-US2-4
    rationale: "Control-plane delegation, 2026-09-28; closure already passes at the earliest usable validator source. Green: pack tests 'each shipped pack has a closed dependency set' and 'a docs-review pack missing its dispatched persona fails closed'."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US2-4
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D113
    decision: Waive AC-US3-4
    rationale: "Control-plane delegation, 2026-09-28; preregistration rejection already passes at earliest complete relay. Green: relay test 'missing preregistration and landing PR are explicit errors'."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US3-4
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D114
    decision: Waive AC-US3-5
    rationale: "Control-plane delegation, 2026-09-28; missing-PR rejection already passes at earliest complete relay. Green: relay test 'missing preregistration and landing PR are explicit errors'. Citation correction: F18 local-check rejection and compound next-owner relay tests."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US3-5
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D115
    decision: Waive AC-US3-6
    rationale: "Control-plane delegation, 2026-09-28; old CLI fails on unrelated artifact checksum mismatch, not missing validation behavior. Green: prior local baton validate --path specs/001-baton-template/handoff.md passed; no run ID was recorded."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US3-6
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D116
    decision: Waive AC-US3-7
    rationale: "Control-plane delegation, 2026-09-28; replay fails on a pending-gate assertion before the checkbox/rewording assertions. Green: relay test 'stale artifact then refresh and checkbox-insensitive progress'."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US3-7
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D117
    decision: Waive AC-US3-8
    rationale: "Control-plane delegation, 2026-09-28; role-format assertion already passes at earliest complete relay. Green: validate-handoff test 'role-only A5 examples reject malformed approvers and actors with their stable codes'."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US3-8
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D118
    decision: Waive AC-US3-9
    rationale: "Control-plane delegation, 2026-09-28; compound assertion already passes at earliest complete relay. Green: relay test 'compound requires solution evidence or a reasoned skip and reports every unmet member'. Citation correction: relay.test.mjs originally line 381 covers the authored-solution branch."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US3-9
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D119
    decision: Waive AC-US4-1
    rationale: "Control-plane delegation, 2026-09-28; pre-US4 source lacks models.mjs and the exact test cannot import. Green: models test 'role resolution uses phase override and inherits when no role model is set'."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US4-1
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D120
    decision: Waive AC-US4-2
    rationale: "Control-plane delegation, 2026-09-28; pre-US4 source lacks models.mjs and the exact test cannot import. Green: models test 'allow list enforcement is off, warning or error for configured and agent models'."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US4-2
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D121
    decision: Waive AC-US4-3
    rationale: "Control-plane delegation, 2026-09-28; pre-US4 source lacks models.mjs and the exact test cannot import. Green: models test 'models apply dry-run, managed-only, byte-preserving and idempotent'."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US4-3
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D122
    decision: Waive AC-US5-1
    rationale: "Control-plane delegation, 2026-09-28; approved mirror lacks pinned specify-cli==1.0.11. Green: hosted sync --check run 36343485321 at its recorded source SHA."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US5-1
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D123
    decision: Waive AC-US7-1
    rationale: "Control-plane delegation, 2026-09-28; hosted timing and dispatch have no local historical-red selector. Green: Linux 36451849802 and Windows 36451849770 passed within budget; full three-OS smoke remains owner-pending and is not claimed complete."
    by: human:repository-owner
    tag: acceptance-waiver
    x-check: AC-US7-1
    x-evidence-sha256: 16a67f0019ec73103832f41591e30539b3916b238ab2b4cb7864e2ccf28b79e6
  - id: D124
    decision: Artifact hashes refreshed after intentional edit
    rationale: Rehash finalized F62 and reviewed-tree contracts
    by: implementation-session
  - id: D125
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D126
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D127
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D128
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D129
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D130
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D131
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D132
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D133
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D134
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D135
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D136
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D137
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D138
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D139
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D140
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D141
    decision: Handoff body redacted
    rationale: Align historical evidence table with CLI-recorded waiver IDs
    by: baton
  - id: D142
    decision: Handoff body redacted
    rationale: Correct F76 evidence-table citation
    by: baton
  - id: D143
    decision: Handoff body redacted
    rationale: Correct F77 evidence-table citation
    by: baton
  - id: D144
    decision: Artifact hashes refreshed after intentional edit
    rationale: Fix-pass-3 implementation and evidence updates
    by: implementation-session
  - id: D145
    decision: "Re-review 3 verdict: v0.1 is not release-ready until F86 is fixed"
    rationale: Every claimed fix F01-F85 reproduces through the CLI in scratch clones and worktrees (F62, F63/F66 waiver flow, F64, F44 tracked files, F70, F71-F74 mutants). F86 is a hard failure (E_INTERNAL) for overlay adopters on Windows with the Git default core.autocrlf=true, and F62 now makes such a second checkout mandatory for every review and land. F87/F88 should be fixed in the same pass; the P3s may be deferred with reasons.
    by: baton-review
  - id: D146
    decision: Accept deferrals F21, F47, F51, F59, F78, F79, F80, F82 and F83 for v0.1
    rationale: All are P3 except F59 (P2, test infrastructure only); none affects shipped relay correctness or adopter safety. Evidence per finding in review.json x-rereview3.
    by: baton-review
  - id: D147
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: 4ece8ddcc50e1fae3c6030a865a9908d7558fa9ff3a7da9d37d755c906ab334c
    x-base-commit: 815ca0bd754fe288b4dd80f641a60d0320568488
    by: baton
  - id: D148
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: 1eb09bc6e22f3a03be333ae9888d4fc81a26c7fc
    by: baton
  - id: D149
    decision: Handoff body redacted
    rationale: "F91: use stable test name rather than moved line number"
    by: baton
  - id: D150
    decision: Handoff body redacted
    rationale: "F91: cite exact stable test name"
    by: baton
  - id: D151
    decision: Artifact hashes refreshed after intentional edit
    rationale: Fix pass 4 updates to CRLF and self-review contracts and review evidence
    by: implementation-session
  - id: D152
    decision: Handoff body redacted
    rationale: "F90: replace stale fix pass 2 implementation description"
    by: baton
  - id: D153
    decision: Handoff body redacted
    rationale: "F90: replace stale review instructions"
    by: baton
  - id: D154
    decision: Handoff body redacted
    rationale: "F90: clear stale F62 warning"
    by: baton
  - id: D155
    decision: Handoff body redacted
    rationale: "F90: current smoke scope"
    by: baton
  - id: D156
    decision: Artifact hashes refreshed after intentional edit
    rationale: Clarify legacy baton token-only compatibility
    by: implementation-session
  - id: D157
    decision: Handoff body redacted
    rationale: "F90: PR now exists"
    by: baton
  - id: D158
    decision: Artifact hashes refreshed after intentional edit
    rationale: Record F90 current PR metadata and finding evidence
    by: implementation-session
  - id: D159
    decision: Artifact hashes refreshed after intentional edit
    rationale: F90 current PR and superseding risk recorded
    by: implementation-session
  - id: D160
    decision: "Re-review 4: F86, F87, F88, F89 and F91 verified; F90 and F96 partial and reopened as P3"
    rationale: "Reproduced through the real CLI in scratch repos: a core.autocrlf=true overlay clone, a CRLF checkout of this repo against the fd83bfa bundle, token deletion/rotation/git clean, and a quick-lane override cycle. Evidence per finding in review.json x-rereview4."
    by: baton-review
  - id: D161
    decision: Accept deferrals F92, F93, F94, F95 and F97 for v0.1
    rationale: All P3; none affects relay correctness or adopter safety. F97 should be folded into the F98 fix.
    by: baton-review
  - id: D162
    decision: Rate F98 (same-path fresh clone refused with E_SELF_REVIEW) P2, not P1
    rationale: Owner override works around it, local worktrees use distinct paths and cloud-agent dispatch is post-v0.1 backlog; adversarial persona dissent recorded. Recommended to fix before tagging together with F99/F100.
    by: baton-review
  - id: D163
    decision: Record reviewed code tree
    rationale: Land must use the exact code inspected by review
    tag: reviewed-tree
    x-tree-sha256: 562ebdfc135d91fb632fef5052d9c1abc380918bf588422856bf04dcf5199bf8
    x-base-commit: 1eb09bc6e22f3a03be333ae9888d4fc81a26c7fc
    by: baton
  - id: D164
    decision: Record reviewed implementation base
    rationale: Review completed at this commit
    tag: diff-base
    x-base-commit: c4f3dcb047d94b975348504de558c42a19e7af08
    by: baton
open_questions: []
assumptions:
  - id: AS1
    text: The spec assumptions A1-A9 hold (re-checked at analyze, unchanged)
    revisit_at: review
  - id: AS2
    text: The model ids in D5 are available to adopters as of 2026-09; they are config, not code
    revisit_at: implement
  - id: AS3
    text: ATV main@ad99673 stays reachable by SHA; sync and upstream-watch (sync --check) fail loudly if it doesn't
    revisit_at: implement
  - id: AS4
    text: Custom-agent `model:` frontmatter is supported where it matters (verified by T064, stop-and-ask otherwise)
    revisit_at: implement
risks:
  - id: R-3OS
    text: AC-US7-1 full three-OS smoke remains owner-pending and is not dispatched by this fix pass.
    severity: medium
  - id: R-WAIVERS
    text: All 17 acceptance waivers (D70-D86) must be re-recorded through handoff answer against the normalized tasks.md hash after F44/F66; six cite tests too weak for their check (F71-F74, F76, F77).
    severity: high
  - id: R-UPSTREAM-WATCH
    text: upstream-watch fails at startup on the blocked lychee action, so upstream drift detection is not running (F70).
    severity: medium
  - id: R-CRLF
    text: "F86: overlay adopters on Windows (core.autocrlf=true) cannot parse or hash batons in any fresh checkout, which F62 makes mandatory for review and land."
    severity: high
  - id: R-SELF-REVIEW
    text: "F87/F88: the E_SELF_REVIEW guard is advisory; deleting .baton/.local or one old override answer lets the implement checkout review itself."
    severity: medium
  - id: R-FIXPASS4
    text: F86/F87/F88 are resolved locally; independent review must verify them. Older R-CRLF and R-SELF-REVIEW entries are historical. The guard is a process guard, not a security boundary; F90 metadata awaits the current PR.
    severity: medium
  - id: R-FIXPASS4-PR
    text: "The prior R-FIXPASS4 PR-pending note is superseded: PR 28 is now recorded. R-CRLF and R-SELF-REVIEW describe pre-fix risks; independent review still needs to verify the fixes."
    severity: medium
  - id: R-REREVIEW4
    text: "Re-review 4 supersedes R-CRLF, R-SELF-REVIEW, R-FIXPASS4 and R-FIXPASS4-PR (fixes verified). R-WAIVERS is resolved by D107-D123 and R-UPSTREAM-WATCH only awaits owner dispatch (F90). Open: F98 same-path self-review false positive (cloud agent, Codespaces), F99 CRLF overlay update conflicts, and F100 models apply regression on CRLF agents."
    severity: medium
gate:
  required: false
  approved_by: null
  approved_at: null
history:
  - phase: review
    at: 2026-09-28T22:32:10.454Z
    by: baton
    writer: 945618938881955ed51b7641dc5954b3a7ce4569df49392a1d54b6031e147c04
    commit: f043f1e
    x-action: redact
  - phase: review
    at: 2026-09-28T22:32:23.898Z
    by: baton
    writer: 945618938881955ed51b7641dc5954b3a7ce4569df49392a1d54b6031e147c04
    commit: f043f1e
    x-action: redact
  - phase: review
    at: 2026-09-28T22:32:30.243Z
    by: baton
    writer: 945618938881955ed51b7641dc5954b3a7ce4569df49392a1d54b6031e147c04
    commit: f043f1e
    x-action: redact
  - phase: review
    at: 2026-09-28T22:33:22.453Z
    by: implementation-session
    writer: 945618938881955ed51b7641dc5954b3a7ce4569df49392a1d54b6031e147c04
    commit: f043f1e
    x-action: refresh
  - phase: implement
    at: 2026-09-28T22:48:36.947Z
    by: baton
    writer: 945618938881955ed51b7641dc5954b3a7ce4569df49392a1d54b6031e147c04
    commit: f043f1e
    x-action: write
  - phase: review
    at: 2026-09-29T01:15:35.796Z
    by: baton-review
    writer: 846a37d767c3870ef41090f7d3b0532a814c55e1f5c959ac0cd2d613aa0930fc
    commit: 1eb09bc
    x-action: write
  - phase: review
    at: 2026-09-29T01:33:32.673Z
    by: baton
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: fd83bfa
    x-action: redact
  - phase: review
    at: 2026-09-29T01:33:41.515Z
    by: baton
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: fd83bfa
    x-action: redact
  - phase: review
    at: 2026-09-29T01:34:27.193Z
    by: implementation-session
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: fd83bfa
    x-action: refresh
  - phase: review
    at: 2026-09-29T01:44:20.081Z
    by: baton
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: fd83bfa
    x-action: redact
  - phase: review
    at: 2026-09-29T01:44:20.491Z
    by: baton
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: fd83bfa
    x-action: redact
  - phase: review
    at: 2026-09-29T01:44:27.674Z
    by: baton
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: fd83bfa
    x-action: redact
  - phase: review
    at: 2026-09-29T01:44:28.047Z
    by: baton
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: fd83bfa
    x-action: redact
  - phase: implement
    at: 2026-09-29T01:50:28.069Z
    by: baton
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: fd83bfa
    x-action: write
  - phase: implement
    at: 2026-09-29T01:51:13.324Z
    by: implementation-session
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: fd83bfa
    x-action: refresh
  - phase: implement
    at: 2026-09-29T01:58:41.285Z
    by: baton
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: "7585261"
    x-action: redact
  - phase: implement
    at: 2026-09-29T01:58:41.519Z
    by: implementation-session
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: "7585261"
    x-action: refresh
  - phase: implement
    at: 2026-09-29T02:01:24.802Z
    by: baton
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: "7585261"
    x-action: write
  - phase: implement
    at: 2026-09-29T02:01:48.740Z
    by: implementation-session
    writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
    x-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
    commit: "7585261"
    x-action: refresh
  - phase: review
    at: 2026-09-29T02:35:03.076Z
    by: baton
    writer: 7b75152510874dc5ecbe724a0c2feede19496061f170895cedbc167e06efd3e8
    x-worktree: a3507b64e6c7426852eb4251f9d1d20a8671bfa953bd24e9bc757810c5a466a7
    commit: c4f3dcb
    x-action: write
updated_at: 2026-09-29T02:35:03.060Z
updated_by: baton-review
review:
  findings_path: specs/001-baton-template/review.json
  blocking_findings: 0
pr:
  url: https://github.com/dermonaco-labs/baton/pull/28
  number: 28
x-implementation-writer: ae2e9d45fd46249b245c2bbb54d058faaa337e32ae1776d452ec57c27d3f8c88
x-implementation-worktree: 8fcdc52976782fec7e9a26ad4e99881c13949db3ed242971443fbe71296260c6
x-implementation-cycle: f1b625e7d4cf1082facadcfa5addec95be6f2a59122b29b84cafbcca850f3980
---
## Goal

Build Baton v0.1.0, a public GitHub template and overlay that combines Spec Kit 1.0.11 and ATV (pinned) with
validated, file-based handoffs between phases, configurable model routing, a curated core of 28 skills and agents,
optional packs, cheap CI and a public manual.

## What changed

Fix pass 4 resolves F86 (CRLF parsing, normalized artifact hashes, marker-managed overlay attributes), F87 (worktree-bound self-review guard), F88 (cycle-scoped override), F89, F91 and F96. Tests exercise the bundled CLI in scratch repositories. F90 records the current PR; historical risk entries are superseded by R-FIXPASS4-PR. F92 and other nontrivial P3s are deferred in review.json.
F39's live PowerShell-flavour integration test ran and passed in hosted Linux CI job 109131737677
(run 36482633555, `ok 38`, no skip). The same run exposed a separate Linux py-flavour assertion and
pre-existing ShellCheck warnings, which this continuation fixes. The first CI run did not start jobs
because lychee-action was blocked by the repository's selected-actions policy; CI now downloads the
standalone lychee binary at a pinned release and verifies its SHA-256 before running the same offline
relative-link check.

Four of the 21 owner-question checks have retained meaningful local red evidence: AC-US1-1,
AC-US2-1, AC-US2-5, AC-US3-1. The remaining 17 check-specific waivers are audited below. The
manual three-OS part of AC-US7-1 remains owner-pending, not passed or relabeled.

### Waiver replay audit

The exact selectors below were run with the current tests overlaid on the historical source in a
temporary worktree unless a row states why the command cannot be executed. The replay worktree
was removed. Import/harness errors and assertions before the requested behavior do **not** count
as red evidence. Each waiver retains its existing green evidence in `tasks.md`.

| Decision / check | Base SHA | Exact command | Why no check-specific local red |
|---|---|---|---|
| D107 / AC-US1-2 | `5f539d8e10f0cd4f422f9d181734f6348e832b52` | quickstart S1: `tmp=$(mktemp -d); git archive HEAD ...` | Exact S1 needs a POSIX shell and OS temp directory; not runnable as written in this Windows replay. |
| D108 / AC-US1-3 | `5f539d8e10f0cd4f422f9d181734f6348e832b52` | `node --test --test-name-pattern='cleanup workflow tells the adopter to run baton adopt if push fails' test/integration/adopt.test.mjs` | Exit 0: cleanup workflow assertion predates the feature. |
| D109 / AC-US1-5 | `5f539d8e10f0cd4f422f9d181734f6348e832b52` | `node --test --test-name-pattern='adopt replaces the constitution, README and manifest without touching workflows' test/integration/adopt.test.mjs` | Exit 1 at `adopt.test.mjs:73`: missing `.baton/config.yml` aborts before constitution/workflow assertions; the next usable source passes. |
| D110 / AC-US2-2 | `c7d137325787ac5fe6abc07a4088f503dcbb8890` | `node --test --test-name-pattern='init installs the locked core file set and is byte-for-byte idempotent' test/integration/init.test.mjs` | Current test import fails because old init lacks `flavouredBytes`; an import-compatible overlay reaches only `E_USAGE: init is outside the current MVP` before the rerun, while first usable init already supports idempotency. |
| D111 / AC-US2-3 | `c7d137325787ac5fe6abc07a4088f503dcbb8890` | `node --test --test-name-pattern='init installs core plus learning and merges existing Copilot hooks by command' test/integration/init.test.mjs` | Same import barrier; compatible overlay reaches unsupported init before pack assertions. The first usable init already supports packs. |
| D112 / AC-US2-4 | `c7d137325787ac5fe6abc07a4088f503dcbb8890` | `node --test --test-name-pattern='each shipped pack has a closed dependency set\|a docs-review pack missing its dispatched persona fails closed' test/unit/packs.test.mjs` | Exit 0: both closure assertions already pass. Earlier source lacks the pack validator. |
| D113 / AC-US3-4 | `46225ec68c8a565615450167afba2211b8ad9adc` | `node --test --test-name-pattern='missing preregistration and landing PR are explicit errors' test/integration/relay.test.mjs` | Exit 0: missing preregistration already rejects; preceding source lacks complete relay CLI. |
| D114 / AC-US3-5 | `46225ec68c8a565615450167afba2211b8ad9adc` | F18 land-receive test: `test/integration/relay.test.mjs`; historical selector only proves E_PR_MISSING | Exit 0: missing PR already rejects; preceding source lacks complete relay CLI. |
| D115 / AC-US3-6 | `5f539d8e10f0cd4f422f9d181734f6348e832b52` | `node .baton/bin/baton.mjs validate --path specs/001-baton-template/handoff.md` | Exit 1 only on `E_STALE_ARTIFACT` for data-model.md; not a missing validator behavior. Review base `8aeed8a` lacks the CLI. |
| D116 / AC-US3-7 | `e32aaa3c2f0bd5fbf647da8369709549ad93f492` | `node --test --test-name-pattern='stale artifact then refresh and checkbox-insensitive progress' test/integration/relay.test.mjs` | Exit 1 at line 275 (`0 !== 3`) on pending gate; checkbox/rewording assertions at lines 280-282 never run. |
| D117 / AC-US3-8 | `46225ec68c8a565615450167afba2211b8ad9adc` | `node --test --test-name-pattern='role-only A5 examples reject malformed approvers and actors with their stable codes' test/unit/validate-handoff.test.mjs` | Exit 0: role-format rejection already works at the earliest complete relay. |
| D118 / AC-US3-9 | `46225ec68c8a565615450167afba2211b8ad9adc` | relay.test.mjs test: compound accepts an authored solution document without a skip decision; companion skip-branch selector | Exit 0: grouped compound checks already work at the earliest complete relay. |
| D119 / AC-US4-1 | `59dfa7795fb7212563858a103daefaebee47d93b` | `node --test --test-name-pattern='role resolution uses phase override and inherits when no role model is set' test/unit/models.test.mjs` | Exit 1 before assertions: old source lacks `src/lib/models.mjs`. |
| D120 / AC-US4-2 | `59dfa7795fb7212563858a103daefaebee47d93b` | `node --test --test-name-pattern='allow list enforcement is off, warning or error for configured and agent models' test/unit/models.test.mjs` | Exit 1 before assertions: same missing module; no model allowlist assertion runs. |
| D121 / AC-US4-3 | `59dfa7795fb7212563858a103daefaebee47d93b` | `node --test --test-name-pattern='models apply dry-run, managed-only, byte-preserving and idempotent' test/unit/models.test.mjs` | Exit 1 before assertions: same missing module; no apply/idempotency assertion runs. |
| D122 / AC-US5-1 | `058c926f324e1e470a4b656817e565a85325c3c6` | `UV_DEFAULT_INDEX=<approved-package-index> node .baton/bin/baton.mjs sync --check` | Exit 1: approved mirror lacks `specify-cli==1.0.11`; hosted green run 36343485321 is retained. |
| D123 / AC-US7-1 | none (hosted manual) | no local command; PR checks and full three-OS smoke require hosted runs | No historical local red selector; Linux/Windows green evidence is retained. Full three-OS dispatch remains owner-pending. |

## Next steps

Independent /baton-review should receive the fix-pass-4 implement baton in a separate checkout, verify F86-F89/F91/F96, and adjudicate the remaining P3 deferrals. Do not self-review in this implementation checkout.

## Watch out for

- AC-US7-1 full three-OS smoke remains owner-pending; no three-OS dispatch was requested in fix pass 4.
- F86/F87/F88 are fixed locally; independent review must verify them. Any open P1 finding routes back to implement until an independent
  reviewer resolves or defers it through an authorized decision.
- The standalone lychee binary is SHA-256 pinned to its GitHub release asset and still runs
  the offline relative-link check; CI must prove the gate succeeds.
