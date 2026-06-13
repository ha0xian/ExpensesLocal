import { MONTHS_2026, createInitialState } from "./data-schema.js";
import {
  isFileSystemAccessSupported,
  openCsvFile,
  parseAppCsv,
  parseGenericCsv,
  saveCsvFile,
  saveCsvFileAs,
  serializeAppCsv
} from "./csv-storage.js";
import {
  calculateAccountBalances,
  calculateAvailableToAssign,
  calculateEnvelopeBalances,
  collectWarnings,
  getTransactionMonth,
  summarizeCategoriesForMonth,
  summarizeMonth
} from "./calculations.js";
import { runStartupAutomation } from "./startup-automation.js";

const appRoot = document.querySelector("#app");
const monthSelect = document.querySelector("#month-select");
const fileStatus = document.querySelector("#file-status");
const supportMessage = document.querySelector("#support-message");
const draftKey = "expense-csv-draft-v1";

let state = loadDraft() || createInitialState();
let currentView = "dashboard";
let currentFileHandle = null;
let currentFileName = "";
let dirty = false;
let bankImport = { headers: [], rows: [], mapping: {} };
let startupAutomationStatus = null;

bindGlobalActions();
runStartupAutomationOnLoad();
renderApp();

function setState(nextState, options = {}) {
  state = normalizeState(nextState);
  dirty = options.dirty ?? true;
  localStorage.setItem(draftKey, JSON.stringify(state));
  renderApp();
}

function renderApp() {
  renderChrome();

  const renderers = {
    dashboard: renderDashboard,
    transactions: renderTransactions,
    monthly: renderMonthlySetup,
    categories: renderCategories,
    accounts: renderAccounts,
    import: renderBankImport,
    warnings: renderWarnings
  };

  renderers[currentView]();
}

function renderDashboard() {
  const summary = summarizeMonth(state, state.selectedMonth);
  const available = calculateAvailableToAssign(state, state.selectedMonth);
  const envelopeRows = calculateEnvelopeBalances(state, state.selectedMonth);
  const warningCount = collectWarnings(state, state.selectedMonth).length;

  appRoot.innerHTML = `
    <section class="grid four">
      ${kpi("Income", money(summary.income), "good")}
      ${kpi("Expenses", money(summary.expenses), summary.expenses > summary.income ? "bad" : "")}
      ${kpi("Net Cashflow", money(summary.netCashflow), summary.netCashflow >= 0 ? "good" : "bad")}
      ${kpi("Available To Assign", money(available), available >= 0 ? "good" : "bad")}
      ${kpi("Top Category", escapeHtml(summary.topCategory))}
      ${kpi("Transactions", summary.transactionCount)}
      ${kpi("Essential Spend", money(summary.essentialSpend))}
      ${kpi("Warnings", warningCount, warningCount ? "bad" : "good")}
    </section>
    <section class="grid two">
      <article class="panel">
        <div class="panel-header"><div><h2>Category Spend</h2><p>${state.selectedMonth}</p></div></div>
        ${categorySpendTable()}
      </article>
      <article class="panel">
        <div class="panel-header"><div><h2>Envelope Snapshot</h2><p>Rollover is recalculated chronologically.</p></div></div>
        ${envelopeTable(envelopeRows.slice(0, 8))}
      </article>
    </section>
  `;
}

