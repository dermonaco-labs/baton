import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import AjvModule from 'ajv/dist/2020.js';
import FormatsModule from 'ajv-formats';
const Ajv2020 = AjvModule.default;
const addFormats = FormatsModule.default;

/** @type {Map<string, Map<string, import('ajv').ValidateFunction>>} */
const cache = new Map();

/** @param {string} root */
export async function loadSchemas(root) {
  const cached = cache.get(root);
  if (cached) return cached;
  let directory = join(root, '.baton/schemas');
  let names;
  try {
    names = await readdir(directory);
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
    directory = join(root, 'baton/schemas');
    names = await readdir(directory);
  }
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: true });
  addFormats(ajv);
  const registry = new Map();
  for (const name of names.filter((entry) => entry.endsWith('.schema.json')).sort()) {
    const schema = JSON.parse(await readFile(join(directory, name), 'utf8'));
    registry.set(name.slice(0, -'.schema.json'.length), ajv.compile(schema));
  }
  cache.set(root, registry);
  return registry;
}

/** @param {Map<string, import('ajv').ValidateFunction>} registry @param {string} name @param {unknown} value */
export function validateSchema(registry, name, value) {
  const validator = registry.get(name);
  if (!validator) throw new Error(`No schema registered for ${name}`);
  if (validator(value)) return [];
  return (validator.errors ?? []).map((error) => ({
    code: 'E_SCHEMA',
    pointer: error.keyword === 'required'
      ? `${error.instancePath}/${error.params.missingProperty}`
      : error.instancePath || '/',
    message: `${name}: ${error.message ?? 'invalid value'}`,
    fix: `Correct the ${name} data at ${error.instancePath || '/'}`,
  }));
}
