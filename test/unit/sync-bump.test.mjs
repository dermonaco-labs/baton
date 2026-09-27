import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBumpSummary } from '../../src/commands/sync.mjs';
import { run } from '../../src/commands/sync.mjs';

test('sync bump explains pin and file changes for a PR body', () => {
  const before = {
    upstreams: { speckit: { version: '1.0.11', commit: 'a'.repeat(40) },
      atv: { ref: 'main', commit: 'b'.repeat(40) } },
    files: [{ stored_at: 'a.md', sha256: '1'.repeat(64) },
      { stored_at: 'removed.md', sha256: '2'.repeat(64) }]
  };
  const after = {
    upstreams: { speckit: { version: '1.0.12', commit: 'c'.repeat(40) },
      atv: { ref: 'main', commit: 'b'.repeat(40) } },
    files: [{ stored_at: 'a.md', sha256: '3'.repeat(64) },
      { stored_at: 'added.md', sha256: '4'.repeat(64) }]
  };
  const summary = formatBumpSummary(before, after);
  assert.match(summary, /Spec Kit.*1\.0\.11.*1\.0\.12/);
  assert.match(summary, /Changed \(1\).*a\.md/s);
  assert.match(summary, /Added \(1\).*added\.md/s);
  assert.match(summary, /Removed \(1\).*removed\.md/s);
  assert.match(summary, /baton sync --bump speckit=1\.0\.12/);
});

test('sync rejects unpinned bump values and check/bump combination', () => {
  assert.equal(run(process.cwd(), ['--bump', 'atv=main']).exitCode, 2);
  assert.equal(run(process.cwd(), ['--bump', 'speckit=latest']).exitCode, 2);
  assert.equal(run(process.cwd(), ['--check', '--bump', 'speckit=1.0.12']).exitCode, 2);
});
