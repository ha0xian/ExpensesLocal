# Plan: Automatic Transactions

## Goal

Add recurring automatic transaction setup to the React expense tracker so a user can define templates for repeated income, expenses, and transfers, choose from preset recurrence options, enter custom recurrence settings, and have the app generate missing due transactions automatically when the app loads or a CSV is opened.

## Context

This is a frontend-only React + Vite app. Data is stored in browser localStorage as a draft and in one normalized CSV file through the File System Access API.

Relevant findings:

- `package.json` defines only `npm run dev`, `npm run build`, and `npm run preview`; there is no configured test runner.
- `src/App.jsx` owns app-level state mutations through `commit(...)`, routes views by `currentView`, and contains transaction add/update/delete logic.
- `src/hooks/useExpenseState.js` normalizes loaded state, persists drafts, and runs `runStartupAutomation(...)` during initial load and CSV replacement.
- `src/lib/startup-automation.js` currently updates `lastAccessedAt`, `lastAutomationRunAt`, and advances `selectedMonth` once per local day. This is the natural place to generate due automatic transactions.
- `src/lib/data-schema.js` defines `CSV_COLUMNS`, defaults, `MONTHS_2026`, and `createInitialState()`.
- `src/lib/csv-storage.js` parses and serializes `meta`, `category`, `subcategory`, `account`, `monthly_setup`, and `transaction` records. New app records can be added by extending the normalized CSV schema while preserving old CSV compatibility.
- `src/views/TransactionsView.jsx`, `src/views/CategoriesView.jsx`, and `src/views/MonthlySetupView.jsx` show the established form/table UI pattern using `Field`, `Panel`, and `Table`.
- `src/components/Tabs.jsx` contains the navigation tab registry.
- `src/lib/calculations.js` already validates transactions through warnings, derives transaction months with `getTransactionMonth(...)`, and uses positive amounts with `type` controlling cashflow direction.

Important repository constraint:

- This workspace is not currently a Git repository (`git status` fails with "not a git repository"), so Agent A could not create or check out the matching feature branch. The intended branch and artifact name is `feature-automatic-transactions`.

## Assumptions

- "Automatic transactions" means recurring transaction templates that generate concrete transaction rows.
- Preset recurrence choices should include at least `Weekly`, `Biweekly`, `Monthly`, `Quarterly`, and `Yearly`.
- "Custom option" means the user can choose `Custom` recurrence and enter a numeric interval plus a unit (`Days`, `Weeks`, `Months`, or `Years`).
- Automatic generation should run only when app startup automation runs, including initial draft load and opened CSV replacement.
- Generated transactions should be ordinary transaction records so all existing dashboard, envelope, account balance, warning, CSV save, and edit/delete behavior continues to work.
- Duplicate protection should prevent the same automatic rule from creating more than one generated transaction for the same due date.
- Automatic rules should be stored in the same app CSV as a new backward-compatible `record_type`, not a separate file.
- Automatic rules can be enabled or disabled; disabled rules are saved but do not generate transactions.

## Open Questions

None.

## Files To Modify

- Path: `src/lib/data-schema.js`
  - Purpose of change: Extend normalized state and CSV columns for automatic transaction rules.
  - Specific items to modify:
    - `CSV_COLUMNS`
    - `createInitialState()`
  - Expected behavior after modification:
    - State includes `automaticTransactions: []`.
    - CSV supports fields needed to persist automatic transaction rules without breaking existing record types.

- Path: `src/lib/csv-storage.js`
  - Purpose of change: Parse and serialize automatic transaction rules.
  - Specific functions to modify:
    - `parseAppCsv(csvText)`
    - `serializeAppCsv(state)`
  - Expected behavior after modification:
    - Rows with `record_type === "automatic_transaction"` hydrate into `state.automaticTransactions`.
    - `serializeAppCsv(...)` writes automatic transaction rows after existing setup records and before or after transactions consistently.
    - Existing CSVs without automatic transaction rows still load successfully.

- Path: `src/hooks/useExpenseState.js`
  - Purpose of change: Normalize automatic transaction rules.
  - Specific functions to modify:
    - `normalizeState(nextState)`
  - Expected behavior after modification:
    - `automaticTransactions` is always an array.
    - Numeric fields are coerced safely.
    - Boolean fields such as `enabled`, `essential`, and `reimbursable` are normalized.

