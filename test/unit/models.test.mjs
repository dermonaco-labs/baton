import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { sourceRoot } from '../helpers/index.mjs';
import { hashFile } from '../../src/lib/hash.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../../src/lib/frontmatter.mjs';
import { resolveModel, modelPolicyIssue, agentModelRole } from '../../src/lib/models.mjs';
import { run as applyModels } from '../../src/commands/models.mjs';
import { run as validate } from '../../src/commands/validate.mjs';
import { run as handoff } from '../../src/commands/handoff.mjs';
import { formatResult } from '../../src/lib/report.mjs';

const agent = '.github/agents/testing-reviewer.agent.md';
const unmanaged = '.github/agents/private.agent.md';
const original = '---\ndescription: Reviews tests\n---\nDo not change this body.\n';
const settings = {
  roles: {
    planning: { model: 'plan-model', reasoning: 'high' },
    implementation: { model: 'code-model' },
    review: { model: 'review-model' },
    fast: { model: 'fast-model' },
  },
  phase_roles: {},
  allowed: [],
  enforce: 'warn',
  apply_to_agents: true,
};

async function fixture() {
  const root = await mkdtemp(join(sourceRoot, 'test/fixtures/.models-'));
  await mkdir(join(root, '.baton'), { recursive: true });
  await mkdir(join(root, '.github/agents'), { recursive: true });
  await cp(join(sourceRoot, 'baton/schemas'), join(root, 'baton/schemas'), { recursive: true });
  await writeFile(join(root, agent), original);
  await writeFile(join(root, unmanaged), original);
  await writeFile(join(root, '.baton/config.yml'), YAML.stringify({ schema: 1, models: settings }));
  await writeFile(join(root, '.baton/manifest.json'), JSON.stringify({
    schema: 1, files: [{ path: agent, managed: true, sha256: await hashFile(join(root, agent)) }],
  }));
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test('role resolution uses phase override and inherits when no role model is set', () => {
  assert.deepEqual(resolveModel(settings, 'implement', 'implementation'), {
    role: 'implementation', model: 'code-model', reasoning: undefined,
  });
  assert.deepEqual(resolveModel({ ...settings, phase_roles: { implement: 'fast' } }, 'implement', 'implementation'), {
    role: 'fast', model: 'fast-model', reasoning: undefined,
  });
  assert.deepEqual(resolveModel({ ...settings, roles: { ...settings.roles, fast: {} } }, 'tasks', 'fast'), {
    role: 'fast', model: null, reasoning: undefined,
  });
  assert.equal(agentModelRole('.github/agents/best-practices-researcher.agent.md', 'research'), 'planning');
  assert.equal(agentModelRole('.github/agents/design-iterator.agent.md', 'design'), 'implementation');
  assert.equal(agentModelRole(agent, 'core'), 'review');
});

test('allow list enforcement is off, warning or error for configured and agent models', () => {
  const base = { ...settings, allowed: ['plan-model'] };
  assert.equal(modelPolicyIssue({ ...base, enforce: 'off' }, 'review-model', agent), null);
  assert.equal(modelPolicyIssue(base, 'plan-model', agent), null);
  assert.equal(modelPolicyIssue(base, 'review-model', agent)?.code, 'W_MODEL_NOT_ALLOWED');
  assert.equal(modelPolicyIssue({ ...base, enforce: 'error' }, 'review-model', agent)?.code, 'E_MODEL_NOT_ALLOWED');
  assert.equal(modelPolicyIssue({ ...base, enforce: 'error', allowed: [] }, 'review-model', agent), null);
});

test('validate enforces all configured roles and custom-agent frontmatter', async () => {
  const { root, cleanup } = await fixture();
  try {
    const configPath = join(root, '.baton/config.yml');
    const config = YAML.parse(await readFile(configPath, 'utf8'));
    config.models.allowed = ['plan-model', 'code-model', 'fast-model'];
    config.models.enforce = 'error';
    await writeFile(configPath, YAML.stringify(config));
    await writeFile(join(root, unmanaged), '---\ndescription: Private\nmodel: forbidden-model\n---\nBody\n');
    const result = await validate(root, []);
    assert.ok(result.errors.some(({ code, file }) => code === 'E_MODEL_NOT_ALLOWED' && file === '.baton/config.yml'));
    assert.ok(result.errors.some(({ code, file }) => code === 'E_MODEL_NOT_ALLOWED' && file === unmanaged));
    config.models.enforce = 'warn';
    await writeFile(configPath, YAML.stringify(config));
    const warned = await validate(root, []);
    assert.ok(warned.warnings.some(({ code, file }) => code === 'W_MODEL_NOT_ALLOWED' && file === unmanaged));
    config.models.enforce = 'off';
    await writeFile(configPath, YAML.stringify(config));
    const off = await validate(root, []);
    assert.ok(!off.errors.some(({ code }) => code === 'E_MODEL_NOT_ALLOWED'));
    assert.ok(!off.warnings.some(({ code }) => code === 'W_MODEL_NOT_ALLOWED'));
  } finally {
    await cleanup();
  }
});

test('models apply dry-run, managed-only, byte-preserving and idempotent', async () => {
  const { root, cleanup } = await fixture();
  try {
    const dry = await applyModels(root, ['apply', '--dry-run']);
    assert.deepEqual(dry.data.changed, [agent]);
    assert.equal(await readFile(join(root, agent), 'utf8'), original);
    assert.equal(await readFile(join(root, unmanaged), 'utf8'), original);
    const first = await applyModels(root, ['apply']);
    assert.deepEqual(first.data.changed, [agent]);
    assert.equal(parseFrontmatter(await readFile(join(root, agent), 'utf8')).data.model, 'review-model');
    assert.equal((await readFile(join(root, agent), 'utf8')).split('---\n').at(-1), 'Do not change this body.\n');
    assert.equal(await readFile(join(root, unmanaged), 'utf8'), original);
    assert.equal((await applyModels(root, ['apply'])).data.changed.length, 0);
    const manifest = JSON.parse(await readFile(join(root, '.baton/manifest.json'), 'utf8'));
    assert.equal(manifest.files[0].sha256, await hashFile(join(root, agent)));
  } finally {
    await cleanup();
  }
});

test('models apply refuses to overwrite modified managed files', async () => {
  const { root, cleanup } = await fixture();
  try {
    await writeFile(join(root, agent), original.replace('Reviews tests', 'User edited this agent'));
    const result = await applyModels(root, ['apply', '--force']);
    assert.deepEqual(result.data.changed, []);
    assert.ok(result.warnings.some(({ file }) => file === agent));
    assert.equal(parseFrontmatter(await readFile(join(root, agent), 'utf8')).data.model, undefined);
  } finally {
    await cleanup();
  }
});

test('models apply uses the planning role for the managed research analyst', async () => {
  const { root, cleanup } = await fixture();
  try {
    const path = '.github/agents/repo-research-analyst.agent.md';
    await writeFile(join(root, path), original);
    const manifestPath = join(root, '.baton/manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.files.push({ path, managed: true, sha256: await hashFile(join(root, path)) });
    await writeFile(manifestPath, JSON.stringify(manifest));
    assert.deepEqual((await applyModels(root, ['apply'])).data.changed, [agent, path]);
    assert.equal(parseFrontmatter(await readFile(join(root, path), 'utf8')).data.model, 'plan-model');
  } finally {
    await cleanup();
  }
});

test('models apply is opt-in unless --force is provided', async () => {
  const { root, cleanup } = await fixture();
  try {
    const path = join(root, '.baton/config.yml');
    const config = YAML.parse(await readFile(path, 'utf8'));
    config.models.apply_to_agents = false;
    await writeFile(path, YAML.stringify(config));
    assert.deepEqual((await applyModels(root, ['apply'])).data.changed, []);
    assert.deepEqual((await applyModels(root, ['apply', '--force', '--dry-run'])).data.changed, [agent]);
  } finally {
    await cleanup();
  }
});

test('handoff write respects phase_roles and rejects disallowed next-phase model without writing', async () => {
  const { root, cleanup } = await fixture();
  try {
    const feature = '001-sample';
    const location = join(root, 'specs', feature);
    await mkdir(location, { recursive: true });
    await cp(join(sourceRoot, 'test/fixtures/handoffs/valid/feature/analyze.md'), join(location, 'handoff.md'));
    await cp(join(sourceRoot, 'test/fixtures/features/sample'), location, { recursive: true });
    const handoffPath = join(location, 'handoff.md');
    const { data, body } = parseFrontmatter(await readFile(handoffPath, 'utf8'));
    data.gate.approved_by = 'maintainer';
    data.gate.approved_at = '2026-09-24';
    await writeFile(handoffPath, serializeFrontmatter(data, body));
    const configPath = join(root, '.baton/config.yml');
    const config = YAML.parse(await readFile(configPath, 'utf8'));
    config.models.phase_roles = { review: 'fast' };
    config.models.allowed = ['plan-model', 'code-model', 'review-model'];
    config.models.enforce = 'error';
    await writeFile(configPath, YAML.stringify(config));
    await writeFile(join(root, 'input.json'), JSON.stringify({
      summary: 'Implemented', read_first: [{ path: `specs/${feature}/tasks.md`, why: 'Review scope' }],
    }));
    assert.deepEqual((await handoff(root, ['receive', '--feature', feature, '--phase', 'implement'])).errors, []);
    const before = await readFile(handoffPath, 'utf8');
    const rejected = await handoff(root, ['write', '--feature', feature, '--phase', 'implement', '--from-json', 'input.json']);
    assert.ok(rejected.errors.some(({ code }) => code === 'E_MODEL_NOT_ALLOWED'));
    assert.equal(await readFile(handoffPath, 'utf8'), before);
  } finally {
    await cleanup();
  }
});

test('handoff next renders the command, overridden role and model', async () => {
  const { root, cleanup } = await fixture();
  try {
    const location = join(root, 'specs/001-sample');
    await mkdir(location, { recursive: true });
    await cp(join(sourceRoot, 'test/fixtures/handoffs/valid/feature/analyze.md'), join(location, 'handoff.md'));
    const configPath = join(root, '.baton/config.yml');
    const config = YAML.parse(await readFile(configPath, 'utf8'));
    config.models.phase_roles.implement = 'fast';
    await writeFile(configPath, YAML.stringify(config));
    const result = await handoff(root, ['next', '--feature', '001-sample']);
    assert.deepEqual([result.data.command, result.data.role, result.data.model],
      ['/speckit-implement', 'fast', 'fast-model']);
    assert.equal(result.data.blocked, true);
    assert.match(formatResult({ command: 'handoff', ...result }), /handoff approve --by <role> before \/speckit-implement/);
  } finally {
    await cleanup();
  }
});
