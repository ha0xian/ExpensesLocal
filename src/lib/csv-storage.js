import { CSV_COLUMNS, createInitialState } from "./data-schema.js";

export function isFileSystemAccessSupported() {
  return Boolean(window.showOpenFilePicker && window.showSaveFilePicker && window.FileSystemFileHandle);
}

export async function openCsvFile() {
  if (!isFileSystemAccessSupported()) {
    throw new Error("File System Access API is not supported. Use Chrome or Edge.");
  }

  const [fileHandle] = await window.showOpenFilePicker({
    multiple: false,
    types: [{ description: "CSV files", accept: { "text/csv": [".csv"] } }]
  });
  const file = await fileHandle.getFile();
  const csvText = await file.text();
  return { fileHandle, csvText };
}

export async function saveCsvFile(fileHandle, csvText) {
  if (!fileHandle?.createWritable) {
    throw new Error("No writable CSV file is open. Use Save As first.");
  }

  const writer = await fileHandle.createWritable();
  await writer.write(csvText);
  await writer.close();
}

export async function saveCsvFileAs(csvText, suggestedName = "expense-data.csv") {
  if (!isFileSystemAccessSupported()) {
    throw new Error("File System Access API is not supported. Use Chrome or Edge.");
  }

  const fileHandle = await window.showSaveFilePicker({
    suggestedName,
    types: [{ description: "CSV files", accept: { "text/csv": [".csv"] } }]
  });
  await saveCsvFile(fileHandle, csvText);
  return fileHandle;
}

export function parseAppCsv(csvText) {
  const { rows } = parseGenericCsv(csvText);
  const state = createInitialState();
  state.categories = [];
  state.subcategories = [];
  state.accounts = [];
  state.transactions = [];
  state.automaticTransactions = [];
  state.monthlySetup = [];

  for (const row of rows) {
    if (row.record_type === "meta") {
      state.selectedMonth = row.month || state.selectedMonth;
      state.currency = row.currency || state.currency;
      state.lastAccessedAt = row.last_accessed_at || "";
      state.lastAutomationRunAt = row.last_automation_run_at || "";
    }

    if (row.record_type === "category") {
      state.categories.push({
        id: row.id,
        name: row.category,
        group: row.group,
        defaultBudget: numberFrom(row.default_budget),
        taxBusinessReady: row.tax_business_ready || "No",
        notes: row.notes || ""
      });
    }

    if (row.record_type === "subcategory") {
      state.subcategories.push({
        id: row.id,
        category: row.category,
        name: row.subcategory,
        envelopeGroup: row.envelope_group || "",
        envelopeStyle: row.envelope_style || "Variable",
        defaultMonthlyTarget: numberFrom(row.default_monthly_target),
        notes: row.notes || ""
      });
    }

    if (row.record_type === "account") {
      state.accounts.push({
        id: row.id,
        name: row.account,
        type: row.account_type || "Bank",
        openingBalance: numberFrom(row.opening_balance),
        notes: row.notes || ""
      });
    }

    if (row.record_type === "transaction") {
      state.transactions.push({
        id: row.id,
        date: row.date,
        type: row.type || "Expense",
        category: row.category,
        subcategory: row.subcategory,
        account: row.account,
        merchantPayee: row.merchant_payee,
        description: row.description,
        amount: numberFrom(row.amount),
        currency: row.currency || state.currency,
        essential: booleanFrom(row.essential),
        month: row.month,
        reimbursable: booleanFrom(row.reimbursable),
        notes: row.notes || "",
        sourceRuleId: row.source_rule_id || ""
      });
    }

    if (row.record_type === "automatic_transaction") {
      state.automaticTransactions.push({
        id: row.id,
        enabled: row.enabled === "" ? true : booleanFrom(row.enabled),
        startDate: row.start_date,
        endDate: row.end_date || "",
        frequency: row.frequency || "Monthly",
        customInterval: numberFrom(row.custom_interval) || 1,
        customUnit: row.custom_unit || "Months",
        type: row.type || "Expense",
        category: row.category,
        subcategory: row.subcategory,
        account: row.account,
        merchantPayee: row.merchant_payee,
        description: row.description,
        amount: numberFrom(row.amount),
        currency: row.currency || state.currency,
        essential: booleanFrom(row.essential),
        reimbursable: booleanFrom(row.reimbursable),
        notes: row.notes || ""
      });
    }

    if (row.record_type === "monthly_setup") {
      state.monthlySetup.push({
        id: row.id,
        month: row.month,
        category: row.category,
        subcategory: row.subcategory,
        monthlyTarget: numberFrom(row.monthly_target),
        startingBalance: numberFrom(row.starting_balance),
        rollover: booleanFrom(row.rollover)
      });
    }
  }

  if (!state.categories.length || !state.subcategories.length || !state.accounts.length) {
    throw new Error("This CSV is missing required app records.");
  }

  return state;
}

