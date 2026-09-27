import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const names = ['correctness-reviewer', 'testing-reviewer'];

/** @param {string} destination */
export async function makeBroken(destination) {
  for (const name of names) {
    const relative = `.github/agents/${name}.agent.md`;
    const text = await readFile(resolve(root, relative), 'utf8');
    const target = resolve(destination, relative);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text.replace(/\r?\n/g, ''));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: make-broken.mjs <destination>');
  await makeBroken(resolve(process.argv[2]));
}
