import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashBytes } from '../lib/hash.mjs';
import { BatonError } from '../lib/report.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** @param {string} root @param {string} name */
async function packageMetadata(root, name) {
  for (let directory = root; ; directory = dirname(directory)) {
    try {
      return JSON.parse(await readFile(join(directory, 'node_modules', ...name.split('/'), 'package.json'), 'utf8'));
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
      if (directory === dirname(directory)) throw new BatonError('E_LICENSE', `Missing package metadata for ${name}`);
    }
  }
}

/** @param {string} root @param {boolean} check */
export async function buildBundle(root, check = false) {
  const { build } = await import('esbuild');
  const entry = 'src/cli.mjs';
  const destination = join(root, '.baton/bin/baton.mjs');
  const output = await build({
    absWorkingDir: root,
    entryPoints: [entry],
    outfile: '.baton/bin/baton.mjs',
    bundle: true,
    minify: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
    packages: 'bundle',
    external: ['esbuild'],
    metafile: true,
    write: false,
    logLevel: 'silent',
  });
  const bundle = output.outputFiles[0].contents;
  if (bundle.byteLength >= 400 * 1024) throw new BatonError('E_BUNDLE_SIZE', `Bundle is ${bundle.byteLength} bytes (limit: 409600)`);

  /** @type {Set<string>} */
  const packages = new Set();
  for (const path of Object.keys(output.metafile.inputs)) {
    const packagePath = path.replaceAll('\\', '/').split('/node_modules/').at(-1);
    if (packagePath === path.replaceAll('\\', '/')) continue;
    if (!packagePath) continue;
    const pieces = packagePath.split('/');
    packages.add(pieces[0].startsWith('@') ? pieces.slice(0, 2).join('/') : pieces[0]);
  }
  const notices = await readFile(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8').catch((error) => {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') throw new BatonError('E_LICENSE', 'Missing THIRD_PARTY_NOTICES.md');
    throw error;
  });
  for (const name of packages) {
    const info = await packageMetadata(root, name);
    if (!['MIT', 'BSD-3-Clause', 'Apache-2.0', 'ISC'].includes(info.license) || !notices.includes(`\`${name}\``)) {
      throw new BatonError('E_LICENSE', `${name}: unsupported or missing license notice (${info.license ?? 'none'})`);
    }
  }

  const digest = `${hashBytes(bundle)}\n`;
  const metafile = JSON.stringify(output.metafile, null, 2).replaceAll('\\', '/') + '\n';
  const inventory = JSON.stringify(await Promise.all([...packages].sort().map(async (name) => ({
    package: name,
    license: (await packageMetadata(root, name)).license,
  }))), null, 2) + '\n';
  if (check) {
    let installed, hash, licenses;
    try {
      [installed, hash, licenses] = await Promise.all([readFile(destination), readFile(`${destination}.sha256`, 'utf8'), readFile(`${destination}.licenses.json`, 'utf8')]);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') throw new BatonError('E_BUNDLE_STALE', 'Committed bundle or digest is absent');
      throw error;
    }
    if (!installed.equals(bundle) || hash !== digest || licenses !== inventory) throw new BatonError('E_BUNDLE_STALE', 'Committed bundle or package license inventory differs from a fresh build');
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await Promise.all([
      writeFile(destination, bundle),
      writeFile(`${destination}.sha256`, digest),
      writeFile(`${destination}.licenses.json`, inventory),
      writeFile(`${destination}.metafile.json`, metafile),
    ]);
  }
  return { bytes: bundle.byteLength, packages: [...packages].sort() };
}

/** @param {string} root @param {string[]} args */
export async function run(root, args) {
  if (args.some((arg) => arg !== '--check')) throw new BatonError('E_USAGE', 'build accepts only --check', 2);
  const data = await buildBundle(root, args.includes('--check'));
  return { data };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await run(repository, process.argv.slice(2));
    console.log(JSON.stringify(result.data));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = error instanceof BatonError ? error.exitCode : 10;
  }
}
