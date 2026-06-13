# Plan: Migrate To React

## Goal

Migrate the already implemented vanilla JavaScript expense CSV app to a React + Vite frontend while preserving the existing MVP behavior, CSV format, File System Access API workflow, calculations, seed data, and styling direction.

The migration should improve maintainability by replacing string-based DOM rendering and global event delegation with focused React components, hooks, and pure utility modules.

This plan must also accommodate the latest MVP requirements from `.ai/plans/feature-frontend-expense-csv.md`, including startup date automation based on CSV metadata. Treat this plan as the current implementation plan for the React version, not as a narrow framework-only refactor.

## Context

The workspace is still not a Git repository. `git status --short --branch` fails with `fatal: not a git repository`, so Agent A could not create or check out the intended branch.

- Intended branch: `feature-migrate-to-react`
- Plan path: `.ai/plans/feature-migrate-to-react.md`

Current frontend implementation:

- `index.html`: static HTML shell with topbar, tab buttons, `#app` root, and `<script type="module" src="./app.js">`.
- `styles.css`: existing responsive product UI styles for dashboard panels, forms, tables, tabs, KPIs, warnings, and import mapping.
- `app.js`: large vanilla DOM app. Owns state, rendering, event binding, view switching, forms, transactions, monthly setup, categories, accounts, bank import, warnings, and File System Access API calls.
- `data-schema.js`: seed data, CSV columns, months, and `createInitialState()`.
- `csv-storage.js`: File System Access API helpers plus CSV parser/serializer.
- `calculations.js`: pure calculation and warning helpers.
- `README.md`: current static usage instructions.

Latest MVP requirements to carry forward from `feature-frontend-expense-csv`:

- File System Access API storage, not manual-only CSV download/import.
- Startup date automation that reads the last access date from the app CSV, compares it to the current date when the app runs, and updates app metadata/state.
- Monthly setup for month-specific envelope funding.
- True rollover tracking from one month to the next.
- Available To Assign, calculated as monthly income minus monthly envelope funding.
- Smarter category/subcategory behavior.
- Cleanup-ready bank CSV import flow.
- Simple status warnings for common data issues.

Important existing behavior to preserve:

- Frontend-only app.
- File System Access API open/save/save-as CSV workflow.
- One normalized app CSV with `record_type`.
- Local draft cache in `localStorage`.
- Dashboard with selected-month KPIs, Available To Assign, category spend, and envelope snapshot.
- Transactions add/edit/delete.
- Category selection filters subcategory options.
- Monthly Setup with funding target, starting balance, rollover, spending, and available balance.
- True month-to-month rollover.
- Category and subcategory management.
- Account management and calculated balances.
- Bank CSV import with mapping and preview.
- Status warnings.
- Startup date automation based on the last app access date recorded in the app CSV metadata.

The current `app.js` is the main migration risk because it mixes rendering, state mutation, browser side effects, forms, and domain workflow in one file. `calculations.js`, `csv-storage.js`, and `data-schema.js` are mostly reusable as-is, though imports may need path changes after moving into `src/`.

React best-practice constraints for this migration:

- Use Vite for a lightweight React app.
- Use React state for app state and view state.
- Keep calculation and CSV logic pure and outside components.
- Avoid defining child components inline inside parent components.
- Avoid unnecessary dependencies.
- Prefer primitive dependencies in hooks.
- Use `useMemo` only for expensive derived values such as dashboard summaries, warnings, envelope rows, and account balances.
- Put File System Access API calls in explicit event handlers, not effects.

## Assumptions

- The human wants React now because the vanilla MVP is implemented and the app has enough stateful UI to justify a framework.
- The React migration should preserve implemented vanilla behavior while adding any latest-plan requirements that the vanilla implementation does not yet contain.
- Use React + Vite, not Next.js.
- Use JavaScript, not TypeScript, unless the human separately asks for TypeScript.
- Do not redesign the UI during migration.
- Keep the existing visual language from `styles.css` and adapt class names only where needed.
- Keep the existing normalized CSV schema compatible with files created by the vanilla app.
- Add backward-compatible CSV metadata fields for last access tracking; older CSV files without these fields must still open.
- The latest plan is allowed to extend the CSV schema only through backward-compatible metadata columns on the existing `meta` record.
- Keep the app frontend-only.
- It is acceptable to require `npm install` and `npm run dev` after migration.
- It is acceptable that `index.html` no longer works by double-clicking directly because Vite will be the app runner/build tool.

