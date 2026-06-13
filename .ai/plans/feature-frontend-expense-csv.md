# Plan: Frontend Expense CSV

## Goal

Create a simple frontend-only expense and envelope-budgeting website, similar in behavior to the existing expense tracker workbook, with data persisted through the browser File System Access API to CSV files.

The MVP must include the user's requested improvements:

- File System Access API storage, not manual-only CSV download/import.
- Startup date automation that reads the last access date from the app CSV, compares it to the current date when the app runs, and updates app metadata/state.
- Monthly setup for month-specific envelope funding.
- True rollover tracking from one month to the next.
- Available To Assign, calculated as monthly income minus monthly envelope funding.
- Smarter category/subcategory behavior.
- Cleanup-ready bank CSV import flow.
- Simple status warnings for common data issues.

## Context

The workspace is not currently a Git repository. `git status --short --branch` fails with `fatal: not a git repository`, so Agent A could not create or check out the matching feature branch. This plan is still written under the intended branch name:

- Intended branch: `feature-frontend-expense-csv`
- Plan path: `.ai/plans/feature-frontend-expense-csv.md`

The existing source of truth is an Excel workbook and rendered workbook screenshots under:

- `outputs/expense-template/expense_tracker_template.xlsx`
- `outputs/expense-template/Dashboard.png`
- `outputs/expense-template/Transactions.png`
- `outputs/expense-template/Categories.png`
- `outputs/expense-template/Subcategories.png`
- `outputs/expense-template/Budget.png`
- `outputs/expense-template/Accounts.png`
- `outputs/expense-template/Monthly_Summary.png`
- `outputs/expense-template/Envelopes.png`
- `outputs/expense-template/Instructions.png`

The workbook has these sheets:

- `Dashboard`: quick view of spending, budgets, cashflow, selected month, selected month category spend, and envelope snapshot.
- `Transactions`: one row per transaction with date, type, category, subcategory, account, merchant/payee, description, amount, currency, essential flag, month, reimbursable flag, and notes.
- `Categories`: category list with group, default budget, tax/business readiness, and list values.
- `Subcategories`: category-to-subcategory map with envelope group, style, default monthly target, and notes.
- `Budget`: category-level monthly budget across 2026 months.
- `Accounts`: account/payment method list with opening and current balance formulas.
- `Monthly Summary`: formula-backed monthly expense, income, net cashflow, budget total, and category-by-month spending.
- `Envelopes`: practical envelope control sheet.
- `Instructions`: workflow guidance.

The current workbook is polished but has limitations the user explicitly wants addressed in the website MVP:

- Envelope targets currently live directly on the `Envelopes` sheet instead of a cleaner monthly setup surface.
- `Starting Balance` and `Rollover?` exist, but unused money does not automatically carry to the next month.
- There is no first-class `Available To Assign` number.
- Subcategories are not filtered by selected category.
- There is no bank import cleanup/mapping surface.
- Status warnings are not first-class.

Because there is no existing web codebase, Agent B should create a small static frontend rather than introducing a framework. Use vanilla HTML, CSS, and JavaScript unless the human later asks for React/Vite. This keeps the MVP easy to open, inspect, and maintain.

## Assumptions

- The first implementation should be frontend-only and run locally from static files.
- The target browser is Chromium-based enough to support the File System Access API.
- No backend, database, authentication, cloud sync, or server process should be added.
- Data should be saved to CSV files selected or created by the user through File System Access API prompts.
- Use one primary CSV file for app data to satisfy "save the data in a csv for now."
- The single CSV should store multiple record types using a normalized `record_type` column so transactions, accounts, categories, subcategories, monthly setup, and envelope metadata can live together.
- The app CSV should record `last_accessed_at` and `last_automation_run_at` on the `meta` row.
- The app may keep an in-memory model and use `localStorage` only as a non-authoritative draft/cache, not as the source of truth.
- The UI should be a working app screen, not a marketing landing page.
- Use the workbook's categories, subcategories, accounts, and example transactions as starter seed data.
- Currency defaults to `USD`, matching the workbook.
- Months should be represented as `YYYY-MM`.

## Open Questions

None.

## Files To Modify

No existing code files are expected to be modified because the workspace currently contains only workbook output artifacts and this planning artifact.

