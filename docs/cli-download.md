# Rowglass command-line download

Requires Node.js 22.13 or later. No npm installation or network connection is needed for comparison.

Unzip the archive and open a terminal in that folder:

```sh
node cli/rowglass.mjs examples/before.csv examples/after.json --key sku
```

Expected: 2 added, 1 removed, 3 modified, 4 unchanged, 4 changed cells. Exit code 1 is expected when differences exist. Code 0 means no differences; code 2 means invalid input or another error.

Use `--help` to see options. `--json` prints the full report; `--output changes.csv` creates a CSV without overwriting an existing file. Repeated `--key` arguments form a composite key. `--tolerance 0.01` is an absolute numeric difference, not a percentage, and does not affect keys.

The archive includes `core/decimal.mjs`; do not remove it. Exact decimal arithmetic prevents adjacent large CSV integers from collapsing into the same value. Large JSON identifiers should still be strings because unsafe JSON integers are rejected.

Keep exported reports private if they contain sensitive data. XLSX, NDJSON, fuzzy matching and file editing/merging are not supported. Full documentation: https://github.com/Yougan001/rowglass

MIT licensed. See LICENSE.