- Path: `src/lib/startup-automation.js`
  - Purpose of change: Generate due concrete transactions from enabled automatic rules.
  - Specific functions to modify:
    - `runStartupAutomation(state, currentDate = new Date())`
  - Expected behavior after modification:
    - Startup automation still performs existing metadata and selected-month behavior.
    - It also appends any missing generated transactions due on or before the current local date.
    - It records actions such as `GENERATED_AUTOMATIC_TRANSACTIONS` when generation occurs.
    - It remains idempotent when called multiple times for the same day.

- Path: `src/App.jsx`
  - Purpose of change: Add automatic transaction CRUD handlers and route the new view.
  - Specific functions and areas to modify:
    - Imports
    - `currentView` routing
    - Add `handleAddAutomaticTransaction(form)`
    - Add `handleUpdateAutomaticTransaction(id, field, value)`
    - Add delete handler for `automaticTransactions`
  - Expected behavior after modification:
    - The user can navigate to an Automatic Transactions view.
    - Adding, editing, disabling, and deleting rules marks the app dirty and persists to local draft.

- Path: `src/components/Tabs.jsx`
  - Purpose of change: Add navigation entry.
  - Specific item to modify:
    - `VIEWS`
  - Expected behavior after modification:
    - A tab labeled `Automatic` or `Auto Transactions` appears and routes to the new view.

- Path: `src/styles.css`
  - Purpose of change: Add only minimal styles needed by the new view if existing `form-grid`, `grid`, `panel`, `table`, and `actions` classes are insufficient.
  - Specific classes to modify/add:
    - Prefer reusing existing classes.
    - Add a small helper class only if needed for custom recurrence controls.
  - Expected behavior after modification:
    - The new view remains responsive and consistent with current app styling.

- Path: `README.md`
  - Purpose of change: Document the automatic transaction feature and CSV compatibility.
  - Specific sections to modify:
    - `Features`
    - `CSV Workflow` or add a short `Automatic Transactions` section
  - Expected behavior after modification:
    - Users understand that automatic rules are saved in the app CSV and generate due transactions on app load/open.

## Files To Add

- Path: `src/views/AutomaticTransactionsView.jsx`
  - Purpose: User interface for creating, editing, disabling, and deleting automatic transaction rules.
  - Expected exports, functions, components, fixtures, or tests:
    - Export `AutomaticTransactionsView`.
    - Include a form for adding rules.
    - Include a table for inline editing existing rules.
    - Provide preset recurrence options plus custom interval controls.
    - Use existing `Field`, `Panel`, and `Table` components.

- Path: `src/lib/automatic-transactions.js`
  - Purpose: Encapsulate recurrence calculation and transaction generation so startup automation stays focused.
  - Expected exports:
    - `RECURRENCE_PRESETS`
    - `RECURRENCE_UNITS`
    - `normalizeAutomaticTransactionRule(rule, fallbackCurrency)`
    - `getDueDatesForRule(rule, currentDate, existingTransactions)`
    - `generateAutomaticTransactions(state, currentDate = new Date())`
  - Expected behavior:
    - Generate missing due concrete transactions for enabled rules.
    - Skip invalid rules.
    - Avoid duplicates using a stable generated transaction source marker in notes or a dedicated CSV field.

## Do Not Touch

- Do not change the public meaning of existing transaction fields: amounts stay positive and `type` controls cashflow direction.
- Do not alter dashboard, monthly setup, envelope, account balance, or warning calculation behavior except through ordinary generated transaction rows.
- Do not change existing CSV record types or remove existing CSV columns.
- Do not require a backend, database, service worker, cron job, or external scheduler.
- Do not add new dependencies unless absolutely necessary; this feature can be implemented with plain JavaScript date logic.
- Do not refactor unrelated views, styling, import flow, or calculations.
- Do not modify files under `dist/`, `node_modules/`, or `outputs/`.
- Do not make generated transactions hidden or special in the Transactions view; they should remain editable/deletable ordinary transactions.
- Do not implement automatic file saving. The app should mark itself dirty and let the user save to CSV using existing Save controls.

## Function Signatures And Interfaces

Add or use this rule shape in app state:

```js
{
  id: string,
  enabled: boolean,
  startDate: string, // YYYY-MM-DD
  endDate: string, // YYYY-MM-DD or ""
  frequency: "Weekly" | "Biweekly" | "Monthly" | "Quarterly" | "Yearly" | "Custom",
  customInterval: number,
  customUnit: "Days" | "Weeks" | "Months" | "Years",
  type: "Expense" | "Income" | "Transfer",
  category: string,
  subcategory: string,
  account: string,
  merchantPayee: string,
  description: string,
  amount: number,
  currency: string,
  essential: boolean,
  reimbursable: boolean,
  notes: string
}
```

CSV columns to add to `CSV_COLUMNS`:

```js
"enabled",
"start_date",
"end_date",
"frequency",
"custom_interval",
"custom_unit",
"source_rule_id"
```

The same CSV columns may be blank for unrelated record types.

`normalizeAutomaticTransactionRule(rule, fallbackCurrency)`

```js
function normalizeAutomaticTransactionRule(rule, fallbackCurrency = "USD"): AutomaticTransactionRule
```

- Coerce `amount` and `customInterval` to non-negative numbers.
- Coerce `enabled`, `essential`, and `reimbursable` to booleans.
- Default `frequency` to `Monthly`.
- Default `customInterval` to `1`.
- Default `customUnit` to `Months`.
- Default `currency` to `fallbackCurrency`.

`generateAutomaticTransactions(state, currentDate = new Date())`

```js
function generateAutomaticTransactions(state, currentDate = new Date()): {
  state: ExpenseState,
  generated: Transaction[],
  skipped: { ruleId: string, reason: string }[]
}
```

- Read `state.automaticTransactions`.
- For each enabled valid rule, compute all due dates from `startDate` through the current local date, respecting `endDate` if present.
- Skip due dates that already have a generated transaction for the same `sourceRuleId` and date.
- Return a new state object with generated transactions prepended to `state.transactions` when any are generated.
- Each generated transaction must include:

```js
{
  id: unique generated id,
  date: dueDate,
  month: getTransactionMonth(dueDate),
  type,
  category,
  subcategory,
  account,
  merchantPayee,
  description,
  amount,
  currency,
  essential,
  reimbursable,
  notes,
  sourceRuleId: rule.id
}
```

`runStartupAutomation(state, currentDate = new Date())`

```js
function runStartupAutomation(state, currentDate = new Date()): {
  state: ExpenseState,
  changed: boolean,
  previousAccessDate: string,
  currentAccessDate: string,
  actions: string[]
}
```

- Preserve the existing return shape.
- Append generated transaction changes before returning.
- Set `changed: true` if either existing metadata/month automation changed the state or automatic transactions were generated.

`AutomaticTransactionsView` props:

```js
function AutomaticTransactionsView({
  state,
  onAddAutomaticTransaction,
  onUpdateAutomaticTransaction,
  onDeleteAutomaticTransaction
})
```

- `onAddAutomaticTransaction(form)` returns `true` when the rule is accepted and `false` when validation fails.
- `onUpdateAutomaticTransaction(id, field, value)` updates one field and handles dependent category/subcategory behavior.
- `onDeleteAutomaticTransaction(id)` removes the rule.

Validation behavior in `App.jsx`:

- Required fields: `startDate`, `frequency`, `type`, `category`, `subcategory`, `account`, and positive `amount`.
- When `frequency === "Custom"`, require positive `customInterval` and valid `customUnit`.
- If `endDate` is present, it must not be earlier than `startDate`.
- When category changes, reset subcategory to the first valid subcategory for that category.
- Use `alert(...)` for validation failures to match existing app style.

## Implementation Steps

1. Add automatic transaction state defaults and CSV columns in `src/lib/data-schema.js`.
2. Add `src/lib/automatic-transactions.js` with recurrence presets, normalization, due-date calculation, duplicate detection, and generation.
3. Update `src/hooks/useExpenseState.js` to normalize `automaticTransactions`.
4. Update `src/lib/csv-storage.js` to parse and serialize `automatic_transaction` rows and `source_rule_id` on generated transactions.
5. Update `src/lib/startup-automation.js` to call `generateAutomaticTransactions(...)` and merge its result with existing metadata/month automation.
6. Add `src/views/AutomaticTransactionsView.jsx`.
7. Update `src/App.jsx` to import the view, add CRUD handlers, validate forms, and route the new view.
8. Update `src/components/Tabs.jsx` with the new tab.
9. Add minimal CSS only if the new view cannot be laid out with existing classes.
10. Update `README.md` with the feature summary and CSV persistence note.
11. Run `npm run build`.
12. Manually verify in the browser during development if practical:
    - Add an automatic monthly expense rule.
    - Reload or reopen data.
    - Confirm a due transaction appears once.
    - Confirm repeated reloads do not duplicate it.

