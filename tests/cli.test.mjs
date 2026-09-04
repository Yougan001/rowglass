import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseDataset } from '../core/compare.mjs';

test('CLI exit codes, JSON report and no-overwrite export work end to end', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'rowglass-test-'));
  try {
    const a = join(dir, 'before.csv'),
      b = join(dir, 'after.json'),
      output = join(dir, 'report.csv');
    await writeFile(a, 'id,name\n1,A');
    await writeFile(b, '[{"id":1,"name":"B"}]');
    const run = (args) =>
      spawnSync(process.execPath, [resolve('cli/rowglass.mjs'), ...args], {
        encoding: 'utf8',
      });
    assert.equal(run([a, a, '--key', 'id']).status, 0);
    const changed = run([a, b, '--key', 'id', '--json', '--output', output]);
    assert.equal(changed.status, 1);
    assert.equal(JSON.parse(changed.stdout).summary.modified, 1);
    assert.equal(
      parseDataset(await readFile(output, 'utf8')).rows[0].after,
      'B',
    );
    assert.equal(run([a, b, '--key', 'id', '--output', output]).status, 2);
    assert.equal(run([a, b]).status, 2);
    assert.equal(run(['--help']).status, 0);
  } finally {
    await rm(dir, { recursive: true });
  }
});
test('JSON refuses lossy large integers and extreme nesting', () => {
  assert.throws(
    () => parseDataset('[{"id":9007199254740993}]'),
    /unsafe number/,
  );
  assert.throws(() => parseDataset('[{"id":1e999}]'), /unsafe number/);
  assert.throws(
    () =>
      parseDataset(
        '[{"id":1,"v":' + '['.repeat(32) + '0' + ']'.repeat(32) + '}]',
      ),
    /nesting/,
  );
});
