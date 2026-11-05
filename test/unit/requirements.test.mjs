import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { delimiter, join, parse, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { SPECKIT_REQUIREMENTS, recordsMachineLocalPath, regenerateRequirements, sha256 } from '../../src/lib/upstream.mjs';

test('machine-local path detection is anchored at the root and its separator on every platform', () => {
  const header = `#    uv pip compile --generate-hashes --python-version 3.11 ${SPECKIT_REQUIREMENTS.input} ` +
    `-o ${SPECKIT_REQUIREMENTS.output}\nspecify-cli==1.3.0 \\\n`;
  const filesystemRoot = parse(resolve(tmpdir())).root;
  for (const root of [filesystemRoot, resolve(filesystemRoot, 'spec'), resolve(tmpdir(), 'repo')]) {
    assert.equal(recordsMachineLocalPath(header, root), false, `root-relative header is not machine-local for ${root}`);
  }
  const project = resolve(filesystemRoot, 'spec');
  const native = `# ${project}${sep}baton\n`;
  assert.equal(recordsMachineLocalPath(native, project), true);
  assert.equal(recordsMachineLocalPath(native.replaceAll('\\', '/'), project), true, 'forward-slash variant');
  assert.equal(recordsMachineLocalPath(`# ${project}ify-cli\n`, project), false, 'a sibling prefix is not inside');
  const rooted = join(filesystemRoot, ...SPECKIT_REQUIREMENTS.input.split('/'));
  assert.equal(recordsMachineLocalPath(`# ${rooted}\n`, filesystemRoot), true);
  assert.equal(recordsMachineLocalPath(`# ${rooted.replaceAll('\\', '/')}\n`, filesystemRoot), true);
  assert.equal(recordsMachineLocalPath(`# ${filesystemRoot}usr${sep}bin\n`, filesystemRoot), false);
});

test('regenerateRequirements runs uv from the root with root-relative paths and refuses machine-local output',
  { skip: process.platform === 'win32' ? 'needs an executable fake uv' : false }, async () => {
    const base = await realpath(await mkdtemp(join(tmpdir(), 'baton-requirements-')));
    const root = join(base, 'root');
    const bin = join(base, 'bin');
    const record = join(base, 'argv.txt');
    const input = join(root, ...SPECKIT_REQUIREMENTS.input.split('/'));
    const output = join(root, ...SPECKIT_REQUIREMENTS.output.split('/'));
    const path = process.env.PATH;
    /** @param {string} body */
    const fakeUv = async body => {
      await writeFile(join(bin, 'uv'), `#!/bin/sh\nprintf "%s|%s\\n" "$PWD" "$*" > "${record}"\n${body}\n`);
      await chmod(join(bin, 'uv'), 0o755);
    };
    try {
      await mkdir(join(root, 'baton', 'upstream'), { recursive: true });
      await mkdir(bin);
      await writeFile(input, 'specify-cli==1.0.0\n');
      await writeFile(output, 'previous lock\n');
      process.env.PATH = `${bin}${delimiter}${path}`;

      const compiled = 'specify-cli==1.3.0 \\\n    --hash=sha256:00\n';
      await fakeUv(`cat > "$8" <<'EOF'\n${compiled}EOF`);
      assert.equal(regenerateRequirements(root, '1.3.0'), sha256(Buffer.from(compiled)));
      const [cwd, args] = (await readFile(record, 'utf8')).trim().split('|');
      assert.equal(cwd, root);
      assert.equal(args, `pip compile --generate-hashes --python-version 3.11 ${SPECKIT_REQUIREMENTS.input} ` +
        `-o ${SPECKIT_REQUIREMENTS.output}`);
      assert.equal(await readFile(input, 'utf8'), 'specify-cli==1.3.0\n');
      assert.equal(await readFile(output, 'utf8'), compiled);

      await writeFile(input, 'specify-cli==1.0.0\n');
      await writeFile(output, 'previous lock\n');
      await fakeUv(`cat > "$8" <<EOF\n${compiled.replace('\\', '\\\\')}# from $PWD/baton\nEOF`);
      assert.throws(() => regenerateRequirements(root, '1.3.0'),
        { code: 'E_UPSTREAM_VERIFY', message: /machine-local path/ });
      assert.equal(await readFile(input, 'utf8'), 'specify-cli==1.0.0\n', 'input is restored on failure');
      assert.equal(await readFile(output, 'utf8'), 'previous lock\n', 'output is restored on failure');
    } finally {
      process.env.PATH = path;
      await rm(base, { recursive: true, force: true });
    }
  });
