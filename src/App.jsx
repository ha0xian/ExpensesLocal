import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./components/AppShell.jsx";
import { ConfirmDialog } from "./components/ConfirmDialog.jsx";
import { SaveStatus } from "./components/SaveStatus.jsx";
import { Tabs } from "./components/Tabs.jsx";
import { TopBar } from "./components/TopBar.jsx";
import { TransactionEditor } from "./components/TransactionEditor.jsx";
import { useExpenseState } from "./hooks/useExpenseState.js";
import * as api from "./lib/api-client.js";
import { getWarningDestination } from "./lib/presentation.js";
import { AccountsView } from "./views/AccountsView.jsx";
import { AutomaticTransactionsView } from "./views/AutomaticTransactionsView.jsx";
import { BankImportView } from "./views/BankImportView.jsx";
import { CategoriesView } from "./views/CategoriesView.jsx";
import { DashboardView } from "./views/DashboardView.jsx";
import { MonthlySetupView } from "./views/MonthlySetupView.jsx";
import { TransactionsView } from "./views/TransactionsView.jsx";
import { WarningsView } from "./views/WarningsView.jsx";

const VIEW_TITLES = { dashboard: "Dashboard", transactions: "Transactions", automatic: "Automatic", monthly: "Monthly Setup", categories: "Categories", accounts: "Accounts", import: "Bank Import", warnings: "Warnings" };
const EMPTY_BANK_IMPORT = { filename: "", csvText: "", headers: [], rows: [], mapping: {}, previewRows: [], status: "idle", error: "", requestId: 0 };