## Files To Add

- Path: `index.html`
  - Purpose: Static app shell for the expense tracker website.
  - Expected contents: Semantic layout with top app bar, file status controls, dashboard view, transactions view, monthly setup/envelopes view, categories view, accounts view, bank import view, and status warnings view.
  - Expected behavior: Loading the file in a supported browser presents the usable app immediately.

- Path: `styles.css`
  - Purpose: Responsive product UI styling.
  - Expected contents: Design tokens, app shell layout, tab/navigation styles, forms, tables, summary cards, warning states, responsive breakpoints.
  - Expected behavior: The app is usable on desktop and narrow mobile widths without overlapping text or controls.

- Path: `app.js`
  - Purpose: Main application composition, state management, view rendering, event handling, calculations, CSV persistence coordination, and File System Access API integration.
  - Expected exports/functions/classes: None required if using a browser script, but implementation should still be organized into focused internal functions.
  - Expected behavior: The full MVP workflow works from static files in a browser.

- Path: `data-schema.js`
  - Purpose: Centralize CSV schema, seed data, normalization helpers, validation lists, and app constants.
  - Expected exports/functions/classes:
    - `APP_SCHEMA_VERSION`
    - `MONTHS_2026`
    - `DEFAULT_CATEGORIES`
    - `DEFAULT_SUBCATEGORIES`
    - `DEFAULT_ACCOUNTS`
    - `DEFAULT_TRANSACTIONS`
    - `DEFAULT_MONTHLY_SETUP`
    - `CSV_COLUMNS`
    - `createInitialState()`
  - Expected behavior: App seed data mirrors the workbook closely enough to make the first load meaningful and includes blank access metadata.

- Path: `csv-storage.js`
  - Purpose: CSV serialization/parsing and File System Access API read/write helpers.
  - Expected exports/functions/classes:
    - `isFileSystemAccessSupported()`
    - `openCsvFile()`
    - `saveCsvFile(fileHandle, csvText)`
    - `saveCsvFileAs(csvText, suggestedName)`
    - `parseAppCsv(csvText)`
    - `serializeAppCsv(state)`
    - `parseGenericCsv(csvText)`
  - Expected behavior: App state can be loaded from and saved to a user-selected CSV file without a backend.

- Path: `calculations.js`
  - Purpose: Pure calculation and validation functions.
  - Expected exports/functions/classes:
    - `getTransactionMonth(dateString)`
    - `summarizeMonth(state, month)`
    - `summarizeCategoriesForMonth(state, month)`
    - `calculateEnvelopeBalances(state, month)`
    - `calculateAvailableToAssign(state, month)`
    - `calculateAccountBalances(state)`
    - `collectWarnings(state, month)`
  - Expected behavior: Dashboard, envelope, account, and warning outputs are derived consistently from app state.

- Path: `startup-automation.js`
  - Purpose: Pure startup automation based on the last access date recorded in the app CSV metadata.
  - Expected exports/functions/classes:
    - `runStartupAutomation(state, currentDate = new Date())`
  - Expected behavior: Compares recorded last access date with the current local date, updates access metadata, optionally advances selected month, and reports what changed.

- Path: `README.md`
  - Purpose: Local usage instructions and browser compatibility notes.
  - Expected contents: How to open the app, create/open/save CSV data with File System Access API, fallback warning for unsupported browsers, and a short data model note.

## Do Not Touch

- Do not modify `outputs/expense-template/expense_tracker_template.xlsx`.
- Do not modify or delete the existing rendered workbook screenshots in `outputs/expense-template/`.
- Do not add a backend server, database, API route, authentication layer, cloud sync, or external storage.
- Do not introduce build tooling, package managers, frameworks, bundlers, TypeScript, or dependencies unless the human explicitly approves that scope expansion.
- Do not require manual terminal commands for normal user workflows.
- Do not use browser downloads as the primary save path; File System Access API is the requested storage mechanism.
- Do not store authoritative data only in `localStorage`.
- Do not broaden the MVP into tax reporting, forecasting, bank API integrations, receipt OCR, multi-user sharing, or mobile-native app behavior.
- Do not invent unrelated categories, budget methods, or dashboard features beyond the workbook and user-requested MVP improvements.

## Function Signatures And Interfaces

