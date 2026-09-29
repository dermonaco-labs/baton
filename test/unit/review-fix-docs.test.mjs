import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { maintainerWorkflows } from '../../src/lib/maintainer-workflows.mjs';
import YAML from 'yaml';

const source = (path) => new URL(`../../${path}`, import.meta.url);
const publicHosts = new Set(['github.com', 'docs.github.com', 'registry.npmjs.org', 'pypi.org', 'files.pythonhosted.org']);
const placeholderHost = /(?:^|\.)(?:example\.(?:com|org|net)|example|invalid|test|localhost)$/;

test('tracked Baton documentation contains no private feed hostnames', async () => {
  const root = fileURLToPath(source(''));
  const paths = execFileSync('git', ['ls-files', '-z', '--', 'docs', 'specs', 'baton'], { cwd: root })
    .toString().split('\0').filter(path => path.endsWith('.md'));
  const violations = [];
  for (const path of paths) {
    const text = await readFile(source(path), 'utf8');
    const hosts = [
      ...[...text.matchAll(/https?:\/\/([^/\s)`>'"]+)/gi)].map(match => match[1]),
      ...[...text.matchAll(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\.(?:com|io|net|org|dev|cloud|app)\b/gi)].map(match => match[0]),
    ].map(host => host.toLowerCase().replace(/:\d+$/, ''));
    if (hosts.some(host => !publicHosts.has(host) && !placeholderHost.test(host))) violations.push(path);
  }
  assert.deepEqual(violations, [], 'Replace organisation-specific hosts with documented placeholders');
});

test('shipped troubleshooting names no concrete registry host beyond public or placeholder hosts', async () => {
  const text = await readFile(source('docs/08-troubleshooting.md'), 'utf8');
  const hosts = [
    ...[...text.matchAll(/https?:\/\/([^/\s)`>'"]+)/gi)].map(match => match[1]),
    ...[...text.matchAll(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\.(?:com|io|net|org|dev|cloud|app)\b/gi)].map(match => match[0]),
  ].map(host => host.toLowerCase().replace(/:\d+$/, ''));
  const concrete = hosts.filter(host => !publicHosts.has(host) && !placeholderHost.test(host));
  assert.deepEqual(concrete, [], 'Use a documented placeholder instead of an organisation-specific registry host');
  assert.match(text, /npm_config_registry/);
  assert.match(text, /UV_DEFAULT_INDEX/);
});

test('adopter command table remains contiguous', async () => {
  const text = await readFile(source('specs/001-baton-template/contracts/cli.md'), 'utf8');
  const table = text.split('## Adopter commands\n')[1].split('\n## Maintainer commands')[0];
  assert.match(table, /\| `handoff migrate`[^\n]*\n\| `models apply`/);
});

for (const path of ['baton/skills/baton-review/SKILL.md', '.github/skills/baton-review/SKILL.md']) {
  test(`review instructions explain the normalized handoff payload (${path})`, async () => {
    const text = await readFile(source(path), 'utf8');
    assert.match(text, /--from-json[\s\S]*?review:\s*\{\s*findings_path:/);
    assert.match(text, /blocking_findings/);
    assert.match(text, /automatically routes/);
    assert.match(text, /quick lane[^.]*`task` is optional/i);
  });
}

test('every Baton-authored skill a pack installs is byte-identical to its baton/skills source', async () => {
  const checked = [];
  for (const name of (await readdir(source('packs'))).filter(file => file.endsWith('.yml') && file !== 'repairs.yml')) {
    const pack = YAML.parse(await readFile(source(`packs/${name}`), 'utf8'));
    for (const entry of pack.files ?? []) {
      const skill = entry.from === 'baton' && entry.path.match(/\/skills\/([^/]+)\/SKILL\.md$/)?.[1];
      if (!skill || !existsSync(source(`baton/skills/${skill}/SKILL.md`))) continue;
      const shipped = pack.id === 'core' ? entry.path : `packs/${pack.id}/files/${entry.path}`;
      assert.deepEqual(await readFile(source(shipped)), await readFile(source(`baton/skills/${skill}/SKILL.md`)),
        `${shipped} drifted from baton/skills/${skill}/SKILL.md; regenerate it with baton sync`);
      checked.push(shipped);
    }
  }
  assert.ok(checked.includes('.github/skills/baton-review/SKILL.md'), JSON.stringify(checked));
});

test('maintainer workflow list matches template-cleanup keep_dormant and every workflow is classified', async () => {
  const config = YAML.parse(await readFile(source('.baton/template-cleanup.yml'), 'utf8'));
  const dormant = config.keep_dormant.filter(path => path.startsWith('.github/workflows/'))
    .map(path => path.slice('.github/workflows/'.length));
  assert.deepEqual([...maintainerWorkflows].sort(), dormant.filter(name => name !== 'template-cleanup.yml').sort());
  const active = config.keep_active.filter(path => /^\.github\/workflows\/[^/]+$/.test(path))
    .map(path => path.slice('.github/workflows/'.length));
  const workflows = (await readdir(source('.github/workflows'))).filter(name => /\.ya?ml$/.test(name));
  assert.deepEqual(workflows.filter(name => !dormant.includes(name) && !active.includes(name)), [],
    'Classify every workflow as keep_dormant or keep_active');
});