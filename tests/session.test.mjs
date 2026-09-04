import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../core/session.mjs';

const sources = (before = 'id,v\n1,A', after = 'id,v\n1,B') => ({
  type: 'load',
  before: { text: before, format: 'auto' },
  after: { text: after, format: 'auto' },
});

test('session exposes only metadata until a report is requested', () => {
  const handle = createSession();
  const metadata = handle(sources());
  assert.deepEqual(metadata.a, {
    columns: ['id', 'v'],
    count: 1,
    format: 'CSV',
  });
  assert.equal('rows' in metadata.a, false);
  assert.equal(handle({ type: 'suggest' }), 'id');
  assert.equal(
    handle({ type: 'compare', options: { keys: ['id'] } }).summary.modified,
    1,
  );
});

test('failed input replacement cannot expose a stale comparison', () => {
  const handle = createSession();
  handle(sources());
  assert.throws(() => handle(sources('id,v\n1,A', 'id,v\n1')), /fields/);
  assert.throws(
    () => handle({ type: 'compare', options: { keys: ['id'] } }),
    /valid files/,
  );
});

test('loading a new pair replaces both old sources', () => {
  const handle = createSession();
  handle(sources());
  handle(sources('key,n\nX,1', 'key,n\nX,1'));
  assert.equal(handle({ type: 'suggest' }), 'key');
  assert.equal(
    handle({ type: 'compare', options: { keys: ['key'] } }).summary.unchanged,
    1,
  );
});

test('independent sessions do not share user data', () => {
  const one = createSession();
  const two = createSession();
  one(sources());
  assert.throws(() => two({ type: 'suggest' }), /valid files/);
  assert.throws(() => one({ type: 'unknown' }), /Unsupported/);
});
