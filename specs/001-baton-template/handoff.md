---
baton: 1
lane: feature
feature: 001-baton-template
phase_completed: review
next_phase: implement
next_owner: speckit-implement
status: needs-human
model_role: implementation
suggested_model: gpt-6-sol
summary: "Re-review of the fix pass (763d81f..658ba43): 21 prior findings verified, 6 reopened (F02 F03 F04 F05 F09 F27), F21-F23 deferrals accepted for v0.1; 23 new findings (1 P1, 8 P2, 14 P3). 5 open P0/P1 block land, so the relay returns to implement."
read_first:
  - path: specs/001-baton-template/review.json
    why: re-review verdicts, reopened and new findings with x-fix and x-evidence
    sha256: c65c18c953c76cde798630717cc4fcdf1aafec44f2b18dcc7fb3b5f4df00b7f0
  - path: src/commands/handoff.mjs
    why: "F02 F03 F04 F05 F31 F32 F35 F36: specify receive/write, review routing, findings_path, write preflight"
    sha256: 1223181ea660498c8310e7c21f2fe9210a59574daf7fa19e494b82071378bbd1
  - path: src/lib/checks.mjs
    why: "F09 F33 F34 F37: diff base, diff-nonempty scope, acceptance-evidence policy"
    sha256: b702059c8b8f5f5dfea360ced93b3dc20732eeaad8b37ac5d650924554b507ad
  - path: .specify/extensions/baton/commands/handoff.md
    why: "F03 F05: hook-shaped converge and first specify writes"
    sha256: 687dc583093b8e15986382a6640b5614e71f92aa6629ba8a45ba38194d34be30
  - path: .github/skills/baton-review/SKILL.md
    why: "F27: shipped skill copy is stale against baton/skills"
    sha256: fe6767040b1e2196aeb3587f4235acb2ba39cbf1420a21fa680a5329f8217d8b
  - path: src/commands/init.mjs
    why: "F39: ps/py flavour drops bash scripts used by locked skills"
    sha256: 71d853e942e7f28a396dc26933ecd947a06128c223bfab81e7082a4a690851d0
  - path: test/integration/relay.test.mjs
    why: F02 masked quick test; add hook-shaped regression tests
    sha256: be8192a2aa9229dfb4c22016259c9da9e980e1572b6f8a24b3da09da48146900
  - path: specs/001-baton-template/contracts/phase-contracts.md
    why: review routing, diff-nonempty and acceptance-evidence contract text
    sha256: b682cc069db155eb0ecbfcc41b46cfda255e25a686e822aa5287bdee1cbdf275
  - path: specs/001-baton-template/tasks.md
    why: finding-to-task mapping and evidence claims (F37 F45)
    sha256: b9ffef1a35dd7d1953fff6237b232ff21fba5edd056b065dfa4eabf36d8100de
do_not_read:
  - path: specs/001-baton-template/research.md
    why: pinned upstream facts are already reflected in the plan
  - path: specs/001-baton-template/roadmap.md
    why: later release scope, not this fix pass
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
    sha256: 7912088a58339323de9932655ebcecec96425ff3fe88fa62da342fc69fd004f1
  - path: specs/001-baton-template/contracts/handoff-contract.md
    role: source-of-truth
    sha256: 00ad8887f102c3724a90cba41728fdc4e36517932699b17bdb4a1c4bd328db7c
  - path: specs/001-baton-template/contracts/phase-contracts.md
    role: source-of-truth
    sha256: b682cc069db155eb0ecbfcc41b46cfda255e25a686e822aa5287bdee1cbdf275
  - path: specs/001-baton-template/contracts/conflict-rules.md
    role: source-of-truth
    sha256: 2468e82ca33bd1a19530cc9b177bbc23f64dfec3a1b2b094a7aeecb3f0cafd4a
  - path: specs/001-baton-template/contracts/packs.md
    role: source-of-truth
    sha256: 75dcc68ac03b9caa0b731635e3ccfd5895ed0d00e05b19fca8cd6b438be4bbf4
  - path: specs/001-baton-template/contracts/cli.md
    role: source-of-truth
    sha256: 7b1ca7afc1f05024b283f6387c63af3fb9addd01ea4f8130019b5a2a0235db23
  - path: specs/001-baton-template/contracts/ci.md
    role: source-of-truth
    sha256: cb20d9cd65b0bc6ce21502730be20820d6b4715cd0eeeb1af4097aabe8428bc3
  - path: specs/001-baton-template/quickstart.md
    role: derived
    sha256: 286706951ad3f80db0ebf81084d49690b6f01b92a906b0517c811d68656aff04
  - path: specs/001-baton-template/tasks.md
    role: derived
    sha256: b9ffef1a35dd7d1953fff6237b232ff21fba5edd056b065dfa4eabf36d8100de
  - path: specs/001-baton-template/analysis.md
    role: evidence
    sha256: cabcda605da244e6a427c0c0c81755b54fb7ec1468778726df3fab40411daf2d
  - path: specs/001-baton-template/checklists/requirements.md
    role: evidence
    sha256: 893d152f9bb358301756d5485d7b34cc767e4466a933f9417eaced35c3eea017
  - path: specs/001-baton-template/review.json
    role: evidence
    sha256: c65c18c953c76cde798630717cc4fcdf1aafec44f2b18dcc7fb3b5f4df00b7f0
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
open_questions:
  - id: Q1
    question: "The original red runs were not retained for 21 fail-registered acceptance checks (AC-US1-1/2/3/5, AC-US2-1/2/3/4/5, AC-US3-1/4/5/6/7/8/9, AC-US4-1/2/3, AC-US5-1, AC-US7-1). Does the repository owner authorize check-specific waivers acknowledging partial evidence, or keep the implement exit unmet?"
    blocking: true
    options:
      - Authorize check-specific waivers for the 21 partial checks
      - Keep the 21 checks unmet until red-first evidence is recovered
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
  - id: RK1
    text: "Spec Kit extension hooks are prompt-driven (the agent must obey EXECUTE_COMMAND); an agent can skip them. Mitigation: the adopter baton.yml workflow validates every PR, and baton-land's pre-push check catches missing or stale batons"
    severity: high
  - id: RK2
    text: "ATV is pinned to an unreleased commit. Mitigation: provenance in the lock, upstream-watch, T074 drafts an upstream release request for the owner"
    severity: medium
  - id: RK3
    text: "Spec Kit release churn (5 releases in 10 days). Mitigation: sync --check plus the weekly watch; bump deliberately"
    severity: medium
  - id: RK4
    text: "Windows adopters without bash cannot run the sh scripts. Mitigation: init --script ps|py (requires uv) and a doctor warning"
    severity: low
