# Plan: FastAPI Backend

## Goal

Add a Python FastAPI backend that owns CSV-backed expense app state, business logic, validation, calculations, startup automation, and persistence, while slimming the React frontend into an API client focused on presentation and user interaction.

## Context

This repository is currently a React 19 + Vite frontend-only expense tracker. `package.json` defines `npm run dev`, `npm run build`, and `npm run preview`; there is no test runner. The app stores one normalized app CSV through browser File System Access APIs and keeps a local draft in `localStorage`.

Relevant frontend structure:

- `src/App.jsx` owns most application mutations, file open/save handlers, dirty state, bank import state, view routing, and validation for transactions, automatic transaction rules, categories, subcategories, accounts, and monthly setup.
- `src/hooks/useExpenseState.js` loads and persists the browser draft from `localStorage`, normalizes state, and runs startup automation.
- `src/lib/csv-storage.js` contains browser File System Access helpers plus app CSV parsing, app CSV serialization, generic CSV parsing, CSV escaping, and scalar coercion helpers.
- `src/lib/data-schema.js` defines app defaults, CSV columns, `MONTHS_2026`, and `createInitialState()`.
- `src/lib/calculations.js` contains state-derived business logic: transaction month parsing, monthly summary, category summary, available-to-assign, envelope balances, account balances, and warnings.
- `src/lib/automatic-transactions.js` contains recurring rule normalization, due date calculation, duplicate protection, and generated transaction creation.
- `src/lib/startup-automation.js` updates access metadata, advances the selected month, and generates due automatic transactions.
- `src/lib/app-helpers.js` contains mixed UI/business helpers: currency formatting, ID generation, subcategory lookup, generic bank CSV mapping guesses, type normalization, and bank import row conversion.
- `src/views/*.jsx`, `src/components/*.jsx`, and `src/styles.css` are presentation code. Views currently receive state plus mutation callbacks from `src/App.jsx`.
- Existing navigation already includes an `automatic` view and `src/views/AutomaticTransactionsView.jsx` exists in the repo.
- Root-level files `app.js`, `csv-storage.js`, `data-schema.js`, `calculations.js`, `startup-automation.js`, and `styles.css` appear to be legacy vanilla app copies. The Vite app imports from `src/`, not from these root-level files.

The requested backend should use FastAPI Python. The user confirmed the CSV should remain the storage format, with the backend reading/writing a server-side CSV file. Therefore the backend should preserve the normalized CSV schema rather than introducing a database.

## Assumptions

- The backend should store the active app CSV in a local server-side data file, not in browser-selected files.
- The default backend data file can be `backend/data/expense-data.csv`.
- If the data CSV does not exist, the backend should initialize state from the same default categories, subcategories, accounts, monthly setup, currency, and selected month currently defined in `src/lib/data-schema.js`.
- The frontend should call FastAPI over HTTP during local development.
- Vite should proxy `/api` requests to `http://127.0.0.1:8000`.
- CSV import/export should remain available through backend endpoints, but browser File System Access API usage should be removed from the frontend app data workflow.
- Generic bank CSV import can still use a browser file input, but parsing and conversion should move to the backend through an upload/preview/apply API.
- Authentication, multi-user support, hosted deployment, and database storage are out of scope.
- The backend and frontend may duplicate presentation-only constants such as view labels, but business constants and schema defaults should live in backend code after the migration.

## Open Questions

None.

## Files To Modify

- Path: `package.json`
  - Purpose of change: Add frontend scripts that support the backend development workflow without replacing existing Vite scripts.
  - Specific items to modify:
    - Add a script such as `"dev:frontend": "vite"` if useful.
    - Optionally add `"dev:backend": "cd backend && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"` if Agent B verifies it works on Windows PowerShell.
  - Expected behavior after modification:
    - Existing `npm run dev`, `npm run build`, and `npm run preview` continue to work.
    - README can point users to clear backend and frontend commands.

