import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { sourceRoot } from '../helpers/index.mjs';

/** @param {string} directory @returns {Promise<string[]>} */
async function testSources(directory) {
  const output = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory() && item.name !== 'fixtures') output.push(...await testSources(path));
    else if (item.isFile() && item.name.endsWith('.mjs')) output.push(path);
  }
  return output;
}

/** @param {string} args */
function splitArgs(args) {
  const parts = [];
  let depth = 0, current = '';
  for (const char of args) {
    if (char === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue; }
    if ('([{'.includes(char)) depth++;
    if (')]}'.includes(char)) depth--;
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Every temp root a test creates with mkdtemp, as a source-relative prefix (null when outside the tree). */
function tempPrefixes(text, file) {
  const prefixes = [];
  for (const call of text.matchAll(/mkdtemp\(join\(((?:[^()]|\([^()]*\))*)\)\)/g)) {
    const [base, ...rest] = splitArgs(call[1]);
    if (base === 'tmpdir()') continue;
    const defined = base === 'sourceRoot' ? '' :
      text.match(new RegExp(`const ${base} = (?:join|resolve)\\(\\w+, '([^']+)'\\)`))?.[1];
    assert.notEqual(defined, undefined, `${file}: cannot resolve temp root base ${base}`);
    let variants = [''];
    for (const part of rest) {
      const literal = part.match(/^'([^']*)'$/)?.[1];
      if (literal !== undefined) { variants = variants.map(value => value + (value ? '/' : '') + literal); continue; }
      const helper = [...text.slice(0, call.index).matchAll(new RegExp(`function (\\w+)\\(${part}\\)`, 'g'))].at(-1)?.[1];
      assert.ok(helper, `${file}: temp root argument ${part} is not a literal or helper parameter`);
      const values = [...text.matchAll(new RegExp(`\\b${helper}\\('([^']+)'\\)`, 'g'))].map(match => match[1]);
      variants = variants.flatMap(value => values.map(item => value + (value ? '/' : '') + item));
    }
    prefixes.push(...variants.map(value => [defined, value].filter(Boolean).join('/')));
  }
  return prefixes;
}

test('F52 every in-tree mkdtemp root used by tests is gitignored', async () => {
  const prefixes = new Set();
  for (const file of await testSources(join(sourceRoot, 'test'))) {
    const name = relative(sourceRoot, file).replaceAll('\\', '/');
    for (const prefix of tempPrefixes(await readFile(file, 'utf8'), name)) prefixes.add(prefix);
  }
  assert.ok(prefixes.size > 0, 'expected the scan to find in-tree temp roots');
  const unignored = [...prefixes].filter(prefix => {
    try {
      execFileSync('git', ['check-ignore', '-q', '--no-index', '--', `${prefix}Ab12Cd/probe.txt`], { cwd: sourceRoot, stdio: 'ignore' });
      return false;
    } catch { return true; }
  });
  assert.deepEqual(unignored, [], 'Create temp roots under os.tmpdir() or gitignore their prefix');
});