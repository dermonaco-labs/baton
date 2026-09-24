#!/usr/bin/env node
import { resolve } from 'node:path';
import { formatResult, BatonError } from './lib/report.mjs';

const version = '0.1.0';
const usage = 'baton [--cwd DIR] [--json|--github] [--quiet] <init|update|doctor|validate|status|handoff|models|adopt|uninstall|sync|lock|build|manifest> [options]';
const commands = {
  build: () => import('./commands/build.mjs'),
  manifest: () => import('./commands/manifest.mjs'),
  lock: () => import('./commands/lock.mjs'),
  sync: () => import('./commands/sync.mjs'),
  validate: () => import('./commands/validate.mjs'),
  handoff: () => import('./commands/handoff.mjs'),
  status: () => import('./commands/status.mjs'),
  adopt: () => import('./commands/adopt.mjs'),
  doctor: () => import('./commands/doctor.mjs'),
  init: () => import('./commands/init.mjs'),
  update: () => import('./commands/update.mjs'),
  models: () => import('./commands/models.mjs'),
  uninstall: () => import('./commands/uninstall.mjs'),
};

/** @param {string[]} argv */
export function parseArgs(argv) {
  const flags = { cwd: process.cwd(), json: false, github: false, quiet: false, debug: false };
  const args = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cwd') {
      if (!argv[i + 1]) throw new BatonError('E_USAGE', '--cwd needs a directory', 2);
      flags.cwd = resolve(argv[++i]);
    } else if (arg === '--json') flags.json = true;
    else if (arg === '--github') flags.github = true;
    else if (arg === '--quiet') flags.quiet = true;
    else if (arg === '--debug') flags.debug = true;
    else if (arg === '--no-color') { /* ANSI output is disabled by default. */ }
    else if (arg === '--help' || arg === '-h') args.push('--help');
    else if (arg === '--version') args.push('--version');
    else args.push(arg);
  }
  if (flags.json && flags.github) throw new BatonError('E_USAGE', '--json and --github cannot be combined', 2);
  return { flags, args };
}

/** @param {string[]} argv */
export async function main(argv) {
  let flags = { cwd: process.cwd(), json: false, github: false, quiet: false, debug: false };
  let command = '';
  try {
    ({ flags, args: argv } = parseArgs(argv));
    if (argv.includes('--version')) {
      console.log(version);
      return 0;
    }
    if (argv.includes('--help') || argv.length === 0) {
      console.log(usage);
      return argv.length ? 0 : 2;
    }
    [command, ...argv] = argv;
    if (!Object.hasOwn(commands, command)) throw new BatonError('E_USAGE', `Unknown command: ${command}`, 2);
    const module = await commands[/** @type {keyof typeof commands} */ (command)]();
    if (typeof module.run !== 'function') throw new BatonError('E_INTERNAL', `Command ${command} lacks a run handler`, 10);
    const result = await module.run(flags.cwd, argv);
    if (!result || typeof result !== 'object') throw new BatonError('E_INTERNAL', `${command} returned no result`, 10);
    console.log(formatResult({ command, ...result }, flags));
    return ('exitCode' in result ? result.exitCode : undefined) ?? ('errors' in result && result.errors?.length ? 1 : 0);
  } catch (error) {
    const known = error instanceof BatonError;
    const issue = known ? error : new BatonError('E_INTERNAL', error instanceof Error ? error.message : String(error), 10);
    const text = formatResult({ command: command || 'baton', errors: [{ code: issue.code, message: issue.message, file: issue.file }] }, flags);
    if (text) console.error(text);
    if (!known && flags.debug) console.error(error);
    return issue.exitCode;
  }
}

if (process.argv[1] && /(?:^|[\\/])(?:cli|baton)\.mjs$/.test(process.argv[1])) {
  process.exitCode = await main(process.argv.slice(2));
}
