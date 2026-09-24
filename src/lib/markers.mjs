/** @param {string} name */
function delimiters(name) {
  if (!/^[A-Z][A-Z0-9_-]*$/.test(name)) throw new Error('Invalid marker name');
  return [`<!-- ${name}:START -->`, `<!-- ${name}:END -->`];
}

/** @param {string} text @param {string} name */
function locate(text, name) {
  const [start, end] = delimiters(name);
  const left = text.indexOf(start);
  const right = text.indexOf(end);
  if ((left < 0) !== (right < 0) || (left >= 0 && (right < left || text.indexOf(start, left + start.length) >= 0 || text.indexOf(end, right + end.length) >= 0))) {
    throw new Error(`Unbalanced ${name} marker`);
  }
  return { start, end, left, right };
}

/** @param {string} text @param {string} name @param {string} content */
export function mergeMarker(text, name, content) {
  const { start, end, left, right } = locate(text, name);
  const section = `${start}\n${content.replace(/\n?$/, '\n')}${end}\n`;
  if (left < 0) return `${text}${text && !text.endsWith('\n') ? '\n' : ''}${section}`;
  const sectionEnd = right + end.length + (text[right + end.length] === '\n' ? 1 : 0);
  return text.slice(0, left) + section + text.slice(sectionEnd);
}

/** @param {string} text @param {string} name */
export function removeMarker(text, name) {
  const { end, left, right } = locate(text, name);
  if (left < 0) return text;
  return text.slice(0, left) + text.slice(right + end.length + (text[right + end.length] === '\n' ? 1 : 0));
}