## Open Questions

None.

## Files To Modify

- Path: `index.html`
  - Purpose of change: Convert from static vanilla shell to Vite React root document.
  - Specific changes:
    - Replace static app shell markup with `<div id="root"></div>`.
    - Replace `<script type="module" src="./app.js"></script>` with `<script type="module" src="/src/main.jsx"></script>`.
    - Keep title and viewport metadata.
  - Expected behavior after modification: Vite mounts the React app into `#root`.

- Path: `styles.css`
  - Purpose of change: Move or adapt styles for React/Vite.
  - Specific changes:
    - Prefer moving contents to `src/styles.css`.
    - If keeping root-level `styles.css`, import it from `src/main.jsx`.
    - Preserve existing visual style and responsive behavior.
    - Add any missing component state classes needed by React.
  - Expected behavior after modification: The React app looks substantially the same as the vanilla app.

- Path: `data-schema.js`
  - Purpose of change: Move to `src/lib/data-schema.js` or keep root file only if imported cleanly by Vite.
  - Specific changes:
    - Preserve exports and seed data.
    - Add `last_accessed_at` and `last_automation_run_at` to `CSV_COLUMNS` in a backward-compatible way.
    - Add state metadata fields for last access tracking.
    - Update any browser compatibility issues if needed.
  - Expected behavior after modification: Initial state and CSV schema remain compatible with vanilla app data, while newly saved CSVs record app access metadata.

- Path: `csv-storage.js`
  - Purpose of change: Move to `src/lib/csv-storage.js` and keep storage/parsing behavior stable.
  - Specific changes:
    - Update import path for `data-schema.js`.
    - Preserve `isFileSystemAccessSupported`, `openCsvFile`, `saveCsvFile`, `saveCsvFileAs`, `parseAppCsv`, `serializeAppCsv`, and `parseGenericCsv`.
    - Extend the `meta` record to parse and serialize `last_accessed_at` and `last_automation_run_at`.
    - Keep old CSV files readable when those fields are absent.
  - Expected behavior after modification: Existing CSV files open successfully, and newly saved CSV files include last-access metadata.

- Path: `calculations.js`
  - Purpose of change: Move to `src/lib/calculations.js`.
  - Specific changes:
    - Update import path for `data-schema.js`.
    - Preserve calculation signatures.
    - Keep functions pure.
  - Expected behavior after modification: Dashboard, envelope, account, and warning outputs match vanilla app behavior.

- Path: `README.md`
  - Purpose of change: Update run instructions from static direct-open to Vite workflow.
  - Specific changes:
    - Add install/start/build commands.
    - Explain File System Access API still requires Chrome or Edge.
    - Explain CSV compatibility with previous vanilla app files.
  - Expected behavior after modification: A user can run the React app locally.

## Files To Add

- Path: `package.json`
  - Purpose: Define React/Vite dependencies and scripts.
  - Expected contents:
    - Dependencies: `@vitejs/plugin-react`, `vite`, `react`, `react-dom`.
    - Scripts: `dev`, `build`, `preview`.
  - Expected behavior: `npm install`, `npm run dev`, and `npm run build` work.

- Path: `src/main.jsx`
  - Purpose: React entry point.
  - Expected exports/functions/classes: None.
  - Expected behavior: Imports React, ReactDOM, app styles, and renders `<App />` into `#root`.

- Path: `src/App.jsx`
  - Purpose: Top-level app component and state coordinator.
  - Expected exports/functions/classes:
    - Default export `App`.
  - Expected behavior: Owns app state, selected view, file handle/name, dirty state, bank import state, and passes callbacks/data to child components.

- Path: `src/styles.css`
  - Purpose: Vite-imported stylesheet.
  - Expected contents: Migrated content from current `styles.css` plus any small React-specific additions.
  - Expected behavior: Same visual system as vanilla app.

- Path: `src/lib/data-schema.js`
  - Purpose: Migrated schema/seed module.
  - Expected exports: Same as current `data-schema.js`.

- Path: `src/lib/csv-storage.js`
  - Purpose: Migrated CSV/File System Access module.
  - Expected exports: Same as current `csv-storage.js`.

- Path: `src/lib/calculations.js`
  - Purpose: Migrated calculation module.
  - Expected exports: Same as current `calculations.js`.

