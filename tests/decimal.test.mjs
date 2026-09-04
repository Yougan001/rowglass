import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDecimal, withinTolerance } from '../core/decimal.mjs';
import { parseDataset, compareDatasets } from '../core/compare.mjs';

const within = (a, b, tolerance) =>
  withinTolerance(a, b, parseDecimal(tolerance));

test('decimal subtraction keeps boundary values exact', () => {
  assert.equal(within('0.1', '0.3', '0.2'), true);
  assert.equal(within('10.00', '10.01', '0.01'), true);
  assert.equal(within('-0.1', '0.1', '0.2'), true);
  assert.equal(within('0.1', '0.3000000000000000001', '0.2'), false);
});

test('large integers and long fractions do not collapse to the same number', () => {
  assert.equal(within('9007199254740992', '9007199254740993', '0.1'), false);
  assert.equal(within('9007199254740992', '9007199254740993', '1'), true);
  assert.equal(within('0.1000000000000000000000001', '0.1', '1e-26'), false);
  assert.equal(within('0.1000000000000000000000001', '0.1', '1e-25'), true);
});

test('decimal comparison handles scientific notation, signs and zero', () => {
  assert.equal(within('1E3', '1000.001', '1e-3'), true);
  assert.equal(within('-12e-2', '-0.13', '0.01'), true);
  assert.equal(within('-0', '0.0', '0.001'), true);
  assert.equal(within('1e-400', '0', '1e-300'), true);
});

test('non-numeric, leading-zero and excessive inputs stay text', () => {
  for (const text of [
    '001',
    ' 1',
    '1 ',
    '+1',
    '.1',
    '1.',
    'Infinity',
    'NaN',
    '1,000',
    '0x10',
    '1e1000000000',
    '1e-1025',
    '9'.repeat(1025),
  ]) {
    assert.equal(parseDecimal(text), null, text.slice(0, 40));
  }
  assert.equal(within('001', '1', '1'), false);
});

test('CSV and JSON strings preserve large values when tolerance is enabled', () => {
  const before = parseDataset('id,amount\n1,9007199254740992');
  for (const after of [
    parseDataset('id,amount\n1,9007199254740993'),
    parseDataset('[{"id":"1","amount":"9007199254740993"}]'),
  ]) {
    const report = compareDatasets(before, after, {
      keys: ['id'],
      tolerance: 0.1,
    });
    assert.equal(report.summary.modified, 1);
    assert.deepEqual(report.rows[0].changes, ['amount']);
    assert.doesNotThrow(() => JSON.stringify(report));
  }
});

test('tolerance never changes exact key matching or strict type checks', () => {
  const a = parseDataset('[{"id":"9007199254740992","amount":1}]');
  const b = parseDataset('[{"id":"9007199254740993","amount":"1"}]');
  const report = compareDatasets(a, b, { keys: ['id'], tolerance: 100 });
  assert.equal(report.summary.added, 1);
  assert.equal(report.summary.removed, 1);
  assert.equal(
    compareDatasets(
      a,
      parseDataset('[{"id":"9007199254740992","amount":"1"}]'),
      {
        keys: ['id'],
        tolerance: 0.1,
        strictTypes: true,
      },
    ).summary.modified,
    1,
  );
});

test('bounded decimal differences agree with an integer-cent oracle', () => {
  for (let cents = -100; cents <= 100; cents++) {
    for (const delta of [-11, -10, 0, 10, 11]) {
      assert.equal(
        within(
          (cents / 100).toFixed(2),
          ((cents + delta) / 100).toFixed(2),
          '0.1',
        ),
        Math.abs(delta) <= 10,
      );
    }
  }
});
