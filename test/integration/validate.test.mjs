import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, rm, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { runCli, sourceRoot } from '../helpers/index.mjs';
import { run as validate } from '../../src/commands/validate.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';

for (const state of ['untracked', 'changed']) {
  test(`validate does not classify ${state} command docs or templates as handoffs`, async (context) => {
    const root = await mkdtemp(join(tmpdir(), 'baton-command-docs-'));
    try {
      await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
      execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
      const paths = [
        '.specify/extensions/baton/commands/handoff.md',
        'baton/templates/handoff.md',
        'baton/speckit-extension/commands/handoff.md',
      ];
      for (const path of paths) {
        await mkdir(dirname(join(root, path)), { recursive: true });
        if (state === 'changed') await writeFile(join(root, path), '# Original\n');
      }
      execFileSync('git', ['add', '.'], { cwd: root });
      execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@invalid.example',
        'commit', '-qm', 'base'], { cwd: root });
      execFileSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: root });
      execFileSync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main'], { cwd: root });
      for (const path of paths) {
        await writeFile(join(root, path), '---\ndescription: Persist the phase result\n---\n# Handoff command\n');
      }
      for (const args of [['--changed'], ...paths.map((path) => ['--path', path])]) {
        await context.test(args.join(' '), async () => {
          const result = await runCli(root, ['validate', ...args, '--json']);
          assert.equal(result.code, 0, result.stdout);
          assert.deepEqual(JSON.parse(result.stdout).errors, [], result.stdout);
        });
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test(`validate still rejects ${state} malformed canonical handoffs in every mode`, async () => {
    const root = await mkdtemp(join(tmpdir(), 'baton-canonical-handoffs-'));
    try {
      await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
      execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
      const paths = ['specs/001-example/handoff.md', '.baton/quick/example-fix.md'];
      for (const path of paths) {
        await mkdir(dirname(join(root, path)), { recursive: true });
        if (state === 'changed') await writeFile(join(root, path), '# Original\n');
      }
      execFileSync('git', ['add', '.'], { cwd: root });
      execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@invalid.example',
        'commit', '-qm', 'base'], { cwd: root });
      execFileSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: root });
      execFileSync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main'], { cwd: root });
      for (const path of paths) {
        await writeFile(join(root, path), '---\ndescription: Not a valid phase baton\n---\n# Invalid\n');
      }
      for (const args of [[], ['--changed'], ...paths.map((path) => ['--path', path])]) {
        const result = await runCli(root, ['validate', ...args, '--json']);
        assert.equal(result.code, 1, result.stdout);
        const errors = JSON.parse(result.stdout).errors;
        const selected = args[0] === '--path' ? [args[1]] : paths;
        for (const path of selected) {
          for (const code of ['E_SCHEMA', 'E_ACTOR_FORMAT', 'E_BODY_SECTIONS']) {
            assert.ok(errors.some((error) => error.file === path && error.code === code),
              `${path}: missing ${code}: ${result.stdout}`);
          }
        }
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test(`validate retains personal-data checks for ${state} noncanonical handoff docs`, async (context) => {
    const root = await mkdtemp(join(tmpdir(), 'baton-command-doc-denylist-'));
    try {
      await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
      execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
      const paths = [
        '.specify/extensions/baton/commands/handoff.md',
        'baton/templates/handoff.md',
        'baton/speckit-extension/commands/handoff.md',
      ];
      for (const path of paths) {
        await mkdir(dirname(join(root, path)), { recursive: true });
        if (state === 'changed') await writeFile(join(root, path), '# Original\n');
      }
      execFileSync('git', ['add', '.'], { cwd: root });
      execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@invalid.example',
        'commit', '-qm', 'base'], { cwd: root });
      execFileSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], { cwd: root });
      execFileSync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main'], { cwd: root });
      const termsFile = join(root, 'private-terms.txt');
      await writeFile(termsFile, 'private-owner-term\n');
      const sources = [
        ['frontmatter', '---\ndescription: "`person@private.example`"\n---\n# Command\n'],
        ['decoded frontmatter', '---\ndescription: "person\\u0040private.example"\n---\n# Command\n'],
        ['body', '---\ndescription: Command\n---\nContact person@private.example\n'],
        ['configured term', '---\ndescription: Command\n---\nprivate-owner-term\n'],
        ['decoded configured term', '---\ndescription: "private\\u002downer-term"\n---\n# Command\n'],
        ['no-frontmatter body', '# Command\nContact person@private.example\n'],
      ];
      for (const [label, source] of sources) {
        for (const path of paths) await writeFile(join(root, path), source);
        for (const args of [['--changed'], ...paths.map((path) => ['--path', path])]) {
          await context.test(`${label}: ${args.join(' ')}`, async () => {
            const result = await runCli(root, ['validate', ...args, '--json'], { BATON_DENYLIST_FILE: termsFile });
            assert.equal(result.code, 1, result.stdout);
            const errors = JSON.parse(result.stdout).errors;
            for (const path of args[0] === '--path' ? [args[1]] : paths) {
              assert.ok(errors.some((error) => error.code === 'E_DENYLIST' && error.file === path), result.stdout);
            }
            assert.ok(!errors.some((error) => error.code === 'E_SCHEMA'), result.stdout);
          });
        }
      }
      for (const source of [
        '---\ndescription: Command\n---\nExample: `person@private.example`\n',
        '# Command\nExample: `person@private.example`\n',
      ]) {
        for (const path of paths) await writeFile(join(root, path), source);
        for (const args of [['--changed'], ...paths.map((path) => ['--path', path])]) {
          const result = await runCli(root, ['validate', ...args, '--json'], { BATON_DENYLIST_FILE: termsFile });
          assert.equal(result.code, 0, result.stdout);
        }
      }
      for (const path of paths) {
        await writeFile(join(root, path), '---\ndescription: [broken\n---\n# Command\n');
      }
      for (const args of [['--changed'], ...paths.map((path) => ['--path', path])]) {
        const result = await runCli(root, ['validate', ...args, '--json']);
        assert.equal(result.code, 1, result.stdout);
        const errors = JSON.parse(result.stdout).errors;
        for (const path of args[0] === '--path' ? [args[1]] : paths) {
          assert.ok(errors.some((error) => error.code === 'E_FRONTMATTER_MALFORMED' && error.file === path), result.stdout);
        }
        assert.ok(!errors.some((error) => error.code === 'E_SCHEMA'), result.stdout);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test('validate warns when a feature spec has no baton', async () => {
  const root = await mkdtemp(join(sourceRoot, 'test/fixtures/validate-no-baton-'));
  try {
    await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
    await mkdir(join(root, 'specs/001-example'), { recursive: true });
    await writeFile(join(root, 'specs/001-example/spec.md'), '# User stories\n');
    const result = await validate(root, []);
    assert.ok(result.warnings.some(({ code, file, message }) =>
      code === 'W_NO_BATON' && file?.startsWith('specs/001-example') && message.includes('handoff init --infer')),
    JSON.stringify(result.warnings));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validate warns when a baton assumption is due at its next phase', async () => {
  const root = await mkdtemp(join(sourceRoot, 'test/fixtures/validate-assumption-'));
  try {
    await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
    await cp(join(sourceRoot, 'test/fixtures/features/sample'), join(root, 'specs/001-sample'), { recursive: true });
    const fixture = await readFile(join(sourceRoot, 'test/fixtures/handoffs/valid/feature/specify.md'), 'utf8');
    const parsed = parseFrontmatter(fixture);
    parsed.data.assumptions = [
      { id: 'A1', text: 'Revisit this before clarification', revisit_at: 'clarify' },
      { id: 'A2', text: 'Not due until review', revisit_at: 'review' },
    ];
    await writeFile(join(root, 'specs/001-sample/handoff.md'), serializeFrontmatter(parsed.data, parsed.body));
    const result = await validate(root, []);
    assert.ok(result.warnings.some(({ code, file, message }) =>
      code === 'W_ASSUMPTION_DUE' && file === 'specs/001-sample/handoff.md' && message.includes('A1')),
    JSON.stringify(result.warnings));
    assert.ok(!result.warnings.some(({ code, message }) => code === 'W_ASSUMPTION_DUE' && message.includes('A2')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validate --path scans personal data in selected files and fixtures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-validate-'));
  try {
    await mkdir(join(root, 'baton'), { recursive: true });
    await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
    await writeFile(join(root, 'README.md'), '# Contact\n\nperson@private.example\n');
    await mkdir(join(root, 'test/fixtures'), { recursive: true });
    await writeFile(join(root, 'test/fixtures/personal.md'), '# Contact\n\n@private-handle\n');
    for (const path of ['README.md', 'test/fixtures/personal.md']) {
      const result = await runCli(root, ['validate', '--path', path, '--json']);
      assert.equal(result.code, 1, path);
      assert.ok(JSON.parse(result.stdout).errors.some((error) => error.code === 'E_DENYLIST' && error.file === path), path);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('default validation checks owner terms in vendored license notices', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-licenses-'));
  try {
    await mkdir(join(root, 'baton'), { recursive: true });
    await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
    const licenses = [
      '.github/skills/speckit-example/LICENSE',
      'packs/docs-review/files/.github/agents/LICENSE',
    ];
    for (const path of licenses) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), 'Copyright Author <author@license.example>\nprivate-owner-term\n');
    }
    const termsFile = join(root, 'private-terms.txt');
    await writeFile(termsFile, 'private-owner-term\n');
    const result = await runCli(root, ['validate', '--json'], { BATON_DENYLIST_FILE: termsFile });
    const found = JSON.parse(result.stdout).errors.filter((error) => error.code === 'E_DENYLIST');
    assert.equal(result.code, 1);
    assert.deepEqual(found.map((error) => error.file).sort(), licenses.sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validate --changed retains the license-notice denylist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-changed-license-'));
  try {
    await mkdir(join(root, 'baton'), { recursive: true });
    await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@invalid.example',
      'commit', '-q', '--allow-empty', '-m', 'base'], { cwd: root });
    execFileSync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/heads/main'], { cwd: root });
    const path = 'packs/docs-review/files/.github/agents/LICENSE';
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), 'Copyright Author <author@license.example>\nprivate-owner-term\n');
    const termsFile = join(root, 'private-terms.txt');
    await writeFile(termsFile, 'private-owner-term\n');
    const result = await runCli(root, ['validate', '--changed', '--json'], { BATON_DENYLIST_FILE: termsFile });
    assert.equal(result.code, 1);
    assert.ok(JSON.parse(result.stdout).errors.some((error) => error.code === 'E_DENYLIST' && error.file === path));
    execFileSync('git', ['add', path], { cwd: root });
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@invalid.example',
      'commit', '-q', '-m', 'tracked license'], { cwd: root });
    await writeFile(join(root, 'README.md'), '# Clean change\n');
    const unchanged = await runCli(root, ['validate', '--changed', '--json'], { BATON_DENYLIST_FILE: termsFile });
    assert.ok(!JSON.parse(unchanged.stdout).errors.some((error) => error.code === 'E_DENYLIST'), unchanged.stdout);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validate reports E_UNDOCUMENTED for missing core references and accepts documented entries', async () => {
  const root = await mkdtemp(join(sourceRoot, 'test/fixtures/docs-coverage-'));
  try {
    await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
    await mkdir(join(root, '.github/skills/sample'), { recursive: true });
    await mkdir(join(root, '.github/agents'), { recursive: true });
    await mkdir(join(root, 'docs/reference'), { recursive: true });
    await writeFile(join(root, '.github/skills/sample/SKILL.md'), '---\nname: sample\ndescription: Sample\n---\n');
    await writeFile(join(root, '.github/agents/sample-reviewer.agent.md'), '---\nname: sample-reviewer\ndescription: Sample\n---\n');
    await writeFile(join(root, 'docs/reference/skills.md'), '# Skills\n\n### `sample`\n\nWhen to use: now. Hands off to: review.\n');
    await writeFile(join(root, 'docs/reference/agents.md'), '# Agents\n');
    await writeFile(join(root, 'docs/reference/commands.md'), '# Commands\n');
    const missing = await validate(root, []);
    const missingIssues = missing.errors.filter((issue) => issue.code === 'E_UNDOCUMENTED');
    assert.ok(missingIssues.some((issue) => issue.message.includes('sample-reviewer')));
    assert.ok(missingIssues.some((issue) => issue.message.includes('validate')));

    await writeFile(join(root, 'docs/reference/agents.md'), '# Agents\n\n### `sample-reviewer`\n\nWhen to use: now. Hands off to: review.\n');
    await writeFile(join(root, 'docs/reference/commands.md'),
      '# Commands\n\n' + ['build', 'manifest', 'lock', 'sync', 'validate', 'handoff', 'status', 'adopt',
        'doctor', 'init', 'update', 'models', 'uninstall'].map((name) =>
        `### \`${name}\`\n\nWhen to use: now. Hands off to: next.\n`).join('\n'));
    const valid = await validate(root, []);
    assert.ok(!valid.errors.some((issue) => issue.code === 'E_UNDOCUMENTED'), JSON.stringify(valid.errors));
    await rm(join(root, 'docs/reference/commands.md'));
    const absent = await validate(root, []);
    assert.ok(absent.errors.some((issue) => issue.code === 'E_UNDOCUMENTED' && issue.message.includes('validate')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