- Path: `src/lib/startup-automation.js`
  - Purpose: Date-based startup automation for app-open housekeeping.
  - Expected exports/functions/classes:
    - `runStartupAutomation(state, currentDate = new Date())`
  - Expected behavior: Compares the CSV-recorded last access date to the current date when the app runs, applies date-based updates, and returns updated state plus a summary of changes.

- Path: `src/hooks/useExpenseState.js`
  - Purpose: Encapsulate state initialization, normalization, draft caching, and mutation helpers.
  - Expected exports/functions/classes:
    - `useExpenseState()`
  - Expected behavior: Returns normalized `state`, `setExpenseState`, and helpers without exposing localStorage details to UI components.

- Path: `src/components/AppShell.jsx`
  - Purpose: Layout wrapper for topbar, tabs, and main content.
  - Expected exports/functions/classes:
    - `AppShell`
  - Expected behavior: Renders app chrome and accepts children for active view.

- Path: `src/components/TopBar.jsx`
  - Purpose: Header controls.
  - Expected exports/functions/classes:
    - `TopBar`
  - Expected behavior: Renders title, support message, selected month control, file status, Open CSV, Save, and Save As buttons.

- Path: `src/components/Tabs.jsx`
  - Purpose: View navigation.
  - Expected exports/functions/classes:
    - `Tabs`
  - Expected behavior: Renders view tabs and active state.

- Path: `src/components/ui.jsx`
  - Purpose: Small reusable presentational primitives.
  - Expected exports/functions/classes:
    - `Kpi`
    - `Panel`
    - `Table`
    - `Field`
    - `StatusPill`
    - `EmptyState`
  - Expected behavior: Reduces repeated JSX and keeps views readable.

- Path: `src/views/DashboardView.jsx`
  - Purpose: Dashboard screen.
  - Expected exports/functions/classes:
    - `DashboardView`
  - Expected behavior: Renders KPIs, category spend, and envelope snapshot from props.

- Path: `src/views/TransactionsView.jsx`
  - Purpose: Transactions add/edit/delete screen.
  - Expected exports/functions/classes:
    - `TransactionsView`
  - Expected behavior: Replaces vanilla transaction form/table with controlled or semi-controlled React inputs.

- Path: `src/views/MonthlySetupView.jsx`
  - Purpose: Monthly setup/envelope screen.
  - Expected exports/functions/classes:
    - `MonthlySetupView`
  - Expected behavior: Renders Available To Assign, funded total, overdrawn count, setup rows, and update controls.

- Path: `src/views/CategoriesView.jsx`
  - Purpose: Category and subcategory management.
  - Expected exports/functions/classes:
    - `CategoriesView`
  - Expected behavior: Add/edit/delete categories and subcategories.

- Path: `src/views/AccountsView.jsx`
  - Purpose: Account management and balance display.
  - Expected exports/functions/classes:
    - `AccountsView`
  - Expected behavior: Add/edit/delete accounts and display calculated balances.

- Path: `src/views/BankImportView.jsx`
  - Purpose: Generic bank CSV import/mapping workflow.
  - Expected exports/functions/classes:
    - `BankImportView`
  - Expected behavior: Reads generic CSV with file input, maps columns, previews converted transactions, and adds them.

- Path: `src/views/WarningsView.jsx`
  - Purpose: Warning list screen.
  - Expected exports/functions/classes:
    - `WarningsView`
  - Expected behavior: Renders warning count and warning table.

## Do Not Touch

- Do not modify `outputs/expense-template/expense_tracker_template.xlsx`.
- Do not modify or delete workbook screenshots in `outputs/expense-template/`.
- Do not change the normalized CSV field names or `record_type` meanings unless a backward-compatible parser is also implemented.
- Do not remove backward compatibility for CSV files created before `last_accessed_at` existed.
- Do not remove File System Access API support.
- Do not replace File System Access API with download-only CSV export.
- Do not add a backend, API server, database, auth, cloud sync, or external persistence.
- Do not redesign the application visually.
- Do not add Redux, Zustand, TanStack Query, router libraries, UI kits, chart libraries, or CSS frameworks for this migration.
- Do not convert to TypeScript in this migration.
- Do not rewrite calculation behavior unless needed to preserve existing semantics in React.
- Do not leave the old `app.js` wired into the running app after migration.

## Function Signatures And Interfaces

