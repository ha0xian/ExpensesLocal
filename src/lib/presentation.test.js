import test from "node:test";
import assert from "node:assert/strict";
import { filterTransactions, getBudgetUsage, getWarningDestination, isFirstUse } from "./presentation.js";

test("filters transactions by month, search, category, and account without mutation", () => {
  const source = [
    { id: "a", date: "2026-01-04", merchantPayee: "Corner Shop", category: "Food", account: "Card", notes: "weekly" },
    { id: "b", date: "2026-09-01", description: "Corner shop", category: "Food", account: "Card" },
    { id: "c", date: "bad-date", notes: "repair me", category: "Food", account: "Card" },
    { id: "d", date: "2026-01-04", merchantPayee: "Other", category: "Food", account: "Card" },
  ];
  const copy = structuredClone(source);
  assert.deepEqual(filterTransactions(source, { month: "2026-01", query: " corner ", category: "Food", account: "Card" }).map((x) => x.id), ["a"]);
  assert.deepEqual(filterTransactions(source, { allMonths: true, query: "repair" }).map((x) => x.id), ["c"]);
  assert.deepEqual(filterTransactions(source, { month: "2026-01" }).map((x) => x.id), ["a", "d"]);
  assert.deepEqual(source, copy);
});

test("describes budget usage honestly", () => {
  assert.equal(getBudgetUsage(0, 0).label, "No budget set");
  assert.equal(getBudgetUsage(0, 5).label, "Unbudgeted spending");
  assert.equal(getBudgetUsage(100, 90).label, "Near budget");
  assert.equal(getBudgetUsage(100, 100).label, "Budget fully used");
  assert.equal(getBudgetUsage(100, 120).label, "Over budget");
});

test("maps known warnings without inventing identifiers", () => {
  const state = { transactions: [{ id: "txn-1" }] };
  assert.deepEqual(getWarningDestination({ code: "INVALID_TRANSACTION", entityId: "txn-1" }, state), { view: "transactions", transactionId: "txn-1" });
  assert.deepEqual(getWarningDestination({ code: "INVALID_TRANSACTION", entityId: "missing" }, state), { view: "transactions" });
  assert.deepEqual(getWarningDestination({ code: "ENVELOPE_OVERDRAWN" }, state), { view: "monthly", attentionOnly: true });
});

test("seeded accounts do not suppress first-use guidance", () => {
  assert.equal(isFirstUse({ accounts: [{ id: "a" }], transactions: [], monthlySetup: [{ monthlyTarget: 0, startingBalance: 0 }] }), true);
  assert.equal(isFirstUse({ transactions: [{ id: "t" }], monthlySetup: [] }), false);
  assert.equal(isFirstUse({ transactions: [], monthlySetup: [{ monthlyTarget: 10, startingBalance: 0 }] }), false);
});
