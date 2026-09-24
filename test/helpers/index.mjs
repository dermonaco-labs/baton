import { mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

export const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** @param {string} [fixture] */
export async function tempRepo(fixture) {
  const root = await mkdtemp(join(tmpdir(), 'baton-test-'));
  if (fixture) await cp(resolve(sourceRoot, 'test/fixtures', fixture), root, { recursive: true });
  return { root, cleanup: () => rm(root, { force: true, recursive: true }) };
}

/** @param {string} root @param {string[]} args @param {Record<string,string>} [environment] */
export async function runCli(root, args, environment = {}) {
  const bin = resolve(sourceRoot, '.baton/bin/baton.mjs');
  return await new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [bin, '--cwd', root, ...args], {
      cwd: root,
      env: { ...process.env, ...environment },
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolveResult({ code, stdout, stderr }));
  });
}