- Path: `vite.config.js`
  - Purpose of change: Proxy API calls during local frontend development.
  - Specific config to modify:
    - Add `server.proxy["/api"]` targeting `http://127.0.0.1:8000`.
  - Expected behavior after modification:
    - Frontend code can call `/api/...` without hard-coded backend origins in development.

- Path: `src/App.jsx`
  - Purpose of change: Remove backend-owned logic from the frontend app shell and replace direct state mutation/file persistence with API calls.
  - Specific functions and areas to modify:
    - Imports from `src/lib/calculations.js`, `src/lib/csv-storage.js`, `src/lib/automatic-transactions.js`, and backend-owned helpers.
    - Remove `currentFileHandle`, File System Access handling, `serializeAppCsv`, and `parseAppCsv` usage.
    - Replace local derived calculations with summary data returned by backend load/refresh responses.
    - Replace `commit(...)` and inline mutation handlers with async API calls through a new API client.
    - Keep `currentView`, `bankImport`, and presentation routing in React.
  - Expected behavior after modification:
    - Initial render fetches state plus derived data from the backend.
    - Add/update/delete actions call backend endpoints, then refresh local frontend state from the backend response.
    - Save/Open CSV controls become backend import/export controls or are renamed to match server-side persistence.
    - Frontend no longer parses, serializes, normalizes, or calculates app state.

- Path: `src/hooks/useExpenseState.js`
  - Purpose of change: Replace localStorage draft ownership with backend state loading, refresh, and error/loading state.
  - Specific exports to modify:
    - Keep `useExpenseState()` as the app-facing hook if practical, but change its internals to use the API client.
    - Remove `normalizeState`, `loadDraft`, direct `localStorage` persistence, and direct startup automation execution from the hook.
  - Expected behavior after modification:
    - `useExpenseState()` returns backend-loaded `state`, derived data, `automationStatus`, loading/error flags, and refresh/update helpers.
    - Startup automation runs backend-side when state is loaded.

- Path: `src/components/TopBar.jsx`
  - Purpose of change: Remove browser File System Access support messaging and align controls with server-backed CSV behavior.
  - Specific props to modify:
    - Remove `fileSystemSupported`.
    - Replace `fileName`, `dirty`, `onOpenCsv`, `onSaveCsv`, and `onSaveAsCsv` as needed with backend-oriented props such as `dataFileName`, `onExportCsv`, and `onImportCsv`.
  - Expected behavior after modification:
    - Top bar still shows selected month and automation status.
    - It no longer claims Chrome/Edge File System Access support is required.

- Path: `src/views/BankImportView.jsx`
  - Purpose of change: Remove frontend generic CSV parsing and bank import row conversion.
  - Specific behavior to modify:
    - Keep the file input and mapping UI.
    - Send uploaded CSV content/file to backend preview endpoint.
    - Display backend-provided headers, preview rows, source row count, and mapping.
    - Apply import through backend endpoint.
  - Expected behavior after modification:
    - Bank import works through backend parsing/mapping.
    - Frontend does not call `parseGenericCsv`, `guessMapping`, or `mapBankImportRows`.

- Path: `src/views/TransactionsView.jsx`
  - Purpose of change: Stop importing backend-owned recurrence constants from frontend logic modules.
  - Specific imports to modify:
    - Replace `RECURRENCE_PRESETS` and `RECURRENCE_UNITS` imports with values returned by backend metadata/config endpoint, or define a frontend presentation fallback only if backend metadata is unavailable.
  - Expected behavior after modification:
    - Transaction form still supports `makeAutomatic`.
    - Automatic transaction validation and rule creation are enforced backend-side.

- Path: `src/views/AutomaticTransactionsView.jsx`
  - Purpose of change: Stop importing backend-owned recurrence constants from frontend logic modules.
  - Specific imports to modify:
    - Use backend metadata/config for recurrence presets and units.
  - Expected behavior after modification:
    - Automatic rule CRUD remains available with backend validation.

