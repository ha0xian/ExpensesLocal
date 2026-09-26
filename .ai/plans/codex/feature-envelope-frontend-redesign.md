# Plan: Envelope frontend redesign and everyday usability

## Goal

Redesign the existing expense tracker using shadcn/ui around daily transaction entry and actionable envelope budgeting. Fix the review's transaction, saving, backup-import, empty-state, and budget-health issues while preserving stored data and existing calculations. Deliver a consistent desktop and mobile interface across all eight views.

This is a planning artifact only. Branch: `codex/feature-envelope-frontend-redesign`.

## Context

- React 19 + Vite, JavaScript/JSX, ordinary CSS, local UI components, existing Lucide icons. No router, frontend test runner, or `components.json`. Do not infer that the local shadcn-like components require a framework migration.
- `src/App.jsx` owns view selection, dirty-state guarding, import state, and API handlers. `useExpenseState` loads complete server snapshots. FastAPI owns calculations, validation, persistence, recurring generation, and CSV conversion.
- Desktop and 390px local previews were inspected during the preceding review with disposable data. The backend suite passed 43 tests at that time; implementation must rerun it.
- Transactions default silently to the first account, render all months, and issue a PATCH per keystroke. Accounts and automatic rules also write immediately. Account/category add forms treat Promise objects as success and clear prematurely.
- `App` only renders mutation errors when `loading && error`; mutations do not set loading. Category budget drafts can reset as successive save responses replace snapshots.
- Backup import replaces all application data immediately after file selection. Bank import appends rows and is a distinct operation; mapping callbacks can use stale mapping state and hide preview failures.
- `Table` treats an empty array as content. Dashboard percentages fall back to zero for zero budgets; its health label can report Good with no configuration. Eight equal KPI cards obscure priorities; the envelope preview silently truncates at eight.
- Category budgets are `categories[].defaultBudget`; envelope funding is `monthlySetup[].monthlyTarget`. These are distinct existing concepts. Do not combine them into a new financial calculation.
- Warnings have `code`, `message`, `severity`, and sometimes transaction `entityId`; envelope warnings do not contain an envelope ID. Navigation must not fabricate one or parse messages as identifiers.
- Current brand: green `#0f6b43`, off-white `#f7f8f5`, white surfaces, text `#161c1a`, muted `#65716d`, border `#dce3de`, 8px radius, system sans, E mark and Envelope wordmark. Existing eight navigation labels and view keys are stable. There are no public route slugs or analytics hooks in the reviewed shell. HTML title is currently Envelope Expense CSV.
- The requested design-taste-frontend skill explicitly excludes dashboards/dense tables. Apply its audit and preservation discipline; its landing-page imagery, hero, animation, and library prescriptions are not acceptance requirements for this product.

### Design specification

