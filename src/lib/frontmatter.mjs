import YAML from 'yaml';

/** @param {string} source */
export function parseFrontmatter(source) {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(source);
  if (!match) throw new Error('E_FRONTMATTER_MALFORMED: expected YAML delimiters at byte 0');
  let data;
  try {
    data = YAML.parse(match[1], { uniqueKeys: true, version: '1.2' });
  } catch (error) {
    throw new Error(`E_FRONTMATTER_MALFORMED: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('E_FRONTMATTER_MALFORMED: frontmatter must be a mapping');
  }
  return { data, body: source.slice(match[0].length) };
}

/** @param {Record<string, unknown>} data @param {string} body */
export function serializeFrontmatter(data, body) {
  return `---\n${YAML.stringify(data, { lineWidth: 0 })}---\n${body}`;
}