- Path: `src/lib/app-helpers.js`
  - Purpose of change: Keep only frontend presentation helpers.
  - Specific functions to keep:
    - `money(value, currency = "USD")`
    - `subcategoriesFor(state, category)` if still useful for rendering form options.
  - Specific functions to remove or stop using:
    - `uniqueId`
    - `guessMapping`
    - `normalizeType`
    - `mapBankImportRows`
  - Expected behavior after modification:
    - Frontend helper module no longer creates IDs or performs backend-owned import conversion.

- Path: `src/lib/csv-storage.js`
  - Purpose of change: Remove frontend app CSV persistence and parsing from active code.
  - Specific options:
    - Delete the file only if no active imports remain.
    - Or leave a tiny browser download/upload helper only if it is strictly presentation-related and does not parse app state.
  - Expected behavior after modification:
    - No React app code imports app CSV parse/serialize functions.

- Path: `src/lib/calculations.js`
  - Purpose of change: Remove frontend-owned business calculations from active code.
  - Specific options:
    - Delete the file only if no active imports remain.
    - Or keep only if Agent B identifies truly presentation-only logic, which is not expected.
  - Expected behavior after modification:
    - No React app code imports monthly summaries, warnings, envelope balances, account balances, or transaction month parsing from the frontend.

- Path: `src/lib/automatic-transactions.js`
  - Purpose of change: Remove recurrence generation and validation from frontend active code.
  - Specific options:
    - Delete the file only if no active imports remain.
  - Expected behavior after modification:
    - Automatic transaction generation runs only in backend code.

- Path: `src/lib/startup-automation.js`
  - Purpose of change: Remove startup automation from frontend active code.
  - Specific options:
    - Delete the file only if no active imports remain.
  - Expected behavior after modification:
    - Startup automation runs only in backend code during backend state load/import.

- Path: `src/lib/data-schema.js`
  - Purpose of change: Remove frontend-owned schema defaults from active code.
  - Specific options:
    - Delete the file only if no active imports remain.
    - If `MONTHS_2026` is needed for UI selects before state is loaded, prefer backend metadata instead.
  - Expected behavior after modification:
    - Backend owns app schema defaults and CSV column definitions.

- Path: `README.md`
  - Purpose of change: Document the new backend/frontend architecture, local run commands, server-side CSV file location, API-backed workflow, and import/export behavior.
  - Specific sections to update:
    - Intro
    - Run Locally
    - CSV Workflow
    - Startup Automation
    - Browser Support
  - Expected behavior after modification:
    - README no longer describes the app as frontend-only.
    - Users know how to start both FastAPI and Vite.

- Path: `.gitignore`
  - Purpose of change: Ignore local backend runtime artifacts.
  - Specific patterns to add:
    - `backend/.venv/`
    - `backend/__pycache__/`
    - `backend/.pytest_cache/`
    - `backend/data/*.csv` if local data should not be committed.
    - `!backend/data/.gitkeep` if keeping the directory.
  - Expected behavior after modification:
    - Local server data and Python build/cache artifacts do not pollute git status.

## Files To Add

- Path: `backend/requirements.txt`
  - Purpose: Declare backend runtime and test dependencies.
  - Expected contents:
    - `fastapi`
    - `uvicorn[standard]`
    - `pydantic`
    - `python-multipart`
    - `pytest`
    - `httpx`

- Path: `backend/app/__init__.py`
  - Purpose: Mark the backend app package.
  - Expected exports:
    - None required.

- Path: `backend/app/main.py`
  - Purpose: FastAPI application factory/module and route registration.
  - Expected exports:
    - `app = FastAPI(...)`
  - Expected behavior:
    - Adds permissive local-development CORS for `http://localhost:5173` and `http://127.0.0.1:5173` if Vite proxy is not used.
    - Includes API routes under `/api`.
    - Provides `GET /api/health`.

- Path: `backend/app/config.py`
  - Purpose: Centralize backend file paths and app settings.
  - Expected exports:
    - `DATA_DIR: Path`
    - `APP_CSV_PATH: Path`
    - `APP_NAME: str`

