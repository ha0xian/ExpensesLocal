import { useMemo, useState } from "react";
import { AppShell } from "./components/AppShell.jsx";
import { Tabs } from "./components/Tabs.jsx";
import { TopBar } from "./components/TopBar.jsx";
import { useExpenseState } from "./hooks/useExpenseState.js";
import {
  calculateAccountBalances,
  calculateAvailableToAssign,
  calculateEnvelopeBalances,
  collectWarnings,
  getTransactionMonth,
  summarizeCategoriesForMonth,
  summarizeMonth
} from "./lib/calculations.js";
import { MONTHS_2026 } from "./lib/data-schema.js";
import {
  isFileSystemAccessSupported,
  openCsvFile,
  parseAppCsv,
  parseGenericCsv,
  saveCsvFile,
  saveCsvFileAs,
  serializeAppCsv
} from "./lib/csv-storage.js";
import { guessMapping, mapBankImportRows, subcategoriesFor, uniqueId } from "./lib/app-helpers.js";
import { AccountsView } from "./views/AccountsView.jsx";
import { AutomaticTransactionsView } from "./views/AutomaticTransactionsView.jsx";
import { BankImportView } from "./views/BankImportView.jsx";
import { CategoriesView } from "./views/CategoriesView.jsx";
import { DashboardView } from "./views/DashboardView.jsx";
import { MonthlySetupView } from "./views/MonthlySetupView.jsx";
import { TransactionsView } from "./views/TransactionsView.jsx";
import { WarningsView } from "./views/WarningsView.jsx";

