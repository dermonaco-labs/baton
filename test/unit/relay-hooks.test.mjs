import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { sourceRoot } from '../helpers/index.mjs';

const phases = ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'implement', 'converge'];

test('every Spec Kit phase keeps exactly one mandatory Baton receive and handoff hook', async () => {
  const extensions = YAML.parse(await readFile(join(sourceRoot, '.specify/extensions.yml'), 'utf8'));
  assert.ok(!(extensions.installed ?? []).includes('github'), 'core must not register the github extension');
  for (const phase of phases) {
    for (const [event, command] of [[`before_${phase}`, 'speckit.baton.receive'], [`after_${phase}`, 'speckit.baton.handoff']]) {
      const baton = (extensions.hooks?.[event] ?? []).filter((/** @type {any} */ hook) => hook?.extension === 'baton');
      assert.equal(baton.length, 1, event);
      const [hook] = baton;
      assert.equal(hook.command, command, event);
      assert.equal(hook.optional, false, event);
      assert.notEqual(hook.enabled, false, event);
      assert.ok(hook.condition === undefined || hook.condition === null || hook.condition === '', event);
    }
  }
});

test('every Spec Kit phase skill dispatches its before and after hooks', async () => {
  for (const phase of phases) {
    const path = `.github/skills/speckit-${phase}/SKILL.md`;
    const skill = await readFile(join(sourceRoot, path), 'utf8');
    assert.match(skill, new RegExp(`hooks\\.before_${phase}\\b`), path);
    assert.match(skill, new RegExp(`hooks\\.after_${phase}\\b`), path);
  }
});

test('the Baton Spec Kit extension version range admits Spec Kit 1.3.0', async () => {
  const manifest = YAML.parse(await readFile(join(sourceRoot, 'baton/speckit-extension/extension.yml'), 'utf8'));
  const range = manifest.requires?.speckit_version;
  assert.equal(typeof range, 'string');
  const parse = (/** @type {string} */ version) => version.split('.').map(Number);
  const compare = (/** @type {number[]} */ a, /** @type {number[]} */ b) =>
    a.reduce((result, part, index) => result || Math.sign(part - b[index]), 0);
  const target = parse('1.3.0');
  for (const clause of range.split(',').map(part => part.trim())) {
    const [, operator, version] = /^(>=|<=|>|<|==)(\d+\.\d+\.\d+)$/.exec(clause) ?? [];
    assert.ok(operator, `unsupported range clause ${clause}`);
    const order = compare(target, parse(version));
    const admits = { '>=': order >= 0, '<=': order <= 0, '>': order > 0, '<': order < 0, '==': order === 0 }[operator];
    assert.ok(admits, `1.3.0 is outside ${range}`);
  }
});