function renderTransactions() {
  const categoryOptions = options(state.categories.map((item) => item.name));
  const firstCategory = state.categories[0]?.name || "";
  const subcategoryOptions = options(subcategoriesFor(firstCategory).map((item) => item.name));

  appRoot.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div><h2>Add Transaction</h2><p>Amounts are stored as positive numbers; type controls cashflow direction.</p></div>
      </div>
      <form id="transaction-form" class="form-grid">
        ${field("date", "Date", "date", "")}
        <label class="field"><span>Type</span><select name="type">${options(["Expense", "Income", "Transfer"])}</select></label>
        <label class="field"><span>Category</span><select name="category" data-subcategory-source>${categoryOptions}</select></label>
        <label class="field"><span>Subcategory</span><select name="subcategory" data-subcategory-target>${subcategoryOptions}</select></label>
        <label class="field"><span>Account</span><select name="account">${options(state.accounts.map((item) => item.name))}</select></label>
        ${field("amount", "Amount", "number", "", "0.01")}
        ${field("merchantPayee", "Merchant/Payee", "text", "", null, "wide")}
        ${field("description", "Description", "text", "", null, "wide")}
        <label class="check-field"><input name="essential" type="checkbox"><span>Essential</span></label>
        <label class="check-field"><input name="reimbursable" type="checkbox"><span>Reimbursable</span></label>
        ${field("notes", "Notes", "text", "", null, "wide")}
        <div class="actions"><button class="primary" type="submit">Add Transaction</button></div>
      </form>
    </section>
    <section class="panel">
      <div class="panel-header"><div><h2>Transactions</h2><p>Edit inline or delete rows.</p></div></div>
      ${transactionsTable()}
    </section>
  `;
}

function renderMonthlySetup() {
  const available = calculateAvailableToAssign(state, state.selectedMonth);
  const rows = calculateEnvelopeBalances(state, state.selectedMonth);

  appRoot.innerHTML = `
    <section class="grid three">
      ${kpi("Available To Assign", money(available), available >= 0 ? "good" : "bad")}
      ${kpi("Funded This Month", money(sum(state.monthlySetup.filter((item) => item.month === state.selectedMonth).map((item) => item.monthlyTarget))))}
      ${kpi("Overdrawn Envelopes", rows.filter((item) => item.overdrawn).length, rows.some((item) => item.overdrawn) ? "bad" : "good")}
    </section>
    <section class="panel">
      <div class="panel-header">
        <div><h2>Monthly Setup</h2><p>Funding targets, starting balances, and rollover are month-specific.</p></div>
        <button id="reset-month-setup" type="button">Fill Missing From Defaults</button>
      </div>
      ${monthlySetupTable(rows)}
    </section>
  `;
}

function renderCategories() {
  appRoot.innerHTML = `
    <section class="grid two">
      <article class="panel">
        <div class="panel-header"><div><h2>Add Category</h2></div></div>
        <form id="category-form" class="form-grid">
          ${field("name", "Name", "text", "", null, "wide")}
          <label class="field"><span>Group</span><select name="group">${options(["Needs", "Wants", "Growth", "Savings", "Business", "Other"])}</select></label>
          ${field("defaultBudget", "Default Budget", "number", "0", "0.01")}
          <label class="field"><span>Tax/Business</span><select name="taxBusinessReady">${options(["No", "Maybe", "Yes"])}</select></label>
          ${field("notes", "Notes", "text", "", null, "wide")}
          <div class="actions"><button class="primary" type="submit">Add Category</button></div>
        </form>
      </article>
      <article class="panel">
        <div class="panel-header"><div><h2>Add Subcategory</h2></div></div>
        <form id="subcategory-form" class="form-grid">
          <label class="field"><span>Category</span><select name="category">${options(state.categories.map((item) => item.name))}</select></label>
          ${field("name", "Name", "text", "", null, "wide")}
          ${field("envelopeGroup", "Envelope Group", "text", "Lifestyle")}
          <label class="field"><span>Style</span><select name="envelopeStyle">${options(["Monthly bill", "Variable", "Sinking fund", "Savings goal", "Temporary"])}</select></label>
          ${field("defaultMonthlyTarget", "Default Target", "number", "0", "0.01")}
          ${field("notes", "Notes", "text", "", null, "wide")}
          <div class="actions"><button class="primary" type="submit">Add Subcategory</button></div>
        </form>
      </article>
    </section>
    <section class="grid two">
      <article class="panel"><h2>Categories</h2>${categoriesTable()}</article>
      <article class="panel"><h2>Subcategories</h2>${subcategoriesTable()}</article>
    </section>
  `;
}

function renderAccounts() {
  appRoot.innerHTML = `
    <section class="panel">
      <div class="panel-header"><div><h2>Add Account</h2></div></div>
      <form id="account-form" class="form-grid">
        ${field("name", "Name", "text", "", null, "wide")}
        <label class="field"><span>Type</span><select name="type">${options(["Bank", "Credit Card", "Cash"])}</select></label>
        ${field("openingBalance", "Opening Balance", "number", "0", "0.01")}
        ${field("notes", "Notes", "text", "", null, "wide")}
        <div class="actions"><button class="primary" type="submit">Add Account</button></div>
      </form>
    </section>
    <section class="panel">
      <div class="panel-header"><div><h2>Accounts</h2><p>Balances are calculated from opening balance plus transactions.</p></div></div>
      ${accountsTable()}
    </section>
  `;
}

function renderBankImport() {
  appRoot.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div><h2>Bank Import</h2><p>Import a generic bank CSV, map columns, preview transactions, then add them to the app.</p></div>
      </div>
      <input id="bank-csv-file" type="file" accept=".csv,text/csv">
      ${bankImport.headers.length ? importMapper() : `<p class="notice">Choose a CSV file to begin mapping.</p>`}
    </section>
  `;
}