gate:
  required: false
  approved_by: null
  approved_at: null
history:
  - phase: specify
    at: 2026-09-24T07:39:15Z
    by: planning-session
    commit: 8aeed8a
  - phase: plan
    at: 2026-09-24T07:39:15Z
    by: planning-session
    commit: 8aeed8a
  - phase: tasks
    at: 2026-09-24T07:39:15Z
    by: planning-session
    commit: 8aeed8a
  - phase: analyze
    at: 2026-09-24T07:53:35Z
    by: review-session
    commit: 23b1a1d
  - phase: implement
    at: 2026-09-28T17:07:20.569Z
    by: speckit-implement
    commit: a7e482b
  - phase: review
    at: 2026-09-28T17:38:19.375Z
    by: baton-review
    commit: 0673c66
  - phase: implement
    at: 2026-09-28T18:24:52.094Z
    by: speckit-implement
    commit: aa42bc9
  - phase: implement
    at: 2026-09-28T18:28:20.727Z
    by: speckit-implement
    commit: aa42bc9
  - phase: review
    at: 2026-09-28T18:59:27.923Z
    by: baton-review
    commit: 658ba43
updated_at: 2026-09-28T19:44:24.467Z
updated_by: implementation-session
review:
  findings_path: specs/001-baton-template/review.json
  blocking_findings: 5
---
## Goal

Build Baton v0.1.0, a public GitHub template and overlay that combines Spec Kit 1.0.11 and ATV (pinned) with
validated, file-based handoffs between phases, configurable model routing, a curated core of 28 skills and agents,
optional packs, cheap CI and a public manual.

## What changed

Re-review of the fix pass `763d81f..658ba43` with the 8 installed personas (headless, no
fixes applied). Of the prior findings, **21 are verified** fixed and **6 are reopened**:
F02, F03, F04 and F05 (P1), F09 (P2), and F27, raised to P2. The F21–F23 deferrals are
**accepted for v0.1**, each with a documentation note required before public release.

There are 23 new findings (0 P0, 1 P1, 8 P2, 14 P3). The P1 is F31: `findings_path` is not
pinned, so a clean decoy file can route to land while the canonical `review.json` still
holds an open P0. Five P0/P1 findings are open (F02, F03, F04, F05, F31), so the CLI routed
back to implement. `review.json` base is now `763d81f`, and every finding has `x-fix`
and/or `x-evidence`.

## Next steps

1. Run `/speckit-implement` on the reopened and new findings in `review.json`, P1 first:
   - F31: pin `findings_path`.
   - F02: the quick-lane route to work.
   - F03: add `--mode converge` to the hook prompt.
   - F04: specify receive for the 2nd and later features.
   - F05: specify write without `--feature`.
2. Add red-first regression tests that follow the real hook prompts in
   `.specify/extensions/baton/commands/`, not synthetic CLI calls. The masked test at
   `relay.test.mjs` for F02 must be corrected.
3. Fix or explicitly defer the P2 findings F09 and F27, then F32–F39, and add the F21–F23
   docs notes.
4. Then return to `/baton-review` for another re-review against base `763d81f`.

## Watch out for

- Editing `tasks.md` after a `handoff write` makes the next write fail with
  `E_STALE_ARTIFACT` (F32); run `handoff refresh` after derived artifact edits.
- The first review after merged increments still counts 0 changed files unless
  `review.json` supplies a base (F09); nothing records `diff-base` yet.
- Never hand-edit upstream files. They come only from `baton sync`, and repairs live in `packs/repairs.yml`.
- `sync` must not use bare `uvx` or codeload tarballs: hash-locked requirements and a verified git fetch.
- Template cleanup must never modify `.github/workflows/`.
- Keep public registry pins. A workstation behind an approved mirror uses per-command
  overrides and never commits mirror settings.
- Nothing from any private reference project may enter this repo.
