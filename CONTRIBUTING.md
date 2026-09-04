# Contributing

Bug reports, small fixes and examples of real comparison workflows are welcome.

## Before opening an issue

Search existing issues and reproduce against the current release. Include a minimal, **synthetic** pair of inputs, key columns, options, expected output, actual output and browser/Node.js version. Do not attach personal, customer or production data.

## Local checks

Use Node.js 22.13+ and npm:

```sh
npm ci
npm test
npm run lint
npm run build
```

Start the interface with `npm run dev`. The core and CLI tests can also run without dependencies: `node --test tests/*.test.mjs`.

## Pull requests

Keep each pull request focused. Add a regression test for parser/comparison/CLI changes, document any changed behavior and include real screenshots for visible interface changes. Test both themes and a narrow viewport when changing layout.

The engine in `core/compare.mjs` must remain independent of the DOM and third-party packages. Keep key matching deterministic and fail clearly on ambiguous inputs. Never silently coerce long identifiers or duplicate records.

Do not add tracking, source-data network uploads, committed credentials or real customer fixtures. Discuss new formats or large features in an issue first.

By contributing, you agree that your contribution is licensed under the project's MIT license.