- Path: `backend/app/models.py`
  - Purpose: Define Pydantic models for state, requests, responses, entities, summaries, warnings, bank import, and metadata.
  - Expected exports:
    - `Category`
    - `Subcategory`
    - `Account`
    - `Transaction`
    - `AutomaticTransactionRule`
    - `MonthlySetup`
    - `ExpenseState`
    - `AutomationStatus`
    - `DerivedState`
    - `AppSnapshot`
    - mutation request models such as `CreateTransactionRequest`, `UpdateFieldRequest`, `CreateAutomaticTransactionRequest`, `CreateCategoryRequest`, `CreateSubcategoryRequest`, `CreateAccountRequest`, `BankImportPreviewRequest`, and `BankImportApplyRequest`
  - Expected behavior:
    - Use camelCase JSON aliases matching current React state property names.
    - Coerce numeric and boolean values safely.
    - Validate required fields where backend mutations depend on them.

- Path: `backend/app/schema_defaults.py`
  - Purpose: Port defaults and CSV columns from `src/lib/data-schema.js`.
  - Expected exports:
    - `APP_SCHEMA_VERSION`
    - `MONTHS_2026`
    - `CSV_COLUMNS`
    - `DEFAULT_CATEGORIES`
    - `DEFAULT_SUBCATEGORIES`
    - `DEFAULT_ACCOUNTS`
    - `DEFAULT_MONTHLY_SETUP`
    - `create_initial_state() -> ExpenseState`

- Path: `backend/app/csv_storage.py`
  - Purpose: Own app CSV parsing, serialization, load, save, import, and export.
  - Expected exports:
    - `parse_app_csv(csv_text: str) -> ExpenseState`
    - `serialize_app_csv(state: ExpenseState) -> str`
    - `parse_generic_csv(csv_text: str) -> tuple[list[str], list[dict[str, str]]]`
    - `load_state(path: Path = APP_CSV_PATH) -> ExpenseState`
    - `save_state(state: ExpenseState, path: Path = APP_CSV_PATH) -> None`
    - `ensure_data_file(path: Path = APP_CSV_PATH) -> ExpenseState`
  - Expected behavior:
    - Preserve the existing normalized CSV columns and record types.
    - Accept older CSVs without automatic transaction rows or `source_rule_id`.
    - Raise controlled validation errors for malformed/missing required app records.

- Path: `backend/app/calculations.py`
  - Purpose: Port business calculations from `src/lib/calculations.js`.
  - Expected exports:
    - `get_transaction_month(date_string: str) -> str`
    - `summarize_month(state: ExpenseState, month: str) -> dict`
    - `summarize_categories_for_month(state: ExpenseState, month: str) -> list[dict]`
    - `calculate_available_to_assign(state: ExpenseState, month: str) -> float`
    - `calculate_envelope_balances(state: ExpenseState, month: str) -> list[dict]`
    - `calculate_account_balances(state: ExpenseState) -> list[dict]`
    - `collect_warnings(state: ExpenseState, month: str) -> list[WarningItem]`
    - `build_derived_state(state: ExpenseState) -> DerivedState`
  - Expected behavior:
    - Match existing frontend calculations for positive amounts, transaction type semantics, rollover, warnings, and selected month summaries.

- Path: `backend/app/automatic_transactions.py`
  - Purpose: Port recurring transaction rule logic from `src/lib/automatic-transactions.js`.
  - Expected exports:
    - `RECURRENCE_PRESETS`
    - `RECURRENCE_UNITS`
    - `normalize_automatic_transaction_rule(rule: AutomaticTransactionRule, fallback_currency: str = "USD") -> AutomaticTransactionRule`
    - `get_due_dates_for_rule(rule: AutomaticTransactionRule, current_date: date, existing_transactions: list[Transaction]) -> list[str]`
    - `generate_automatic_transactions(state: ExpenseState, current_date: date | None = None) -> tuple[ExpenseState, list[Transaction], list[dict]]`
  - Expected behavior:
    - Preserve preset/custom recurrence behavior and duplicate protection through `sourceRuleId + date`.