- Design read: personal budgeting workspace with a calm, trustworthy, practical visual language. Redesign-preserve: keep green identity, logo, all eight primary nav labels, and existing view keys. Revise layouts and task hierarchy.
- Inferred existing dials: variance 3, motion 1, density 6. Target `DESIGN_VARIANCE: 3`, `MOTION_INTENSITY: 2`, `VISUAL_DENSITY: 5`. These guide restraint, not marketing animations.
- Adopt actual shadcn/ui source components as the single component system, retaining Lucide and adapting existing application wrappers. Preserve the green identity through semantic theme tokens and shared component variants. No second UI kit, external font, chart package, standalone animation library, stock image, gradient hero, decorative illustration, or glass effect. CSS animation utilities required by the generated shadcn components are allowed.
- Light theme only. Use the audited green and neutral tokens; error red and warning amber are semantic. Use 4/8/12/16/24/32px spacing, 8px controls and 12px major panels, restrained borders, and shadows only for overlays. No large icon circles on every metric.
- System sans remains. Page titles 26-30px desktop/24px phone, main monetary figure 32-40px, body 14-16px, labels at least 12px. Monetary columns right aligned with tabular numerals. Body contrast at least 4.5:1 and interactive boundaries/focus indicators at least 3:1.
- Desktop at 1024px and above: 224px sidebar, content capped at 1440px with 24px padding; compact header with title, month, Add transaction, and More. Sidebar account/footer menu contains sign-out; More contains Download backup and Restore backup. Remove filenames, storage badges, access timestamps, and server implementation copy from everyday screens.
- Tablet below 1024px: compact header and accessible navigation disclosure containing the same eight views. Phone below 640px: title/navigation, month and Add transaction remain available; secondary actions stay collapsed. At 390x844, default header/navigation must use no more than 220px of height. Minimum 44px primary touch targets. No page-level horizontal scrolling at 320px.
- Dashboard order: prominent Available to assign with Monthly Setup action; compact income, expenses, net cashflow strip; actionable attention section; envelope list; category-spending summary; secondary figures in a compact details disclosure. Preserve top category, transaction count, and essential spend information there. No eight equal summary cards.
- Envelope preview: overdrawn first, then descending spending, then stable category/subcategory order; eight visible with explicit shown/total count and View all opening Monthly Setup. Label target, spending, and available clearly; rollover detail can expand.
- Category spending remains compared with category budgets and is labelled accordingly. Replace the generic Month Health score with specific budget-usage text. Zero budget and zero spend means No budget set; zero budget and positive spend means Unbudgeted spending; below 90% means Within budget; 90%-below 100% means Near budget; exactly 100% means Budget fully used; above 100% means Over budget. No success badge for an unbudgeted-spend row even if the aggregate has a positive budget.
- Transactions default to a readable ledger, not a grid of always-active inputs. Toolbar has search, category and account filters, plus Selected month/All months. Desktop rows show date, merchant (description fallback), category/subcategory, account, formatted amount/type, and Edit. Phone rows show the same essential information in stacked entries with an Edit action.
- Add/Edit transaction opens one shared labelled shadcn Sheet editor (side panel on desktop; full-width scrollable sheet on phone). Keep one mounted editor across breakpoint changes to preserve draft/focus. Keep existing field order; insert Account adjacent to Amount. Keep optional merchant/description/notes and recurrence options; do not remove data fields. Primary Add transaction uses this editor from every view.
- Other views retain their existing functionality with shared typography, layout, empty states, and deliberate field editing. Category budgets and Monthly Setup keep their explicit batch-save pattern. Non-budget fields in Accounts, Categories, and Automatic use Edit/Save/Cancel per field; no writes while typing. Explain the save scope next to the editor.
- Warnings use human-readable explanations and Review transaction / Review monthly setup actions. Raw codes/IDs belong in optional details. Unknown warning types open the full Warnings view or remain informational there.
- First use: when there are no transactions anywhere and all monthly target/starting-balance values are zero, show a compact Get started panel linking to Review accounts, Add income, and Fund envelopes. Default seeded accounts must not be mistaken for completed onboarding. No persistent onboarding flag or mandatory wizard. Existing users with an empty selected month get month-specific guidance instead.
- Migrate authentication presentation to shadcn Card, Button, Input and Field components while preserving authentication logic, labels, field names, autocomplete and form submission semantics. Keep animation to 120-180ms colour/opacity transitions and disable nonessential transitions with reduced motion.

### shadcn/ui setup and component contract

