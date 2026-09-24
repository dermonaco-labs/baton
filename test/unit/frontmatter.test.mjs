import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';

test('parses YAML 1.2 frontmatter and round trips the body', () => {
  const source = '---\nname: example\ndescription: Norway\n---\n# Heading\r\nBody\n';
  const parsed = parseFrontmatter(source);
  assert.equal(parsed.data.description, 'Norway');
  assert.equal(parsed.body, '# Heading\r\nBody\n');
  assert.equal(serializeFrontmatter(parsed.data, parsed.body).endsWith(parsed.body), true);
});

test('rejects the ATV no-newline frontmatter signature', () => {
  assert.throws(() => parseFrontmatter('---description: broken---# Agent'), /E_FRONTMATTER_MALFORMED/);
});
