import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  /** First load (no data yet). */
  loading: boolean;
  /** Pull-to-refresh in progress (data already on screen). */
  refreshing: boolean;
  reload: () => void;
  refresh: () => void;
}

interface Options {
  /** Reload when the screen comes back into focus (e.g. after answering a question). */
  reloadOnFocus?: boolean;
}

/**
 * Runs an API call and keeps its result. Re-runs when `deps` change; `refresh`
 * keeps the current data visible while loading (for RefreshControl).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList, options: Options = {}): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback((mode: "load" | "refresh" | "silent") => {
    const id = ++latest.current;
    if (mode === "load") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    fnRef
      .current()
      .then((result) => {
        if (id !== latest.current) return;
        setData(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (id !== latest.current) return;
        // A silent reload keeps showing the data it already has.
        if (mode !== "silent") setError(caught);
      })
      .finally(() => {
        if (id !== latest.current) return;
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  // Callers pass the values their `fn` depends on, like a useEffect dependency list.
  useEffect(() => run("load"), deps);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (options.reloadOnFocus) run("silent");
    }, [options.reloadOnFocus, run])
  );

  return {
    data,
    error,
    loading: loading && data === undefined,
    refreshing,
    reload: () => run("load"),
    refresh: () => run("refresh"),
  };
}
