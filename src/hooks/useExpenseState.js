import { useCallback, useMemo, useState } from "react";
import { getTransactionMonth } from "../lib/calculations.js";
import { normalizeAutomaticTransactionRule } from "../lib/automatic-transactions.js";
import { createInitialState } from "../lib/data-schema.js";
import { runStartupAutomation } from "../lib/startup-automation.js";

const DRAFT_KEY = "expense-csv-draft-v2";

export function useExpenseState() {
  const initial = useMemo(() => loadInitialState(), []);
  const [state, setState] = useState(initial.state);
  const [automationStatus, setAutomationStatus] = useState(initial.automationStatus);

  const persist = useCallback((nextState) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(nextState));
  }, []);

  const setExpenseState = useCallback((nextStateOrUpdater) => {
    setState((previous) => {
      const rawNext = typeof nextStateOrUpdater === "function" ? nextStateOrUpdater(previous) : nextStateOrUpdater;
      const next = normalizeState(rawNext);
      persist(next);
      return next;
    });
  }, [persist]);

  const replaceState = useCallback((nextState, options = {}) => {
    const normalized = normalizeState(nextState);
    const result = options.runAutomation === false
      ? { state: normalized, changed: false, previousAccessDate: normalized.lastAccessedAt, currentAccessDate: normalized.lastAccessedAt, actions: [] }
      : runStartupAutomation(normalized);
    const finalState = normalizeState(result.state);
    setState(finalState);
    setAutomationStatus(result);
    persist(finalState);
    return result;
  }, [persist]);

  const resetDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  return {
    state,
    setExpenseState,
    replaceState,
    resetDraft,
    automationStatus
  };
}

export function normalizeState(nextState) {
  return {
    ...createInitialState(),
    ...nextState,
    lastAccessedAt: nextState?.lastAccessedAt || "",
    lastAutomationRunAt: nextState?.lastAutomationRunAt || "",
    transactions: (nextState?.transactions || []).map((item) => ({
      ...item,
      amount: Number(item.amount) || 0,
      essential: Boolean(item.essential),
      reimbursable: Boolean(item.reimbursable),
      month: item.month || getTransactionMonth(item.date)
    })),
    automaticTransactions: (nextState?.automaticTransactions || []).map((item) =>
      normalizeAutomaticTransactionRule(item, nextState?.currency || "USD")
    ),
    categories: (nextState?.categories || []).map((item) => ({
      ...item,
      defaultBudget: Number(item.defaultBudget) || 0
    })),
    subcategories: (nextState?.subcategories || []).map((item) => ({
      ...item,
      defaultMonthlyTarget: Number(item.defaultMonthlyTarget) || 0
    })),
    accounts: (nextState?.accounts || []).map((item) => ({
      ...item,
      openingBalance: Number(item.openingBalance) || 0
    })),
    monthlySetup: (nextState?.monthlySetup || []).map((item) => ({
      ...item,
      monthlyTarget: Number(item.monthlyTarget) || 0,
      startingBalance: Number(item.startingBalance) || 0,
      rollover: Boolean(item.rollover)
    }))
  };
}

function loadInitialState() {
  const loadedState = loadDraft() || createInitialState();
  const result = runStartupAutomation(normalizeState(loadedState));
  const state = normalizeState(result.state);

  if (result.changed) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  }

  return {
    state,
    automationStatus: result
  };
}

function loadDraft() {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    return draft ? normalizeState(JSON.parse(draft)) : null;
  } catch {
    return null;
  }
}