Use ES modules. Add `<script type="module" src="./app.js"></script>` in `index.html`.

`data-schema.js`:

```js
export const APP_SCHEMA_VERSION = "1";
export const MONTHS_2026 = ["2026-01", "2026-02", "...", "2026-12"];
export const CSV_COLUMNS = [
  "record_type",
  "id",
  "last_accessed_at",
  "last_automation_run_at",
  "date",
  "month",
  "type",
  "category",
  "subcategory",
  "account",
  "merchant_payee",
  "description",
  "amount",
  "currency",
  "essential",
  "reimbursable",
  "notes",
  "group",
  "default_budget",
  "tax_business_ready",
  "envelope_style",
  "default_monthly_target",
  "monthly_target",
  "starting_balance",
  "rollover",
  "opening_balance",
  "account_type"
];

export function createInitialState();
```

`createInitialState()` returns:

```js
{
  selectedMonth: "2026-01",
  currency: "USD",
  lastAccessedAt: "",
  lastAutomationRunAt: "",
  categories: Category[],
  subcategories: Subcategory[],
  accounts: Account[],
  transactions: Transaction[],
  monthlySetup: MonthlySetup[]
}
```

Types are plain objects:

```js
type Transaction = {
  id: string,
  date: string,
  type: "Expense" | "Income" | "Transfer",
  category: string,
  subcategory: string,
  account: string,
  merchantPayee: string,
  description: string,
  amount: number,
  currency: string,
  essential: boolean,
  month: string,
  reimbursable: boolean,
  notes: string
};

type Category = {
  id: string,
  name: string,
  group: "Needs" | "Wants" | "Growth" | "Savings" | "Business" | "Other",
  defaultBudget: number,
  taxBusinessReady: "Yes" | "No" | "Maybe",
  notes: string
};

type Subcategory = {
  id: string,
  category: string,
  name: string,
  envelopeGroup: string,
  envelopeStyle: "Monthly bill" | "Variable" | "Sinking fund" | "Savings goal" | "Temporary",
  defaultMonthlyTarget: number,
  notes: string
};

type Account = {
  id: string,
  name: string,
  type: "Bank" | "Credit Card" | "Cash" | string,
  openingBalance: number,
  notes: string
};

type MonthlySetup = {
  id: string,
  month: string,
  category: string,
  subcategory: string,
  monthlyTarget: number,
  startingBalance: number,
  rollover: boolean
};
```

`csv-storage.js`:

```js
export function isFileSystemAccessSupported();
```

- Returns `boolean`.
- True only when required File System Access API functions are available.

```js
export async function openCsvFile();
```

- Calls `window.showOpenFilePicker()` for `.csv`.
- Returns `{ fileHandle, csvText }`.
- Throws a user-readable error if unsupported, canceled, or unreadable.

```js
export async function saveCsvFile(fileHandle, csvText);
```

- Calls `fileHandle.createWritable()`, writes `csvText`, and closes the writer.
- Returns `void`.
- Throws a user-readable error on permission/write failure.

```js
export async function saveCsvFileAs(csvText, suggestedName = "expense-data.csv");
```

- Calls `window.showSaveFilePicker()`.
- Returns `fileHandle`.
- Throws a user-readable error if unsupported, canceled, or unwritable.

```js
export function parseAppCsv(csvText);
export function serializeAppCsv(state);
export function parseGenericCsv(csvText);
```

- `parseAppCsv` maps normalized CSV rows into app state.
- `parseAppCsv` reads `last_accessed_at` and `last_automation_run_at` from the `meta` row when present and tolerates older CSVs where those columns are absent.
- `serializeAppCsv` writes every app entity into `CSV_COLUMNS`, including access metadata on the `meta` row.
- `parseGenericCsv` supports bank import cleanup and returns `{ headers: string[], rows: Record<string, string>[] }`.
- CSV behavior must handle quoted fields, commas inside quoted values, escaped quotes, CRLF/LF, and blank lines.

`calculations.js`:

```js
export function getTransactionMonth(dateString);
```

- Returns `YYYY-MM` for valid ISO-like dates.
- Returns `""` for invalid dates.

```js
export function summarizeMonth(state, month);
```

- Returns:

