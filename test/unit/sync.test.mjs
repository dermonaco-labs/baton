import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generatedStable } from '../../src/commands/sync.mjs';

test('generated registry preserves verified bytes when only installation time changes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-registry-'));
  try {
    const path = '.specify/extensions/.registry';
    const target = join(root, path);
    await mkdir(join(root, '.specify/extensions'), { recursive: true });
    const original = Buffer.from(JSON.stringify({
      schema_version: '1.0', extensions: { baton: { enabled: true, installed_at: '2026-09-24T00:00:00Z' } },
    }, null, 2));
    await writeFile(target, original);
    const generated = Buffer.from(JSON.stringify({
      schema_version: '1.0', extensions: { baton: { enabled: true, installed_at: '2026-09-24T00:00:01Z' } },
    }, null, 2));
    assert.deepEqual(generatedStable(generated, path, root), await readFile(target));

    const workflow = '.specify/workflows/workflow-registry.json';
    const workflowPath = join(root, workflow);
    await mkdir(join(root, '.specify/workflows'), { recursive: true });
    const oldWorkflow = Buffer.from(JSON.stringify({
      workflows: { speckit: { installed_at: '2026-09-24T00:00:00Z', updated_at: '2026-09-24T00:00:01Z' } },
    }, null, 2));
    await writeFile(workflowPath, oldWorkflow);
    const newWorkflow = Buffer.from(JSON.stringify({
      workflows: { speckit: { installed_at: '2026-09-24T00:00:02Z', updated_at: '2026-09-24T00:00:03Z' } },
    }, null, 2));
    assert.deepEqual(generatedStable(newWorkflow, workflow, root), oldWorkflow);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('generated Spec Kit manifest preserves locked bytes when file keys are reordered', async () => {
  const root = await mkdtemp(join(tmpdir(), 'baton-manifest-'));
  try {
    const path = '.specify/integrations/speckit.manifest.json';
    const target = join(root, path);
    await mkdir(join(root, '.specify/integrations'), { recursive: true });
    const original = Buffer.from(JSON.stringify({
      integration: 'speckit',
      installed_at: '2026-09-24T00:00:00Z',
      files: { 'scripts/b.sh': 'hash-b', 'scripts/a.sh': 'hash-a' },
    }, null, 2));
    await writeFile(target, original);
    const generated = Buffer.from(JSON.stringify({
      integration: 'speckit',
      installed_at: '2026-09-27T00:00:00Z',
      files: { 'scripts/a.sh': 'hash-a', 'scripts/b.sh': 'hash-b' },
    }, null, 2));
    assert.deepEqual(generatedStable(generated, path, root), original);

    const changed = Buffer.from(JSON.stringify({
      integration: 'speckit',
      installed_at: '2026-09-27T00:00:00Z',
      files: { 'scripts/a.sh': 'changed-hash', 'scripts/b.sh': 'hash-b' },
    }, null, 2));
    assert.notDeepEqual(generatedStable(changed, path, root), original);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
