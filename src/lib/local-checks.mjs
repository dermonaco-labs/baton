import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BatonError } from './report.mjs';

export const DEFAULT_CHECK_TIMEOUT_MS = 300000;
export const MAX_CHECK_TIMEOUT_MS = 3600000;
const execFileAsync = promisify(execFile);
const outputLimit = 1024 * 1024;
const reapWaitMs = 2000;

/** @param {{name:string,run:string,timeout_ms?:unknown}} check */
export function checkTimeout(check) {
  if (!check || typeof check.name !== 'string' || !check.name ||
      typeof check.run !== 'string' || !check.run.trim()) {
    throw new BatonError('E_CONFIG', 'Each local check requires a nonempty name and run',
      1, '.baton/config.yml');
  }
  const timeout = Object.hasOwn(check, 'timeout_ms') ? check.timeout_ms : DEFAULT_CHECK_TIMEOUT_MS;
  if (typeof timeout !== 'number' || !Number.isInteger(timeout) ||
      timeout < 1 || timeout > MAX_CHECK_TIMEOUT_MS) {
    throw new BatonError('E_CONFIG',
      `${check.name}: timeout_ms must be an integer from 1 to ${MAX_CHECK_TIMEOUT_MS}`,
      1, '.baton/config.yml');
  }
  return timeout;
}

/**
 * Live (non-zombie) members of a POSIX process group, or undefined when `ps` cannot list them.
 * @param {number} pgid @returns {Promise<number[]|undefined>}
 */
export async function liveGroupMembers(pgid) {
  try {
    const { stdout } = await execFileAsync('ps', ['-A', '-o', 'pid=,pgid=,stat='], { timeout: 10000 });
    return parseGroupMembers(stdout, pgid);
  } catch {
    return undefined;
  }
}

/** @param {string} listing `ps -o pid=,pgid=,stat=` output @param {number} pgid */
export function parseGroupMembers(listing, pgid) {
  return listing.split('\n').map(line => line.trim().split(/\s+/))
    .filter(([pid, group, stat]) => /^\d+$/.test(pid) && Number(group) === pgid && stat && !stat.startsWith('Z'))
    .map(([pid]) => Number(pid));
}

/**
 * SIGKILL a POSIX process group and wait (bounded) until it is gone. Killed orphans stay signalable as zombies
 * until init reaps them (Linux), and Darwin reports EPERM for a group whose remaining members are all zombies,
 * so EPERM counts as gone only when `ps` confirms that no live member remains.
 * @param {number} pgid
 * @param {{kill?:(pid:number,signal:string|number)=>unknown,members?:(pgid:number)=>Promise<number[]|undefined>,waitMs?:number}} [deps]
 */
export async function reapProcessGroup(pgid, deps = {}) {
  const kill = deps.kill ?? ((pid, signal) => process.kill(pid, signal));
  const members = deps.members ?? liveGroupMembers;
  const deadline = Date.now() + (deps.waitMs ?? reapWaitMs);
  /** @param {unknown} error */
  const code = error => /** @type {NodeJS.ErrnoException} */ (error).code;
  /** @type {string|number} */
  let signal = 'SIGKILL';
  for (;;) {
    /** @type {unknown} */
    let denied;
    try {
      kill(-pgid, signal);
    } catch (error) {
      if (code(error) === 'ESRCH') return;
      if (code(error) !== 'EPERM') throw error;
      denied = error;
    }
    const expired = Date.now() >= deadline;
    if (denied || expired) {
      const live = await members(pgid);
      if (live && !live.length) return;
      if (live && expired) {
        throw new Error(`process group ${pgid} still has live members after SIGKILL: ${live.join(', ')}`);
      }
      if (!live && denied) throw denied;
      if (expired) return;
    }
    signal = 0;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

/** @param {import('node:child_process').ChildProcess} child */
async function terminateTree(child) {
  if (!child.pid) throw new Error('Check process has no PID for cleanup');
  if (process.platform === 'win32') {
    // Kill the still-live shell's own tree before losing its descendant relationship.
    await execFileAsync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'],
      { windowsHide: true, timeout: 10000 });
  } else {
    await reapProcessGroup(child.pid);
  }
}

/** @param {string} root @param {{name:string,run:string,timeout_ms?:unknown}} check */
export function runLocalCheck(root, check) {
  const timeout = checkTimeout(check);
  /** @type {Promise<{met:boolean,evidence:string,stdout:string,stderr:string}>} */
  const result = new Promise((resolve, reject) => {
    const child = spawn(check.run, {
      cwd: root, shell: true, detached: process.platform !== 'win32',
      windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let bytes = 0;
    let failure = '';
    /** @type {Promise<void>} */
    let termination = Promise.resolve();
    /** @param {string} reason */
    const stop = reason => {
      if (failure) return;
      failure = reason;
      clearTimeout(timer);
      termination = terminateTree(child);
      termination.catch(error => reject(new BatonError('E_CHECK_FAILED',
        `${check.name}: ${reason}; process-tree cleanup failed: ${error.message}\nstdout (tail):\n${stdout.trim().slice(-4096)}\nstderr (tail):\n${stderr.trim().slice(-4096)}`,
        1, '.baton/config.yml')));
    };
    const timer = setTimeout(() => stop(`timeout after ${timeout}ms`), timeout);
    /** @param {Buffer} chunk @param {'stdout'|'stderr'} stream */
    const capture = (chunk, stream) => {
      bytes += chunk.length;
      if (stream === 'stdout') stdout = (stdout + chunk.toString()).slice(-outputLimit);
      else stderr = (stderr + chunk.toString()).slice(-outputLimit);
      if (bytes > outputLimit) stop(`output exceeds ${outputLimit} bytes`);
    };
    child.stdout.on('data', chunk => capture(chunk, 'stdout'));
    child.stderr.on('data', chunk => capture(chunk, 'stderr'));
    child.once('error', error => {
      clearTimeout(timer);
      reject(new BatonError('E_CHECK_FAILED', `${check.name}: cannot start check: ${error.message}`,
        1, '.baton/config.yml'));
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      termination.then(() => {
        const met = code === 0 && !failure;
        const outcome = failure || (signal ? `signal ${signal}` : String(code));
        const details = [stdout && `stdout:\n${stdout.trim().slice(-4096)}`,
          stderr && `stderr:\n${stderr.trim().slice(-4096)}`].filter(Boolean).join('\n');
        resolve({ met, evidence: met ? `${check.name}: 0` :
          `${check.name}: ${outcome}${details ? `\n${details}` : ''}`, stdout, stderr });
      }, reject);
    });
  });
  return result;
}
