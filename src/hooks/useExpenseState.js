import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../lib/api-client.js";

export function useExpenseState() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mutationStatus, setMutationStatus] = useState("idle");
  const mutationLock = useRef(false);
  const confirmedVersion = useRef(0);

  const load = useCallback(async () => {
    const versionAtStart = confirmedVersion.current;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getState();
      if (versionAtStart === confirmedVersion.current) setSnapshot(data);
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
    if (mutationLock.current) throw new Error("Another change is still being saved.");
    mutationLock.current = true;
    setError(null);
    setMutationStatus("saving");
    try {
      const data = await apiCall();
      confirmedVersion.current += 1;
      setSnapshot(data);
      setMutationStatus("saved");
      return data;
    } catch (err) {
      setError(err.message || "API call failed.");
      setMutationStatus("error");
      throw err;
    } finally {
      mutationLock.current = false;
    }
  }, []);

  const clearError = useCallback(() => { setError(null); setMutationStatus("idle"); }, []);

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
    mutationStatus,
    isMutating: mutationStatus === "saving",
    clearError,
    snapshot,
    refresh: load,
    mutate,
  };
}
