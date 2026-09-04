import { compareDatasets, parseDataset, suggestKey } from './compare.mjs';

export function createSession() {
  let before;
  let after;
  return (message) => {
    if (message.type === 'load') {
      before = after = undefined;
      const a = parseDataset(message.before.text, message.before.format);
      const b = parseDataset(message.after.text, message.after.format);
      before = a;
      after = b;
      const metadata = (dataset) => ({
        columns: dataset.columns,
        count: dataset.rows.length,
        format: dataset.format,
      });
      return { a: metadata(a), b: metadata(b) };
    }
    if (!before || !after) throw new Error('Load two valid files first.');
    if (message.type === 'compare')
      return compareDatasets(before, after, message.options);
    if (message.type === 'suggest') return suggestKey(before, after);
    throw new Error('Unsupported comparison operation.');
  };
}
