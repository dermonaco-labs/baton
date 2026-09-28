import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import { sourceRoot } from '../helpers/index.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';

const feature = '001-sample';
const handoff = `specs/${feature}/handoff.md`;
const git = promisify(execFile);

async function repo() {
  const root = await mkdtemp(join(tmpdir(), 'baton-audit-waiver-'));
  await mkdir(join(root, `specs/${feature}`), { recursive: true });
  await mkdir(join(root, '.baton/bin'), { recursive: true });
  await mkdir(join(root, '.github/agents'), { recursive: true });
  await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
  await cp(join(sourceRoot, 'test/fixtures/features/sample'), join(root, 'specs', feature), { recursive: true });
  await cp(join(sourceRoot, 'test/fixtures/handoffs/valid/feature/analyze.md'), join(root, handoff));
  await cp(join(sourceRoot, 'baton/templates/config.yml'), join(root, '.baton/config.yml'));
  await cp(join(sourceRoot, '.baton/bin/baton.mjs'), join(root, '.baton/bin/baton.mjs'));
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

async function cli(root, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['.baton/bin/baton.mjs', '--cwd', root, ...args], {
      cwd: root, windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

async function edit(root, change) {
  const path = join(root, handoff);
  const { data, body } = parseFrontmatter(await readFile(path, 'utf8'));
  change(data);
  await writeFile(path, serializeFrontmatter(data, body));
}

async function mutant(root, id) {
  const selected = process.env.BATON_AUDIT_MUTANT;
  if (selected !== id && !(id === 'D80' && ['D80-channel', 'D80-actor'].includes(selected))) return;
  const path = join(root, '.baton/bin/baton.mjs');
  let bundle = await readFile(path, 'utf8');
  const replacements = {
    D76: [
      ['d.every(h=>u.some(y=>y.story===h&&l.includes(y.id)))', 'u.length>0'],
      ['w.has(A)||r.push({code:"E_NO_PREREG"', 'w.size>0||r.push({code:"E_NO_PREREG"'],
    ],
    D80: [['function xu(t,e){', 'function xu(t,e){return true;']],
    'D80-channel': [['(!r||e.channels.includes(r))', 'true']],
    'D80-actor': [['function Bn(t,e){', 'function Bn(t,e){return true;']],
    D82: [['e.suggested_model=i.model;', 'e.suggested_model=null;']],
  };
  for (const [before, after] of replacements[selected]) {
    assert.ok(bundle.includes(before), `bundle mutant ${id} anchor changed`);
    bundle = bundle.replace(before, after);
  }
  await writeFile(path, bundle);
}

test('D71: adopted cleanup workflow explains push failure and matches local adopt command', async () => {
  const { root, cleanup } = await repo();
  try {
    await mkdir(join(root, '.github/workflows'), { recursive: true });
    const workflowPath = join(root, '.github/workflows/template-cleanup.yml');
    let workflow = await readFile(join(sourceRoot, '.github/workflows/template-cleanup.yml'), 'utf8');
    if (process.env.BATON_AUDIT_MUTANT === 'D71') {
      workflow = workflow.replace(/^\s*echo "::error::Template cleanup could not push\.[^\n]+\n/m, '');
    }
    await writeFile(workflowPath, workflow);
    const ran = await cli(root, ['handoff', 'next', '--feature', feature, '--json']);
    assert.equal(ran.code, 0, ran.stderr || ran.stdout);
    const installed = await readFile(workflowPath, 'utf8');
    const local = /run:\s*node \.baton\/bin\/baton\.mjs (adopt --no-workflows)/.exec(installed)?.[1];
    assert.equal(local, 'adopt --no-workflows');
    const documented = await readFile(join(sourceRoot, 'specs/001-baton-template/quickstart.md'), 'utf8');
    assert.ok(documented.includes(`node .baton/bin/baton.mjs ${local}`), 'documented local command matches workflow arguments');
    const pushFailure = /if ! git push; then([\s\S]*?)\n\s*fi/.exec(installed)?.[1];
    assert.ok(pushFailure, 'push failure branch exists');
    assert.match(pushFailure, /echo "::error::[^"\n]*Run baton adopt locally[^"\n]*"/);
    assert.match(pushFailure, /echo "::error::[\s\S]*?\n\s*exit 1/);
    assert.equal(local.split(' ')[0], /Run baton (adopt) locally/.exec(pushFailure)?.[1]);
  } finally {
    await cleanup();
  }
});

test('D76: implement receive rejects US2 lacking prereg even when US1 is registered', async () => {
  const { root, cleanup } = await repo();
  try {
    const tasks = join(root, `specs/${feature}/tasks.md`);
    await writeFile(tasks, (await readFile(tasks, 'utf8'))
      .replace('## Acceptance Registry', '- [ ] T002 [US2] Check the second story.\n\n## Acceptance Registry'));
    // Refresh recomputes the evidence hashes without changing the preregistration.
    assert.equal((await cli(root, ['handoff', 'refresh', '--feature', feature, '--reason', 'Add second story'])).code, 0);
    const approved = await cli(root, ['handoff', 'approve', '--feature', feature, '--by', 'maintainer']);
    assert.equal(approved.code, 0, approved.stderr || approved.stdout);
    await mutant(root, 'D76');
    const result = await cli(root, ['handoff', 'receive', '--phase', 'implement', '--feature', feature, '--json']);
    assert.equal(result.code, 1, result.stdout || result.stderr);
    const errors = JSON.parse(result.stdout).errors.filter((error) => error.code === 'E_NO_PREREG');
    assert.equal(errors.length, 1, result.stdout);
    assert.match(errors[0].message, /US2 lacks pre-registered/);
    assert.doesNotMatch(errors[0].message, /US1 lacks pre-registered/);
  } finally {
    await cleanup();
  }
});

test('D80: CLI rejects unconfigured approver roles/channels and human actors', async () => {
  const { root, cleanup } = await repo();
  try {
    const config = YAML.parse(await readFile(join(root, '.baton/config.yml'), 'utf8'));
    assert.ok(config.gates.approver_roles.includes('maintainer'));
    await mutant(root, 'D80');
    for (const by of ['Jane Doe', 'jane doe', 'jane@example.invalid', 'janitor']) {
      const result = await cli(root, ['handoff', 'approve', '--feature', feature, '--by', by, '--json']);
      assert.equal(result.code, 2, `${by}: ${result.stdout || result.stderr}`);
      assert.match(result.stdout + result.stderr, /E_APPROVER_FORMAT/);
    }
    const channel = await cli(root, ['handoff', 'approve', '--feature', feature, '--by', 'maintainer', '--via', 'unknown channel', '--json']);
    assert.equal(channel.code, 2, channel.stdout || channel.stderr);
    assert.match(channel.stdout + channel.stderr, /E_APPROVER_FORMAT/);
    await edit(root, (data) => { data.updated_by = 'human:janitor'; });
    const actor = await cli(root, ['validate', '--path', handoff, '--json']);
    assert.equal(actor.code, 1, actor.stdout || actor.stderr);
    assert.ok(JSON.parse(actor.stdout).errors.some((entry) => entry.code === 'E_ACTOR_FORMAT'), actor.stdout);
  } finally {
    await cleanup();
  }
});

test('D82: analyze write persists implementation role and configured model without changing agents', async () => {
  const { root, cleanup } = await repo();
  try {
    const agentPath = join(root, '.github/agents/unchanged.agent.md');
    const original = Buffer.from('---\ndescription: Unchanged\n---\nOriginal body.\n');
    await writeFile(agentPath, original);
    const configPath = join(root, '.baton/config.yml');
    const config = YAML.parse(await readFile(configPath, 'utf8'));
    config.models.roles.implementation.model = 'configured-implementation-model';
    await writeFile(configPath, YAML.stringify(config));
    await edit(root, (data) => {
      data.phase_completed = 'tasks';
      data.next_phase = 'analyze';
      data.next_owner = 'speckit-analyze';
      data.model_role = 'review';
      data.gate = { required: false, approved_by: null, approved_at: null };
    });
    await git('git', ['init', '-q'], { cwd: root });
    await git('git', ['add', '.'], { cwd: root });
    await git('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'baseline'], { cwd: root });
    await writeFile(join(root, 'handoff-input.json'), JSON.stringify({ summary: 'Analysis complete.' }));
    await mutant(root, 'D82');
    const result = await cli(root, ['handoff', 'write', '--phase', 'analyze', '--feature', feature, '--from-json', 'handoff-input.json', '--json']);
    assert.equal(result.code, 0, result.stdout || result.stderr);
    const written = parseFrontmatter(await readFile(join(root, handoff), 'utf8')).data;
    assert.equal(written.next_phase, 'implement');
    assert.equal(written.model_role, 'implementation');
    assert.equal(written.suggested_model, config.models.roles.implementation.model);
    assert.deepEqual(await readFile(agentPath), original);
  } finally {
    await cleanup();
  }
});