```js
{
  expenses: number,
  income: number,
  netCashflow: number,
  transactionCount: number,
  reimbursableTotal: number,
  essentialSpend: number,
  topCategory: string
}
```

```js
export function summarizeCategoriesForMonth(state, month);
```

- Returns one row per category:

```js
{ category: string, spend: number, budget: number }[]
```

```js
export function calculateAvailableToAssign(state, month);
```

- Formula: income transactions for `month` minus total monthly setup funding targets for `month`.
- Returns a number.

```js
export function calculateEnvelopeBalances(state, month);
```

- Returns one row per monthly setup envelope:

```js
{
  category: string,
  subcategory: string,
  monthlyTarget: number,
  startingBalance: number,
  rolloverIn: number,
  spending: number,
  available: number,
  overdrawn: boolean
}[]
```

- True rollover behavior:
  - For each envelope, calculate months in chronological order.
  - If `rollover` is true, unused available amount from the previous month carries into the current month.
  - If `rollover` is false, previous unused amount does not carry forward.
  - Starting balance applies as the opening balance for the first month or explicit monthly setup row.

```js
export function calculateAccountBalances(state);
```

- Returns one row per account:

```js
{ account: string, type: string, openingBalance: number, currentBalance: number }[]
```

- For bank/cash accounts: opening balance + income - expenses.
- For credit card accounts: opening balance - expenses + income, matching workbook behavior.

```js
export function collectWarnings(state, month);
```

`startup-automation.js`:

```js
export function runStartupAutomation(state, currentDate = new Date());
```

Returns:

```js
{
  state: nextState,
  changed: boolean,
  previousAccessDate: string,
  currentAccessDate: string,
  actions: string[]
}
```

Behavior:

- Convert `currentDate` to local `YYYY-MM-DD`.
- Read `state.lastAccessedAt`.
- If `lastAccessedAt` is blank, set `lastAccessedAt` and `lastAutomationRunAt` to today and make no other behavior changes.
- If `lastAccessedAt` is today, return `changed: false`.
- If `lastAccessedAt` is before today, update both access metadata fields to today.
- If the calendar month changed and today's `YYYY-MM` is supported, update `selectedMonth` to today's month.
- If `lastAccessedAt` is after today, update it to today and include an action label indicating the future date was corrected.
- Do not write files, touch localStorage, mutate inputs, or access the DOM.

- Returns:

```js
{
  severity: "info" | "warning" | "error",
  code: string,
  message: string,
  entityId?: string
}[]
```

- Must include warnings for:
  - Envelope overdrawn.
  - Assigned more money than income.
  - Missing category.
  - Missing subcategory.
  - Subcategory does not belong to selected category.
  - Transaction has no account.
  - Date format is invalid.
  - Amount is missing, zero, negative, or non-numeric.

`app.js` must include focused internal functions with these responsibilities:

```js
function setState(nextState, options = {});
function renderApp();
function renderDashboard();
function renderTransactions();
function renderMonthlySetup();
function renderCategories();
function renderAccounts();
function renderBankImport();
function renderWarnings();
function bindGlobalActions();
function addTransactionFromForm(formData);
function updateMonthlySetupFromForm(formData);
function mapBankImportRows(rows, mapping);
function runStartupAutomationOnLoad();
async function handleOpenCsv();
async function handleSaveCsv();
async function handleSaveCsvAs();
```

Validation behavior:

- Required transaction fields: `date`, `type`, `category`, `subcategory`, `account`, `amount`.
- Amounts must be stored as positive numbers; `type` determines cashflow direction.
- Subcategory dropdown options must be filtered to the selected category.
- Month fields must use `YYYY-MM`.
- Display warnings without blocking save.

Side effects:

- `handleOpenCsv`, `handleSaveCsv`, and `handleSaveCsvAs` interact with File System Access API.
- `runStartupAutomationOnLoad` calls pure startup automation after loading state from draft or CSV and marks state dirty when metadata changes.
- `setState` may update localStorage draft/cache.
- Render functions update DOM only.

## Implementation Steps

1. Create the static file structure: `index.html`, `styles.css`, `app.js`, `data-schema.js`, `csv-storage.js`, `calculations.js`, and `README.md`.
2. In `data-schema.js`, define the app state shape and seed data based on the workbook:
   - Categories from `Categories`.
   - Subcategories from `Subcategories`.
   - Accounts: Checking, Credit Card, Cash.
   - Example transactions from `Transactions`.
   - Initial monthly setup rows derived from subcategory default targets.