export default function App() {
  const { state, setExpenseState, replaceState, automationStatus } = useExpenseState();
  const [currentView, setCurrentView] = useState("dashboard");
  const [currentFileHandle, setCurrentFileHandle] = useState(null);
  const [currentFileName, setCurrentFileName] = useState("");
  const [dirty, setDirty] = useState(Boolean(automationStatus?.changed));
  const [bankImport, setBankImport] = useState({ headers: [], rows: [], mapping: {} });

  const selectedMonth = state.selectedMonth;
  const summary = useMemo(() => summarizeMonth(state, selectedMonth), [state, selectedMonth]);
  const categoryRows = useMemo(() => summarizeCategoriesForMonth(state, selectedMonth), [state, selectedMonth]);
  const availableToAssign = useMemo(() => calculateAvailableToAssign(state, selectedMonth), [state, selectedMonth]);
  const envelopeRows = useMemo(() => calculateEnvelopeBalances(state, selectedMonth), [state, selectedMonth]);
  const accountBalances = useMemo(() => calculateAccountBalances(state), [state]);
  const warnings = useMemo(() => collectWarnings(state, selectedMonth), [state, selectedMonth]);
  const fileSystemSupported = isFileSystemAccessSupported();

  function commit(nextStateOrUpdater) {
    setExpenseState(nextStateOrUpdater);
    setDirty(true);
  }

  function handleMonthChange(month) {
    commit({ ...state, selectedMonth: month });
  }

  async function handleOpenCsv() {
    try {
      if (dirty && !confirm("Open a CSV and replace unsaved changes?")) {
        return;
      }
      const { fileHandle, csvText } = await openCsvFile();
      const result = replaceState(parseAppCsv(csvText));
      setCurrentFileHandle(fileHandle);
      setCurrentFileName(fileHandle.name || "Opened CSV");
      setDirty(Boolean(result.changed));
    } catch (error) {
      if (error?.name !== "AbortError") {
        alert(error.message || "Could not open CSV.");
      }
    }
  }

  async function handleSaveCsv() {
    try {
      if (!currentFileHandle) {
        await handleSaveCsvAs();
        return;
      }
      await saveCsvFile(currentFileHandle, serializeAppCsv(state));
      setDirty(false);
    } catch (error) {
      if (error?.name !== "AbortError") {
        alert(error.message || "Could not save CSV.");
      }
    }
  }

  async function handleSaveCsvAs() {
    try {
      const fileHandle = await saveCsvFileAs(serializeAppCsv(state), "expense-data.csv");
      setCurrentFileHandle(fileHandle);
      setCurrentFileName(fileHandle.name || "expense-data.csv");
      setDirty(false);
    } catch (error) {
      if (error?.name !== "AbortError") {
        alert(error.message || "Could not save CSV.");
      }
    }
  }

  function handleAddTransaction(form) {
    const amount = Math.abs(Number(form.amount));
    const automaticRule = form.makeAutomatic ? {
      id: uniqueId("auto-rule"),
      enabled: true,
      startDate: form.date,
      endDate: form.endDate || "",
      frequency: form.frequency,
      customInterval: Math.floor(Math.abs(Number(form.customInterval))) || 1,
      customUnit: form.customUnit,
      type: form.type,
      category: form.category,
      subcategory: form.subcategory,
      account: form.account,
      merchantPayee: form.merchantPayee || "",
      description: form.description || "",
      amount,
      currency: state.currency,
      essential: Boolean(form.essential),
      reimbursable: Boolean(form.reimbursable),
      notes: form.notes || ""
    } : null;
    const transaction = {
      id: uniqueId("txn"),
      date: form.date,
      type: form.type,
      category: form.category,
      subcategory: form.subcategory,
      account: form.account,
      merchantPayee: form.merchantPayee || "",
      description: form.description || "",
      amount,
      currency: state.currency,
      essential: Boolean(form.essential),
      month: getTransactionMonth(form.date),
      reimbursable: Boolean(form.reimbursable),
      notes: form.notes || ""
    };

    if (!transaction.date || !transaction.type || !transaction.category || !transaction.subcategory || !transaction.account || !amount) {
      alert("Date, type, category, subcategory, account, and amount are required.");
      return false;
    }

    if (automaticRule && !isAutomaticTransactionValid(automaticRule)) {
      return false;
    }

    commit({
      ...state,
      transactions: [transaction, ...state.transactions],
      automaticTransactions: automaticRule
        ? [automaticRule, ...(state.automaticTransactions || [])]
        : state.automaticTransactions
    });
    return true;
  }

  function handleAddAutomaticTransaction(form) {
    const amount = Math.abs(Number(form.amount));
    const customInterval = Math.floor(Math.abs(Number(form.customInterval))) || 1;
    const rule = {
      id: uniqueId("auto-rule"),
      enabled: Boolean(form.enabled),
      startDate: form.startDate,
      endDate: form.endDate || "",
      frequency: form.frequency,
      customInterval,
      customUnit: form.customUnit,
      type: form.type,
      category: form.category,
      subcategory: form.subcategory,
      account: form.account,
      merchantPayee: form.merchantPayee || "",
      description: form.description || "",
      amount,
      currency: state.currency,
      essential: Boolean(form.essential),
      reimbursable: Boolean(form.reimbursable),
      notes: form.notes || ""
    };

    if (!isAutomaticTransactionValid(rule)) {
      return false;
    }

    commit({ ...state, automaticTransactions: [rule, ...(state.automaticTransactions || [])] });
    return true;
  }

  function handleUpdateAutomaticTransaction(id, field, value) {
    const numericFields = new Set(["amount", "customInterval"]);
    const booleanFields = new Set(["enabled", "essential", "reimbursable"]);
    const automaticTransactions = (state.automaticTransactions || []).map((rule) => {
      if (rule.id !== id) return rule;
      const nextValue = numericFields.has(field)
        ? Math.abs(Number(value)) || 0
        : booleanFields.has(field)
          ? Boolean(value)
          : value;
      const next = { ...rule, [field]: nextValue };
      if (field === "category") {
        next.subcategory = subcategoriesFor(state, value)[0]?.name || "";
      }
      if (field === "customInterval") {
        next.customInterval = Math.max(1, Math.floor(Number(nextValue) || 1));
      }
      return next;
    });
    commit({ ...state, automaticTransactions });
  }

  function handleUpdateTransaction(id, field, value) {
    const transactions = state.transactions.map((transaction) => {
      if (transaction.id !== id) return transaction;
      const next = { ...transaction, [field]: field === "amount" ? Math.abs(Number(value)) : value };
      if (field === "date") {
        next.month = getTransactionMonth(value);
      }
      if (field === "category") {
        next.subcategory = subcategoriesFor(state, value)[0]?.name || "";
      }
      return next;
    });
    commit({ ...state, transactions });
  }

  function updateCollection(collection, id, field, value) {
    const numericFields = new Set(["defaultBudget", "defaultMonthlyTarget", "openingBalance", "monthlyTarget", "startingBalance"]);
    commit({
      ...state,
      [collection]: state[collection].map((item) => item.id === id
        ? { ...item, [field]: numericFields.has(field) ? Number(value) || 0 : value }
        : item)
    });
  }

  function handleUpdateMonthlySetup(id, field, value) {
    commit({
      ...state,
      monthlySetup: state.monthlySetup.map((item) => item.id === id
        ? {
          ...item,
          [field]: field === "rollover" ? Boolean(value) : Number(value) || 0
        }
        : item)
    });
  }

  function handleFillMissingMonthlySetup() {
    const existing = new Set(state.monthlySetup.map((item) => `${item.month}::${item.category}::${item.subcategory}`));
    const additions = state.subcategories
      .filter((item) => item.envelopeStyle !== "Temporary")
      .filter((item) => !existing.has(`${state.selectedMonth}::${item.category}::${item.name}`))
      .map((item) => ({
        id: `setup-${state.selectedMonth}-${item.id}`,
        month: state.selectedMonth,
        category: item.category,
        subcategory: item.name,
        monthlyTarget: Number(item.defaultMonthlyTarget) || 0,
        startingBalance: 0,
        rollover: ["Sinking fund", "Savings goal"].includes(item.envelopeStyle)
      }));
    commit({ ...state, monthlySetup: [...state.monthlySetup, ...additions] });
  }

  function handleAddCategory(form) {
    if (!form.name) {
      alert("Category name is required.");
      return false;
    }
    commit({
      ...state,
      categories: [...state.categories, {
        id: uniqueId("cat"),
        name: form.name,
        group: form.group,
        defaultBudget: Number(form.defaultBudget) || 0,
        taxBusinessReady: form.taxBusinessReady,
        notes: form.notes || ""
      }]
    });
    return true;
  }

  function handleAddSubcategory(form) {
    if (!form.category || !form.name) {
      alert("Category and subcategory name are required.");
      return false;
    }
    commit({
      ...state,
      subcategories: [...state.subcategories, {
        id: uniqueId("sub"),
        category: form.category,
        name: form.name,
        envelopeGroup: form.envelopeGroup || "",
        envelopeStyle: form.envelopeStyle,
        defaultMonthlyTarget: Number(form.defaultMonthlyTarget) || 0,
        notes: form.notes || ""
      }]
    });
    return true;
  }

  function handleAddAccount(form) {
    if (!form.name) {
      alert("Account name is required.");
      return false;
    }
    commit({
      ...state,
      accounts: [...state.accounts, {
        id: uniqueId("acct"),
        name: form.name,
        type: form.type,
        openingBalance: Number(form.openingBalance) || 0,
        notes: form.notes || ""
      }]
    });
    return true;
  }

  async function handleLoadBankCsv(file) {
    if (!file) return;
    const parsed = parseGenericCsv(await file.text());
    setBankImport({
      headers: parsed.headers,
      rows: parsed.rows,
      mapping: guessMapping(parsed.headers)
    });
  }

  function handleAddImportedTransactions() {
    const mapped = mapBankImportRows(bankImport.rows, bankImport.mapping, state);
    commit({ ...state, transactions: [...mapped, ...state.transactions] });
    setCurrentView("transactions");
    setBankImport({ headers: [], rows: [], mapping: {} });
  }

  const topBar = (
    <TopBar
      selectedMonth={selectedMonth}
      months={MONTHS_2026}
      fileName={currentFileName}
      dirty={dirty}
      fileSystemSupported={fileSystemSupported}
      automationStatus={automationStatus}
      onMonthChange={handleMonthChange}
      onOpenCsv={handleOpenCsv}
      onSaveCsv={handleSaveCsv}
      onSaveAsCsv={handleSaveCsvAs}
    />
  );

  const tabs = <Tabs currentView={currentView} onViewChange={setCurrentView} />;

  return (
    <AppShell topBar={topBar} tabs={tabs}>
      {currentView === "dashboard" ? (
        <DashboardView
          state={state}
          summary={summary}
          availableToAssign={availableToAssign}
          categoryRows={categoryRows}
          envelopeRows={envelopeRows}
          warningCount={warnings.length}
        />
      ) : null}
      {currentView === "transactions" ? (
        <TransactionsView
          state={state}
          onAddTransaction={handleAddTransaction}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={(id) => commit({ ...state, transactions: state.transactions.filter((item) => item.id !== id) })}
        />
      ) : null}
      {currentView === "automatic" ? (
        <AutomaticTransactionsView
          state={state}
          onAddAutomaticTransaction={handleAddAutomaticTransaction}
          onUpdateAutomaticTransaction={handleUpdateAutomaticTransaction}
          onDeleteAutomaticTransaction={(id) => commit({ ...state, automaticTransactions: (state.automaticTransactions || []).filter((item) => item.id !== id) })}
        />
      ) : null}
      {currentView === "monthly" ? (
        <MonthlySetupView
          state={state}
          availableToAssign={availableToAssign}
          envelopeRows={envelopeRows}
          onUpdateMonthlySetup={handleUpdateMonthlySetup}
          onFillMissingMonthlySetup={handleFillMissingMonthlySetup}
        />
      ) : null}
      {currentView === "categories" ? (
        <CategoriesView
          state={state}
          onAddCategory={handleAddCategory}
          onUpdateCategory={(id, field, value) => updateCollection("categories", id, field, value)}
          onDeleteCategory={(id) => commit({ ...state, categories: state.categories.filter((item) => item.id !== id) })}
          onAddSubcategory={handleAddSubcategory}
          onUpdateSubcategory={(id, field, value) => updateCollection("subcategories", id, field, value)}
          onDeleteSubcategory={(id) => commit({ ...state, subcategories: state.subcategories.filter((item) => item.id !== id) })}
        />
      ) : null}
      {currentView === "accounts" ? (
        <AccountsView
          state={state}
          accountBalances={accountBalances}
          onAddAccount={handleAddAccount}
          onUpdateAccount={(id, field, value) => updateCollection("accounts", id, field, value)}
          onDeleteAccount={(id) => commit({ ...state, accounts: state.accounts.filter((item) => item.id !== id) })}
        />
      ) : null}
      {currentView === "import" ? (
        <BankImportView
          state={state}
          bankImport={bankImport}
          onLoadBankCsv={handleLoadBankCsv}
          onUpdateMapping={(name, value) => setBankImport((previous) => ({ ...previous, mapping: { ...previous.mapping, [name]: value } }))}
          onAddImportedTransactions={handleAddImportedTransactions}
        />
      ) : null}
      {currentView === "warnings" ? <WarningsView warnings={warnings} /> : null}
    </AppShell>
  );
}

function isAutomaticTransactionValid(rule) {
  if (!rule.startDate || !rule.frequency || !rule.type || !rule.category || !rule.subcategory || !rule.account || !rule.amount) {
    alert("Start date, frequency, type, category, subcategory, account, and amount are required.");
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(rule.startDate) || (rule.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(rule.endDate))) {
    alert("Start and end dates must be valid dates.");
    return false;
  }

  if (rule.endDate && rule.endDate < rule.startDate) {
    alert("End date cannot be earlier than start date.");
    return false;
  }

  if (rule.frequency === "Custom" && (!rule.customInterval || Number(rule.customInterval) <= 0 || !rule.customUnit)) {
    alert("Custom automatic transactions need a positive interval and unit.");
    return false;
  }

  return true;
}
