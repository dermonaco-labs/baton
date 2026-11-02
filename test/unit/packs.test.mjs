import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPacks, resolvePacks, validatePackClosure, recommendedPacks } from '../../src/lib/packs.mjs';
import { excludedNames, pinnedNames } from '../../src/commands/sync.mjs';
import { readFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const definitions = new Map([
  ['core', { id: 'core', requires: [], conflicts: [] }],
  ['learning', { id: 'learning', requires: ['core'], conflicts: [] }],
  ['docs', { id: 'docs', requires: ['learning'], conflicts: ['security'] }],
  ['security', { id: 'security', requires: [], conflicts: [] }],
]);

test('pack closure includes core once and detects conflicts', () => {
  assert.deepEqual(resolvePacks(definitions, ['docs']), ['core', 'learning', 'docs']);
  assert.throws(() => resolvePacks(definitions, ['docs', 'security']), /conflict/i);
  assert.throws(() => resolvePacks(definitions, ['missing']), /unknown pack/i);
});

test('each shipped pack has a closed dependency set', async () => {
  const root = resolve(import.meta.dirname, '../..');
  const shipped = await loadPacks(root);
  const upstreamNames = new Set([...shipped.values()].flatMap(pack => pack.files.map(file =>
    file.path.match(/^\.github\/(?:skills\/([^/]+)\/SKILL\.md|agents\/([^/]+)\.agent\.md)$/)?.slice(1).find(Boolean)).filter(Boolean)));
  for (const id of shipped.keys()) {
    const installed = resolvePacks(shipped, [id]);
    const contents = new Map();
    for (const name of installed) {
      for (const file of shipped.get(name).files) {
        const stored = name === 'core' ? file.path : `packs/${name}/files/${file.path}`;
        contents.set(file.path, await readFile(resolve(root, stored), 'utf8'));
      }
    }
    assert.deepEqual(validatePackClosure(shipped, id, contents, {
      upstreamNames, exclusions: excludedNames(root),
    }), [], id);
  }
});

test('a docs-review pack missing its dispatched persona fails closed', () => {
  const defs = new Map([
    ['core', { id: 'core', requires: [], conflicts: [], files: [] }],
    ['docs-review', { id: 'docs-review', requires: ['core'], conflicts: [],
      files: [{ path: '.github/skills/document-review/SKILL.md' }], optional_refs: [] }],
  ]);
  const contents = new Map([['.github/skills/document-review/SKILL.md', 'subagent_type: adversarial-document-reviewer']]);
  assert.ok(validatePackClosure(defs, 'docs-review', contents).some((error) => error.code === 'E_DANGLING_REF'));
});

test('closure detects optional specialized agents with non-reviewer role suffixes', () => {
  const defs = new Map([['core', { id: 'core', requires: [], conflicts: [],
    files: [{ path: '.github/skills/ce-compound/SKILL.md' }], optional_refs: [] }]]);
  const contents = new Map([['.github/skills/ce-compound/SKILL.md', [
    'Based on problem type, optionally invoke specialized agents:',
    '- **performance_issue** → `performance-oracle`',
    '- **database_issue** → `data-integrity-guardian`',
    '- **pattern-recognition-specialist**: Identifies repeating issues',
    '- **best-practices-researcher**: Enriches the documentation',
    '- **framework-docs-researcher**: Links reference documentation',
    '- **every-style-editor**: Reviews documentation style',
  ].join('\n')]]);
  const issues = validatePackClosure(defs, 'core', contents);
  for (const name of ['performance-oracle', 'data-integrity-guardian', 'pattern-recognition-specialist',
    'best-practices-researcher', 'framework-docs-researcher', 'every-style-editor']) {
    assert.ok(issues.some((issue) => issue.message.includes(`Reference ${name} `)), name);
  }
});

test('closure ignores CSS, tool decorators and browser element locators', () => {
  const defs = new Map([['core', { id: 'core', requires: [], conflicts: [],
    files: [{ path: '.github/skills/example/SKILL.md' }], optional_refs: [] }]]);
  const contents = new Map([['.github/skills/example/SKILL.md',
    '`@tool` decorators, `@font-face` declarations, `@package` instead of `@package@version`; agent-browser hover @e1']]);
  assert.deepEqual(validatePackClosure(defs, 'core', contents), []);
});

test('A6 rejects missing, unverified and stale optional reference reasons', () => {
  const file = '.github/skills/ce-work/SKILL.md';
  const names = new Set(['ce-plan', 'performance-oracle']);
  const contents = new Map([[file, 'Use `linting-agent` agent after work.']]);
  const cases = [
    { ref: 'linting-agent', note: 'not at pin' },
    { ref: 'linting-agent', reason: 'pack-provided:nope', note: 'unknown pack' },
    { ref: 'performance-oracle', reason: 'upstream-absent', note: 'exists at pin' },
    { ref: 'ce-plan', reason: 'excluded:C99', note: 'not an exclusion' },
  ];
  for (const optional of cases) {
    const defs = new Map([['core', {
      id: 'core', requires: [], conflicts: [], files: [{ path: file }], optional_refs: [optional],
    }]]);
    assert.ok(validatePackClosure(defs, 'core', contents, {
      upstreamNames: names, exclusions: new Map([['ce-plan', 'C2']]),
    }).some((issue) => issue.code === 'E_DANGLING_REF'), JSON.stringify(optional));
  }
});

test('A6 resolves short personas, classifies exclusions and recommends absent packs', () => {
  const file = '.github/skills/document-review/SKILL.md';
  const docs = { id: 'docs-review', requires: ['core'], conflicts: [],
    files: [{ path: file }, { path: '.github/agents/scope-guardian-reviewer.agent.md' }],
    optional_refs: [{ ref: 'ce-plan', reason: 'excluded:C2', note: 'different planner' },
      { ref: 'performance-oracle', reason: 'pack-provided:review-plus', note: 'enhancement only' }] };
  const defs = new Map([
    ['core', { id: 'core', requires: [], conflicts: [], files: [], optional_refs: [] }],
    ['docs-review', docs],
    ['review-plus', { id: 'review-plus', requires: ['core'], conflicts: [],
      files: [{ path: '.github/agents/performance-oracle.agent.md' }], optional_refs: [] }],
  ]);
  const contents = new Map([
    [file, 'Delegate persona: scope-guardian; optionally invoke `performance-oracle` and /ce-plan.'],
    ['.github/agents/scope-guardian-reviewer.agent.md', 'Use this persona in document review.'],
  ]);
  const options = { upstreamNames: new Set(['ce-plan', 'performance-oracle']),
    exclusions: new Map([['ce-plan', 'C2']]) };
  assert.deepEqual(validatePackClosure(defs, 'docs-review', contents, options), []);
  assert.deepEqual(recommendedPacks(defs, ['core', 'docs-review']), [
    { pack: 'review-plus', refs: ['performance-oracle'] },
  ]);
});

test('A6 ignores at-mentions only inside inline and fenced code', () => {
  const file = '.github/skills/example/SKILL.md';
  const defs = new Map([['core', { id: 'core', requires: [], conflicts: [],
    files: [{ path: file }], optional_refs: [] }]]);
  const contents = new Map([[file,
    'Use `@not-a-persona` as an example.\n```\n@also-not-a-persona\n```\nDelegate to @missing-persona.']]);
  const issues = validatePackClosure(defs, 'core', contents);
  assert.deepEqual(issues.map((issue) => issue.message), [
    'Reference missing-persona is not in core + requires closure',
  ]);
});

test('upstream-absent checks installable pinned resources, not upstream development skills', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-pin-'));
  try {
    const developmentSkill = join(root, 'atv', '.github', 'skills', 'every-style-editor', 'SKILL.md');
    const installableSkill = join(root, 'atv', 'pkg', 'scaffold', 'templates', 'skills', 'ce-review', 'SKILL.md');
    const generatedSkill = join(root, 'generated', '.github', 'skills', 'speckit-example', 'SKILL.md');
    await mkdir(resolve(developmentSkill, '..'), { recursive: true });
    await mkdir(resolve(installableSkill, '..'), { recursive: true });
    await mkdir(resolve(generatedSkill, '..'), { recursive: true });
    await writeFile(developmentSkill, 'upstream development tool');
    await writeFile(installableSkill, 'installable resource');
    await writeFile(generatedSkill, 'generated resource');
    assert.deepEqual(pinnedNames(join(root, 'generated'), join(root, 'atv')),
      new Set(['ce-review', 'speckit-example']));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('optional context packs are explicit, core-dependent and vendor only pinned inert inputs', async () => {
  const root = resolve(import.meta.dirname, '../..');
  const shipped = await loadPacks(root);
  assert.deepEqual(resolvePacks(shipped, []), ['core']);
  const expected = {
    'token-budget': {
      vendor: ['LICENSE', 'extension.yml', 'token-budget-config.template.yml',
        ...['compact', 'restore', 'scope', 'concise', 'usage'].map((name) => `commands/${name}.md`),
        ...['compact_helper', 'estimate_tokens', 'slim_output'].map((name) => `scripts/bash/${name}.sh`),
        ...['compact_helper', 'estimate_tokens'].map((name) => `scripts/powershell/${name}.ps1`)],
      wrappers: ['compact', 'restore', 'scope', 'concise', 'usage'].map((name) => `speckit-token-budget-${name}`),
    },
    optimize: {
      vendor: ['LICENSE', 'extension.yml', 'config-template.yml',
        ...['run', 'tokens', 'learn'].map((name) => `commands/speckit.optimize.${name}.md`)],
      wrappers: ['run', 'tokens', 'learn'].map((name) => `speckit-optimize-${name}`),
    },
  };
  for (const [id, { vendor, wrappers }] of Object.entries(expected)) {
    const pack = shipped.get(id);
    assert.ok(pack, id);
    assert.deepEqual(pack.requires, ['core']);
    assert.deepEqual(resolvePacks(shipped, [id]), ['core', id]);
    for (const other of shipped.values()) {
      if (other.id !== id) assert.ok(!other.files.some((file) => file.from === id), `${other.id} uses ${id}`);
    }
    const sourced = pack.files.filter((file) => file.from === id);
    assert.deepEqual(sourced.map((file) => file.upstream_path).sort(), [...vendor].sort());
    for (const file of sourced) assert.equal(file.path, `.baton/vendor/${id}/${file.upstream_path}`);
    const authored = pack.files.filter((file) => file.from === 'baton').map((file) => file.path).sort();
    assert.deepEqual(authored, wrappers.map((name) => `.github/skills/${name}/SKILL.md`).sort());
    assert.equal(pack.files.length, sourced.length + authored.length);
    assert.ok(!pack.files.some((file) => /^\.specify\/|extensions\.yml$|\/hooks?\//.test(file.path)));
  }
  assert.ok(!shipped.get('optimize').files.some((file) => /check|apply/.test(file.path)));
});

test('dotted Spec Kit command names resolve to their skills without hiding dangling commands', () => {
  const pack = (files) => new Map([
    ['core', { id: 'core', requires: [], conflicts: [], files: [
      { path: '.github/skills/speckit-constitution/SKILL.md' },
      { path: '.github/skills/speckit-optimize-run/SKILL.md' },
      { path: '.github/skills/speckit-token-budget-compact/SKILL.md' },
      ...files] }],
  ]);
  const check = (text) => validatePackClosure(pack([{ path: 'x.md' }]), 'core', new Map([
    ['x.md', text],
    ['.github/skills/speckit-constitution/SKILL.md', ''],
    ['.github/skills/speckit-optimize-run/SKILL.md', ''],
    ['.github/skills/speckit-token-budget-compact/SKILL.md', ''],
  ])).map((issue) => issue.message);
  assert.deepEqual(check('handoffs:\n  - agent: speckit.constitution\n    file: "commands/speckit.optimize.run.md"\n' +
    '# bookkeeping for /speckit.token-budget.compact.\n'), []);
  assert.deepEqual(check('agent: speckit.missing\n'), ['Reference speckit-missing is not in core + requires closure']);
  assert.deepEqual(check('file: "commands/speckit.optimize.absent.md"\n'),
    ['Reference speckit-optimize-absent is not in core + requires closure']);
  assert.deepEqual(check('Run /speckit.token-budget.absent.\n'),
    ['Reference speckit-token-budget-absent is not in core + requires closure']);
  assert.deepEqual(check('agent: speckit\nUse /compact now.\n').sort(), [
    'Reference compact is not in core + requires closure',
    'Reference speckit is not in core + requires closure',
  ]);
});