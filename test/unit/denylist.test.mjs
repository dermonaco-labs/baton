import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanPersonalData } from '../../src/lib/denylist.mjs';

test('rejects personal data in baton frontmatter and prose', () => {
  assert.deepEqual(scanPersonalData('approved_by: "repository owner via control-plane delegation"\n', { frontmatter: true }), []);
  for (const text of ['contact: a@b.io', 'owner: @x', 'path: C:\\Users\\example\\project']) {
    assert.ok(scanPersonalData(text, { frontmatter: true }).length, text);
  }
});

test('documentation examples are ignored but configured terms are not', () => {
  assert.deepEqual(scanPersonalData('Use `@x` as a sample.\n```\ncontact: a@b.io\n```\n'), []);
  assert.ok(scanPersonalData('Use `forbidden-term` as a sample.', { terms: ['forbidden-term'] }).length);
});

test('verbatim license email is exempt only in notices, never owner terms', () => {
  const attribution = 'Copyright Author <author@license.example>\n';
  assert.deepEqual(scanPersonalData(attribution, { path: 'THIRD_PARTY_NOTICES.md' }), []);
  assert.ok(scanPersonalData(attribution, { path: 'README.md' }).some((issue) => issue.code === 'E_DENYLIST'));
  assert.ok(scanPersonalData(attribution, { path: 'THIRD_PARTY_NOTICES.md', terms: ['author@license.example'] }).length);
});

test('JSDoc type annotations in authored source are not personal mentions', () => {
  assert.equal(scanPersonalData('/** @param {string} input @returns {boolean} */', { path: 'src/lib/example.mjs' }).length, 0);
  assert.ok(scanPersonalData('/** @someone */', { path: 'src/lib/example.mjs' }).some((issue) => issue.code === 'E_DENYLIST'));
});