export default function App({ session, onSignOut }) {
  const { state, derived, config, loading, error, mutationStatus, isMutating, clearError, refresh, mutate } = useExpenseState();
  const [currentView, setCurrentView] = useState("dashboard");
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const dirtyOwners = useRef(new Map());
  const [discardAction, setDiscardAction] = useState(null);
  const [editor, setEditor] = useState({ open: false, transaction: null, initialType: undefined, returnFocusId: "add-transaction" });
  const [transactionIntent, setTransactionIntent] = useState(null);
  const [monthlyIntent, setMonthlyIntent] = useState(null);
  const [pendingBackup, setPendingBackup] = useState(null);
  const [bankImport, setBankImport] = useState(EMPTY_BANK_IMPORT);
  const previewRequest = useRef(0);
  const hasUnsavedChanges = dirtyOwners.current.size > 0;

  const setDirty = useCallback((owner, dirty) => {
    const wasDirty = dirtyOwners.current.has(owner);
    if (dirty === wasDirty) return;
    if (dirty) dirtyOwners.current.set(owner, true);
    else dirtyOwners.current.delete(owner);
    setDirtyVersion((value) => value + 1);
  }, []);
  const dirtyHandler = useCallback((owner) => (dirty) => setDirty(owner, dirty), [setDirty]);
  const sharedDirty = useMemo(() => dirtyHandler(currentView), [currentView, dirtyHandler]);
  const editorDirty = useMemo(() => dirtyHandler("transaction-editor"), [dirtyHandler]);
  const runGuarded = useCallback((action) => { if (hasUnsavedChanges) setDiscardAction(() => action); else action(); }, [hasUnsavedChanges, dirtyVersion]);
  const focusWorkspace = useCallback(() => requestAnimationFrame(() => document.querySelector("#app h2, #app h1, #app")?.focus()), []);
  const changeView = useCallback((view, intent = null) => runGuarded(() => { dirtyOwners.current.clear(); setCurrentView(view); setTransactionIntent(view === "transactions" ? intent : null); setMonthlyIntent(view === "monthly" ? intent : null); focusWorkspace(); }), [focusWorkspace, runGuarded]);

  useEffect(() => { if (!hasUnsavedChanges) return undefined; const warn = (event) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [hasUnsavedChanges, dirtyVersion]);

  const selectedMonth = state?.selectedMonth || "";
  const summary = derived?.summary || {};
  const warnings = derived?.warnings || [];
  const openEditor = useCallback(({ transaction = null, type, triggerId = "add-transaction" } = {}) => setEditor({ open: true, transaction, initialType: type, returnFocusId: triggerId }), []);
  const closeEditor = useCallback(() => runGuarded(() => { dirtyOwners.current.delete("transaction-editor"); setEditor((value) => ({ ...value, open: false })); requestAnimationFrame(() => document.getElementById(editor.returnFocusId)?.focus()); }), [editor.returnFocusId, runGuarded]);

  const handleMonthChange = useCallback((month) => runGuarded(async () => { await mutate(() => api.updateSelectedMonth(month)); dirtyOwners.current.clear(); }), [mutate, runGuarded]);
  const handleSignOut = useCallback(() => runGuarded(() => onSignOut()), [onSignOut, runGuarded]);
  const handleSaveTransaction = useCallback(async (form) => {
    const snapshot = editor.transaction
      ? await mutate(() => api.updateTransactionFields(editor.transaction.id, { date: form.date, type: form.type, category: form.category, subcategory: form.subcategory, account: form.account, amount: form.amount, merchantPayee: form.merchantPayee, description: form.description, notes: form.notes }))
      : await mutate(() => api.createTransaction(form));
    const saved = editor.transaction || snapshot.state.transactions[0];
    dirtyOwners.current.delete("transaction-editor");
    setEditor((value) => ({ ...value, open: false }));
    if (saved?.month !== snapshot.state.selectedMonth) setTransactionIntent({ allMonths: true, transactionId: saved.id, savedOutsideMonth: true });
    requestAnimationFrame(() => document.getElementById(saved?.id ? `transaction-${saved.id}` : editor.returnFocusId)?.focus());
    return snapshot;
  }, [editor, mutate]);

  const selectBackup = useCallback(() => { const input = document.createElement("input"); input.type = "file"; input.accept = ".csv,text/csv"; input.onchange = async (event) => { const file = event.target.files?.[0]; if (file) setPendingBackup({ name: file.name, csvText: await file.text() }); }; input.click(); }, []);
  const restoreBackup = useCallback(async () => { await mutate(() => api.importCsv(pendingBackup.csvText)); setPendingBackup(null); dirtyOwners.current.clear(); }, [mutate, pendingBackup]);
  const downloadBackup = useCallback(() => api.exportCsv(), []);

  const loadBankCsv = useCallback(async (file) => { if (!file) return; const csvText = await file.text(); const id = ++previewRequest.current; setBankImport({ ...EMPTY_BANK_IMPORT, filename: file.name, csvText, status: "loading", requestId: id }); try { const result = await api.bankImportPreview(csvText, null); if (previewRequest.current === id) setBankImport({ filename: file.name, csvText, ...result, status: "ready", error: "", requestId: id }); } catch (reason) { if (previewRequest.current === id) setBankImport((value) => ({ ...value, status: "error", error: reason.message })); } }, []);
  const updateMapping = useCallback(async (name, value) => { const id = ++previewRequest.current; const mapping = { ...bankImport.mapping, [name]: value }; setBankImport((previous) => ({ ...previous, mapping, status: "loading", error: "", requestId: id })); try { const result = await api.bankImportPreview(bankImport.csvText, mapping); if (previewRequest.current === id) setBankImport((previous) => ({ ...previous, ...result, mapping, status: "ready", error: "", requestId: id })); } catch (reason) { if (previewRequest.current === id) setBankImport((previous) => ({ ...previous, status: "error", error: reason.message })); } }, [bankImport.csvText, bankImport.mapping]);
  const applyBankImport = useCallback(async () => { await mutate(() => api.bankImportApply(bankImport.rows, bankImport.mapping)); setBankImport(EMPTY_BANK_IMPORT); changeView("transactions"); }, [bankImport, changeView, mutate]);

  const navigateWarning = useCallback((warning) => { const destination = getWarningDestination(warning, state); if (destination) changeView(destination.view, destination); else changeView("warnings"); }, [changeView, state]);
  if (loading && !state) return <AppShell topBar={<header className="topbar"><h1>Envelope Expense Tracker</h1></header>} tabs={null}><p className="notice">Loading app state...</p></AppShell>;
  if (error && !state) return <AppShell topBar={<header className="topbar"><h1>Envelope Expense Tracker</h1></header>} tabs={null}><p className="notice error">Could not connect to the backend.</p><button onClick={refresh}>Retry</button></AppShell>;
  if (!state) return null;

  const topBar = <TopBar title={VIEW_TITLES[currentView]} selectedMonth={selectedMonth} months={config?.months || []} onMonthChange={handleMonthChange} onAddTransaction={() => openEditor()} onRestoreBackup={selectBackup} onDownloadBackup={downloadBackup} userEmail={session?.user?.email} onSignOut={handleSignOut} />;
  const tabs = <Tabs currentView={currentView} onViewChange={changeView} />;
  return <AppShell topBar={topBar} tabs={tabs} userEmail={session?.user?.email} onSignOut={handleSignOut}>
    {error && <SaveStatus status="error" message={error} onDismiss={clearError} />}
    {currentView === "dashboard" && <DashboardView state={state} summary={summary} availableToAssign={derived?.availableToAssign ?? 0} categoryRows={derived?.categoryRows || []} envelopeRows={derived?.envelopeRows || []} warnings={warnings} onNavigate={(intent) => changeView(intent.view, intent)} onAddTransaction={({ type } = {}) => openEditor({ type })} />}
    {currentView === "transactions" && <TransactionsView state={state} intent={transactionIntent} onAddTransaction={() => openEditor()} onEditTransaction={(transaction) => openEditor({ transaction, triggerId: `edit-${transaction.id}` })} onDeleteTransaction={(id) => mutate(() => api.deleteTransaction(id))} />}
    {currentView === "automatic" && <AutomaticTransactionsView state={state} config={config} onAddAutomaticTransaction={(form) => mutate(() => api.createAutomaticTransaction(form))} onUpdateAutomaticTransaction={(id, field, value) => mutate(() => api.updateAutomaticTransaction(id, field, value))} onDeleteAutomaticTransaction={(id) => mutate(() => api.deleteAutomaticTransaction(id))} onDirtyChange={sharedDirty} disabled={isMutating} />}
    {currentView === "monthly" && <MonthlySetupView state={state} availableToAssign={derived?.availableToAssign ?? 0} envelopeRows={derived?.envelopeRows || []} intent={monthlyIntent} onSaveMonthlySetup={(updates) => mutate(() => api.updateMonthlySetupBatch(updates))} onDirtyChange={sharedDirty} onFillMissingMonthlySetup={() => mutate(() => api.fillMissingMonthlySetup())} />}
    {currentView === "categories" && <CategoriesView state={state} onAddCategory={(form) => mutate(() => api.createCategory(form))} onUpdateCategory={(id, field, value) => mutate(() => api.updateCategory(id, field, value))} onDeleteCategory={(id) => mutate(() => api.deleteCategory(id))} onAddSubcategory={(form) => mutate(() => api.createSubcategory(form))} onUpdateSubcategory={(id, field, value) => mutate(() => api.updateSubcategory(id, field, value))} onDeleteSubcategory={(id) => mutate(() => api.deleteSubcategory(id))} onDirtyChange={sharedDirty} disabled={isMutating} />}
    {currentView === "accounts" && <AccountsView state={state} accountBalances={derived?.accountBalances || []} onAddAccount={(form) => mutate(() => api.createAccount(form))} onUpdateAccount={(id, field, value) => mutate(() => api.updateAccount(id, field, value))} onDeleteAccount={(id) => mutate(() => api.deleteAccount(id))} onDirtyChange={sharedDirty} disabled={isMutating} />}
    {currentView === "import" && <BankImportView state={state} bankImport={bankImport} onLoadBankCsv={loadBankCsv} onUpdateMapping={updateMapping} onAddImportedTransactions={applyBankImport} />}
    {currentView === "warnings" && <WarningsView warnings={warnings} state={state} onNavigate={navigateWarning} />}
    <TransactionEditor open={editor.open} transaction={editor.transaction} initialType={editor.initialType} state={state} config={config} onSave={handleSaveTransaction} onClose={closeEditor} onDirtyChange={editorDirty} />
    <ConfirmDialog open={Boolean(discardAction)} title="Discard unsaved changes?" description="Your current draft will be lost." destructive confirmLabel="Discard changes" onCancel={() => setDiscardAction(null)} onConfirm={async () => { const action = discardAction; setDiscardAction(null); dirtyOwners.current.clear(); await action?.(); }} />
    <ConfirmDialog open={Boolean(pendingBackup)} title={`Restore ${pendingBackup?.name || "backup"}?`} description="This replaces transactions, accounts, categories, monthly setup, and automatic rules. Download the current backup first if you may need it." destructive confirmLabel="Replace data" onCancel={() => setPendingBackup(null)} onConfirm={restoreBackup} />
  </AppShell>;
}