## Acceptance Criteria

- The app has a visible Automatic Transactions tab/view.
- The user can create an automatic transaction rule from preset recurrence options.
- The user can choose `Custom` and enter a custom interval and unit.
- The user can edit, disable, enable, and delete automatic transaction rules.
- Automatic rules are persisted to app CSV and local draft state.
- Opening an older CSV without automatic transaction rows still works.
- On app startup/open, enabled rules generate missing due transactions up to the current local date.
- Generated transactions appear in the existing Transactions view and affect dashboard, monthly setup, envelope, account, and warning calculations like normal transactions.
- Running startup automation multiple times on the same day does not duplicate generated transactions.
- Invalid or incomplete automatic rules do not generate transactions.
- Generated transactions can be manually edited or deleted like other transactions.
- The app marks itself dirty when automatic transactions are generated so the user can save the generated rows to CSV.
- `npm run build` completes successfully.

## Testing Requirements

Because this repository has no configured unit test runner, keep automated verification to the existing build command unless Agent B first adds a small test setup with explicit approval.

Required verification:

- Command: `npm run build`
- Test type: build/static verification
- Expected passing result: Vite production build completes without errors.

Manual verification required:

- Test file to add or modify: none.
- Test type: manual integration check in the Vite app.
- Cases required:
  - Create a monthly automatic expense with a start date before today; reload the app and confirm exactly one due transaction is generated for each due date through today.
  - Reload again and confirm no duplicates are generated.
  - Create a custom recurrence rule, such as every 10 days, and confirm due dates are generated correctly.
  - Disable a rule and confirm it does not generate new transactions.
  - Save as CSV, reload/open the CSV, and confirm rules and generated transaction source markers persist.

Out of scope for this plan:

- Adding Playwright, Vitest, React Testing Library, or a broad automated UI suite.
- Snapshot tests.
- Testing browser file picker behavior beyond existing manual CSV workflow.

## Edge Cases

- Existing CSV has no automatic transaction records.
- A rule has `enabled: false`.
- `startDate` is missing or invalid.
- `endDate` is before `startDate`.
- Custom interval is blank, zero, negative, or non-numeric.
- A category has no subcategories.
- A referenced account/category/subcategory is later deleted.
- A generated transaction is manually deleted; duplicate protection based only on existing generated rows would allow regeneration on the next automation run. Agent B must decide within implementation to either accept this behavior or preserve deletion intent. Recommended behavior: if the user deletes a generated transaction, it may regenerate unless they disable/delete the rule.
- Month-end recurrence, such as starting on January 31, should clamp to the last valid day of shorter months.
- Future start dates should not generate transactions.
- End dates should stop generation after the end date.
- Local date calculation should avoid UTC off-by-one errors.

## Risks

- Date recurrence logic is easy to get subtly wrong for month ends and leap years.
- Duplicate detection needs a durable marker. Adding `source_rule_id` to CSV is backward-compatible, but older app versions will ignore it.
- Generated transaction IDs should be stable enough to avoid collisions but do not need to be deterministic if duplicate detection uses `sourceRuleId + date`.
- Startup automation currently returns early if it already ran today. Agent B must ensure due generation is considered when a CSV is opened for the first time that day and not accidentally skipped due to metadata from a different file.
- If a generated transaction is edited to remove or change its source marker, duplicate protection may stop working for that due date.
- There is no automated test runner, so recurrence correctness relies on focused manual verification unless a test setup is separately approved.

## Out Of Scope

- Automatic bank import.
- External scheduled background jobs.
- Push notifications or reminders.
- Automatic CSV file saving.
- Multi-currency conversions.
- Split transactions.
- Advanced recurrence rules such as "third Friday", business days only, weekends/holidays, or skip/pausing individual occurrences.
- A full audit log of generated, skipped, or deleted occurrences.

## Done Definition

- Automatic transaction rule data is normalized, saved, loaded, and serialized through the app CSV.
- The new view supports preset and custom recurrence setup.
- Startup/open automation generates due transactions and avoids duplicates.
- Existing transaction, dashboard, account, envelope, warning, import, category, and monthly setup behavior remains intact.
- `README.md` documents the feature.
- `npm run build` passes.
- Agent B manually verifies the essential recurrence and duplicate-protection workflows.