`src/main.jsx`:

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(<App />);
```

`src/App.jsx`:

```jsx
export default function App();
```

Responsibilities:

- Hold `currentView`.
- Hold `currentFileHandle`.
- Hold `currentFileName`.
- Hold `dirty`.
- Hold `bankImport`.
- Use `useExpenseState()` for app state.
- Use `useMemo` for derived values:
  - selected month summary
  - category spend
  - envelope balances
  - available to assign
  - account balances
  - warnings
- Provide event handlers for file open/save/save-as and view-level mutations.

`src/hooks/useExpenseState.js`:

```js
export function useExpenseState();
```

Returns:

```js
{
  state,
  setExpenseState,
  replaceState,
  resetDraft
}
```

Behavior:

- Lazily initialize from `localStorage.getItem("expense-csv-draft-v1")`.
- Fallback to `createInitialState()`.
- Normalize numeric and boolean fields.
- Persist draft to localStorage whenever state changes through `setExpenseState` or `replaceState`.

`src/lib/data-schema.js`:

Keep current exports:

```js
export const APP_SCHEMA_VERSION;
export const MONTHS_2026;
export const CSV_COLUMNS;
export const DEFAULT_CATEGORIES;
export const DEFAULT_SUBCATEGORIES;
export const DEFAULT_ACCOUNTS;
export const DEFAULT_TRANSACTIONS;
export const DEFAULT_MONTHLY_SETUP;
export function createInitialState();
```

Add metadata to state:

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

Add CSV columns:

```js
"last_accessed_at",
"last_automation_run_at"
```

These columns belong on the existing `meta` row. `parseAppCsv` must tolerate older CSVs where the columns are absent.

`src/lib/csv-storage.js`:

Keep current exports and signatures:

```js
export function isFileSystemAccessSupported();
export async function openCsvFile();
export async function saveCsvFile(fileHandle, csvText);
export async function saveCsvFileAs(csvText, suggestedName = "expense-data.csv");
export function parseAppCsv(csvText);
export function serializeAppCsv(state);
export function parseGenericCsv(csvText);
```

Metadata behavior:

- `serializeAppCsv(state)` must write `last_accessed_at` and `last_automation_run_at` on the `meta` record.
- `parseAppCsv(csvText)` must read those fields when present.
- Older CSV files without those columns must parse as `lastAccessedAt: ""` and `lastAutomationRunAt: ""`.

`src/lib/calculations.js`:

Keep current exports and signatures:

```js
export function getTransactionMonth(dateString);
export function summarizeMonth(state, month);
export function summarizeCategoriesForMonth(state, month);
export function calculateAvailableToAssign(state, month);
export function calculateEnvelopeBalances(state, month);
export function calculateAccountBalances(state);
export function collectWarnings(state, month);
```

`src/lib/startup-automation.js`:

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
- If `lastAccessedAt` is blank, treat this as first run:
  - Set `lastAccessedAt` to today.
  - Set `lastAutomationRunAt` to today.
  - Do not make other behavioral changes.
- If `lastAccessedAt` is the same local date as today:
  - Return `changed: false`.
  - Do not repeatedly run automation.
- If `lastAccessedAt` is before today:
  - Compare the previous access date to today.
  - Update `lastAccessedAt` and `lastAutomationRunAt` to today.
  - If the calendar month changed, set `selectedMonth` to the current `YYYY-MM` when that month exists in `MONTHS_2026`; otherwise preserve the selected month.
  - Recalculate derived values through existing calculation functions during render; do not persist derived totals.
  - Add action labels such as `UPDATED_LAST_ACCESS`, `ADVANCED_SELECTED_MONTH`.
- If `lastAccessedAt` is after today, preserve user data but update `lastAccessedAt` to today and include an action label `LAST_ACCESS_IN_FUTURE_CORRECTED`.
- The function must be pure: no localStorage, no file writes, no DOM access.

Component interfaces:

```jsx
export function AppShell({ topBar, tabs, children });
export function TopBar({
  selectedMonth,
  months,
  fileName,
  dirty,
  fileSystemSupported,
  onMonthChange,
  onOpenCsv,
  onSaveCsv,
  onSaveAsCsv
});
export function Tabs({ currentView, onViewChange });
```

View interfaces:

```jsx
export function DashboardView({
  state,
  summary,
  availableToAssign,
  categoryRows,
  envelopeRows,
  warningCount
});

export function TransactionsView({
  state,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction
});

export function MonthlySetupView({
  state,
  availableToAssign,
  envelopeRows,
  onUpdateMonthlySetup,
  onFillMissingMonthlySetup
});