export function serializeAppCsv(state) {
  const rows = [
    {
      record_type: "meta",
      id: "app",
      last_accessed_at: state.lastAccessedAt || "",
      last_automation_run_at: state.lastAutomationRunAt || "",
      month: state.selectedMonth,
      currency: state.currency
    },
    ...state.categories.map((item) => ({
      record_type: "category",
      id: item.id,
      category: item.name,
      group: item.group,
      default_budget: item.defaultBudget,
      tax_business_ready: item.taxBusinessReady,
      notes: item.notes
    })),
    ...state.subcategories.map((item) => ({
      record_type: "subcategory",
      id: item.id,
      category: item.category,
      subcategory: item.name,
      envelope_group: item.envelopeGroup,
      envelope_style: item.envelopeStyle,
      default_monthly_target: item.defaultMonthlyTarget,
      notes: item.notes
    })),
    ...state.accounts.map((item) => ({
      record_type: "account",
      id: item.id,
      account: item.name,
      account_type: item.type,
      opening_balance: item.openingBalance,
      notes: item.notes
    })),
    ...state.monthlySetup.map((item) => ({
      record_type: "monthly_setup",
      id: item.id,
      month: item.month,
      category: item.category,
      subcategory: item.subcategory,
      monthly_target: item.monthlyTarget,
      starting_balance: item.startingBalance,
      rollover: item.rollover
    })),
    ...(state.automaticTransactions || []).map((item) => ({
      record_type: "automatic_transaction",
      id: item.id,
      enabled: item.enabled,
      start_date: item.startDate,
      end_date: item.endDate,
      frequency: item.frequency,
      custom_interval: item.customInterval,
      custom_unit: item.customUnit,
      type: item.type,
      category: item.category,
      subcategory: item.subcategory,
      account: item.account,
      merchant_payee: item.merchantPayee,
      description: item.description,
      amount: item.amount,
      currency: item.currency,
      essential: item.essential,
      reimbursable: item.reimbursable,
      notes: item.notes
    })),
    ...state.transactions.map((item) => ({
      record_type: "transaction",
      id: item.id,
      date: item.date,
      month: item.month,
      type: item.type,
      category: item.category,
      subcategory: item.subcategory,
      account: item.account,
      merchant_payee: item.merchantPayee,
      description: item.description,
      amount: item.amount,
      currency: item.currency,
      essential: item.essential,
      reimbursable: item.reimbursable,
      notes: item.notes,
      source_rule_id: item.sourceRuleId || ""
    }))
  ];

  return [CSV_COLUMNS.join(","), ...rows.map((row) => CSV_COLUMNS.map((column) => escapeCsv(row[column] ?? "")).join(","))].join("\r\n");
}

export function parseGenericCsv(csvText) {
  const records = parseCsvRecords(csvText);
  const headers = records.shift()?.map((header) => header.trim()) || [];
  const rows = records
    .filter((record) => record.some((cell) => String(cell).trim() !== ""))
    .map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])));

  return { headers, rows };
}

function parseCsvRecords(csvText) {
  const records = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (inQuotes && char === '"' && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      records.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    records.push(row);
  }

  return records;
}

function escapeCsv(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function numberFrom(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function booleanFrom(value) {
  return ["true", "yes", "1", "y"].includes(String(value).toLowerCase());
}
