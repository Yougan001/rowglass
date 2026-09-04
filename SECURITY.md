# Security policy

## Supported version

Security fixes target the latest release on the main branch.

## Reporting a vulnerability

Do not post secrets, personal data or exploitable details in a public issue. Use GitHub's private vulnerability reporting option if it is enabled for this repository. If that option is unavailable, open an issue containing only a request for a private reporting channel, without technical details, and wait for a response.

Ordinary parser errors with synthetic, non-sensitive examples can be reported as bugs.

## Data handling

The application processes data in memory without a data backend. Hosted application assets are still served by the hosting provider. Exported reports contain source values and should be treated with the same care as the input.

CSV reports neutralize formula prefixes; this is not a substitute for checking untrusted files before opening them in spreadsheet software. Do not paste production secrets into an unreviewed deployment.

The file, character, record, column and nesting limits are resource safeguards. They do not guarantee responsiveness on every device or defend against every possible resource-exhaustion input.