3. In `csv-storage.js`, implement robust CSV parse/serialize helpers.
4. In `csv-storage.js`, implement File System Access API helpers:
   - Open existing CSV.
   - Save to current file handle.
   - Save As new CSV.
   - Clear unsupported-browser messaging.
5. In `calculations.js`, implement pure calculation functions for:
   - Month extraction.
   - Monthly dashboard summary.
   - Category spending by selected month.
   - Available To Assign.
   - Envelope balances with real rollover.
   - Account balances.
   - Status warning collection.
6. In `startup-automation.js`, implement date-based startup automation:
   - Read `lastAccessedAt` from state.
   - Compare it to today's local `YYYY-MM-DD`.
   - Update `lastAccessedAt` and `lastAutomationRunAt` when needed.
   - Advance selected month when the current month differs and is supported.
   - Return action labels for UI/debug visibility.
7. In `index.html`, create the app shell:
   - Header with app title, selected month control, file status, Open CSV, Save, Save As.
   - Navigation tabs/buttons for Dashboard, Transactions, Monthly Setup, Categories, Accounts, Bank Import, Warnings.
   - Main content region.
8. In `styles.css`, build a restrained dashboard/tool UI:
   - Dense but readable controls.
   - Tables for transactions, monthly setup, accounts, and imports.
   - Compact KPI blocks.
   - Clear warning styling.
   - Responsive layout that avoids horizontal overflow where practical.
9. In `app.js`, wire initial state:
   - Load cached draft if present.
   - Otherwise load `createInitialState()`.
   - Run startup automation once after state load.
   - Mark app dirty if access metadata changed so the user can save it to CSV.
   - Render dashboard first.
10. Implement dashboard view:
   - Expenses, income, net cashflow, budget used/funding used, top category, transaction count.
   - Available To Assign.
   - Category spending table for selected month.
   - Envelope snapshot with available and overdrawn state.
11. Implement transactions view:
   - Add transaction form.
   - Editable table or row-level edit/delete controls.
   - Category selection filters subcategory choices.
   - Month is derived from date but may be shown read-only.
12. Implement monthly setup/envelopes view:
   - Month-specific funding target rows by category/subcategory.
   - Starting balance.
   - Rollover toggle.
   - Available, spending, rollover-in, and overdrawn values.
   - Available To Assign prominently visible.
13. Implement categories view:
   - Category table.
   - Subcategory table.
   - Basic add/edit/delete for subcategories.
   - Preserve category-to-subcategory relationship.
14. Implement accounts view:
   - Account list with opening balance.
   - Calculated current balance.
   - Add/edit/delete account controls.
15. Implement bank import view:
   - File picker for arbitrary bank CSV.
   - Show import preview table.
   - Mapping controls for date, merchant/payee, description, amount, account, category, subcategory, type.
   - Convert selected/mapped rows into transactions.
   - Do not overwrite app CSV until user saves.
16. Implement warnings view:
   - Show all `collectWarnings` output.
   - Link or label relevant transaction/envelope/account where possible.
17. Add save-state behavior:
   - Unsaved changes indicator.
   - Save writes to the current file handle.
   - Save As creates a new CSV file.
   - Open replaces current state after confirmation if unsaved changes exist.
18. Add README instructions:
   - Open `index.html` in Chrome or Edge.
   - Create/open/save CSV through app buttons.
   - Explain unsupported browser behavior.
   - Explain that app data is one normalized CSV for now.
   - Explain startup automation and that Save persists updated last access metadata to the CSV.
19. Manually verify in a Chromium browser:
   - First load works from static files.
   - Save As creates a CSV.
   - Open reads the CSV back.
   - Changes persist after Save and reload/open.
   - Dashboard numbers match seeded data.
   - Rollover calculation changes month-to-month.
   - Bank import maps at least a simple CSV sample.
   - Last access metadata updates when the app runs on a later date.

## Acceptance Criteria