function renderWarnings() {
  const warnings = collectWarnings(state, state.selectedMonth);
  appRoot.innerHTML = `
    <section class="panel">
      <div class="panel-header"><div><h2>Status Warnings</h2><p>${warnings.length ? `${warnings.length} issue(s) found.` : "No issues for the selected month."}</p></div></div>
      ${warnings.length ? warningsTable(warnings) : `<div class="empty-state"><h2>No warnings</h2><p>Your selected month looks clean.</p></div>`}
    </section>
  `;
}

function bindGlobalActions() {
  monthSelect.addEventListener("change", () => setState({ ...state, selectedMonth: monthSelect.value }));

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      currentView = button.dataset.view;
      renderApp();
      appRoot.focus();
    });
  });

  document.querySelector("#open-csv").addEventListener("click", handleOpenCsv);
  document.querySelector("#save-csv").addEventListener("click", handleSaveCsv);
  document.querySelector("#save-as-csv").addEventListener("click", handleSaveCsvAs);

  appRoot.addEventListener("submit", handleSubmit);
  appRoot.addEventListener("change", handleChange);
  appRoot.addEventListener("click", handleClick);
}

function runStartupAutomationOnLoad() {
  const result = runStartupAutomation(state);
  startupAutomationStatus = result;

  if (result.changed) {
    state = normalizeState(result.state);
    dirty = true;
    localStorage.setItem(draftKey, JSON.stringify(state));
  }
}

function addTransactionFromForm(formData) {
  const date = formData.get("date");
  const amount = Math.abs(Number(formData.get("amount")));
  const transaction = {
    id: uniqueId("txn"),
    date,
    type: formData.get("type"),
    category: formData.get("category"),
    subcategory: formData.get("subcategory"),
    account: formData.get("account"),
    merchantPayee: formData.get("merchantPayee") || "",
    description: formData.get("description") || "",
    amount,
    currency: state.currency,
    essential: formData.get("essential") === "on",
    month: getTransactionMonth(date),
    reimbursable: formData.get("reimbursable") === "on",
    notes: formData.get("notes") || ""
  };

  if (!transaction.date || !transaction.type || !transaction.category || !transaction.subcategory || !transaction.account || !amount) {
    alert("Date, type, category, subcategory, account, and amount are required.");
    return;
  }

  setState({ ...state, transactions: [transaction, ...state.transactions] });
}

function updateMonthlySetupFromForm(formData) {
  const id = formData.get("id");
  const nextRows = state.monthlySetup.map((row) => row.id === id
    ? {
      ...row,
      monthlyTarget: Math.max(0, Number(formData.get("monthlyTarget")) || 0),
      startingBalance: Number(formData.get("startingBalance")) || 0,
      rollover: formData.get("rollover") === "on"
    }
    : row);
  setState({ ...state, monthlySetup: nextRows });
}