- Path: `backend/app/startup_automation.py`
  - Purpose: Port startup automation from `src/lib/startup-automation.js`.
  - Expected exports:
    - `run_startup_automation(state: ExpenseState, current_date: date | None = None) -> AutomationStatusAndState`
  - Expected behavior:
    - Update last access metadata once per local date.
    - Advance selected month when applicable.
    - Generate due automatic transactions.
    - Return status compatible with frontend display needs.

- Path: `backend/app/bank_import.py`
  - Purpose: Port bank CSV mapping and row conversion from `src/lib/app-helpers.js`.
  - Expected exports:
    - `guess_mapping(headers: list[str]) -> dict[str, str]`
    - `normalize_type(value: str) -> str`
    - `map_bank_import_rows(rows: list[dict[str, str]], mapping: dict[str, str], state: ExpenseState) -> list[Transaction]`
  - Expected behavior:
    - Backend creates imported transaction IDs.
    - Backend derives type, subcategory, account, currency, month, and import notes.

- Path: `backend/app/state_service.py`
  - Purpose: Centralize load-modify-save operations so routes stay thin.
  - Expected exports:
    - `get_snapshot(run_automation: bool = True) -> AppSnapshot`
    - `replace_state_from_csv(csv_text: str) -> AppSnapshot`
    - `export_csv() -> str`
    - CRUD functions for transactions, automatic transactions, categories, subcategories, accounts, monthly setup, selected month, and bank import apply.
  - Expected behavior:
    - Every successful mutation saves the CSV and returns a fresh `AppSnapshot`.
    - Mutations normalize state before save.
    - Validation failures become HTTP 400 responses.

- Path: `backend/app/routes.py`
  - Purpose: Define HTTP API endpoints.
  - Expected endpoints:
    - `GET /api/health`
    - `GET /api/config`
    - `GET /api/state`
    - `PUT /api/state/month`
    - `POST /api/csv/import`
    - `GET /api/csv/export`
    - `POST /api/transactions`
    - `PATCH /api/transactions/{transaction_id}`
    - `DELETE /api/transactions/{transaction_id}`
    - `POST /api/automatic-transactions`
    - `PATCH /api/automatic-transactions/{rule_id}`
    - `DELETE /api/automatic-transactions/{rule_id}`
    - `POST /api/categories`
    - `PATCH /api/categories/{category_id}`
    - `DELETE /api/categories/{category_id}`
    - `POST /api/subcategories`
    - `PATCH /api/subcategories/{subcategory_id}`
    - `DELETE /api/subcategories/{subcategory_id}`
    - `POST /api/accounts`
    - `PATCH /api/accounts/{account_id}`
    - `DELETE /api/accounts/{account_id}`
    - `PATCH /api/monthly-setup/{setup_id}`
    - `POST /api/monthly-setup/fill-missing`
    - `POST /api/bank-import/preview`
    - `POST /api/bank-import/apply`

- Path: `backend/tests/test_csv_storage.py`
  - Purpose: Verify CSV compatibility.
  - Required tests:
    - Parse serialized default state round trip.
    - Load an older CSV missing automatic transaction rows/source markers.
    - Reject CSV missing required category/subcategory/account records.

- Path: `backend/tests/test_calculations.py`
  - Purpose: Verify parity-critical calculations.
  - Required tests:
    - Account balances handle Bank/Cash versus Credit Card semantics.
    - Available-to-assign equals selected-month income minus monthly funding.
    - Warnings include invalid date/amount and missing references.

- Path: `backend/tests/test_automatic_transactions.py`
  - Purpose: Verify recurrence and duplicate protection.
  - Required tests:
    - Monthly rule generates due dates through current date.
    - Custom every-N-days rule works.
    - Existing `sourceRuleId + date` transaction prevents duplicate generation.
    - Invalid or disabled rules generate nothing.

- Path: `backend/tests/test_api.py`
  - Purpose: Verify core API integration using FastAPI test client.
  - Required tests:
    - `GET /api/state` returns `state`, `derived`, `automationStatus`, and `config`.
    - `POST /api/transactions` persists a transaction and returns refreshed derived data.
    - `POST /api/csv/import` replaces server state from uploaded CSV text.

