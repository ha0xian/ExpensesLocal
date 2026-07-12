import { useCallback, useState } from "react";
import { AppShell } from "./components/AppShell.jsx";
import { Tabs } from "./components/Tabs.jsx";
import { TopBar } from "./components/TopBar.jsx";
import { useExpenseState } from "./hooks/useExpenseState.js";
import * as api from "./lib/api-client.js";
import { AccountsView } from "./views/AccountsView.jsx";
import { AutomaticTransactionsView } from "./views/AutomaticTransactionsView.jsx";
import { BankImportView } from "./views/BankImportView.jsx";
import { CategoriesView } from "./views/CategoriesView.jsx";
import { DashboardView } from "./views/DashboardView.jsx";
import { MonthlySetupView } from "./views/MonthlySetupView.jsx";
import { TransactionsView } from "./views/TransactionsView.jsx";
import { WarningsView } from "./views/WarningsView.jsx";

const VIEW_TITLES = {
  dashboard: "Dashboard",
  transactions: "Transactions",
  automatic: "Automatic",
  monthly: "Monthly Setup",
  categories: "Categories",
  accounts: "Accounts",
  import: "Bank Import",
  warnings: "Warnings",
};

export default function App() {
  const {
    state, derived, config, automationStatus,
    dataFileName, loading, error, refresh, mutate
  } = useExpenseState();

  const [currentView, setCurrentView] = useState("dashboard");
  const [bankImport, setBankImport] = useState({ headers: [], rows: [], mapping: {}, previewRows: [] });

  // -----------------------------------------------------------------------
  // Derived convenience getters
  // -----------------------------------------------------------------------

  const selectedMonth = state?.selectedMonth || "";
  const months = config?.months || [];
  const summary = derived?.summary || {};
  const categoryRows = derived?.categoryRows || [];
  const availableToAssign = derived?.availableToAssign ?? 0;
  const envelopeRows = derived?.envelopeRows || [];
  const accountBalances = derived?.accountBalances || [];
  const warnings = derived?.warnings || [];

  // -----------------------------------------------------------------------
  // Month
  // -----------------------------------------------------------------------

  const handleMonthChange = useCallback((month) => {
    mutate(() => api.updateSelectedMonth(month));
  }, [mutate]);

  // -----------------------------------------------------------------------
  // CSV import / export
  // -----------------------------------------------------------------------

  const handleImportCsv = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const csvText = await file.text();
        await mutate(() => api.importCsv(csvText));
      } catch (err) {
        alert(err.message || "Import failed.");
      }
    };
    input.click();
  }, [mutate]);

  const handleExportCsv = useCallback(async () => {
    try {
      await api.exportCsv();
    } catch (err) {
      alert(err.message || "Export failed.");
    }
  }, []);

  // -----------------------------------------------------------------------
  // Transactions
  // -----------------------------------------------------------------------

  const handleAddTransaction = useCallback(async (form) => {
    try {
      await mutate(() => api.createTransaction(form));
      return true;
    } catch (err) {
      alert(err.message || "Failed to add transaction.");
      return false;
    }
  }, [mutate]);

  const handleUpdateTransaction = useCallback((id, field, value) => {
    mutate(() => api.updateTransaction(id, field, value));
  }, [mutate]);

  const handleDeleteTransaction = useCallback((id) => {
    mutate(() => api.deleteTransaction(id));
  }, [mutate]);

  // -----------------------------------------------------------------------
  // Automatic transactions
  // -----------------------------------------------------------------------

  const handleAddAutomaticTransaction = useCallback(async (form) => {
    try {
      await mutate(() => api.createAutomaticTransaction(form));
      return true;
    } catch (err) {
      alert(err.message || "Failed to add automatic transaction.");
      return false;
    }
  }, [mutate]);

  const handleUpdateAutomaticTransaction = useCallback((id, field, value) => {
    mutate(() => api.updateAutomaticTransaction(id, field, value));
  }, [mutate]);

  const handleDeleteAutomaticTransaction = useCallback((id) => {
    mutate(() => api.deleteAutomaticTransaction(id));
  }, [mutate]);

  // -----------------------------------------------------------------------
  // Categories / subcategories
  // -----------------------------------------------------------------------

  const handleAddCategory = useCallback(async (form) => {
    try {
      await mutate(() => api.createCategory(form));
      return true;
    } catch (err) {
      alert(err.message || "Failed to add category.");
      return false;
    }
  }, [mutate]);

  const handleUpdateCategory = useCallback((id, field, value) => {
    mutate(() => api.updateCategory(id, field, value));
  }, [mutate]);

  const handleDeleteCategory = useCallback((id) => {
    mutate(() => api.deleteCategory(id));
  }, [mutate]);

  const handleAddSubcategory = useCallback(async (form) => {
    try {
      await mutate(() => api.createSubcategory(form));
      return true;
    } catch (err) {
      alert(err.message || "Failed to add subcategory.");
      return false;
    }
  }, [mutate]);

  const handleUpdateSubcategory = useCallback((id, field, value) => {
    mutate(() => api.updateSubcategory(id, field, value));
  }, [mutate]);

  const handleDeleteSubcategory = useCallback((id) => {
    mutate(() => api.deleteSubcategory(id));
  }, [mutate]);

  // -----------------------------------------------------------------------
  // Accounts
  // -----------------------------------------------------------------------

  const handleAddAccount = useCallback(async (form) => {
    try {
      await mutate(() => api.createAccount(form));
      return true;
    } catch (err) {
      alert(err.message || "Failed to add account.");
      return false;
    }
  }, [mutate]);

  const handleUpdateAccount = useCallback((id, field, value) => {
    mutate(() => api.updateAccount(id, field, value));
  }, [mutate]);

  const handleDeleteAccount = useCallback((id) => {
    mutate(() => api.deleteAccount(id));
  }, [mutate]);

  // -----------------------------------------------------------------------
  // Monthly setup
  // -----------------------------------------------------------------------

  const handleUpdateMonthlySetup = useCallback((id, field, value) => {
    mutate(() => api.updateMonthlySetup(id, field, value));
  }, [mutate]);

  const handleFillMissingMonthlySetup = useCallback(() => {
    mutate(() => api.fillMissingMonthlySetup());
  }, [mutate]);

  // -----------------------------------------------------------------------
  // Bank import
  // -----------------------------------------------------------------------

  const handleLoadBankCsv = useCallback(async (file) => {
    if (!file) return;
    try {
      const csvText = await file.text();
      const result = await api.bankImportPreview(csvText, null);
      setBankImport({
        headers: result.headers,
        rows: result.rows,
        mapping: result.mapping,
        previewRows: result.previewRows,
      });
    } catch (err) {
      alert(err.message || "Bank import preview failed.");
    }
  }, []);

  const handleUpdateMapping = useCallback(async (name, value) => {
    const newMapping = { ...bankImport.mapping, [name]: value };
    setBankImport((previous) => ({
      ...previous,
      mapping: newMapping,
    }));
    // Recompute preview from backend so the table stays in sync
    if (bankImport.rows.length) {
      try {
        // Re-serialize the original rows to CSV text for the backend call
        const headerLine = bankImport.headers.join(",");
        const bodyLines = bankImport.rows.map((row) =>
          bankImport.headers.map((h) => {
            const cell = row[h] || "";
            return /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
          }).join(",")
        );
        const csvText = [headerLine, ...bodyLines].join("\r\n");
        const result = await api.bankImportPreview(csvText, newMapping);
        setBankImport((previous) => ({
          ...previous,
          previewRows: result.previewRows,
        }));
      } catch {
        // Silently keep the stale preview if the backend call fails
      }
    }
  }, [bankImport.headers, bankImport.rows]);

  const handleAddImportedTransactions = useCallback(async () => {
    try {
      await mutate(() => api.bankImportApply(bankImport.rows, bankImport.mapping));
      setCurrentView("transactions");
      setBankImport({ headers: [], rows: [], mapping: {}, previewRows: [] });
    } catch (err) {
      alert(err.message || "Bank import apply failed.");
    }
  }, [mutate, bankImport]);

  // -----------------------------------------------------------------------
  // Loading / error states
  // -----------------------------------------------------------------------

  if (loading && !state) {
    return (
      <AppShell
        topBar={<header className="topbar"><h1>Envelope Expense Tracker</h1></header>}
        tabs={null}
      >
        <p className="notice">Loading app state from backend&hellip;</p>
      </AppShell>
    );
  }

  if (error && !state) {
    return (
      <AppShell
        topBar={<header className="topbar"><h1>Envelope Expense Tracker</h1></header>}
        tabs={null}
      >
        <p className="notice error">
          Could not connect to the backend. Make sure FastAPI is running and the Vite proxy is configured.
        </p>
        <button type="button" onClick={refresh}>Retry</button>
      </AppShell>
    );
  }

  if (!state) return null;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const topBar = (
    <TopBar
      title={VIEW_TITLES[currentView] || "Dashboard"}
      selectedMonth={selectedMonth}
      months={months}
      dataFileName={dataFileName}
      automationStatus={automationStatus}
      onMonthChange={handleMonthChange}
      onImportCsv={handleImportCsv}
      onExportCsv={handleExportCsv}
    />
  );

  const tabs = <Tabs currentView={currentView} onViewChange={setCurrentView} />;

  return (
    <AppShell topBar={topBar} tabs={tabs}>
      {loading && error && (
        <p className="notice error">Backend error: {error}</p>
      )}

      {currentView === "dashboard" ? (
        <DashboardView
          state={state}
          summary={summary}
          availableToAssign={availableToAssign}
          categoryRows={categoryRows}
          envelopeRows={envelopeRows}
          warningCount={warnings.length}
          warnings={warnings}
        />
      ) : null}

      {currentView === "transactions" ? (
        <TransactionsView
          state={state}
          config={config}
          onAddTransaction={handleAddTransaction}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
        />
      ) : null}

      {currentView === "automatic" ? (
        <AutomaticTransactionsView
          state={state}
          config={config}
          onAddAutomaticTransaction={handleAddAutomaticTransaction}
          onUpdateAutomaticTransaction={handleUpdateAutomaticTransaction}
          onDeleteAutomaticTransaction={handleDeleteAutomaticTransaction}
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
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddSubcategory={handleAddSubcategory}
          onUpdateSubcategory={handleUpdateSubcategory}
          onDeleteSubcategory={handleDeleteSubcategory}
        />
      ) : null}

      {currentView === "accounts" ? (
        <AccountsView
          state={state}
          accountBalances={accountBalances}
          onAddAccount={handleAddAccount}
          onUpdateAccount={handleUpdateAccount}
          onDeleteAccount={handleDeleteAccount}
        />
      ) : null}

      {currentView === "import" ? (
        <BankImportView
          state={state}
          bankImport={bankImport}
          onLoadBankCsv={handleLoadBankCsv}
          onUpdateMapping={handleUpdateMapping}
          onAddImportedTransactions={handleAddImportedTransactions}
        />
      ) : null}

      {currentView === "warnings" ? <WarningsView warnings={warnings} /> : null}
    </AppShell>
  );
}