function mapBankImportRows(rows, mapping) {
  return rows.map((row) => {
    const amountRaw = Number(row[mapping.amount] || 0);
    const typeValue = mapping.type ? row[mapping.type] : "";
    const inferredType = typeValue || (amountRaw < 0 ? "Expense" : "Income");
    const date = row[mapping.date] || "";
    return {
      id: uniqueId("imp"),
      date,
      type: normalizeType(inferredType),
      category: row[mapping.category] || state.categories[0]?.name || "",
      subcategory: row[mapping.subcategory] || subcategoriesFor(row[mapping.category] || state.categories[0]?.name || "")[0]?.name || "",
      account: row[mapping.account] || state.accounts[0]?.name || "",
      merchantPayee: row[mapping.merchantPayee] || "",
      description: row[mapping.description] || row[mapping.merchantPayee] || "",
      amount: Math.abs(amountRaw),
      currency: state.currency,
      essential: false,
      month: getTransactionMonth(date),
      reimbursable: false,
      notes: "Imported from bank CSV"
    };
  });
}

async function handleOpenCsv() {
  try {
    if (dirty && !confirm("Open a CSV and replace unsaved changes?")) {
      return;
    }
    const { fileHandle, csvText } = await openCsvFile();
    currentFileHandle = fileHandle;
    currentFileName = fileHandle.name || "Opened CSV";
    state = normalizeState(parseAppCsv(csvText));
    dirty = false;
    runStartupAutomationOnLoad();
    renderApp();
  } catch (error) {
    alert(error.message || "Could not open CSV.");
  }
}

async function handleSaveCsv() {
  try {
    if (!currentFileHandle) {
      await handleSaveCsvAs();
      return;
    }
    await saveCsvFile(currentFileHandle, serializeAppCsv(state));
    dirty = false;
    renderChrome();
  } catch (error) {
    alert(error.message || "Could not save CSV.");
  }
}

async function handleSaveCsvAs() {
  try {
    currentFileHandle = await saveCsvFileAs(serializeAppCsv(state), "expense-data.csv");
    currentFileName = currentFileHandle.name || "expense-data.csv";
    dirty = false;
    renderChrome();
  } catch (error) {
    alert(error.message || "Could not save CSV.");
  }
}

function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  if (form.id === "transaction-form") {
    addTransactionFromForm(formData);
  }

  if (form.dataset.monthlySetupForm === "true") {
    updateMonthlySetupFromForm(formData);
  }

  if (form.id === "category-form") {
    setState({
      ...state,
      categories: [...state.categories, {
        id: uniqueId("cat"),
        name: formData.get("name"),
        group: formData.get("group"),
        defaultBudget: Number(formData.get("defaultBudget")) || 0,
        taxBusinessReady: formData.get("taxBusinessReady"),
        notes: formData.get("notes") || ""
      }]
    });
  }

  if (form.id === "subcategory-form") {
    setState({
      ...state,
      subcategories: [...state.subcategories, {
        id: uniqueId("sub"),
        category: formData.get("category"),
        name: formData.get("name"),
        envelopeGroup: formData.get("envelopeGroup") || "",
        envelopeStyle: formData.get("envelopeStyle"),
        defaultMonthlyTarget: Number(formData.get("defaultMonthlyTarget")) || 0,
        notes: formData.get("notes") || ""
      }]
    });
  }

  if (form.id === "account-form") {
    setState({
      ...state,
      accounts: [...state.accounts, {
        id: uniqueId("acct"),
        name: formData.get("name"),
        type: formData.get("type"),
        openingBalance: Number(formData.get("openingBalance")) || 0,
        notes: formData.get("notes") || ""
      }]
    });
  }
}