- Path: `src/lib/api-client.js`
  - Purpose: Frontend API wrapper for backend calls.
  - Expected exports:
    - `getConfig()`
    - `getState()`
    - `updateSelectedMonth(month)`
    - `importCsv(fileOrText)`
    - `exportCsv()`
    - `createTransaction(form)`
    - `updateTransaction(id, field, value)`
    - `deleteTransaction(id)`
    - Equivalent CRUD helpers for automatic transactions, categories, subcategories, accounts, monthly setup, fill-missing, bank import preview, and bank import apply.
  - Expected behavior:
    - Uses `fetch`.
    - Throws readable errors for non-2xx responses.
    - Returns parsed JSON snapshots for mutations.

- Path: `backend/data/.gitkeep`
  - Purpose: Keep the data directory in git while ignoring local CSV data.

## Do Not Touch

- Do not introduce a database, ORM, migrations, authentication, accounts, or multi-user ownership.
- Do not change the normalized CSV record type names or existing CSV column meanings.
- Do not change the public meaning of transaction amounts: amounts stay positive and `type` controls cashflow direction.
- Do not alter dashboard, monthly setup, envelope, account balance, warning, bank import, or recurring rule behavior except as required to move ownership to the backend.
- Do not refactor unrelated view layout, component styling, or navigation beyond the controls affected by backend migration.
- Do not modify generated build output under `dist/`.
- Do not modify `node_modules/` or `outputs/`.
- Do not rely on browser File System Access API for app state after this migration.
- Do not update unrelated dependencies or add frontend state libraries.
- Do not delete legacy root-level vanilla files unless Agent B confirms they are unused and the deletion is explicitly scoped to removing stale frontend-backend duplicate logic.

## Function Signatures And Interfaces

Backend app snapshot response:

```py
class AppSnapshot(BaseModel):
    state: ExpenseState
    derived: DerivedState
    automationStatus: AutomationStatus
    config: AppConfig
    dataFileName: str
```

`DerivedState` must include at least:

```py
class DerivedState(BaseModel):
    summary: dict
    categoryRows: list[dict]
    availableToAssign: float
    envelopeRows: list[dict]
    accountBalances: list[dict]
    warnings: list[WarningItem]
```

`AppConfig` must include at least:

```py
class AppConfig(BaseModel):
    months: list[str]
    recurrencePresets: list[str]
    recurrenceUnits: list[str]
```

State model JSON should preserve current frontend property names:

```json
{
  "selectedMonth": "2026-06",
  "currency": "USD",
  "lastAccessedAt": "2026-06-13",
  "lastAutomationRunAt": "2026-06-13",
  "categories": [],
  "subcategories": [],
  "accounts": [],
  "transactions": [],
  "automaticTransactions": [],
  "monthlySetup": []
}
```

Generic field update request:

```py
class UpdateFieldRequest(BaseModel):
    field: str
    value: Any
```

Error behavior:

- Validation and malformed CSV errors return HTTP 400 with JSON `{"detail": "<readable message>"}`.
- Missing entity IDs return HTTP 404.
- Unexpected internal errors should not expose tracebacks in API responses.

Frontend API client:

```js
async function request(path, options = {}) {
  // fetch(`/api${path}`, ...)
}
```

All frontend mutation helpers should return the backend `AppSnapshot`. `src/App.jsx` should update local React state from that snapshot rather than reconstructing state client-side.

CSV import/export:

- `POST /api/csv/import` accepts either multipart file upload or JSON `{ "csvText": "..." }`. Agent B may choose one, but the frontend must use the chosen contract consistently.
- `GET /api/csv/export` returns `text/csv` with `Content-Disposition` for download.

Bank import:

```py
class BankImportPreviewRequest(BaseModel):
    csvText: str
    mapping: dict[str, str] | None = None
```

Preview response:

```py
class BankImportPreviewResponse(BaseModel):
    headers: list[str]
    rows: list[dict[str, str]]
    mapping: dict[str, str]
    previewRows: list[Transaction]
    rowCount: int
```

