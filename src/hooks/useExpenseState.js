import { useCallback, useEffect, useState } from "react";
import * as api from "../lib/api-client.js";

export function useExpenseState() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getState();
      setSnapshot(data);
    } catch (err) {
      setError(err.message || "Failed to load state from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Call a mutation API, then refresh from the returned snapshot. */
  const mutate = useCallback(async (apiCall) => {
    setError(null);
    try {
      const data = await apiCall();
      setSnapshot(data);
      return data;
    } catch (err) {
      setError(err.message || "API call failed.");
      throw err;
    }
  }, []);

  const state = snapshot?.state || null;
  const derived = snapshot?.derived || null;
  const config = snapshot?.config || null;
  const automationStatus = snapshot?.automationStatus || { changed: false, actions: [] };
  const dataFileName = snapshot?.dataFileName || "";

  return {
    state,
    derived,
    config,
    automationStatus,
    dataFileName,
    loading,
    error,
    snapshot,
    refresh: load,
    mutate,
  };
}
