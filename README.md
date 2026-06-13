# Envelope Expense CSV

This is a frontend-only React + Vite expense tracker and envelope budgeting app. It stores app data in one normalized CSV file through the browser File System Access API.

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. Production builds are available with:

```bash
npm run build
npm run preview
```

## CSV Workflow

- Use `Open CSV` to open an existing app CSV.
- Use `Save` after opening a CSV to write changes back to the same file.
- Use `Save As` to create a new app CSV.
- The app keeps a local draft cache in browser storage, but file handles must be reacquired after reload.
- Automatic transaction rules can be created while adding a transaction and are saved in the same app CSV. When the app loads or opens a CSV, enabled rules generate missing due transactions and mark the file as unsaved until you click `Save`.

The CSV uses a `record_type` column so transactions, accounts, categories, subcategories, monthly setup, and app metadata can live in one file. React-saved CSVs remain compatible with the previous vanilla app schema and add only backward-compatible metadata fields on the `meta` record.

## Startup Automation

The app writes `last_accessed_at` and `last_automation_run_at` on the CSV `meta` row. When the app loads, it compares `last_accessed_at` to today's local date, updates the metadata when needed, and advances the selected month if the calendar month changed and that month is supported. This marks the app as unsaved; click `Save` to persist the metadata back to the CSV.

## Browser Support

Chrome and Edge are the target browsers for app CSV open/save because they support the File System Access API. Unsupported browsers can render the interface, but CSV open/save will show a compatibility warning.

## Features

- Dashboard KPIs for income, expenses, net cashflow, available to assign, category spend, envelope snapshots, and warnings.
- Transaction add/edit/delete with category-filtered subcategories.
- Optional automatic recurring rules from the transaction form, with preset or custom recurrence options.
- Month-specific envelope funding, starting balances, and rollover tracking.
- Available To Assign calculated as selected-month income minus selected-month envelope funding.
- Category, subcategory, and account management.
- Generic bank CSV import with column mapping, preview, and transaction creation.
- Non-blocking status warnings for over-assigned months, overdrawn envelopes, invalid transactions, and missing references.