export function CategoriesView({
  state,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory
});

export function AccountsView({
  state,
  accountBalances,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount
});

export function BankImportView({
  state,
  bankImport,
  onLoadBankCsv,
  onUpdateMapping,
  onAddImportedTransactions
});

export function WarningsView({ warnings });
```

Error behavior:

- File picker cancellation should not crash the app.
- Open/save errors should show a user-visible message, using `alert()` for MVP unless Agent B adds a small inline error banner.
- Invalid form submissions should be blocked with a concise user-visible message.
- Warnings remain non-blocking and should not prevent save.

Validation behavior:

- Preserve current required transaction fields.
- Preserve positive amount storage.
- Preserve category-filtered subcategory lists.
- Preserve `YYYY-MM` month handling.
- Preserve status warning semantics.

Side effects:

- File System Access API calls happen only in explicit button/input event handlers.
- LocalStorage writes happen only through state hook helpers.
- Derived calculations should not mutate state.
- Startup automation runs after state is loaded from CSV or draft and before the first user-facing render when possible; it updates app state and draft cache, but does not automatically write to the CSV file without an explicit user save.

## Implementation Steps

1. Create `package.json` with Vite/React dependencies and scripts:
   - `dev`: `vite`
   - `build`: `vite build`
   - `preview`: `vite preview`
2. Create `src/` directory structure:
   - `src/main.jsx`
   - `src/App.jsx`
   - `src/styles.css`
   - `src/lib/`
   - `src/hooks/`
   - `src/components/`
   - `src/views/`
3. Update `index.html` to mount React through Vite.
4. Move `styles.css` contents to `src/styles.css`.
5. Move `data-schema.js`, `csv-storage.js`, and `calculations.js` into `src/lib/`.
6. Update import paths in moved modules.
7. Leave root-level old files temporarily during migration if useful, but ensure the running app imports only `src/` modules.
8. Add CSV metadata support:
   - Add `last_accessed_at` and `last_automation_run_at` columns.
   - Add `lastAccessedAt` and `lastAutomationRunAt` to state.
   - Parse and serialize the fields on the `meta` record.
   - Keep older CSV files valid when these fields are absent.
9. Implement `src/lib/startup-automation.js`:
   - Compare recorded `lastAccessedAt` with today's local date.
   - Update access metadata.
   - Advance selected month when the calendar month changed and the month is supported.
   - Return a pure result object with action labels.
10. Implement `useExpenseState()`:
   - Lazy draft load.
   - Normalization copied from current `normalizeState()`.
   - Draft persistence.
   - Run startup automation once during initial load and after a CSV is opened.
   - Mark state dirty when automation changes metadata so the user can save the updated CSV.
11. Implement small UI primitives in `src/components/ui.jsx`.
12. Implement `AppShell`, `TopBar`, and `Tabs`.
13. Build `App.jsx` state coordinator:
   - Current view state.
   - File state.
   - Dirty state.
   - Bank import state.
   - Derived values via `useMemo`.
   - Mutation handlers currently embedded in `app.js`.
14. Port `renderDashboard()` to `DashboardView`.
15. Port `renderTransactions()` to `TransactionsView`.
   - Use local form state for the add form.
   - Use controlled inputs or row-local updates for edit fields.
   - Maintain category-to-subcategory filtering.
16. Port `renderMonthlySetup()` and `monthlySetupTable()` to `MonthlySetupView`.
   - Avoid invalid form/input wiring from the current vanilla table.
   - Use explicit row update handlers.
17. Port `renderCategories()` to `CategoriesView`.
18. Port `renderAccounts()` to `AccountsView`.
19. Port `renderBankImport()` and `importMapper()` to `BankImportView`.
   - Keep file input for bank CSV import.
   - Keep File System Access API only for app CSV open/save.
20. Port `renderWarnings()` to `WarningsView`.
21. Port helper logic from `app.js`:
   - `subcategoriesFor`
   - `guessMapping`
   - `normalizeType`
   - `mapBankImportRows`
   - `uniqueId`
   - `sum`
   - `money` if still needed
   - Move reusable non-React helpers to a small `src/lib/app-helpers.js` only if it keeps components cleaner.
22. Remove or archive root-level `app.js` after React app is working.
23. Decide whether to remove root-level moved modules:
   - If moved to `src/lib`, delete root `data-schema.js`, `csv-storage.js`, and `calculations.js` after verifying imports.
   - Keep only if README documents them as legacy, which is not recommended.
24. Update `README.md` with React/Vite setup:
   - `npm install`
   - `npm run dev`
   - `npm run build`
   - `npm run preview`
   - Browser support and CSV compatibility notes.
   - Startup automation behavior and the fact that users must save to persist updated `last_accessed_at` to the CSV.
25. Run `npm install`.
26. Run `npm run build`.
27. Run `npm run dev` and manually verify the app in Chrome/Edge.
28. Verify an existing vanilla-generated app CSV can open and render correctly.
29. Verify startup automation updates access metadata on load.
30. Verify saving from React produces a CSV that can be reopened by React.

## Acceptance Criteria

- The app runs with `npm run dev`.
- The app builds with `npm run build`.
- `index.html` is a Vite React entry document.
- The app no longer loads root-level `app.js`.
- React components replace string-based `innerHTML` view rendering.
- Dashboard behavior matches the vanilla app.
- All latest MVP requirements from `.ai/plans/feature-frontend-expense-csv.md` are represented in the React implementation.
- Transactions can still be added, edited, and deleted.
- Subcategory dropdowns are still filtered by selected category.
- Monthly setup and rollover behavior match the vanilla app.
- Available To Assign still equals selected month income minus selected month funding.
- Categories and subcategories can still be added, edited, and deleted.
- Accounts can still be added, edited, and deleted, and calculated balances still display.
- Bank CSV import can still parse, map, preview, and add transactions.
- Warnings still display the existing warning cases.
- File System Access API open/save/save-as still works in Chrome/Edge.
- Existing CSV files produced by the vanilla implementation can be opened by the React implementation.
- CSV files saved by the React implementation use the same schema.
- CSV files saved by the React implementation include `last_accessed_at` and `last_automation_run_at` metadata on the `meta` record.
- When the app runs, it compares the CSV-recorded last access date to the current local date and updates access metadata in state.
- Startup automation runs at most once per local date.
- If the month changed since last access and the current month is supported, startup automation updates `selectedMonth` to the current month.
- Startup automation marks the app dirty when metadata changes, but does not silently write to the CSV file without user save.
- README reflects the new React/Vite workflow.
- README includes the latest MVP behavior notes: CSV ownership, startup automation, File System Access API browser support, and compatibility with older app CSVs.

## Testing Requirements

Required test/verification set:

- Test file or command: `npm run build`
  - Type: Build verification.
  - Required case: Build the React app.
  - Assertion: Vite build completes without errors.
  - Expected passing result: Successful production build output.

- Test file or command: `npm run dev`
  - Type: Manual browser integration.
  - Required case: Open Vite dev URL in Chrome or Edge.
  - Assertion: App renders dashboard with seeded data and no blocking console errors.
  - Expected passing result: Dashboard is usable.

- Test file: existing or newly saved CSV from vanilla app.
  - Type: Manual compatibility verification.
  - Required case: Open CSV with React app.
  - Assertion: Transactions, categories, subcategories, accounts, monthly setup, selected month, and currency load correctly.
  - Expected passing result: Data appears in matching views.

- Test file: React-saved CSV.
  - Type: Manual persistence verification.
  - Required case: Add a transaction, Save As, refresh the app, Open the saved CSV.
  - Assertion: The transaction persists and dashboard calculations include it.
  - Expected passing result: Saved CSV round-trips correctly.

- Test area: `src/lib/calculations.js`
  - Type: Manual functional verification through UI.
  - Required case: Verify Available To Assign and rollover behavior against known inputs.
  - Assertion: Values match the latest MVP plan behavior, including real rollover and income-minus-funding Available To Assign.
  - Expected passing result: No calculation regression from the vanilla app and no gap against the latest plan.

- Test area: `TransactionsView`
  - Type: Manual UI verification.
  - Required case: Change category in add form and edit table.
  - Assertion: Subcategory options update to matching category.
  - Expected passing result: No invalid stale subcategory selection unless intentionally shown as warning.

- Test area: `BankImportView`
  - Type: Manual UI verification.
  - Required case: Import simple bank CSV and map date/description/amount.
  - Assertion: Preview rows convert and can be added as transactions.
  - Expected passing result: Imported rows appear in Transactions view.

- Test area: `src/lib/startup-automation.js`
  - Type: Focused function verification, manual or automated.
  - Required case: `lastAccessedAt` is yesterday and current date is today in the same month.
  - Assertion: Returned state has today's `lastAccessedAt` and `lastAutomationRunAt`; `selectedMonth` is unchanged.
  - Expected passing result: `changed` is true and actions include `UPDATED_LAST_ACCESS`.

- Test area: `src/lib/startup-automation.js`
  - Type: Focused function verification, manual or automated.
  - Required case: `lastAccessedAt` is in a prior supported month and current date is in a later supported month.
  - Assertion: Returned state has today's metadata and `selectedMonth` advances to current `YYYY-MM`.
  - Expected passing result: actions include `ADVANCED_SELECTED_MONTH`.

- Test area: `src/lib/startup-automation.js`
  - Type: Focused function verification, manual or automated.
  - Required case: `lastAccessedAt` is already today.
  - Assertion: Returned result has `changed: false`.
  - Expected passing result: automation does not repeatedly mutate state.

Optional but recommended if Agent B wants lightweight automated coverage without broad setup:

- Add Vitest only if the migration already introduces test dependencies willingly.
- If added, test `calculations.js` and `csv-storage.js` only.
- Do not add Playwright or broad E2E tests for this migration.

Tests intentionally out of scope:

- Cross-browser testing outside Chrome/Edge.
- Backend/API tests.
- Visual redesign QA beyond preserving current layout.
- Full accessibility audit tooling.

## Edge Cases

- Existing CSV made by vanilla app has all current `record_type` rows and must continue to load.
- Existing CSV made before last-access metadata exists must load with blank access metadata, then initialize it on first React run.
- Existing localStorage draft was written by vanilla app and should either load safely or be ignored with fallback state.
- User cancels File System Access API prompts.
- Browser does not support File System Access API.
- Bank import CSV input remains a normal file input and should not conflict with app CSV open/save.
- Component state should not retain stale category/subcategory options after category edits.
- Deleting a category can make existing transactions invalid; warnings should catch this as before.
- Editing prior-month setup should recalculate later rollover values.
- Vite dev server origin may affect File System Access API permissions; user may need to grant file permissions again.
- User opens the app after the system clock moved backward.
- Current date is outside the supported month list.
- Startup automation updates state but the user closes the tab before saving the CSV.

## Risks

- The current `app.js` has a lot of behavior packed into one file, so migration could accidentally drop small workflows if Agent B ports by memory instead of checking each render/handler path.
- CSV compatibility is easy to break if field names or object property mappings change.
- Last-access automation can create surprising dirty state on startup; the UI should make it clear that metadata changed and Save will persist it.
- The current monthly setup table has awkward vanilla form wiring; React should improve it, but the behavior must be verified carefully.
- File handles cannot be serialized across refreshes. React should preserve the existing behavior: CSV content can be cached, but file handle must be reacquired after reload.
- Adding Vite means direct `file://` opening is no longer the normal workflow.
- If the vanilla implementation lacks a latest-plan behavior, Agent B must implement the latest-plan behavior in React rather than preserving the omission.