- User amendment dated 2026-09-26 explicitly requires shadcn/ui. This supersedes the original no-new-UI-system/dependency restrictions. Keep React/Vite and JavaScript/JSX; do not recreate the project or convert it to TypeScript/Next.js.
- Use the official shadcn registry for this implementation, with Radix-based components as the planning default and Lucide icons. Do not mix Radix and Base UI implementations or add third-party dashboard blocks. Verify the current CLI's supported style/base options before initialization and record the selected configuration; no unverified preset code is prescribed.
- Add Tailwind CSS v4 with its Vite plugin. Configure `components.json` with `rsc: false`, `tsx: false`, CSS variables enabled, `src/styles.css` as the CSS entry, and aliases resolving UI to `src/components/ui`, utilities to `src/lib/utils.js`, and hooks to `src/hooks`. Configure `@/*` -> `src/*` in `jsconfig.json` and matching `@` resolution in `vite.config.js`; retain the existing API proxy unchanged.
- Extend `src/styles.css` with Tailwind imports and semantic theme mappings rather than replacing it wholesale. Migrate global button/input/table rules that would override generated components into scoped application styles or remove them after all affected controls are migrated. Define brand colours, radii, typography and semantic success/warning variants centrally; use utility classes for layout rather than one-off colour/typography overrides on component instances.
- CLI workflow at implementation time: inspect `npx shadcn@latest info --json`, initialize the existing app, inspect component docs with `npx shadcn@latest docs <component>` and fetch returned official documentation, then preview additions with `--dry-run`/`--diff`. Existing `button.jsx`, `card.jsx`, `badge.jsx`, `separator.jsx`, and `skeleton.jsx` are custom files at registry destinations: merge reviewed upstream code deliberately, preserving needed variants and exports. Do not run blanket `--overwrite`, `--force`, or `add --all`.
- Install only components used by the planned screens: Button, Card, Badge, Separator, Skeleton, Sheet, AlertDialog, DropdownMenu, Input, Textarea, Select, Checkbox, Field, Label, Table, Alert, Empty, Toggle/ToggleGroup, Collapsible and Spinner. Install registry-declared supporting components/dependencies only when needed. Keep the app-specific sidebar composition and mobile Sheet instead of installing a dashboard block or Sidebar scaffold with unrelated features. Use Table with existing presentation helpers, not TanStack Table for this scope.
- Component mapping: TransactionEditor -> Sheet/SheetTitle/SheetDescription; ConfirmDialog -> controlled AlertDialog; header/account menus -> DropdownMenu; shared Table wrapper -> shadcn Table primitives with explicit empty row; EmptyState -> Empty primitives; Panel/Kpi -> Card; StatusPill -> Badge variants; SaveStatus -> Alert/Spinner/live text. Form layouts use FieldGroup/Field with FieldLabel and FieldError; controls have stable IDs, labels and `aria-invalid`. SelectItem and DropdownMenuItem stay inside their corresponding groups. Month scope uses ToggleGroup.
- ConfirmDialog must not close automatically when an asynchronous destructive request fails. Control its open state; dismiss only after success or explicit cancellation. Nested dirty confirmation over the transaction Sheet must restore focus to that sheet if cancelled. Use generated overlay focus/portal behavior rather than custom traps or manual overlay z-indexes. No toast dependency is required; durable inline error feedback remains mandatory.
- Source references verified for this amendment: [Vite installation](https://ui.shadcn.com/docs/installation/vite), [JavaScript configuration](https://ui.shadcn.com/docs/javascript), and [components.json](https://ui.shadcn.com/docs/components-json). Recheck relevant component documentation during implementation rather than assuming current generator output.

## Assumptions

- Planning, not implementation, is requested in this turn. No code or production data changes and no publishing during planning.
- shadcn/ui and its necessary Tailwind/primitive dependencies are explicitly in scope. Keep the current npm workflow and commit the resulting package lock changes with implementation, not with this planning amendment.
- Preserve the existing green identity; the optional visual-direction question is not a blocker. A later request for a new identity should amend this plan before implementation.
- Scope includes all improvements in the preceding review, including onboarding and warning actions. Broader banking features and new finance calculations are excluded.
- Currency comes from `state.currency`; do not switch to GBP based on the user's location or hardcode a currency icon.
- Default transaction date remains local today. If a saved transaction falls outside the selected month, keep the selected month and show a clear View transaction action that temporarily uses All months and highlights it.
- No blocking questions remained after the planner's grill-me pass and repository exploration. Safe choices are specified here rather than deferred to the implementer.

## Open Questions

None.

## Files To Modify

| Path | Purpose, functions/components, and expected behavior |
| --- | --- |
| `src/App.jsx` | Update mutation callbacks, `handleViewChange`, month change, sign-out wrapper, CSV handlers and bank mapping callbacks. Own transaction-editor/navigation intent and confirmation state. Return/await handler promises, catch failures at the invoking boundary, show errors independently of loading, protect dirty forms, and wire dashboard/warning actions. |
| `src/hooks/useExpenseState.js` | Extend `mutate` with pending/success/error status and `clearError`; prevent overlapping writes from this client and stale refresh snapshots. Keep last confirmed snapshot on failure. Separate initial loading from mutation progress. |
| `src/lib/api-client.js` | Add `updateTransactionFields(id, changes)` for the additive atomic PATCH form; keep all existing exports and same-origin behavior. |
| `vite.config.js` | Add the Tailwind Vite plugin and ESM-safe `@` alias pointing to `src`; preserve React configuration and the API proxy. |
| `src/lib/utils.js` | Retain the `cn` export and merge only generator-required compatibility changes; all generated imports resolve here. |
| `src/components/ui/button.jsx`, `src/components/ui/card.jsx`, `src/components/ui/badge.jsx`, `src/components/ui/separator.jsx`, `src/components/ui/skeleton.jsx` | Merge official shadcn implementations into these existing files; preserve application-required exports and semantic variants while replacing the custom lookalike foundation. |
| `src/components/AuthGate.jsx` | Replace presentation controls/layout with shadcn components only; preserve session/auth request logic, form field names, validation, autocomplete and status behavior. |
| `src/components/AppShell.jsx` | Compact desktop sidebar/mobile navigation container, skip link, main focus target. Preserve brand and `#app`. |
| `src/components/TopBar.jsx` | Month and Add transaction hierarchy; accessible secondary-action disclosure; Download backup/Restore backup labels. Remove server internals. Retain account/sign-out access via supplied shell/header controls. |
| `src/components/Tabs.jsx` | Preserve view IDs/labels; add `aria-current="page"`, mobile disclosure behavior, and focus management after navigation. |
| `src/components/ui.jsx` | Compose shadcn primitives behind the application wrappers. Fix `Table` empty-child handling using React child normalization; extend `EmptyState` with optional action; retain Kpi/Panel/Field/StatusPill exports and migrate Field callers as needed for accessible labels and FieldGroup composition. |
| `src/views/DashboardView.jsx` | Recompose hierarchy and onboarding, honest category-budget states, sorted/count-labelled envelope preview, and actionable attention items using existing server-derived values. |
| `src/views/TransactionsView.jsx` | Filtered/sorted read-only ledger, explicit empty/filter-no-results states, mobile entries, edit/delete actions and focus/highlight target. Extract form into shared editor. |
| `src/views/MonthlySetupView.jsx` | Restyle, clarify funding/rollover copy, preserve batch saves and drafts on errors, surface status, highlight/filter overdrawn envelopes for navigation intent. |
| `src/views/CategoriesView.jsx` | Await add operations before clearing, retain inputs on failure, use deliberate field editors, and preserve unsaved budget drafts across sequential partial successes. Disable conflicting edits while batch save runs. |
| `src/views/AccountsView.jsx` | Make `handleSubmit` async, clear only on confirmed success, protect pending/draft state; replace per-keystroke updates with explicit field saves. |
| `src/views/AutomaticTransactionsView.jsx` | Shared style/status/draft protection and deliberate field saves; preserve all recurrence options and existing generation semantics. |
| `src/views/BankImportView.jsx` | Clearly distinguish additive import from restore; show filename/count, preview loading/errors, and explicit import summary; disable Apply while the latest preview is pending/failed. |
| `src/views/WarningsView.jsx` | Review actions, human-readable presentation, optional technical details; use known entity IDs only. |
| `src/styles.css` | Consolidate audited tokens and responsive shell, dashboard, ledger, editor/dialog, field-editing, feedback, empty-state, auth and focus styles. Replace superseded rules instead of stacking overrides. |
| `backend/app/routes.py` | Extend only `patch_transaction` dispatch for the additive `{changes}` payload while preserving legacy `{field,value}` calls and snapshot/error shapes. |
| `backend/app/state_service.py` | Add `update_transaction_fields`; validate a merged candidate and persist once. Existing calculation/storage functions and legacy `update_transaction` behavior remain intact. |
| `backend/tests/test_api.py` | Focused atomic transaction update success/failure and legacy compatibility coverage, using existing temporary-storage fixtures. |
| `package.json` | Add `test:frontend` using the Node built-in test runner, Tailwind v4 and its Vite plugin, and only dependencies required by the selected official shadcn components; reuse existing compatible clsx, class-variance-authority, tailwind-merge and Lucide. No unrelated upgrades. |
| `package-lock.json` | Record exactly the shadcn/Tailwind-related dependency changes; verify clean installation with npm ci. |
| `README.md` | Update transaction save/filter behavior, backup-versus-bank-import instructions, frontend verification command, and partial-save limitations. Avoid unrelated architecture rewrites. |

## Files To Add

| Path | Purpose and expected exports/content |
| --- | --- |
| `components.json` | Official CLI configuration for this existing Vite JSX app, the selected Radix style, Lucide, semantic CSS variables and resolved aliases. |
| `jsconfig.json` | JavaScript editor/CLI path configuration: baseUrl `.`, `@/*` mapped to `./src/*`; no TypeScript migration. |
| `src/components/ui/sheet.jsx`, `src/components/ui/alert-dialog.jsx`, `src/components/ui/dropdown-menu.jsx` | Generated official overlay/menu component families and their title/description/trigger/content/action exports. |
| `src/components/ui/input.jsx`, `src/components/ui/textarea.jsx`, `src/components/ui/select.jsx`, `src/components/ui/checkbox.jsx`, `src/components/ui/field.jsx`, `src/components/ui/label.jsx` | Generated official form primitives including labelled field groups, errors and select grouping. |
| `src/components/ui/table.jsx`, `src/components/ui/alert.jsx`, `src/components/ui/empty.jsx`, `src/components/ui/toggle.jsx`, `src/components/ui/toggle-group.jsx`, `src/components/ui/collapsible.jsx`, `src/components/ui/spinner.jsx` | Generated official data, feedback, scope-switching and disclosure components. Review actual CLI output before installing; any additional transitive source file must be required by this selected component set and recorded in the verification report. |
| `src/components/TransactionEditor.jsx` | Shared create/edit dialog with local form draft, field validation, status and retained draft on failure; named `TransactionEditor` export. |
| `src/components/ConfirmDialog.jsx` | Controlled shadcn AlertDialog wrapper with labelled title, description, Cancel and explicit confirm, safe initial focus, focus restoration and awaited pending/error behavior. Named `ConfirmDialog` export. |
| `src/components/EditableField.jsx` | Reusable single-field Edit/Save/Cancel interaction; local draft, validation/status, awaited `onSave`, no writes while typing. Named `EditableField` export. |
| `src/components/SaveStatus.jsx` | Accessible idle/saving/saved/error feedback with retry/dismiss where applicable; no false saved indicator. Named `SaveStatus` export. |
| `src/lib/presentation.js` | Pure `filterTransactions`, `getBudgetUsage`, `getWarningDestination`, and `isFirstUse` helpers with the contracts below. No persistence or financial calculation engine. |
| `src/lib/presentation.test.js` | Node unit tests for filtering, zero-budget presentation, warning destinations and first-use detection. |
| `.ai/reviews/envelope-frontend-redesign.md` | Implementation-time concise verification record: commands/results, screenshot references, tested viewport widths, failure-path findings and known limits. Do not include private expense data. |

## Do Not Touch

- No changes to authentication/session behavior, passwords, user isolation, database schema, storage adapters, CSV schema, currency settings or production datasets.
- No changes to budget, rollover, available-to-assign, transfer, account-balance, or automatic-generation calculations. In particular, do not replace category default budgets with envelope targets.
- Preserve existing API endpoints, legacy PATCH payloads, response snapshots and all public exported API-client functions. Only the explicitly specified additive transaction PATCH payload is permitted.
- Do not edit root legacy `app.js`, `styles.css`, `calculations.js`, `csv-storage.js`, `data-schema.js`, `startup-automation.js`, spreadsheet outputs, deployment config or environment files. The existing `package-lock.json` may change only for the specified shadcn/Tailwind adoption.
- Preserve nav labels/keys, logo/wordmark, form field names, original field ordering apart from inserting the missing Account control, and `#app`. No routing-library migration.
- Only shadcn component prerequisites and Tailwind build dependencies are permitted; no additional UI kit, chart/form/state library, frontend test framework, paid service or React/Vite framework replacement.
- Never overwrite, stage or commit unrelated user changes.

## Function Signatures And Interfaces

### Transaction save boundary

- `updateTransactionFields(id: string, changes: object): Promise<Snapshot>` sends `PATCH /api/transactions/{id}` with `{changes}`.
- `update_transaction_fields(transaction_id: str, changes: dict) -> dict`: allowed keys are date, type, category, subcategory, account, merchantPayee, description, notes and amount. Reject empty/non-dict changes, unknown keys, and mixed legacy/new payloads with HTTP 400; missing ID is 404.
- Merge onto a copy of the stored transaction; preserve currency, essential, reimbursable, sourceRuleId and other metadata. Require strict valid YYYY-MM-DD, type in Expense/Income/Transfer, finite positive amount, existing account/category, and subcategory belonging to category. Validate the final pair together; do not overwrite an explicitly supplied valid subcategory when category changes. Recompute month from date. Normalize/persist exactly once only after all validation succeeds, then return the normal complete snapshot. Invalid candidates leave persisted state unchanged. This is atomic validation/persistence for one request, not a new cross-client concurrency guarantee.
- Legacy `{field,value}` continues to call the existing service unchanged. Existing create defaults remain compatible; the new UI explicitly supplies account.
- `TransactionEditor({open, transaction, state, config, onSave, onClose, onDirtyChange})`: transaction is null for create; onSave(form) resolves on confirmed success and rejects on error. Local errors retain the draft. Edit mode does not create/change a recurring rule; preserve existing rule metadata. Create mode retains Make automatic behavior.
- `App` owns create-vs-edit dispatch and dirty-close confirmation. Prevent duplicate submission and closing/navigating during pending writes. After success, close, announce success and return focus to the trigger or saved row.

### Save state and drafts

- `useExpenseState` retains existing return fields and adds `mutationStatus: 'idle'|'saving'|'saved'|'error'`, `isMutating: boolean`, and `clearError(): void`. `mutate(apiCall): Promise<Snapshot>` updates confirmed state only on success and throws on failure; use a synchronous ref lock to reject overlapping UI writes without issuing their requests. All callers await/catch. A refresh started before a successful mutation must not later replace that snapshot.
- `EditableField({label, value, renderInput, onSave, onDirtyChange, disabled})`: onSave(value) returns a promise; label identifies entity and field. Edit creates a draft; Save awaits; Cancel restores confirmed value. Keep draft/error on failed save. Do not reset dirty text merely because an unrelated snapshot arrives.
- Central dirty guarding covers transaction dialogs, account/category/automatic add forms, editable fields, monthly setup and category budgets. Use an owner-keyed dirty registry or equivalent aggregation so one clean child cannot clear another's dirty state. Confirm before view/month/sign-out/restore/close discards; retain existing beforeunload protection. Do not clear dirty state before a failed month change.
- Existing category-budget saves remain sequential because no atomic batch endpoint exists. Capture updates before saving; mark only confirmed fields clean; on failure stop, preserve remaining drafts, report that earlier fields were saved and allow retry of remaining fields only. Avoid snapshot-driven draft reset mid-batch. Do not promise rollback.
- `SaveStatus({status, message, onRetry, onDismiss})` uses polite live status for progress/success and alert for errors. Errors persist until retry/dismiss/new operation. No silent failed saves and no uncaught mutation rejections.

### Presentation and navigation

- `filterTransactions(transactions, {month, allMonths, query, category, account}) -> Transaction[]`: derive month from valid date prefix, exclude malformed-date rows only in month-specific mode; case-insensitive trimmed search across merchant, description and notes; exact category/account filters; descending date and stable original order for ties. Never mutate source arrays. All months reveals invalid dates for repair.
- `getBudgetUsage(budget: number, spend: number) -> {percent: number|null, label: string, tone: string}` implements the six states specified above; zero/negative/nonfinite budget uses the no-budget branches, never a fabricated 0% success. Percent can exceed 100; do not cap the displayed number.
- `getWarningDestination(warning, state) -> {view, transactionId?, attentionOnly?}|null`: known transaction entity IDs map to Transactions in All months with search/filters cleared and targeted row/editor; ENVELOPE_OVERDRAWN maps to Monthly Setup with attentionOnly; OVER_ASSIGNED to Monthly Setup. Do not parse warning message text. Missing entities get a visible unavailable message and full Transactions access, not a broken edit target.
- `isFirstUse(state) -> boolean`: no transactions across all months and every monthly target/starting balance is zero. Seeded categories/accounts alone do not suppress guidance. No backend write.
- Dashboard/Warnings receive `onNavigate(intent)` and Dashboard also receives `onAddTransaction({type?: 'Income'|'Expense'})`. When type Income is requested, use an existing Income category/subcategory if present; otherwise keep valid existing selections and let the user choose. Never create categories implicitly.
- On navigation, move focus to the destination heading or highlighted item. Unknown targets fall back safely. Month values remain YYYY-MM; render a readable month/year label. Filters are local UI state and reset on leaving Transactions, except an explicit warning/view-saved intent.

### Backup, import and destructive actions

- Selecting a backup reads the file locally into pending state; it never invokes import. ConfirmDialog names the file and says it will replace transactions, accounts, categories, monthly setup and recurring rules. Offer Download current backup; explicit Replace data is the sole submission trigger. Cancel is a no-op. Disable repeat confirmation while pending; failure retains current displayed state and pending file for retry.
- ConfirmDialog also protects row deletion; name the record and do not claim undo exists. Existing backend reference/cascade behavior remains unchanged; do not promise related data preservation beyond existing semantics.
- Bank import remains additive. Store the original CSV text and filename alongside mapping state; do not reconstruct CSV with unescaped headers. Keep mapping updates current and tag preview requests with a monotonically increasing ID so stale responses cannot win. Disable Apply until the latest preview succeeds; failure is visible with retry. Show row count and selected mapping before Apply. Preserve current backend mapping/conversion and lack of cross-file deduplication, describing this limitation honestly.

## Implementation Steps

1. Read this plan, check branch/worktree and local instructions, then inspect affected code. Capture populated and empty baseline screenshots using isolated synthetic state. Do not use production credentials/data for UI tests.
2. Configure Tailwind v4, aliases and shadcn for the existing JSX app. Review CLI diffs and merge the five existing UI files before adding the selected official primitives. Establish semantic brand tokens, remove conflicting global CSS, and confirm the existing app still builds. Then add presentation helpers and focused Node tests and fix shared empty-table handling.
3. Add the atomic transaction PATCH path and its integration tests. Verify legacy callers and failure-without-persistence before wiring the new editor.
4. Implement awaited mutation status, overlapping-write protection, draft aggregation and confirmation primitives. Fix premature form clearing and snapshot resets. Keep server calculations authoritative.
5. Build the shared transaction editor and ledger filters. Validate account choice, fractional amount, category/subcategory editing, out-of-month save feedback, pending protection, delete confirmation and retries.
6. Recompose shell/header/mobile navigation and migrate secondary actions. Preserve primary navigation names and create an obvious Add transaction action. Implement backup confirmation and reliable bank-preview state.
7. Recompose Dashboard, first-use/empty-month guidance and actionable warnings using existing derived fields. Label distinct budget concepts accurately and preserve access to all existing metrics/envelopes.
8. Apply shared shadcn form/control composition, field-save/status patterns and responsive styling to Monthly Setup, Categories, Accounts, Automatic and Bank Import. Migrate auth presentation to the same primitives without auth logic edits.
9. Run the essential automated and browser verification below; resolve failures; record concrete evidence and remaining limitations. Update README and state artifact to ready_for_review only after acceptance checks pass.
10. For implementation publishing, follow repository AGENTS.md: verify no unrelated working-tree changes, commit only implementation-owned changes, synchronize with origin/main and push directly to origin/main using a normal fast-forward operation. Never force. Stop/report on conflicts or failed checks/commit/push. Planning artifacts are not independently committed in this planning turn; do not stage them by a blanket git add.

## Acceptance Criteria

- [ ] The redesign uses real CLI-sourced shadcn/ui components throughout the eight views and auth presentation, with Tailwind v4, valid JSX configuration and working aliases. Existing custom lookalike components are migrated, not left as a second competing system.
- [ ] Brand tokens and shared semantic variants implement the green identity. No unrelated dependencies, bulk registry blocks, duplicate primitive libraries, remote fonts or TypeScript migration are introduced. `npm ci` and the production build succeed with the updated lockfile.
- [ ] Controlled Sheet/AlertDialog preserve drafts and focus through dirty-close confirmation and failed asynchronous actions. Form labels/errors and menus/selects use correct shadcn composition. Global CSS does not override component states.
- [ ] Green identity, E wordmark, eight nav labels and existing functional capabilities remain; the shared system is visibly consistent across desktop, phone and auth screens.
- [ ] Add transaction is directly accessible from every main view, including phone; new transactions use the account selected in the visible form.
- [ ] January scope excludes September transactions unless All months is selected. Combined search/category/account filters work; empty months and no matches have distinct explanatory actions.
- [ ] Editing a transaction sends one atomic request on Save; typing and Cancel send none. A multi-field failure changes no stored fields and preserves the editable draft.
- [ ] Other non-budget editable fields require explicit Save, retain failed drafts, and show status. Account/category creation resets only after success. Category-budget partial successes do not erase remaining changes.
- [ ] Mutation errors render while initial loading is false; no unhandled promise rejections. Rapid double-submit issues one mutation. Older refresh results cannot overwrite a confirmed mutation.
- [ ] Dirty prompts work for view/month/sign-out/restore/editor-close and reload; cancel preserves data. Pending operations cannot be inadvertently duplicated or interrupted by app navigation.
- [ ] Selecting/cancelling a backup sends no import request. Replace data is explicit and names its scope. Bank import is clearly additive and cannot apply a pending/failed latest mapping preview.
- [ ] Dashboard gives the main amount and next action visual priority; all former metrics remain accessible. Zero budgets never appear as healthy 0% spending. Exactly 100% is fully used, not over budget.
- [ ] Overdrawn envelopes lead the preview; shown/total and View all are present. Warning actions resolve existing transaction IDs or reach Monthly Setup with accurate fallback behavior.
- [ ] First-use guidance works with seeded accounts; an established user's empty month is not treated as a new account. Empty tables render real messages.
- [ ] At 390x844 the default header/navigation is at most 220px tall. At 320, 390, 768 and 1440px, no page-level horizontal overflow; financial tables that require horizontal scrolling have a contained, labelled scroll region. Transaction entries are readable without sideways scrolling on phones.
- [ ] Keyboard-only navigation reaches all controls; dialogs have initial focus, contained tab order, Escape/dirty handling and focus return; labels/focus/contrast/reduced-motion behavior satisfy the design specification.
- [ ] Existing calculations, recurrence generation, auth, data schema, currency and persistence behavior are unchanged except the explicitly additive atomic transaction edit path.

## Testing Requirements

Use the smallest tests that protect changed behavior; no new testing dependencies or snapshot suite.

| File or surface | Type | Required cases and assertions |
| --- | --- | --- |
| `src/lib/presentation.test.js` | Unit | Selected-month versus all-months; combined case-insensitive search and exact filters; invalid dates and stable order; no input-array mutation. Zero budget/no spend, zero budget/spend, 90%, exactly 100%, above 100% labels. Known/missing transaction and envelope warning destinations. Seeded first use versus established empty month. |
| `backend/tests/test_api.py` | Integration | Save date, amount, account and category/subcategory together and observe persisted snapshot/month after reload. Invalid candidate (including category mismatch, nonfinite/zero amount, invalid date, unknown field) returns 400 and leaves stored transaction unchanged. Missing ID returns 404. Legacy field/value patch remains supported. |
| Existing `backend/tests/` | Regression | Run existing suite once after final changes; existing calculation, CSV, auth, recurring and persistence tests still pass. Extend only if a specific new regression is uncovered. |
| Local synthetic browser session | Focused end-to-end/manual | Create with a non-first account and fractional amount; edit/save/reload; cancel without writes; duplicate-submit protection; failed write with retained draft/error and working retry. Verify selected-month filtering and View saved transaction action. |
| Local synthetic browser session | Focused end-to-end/manual | Account/category failed creation retains input; category-budget partial failure retains unsaved edits. Backup select/cancel does not change state; confirmed restore replaces only disposable state. Latest bank mapping wins, preview failure blocks Apply. Inspect network/console to verify request count and no uncaught errors. |
| Browser visual/accessibility pass | Manual | Empty and populated Dashboard/Transactions at 390 and 1440px; shell at 320 and 768px; smoke all other views. Check overdrawn/zero-budget and first-use states, mobile header height, keyboard focus/dialog behavior, contrast, reduced motion and long names/large currency values. |

Commands: repository root `npm ci`, `npx shadcn@latest info --json`, `npm run test:frontend` (script: `node --test src/lib/presentation.test.js`), `npm run build`; from backend `.\.venv\Scripts\python.exe -m pytest -q`. Expected: reproducible installation, CLI recognizes the correct JSX/CSS/alias/component configuration, zero test failures, production build succeeds, and documented browser checks pass. Include keyboard checks for Sheet plus nested AlertDialog, failed confirmation staying open, Select/DropdownMenu navigation, and global CSS interaction with disabled/invalid/focus states. Use tools available at implementation time to inspect UI and inject deterministic failures without changing production settings. Reuse existing temporary CSV fixture for automated API tests; use a separate temporary CSV path and localhost-only development process for browser review.

Intentionally out of scope: broad UI automation scaffolding, pixel snapshots, full security/load audits, new database test environments, tests that merely assert CSS class strings, and coverage improvements unrelated to these changes.

## Edge Cases

- No accounts/categories/subcategories: editor explains the prerequisite and links to the relevant view instead of submitting blank references.
- Historical month selected while recording today's expense: save succeeds with clear out-of-month feedback and an explicit way to see the record.
- Invalid historical records: remain discoverable in All months and warning navigation; do not silently delete or migrate them.
- Date edit moves a row out of the filter; deleted or renamed entities leave stale local filters; provide clear empty-state/reset behavior.
- Zero/negative budget, spending without funding, refunds represented by the existing model, exactly-full budgets, high percentages and negative available-to-assign: preserve existing arithmetic and display truthful states.
- User enters decimals, clears a numeric field while editing, or changes category and subcategory together: allow intermediate drafts; validate at Save.
- Slow/offline server, denied request, expired session, rapid mapping edits, repeated click, stale refresh, partial sequential category-budget save: keep confirmed state/drafts and actionable feedback.
- Dirty drafts in more than one component: one child becoming clean does not suppress another's navigation guard.
- CSV with quoted/newline headers: original CSV text feeds preview; no frontend reserialization corruption. Invalid backup failure keeps current UI and retry choice; backend CSV validation remains outside this redesign's scope.
- Very long labels, many ledger rows, unsupported stored references, and 320px width: preserve readable actions and contain overflow. No infinite-list/virtualization project in this scope.

## Risks

- Tailwind preflight and existing broad CSS selectors can change native and generated controls unexpectedly. Migrate/scoped styles deliberately and verify all screens, including authentication. Generated Radix composition and controlled overlay closure must be reviewed against current docs.
- CLI output varies over time and existing UI filenames collide with generated ones. Inspect diffs, preserve local behavior, and record dependency/configuration choices; never silently overwrite custom files.
- Scope spans shared CSS and all views; isolated design changes can regress controls elsewhere. The cross-view visual smoke pass is required.
- Whole-state persistence remains subject to existing cross-client concurrency limitations; client-side write protection is not a multi-user locking fix.
- Atomic transaction validation may reject edits to already-invalid legacy rows until their references are repaired. Show actionable validation without altering stored rows automatically.
- Category-budget updates remain partially committable across multiple requests; accurate progress and preserved drafts are required, not transactional claims.
- Category budgets and monthly envelope funding can disagree by design. Labels must prevent users mistaking one for the other; no new safe-to-spend prediction.
- Bank import still lacks cross-file duplicate detection and comprehensive bank-format normalization; this plan improves feedback and mapping reliability, not its conversion model.
- A selected branch does not isolate filesystem edits from another agent/task. Recheck worktree before implementation and publishing.

## Out Of Scope

New identity/logo, dark-mode toggle, any UI system beyond the requested shadcn/ui adoption, animations beyond micro-interactions, marketing pages, new financial charts/calculations, bank syncing, CSV deduplication, new recurring scheduling, multi-currency, transfer redesign, authentication behavior changes, URL routing migration, persistent onboarding, offline mode, backend-wide validation cleanup, bulk deletion, and undo requiring a new storage model.

## Done Definition

- [ ] All acceptance criteria verified with synthetic data and concise evidence in `.ai/reviews/envelope-frontend-redesign.md`.
- [ ] Essential frontend/backend tests and production build pass; no new uncaught runtime errors in tested flows.
- [ ] Desktop and mobile checks completed across all views; empty/error/pending/dirty states checked.
- [ ] shadcn source components and Tailwind setup are complete, necessary dependencies are locked, and no unrelated files, production data, dependencies, schemas or financial calculations changed.
- [ ] README accurately explains saves, filtering, backup restoration and bank import limitations.
- [ ] Branch-matched state JSON updated with outcome/open questions; final implementation summary links changed files and line numbers and reports checks/limitations.
- [ ] Implementation commit/push follows AGENTS.md; stop/report on synchronization conflicts or verification/publishing failures. This planning-only turn leaves its artifacts uncommitted.
