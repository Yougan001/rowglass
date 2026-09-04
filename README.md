# Rowglass

Local-first CSV and JSON diff viewer. Match records by ID, find changed cells, and export a reviewable report without uploading your data.

**Development milestone 3:** local file import, composite keys, comparison options, filtered and paginated results, CSV/JSON exports, dark mode and mobile layout. The release documentation and screenshots follow in the next milestone.

## Run the comparison engine

Requires Node.js 22 or later. No dependency installation is needed for the CLI or tests.

```sh
node cli/rowglass.mjs before.csv after.json --key id
node cli/rowglass.mjs before.csv after.csv --key country --key id --json
node --test tests/*.test.mjs
```

CSV, TSV, semicolon-separated files and JSON arrays of objects are supported. The first delimited row must contain unique column names. Row order is ignored; key values must be non-empty and unique (or use multiple `--key` columns). Duplicate keys produce an error rather than guessing a match.

Exit codes: `0` identical, `1` differences, `2` invalid input. See `--help` for normalization, numeric tolerance, ignored columns and report export options.

Limits: 5 million characters, 50,000 records, 200 columns per file. JSON objects and arrays inside a cell are compared as a whole; object key order is ignored. JSON number `1` and CSV string `1` match by default. Leading-zero IDs are preserved. Missing, null and empty strings remain distinct. Strict JSON type comparison is optional.

## Development

The web workspace uses React, TypeScript, Vite and accessible UI components. It calls the same pure engine in `core/compare.mjs`. No data API, analytics or account is required to compare files locally.

```sh
npm ci
npm run dev
```

Open the local address printed by the server. The sample catalog is fictional. Replace either panel with your data and choose a unique key column.

## License

MIT © 2026 Yougan001
