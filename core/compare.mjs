import { parseDecimal, withinTolerance } from './decimal.mjs';

/** Pure, dependency-free comparison engine shared by the browser and CLI. */
export const LIMITS = Object.freeze({
  characters: 5_000_000,
  rows: 50_000,
  columns: 200,
});

function fail(message) {
  throw new Error(message);
}
function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (object(value))
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(value[k])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export function displayValue(value) {
  if (value === undefined) return '(missing)';
  if (value === null) return 'null';
  return typeof value === 'object' ? stable(value) : String(value);
}

function inferDelimiter(text) {
  let quoted = false;
  const counts = new Map([
    [',', 0],
    ['\t', 0],
    [';', 0],
  ]);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && (c === '\n' || c === '\r')) break;
    else if (!quoted && counts.has(c)) counts.set(c, counts.get(c) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}

export function parseDelimited(text, delimiter = inferDelimiter(text)) {
  if (![',', '\t', ';'].includes(delimiter))
    fail('Choose comma, tab, or semicolon as the delimiter.');
  const matrix = [];
  let row = [],
    cell = '',
    quoted = false,
    closed = false,
    touched = false;
  const field = () => {
    row.push(cell);
    cell = '';
    closed = false;
    if (row.length > LIMITS.columns) fail('Too many columns (maximum 200).');
  };
  const record = () => {
    field();
    if (touched || row.length > 1 || row[0] !== '') matrix.push(row);
    row = [];
    touched = false;
    if (matrix.length > LIMITS.rows + 1)
      fail('Too many rows (maximum 50,000).');
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === delimiter) {
      touched = true;
      field();
    } else if (c === '\n' || c === '\r') {
      record();
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else if (closed)
      fail(`Unexpected character after closing quote near character ${i + 1}.`);
    else if (c === '"') {
      if (cell !== '') fail(`Unexpected quote near character ${i + 1}.`);
      quoted = true;
      touched = true;
    } else {
      cell += c;
      touched = true;
    }
  }
  if (quoted) fail('Unclosed quoted field. Check the CSV file.');
  if (touched || row.length || cell || closed) record();
  if (!matrix.length) fail('Add a header row and some data to begin.');
  const columns = matrix.shift().map((c) => c.trim());
  if (columns.some((c) => !c)) fail('Every column needs a non-empty header.');
  if (new Set(columns).size !== columns.length)
    fail('Duplicate column headers are ambiguous. Rename them first.');
  const rows = matrix.map((values, i) => {
    if (values.length !== columns.length)
      fail(
        `Row ${i + 2} has ${values.length} fields; expected ${columns.length}.`,
      );
    return Object.fromEntries(columns.map((c, j) => [c, values[j]]));
  });
  return { columns, rows, format: delimiter === '\t' ? 'TSV' : 'CSV' };
}

