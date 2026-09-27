import { BatonError } from '../lib/report.mjs';
import { resolvePayload } from '../lib/payload.mjs';

/** @param {string} _root @param {string[]} args */
export async function run(_root, args) {
  const index = args.indexOf('--from');
  if (index >= 0 && !args[index + 1]) throw new BatonError('E_USAGE', '--from needs an archive', 2);
  const payload = await resolvePayload(index >= 0 ? args[index + 1] : undefined);
  try {
    throw new BatonError('E_USAGE', 'update is outside the current MVP; no files were changed', 2);
  } finally {
    await payload.cleanup();
  }
}
