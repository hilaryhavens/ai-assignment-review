# Vendored libraries

These are committed so the app runs offline with no CDN or network requests.

| File | Package | Version | Source |
|------|---------|---------|--------|
| `mammoth.browser.min.js` | mammoth | 1.8.0 | https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js |
| `pdf.min.js` | pdfjs-dist | 4.2.67 | https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.min.mjs |
| `pdf.worker.min.js` | pdfjs-dist | 4.2.67 | https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.worker.min.mjs |

`mammoth.browser.min.js` is a classic script that defines the global `window.mammoth`.
`pdf.min.js` is an ES module imported dynamically by `app.js`; its worker path is set to `vendor/pdf.worker.min.js`.

To re-fetch, run the `curl` commands above from this directory.