Apply request:

```py
class BankImportApplyRequest(BaseModel):
    rows: list[dict[str, str]]
    mapping: dict[str, str]
```

## Implementation Steps

1. Create the `backend/` package, requirements file, app package, data directory, and initial tests.
2. Port schema defaults from `src/lib/data-schema.js` into `backend/app/schema_defaults.py`.
3. Define Pydantic models in `backend/app/models.py` with camelCase JSON aliases and backend validation.
4. Port CSV parsing/serialization from `src/lib/csv-storage.js` into `backend/app/csv_storage.py` using Python's `csv` module rather than manual string parsing.
5. Port calculation logic from `src/lib/calculations.js` into `backend/app/calculations.py`.
6. Port automatic transaction recurrence logic into `backend/app/automatic_transactions.py`.
7. Port startup automation into `backend/app/startup_automation.py`.
8. Port bank import mapping/conversion into `backend/app/bank_import.py`.
9. Implement `backend/app/state_service.py` so every mutation follows load, normalize, mutate, save, return snapshot.
10. Implement FastAPI routes in `backend/app/routes.py` and wire them in `backend/app/main.py`.
11. Add focused backend tests for CSV, calculations, automatic transactions, and core API behavior.
12. Add `src/lib/api-client.js` with `fetch` wrappers for all required frontend actions.
13. Refactor `src/hooks/useExpenseState.js` to load backend snapshots and expose refresh/mutation helpers.
14. Refactor `src/App.jsx` to call API helpers instead of local business logic, CSV parsing/serialization, and File System Access APIs.
15. Update `TopBar`, `BankImportView`, `TransactionsView`, and `AutomaticTransactionsView` to use backend config/snapshots and API workflows.
16. Remove active imports of frontend backend-like modules. Delete or leave unused files only after confirming no imports remain with `rg`.
17. Update `vite.config.js` with the `/api` proxy.
18. Update `.gitignore` and `README.md`.
19. Run backend tests and frontend build.
20. Manually run FastAPI plus Vite and verify state load, CRUD mutation, CSV import/export, automatic transaction generation, and bank import preview/apply.

## Acceptance Criteria

- A FastAPI backend exists under `backend/` and starts locally with Uvicorn.
- `GET /api/health` returns a successful health response.
- `GET /api/state` initializes from defaults when no CSV file exists, runs startup automation backend-side, persists the server CSV, and returns state plus derived data.
- The backend reads and writes the same normalized app CSV schema currently used by the frontend.
- The React frontend no longer uses browser File System Access API for app app-state open/save.
- The React frontend no longer parses or serializes app CSV state.
- The React frontend no longer calculates dashboard summaries, envelope balances, account balances, warnings, startup automation, automatic recurrence, or bank import conversion.
- Existing UI workflows still work through backend APIs: month selection, transactions, automatic transactions, monthly setup, categories, subcategories, accounts, warnings, and bank import.
- CSV import replaces server state and CSV export downloads the current server state.
- Automatic transaction generation remains idempotent for the same `sourceRuleId + date`.
- Older CSVs that lack automatic transaction records or source rule markers still load.
- `npm run build` passes.
- Backend focused tests pass.

## Testing Requirements

Backend tests:

- Test file: `backend/tests/test_csv_storage.py`
  - Test type: unit.
  - Required cases:
    - Default state serializes and parses back with categories, subcategories, accounts, monthly setup, and metadata intact.
    - Older CSV without automatic transaction rows loads successfully.
    - CSV missing required app records raises a controlled error.
  - Command: from `backend/`, run `python -m pytest`.
  - Expected result: tests pass.

- Test file: `backend/tests/test_calculations.py`
  - Test type: unit.
  - Required cases:
    - Account balances match existing Bank/Cash and Credit Card semantics.
    - Available-to-assign equals selected-month income minus monthly funding.
    - Warning collection detects invalid date, invalid amount, and missing references.
  - Command: from `backend/`, run `python -m pytest`.
  - Expected result: tests pass.

