import { MONTHS_2026 } from "./data-schema.js";

const MONEY_EPSILON = 0.005;

export function getTransactionMonth(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString || ""))) {
    return "";
  }

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const [year, month, day] = dateString.split("-").map(Number);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

export function summarizeMonth(state, month) {
  const transactions = transactionsForMonth(state, month);
  const expenses = sum(transactions.filter((item) => item.type === "Expense").map((item) => item.amount));
  const income = sum(transactions.filter((item) => item.type === "Income").map((item) => item.amount));
  const categoryRows = summarizeCategoriesForMonth(state, month);
  const topCategory = categoryRows.slice().sort((a, b) => b.spend - a.spend)[0]?.category || "None";

  return {
    expenses,
    income,
    netCashflow: income - expenses,
    transactionCount: transactions.length,
    reimbursableTotal: sum(transactions.filter((item) => item.reimbursable).map((item) => item.amount)),
    essentialSpend: sum(transactions.filter((item) => item.essential && item.type === "Expense").map((item) => item.amount)),
    topCategory
  };
}

export function summarizeCategoriesForMonth(state, month) {
  return state.categories.map((category) => {
    const spend = sum(
      transactionsForMonth(state, month)
        .filter((transaction) => transaction.type === "Expense" && transaction.category === category.name)
        .map((transaction) => transaction.amount)
    );

    return {
      category: category.name,
      spend,
      budget: Number(category.defaultBudget) || 0
    };
  });
}

export function calculateAvailableToAssign(state, month) {
  const income = sum(transactionsForMonth(state, month).filter((item) => item.type === "Income").map((item) => item.amount));
  const funding = sum(state.monthlySetup.filter((item) => item.month === month).map((item) => item.monthlyTarget));
  return income - funding;
}

export function calculateEnvelopeBalances(state, month) {
  const targetIndex = sortedMonths(state).indexOf(month);
  if (targetIndex === -1) {
    return [];
  }

  const balances = new Map();
  const targetRows = [];

  for (const currentMonth of sortedMonths(state).slice(0, targetIndex + 1)) {
    for (const setup of state.monthlySetup.filter((item) => item.month === currentMonth)) {
      const key = envelopeKey(setup.category, setup.subcategory);
      const previous = balances.get(key) || 0;
      const rolloverIn = setup.rollover ? previous : 0;
      const spending = envelopeSpending(state, currentMonth, setup.category, setup.subcategory);
      const available = Number(setup.startingBalance || 0) + rolloverIn + Number(setup.monthlyTarget || 0) - spending;

      balances.set(key, available);

      const row = {
        category: setup.category,
        subcategory: setup.subcategory,
        monthlyTarget: Number(setup.monthlyTarget) || 0,
        startingBalance: Number(setup.startingBalance) || 0,
        rolloverIn,
        spending,
        available,
        overdrawn: available < -MONEY_EPSILON
      };

      if (currentMonth === month) {
        targetRows.push(row);
      }
    }
  }

  return targetRows;
}

export function calculateAccountBalances(state) {
  return state.accounts.map((account) => {
    const accountTransactions = state.transactions.filter((transaction) => transaction.account === account.name);
    const expenses = sum(accountTransactions.filter((item) => item.type === "Expense").map((item) => item.amount));
    const income = sum(accountTransactions.filter((item) => item.type === "Income").map((item) => item.amount));
    const openingBalance = Number(account.openingBalance) || 0;
    const currentBalance = account.type === "Credit Card"
      ? openingBalance - expenses + income
      : openingBalance + income - expenses;

    return {
      account: account.name,
      type: account.type,
      openingBalance,
      currentBalance
    };
  });
}

export function collectWarnings(state, month) {
  const warnings = [];
  const categories = new Set(state.categories.map((item) => item.name));
  const accounts = new Set(state.accounts.map((item) => item.name));
  const subcategories = new Map(state.subcategories.map((item) => [`${item.category}::${item.name}`, item]));
  const subcategoryNames = new Set(state.subcategories.map((item) => item.name));

  for (const envelope of calculateEnvelopeBalances(state, month)) {
    if (envelope.overdrawn) {
      warnings.push({
        severity: "error",
        code: "ENVELOPE_OVERDRAWN",
        message: `${envelope.category} / ${envelope.subcategory} is overdrawn by ${formatMoney(Math.abs(envelope.available))}.`
      });
    }
  }

  if (calculateAvailableToAssign(state, month) < -MONEY_EPSILON) {
    warnings.push({
      severity: "warning",
      code: "OVER_ASSIGNED",
      message: "Monthly envelope funding is greater than income for the selected month."
    });
  }

  for (const transaction of state.transactions) {
    if (!categories.has(transaction.category)) {
      warnings.push({ severity: "warning", code: "MISSING_CATEGORY", message: `Transaction ${transaction.id} uses an unknown category.`, entityId: transaction.id });
    }

    if (!subcategoryNames.has(transaction.subcategory)) {
      warnings.push({ severity: "warning", code: "MISSING_SUBCATEGORY", message: `Transaction ${transaction.id} uses an unknown subcategory.`, entityId: transaction.id });
    } else if (!subcategories.has(`${transaction.category}::${transaction.subcategory}`)) {
      warnings.push({ severity: "warning", code: "SUBCATEGORY_MISMATCH", message: `Transaction ${transaction.id} subcategory does not belong to ${transaction.category}.`, entityId: transaction.id });
    }

    if (!accounts.has(transaction.account)) {
      warnings.push({ severity: "warning", code: "MISSING_ACCOUNT", message: `Transaction ${transaction.id} has no valid account.`, entityId: transaction.id });
    }

    if (!getTransactionMonth(transaction.date)) {
      warnings.push({ severity: "error", code: "INVALID_DATE", message: `Transaction ${transaction.id} has an invalid date.`, entityId: transaction.id });
    }

    if (!Number.isFinite(Number(transaction.amount)) || Number(transaction.amount) <= 0) {
      warnings.push({ severity: "error", code: "INVALID_AMOUNT", message: `Transaction ${transaction.id} has an invalid amount.`, entityId: transaction.id });
    }
  }

  return warnings;
}

function transactionsForMonth(state, month) {
  return state.transactions.filter((transaction) => (transaction.month || getTransactionMonth(transaction.date)) === month);
}

function envelopeSpending(state, month, category, subcategory) {
  return sum(
    transactionsForMonth(state, month)
      .filter((transaction) => transaction.type === "Expense" && transaction.category === category && transaction.subcategory === subcategory)
      .map((transaction) => transaction.amount)
  );
}

function sortedMonths(state) {
  return Array.from(new Set([...MONTHS_2026, ...state.monthlySetup.map((item) => item.month)])).sort();
}

function envelopeKey(category, subcategory) {
  return `${category}::${subcategory}`;
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}