async function handleChange(event) {
  const target = event.target;

  if (target.matches("[data-subcategory-source]")) {
    const subcategorySelect = target.closest("form").querySelector("[data-subcategory-target]");
    subcategorySelect.innerHTML = options(subcategoriesFor(target.value).map((item) => item.name));
  }

  if (target.matches("[data-edit-transaction]")) {
    updateTransaction(target);
  }

  if (target.matches("[data-edit-category]")) {
    updateCollectionItem("categories", target);
  }

  if (target.matches("[data-edit-subcategory]")) {
    updateCollectionItem("subcategories", target);
  }

  if (target.matches("[data-edit-account]")) {
    updateCollectionItem("accounts", target);
  }

  if (target.id === "bank-csv-file") {
    const file = target.files[0];
    if (!file) return;
    const parsed = parseGenericCsv(await file.text());
    bankImport = {
      headers: parsed.headers,
      rows: parsed.rows,
      mapping: guessMapping(parsed.headers)
    };
    renderBankImport();
  }

  if (target.matches("[data-import-map]")) {
    bankImport.mapping[target.name] = target.value;
    renderBankImport();
  }
}

function handleClick(event) {
  const target = event.target;

  if (target.matches("[data-delete-transaction]")) {
    setState({ ...state, transactions: state.transactions.filter((item) => item.id !== target.dataset.deleteTransaction) });
  }

  if (target.matches("[data-delete-category]")) {
    setState({ ...state, categories: state.categories.filter((item) => item.id !== target.dataset.deleteCategory) });
  }

  if (target.matches("[data-delete-subcategory]")) {
    setState({ ...state, subcategories: state.subcategories.filter((item) => item.id !== target.dataset.deleteSubcategory) });
  }

  if (target.matches("[data-delete-account]")) {
    setState({ ...state, accounts: state.accounts.filter((item) => item.id !== target.dataset.deleteAccount) });
  }

  if (target.id === "reset-month-setup") {
    fillMissingMonthlySetup();
  }

  if (target.id === "add-imported-transactions") {
    const mapped = mapBankImportRows(bankImport.rows, bankImport.mapping);
    setState({ ...state, transactions: [...mapped, ...state.transactions] });
    currentView = "transactions";
    bankImport = { headers: [], rows: [], mapping: {} };
    renderApp();
  }
}

function renderChrome() {
  const automationMessage = startupAutomationStatus?.changed
    ? ` Last access metadata updated for ${startupAutomationStatus.currentAccessDate}; save to persist it.`
    : "";
  supportMessage.textContent = isFileSystemAccessSupported()
    ? `CSV open/save is available in this browser.${automationMessage}`
    : `File System Access API is unavailable. Use Chrome or Edge for CSV open/save.${automationMessage}`;
  monthSelect.innerHTML = options(MONTHS_2026, state.selectedMonth);
  document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("is-active", button.dataset.view === currentView));
  fileStatus.textContent = `${currentFileName || "No CSV opened"}${dirty ? " · unsaved" : ""}`;
}

function categorySpendTable() {
  const rows = summarizeCategoriesForMonth(state, state.selectedMonth)
    .filter((row) => row.spend || row.budget)
    .sort((a, b) => b.spend - a.spend)
    .map((row) => `<tr><td>${escapeHtml(row.category)}</td><td class="money">${money(row.spend)}</td><td class="money">${money(row.budget)}</td></tr>`)
    .join("");
  return table(["Category", "Spend", "Budget"], rows || `<tr><td colspan="3">No category activity.</td></tr>`);
}

