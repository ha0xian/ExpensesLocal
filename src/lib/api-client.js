/** Frontend API wrapper — uses fetch against the /api proxy. */

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// State / config
// ---------------------------------------------------------------------------

export function getConfig() {
  return request("/config");
}

export function getState() {
  return request("/state");
}

export function updateSelectedMonth(month) {
  return request("/state/month", {
    method: "PUT",
    body: JSON.stringify({ month }),
  });
}

// ---------------------------------------------------------------------------
// CSV import / export (export returns blob, not JSON)
// ---------------------------------------------------------------------------

export async function importCsv(csvText) {
  return request("/csv/import", {
    method: "POST",
    body: JSON.stringify({ csvText }),
  });
}

export async function exportCsv() {
  const response = await fetch("/api/csv/export");
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "expense-data.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export function createTransaction(form) {
  return request("/transactions", {
    method: "POST",
    body: JSON.stringify(form),
  });
}

export function updateTransaction(id, field, value) {
  return request(`/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ field, value }),
  });
}

export function deleteTransaction(id) {
  return request(`/transactions/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Automatic transactions
// ---------------------------------------------------------------------------

export function createAutomaticTransaction(form) {
  return request("/automatic-transactions", {
    method: "POST",
    body: JSON.stringify(form),
  });
}

export function updateAutomaticTransaction(id, field, value) {
  return request(`/automatic-transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ field, value }),
  });
}

export function deleteAutomaticTransaction(id) {
  return request(`/automatic-transactions/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function createCategory(form) {
  return request("/categories", {
    method: "POST",
    body: JSON.stringify(form),
  });
}

export function updateCategory(id, field, value) {
  return request(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ field, value }),
  });
}

export function deleteCategory(id) {
  return request(`/categories/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Subcategories
// ---------------------------------------------------------------------------

export function createSubcategory(form) {
  return request("/subcategories", {
    method: "POST",
    body: JSON.stringify(form),
  });
}

export function updateSubcategory(id, field, value) {
  return request(`/subcategories/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ field, value }),
  });
}

export function deleteSubcategory(id) {
  return request(`/subcategories/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export function createAccount(form) {
  return request("/accounts", {
    method: "POST",
    body: JSON.stringify(form),
  });
}

export function updateAccount(id, field, value) {
  return request(`/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ field, value }),
  });
}

export function deleteAccount(id) {
  return request(`/accounts/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Monthly setup
// ---------------------------------------------------------------------------

export function updateMonthlySetup(id, field, value) {
  return request(`/monthly-setup/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ field, value }),
  });
}

export function fillMissingMonthlySetup() {
  return request("/monthly-setup/fill-missing", { method: "POST" });
}

// ---------------------------------------------------------------------------
// Bank import
// ---------------------------------------------------------------------------

export function bankImportPreview(csvText, mapping) {
  return request("/bank-import/preview", {
    method: "POST",
    body: JSON.stringify({ csvText, mapping }),
  });
}

export function bankImportApply(rows, mapping) {
  return request("/bank-import/apply", {
    method: "POST",
    body: JSON.stringify({ rows, mapping }),
  });
}