- The website opens from `index.html` without requiring a backend or build command.
- The app clearly warns if File System Access API is unsupported.
- A user can create a new CSV file with Save As using File System Access API.
- A user can open an existing app CSV using File System Access API.
- A user can save changes back to the currently opened CSV file using File System Access API.
- App state serializes to one normalized CSV file.
- Reopening a saved CSV restores transactions, accounts, categories, subcategories, and monthly setup.
- Reopening or loading state runs startup automation that compares CSV `last_accessed_at` to today's local date.
- Newly saved CSV files include `last_accessed_at` and `last_automation_run_at` metadata on the `meta` row.
- Startup automation runs at most once per local date.
- Startup automation advances selected month when the calendar month changed and the current month is supported.
- Startup automation marks the app dirty when access metadata changes, but does not silently write to CSV without user save.
- Dashboard displays selected month expenses, income, net cashflow, top category, transaction count, and Available To Assign.
- Transactions can be added, edited, and deleted.
- Category selection filters subcategory options to matching subcategories.
- Monthly setup supports month-specific envelope funding targets.
- Available To Assign equals selected month income minus selected month envelope funding targets.
- Envelope balances include rollover from prior months when rollover is enabled.
- Envelope balances do not carry unused money forward when rollover is disabled.
- Bank import view can parse a generic CSV, let the user map columns, preview converted rows, and add them as transactions.
- Warnings identify overdrawn envelopes, over-assigned months, missing category/subcategory/account, invalid date, invalid amount, and mismatched category/subcategory.
- The UI is usable at desktop and mobile widths without major text/control overlap.

## Testing Requirements

Because this is a static frontend without a test runner, use focused manual verification for the MVP. Do not add a dependency-heavy test framework unless the human approves.

Required manual tests:

- Test file: `index.html`
  - Type: Manual browser integration.
  - Case: Open the app in Chrome or Edge.
  - Assertion: Dashboard renders with seeded workbook-like data and no console-blocking runtime errors.
  - Command: Open `index.html` in a Chromium browser.
  - Expected result: App is usable immediately.

- Test file: `csv-storage.js`
  - Type: Manual browser integration.
  - Case: Save As creates `expense-data.csv`; Open loads that CSV.
  - Assertion: A newly added transaction remains present after saving, refreshing, and reopening the CSV.
  - Command: Use app UI buttons.
  - Expected result: Data persists through File System Access API.

- Test file: `calculations.js`
  - Type: Manual functional verification through UI.
  - Case: Add income for selected month and add envelope funding.
  - Assertion: Available To Assign updates as `income - funding`.
  - Command: Use app UI.
  - Expected result: Value changes immediately and persists after save.

- Test file: `calculations.js`
  - Type: Manual functional verification through UI.
  - Case: Create two months for the same envelope, enable rollover, leave unused amount in month one.
  - Assertion: Month two shows rollover-in from month one.
  - Command: Use Monthly Setup view.
  - Expected result: Rollover is included only when enabled.

- Test file: `app.js`
  - Type: Manual UI validation.
  - Case: Choose `Groceries` in transaction form.
  - Assertion: Subcategory dropdown shows grocery subcategories such as `Food` and `Household Supplies`, not unrelated subcategories.
  - Command: Use Transactions form.
  - Expected result: Filtered dropdown behaves correctly.

- Test file: `app.js`
  - Type: Manual import verification.
  - Case: Import a simple bank CSV with date, description, and amount columns.
  - Assertion: Mapping preview converts rows into transactions and adds them without saving until the user clicks Save.
  - Command: Use Bank Import view.
  - Expected result: Converted transactions appear in Transactions view.

- Test file: `calculations.js`
  - Type: Manual validation verification.
  - Case: Add invalid transaction rows and over-assign envelopes.
  - Assertion: Warnings view lists appropriate warnings.
  - Command: Use Transactions and Monthly Setup views.
  - Expected result: Warning messages appear and update when fixed.

- Test file: `startup-automation.js`
  - Type: Focused function verification.
  - Case: `lastAccessedAt` is yesterday and current date is today.
  - Assertion: Result updates `lastAccessedAt` and `lastAutomationRunAt` to today and reports `changed: true`.
  - Command: Call `runStartupAutomation(state, fixedDate)` manually or from a lightweight browser console check.
  - Expected result: Metadata updates without mutating the original state.

