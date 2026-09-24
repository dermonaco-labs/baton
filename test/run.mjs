import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const files = ['unit', 'integration'].flatMap((suite) =>
  readdirSync(join(root, suite)).filter((name) => name.endsWith('.test.mjs'))
    .sort().map((name) => join(root, suite, name)));
if (files.length === 0) throw new Error('No test files found');

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=2', ...files],
  { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
