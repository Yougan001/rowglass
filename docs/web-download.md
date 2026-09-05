# Rowglass static web download

This archive contains the built browser application. It does not need an application server, account or API key. Serve the extracted folder with any static HTTP server; do not double-click index.html, because browser module/worker security rules can block file:// pages.

If Python 3 is already installed, one local-only option is:

```sh
python -m http.server 8080 --bind 127.0.0.1
```

Open http://127.0.0.1:8080/ in a current browser. The assets use relative paths, so the same folder can also be hosted under a URL subdirectory.

CSV/TSV/JSON comparisons run in browser memory; no data-upload endpoint or analytics are included. After loading, comparison can run without a network connection. Offline page refresh is not provided. Reports contain your data. Limits and source: https://github.com/Yougan001/rowglass

Prefer the hosted app if you do not want to run a local server: https://yougan001.github.io/rowglass/

MIT licensed. Included third-party notices must stay with distributed copies.
