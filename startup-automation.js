import { MONTHS_2026 } from "./data-schema.js";

export function runStartupAutomation(state, currentDate = new Date()) {
  const currentAccessDate = toLocalDate(currentDate);
  const currentMonth = currentAccessDate.slice(0, 7);
  const previousAccessDate = normalizeDate(state.lastAccessedAt);
  const lastAutomationRunDate = normalizeDate(state.lastAutomationRunAt);
  const actions = [];

  if (lastAutomationRunDate === currentAccessDate) {
    return {
      state,
      changed: false,
      previousAccessDate,
      currentAccessDate,
      actions
    };
  }

  if (previousAccessDate === currentAccessDate) {
    return {
      state,
      changed: false,
      previousAccessDate,
      currentAccessDate,
      actions
    };
  }

  const nextState = {
    ...state,
    lastAccessedAt: currentAccessDate,
    lastAutomationRunAt: currentAccessDate
  };

  if (!previousAccessDate) {
    actions.push("initialized_access_metadata");
  } else if (previousAccessDate > currentAccessDate) {
    actions.push("corrected_future_access_date");
  } else {
    actions.push("updated_access_metadata");
  }

  if (previousAccessDate && previousAccessDate.slice(0, 7) !== currentMonth && MONTHS_2026.includes(currentMonth)) {
    nextState.selectedMonth = currentMonth;
    actions.push("advanced_selected_month");
  }

  return {
    state: nextState,
    changed: true,
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
