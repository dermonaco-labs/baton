export class BatonError extends Error {
  /** @param {string} code @param {string} message @param {number} [exitCode] @param {string} [file] */
  constructor(code, message, exitCode = 1, file = '') {
    super(message);
    this.name = 'BatonError';
    this.code = code;
    this.exitCode = exitCode;
    this.file = file;
  }
}

/** @param {{code:string,message:string,file?:string,pointer?:string,fix?:string}} issue */
function annotation(issue) {
  /** @param {string} value */
  const escape = (value) => value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  return `::error file=${escape(issue.file ?? '')},title=${escape(issue.code)}::${escape(issue.message)}`;
}

/** @param {{command:string,errors?:Array<{code:string,message:string,file?:string,pointer?:string,fix?:string}>,warnings?:Array<{code:string,message:string,file?:string}>,data?:unknown}} result @param {{json?:boolean,github?:boolean,quiet?:boolean}} flags */
export function formatResult(result, flags = {}) {
  const errors = result.errors ?? [];
  const warnings = result.warnings ?? [];
  const output = { ok: errors.length === 0, command: result.command, version: '0.1.0', errors, warnings, data: result.data ?? null };
  if (flags.json) return JSON.stringify(output);
  if (flags.github) return errors.map(annotation).join('\n');
  if (flags.quiet) return '';
  const lines = [...errors, ...warnings].map((issue) => `${issue.code} ${issue.file ?? ''}${'pointer' in issue && issue.pointer ? ':' + issue.pointer : ''} ${issue.message}${'fix' in issue && issue.fix ? ` -> ${issue.fix}` : ''}`.trim());
  if (result.command === 'status' && Array.isArray(result.data)) {
    const headings = ['FEATURE', 'LANE', 'PHASE', 'NEXT', 'OWNER', 'STATUS', 'GATE', 'STALE'];
    const rows = result.data.map((item) => headings.map((key) => {
      const value = item[key.toLowerCase()];
      return key === 'STALE' ? value ? 'yes' : 'no' : String(value ?? '-');
    }));
    const widths = headings.map((name, index) => Math.max(name.length, ...rows.map((row) => row[index].length)));
    return [headings, ...rows].map((row) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ').trimEnd()).join('\n');
  }
  if (lines.length === 0) lines.push(`${result.command}: OK`);
  return lines.join('\n');
}
