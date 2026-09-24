import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import YAML from 'yaml';
import { phaseDefaults, checkWeakenedContracts, validateCheckList, evaluateChecks } from '../../src/lib/phases.mjs';

test('every feature phase has entry and exit checks', () => {
  for (const [name, phase] of Object.entries(phaseDefaults.phases)) {
    if (name === 'brainstorm') continue;
    if (!phase.lane.includes('feature')) continue;
    assert.ok(phase.entry.length, `${name} missing entry checks`);
    assert.ok(phase.exit.length, `${name} missing exit checks`);
  }
});

test('removing a built-in exit criterion warns', () => {
  assert.ok(checkWeakenedContracts({
    ...phaseDefaults,
    phases: { ...phaseDefaults.phases, tasks: { ...phaseDefaults.phases.tasks, exit: [] } },
  }).some((entry) => entry.code === 'W_WEAKENED_CONTRACT'));
});

test('check groups evaluate every member and preserve evidence', async () => {
  const expressions = [{ id: 'compound-recorded', any_of: [
    { id: 'artifact-exists', path: 'docs/solutions/*.md' },
    { id: 'decision', tag: 'skip-compound' },
  ] }];
  assert.deepEqual(validateCheckList(expressions), []);
  const visited = [];
  const results = await evaluateChecks(expressions, async (check, key) => {
    visited.push(key);
    return { met: check.id === 'decision', evidence: check.id === 'decision' ? 'D4' : 'missing' };
  });
  assert.deepEqual(visited, ['artifact-exists:docs/solutions/*.md', 'decision:skip-compound']);
  assert.equal(results[0].met, true);
  assert.deepEqual(results[0].members.map(({ id, met }) => [id, met]), [
    ['artifact-exists:docs/solutions/*.md', false], ['decision:skip-compound', true],
  ]);
  assert.equal((await evaluateChecks(expressions, async () => ({ met: false })))[0].met, false);
});

test('check validation rejects unknown checks, malformed groups and duplicate keys', () => {
  assert.equal(validateCheckList([{ id: 'unregistered' }])[0].code, 'E_CHECK_UNKNOWN');
  assert.equal(validateCheckList([{ id: 'artifact-exists', path: 'x' }, { id: 'artifact-exists', path: 'x' }])[0].code, 'E_CHECK_KEY_DUP');
  assert.equal(validateCheckList([{ id: 'artifact-exists', any_of: [{ id: 'spec-exists' }, { id: 'plan-exists' }] }])[0].code, 'E_CHECK_GROUP');
  assert.equal(validateCheckList([{ id: 'group', any_of: [{ id: 'spec-exists' }] }])[0].code, 'E_CHECK_GROUP');
  assert.equal(validateCheckList([{ id: 'group', all_of: [{ id: 'spec-exists' }, { id: 'plan-exists' }], any_of: [{ id: 'spec-exists' }, { id: 'plan-exists' }] }])[0].code, 'E_CHECK_GROUP');
  assert.equal(validateCheckList([{ id: 'group', all_of: [
    { id: 'nested', all_of: [
      { id: 'too-deep', all_of: [{ id: 'spec-exists' }, { id: 'plan-exists' }] },
      { id: 'spec-exists' },
    ] },
    { id: 'plan-exists' },
  ] }])[0].code, 'E_CHECK_GROUP');
});

test('weakened contract detects moving mandatory exit into a disjunction', () => {
  const defaults = phaseDefaults.phases.compound.exit;
  assert.equal(defaults[0].id, 'compound-recorded');
  assert.equal(defaults[0].any_of?.length, 2);
  const override = { ...phaseDefaults, phases: {
    ...phaseDefaults.phases,
    tasks: { ...phaseDefaults.phases.tasks, exit: [
      { id: 'other-way', any_of: [{ id: 'tasks-reference-stories' }, { id: 'decision', tag: 'skip' }] },
    ] },
  } };
  assert.ok(checkWeakenedContracts(override).some((entry) => entry.message.includes('tasks-reference-stories')));
});

test('shipped phase template is valid and never weakens its built-in contracts', async () => {
  const source = await readFile(new URL('../../baton/templates/phases.yml', import.meta.url), 'utf8');
  const template = YAML.parse(source);
  for (const [name, phase] of Object.entries(template.phases)) {
    assert.deepEqual(validateCheckList(phase.entry), [], `${name} entry`);
    assert.deepEqual(validateCheckList(phase.exit), [], `${name} exit`);
    for (const override of Object.values(phase.by_lane ?? {})) {
      if (override.entry) assert.deepEqual(validateCheckList(override.entry), [], `${name} quick entry`);
      if (override.exit) assert.deepEqual(validateCheckList(override.exit), [], `${name} quick exit`);
    }
  }
  assert.deepEqual(checkWeakenedContracts(template), []);
});