export function parseDataset(input, format = 'auto') {
  if (typeof input !== 'string') fail('Input must be text.');
  if (input.length > LIMITS.characters)
    fail('File is too large (maximum 5 million characters).');
  const text = input.replace(/^\uFEFF/, '');
  const kind =
    format === 'auto' ? (/^\s*[[{]/.test(text) ? 'json' : 'csv') : format;
  if (kind !== 'json')
    return parseDelimited(
      text,
      kind === 'tsv' ? '\t' : kind === 'semicolon' ? ';' : undefined,
    );
  let rows;
  try {
    rows = JSON.parse(text);
  } catch {
    fail(
      'Invalid JSON. Use an array of objects, such as [{"id": "1", "name": "Ada"}].',
    );
  }
  if (!Array.isArray(rows) || rows.some((r) => !object(r)))
    fail(
      'JSON must be an array of objects. Nested values are compared as a whole cell.',
    );
  if (rows.length > LIMITS.rows) fail('Too many rows (maximum 50,000).');
  const pending = rows.map((value) => ({ value, depth: 0 }));
  while (pending.length) {
    const { value, depth } = pending.pop();
    if (depth > 30)
      fail('JSON nesting exceeds 30 levels. Simplify deeply nested values.');
    if (
      typeof value === 'number' &&
      (!Number.isFinite(value) ||
        (Number.isInteger(value) && !Number.isSafeInteger(value)))
    )
      fail(
        'JSON contains an unsafe number. Encode large numeric IDs as strings to preserve them exactly.',
      );
    if (value && typeof value === 'object')
      for (const child of Object.values(value))
        pending.push({ value: child, depth: depth + 1 });
  }
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  if (columns.length > LIMITS.columns) fail('Too many columns (maximum 200).');
  return { columns, rows, format: 'JSON' };
}

function indexRows(dataset, keys, side) {
  const map = new Map();
  dataset.rows.forEach((row, i) => {
    const parts = keys.map((k) => {
      const v = Object.hasOwn(row, k) ? row[k] : undefined;
      if (v === undefined || v === null || v === '' || typeof v === 'object')
        fail(
          `${side} row ${i + 1}: key "${k}" must have a non-empty, simple value.`,
        );
      return String(v);
    });
    const key = JSON.stringify(parts);
    if (map.has(key))
      fail(
        `${side}: duplicate key ${parts.join(' / ')} at rows ${map.get(key).index + 1} and ${i + 1}. Choose a unique key or combine columns.`,
      );
    map.set(key, { data: row, index: i, label: parts.join(' / ') });
  });
  return map;
}

export function suggestKey(before, after) {
  const common = before.columns.filter((c) => after.columns.includes(c));
  common.sort(
    (a, b) =>
      Number(/(^id$|_id$|^sku$|^key$|^email$)/i.test(b)) -
      Number(/(^id$|_id$|^sku$|^key$|^email$)/i.test(a)),
  );
  for (const c of common) {
    try {
      indexRows(before, [c], 'Original');
      indexRows(after, [c], 'Updated');
      return c;
    } catch {
      /* Try another genuinely unique column. */
    }
  }
  return '';
}

function equivalent(a, b, options) {
  if (a === undefined || b === undefined || a === null || b === null)
    return a === b;
  if (typeof a === 'object' || typeof b === 'object')
    return stable(a) === stable(b);
  if (options.strictTypes && typeof a !== typeof b) return false;
  let x = String(a),
    y = String(b);
  if (options.trimWhitespace) {
    x = x.trim();
    y = y.trim();
  }
  if (options.ignoreCase) {
    x = x.toLowerCase();
    y = y.toLowerCase();
  }
  if (x === y) return true;
  return (
    options.tolerance > 0 && withinTolerance(x, y, options.decimalTolerance)
  );
}

export function compareDatasets(before, after, options = {}) {
  const keys = options.keys ?? [];
  if (!Array.isArray(keys) || !keys.length)
    fail('Choose at least one key column to match records.');
  if (
    keys.some((k) => !before.columns.includes(k) || !after.columns.includes(k))
  )
    fail('Key columns must exist in both files.');
  const tolerance = Number(options.tolerance ?? 0);
  if (!Number.isFinite(tolerance) || tolerance < 0)
    fail(
      'Numeric tolerance must be a finite number greater than or equal to zero.',
    );
  const ignored = new Set(options.ignoreColumns ?? []);
  if (keys.some((k) => ignored.has(k)))
    fail('A key column cannot also be ignored.');
  const columns = [...new Set([...before.columns, ...after.columns])].filter(
    (c) => !ignored.has(c),
  );
  const left = indexRows(before, keys, 'Original'),
    right = indexRows(after, keys, 'Updated');
  const rows = [];
  const summary = {
    added: 0,
    removed: 0,
    modified: 0,
    unchanged: 0,
    changedCells: 0,
  };
  const comparisonOptions = {
    ...options,
    tolerance,
    decimalTolerance: tolerance > 0 ? parseDecimal(String(tolerance)) : null,
  };
  for (const key of new Set([...left.keys(), ...right.keys()])) {
    const a = left.get(key),
      b = right.get(key);
    const changes = columns.filter(
      (c) =>
        !equivalent(
          a && Object.hasOwn(a.data, c) ? a.data[c] : undefined,
          b && Object.hasOwn(b.data, c) ? b.data[c] : undefined,
          comparisonOptions,
        ),
    );
    const status = !a
      ? 'added'
      : !b
        ? 'removed'
        : changes.length
          ? 'modified'
          : 'unchanged';
    summary[status]++;
    if (status === 'modified') summary.changedCells += changes.length;
    rows.push({
      key,
      label: (a ?? b).label,
      status,
      before: a?.data ?? null,
      after: b?.data ?? null,
      changes,
    });
  }
  const schema = {
    added: after.columns.filter(
      (c) => !before.columns.includes(c) && !ignored.has(c),
    ),
    removed: before.columns.filter(
      (c) => !after.columns.includes(c) && !ignored.has(c),
    ),
  };
  return {
    version: 1,
    keys,
    columns,
    schema,
    summary,
    options: {
      trimWhitespace: !!options.trimWhitespace,
      ignoreCase: !!options.ignoreCase,
      strictTypes: !!options.strictTypes,
      tolerance,
      ignoreColumns: [...ignored],
    },
    rows,
  };
}

export function reportCsv(result) {
  // Quoting alone does not prevent spreadsheet formula execution.
  const quote = (value) => {
    const raw = String(value ?? '');
    const safe = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const lines = [['status', 'key', 'column', 'before', 'after']];
  for (const row of result.rows) {
    if (row.status === 'unchanged') continue;
    for (const col of row.changes)
      lines.push([
        row.status,
        row.label,
        col,
        displayValue(
          row.before && Object.hasOwn(row.before, col)
            ? row.before[col]
            : undefined,
        ),
        displayValue(
          row.after && Object.hasOwn(row.after, col)
            ? row.after[col]
            : undefined,
        ),
      ]);
  }
  return '\uFEFF' + lines.map((r) => r.map(quote).join(',')).join('\r\n');
}