## Out Of Scope

- UI redesign.
- TypeScript conversion.
- State management libraries.
- Routing libraries.
- Component libraries.
- Charting libraries.
- Backend persistence.
- Cloud sync.
- Automated E2E test suite.
- Breaking the existing CSV schema. The only allowed schema extension is backward-compatible metadata columns for `last_accessed_at` and `last_automation_run_at`.
- Adding new finance features beyond the latest MVP requirements from `.ai/plans/feature-frontend-expense-csv.md`.

## Done Definition

- React + Vite project files are present.
- Root `index.html` mounts React.
- The old root `app.js` is no longer used by the app.
- Reusable domain modules are under `src/lib/`.
- View logic is split into React components under `src/views/`.
- Shared UI elements are split into `src/components/`.
- App state/draft handling is encapsulated in `src/hooks/useExpenseState.js`.
- `npm install` has been run or dependency setup is documented if install is not possible in the current environment.
- `npm run build` passes.
- `npm run dev` has been manually verified in Chrome or Edge.
- File System Access API open/save/save-as is verified.
- Vanilla CSV compatibility is verified.
- Startup automation updates `last_accessed_at` from the CSV metadata on app run and marks the state dirty when it changes.
- The React app satisfies the latest MVP scope from `.ai/plans/feature-frontend-expense-csv.md`.
- README explains the new workflow.
- Existing workbook artifacts in `outputs/expense-template/` are untouched.
