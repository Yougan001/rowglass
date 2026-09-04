# Changelog

## Unreleased

- Run parsing, key suggestions and comparisons in a worker with cancellation and stale-result protection.
- Add four session tests covering failed imports, replacement inputs and isolated datasets.
- Compare numeric tolerances with exact decimal arithmetic, including large CSV integers and long fractional strings.
- Keep excessive numeric literals as text instead of allocating unbounded integers.
- Add seven regression tests for decimal boundaries, scientific notation, strict types and exact keys.

## 0.1.0 — 2026-09-05

First release.

- CSV, TSV, semicolon and JSON object-array inputs.
- Unique/composite key matching independent of row order.
- Added, removed, modified and unchanged records with cell-level differences and schema changes.
- Ignored columns, whitespace/case normalization, absolute numeric tolerance and strict types.
- Local file import, paste, search, status filters and paginated results.
- Formula-neutralized CSV and full JSON report downloads.
- Light/dark themes and responsive layout.
- Dependency-free Node.js CLI with documented exit codes and no-overwrite output.
- 31 automated tests, sample files, English/Chinese documentation and real UI screenshots.

Known boundaries: UTF-8 browser imports, no native XLSX/NDJSON, no fuzzy matching, no merge/edit operations, and no offline page-loading cache.
