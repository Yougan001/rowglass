import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDataset as parse,
  compareDatasets as compare,
  suggestKey,
  reportCsv,
  displayValue,
} from '../core/compare.mjs';

test('CSV parses quoted commas, escaped quotes, embedded newlines and CRLF', () => {
  const d = parse(
    '\uFEFFid,name,note\r\n1,"Ada, L","says ""hi""\nthen leaves"\r\n',
  );
  assert.deepEqual(d.rows, [
    { id: '1', name: 'Ada, L', note: 'says "hi"\nthen leaves' },
  ]);
});
test('tab and semicolon delimiters are detected outside quotes', () => {
  assert.equal(parse('id\tname\n1\tJane').format, 'TSV');
  assert.deepEqual(parse('id;name\n1;"Jane, A"').rows[0], {
    id: '1',
    name: 'Jane, A',
  });
});
test('blank physical lines do not erase deliberately empty CSV records', () => {
  assert.equal(parse('a,b\n\n,\n"",""\n').rows.length, 2);
});
for (const [input, message] of [
  ['a,a\n1,2', /Duplicate/],
  ['a,\n1,2', /header/],
  ['a,b\n1', /Row 2/],
  ['a\n"hi', /Unclosed/],
  ['a\nhe"llo', /Unexpected quote/],
  ['a\n"hi"oops', /closing quote/],
  ['', /header/],
]) {
  test(`invalid CSV is rejected: ${message}`, () =>
    assert.throws(() => parse(input), message));
}
test('JSON requires object records, preserves types and schema union', () => {
  const d = parse('[{"id":1,"a":null},{"id":2,"b":false}]');
  assert.deepEqual(d.columns, ['id', 'a', 'b']);
  assert.equal(d.rows[1].b, false);
  for (const s of ['{}', '[1]', '[null]', '[[1]]', '['])
    assert.throws(() => parse(s), /JSON/);
});
test('reordered rows and columns match by key', () => {
  const r = compare(parse('id,name\n1,A\n2,B'), parse('name,id\nB,2\nA,1'), {
    keys: ['id'],
  });
  assert.equal(r.summary.unchanged, 2);
});
test('addition, removal and cell changes are distinguished', () => {
  const r = compare(
    parse('id,name\n1,A\n2,B\n3,C'),
    parse('id,name\n1,X\n3,C\n4,D'),
    { keys: ['id'] },
  );
  assert.deepEqual(r.summary, {
    added: 1,
    removed: 1,
    modified: 1,
    unchanged: 1,
    changedCells: 1,
  });
});
test('CSV and JSON can compare across formats without losing leading-zero IDs', () => {
  const r = compare(
    parse('id,count\n1,20\n001,30'),
    parse('[{"id":1,"count":20},{"id":"001","count":31}]'),
    { keys: ['id'] },
  );
  assert.equal(r.summary.unchanged, 1);
  assert.equal(r.summary.modified, 1);
});
test('duplicate keys fail before producing an ambiguous report', () => {
  assert.throws(
    () =>
      compare(parse('id,x\n1,A\n1,B'), parse('id,x\n1,C'), { keys: ['id'] }),
    /duplicate key.*rows 1 and 2/,
  );
});
test('composite keys do not collide even when values contain separators', () => {
  const d = parse('a,b,v\na / b,c,1\na,b / c,2');
  assert.equal(compare(d, d, { keys: ['a', 'b'] }).summary.unchanged, 2);
});
test('missing, empty and null keys are refused', () => {
  for (const s of [
    '[{"id":null}]',
    '[{"id":""}]',
    '[{"id":[]}]',
    '[{"id":1},{}]',
  ]) {
    const d = parse(s);
    assert.throws(() => compare(d, d, { keys: ['id'] }), /key/);
  }
});
test('nested object order is ignored but array order matters', () => {
  const a = parse('[{"id":1,"v":{"a":1,"b":2},"x":[1,2]}]');
  const b = parse('[{"id":1,"v":{"b":2,"a":1},"x":[2,1]}]');
  assert.deepEqual(compare(a, b, { keys: ['id'] }).rows[0].changes, ['x']);
});
test('null, missing and empty string remain different', () => {
  const a = parse('[{"id":1,"a":null,"b":""}]'),
    b = parse('[{"id":1,"b":null}]');
  assert.deepEqual(compare(a, b, { keys: ['id'] }).rows[0].changes, ['a', 'b']);
});
test('normalization and ignore columns apply only when selected', () => {
  const a = parse('id,name,stamp\n1,ADA ,old'),
    b = parse('id,name,stamp\n1,ada,new');
  assert.equal(compare(a, b, { keys: ['id'] }).summary.modified, 1);
  assert.equal(
    compare(a, b, {
      keys: ['id'],
      trimWhitespace: true,
      ignoreCase: true,
      ignoreColumns: ['stamp'],
    }).summary.unchanged,
    1,
  );
  assert.throws(
    () => compare(a, b, { keys: ['id'], ignoreColumns: ['id'] }),
    /ignored/,
  );
});
test('numeric tolerance is finite, opt-in, and does not normalize ID-like zero prefixes', () => {
  const a = parse('id,v\n1,10.00\n2,001'),
    b = parse('id,v\n1,10.01\n2,1');
  assert.equal(
    compare(a, b, { keys: ['id'], tolerance: 0.02 }).summary.modified,
    1,
  );
  assert.equal(compare(a, b, { keys: ['id'] }).summary.modified, 2);
  for (const tolerance of [-1, Infinity, 'NaN'])
    assert.throws(
      () => compare(a, b, { keys: ['id'], tolerance }),
      /tolerance/,
    );
});
test('strict JSON types can be requested', () => {
  const a = parse('[{"id":1,"v":1}]'),
    b = parse('[{"id":1,"v":"1"}]');
  assert.equal(
    compare(a, b, { keys: ['id'], strictTypes: true }).summary.modified,
    1,
  );
});
test('schema changes remain visible for header-only exports', () => {
  const r = compare(parse('id,a'), parse('id,b'), { keys: ['id'] });
  assert.deepEqual(r.schema, { added: ['b'], removed: ['a'] });
});
test('prototype-shaped columns and keys are ordinary data', () => {
  const d = parse('id,__proto__,constructor\n__proto__,x,y');
  assert.equal(compare(d, d, { keys: ['id'] }).summary.unchanged, 1);
  assert.equal({}.x, undefined);
});
test('key suggestion validates uniqueness in both files', () => {
  const a = parse('id,sku\n1,A\n1,B'),
    b = parse('id,sku\n1,A\n1,B');
  assert.equal(suggestKey(a, b), 'sku');
  assert.equal(suggestKey(parse('id\n1\n1'), parse('id\n1')), '');
});
test('CSV report escapes quotes and neutralizes formulas', () => {
  const r = compare(parse('id,name\n1,A'), parse('id,name\n1,=1+1'), {
    keys: ['id'],
  });
  const csv = reportCsv(r);
  assert.match(csv, /'=1\+1/);
  assert.equal(parse(csv).rows[0].column, 'name');
});
test('input and column limits protect interactive clients', () => {
  assert.throws(() => parse('x'.repeat(5_000_001)), /large/);
  assert.throws(
    () => parse(Array.from({ length: 201 }, (_, i) => `c${i}`).join(',')),
    /columns/,
  );
});
test('display distinguishes missing from null and preserves deterministic nested values', () => {
  assert.equal(displayValue(undefined), '(missing)');
  assert.equal(displayValue(null), 'null');
  assert.equal(displayValue({ b: 1, a: 2 }), '{"a":2,"b":1}');
});
test('50,000 records compare correctly, and one more record is rejected', () => {
  const text =
    'id,value\n' +
    Array.from({ length: 50_000 }, (_, i) => `${i},before`).join('\n');
  const a = parse(text),
    b = parse(text.replace('49999,before', '49999,after'));
  const result = compare(a, b, { keys: ['id'] });
  assert.equal(result.summary.unchanged, 49_999);
  assert.equal(result.summary.modified, 1);
  assert.throws(() => parse(text + '\n50000,extra'), /Too many rows/);
});