function envelopeTable(rows) {
  const body = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.category)}</td>
      <td>${escapeHtml(row.subcategory)}</td>
      <td class="money">${money(row.monthlyTarget)}</td>
      <td class="money">${money(row.rolloverIn)}</td>
      <td class="money">${money(row.spending)}</td>
      <td class="money">${money(row.available)}</td>
      <td>${row.overdrawn ? `<span class="status-pill error">Overdrawn</span>` : `<span class="status-pill info">OK</span>`}</td>
    </tr>
  `).join("");
  return table(["Category", "Subcategory", "Target", "Rollover In", "Spending", "Available", "Status"], body || `<tr><td colspan="7">No envelopes for this month.</td></tr>`);
}

function transactionsTable() {
  const rows = state.transactions.map((item) => `
    <tr>
      <td><input data-edit-transaction="${item.id}" name="date" type="date" value="${escapeAttr(item.date)}"></td>
      <td><select data-edit-transaction="${item.id}" name="type">${options(["Expense", "Income", "Transfer"], item.type)}</select></td>
      <td><select data-edit-transaction="${item.id}" name="category">${options(state.categories.map((category) => category.name), item.category)}</select></td>
      <td><select data-edit-transaction="${item.id}" name="subcategory">${options(subcategoriesFor(item.category).map((subcategory) => subcategory.name), item.subcategory)}</select></td>
      <td><select data-edit-transaction="${item.id}" name="account">${options(state.accounts.map((account) => account.name), item.account)}</select></td>
      <td><input data-edit-transaction="${item.id}" name="merchantPayee" value="${escapeAttr(item.merchantPayee)}"></td>
      <td><input data-edit-transaction="${item.id}" name="amount" type="number" step="0.01" value="${escapeAttr(item.amount)}"></td>
      <td><button class="danger" type="button" data-delete-transaction="${item.id}">Delete</button></td>
    </tr>
  `).join("");
  return table(["Date", "Type", "Category", "Subcategory", "Account", "Merchant", "Amount", ""], rows);
}

function monthlySetupTable(envelopeRows) {
  const rows = state.monthlySetup.filter((item) => item.month === state.selectedMonth).map((item) => {
    const envelope = envelopeRows.find((row) => row.category === item.category && row.subcategory === item.subcategory);
    return `
      <tr>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.subcategory)}</td>
        <td>
          <form data-monthly-setup-form="true">
            <input type="hidden" name="id" value="${escapeAttr(item.id)}">
            <input name="monthlyTarget" type="number" step="0.01" value="${escapeAttr(item.monthlyTarget)}">
          </form>
        </td>
        <td><input form="" data-setup-proxy="${item.id}" name="startingBalance" type="number" step="0.01" value="${escapeAttr(item.startingBalance)}"></td>
        <td><input form="" data-setup-proxy="${item.id}" name="rollover" type="checkbox" ${item.rollover ? "checked" : ""}></td>
        <td class="money">${money(envelope?.rolloverIn || 0)}</td>
        <td class="money">${money(envelope?.spending || 0)}</td>
        <td class="money">${money(envelope?.available || 0)}</td>
        <td><button type="button" data-save-setup="${item.id}">Update</button></td>
      </tr>
    `;
  }).join("");

  return table(["Category", "Subcategory", "Target", "Starting", "Rollover", "Rollover In", "Spending", "Available", ""], rows);
}

function categoriesTable() {
  const rows = state.categories.map((item) => `
    <tr>
      <td><input data-edit-category="${item.id}" name="name" value="${escapeAttr(item.name)}"></td>
      <td><select data-edit-category="${item.id}" name="group">${options(["Needs", "Wants", "Growth", "Savings", "Business", "Other"], item.group)}</select></td>
      <td><input data-edit-category="${item.id}" name="defaultBudget" type="number" step="0.01" value="${escapeAttr(item.defaultBudget)}"></td>
      <td><select data-edit-category="${item.id}" name="taxBusinessReady">${options(["No", "Maybe", "Yes"], item.taxBusinessReady)}</select></td>
      <td><button class="danger" type="button" data-delete-category="${item.id}">Delete</button></td>
    </tr>
  `).join("");
  return table(["Name", "Group", "Default Budget", "Tax/Business", ""], rows);
}

function subcategoriesTable() {
  const rows = state.subcategories.map((item) => `
    <tr>
      <td><select data-edit-subcategory="${item.id}" name="category">${options(state.categories.map((category) => category.name), item.category)}</select></td>
      <td><input data-edit-subcategory="${item.id}" name="name" value="${escapeAttr(item.name)}"></td>
      <td><input data-edit-subcategory="${item.id}" name="envelopeGroup" value="${escapeAttr(item.envelopeGroup)}"></td>
      <td><select data-edit-subcategory="${item.id}" name="envelopeStyle">${options(["Monthly bill", "Variable", "Sinking fund", "Savings goal", "Temporary"], item.envelopeStyle)}</select></td>
      <td><input data-edit-subcategory="${item.id}" name="defaultMonthlyTarget" type="number" step="0.01" value="${escapeAttr(item.defaultMonthlyTarget)}"></td>
      <td><button class="danger" type="button" data-delete-subcategory="${item.id}">Delete</button></td>
    </tr>
  `).join("");
  return table(["Category", "Name", "Envelope Group", "Style", "Default Target", ""], rows);
}

function accountsTable() {
  const balances = new Map(calculateAccountBalances(state).map((item) => [item.account, item]));
  const rows = state.accounts.map((item) => `
    <tr>
      <td><input data-edit-account="${item.id}" name="name" value="${escapeAttr(item.name)}"></td>
      <td><select data-edit-account="${item.id}" name="type">${options(["Bank", "Credit Card", "Cash"], item.type)}</select></td>
      <td><input data-edit-account="${item.id}" name="openingBalance" type="number" step="0.01" value="${escapeAttr(item.openingBalance)}"></td>
      <td class="money">${money(balances.get(item.name)?.currentBalance || 0)}</td>
      <td><button class="danger" type="button" data-delete-account="${item.id}">Delete</button></td>
    </tr>
  `).join("");
  return table(["Name", "Type", "Opening Balance", "Current Balance", ""], rows);
}

function importMapper() {
  const mappingFields = [
    ["date", "Date"],
    ["merchantPayee", "Merchant/Payee"],
    ["description", "Description"],
    ["amount", "Amount"],
    ["account", "Account"],
    ["category", "Category"],
    ["subcategory", "Subcategory"],
    ["type", "Type"]
  ];
  const mappedRows = mapBankImportRows(bankImport.rows.slice(0, 8), bankImport.mapping);
  const mappingHtml = mappingFields.map(([name, label]) => `
    <label class="field"><span>${label}</span><select name="${name}" data-import-map>${options(["", ...bankImport.headers], bankImport.mapping[name])}</select></label>
  `).join("");
  const preview = mappedRows.map((row) => `
    <tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.category)}</td><td>${escapeHtml(row.subcategory)}</td><td>${escapeHtml(row.account)}</td><td>${escapeHtml(row.description)}</td><td class="money">${money(row.amount)}</td></tr>
  `).join("");

  return `
    <div class="grid">
      <div class="import-mapping">${mappingHtml}</div>
      <div class="toolbar">
        <p class="notice">${bankImport.rows.length} source row(s). Previewing up to 8 converted rows.</p>
        <button id="add-imported-transactions" class="primary" type="button">Add Imported Transactions</button>
      </div>
      ${table(["Date", "Type", "Category", "Subcategory", "Account", "Description", "Amount"], preview)}
    </div>
  `;
}

function warningsTable(warnings) {
  const rows = warnings.map((item) => `
    <tr>
      <td><span class="status-pill ${item.severity}">${escapeHtml(item.severity)}</span></td>
      <td>${escapeHtml(item.code)}</td>
      <td>${escapeHtml(item.message)}</td>
      <td>${escapeHtml(item.entityId || "")}</td>
    </tr>
  `).join("");
  return table(["Severity", "Code", "Message", "Entity"], rows);
}

function updateTransaction(target) {
  const id = target.dataset.editTransaction;
  const nextTransactions = state.transactions.map((transaction) => {
    if (transaction.id !== id) return transaction;
    const value = inputValue(target);
    const next = { ...transaction, [target.name]: target.name === "amount" ? Math.abs(Number(value)) : value };
    if (target.name === "date") {
      next.month = getTransactionMonth(value);
    }
    if (target.name === "category") {
      next.subcategory = subcategoriesFor(value)[0]?.name || "";
    }
    return next;
  });
  setState({ ...state, transactions: nextTransactions });
}

function updateCollectionItem(collection, target) {
  const id = target.dataset.editCategory || target.dataset.editSubcategory || target.dataset.editAccount;
  const next = state[collection].map((item) => item.id === id
    ? { ...item, [target.name]: target.type === "number" ? Number(target.value) || 0 : inputValue(target) }
    : item);
  setState({ ...state, [collection]: next });
}

function fillMissingMonthlySetup() {
  const existing = new Set(state.monthlySetup.map((item) => `${item.month}::${item.category}::${item.subcategory}`));
  const additions = state.subcategories
    .filter((item) => Number(item.defaultMonthlyTarget) > 0)
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
  setState({ ...state, monthlySetup: [...state.monthlySetup, ...additions] });
}

appRoot.addEventListener("click", (event) => {
  const button = event.target.closest("[data-save-setup]");
  if (!button) return;
  const row = button.closest("tr");
  const id = button.dataset.saveSetup;
  const nextRows = state.monthlySetup.map((item) => item.id === id ? {
    ...item,
    monthlyTarget: Number(row.querySelector('[name="monthlyTarget"]').value) || 0,
    startingBalance: Number(row.querySelector('[name="startingBalance"]').value) || 0,
    rollover: row.querySelector('[name="rollover"]').checked
  } : item);
  setState({ ...state, monthlySetup: nextRows });
});

function loadDraft() {
  try {
    const draft = localStorage.getItem(draftKey);
    return draft ? normalizeState(JSON.parse(draft)) : null;
  } catch {
    return null;
  }
}

function normalizeState(nextState) {
  return {
    ...createInitialState(),
    ...nextState,
    lastAccessedAt: nextState.lastAccessedAt || "",
    lastAutomationRunAt: nextState.lastAutomationRunAt || "",
    transactions: (nextState.transactions || []).map((item) => ({
      ...item,
      amount: Number(item.amount) || 0,
      month: item.month || getTransactionMonth(item.date)
    })),
    monthlySetup: (nextState.monthlySetup || []).map((item) => ({
      ...item,
      monthlyTarget: Number(item.monthlyTarget) || 0,
      startingBalance: Number(item.startingBalance) || 0,
      rollover: Boolean(item.rollover)
    }))
  };
}

function subcategoriesFor(category) {
  return state.subcategories.filter((item) => item.category === category);
}

function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function kpi(label, value, tone = "") {
  return `<article class="kpi ${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function field(name, label, type, value = "", step = null, className = "") {
  const stepAttr = step ? ` step="${step}"` : "";
  return `<label class="field ${className}"><span>${label}</span><input name="${name}" type="${type}" value="${escapeAttr(value)}"${stepAttr}></label>`;
}

function options(values, selected = values[0]) {
  return values.map((value) => `<option value="${escapeAttr(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`).join("");
}

function guessMapping(headers) {
  const find = (...needles) => headers.find((header) => needles.some((needle) => header.toLowerCase().includes(needle))) || "";
  return {
    date: find("date", "posted"),
    merchantPayee: find("merchant", "payee", "name"),
    description: find("description", "memo"),
    amount: find("amount", "debit", "credit"),
    account: "",
    category: "",
    subcategory: "",
    type: find("type")
  };
}

function normalizeType(value) {
  const text = String(value).toLowerCase();
  if (text.includes("income") || text.includes("credit") || text.includes("deposit")) return "Income";
  if (text.includes("transfer")) return "Transfer";
  return "Expense";
}

function inputValue(target) {
  return target.type === "checkbox" ? target.checked : target.value;
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: state.currency || "USD" }).format(Number(value) || 0);
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}
