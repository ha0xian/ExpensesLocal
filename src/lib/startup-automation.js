import { MONTHS_2026 } from "./data-schema.js";
import { generateAutomaticTransactions } from "./automatic-transactions.js";

export function runStartupAutomation(state, currentDate = new Date()) {
  const currentAccessDate = toLocalDate(currentDate);
  const currentMonth = currentAccessDate.slice(0, 7);
  const previousAccessDate = normalizeDate(state.lastAccessedAt);
  const lastAutomationRunDate = normalizeDate(state.lastAutomationRunAt);
  const actions = [];
  let nextState = state;
  let changed = false;

  if (lastAutomationRunDate !== currentAccessDate && previousAccessDate !== currentAccessDate) {
    nextState = {
      ...nextState,
      lastAccessedAt: currentAccessDate,
      lastAutomationRunAt: currentAccessDate
    };
    changed = true;

    if (!previousAccessDate) {
      actions.push("UPDATED_LAST_ACCESS");
    } else if (previousAccessDate > currentAccessDate) {
      actions.push("LAST_ACCESS_IN_FUTURE_CORRECTED");
    } else {
      actions.push("UPDATED_LAST_ACCESS");
    }

    if (previousAccessDate && previousAccessDate.slice(0, 7) !== currentMonth && MONTHS_2026.includes(currentMonth)) {
      nextState = { ...nextState, selectedMonth: currentMonth };
      actions.push("ADVANCED_SELECTED_MONTH");
    }
  }

  const generation = generateAutomaticTransactions(nextState, currentDate);
  if (generation.generated.length) {
    nextState = generation.state;
    changed = true;
    actions.push("GENERATED_AUTOMATIC_TRANSACTIONS");
  }

  return {
    state: nextState,
    changed,
    previousAccessDate,
    currentAccessDate,
    actions
  };
}

function toLocalDate(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    return toLocalDate(new Date());
  }

  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0")
  ].join("-");
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}