- Test file: `backend/tests/test_automatic_transactions.py`
  - Test type: unit.
  - Required cases:
    - Monthly recurrence generates due transactions through the current local date.
    - Custom every-N-days recurrence generates expected due dates.
    - Existing generated transaction with matching `sourceRuleId` and date prevents duplicates.
    - Disabled and invalid rules generate nothing.
  - Command: from `backend/`, run `python -m pytest`.
  - Expected result: tests pass.

- Test file: `backend/tests/test_api.py`
  - Test type: integration.
  - Required cases:
    - `GET /api/state` returns `state`, `derived`, `automationStatus`, `config`, and `dataFileName`.
    - `POST /api/transactions` persists a transaction and returns updated derived values.
    - `POST /api/csv/import` replaces server state from CSV text and returns a fresh snapshot.
  - Command: from `backend/`, run `python -m pytest`.
  - Expected result: tests pass.

Frontend verification:

- Command: `npm run build`
- Test type: build/static verification.
- Expected result: Vite production build completes without errors.

Manual integration verification:

- Start backend with `python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000` from `backend/`.
- Start frontend with `npm run dev`.
- Verify the app loads initial/default state from the backend.
- Add, edit, and delete a transaction; confirm dashboard and warnings update after backend response.
- Add an automatic monthly rule due before today; reload and confirm due transactions are generated once.
- Export CSV; confirm it contains expected records.
- Import that CSV back; confirm state and rules are restored.
- Preview and apply a generic bank CSV import.

Tests intentionally out of scope:

- Full browser end-to-end test suite.
- Snapshot tests.
- Hosted deployment tests.
- Multi-user or auth tests.

## Edge Cases

- Backend data CSV does not exist on first run.
- Backend data directory exists but CSV is empty or malformed.
- Older CSV lacks automatic transaction rows and `source_rule_id`.
- CSV contains quoted commas, quotes, CRLF, or blank lines.
- Startup automation runs multiple times on the same day.
- Automatic rule starts in the future.
- Automatic rule has an end date before the start date.
- Custom recurrence interval is blank, zero, negative, or non-numeric.
- Month-end recurrence should clamp to the last valid day of shorter months.
- User deletes a generated transaction; current acceptable behavior is that it may regenerate unless the rule is disabled/deleted because duplicate protection is based on existing generated rows.
- Category changes should reset subcategory to the first valid backend-known subcategory for that category.
- Deleting categories, subcategories, or accounts may create warnings for existing transactions rather than cascading deletes.
- Bank CSV amount signs may imply type when no type column exists.
- Frontend starts while backend is offline; it should show a readable loading/error state.

## Risks

- Porting JavaScript date behavior to Python can introduce off-by-one or month-end recurrence differences.
- The app currently stores draft state in each browser; moving to one server CSV changes persistence semantics to shared local server state.
- Removing File System Access changes the meaning of Open/Save controls; UI labels must make the new workflow clear without adding a broad redesign.
- Pydantic alias handling must preserve camelCase JSON expected by existing React components.
- Concurrent writes are not protected by a database. For this local single-user app, simple load-modify-save is acceptable, but simultaneous requests can race.
- Legacy root-level JavaScript files may confuse future maintainers if left in place, but deleting them should be scoped carefully.

## Out Of Scope

- Database persistence.
- Authentication, authorization, or user accounts.
- Cloud deployment.
- Background scheduled jobs outside request-triggered startup automation.
- Multi-file project management or choosing among multiple server CSV files.
- Advanced transaction search/filtering.
- Full UI redesign.
- Adding a frontend test runner.

## Done Definition

- Backend FastAPI package is implemented with CSV-backed state ownership.
- Backend tests pass with `python -m pytest` from `backend/`.
- Frontend talks to backend through `src/lib/api-client.js`.
- Frontend no longer owns app CSV parsing/serialization, startup automation, calculations, recurrence generation, or bank import conversion.
- Vite dev proxy is configured.
- README accurately documents the backend workflow.
- `npm run build` passes.
- Manual local verification confirms core CRUD, import/export, automatic transactions, and bank import work through the backend.