- Test file: `startup-automation.js`
  - Type: Focused function verification.
  - Case: `lastAccessedAt` is already today.
  - Assertion: Result returns `changed: false`.
  - Command: Call `runStartupAutomation(state, fixedDate)` manually or from a lightweight browser console check.
  - Expected result: Automation does not repeatedly modify state.

- Test file: `startup-automation.js`
  - Type: Focused function verification.
  - Case: `lastAccessedAt` is in a prior month and today's month is supported.
  - Assertion: Result updates access metadata and sets `selectedMonth` to today's `YYYY-MM`.
  - Command: Call `runStartupAutomation(state, fixedDate)` manually or from a lightweight browser console check.
  - Expected result: Selected month advances.

Tests intentionally out of scope:

- Automated Playwright suite.
- Cross-browser compatibility outside Chromium-based browsers.
- Backend/API tests.
- Real bank provider integrations.
- Accessibility audit tooling beyond basic semantic markup and keyboard-usable controls.

## Edge Cases

- Browser does not support File System Access API.
- User cancels file picker or save picker.
- Previously opened file handle loses permission.
- CSV includes quoted commas, escaped quotes, blank lines, or CRLF line endings.
- CSV is missing expected columns.
- CSV includes unknown `record_type` values.
- CSV was created before `last_accessed_at` and `last_automation_run_at` existed.
- Transaction date is invalid or not parseable.
- Transaction amount is blank, zero, negative, or non-numeric.
- Transaction category exists but selected subcategory belongs to a different category.
- Selected month has no income.
- Selected month has funding targets greater than income.
- Envelope spending exceeds available balance.
- Rollover is enabled for a month after earlier months already have activity.
- Bank import CSV uses negative amounts for expenses.
- Bank import CSV uses one signed amount column instead of separate debit/credit columns.
- Duplicate imported transactions may be added; MVP should not attempt fuzzy deduplication beyond optional visible preview.
- System clock moves backward and recorded last access appears to be in the future.
- Current date is outside the supported month list.
- Startup automation updates metadata, but the user closes before saving the CSV.

## Risks

- File System Access API is not supported in all browsers. The MVP should be explicit that Chrome or Edge is required.
- Static `file://` module loading can be restricted in some browser configurations. If ES modules fail from `file://`, Agent B may need to document using a simple local static server, but should not add a backend app.
- One normalized CSV is simple for "CSV for now" but less human-friendly than multiple CSVs. This is acceptable for MVP and can be revisited later.
- Startup automation can create an unsaved state immediately on app open. The UI should make this understandable through the existing unsaved indicator.
- Rollover calculations can become confusing if users edit prior months after later months are already funded. Recalculate all months chronologically on every state change to avoid stale values.
- Bank CSV formats vary widely. The MVP should provide a flexible mapping UI but avoid promising automatic perfect cleanup.
- Without automated tests, calculation regressions are possible. Keep calculation functions pure and small so future tests can be added easily.

## Out Of Scope

- Backend persistence.
- Cloud sync.
- User accounts or authentication.
- Multi-user collaboration.
- Bank account API connections.
- Receipt upload/OCR.
- Tax exports and formal business reporting.
- Multi-currency conversion.
- Automated transaction categorization using AI.
- Advanced charting beyond simple dashboard summaries.
- Full parity with every workbook formula and formatting detail.
- Native mobile app behavior.

## Done Definition

- `index.html`, `styles.css`, `app.js`, `data-schema.js`, `csv-storage.js`, `calculations.js`, and `README.md` exist.
- The app opens and renders from static files.
- File System Access API open/save/save-as flow works in a supported browser.
- App state saves to and loads from one CSV file.
- Startup automation reads `last_accessed_at`, compares it to the current local date on app run, updates access metadata, and marks the app dirty when changed.
- Dashboard, transactions, monthly setup/envelopes, categories, accounts, bank import, and warnings views are implemented.
- Available To Assign is visible and calculated correctly.
- True month-to-month rollover works for rollover-enabled envelopes.
- Category/subcategory dropdown filtering works.
- Bank CSV import mapping can convert rows into transactions.
- Required warnings are visible and update when data changes.
- The UI has been checked at desktop and mobile widths.
- README explains setup, browser support, and CSV storage.
- Existing workbook and screenshot artifacts are unchanged.
