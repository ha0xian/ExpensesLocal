const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function filterTransactions(transactions, filters = {}) {
  const { month = "", allMonths = false, query = "", category = "", account = "" } = filters;
  const needle = query.trim().toLowerCase();
  return (transactions || [])
    .map((transaction, index) => ({ transaction, index }))
    .filter(({ transaction }) => {
      const date = String(transaction.date || "");
      if (!allMonths && (!VALID_DATE.test(date) || date.slice(0, 7) !== month)) return false;
      if (category && transaction.category !== category) return false;
      if (account && transaction.account !== account) return false;
      if (needle) {
        const haystack = [transaction.merchantPayee, transaction.description, transaction.notes]
          .join(" ").toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    })
    .sort((a, b) => String(b.transaction.date || "").localeCompare(String(a.transaction.date || "")) || a.index - b.index)
    .map(({ transaction }) => transaction);
}

export function getBudgetUsage(budget, spend) {
  const normalizedBudget = Number(budget);
  const normalizedSpend = Number(spend) || 0;
  if (!Number.isFinite(normalizedBudget) || normalizedBudget <= 0) {
    return normalizedSpend > 0
      ? { percent: null, label: "Unbudgeted spending", tone: "warning" }
      : { percent: null, label: "No budget set", tone: "neutral" };
  }
  const percent = Math.round((normalizedSpend / normalizedBudget) * 100);
  if (percent > 100) return { percent, label: "Over budget", tone: "error" };
  if (percent === 100) return { percent, label: "Budget fully used", tone: "warning" };
  if (percent >= 90) return { percent, label: "Near budget", tone: "warning" };
  return { percent, label: "Within budget", tone: "success" };
}

export function getWarningDestination(warning, state) {
  if (!warning) return null;
  if (warning.code === "ENVELOPE_OVERDRAWN") return { view: "monthly", attentionOnly: true };
  if (warning.code === "OVER_ASSIGNED") return { view: "monthly" };
  if (warning.entityId) {
    const exists = (state?.transactions || []).some((item) => item.id === warning.entityId);
    return exists
      ? { view: "transactions", transactionId: warning.entityId }
      : { view: "transactions" };
  }
  return null;
}

export function isFirstUse(state) {
  if (!state || (state.transactions || []).length) return false;
  return (state.monthlySetup || []).every((item) =>
    (Number(item.monthlyTarget) || 0) === 0 && (Number(item.startingBalance) || 0) === 0
  );
}
