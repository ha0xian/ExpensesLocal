import { getTransactionMonth } from "./calculations.js";

export const RECURRENCE_PRESETS = ["Weekly", "Biweekly", "Monthly", "Quarterly", "Yearly", "Custom"];
export const RECURRENCE_UNITS = ["Days", "Weeks", "Months", "Years"];

const PRESET_INTERVALS = {
  Weekly: { interval: 1, unit: "Weeks" },
  Biweekly: { interval: 2, unit: "Weeks" },
  Monthly: { interval: 1, unit: "Months" },
  Quarterly: { interval: 3, unit: "Months" },
  Yearly: { interval: 1, unit: "Years" }
};

export function normalizeAutomaticTransactionRule(rule, fallbackCurrency = "USD") {
  const frequency = RECURRENCE_PRESETS.includes(rule?.frequency) ? rule.frequency : "Monthly";
  const customUnit = RECURRENCE_UNITS.includes(rule?.customUnit) ? rule.customUnit : "Months";
  const customInterval = Math.abs(Number(rule?.customInterval)) || 1;

  return {
    id: rule?.id || "",
    enabled: rule?.enabled !== false,
    startDate: rule?.startDate || "",
    endDate: rule?.endDate || "",
    frequency,
    customInterval,
    customUnit,
    type: rule?.type || "Expense",
    category: rule?.category || "",
    subcategory: rule?.subcategory || "",
    account: rule?.account || "",
    merchantPayee: rule?.merchantPayee || "",
    description: rule?.description || "",
    amount: Math.abs(Number(rule?.amount)) || 0,
    currency: rule?.currency || fallbackCurrency || "USD",
    essential: Boolean(rule?.essential),
    reimbursable: Boolean(rule?.reimbursable),
    notes: rule?.notes || ""
  };
}

export function getDueDatesForRule(rule, currentDate, existingTransactions = []) {
  const normalized = normalizeAutomaticTransactionRule(rule);
  const start = parseLocalDate(normalized.startDate);
  const current = parseLocalDate(toLocalDate(currentDate));
  const end = normalized.endDate ? parseLocalDate(normalized.endDate) : null;

  if (!normalized.enabled || !normalized.id || !start || !current || start > current) {
    return [];
  }

  if (end && end < start) {
    return [];
  }

  const finalDate = end && end < current ? end : current;
  const existingKeys = new Set(
    existingTransactions
      .filter((transaction) => transaction.sourceRuleId === normalized.id)
      .map((transaction) => `${transaction.sourceRuleId}::${transaction.date}`)
  );
  const { interval, unit } = intervalForRule(normalized);
  const dueDates = [];
  let occurrenceIndex = 0;
  let cursor = start;

  while (cursor <= finalDate) {
    const dueDate = formatLocalDate(cursor);
    if (!existingKeys.has(`${normalized.id}::${dueDate}`)) {
      dueDates.push(dueDate);
    }
    occurrenceIndex += 1;
    cursor = addInterval(start, occurrenceIndex, interval, unit);
  }

  return dueDates;
}

export function generateAutomaticTransactions(state, currentDate = new Date()) {
  const generated = [];
  const skipped = [];
  const existingTransactions = state.transactions || [];

  for (const rawRule of state.automaticTransactions || []) {
    const rule = normalizeAutomaticTransactionRule(rawRule, state.currency);

    if (!isValidRule(rule)) {
      skipped.push({ ruleId: rule.id, reason: "INVALID_RULE" });
      continue;
    }

    const dueDates = getDueDatesForRule(rule, currentDate, [...existingTransactions, ...generated]);

    for (const dueDate of dueDates) {
      generated.push({
        id: `auto-${rule.id}-${dueDate}`,
        date: dueDate,
        month: getTransactionMonth(dueDate),
        type: rule.type,
        category: rule.category,
        subcategory: rule.subcategory,
        account: rule.account,
        merchantPayee: rule.merchantPayee,
        description: rule.description,
        amount: rule.amount,
        currency: rule.currency,
        essential: rule.essential,
        reimbursable: rule.reimbursable,
        notes: rule.notes,
        sourceRuleId: rule.id
      });
    }
  }

  return {
    state: generated.length ? { ...state, transactions: [...generated, ...existingTransactions] } : state,
    generated,
    skipped
  };
}

function isValidRule(rule) {
  return Boolean(
    rule.enabled &&
    rule.id &&
    parseLocalDate(rule.startDate) &&
    rule.type &&
    rule.category &&
    rule.subcategory &&
    rule.account &&
    Number(rule.amount) > 0 &&
    (!rule.endDate || parseLocalDate(rule.endDate)) &&
    (!rule.endDate || parseLocalDate(rule.endDate) >= parseLocalDate(rule.startDate)) &&
    (rule.frequency !== "Custom" || (Number(rule.customInterval) > 0 && RECURRENCE_UNITS.includes(rule.customUnit)))
  );
}

function intervalForRule(rule) {
  if (rule.frequency === "Custom") {
    return { interval: Math.max(1, Math.floor(Number(rule.customInterval) || 1)), unit: rule.customUnit };
  }
  return PRESET_INTERVALS[rule.frequency] || PRESET_INTERVALS.Monthly;
}

function addInterval(anchor, occurrenceIndex, interval, unit) {
  if (unit === "Days") {
    return addDays(anchor, occurrenceIndex * interval);
  }
  if (unit === "Weeks") {
    return addDays(anchor, occurrenceIndex * interval * 7);
  }
  if (unit === "Years") {
    return addMonths(anchor, occurrenceIndex * interval * 12);
  }
  return addMonths(anchor, occurrenceIndex * interval);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(anchor, months) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + months;
  const day = anchor.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function formatLocalDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function toLocalDate(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    return formatLocalDate(new Date());
  }
  return formatLocalDate(value);
}
