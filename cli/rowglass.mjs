#!/usr/bin/env node
import { readFile, stat, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { parseDataset, compareDatasets, reportCsv } from '../core/compare.mjs';

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      key: { type: 'string', multiple: true },
      ignore: { type: 'string', multiple: true },
      tolerance: { type: 'string' },
      json: { type: 'boolean' },
      output: { type: 'string' },
      'trim-whitespace': { type: 'boolean' },
      'ignore-case': { type: 'boolean' },
      'strict-types': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(
      'Rowglass — local CSV / JSON data comparison\n\nUsage: node cli/rowglass.mjs before.csv after.json --key id [options]\n\n--key COLUMN        Repeat to match a composite key\n--ignore COLUMN     Repeat to ignore fields\n--tolerance NUMBER  Absolute numeric tolerance (default 0)\n--trim-whitespace   Trim compared cells, not keys\n--ignore-case       Ignore case in compared cells, not keys\n--strict-types      Distinguish JSON number 1 from string "1"\n--json              Write full JSON report to stdout\n--output FILE.csv   Save a CSV report (will not overwrite)\n\nExit codes: 0 identical, 1 differences, 2 invalid input.',
    );
  } else {
    if (positionals.length !== 2)
      throw new Error('Provide two files. Run with --help for examples.');
    const inputs = await Promise.all(
      positionals.map(async (path) => {
        if ((await stat(path)).size > 20_000_000)
          throw new Error('File is too large. Maximum 20 MB before decoding.');
        return parseDataset(await readFile(path, 'utf8'));
      }),
    );
    const result = compareDatasets(inputs[0], inputs[1], {
      keys: values.key,
      ignoreColumns: values.ignore,
      tolerance: values.tolerance,
      trimWhitespace: values['trim-whitespace'],
      ignoreCase: values['ignore-case'],
      strictTypes: values['strict-types'],
    });
    if (values.output)
      await writeFile(values.output, reportCsv(result), {
        flag: 'wx',
        encoding: 'utf8',
      });
    console.log(
      values.json
        ? JSON.stringify(result, null, 2)
        : `${result.summary.added} added · ${result.summary.removed} removed · ${result.summary.modified} modified · ${result.summary.unchanged} unchanged · ${result.summary.changedCells} cells changed`,
    );
    process.exitCode =
      result.summary.added +
        result.summary.removed +
        result.summary.modified +
        result.schema.added.length +
        result.schema.removed.length >
      0
        ? 1
        : 0;
  }
} catch (error) {
  console.error(`Rowglass: ${error.message}`);
  process.exitCode = 2;
}
