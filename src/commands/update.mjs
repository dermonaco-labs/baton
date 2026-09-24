import { BatonError } from '../lib/report.mjs';

export async function run() {
  throw new BatonError('E_USAGE', 'update is outside the current MVP; no files were changed', 2);
}
