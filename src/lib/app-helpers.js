import { getTransactionMonth } from "./calculations.js";

export function money(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(Number(value) || 0);
}

export function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

export function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function subcategoriesFor(state, category) {
  return state.subcategories.filter((item) => item.category === category);
}

export function guessMapping(headers) {
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

export function normalizeType(value) {
  const text = String(value).toLowerCase();
  if (text.includes("income") || text.includes("credit") || text.includes("deposit")) return "Income";
  if (text.includes("transfer")) return "Transfer";
  return "Expense";
}

export function mapBankImportRows(rows, mapping, state) {
  return rows.map((row) => {
    const amountRaw = Number(row[mapping.amount] || 0);
    const typeValue = mapping.type ? row[mapping.type] : "";
    const inferredType = typeValue || (amountRaw < 0 ? "Expense" : "Income");
    const date = row[mapping.date] || "";
    const category = row[mapping.category] || state.categories[0]?.name || "";

    return {
      id: uniqueId("imp"),
      date,
      type: normalizeType(inferredType),
      category,
      subcategory: row[mapping.subcategory] || subcategoriesFor(state, category)[0]?.name || "",
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
