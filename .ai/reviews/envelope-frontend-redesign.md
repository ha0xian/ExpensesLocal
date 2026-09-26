# Envelope frontend redesign verification

Verified on 2026-09-26 against an isolated local CSV store; no production data was used.

## Automated checks

- `npm ci` — passed before final verification.
- `npm run test:frontend` — 4/4 presentation tests passed.
- `npm run build` — Vite production build passed.
- `backend/.venv/Scripts/python.exe -m pytest -q` — 51/51 backend tests passed. One existing Starlette/httpx deprecation warning remains.
- `npm audit fix` — removed all moderate/high findings; one low-severity Windows-only development-server advisory remains in Vite's pinned esbuild range.
- `git diff --check` — passed; Git reported only the repository's expected LF-to-CRLF checkout notices.

## Browser checks

- Desktop 1440×900: dashboard hierarchy, sidebar, transaction Sheet, ledger, filters, warnings, and all eight views rendered without console errors.
- Phone 390×844: navigation plus header measured about 212px, below the 220px limit.
- Phone 320×800: document width matched the viewport with no page-level horizontal overflow; data tables retain their own contained horizontal scroller.
- Added a `$12.34` expense to the non-default `Credit Card` account, then atomically edited the merchant and amount to `$19.75`; the ledger and dashboard updated correctly.
- A dirty edit raised the discard confirmation. Cancelling preserved the Sheet and draft; confirming discard closed it.
- Dashboard correctly reported zero-budget positive spend as `Unbudgeted spending` and surfaced the resulting overdrawn envelope first.
- All eight desktop views and the eight-item mobile navigation menu were smoke-tested. Browser console warning/error log was empty after the final reload.

## Failure-path findings and limits

- Atomic transaction update tests prove invalid dates, non-positive/non-finite amounts, invalid subcategories, unknown fields, mixed legacy/new payloads, and missing IDs are rejected without changing the stored transaction.
- Restore backup now separates file selection from destructive replacement and uses a controlled confirmation dialog. Bank import retains its source CSV and ignores stale preview responses.
- Browser file chooser upload was not exercised; the backend CSV/import suite and browser-visible pre-apply states cover the underlying paths.
- Authentication behavior was intentionally unchanged; the isolated browser run used the repository's local `AUTH_DISABLED` mode and verified only the redesigned authenticated shell presentation.
