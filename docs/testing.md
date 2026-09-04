# Test notes for 0.1.0

These notes distinguish automated checks from manual browser checks. They are not a claim of exhaustive compatibility or a security audit.

## Automated checks

`npm test` runs 31 Node.js tests across `tests/compare.test.mjs` and `tests/cli.test.mjs`. Coverage includes quoted delimiters/newlines, BOM, malformed CSV, JSON validation, duplicate/composite keys, column changes, type and normalization rules, nested values, numeric tolerance, report escaping, formula prefixes, record limits and CLI exit/output behavior.

A deterministic 50,000-record fixture checks correctness at the supported row limit; 50,001 records are rejected. This is a correctness check, not a browser performance benchmark.

Local validation passed on Windows with Node.js 22.23.2:

- `npm test`: 31 passed, 0 failed.
- `npm run lint`: passed.
- `npm run build`: TypeScript and Vite production build passed.

The [CI workflow](../.github/workflows/test.yml) runs core tests on Windows/Linux with Node.js 22/24 and a separate web lint/build job. Consult the workflow run for current results.

## Actual browser checks

Performed in a Chromium-based browser on Windows using both the development interface and a production-build smoke check.

| Check | Result |
| --- | --- |
| Import sample CSV before + JSON after | 2 added, 1 removed, 3 modified, 4 unchanged, 4 changed cells |
| Duplicate key | Clear validation error; stale results removed |
| Modified filter and Keyboard search | 3 modified records, then only RG-104 |
| Ignore stock column | 2 modified, 5 unchanged, 2 changed cells |
| CSV / JSON download | Files saved to disk and parsed; content and options verified |
| 130 modified records | First 50 records; next page displays records 51–100 |
| Invalid binary file import | Rejected; existing source text retained |
| Narrow 390 px viewport | No document-wide horizontal overflow; data areas scroll intentionally |
| Light and dark themes | Visually reviewed; screenshots in images/ |
| Disable network after loading | Comparison still completes with the expected sample result |
| Production preview | Built JavaScript loads and sample comparison gives the expected result |

The screenshot data is fictional. Download checks used the ignore-stock option, so that report's modified/unchanged counts differ from the default screenshot.

Not yet verified: Safari/Firefox-specific behavior, screen-reader end-to-end use, exhaustive keyboard accessibility, very low-memory devices or all spreadsheet applications' CSV import rules. No PWA/offline refresh support is claimed.
